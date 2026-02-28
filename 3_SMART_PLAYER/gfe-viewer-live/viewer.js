// viewer.js – FXS SmartFile Viewer v1 (clean + resilient)

(function () {
  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  function safeJsonParseBytes(bytes, label) {
    const raw = new TextDecoder("utf-8").decode(bytes);
    let s = raw.replace(/^\uFEFF/, "").replace(/\u0000/g, "").trim();

    try {
      return JSON.parse(s);
    } catch (e1) {
      // salvage: cut at last closing brace/bracket
      const lastObj = s.lastIndexOf("}");
      const lastArr = s.lastIndexOf("]");
      const cut = Math.max(lastObj, lastArr);

      if (cut !== -1) {
        const s2 = s.slice(0, cut + 1).trim();
        try {
          return JSON.parse(s2);
        } catch (e2) {}
      }

      console.error(`[FXS Viewer] Failed to parse ${label} JSON`, {
        e1,
        preview: s.slice(0, 220),
      });
      throw e1;
    }
  }

  function bytesToAscii(u8, start, len) {
    try {
      return Array.from(u8.slice(start, start + len))
        .map((c) => String.fromCharCode(c))
        .join("");
    } catch {
      return "";
    }
  }

  // Very small mime sniff: MP4 starts with box size + "ftyp"
  function sniffVideoMime(mediaBytes) {
    if (!mediaBytes || mediaBytes.length < 12) return "application/octet-stream";
    const boxType = bytesToAscii(mediaBytes, 4, 4); // should be "ftyp"
    const brand = bytesToAscii(mediaBytes, 8, 4);   // "mp42", "isom", etc.
    if (boxType === "ftyp") {
      // Most browsers are happy with video/mp4 for mp4-family brands.
      // (Even if the source was .mov originally, modern exports often still package as MP4.)
      return "video/mp4";
    }
    return "application/octet-stream";
  }

  // ------------------------------------------------------------
  // FXS Parser
  // IMPORTANT: must match builder endianness for the 4-byte lengths.
  // Your current working state indicates BIG-endian lengths, so we use false.
  // ------------------------------------------------------------

  /* 
===============================================================================
FXS SMARTFILE — CORE BINARY CONTAINER LOGIC
-------------------------------------------------------------------------------
This code implements a deterministic, lossless binary container format that:
• Encapsulates arbitrary digital assets (media, data, documents)
• Preserves original byte-level integrity
• Uses ordered, length-prefixed binary blocks
• Supports independent decoding without external manifests
• Enables portable execution and verification across environments

This implementation is part of a proprietary file-format system.
© Global Data Capture LLC — All Rights Reserved.
Patent Pending.
===============================================================================
*/

  function parseFXS(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    let o = 0;

    const readBlock = (label) => {
      if (o + 4 > view.byteLength) {
        throw new Error(
          `[FXS Viewer] ${label}: cannot read length (o=${o}, size=${view.byteLength})`
        );
      }

      // BIG-endian length (matches your current working build)
      const len = view.getUint32(o, false);
      o += 4;

      if (len < 0 || o + len > view.byteLength) {
        throw new Error(
          `[FXS Viewer] ${label}: invalid len=${len} (o=${o}, size=${view.byteLength})`
        );
      }

      if (len === 0) {
        console.warn(`[FXS Viewer] ${label}: empty block (skipping)`);
        return new Uint8Array();
      }

      const bytes = new Uint8Array(arrayBuffer, o, len);
      o += len;
      return bytes;
    };

    // Read blocks ONCE in strict order
    const headerBytes = readBlock("header");
    const metaBytes = readBlock("metadata");
    const certBytes = readBlock("certificate"); // may be empty
    const mediaBytes = readBlock("media");

    console.log("[FXS Viewer] block sizes:", {
      header: headerBytes.length,
      meta: metaBytes.length,
      cert: certBytes.length,
      media: mediaBytes.length,
    });

    console.log(
      "[FXS Viewer] media first16:",
      Array.from(mediaBytes.slice(0, 16))
    );

    const header = safeJsonParseBytes(headerBytes, "header");
    const metadata = safeJsonParseBytes(metaBytes, "metadata");

    const certBlob =
      certBytes && certBytes.length
        ? new Blob([certBytes], { type: "image/png" })
        : null;

    const mediaMime = sniffVideoMime(mediaBytes);
    const mediaBlob = new Blob([mediaBytes], { type: mediaMime });

    return { header, metadata, certBlob, mediaBlob, mediaMime };
  }

  // ------------------------------------------------------------
  // UI helpers (make these tolerant to id mismatches)
  // ------------------------------------------------------------
  function setTextAny(ids, value, fallback = "Loading…") {
    const v = value != null && value !== "" ? value : fallback;
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    }
  }

  function hydrateMeta(header, metadata) {
    header = header || {};
    metadata = metadata || {};

    console.log("[FXS Viewer] hydrateMeta()", { header, metadata });

    const asset = metadata.asset || metadata;
    const owner = metadata.current_owner || {};
    const token = metadata.token || metadata.blockchain || {};

    // Try multiple ids so we don't get stuck on "Loading..."
    setTextAny(["asset-title", "assetTitle", "title"], asset.title || header.title || "Untitled asset", "Untitled asset");
    setTextAny(["asset-subtitle", "assetSubtitle", "subtitle"], asset.subtitle || header.subtitle || "", "");
    setTextAny(["asset-token-id", "tokenId", "token_id"], token.token_id || header.token_id || "Pending", "Pending");

    setTextAny(["owner-wallet", "ownerWallet", "wallet_address"], owner.wallet_address || "N/A", "N/A");
    setTextAny(["owner-name", "ownerName"], owner.name || "Owner", "Owner");
  }

  // ------------------------------------------------------------
  // Primary asset mounting (blob-safe)
  // ------------------------------------------------------------
  let currentMediaUrl = null;
  let currentCertUrl = null;

  function getAssetSlot() {
    return (
      document.getElementById("asset-slot") ||
      document.getElementById("primary-asset-slot") ||
      document.getElementById("asset-container") ||
      document.querySelector("[data-role='asset-slot']") ||
      document.querySelector(".asset-slot") ||
      document.querySelector(".primary-asset") ||
      document.querySelector(".asset-panel") ||
      document.querySelector(".frame") ||
      document.body
    );
  }

  function mountPrimaryAsset(src, mimeHint) {
    console.log("[FXS Viewer] mountPrimaryAsset() called with:", src);

    const slot = getAssetSlot();
    if (!slot) {
      console.error("[FXS Viewer] No asset slot found.");
      return;
    }

    slot.innerHTML = "";

    const isSpecial =
      typeof src === "string" &&
      (src.startsWith("blob:") ||
        src.startsWith("http://") ||
        src.startsWith("https://") ||
        src.startsWith("data:"));

    // If it's NOT a blob/http/data URL, normalize into /media/
    let normalized = src;
    if (!isSpecial) {
      normalized = normalized || "media/asset.mp4";
      if (typeof normalized === "string" && !normalized.startsWith("media/")) {
        normalized = normalized.replace(/^\.\//, "");
        normalized = "media/" + normalized;
      }
    }

    // Decide by extension ONLY for non-blob paths
    let ext = "";
    if (!isSpecial && typeof normalized === "string") {
      ext = normalized.split(".").pop().toLowerCase();
    }

    let node;

    // For blobs we treat as video first (your current pipeline)
    const treatAsVideo =
      isSpecial || ["mp4", "mov", "webm", "ogg"].includes(ext);

    if (treatAsVideo) {
      node = document.createElement("video");
      node.controls = true;
      node.playsInline = true;
      node.autoplay = false;
      node.style.width = "100%";
      node.style.height = "100%";

      // Use <source> so Edge gets a mime hint
      const source = document.createElement("source");
      source.src = isSpecial ? src : normalized;
      source.type = mimeHint || (ext === "mov" ? "video/quicktime" : "video/mp4");
      node.appendChild(source);

      node.addEventListener("loadedmetadata", () => {
        console.log("[FXS Viewer] video loadedmetadata", {
          duration: node.duration,
          videoWidth: node.videoWidth,
          videoHeight: node.videoHeight,
          readyState: node.readyState,
        });
      });

      node.addEventListener("canplay", () => {
        console.log("[FXS Viewer] video canplay", { readyState: node.readyState });
      });

      node.addEventListener("error", () => {
        console.error("[FXS Viewer] video ERROR", node.error);
      });

      // Force load after source appended
      node.load();
    } else if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
      node = document.createElement("img");
      node.alt = "Primary asset";
      node.style.maxWidth = "100%";
      node.style.maxHeight = "100%";
      node.src = normalized;
    } else {
      node = document.createElement("a");
      node.href = normalized;
      node.target = "_blank";
      node.textContent = "Open asset file";
    }

    slot.appendChild(node);
  }

  function mountFromParsed({ header, metadata, certBlob, mediaBlob, mediaMime }) {
    // Clean up old URLs
    if (currentMediaUrl) URL.revokeObjectURL(currentMediaUrl);
    if (currentCertUrl) URL.revokeObjectURL(currentCertUrl);

    currentMediaUrl = URL.createObjectURL(mediaBlob);

    if (certBlob) {
      currentCertUrl = URL.createObjectURL(certBlob);
      const certLink = document.getElementById("certLink");
      if (certLink) {
        certLink.href = currentCertUrl;
        certLink.target = "_blank";
        certLink.style.pointerEvents = "auto";
        certLink.style.opacity = "1";
      }
    } else {
      console.log("[FXS Viewer] cert present: false");
    }

    hydrateMeta(header, metadata);
    mountPrimaryAsset(currentMediaUrl, mediaMime);

    const assetBadge = document.getElementById("assetStatus");
    if (assetBadge) assetBadge.textContent = "ASSET: READY";
  }

  async function openFXSFile(file) {
    const buf = await file.arrayBuffer();
    const parsed = parseFXS(buf);

    console.log("[FXS Viewer] header:", parsed.header);
    console.log("[FXS Viewer] metadata:", parsed.metadata);

    mountFromParsed(parsed);
  }

  // ------------------------------------------------------------
  // Boot: live mode json + optional embedded mode
  // ------------------------------------------------------------
  async function loadJson(path, fallback = {}) {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json();
    } catch (err) {
      console.warn("[FXS Viewer] Could not load JSON:", path, err);
      return fallback;
    }
  }

  function getQueryParam(name) {
    try {
      const params = new URLSearchParams(window.location.search);
      const value = params.get(name);
      return value && value.trim() !== "" ? value.trim() : null;
    } catch (e) {
      console.warn("[FXS Viewer] URLSearchParams not available:", e);
      return null;
    }
  }

  async function initViewer() {
    console.log("[FXS Viewer] Booting...");

    // If opened as file://, try embedded globals
    if (window.location.protocol === "file:") {
      console.log("[FXS Viewer] file:// detected (embedded mode)");
      const header = window.__FXS_HEADER__ || {};
      const metadata = window.__FXS_METADATA__ || {};
      hydrateMeta(header, metadata);

      const embeddedPath =
        (metadata.media && metadata.media.file_path) || "media/asset.mp4";
      mountPrimaryAsset(embeddedPath);
      return;
    }

    // Live mode: load json
    const metaParam = getQueryParam("meta");
    const headerParam = getQueryParam("header");

    const headerUrl = headerParam || "metadata/header.json";
    const metadataUrl = metaParam || "metadata/metadata.json";

    console.log("[FXS Viewer] Loading header from:", headerUrl);
    console.log("[FXS Viewer] Loading metadata from:", metadataUrl);

    const [header, metadata] = await Promise.all([
      loadJson(headerUrl, {}),
      loadJson(metadataUrl, {}),
    ]);

    hydrateMeta(header, metadata);

    const livePath =
      (metadata.media && metadata.media.file_path) || "media/asset.mp4";
    mountPrimaryAsset(livePath);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const fxsInput = document.getElementById("fxsInput");

    if (fxsInput) {
      fxsInput.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        console.log("[FXS Viewer] FXS file selected:", file.name);
        await openFXSFile(file);
      });
    }

    // Boot live/embedded view
    initViewer().catch((err) => {
      console.error("[FXS Viewer] Boot failed:", err);
    });
  });
})();
