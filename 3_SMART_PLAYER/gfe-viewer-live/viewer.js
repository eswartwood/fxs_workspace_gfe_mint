// viewer.js — FXS SmartFile Viewer (supports FXS1 remote-r2 containers)

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

  // ------------------------------------------------------------
  // NEW: FXS1 container parser (matches your mint/route.ts)
  // Format:
  //   "FXS1" (4)
  //   version u32le (4)
  //   metaLen u32le (4)
  //   metadataJson (metaLen)
  //   zipLen u64le (8)
  //   zipBytes (zipLen)
  // ------------------------------------------------------------
  function parseFXS1(arrayBuffer) {
    const u8 = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    let o = 0;

    const magic = bytesToAscii(u8, 0, 4);
    if (magic !== "FXS1") {
      throw new Error(`[FXS Viewer] Unsupported magic '${magic}'. Expected 'FXS1'.`);
    }
    o += 4;

    const version = view.getUint32(o, true);
    o += 4;

    const metaLen = view.getUint32(o, true);
    o += 4;

    if (metaLen <= 0 || o + metaLen > view.byteLength) {
      throw new Error(`[FXS Viewer] Bad metaLen=${metaLen}`);
    }

    const metaBytes = new Uint8Array(arrayBuffer, o, metaLen);
    o += metaLen;

    // zipLen u64le
    const zipLen = Number(view.getBigUint64(o, true));
    o += 8;

    // zipBytes exist, but viewer doesn't need to unzip yet for remote mode
    if (zipLen < 0 || o + zipLen > view.byteLength) {
      throw new Error(`[FXS Viewer] Bad zipLen=${zipLen}`);
    }

    const metadata = safeJsonParseBytes(metaBytes, "metadata");

    console.log("[FXS Viewer] FXS1 parsed:", {
      magic,
      version,
      metaLen,
      zipLen,
      remote: metadata?.media?.remote,
    });

    return { metadata };
  }

  // ------------------------------------------------------------
  // UI helpers
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

    const owner = metadata.current_owner || {};
    const token = metadata.blockchain || {};

    setTextAny(["asset-title", "assetTitle", "title"], metadata.title || header.title || "Untitled asset", "Untitled asset");
    setTextAny(["asset-token-id", "tokenId", "token_id"], token.token_id || header.token_id || "Pending", "Pending");

    setTextAny(["owner-wallet", "ownerWallet", "wallet_address"], owner.wallet_address || "N/A", "N/A");
    setTextAny(["owner-name", "ownerName"], owner.name || "Owner", "Owner");
  }

  // ------------------------------------------------------------
  // Asset mounting (remote + blob)
  // ------------------------------------------------------------
  let currentMediaUrl = null;

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

  function mountVideoUrl(url, mimeHint) {
    const slot = getAssetSlot();
    slot.innerHTML = "";

    const video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.autoplay = false;
    video.style.width = "100%";
    video.style.height = "100%";

    const src = document.createElement("source");
    src.src = url;
    if (mimeHint) src.type = mimeHint;
    video.appendChild(src);

    video.addEventListener("error", () => {
      console.error("[FXS Viewer] video ERROR", video.error);
    });

    video.load();
    slot.appendChild(video);
  }

  async function mountRemoteFromMetadata(metadata) {
  const remote = metadata?.media?.remote;
  const url = remote?.url;

  const assetBadge = document.getElementById("assetStatus");

  if (!url) {
    if (assetBadge) assetBadge.textContent = "ASSET: missing";
    console.warn("[FXS Viewer] No metadata.media.remote.url found.");
    return;
  }

  // Show we’re attempting remote
  if (assetBadge) assetBadge.textContent = "ASSET: fetching...";

  const mime =
    remote?.mime ||
    metadata?.media?.mime_type ||
    metadata?.media?.mime ||
    "video/mp4";

  console.log("[FXS Viewer] Mounting remote asset:", { url, mime });

  mountVideoUrl(url, mime);

  if (assetBadge) assetBadge.textContent = "ASSET: remote";

  console.log("[FXS Viewer] remote url:", url);
}

  // ------------------------------------------------------------
  // Open .fxs file
  // ------------------------------------------------------------
  async function openFXSFile(file) {
    const buf = await file.arrayBuffer();

    // FXS1 route (current mint output)
    const parsed = parseFXS1(buf);

    // header is optional in FXS1 (we can derive UI from metadata)
    hydrateMeta({}, parsed.metadata);
    await mountRemoteFromMetadata(parsed.metadata);
  }

  // ------------------------------------------------------------
  // Boot / wiring
  // ------------------------------------------------------------
  async function initViewer() {
    console.log("[FXS Viewer] Booting...");

    // If you still have a live “folder mode”, keep it, but remote mode is file-open driven.
    // We won’t auto-fetch anything unless a .fxs is opened.
    const assetBadge = document.getElementById("assetStatus");
    if (assetBadge) assetBadge.textContent = "Waiting for SmartFile…";
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

    initViewer().catch((err) => console.error("[FXS Viewer] Boot failed:", err));
  });
})();
