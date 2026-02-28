// viewer.js – FXS SmartFile Viewer v1
// Clean, self-contained version

(function () {
  //
  // Helpers
  // ------------------------------------------------------------

  function safeJsonParseBytes(bytes, label) {
    const raw = new TextDecoder("utf-8").decode(bytes);

    // common cleanup: BOM, null bytes, trim
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
        } catch (e2) {
          // fall through
        }
      }

      console.error(`[FXS Viewer] Failed to parse ${label} JSON`, {
        e1,
        preview: s.slice(0, 200),
      });
      throw e1;
    }
  }

  function parseFXS(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  let o = 0;

  const readBlock = (label) => {
    if (o + 4 > view.byteLength) {
      throw new Error(`[FXS Viewer] ${label}: cannot read length (o=${o}, size=${view.byteLength})`);
    }

    // IMPORTANT:
    // Use the SAME endian as the builder.
    // Your current working state indicates builder is writing BIG-endian lengths.
    const len = view.getUint32(o, false);
    o += 4;

    if (len < 0 || o + len > view.byteLength) {
      throw new Error(`[FXS Viewer] ${label}: invalid len=${len} (o=${o}, size=${view.byteLength})`);
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
  const metaBytes   = readBlock("metadata");
  const certBytes   = readBlock("certificate"); // may be empty
  const mediaBytes  = readBlock("media");

  console.log("[FXS Viewer] block sizes:", {
    header: headerBytes.length,
    meta: metaBytes.length,
    cert: certBytes.length,
    media: mediaBytes.length,
  });

  // Quick sanity check: MP4 usually contains 'ftyp' near the start
  console.log("[FXS Viewer] media first32:", Array.from(mediaBytes.slice(0, 32)));

  const header = safeJsonParseBytes(headerBytes, "header");
  const metadata = safeJsonParseBytes(metaBytes, "metadata");

  const certBlob =
    certBytes && certBytes.length
      ? new Blob([certBytes], { type: "image/png" })
      : null;

  // Always treat packed media as MP4 for now (we’ll upgrade later)
  const mediaBlob = new Blob([mediaBytes], { type: "video/mp4" });

  return { header, metadata, certBlob, mediaBlob };
}

// show first 16 bytes of media (magic)
console.log("[FXS Viewer] media first16:", Array.from(mediaBytes.slice(0, 16)));


    // ---- Decode JSON safely ----
    const header = safeJsonParseBytes(headerBytes, "header");
    const metadata = safeJsonParseBytes(metaBytes, "metadata");

    const certBlob =
      certBytes && certBytes.length
        ? new Blob([certBytes], { type: "image/png" })
        : null;

    // NOTE: if you sometimes pack .mov, you can set video/quicktime;
    // but mp4 is fine for now. We'll auto-detect later if needed.
    const mediaBlob = new Blob([mediaBytes], { type: "video/mp4" });

    return { header, metadata, certBlob, mediaBlob };
  }

  let currentMediaUrl = null;
  let currentCertUrl = null;

  function mountFromBlobs(certBlob, mediaBlob) {
    // Clean up old URLs
    if (currentMediaUrl) URL.revokeObjectURL(currentMediaUrl);
    if (currentCertUrl) URL.revokeObjectURL(currentCertUrl);

    // Create new object URLs
    currentMediaUrl = URL.createObjectURL(mediaBlob);
    currentCertUrl = certBlob ? URL.createObjectURL(certBlob) : null;

    // Mount media
    mountPrimaryAsset(currentMediaUrl);

    // Wire certificate link (only if we actually have one)
    const certLink = document.getElementById("certLink");
    if (certLink) {
      if (currentCertUrl) {
        certLink.href = currentCertUrl;
        certLink.target = "_blank";
        certLink.style.pointerEvents = "auto";
        certLink.style.opacity = "1";
      } else {
        certLink.removeAttribute("href");
        certLink.style.pointerEvents = "none";
        certLink.style.opacity = "0.5";
      }
    }

    // Update badge
    const assetBadge = document.getElementById("assetStatus");
    if (assetBadge) assetBadge.textContent = "ASSET: READY";
  }

  async function openFXSFile(file) {
    const buf = await file.arrayBuffer();
    const { header, metadata, certBlob, mediaBlob } = parseFXS(buf);

    console.log("[FXS Viewer] header:", header);
    console.log("[FXS Viewer] metadata:", metadata);
    console.log("[FXS Viewer] cert present:", !!certBlob);

    hydrateMeta(header, metadata);
    mountFromBlobs(certBlob, mediaBlob);
  }

  // Optional JSON loader for http(s)
  async function loadJson(path, fallback = {}) {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`Failed to fetch ${path}`);
      return await res.json();
    } catch (err) {
      console.warn("[FXS Viewer] Could not load JSON:", path, err);
      return fallback;
    }
  }

  // Set innerText on an element if it exists
  function setText(id, value, fallback) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent =
      value != null && value !== "" ? value : fallback ?? "Loading…";
  }

  // Read a query-string parameter (?meta=..., ?header=..., etc.)
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

  //
  // Metadata + UI wiring
  // ------------------------------------------------------------

  function hydrateMeta(header, metadata) {
    header = header || {};
    metadata = metadata || {};

    console.log("[FXS Viewer] hydrateMeta()", { header, metadata });

    const asset = metadata.asset || metadata;
    const owner = metadata.current_owner || {};
    const token = metadata.token || metadata.blockchain || {};

    // Asset details
    setText("asset-title", asset.title || header.title || "Untitled asset", "Untitled asset");
    setText("asset-subtitle", asset.subtitle || header.subtitle || "", "");
    setText("asset-token-id", token.token_id || header.token_id || "Pending", "Pending");

    // Ownership
    setText("owner-wallet", owner.wallet_address || "N/A", "N/A");
    setText("owner-name", owner.name || "Owner", "Owner");
  }

  //
  // Primary asset mounting
  // ------------------------------------------------------------

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

  function mountPrimaryAsset(src) {
    console.log("[FXS Viewer] mountPrimaryAsset() called with:", src);

    const slot = getAssetSlot();
    if (!slot) {
      console.error("[FXS Viewer] No asset slot found.");
      return;
    }

    slot.innerHTML = "";

    const isBlobOrRemote =
      typeof src === "string" &&
      (src.startsWith("blob:") ||
        src.startsWith("http://") ||
        src.startsWith("https://") ||
        src.startsWith("data:"));

    // If it's a blob URL, treat as video by default (your current pipeline)
    let ext = "";
    if (!isBlobOrRemote && typeof src === "string") {
      ext = src.split(".").pop().toLowerCase();
    }

    let node;

    if (isBlobOrRemote || ["mp4", "mov", "webm", "ogg"].includes(ext)) {
      node = document.createElement("video");
      node.controls = true;
      node.playsInline = true;
      node.autoplay = false;
      node.style.width = "100%";
      node.style.height = "100%";
      node.src = src;
      node.load();

      node.addEventListener("loadedmetadata", () => {
  console.log("[FXS Viewer] video loadedmetadata", {
    duration: node.duration,
    videoWidth: node.videoWidth,
    videoHeight: node.videoHeight,
    readyState: node.readyState
  });
});

node.addEventListener("canplay", () => {
  console.log("[FXS Viewer] video canplay", { readyState: node.readyState });
});

node.addEventListener("error", () => {
  console.error("[FXS Viewer] video ERROR", node.error);
});

    } else if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
      node = document.createElement("img");
      node.alt = "Primary asset";
      node.style.maxWidth = "100%";
      node.style.maxHeight = "100%";
      node.src = src;
    } else {
      node = document.createElement("a");
      node.href = src;
      node.target = "_blank";
      node.textContent = "Open asset file";
    }

    slot.appendChild(node);
  }

  //
  // Boot sequence: supports both file:// (embedded) and http(s) (live JSON preview)
  // ------------------------------------------------------------

  async function initViewer() {
    console.log("[FXS Viewer] Booting…");

    const protocol = window.location.protocol;

    // PATH 1: file:// -> use embedded globals baked into the file
    if (protocol === "file:") {
      console.log("[FXS Viewer] Detected file:// protocol -> using EMBEDDED data");
      const header = window.__FXS_HEADER__ || {};
      const metadata = window.__FXS_METADATA__ || {};

      hydrateMeta(header, metadata);

      // In embedded mode you may still use a packaged media path; leaving as-is.
      const filePath =
        (metadata.media && metadata.media.file_path) || "media/asset.mov";

      mountPrimaryAsset(filePath);
      return;
    }

    // PATH 2: http/https -> load JSON files over the network
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

    const filePath =
      (metadata.media && metadata.media.file_path) || "media/asset.mov";

    mountPrimaryAsset(filePath);
  }

  //
  // DOM boot + file picker wiring
  // ------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", () => {
    const fxsInput = document.getElementById("fxsInput");

    if (fxsInput) {
      fxsInput.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        console.log("[FXS Viewer] FXS file selected:", file.name);
        await openFXSFile(file);
      });
    } else {
      console.warn("[FXS Viewer] No #fxsInput found (file picker disabled).");
    }

    // Boot embedded / live JSON preview mode
    initViewer().catch((err) => {
      console.error("[FXS Viewer] Boot failed:", err);
    });
  });
})();
