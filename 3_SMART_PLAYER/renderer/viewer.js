/* global JSZip */
(() => {
  // ---------------------------
  // DOM helpers
  // ---------------------------
  const $ = (id) => document.getElementById(id);

  const el = {
    primaryAsset: $("primaryAsset"),
    pillAsset: $("pillAsset"),
    pillNetwork: $("pillNetwork"),
    pillStatus: $("pillStatus"),
    mediaPlaceholder: $("mediaPlaceholder"),

    fieldTitle: $("fieldTitle"),
    fieldTokenId: $("fieldTokenId"),
    fieldOpens: $("fieldOpens"),
    fieldOwner: $("fieldOwner"),
    fieldOwnerWallet: $("fieldOwnerWallet"),
    fieldIssued: $("fieldIssued"),
    fieldCreator: $("fieldCreator"),
    fieldCredentialId: $("fieldCredentialId"),

    btnViewCert: $("btnViewCert"),
    btnOpenDashboard: $("btnOpenDashboard"),
  };

  const log = (...a) => console.log("[FXS Viewer]", ...a);
  const warn = (...a) => console.warn("[FXS Viewer]", ...a);
  const err = (...a) => console.error("[FXS Viewer]", ...a);

  const safeText = (v, fallback = "—") => {
    if (v === undefined || v === null) return fallback;
    const s = String(v);
    return s.trim().length ? s : fallback;
  };

  // ---------------------------
  // UI setters
  // ---------------------------
  function setPill(node, label, value) {
    if (!node) return;
    const img = node.querySelector && node.querySelector("img");
    node.innerHTML = img
      ? `${img.outerHTML}<strong>${label}:</strong> ${safeText(value)}`
      : `<strong>${label}:</strong> ${safeText(value)}`;
  }

  function setStatus(text) {
    setPill(el.pillStatus, "Status", text);
  }

  function setAssetStatus(text) {
    setPill(el.pillAsset, "Asset", text);
  }

  function clearAssetMount() {
    if (!el.primaryAsset) return;
    const kids = Array.from(el.primaryAsset.children);
    for (const k of kids) {
      if (k.id === "mediaPlaceholder") continue;
      el.primaryAsset.removeChild(k);
    }
    if (el.mediaPlaceholder) el.mediaPlaceholder.style.display = "flex";
  }

  function mountPrimaryAsset(blobUrl, mime) {
    clearAssetMount();

    let node = null;

    if (mime.startsWith("video/")) {
      node = document.createElement("video");
      node.src = blobUrl;
      node.controls = true;
      node.autoplay = true;
      node.playsInline = true;
      node.style.width = "100%";
      node.style.height = "100%";
      node.style.objectFit = "contain";
    } else if (mime.startsWith("image/")) {
      node = document.createElement("img");
      node.src = blobUrl;
      node.alt = "FXS Asset";
      node.style.width = "100%";
      node.style.height = "100%";
      node.style.objectFit = "contain";
    } else if (mime.startsWith("audio/")) {
      node = document.createElement("audio");
      node.src = blobUrl;
      node.controls = true;
      node.autoplay = true;
      node.style.width = "100%";
    } else {
      node = document.createElement("iframe");
      node.src = blobUrl;
      node.style.width = "100%";
      node.style.height = "100%";
      node.style.border = "0";
      node.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-downloads");
    }

    el.primaryAsset.appendChild(node);
    if (el.mediaPlaceholder) el.mediaPlaceholder.style.display = "none";
  }

  // ---------------------------
  // Metadata hydrate (your schema)
  // ---------------------------
  function hydrateMeta(header, metadata) {
    el.fieldTitle.textContent = safeText(metadata?.title || header?.title);

    el.fieldTokenId.textContent = safeText(
      metadata?.blockchain?.token_id ||
      metadata?.blockchain?.tokenId ||
      header?.token_id ||
      header?.tokenId
    );

    const opens = metadata?.stats?.opens ?? metadata?.stats?.views ?? metadata?.opens ?? 0;
    el.fieldOpens.textContent = safeText(opens, "0");

    el.fieldOwner.textContent = safeText(
      metadata?.current_owner?.name || metadata?.owner?.name || header?.owner_name
    );

    el.fieldOwnerWallet.textContent = safeText(
      metadata?.current_owner?.wallet_address ||
      metadata?.owner?.wallet_address ||
      header?.owner_wallet
    );

    el.fieldIssued.textContent = safeText(
      metadata?.minted_at || metadata?.created_at || header?.issued_at
    );

    el.fieldCreator.textContent = safeText(metadata?.creator?.name || header?.creator_name);

    el.fieldCredentialId.textContent = safeText(
      metadata?.credential_id || metadata?.credentials?.credential_id || header?.credential_id
    );

    const net =
      metadata?.blockchain?.network_name || metadata?.blockchain?.network || "offline";
    if (el.pillNetwork) el.pillNetwork.textContent = `Network: ${safeText(net, "offline")}`;
  }

  // ---------------------------
  // ZIP helpers
  // ---------------------------
  function safeJsonParse(txt, fallback = {}) {
    try {
      return JSON.parse(txt);
    } catch {
      return fallback;
    }
  }

  async function readZipTextFirst(zip, paths) {
    for (const p of paths) {
      const f = zip.file(p);
      if (f) return await f.async("string");
    }
    return "";
  }

  function inferMimeFromPath(p) {
    const x = (p || "").toLowerCase();
    if (x.endsWith(".mp4")) return "video/mp4";
    if (x.endsWith(".webm")) return "video/webm";
    if (x.endsWith(".mov")) return "video/quicktime";
    if (x.endsWith(".mp3")) return "audio/mpeg";
    if (x.endsWith(".wav")) return "audio/wav";
    if (x.endsWith(".ogg")) return "audio/ogg";
    if (x.endsWith(".png")) return "image/png";
    if (x.endsWith(".jpg") || x.endsWith(".jpeg")) return "image/jpeg";
    if (x.endsWith(".gif")) return "image/gif";
    return "application/octet-stream";
  }

  function pickBestMediaPath(zip, metadata) {
    // 1) metadata explicit path
    const metaPath =
      metadata?.media?.file_path ||
      metadata?.media?.path ||
      metadata?.asset?.file_path ||
      metadata?.asset?.path;

    if (metaPath && zip.file(metaPath)) return metaPath;

    // 2) common defaults (old + new)
    const candidates = [
      "media/asset.mp4",
      "media/asset.mov",
      "asset/asset.mp4",
      "asset/asset.mov",
      "asset/test-video.mp4",
      "asset/test-video.mov",
    ];
    for (const c of candidates) {
      if (zip.file(c)) return c;
    }

    // 3) scan zip for best match
    const all = Object.keys(zip.files || {});
    const filesOnly = all.filter((p) => !zip.files[p].dir);

    const exts = [".mp4", ".webm", ".mov", ".mp3", ".wav", ".ogg", ".png", ".jpg", ".jpeg", ".gif"];
    const mediaish = filesOnly.filter((p) => exts.some((e) => p.toLowerCase().endsWith(e)));

    // Prefer video first, and mp4 over mov
    const score = (p) => {
      const x = p.toLowerCase();
      if (x.endsWith(".mp4")) return 100;
      if (x.endsWith(".webm")) return 90;
      if (x.endsWith(".mov")) return 80;
      if (x.endsWith(".mp3")) return 60;
      if (x.endsWith(".wav")) return 55;
      if (x.endsWith(".png") || x.endsWith(".jpg") || x.endsWith(".jpeg") || x.endsWith(".gif")) return 40;
      return 0;
    };

    mediaish.sort((a, b) => score(b) - score(a));
    return mediaish[0] || "";
  }

  async function bootFromZip(zipBytesU8) {
    if (!window.JSZip) {
      warn("JSZip not available; cannot read zip payload.");
      setStatus("error: jszip missing");
      return;
    }

    setStatus("reading payload…");
    setAssetStatus("pending");

    const zip = await JSZip.loadAsync(zipBytesU8);

    // Support both old and current file layouts
    const headerTxt = await readZipTextFirst(zip, [
      "metadata/header.json",
      "header.json",
    ]);

    const metaTxt = await readZipTextFirst(zip, [
      "metadata/metadata.json",
      "metadata.json",
      "metadata/metadata_v1.json",
    ]);

    const header = safeJsonParse(headerTxt, {});
    const metadata = safeJsonParse(metaTxt, {});

    log("Header loaded:", header);
    log("Metadata loaded:", metadata);

    hydrateMeta(header, metadata);

    const mediaPathInZip = pickBestMediaPath(zip, metadata);
    if (!mediaPathInZip) {
      warn("No media file found in zip.");
      setAssetStatus("missing");
      setStatus("loaded (no asset)");
      return;
    }

    const mediaFile = zip.file(mediaPathInZip);
    if (!mediaFile) {
      warn("Media file not found in zip:", mediaPathInZip);
      setAssetStatus("missing");
      setStatus("loaded (no asset)");
      return;
    }

    // Best-effort mime: metadata > infer from extension
    let mime =
      metadata?.media?.mime_type ||
      metadata?.media?.mime ||
      inferMimeFromPath(mediaPathInZip);

    const mediaBytes = await mediaFile.async("uint8array");
    const blobUrl = URL.createObjectURL(new Blob([mediaBytes], { type: mime }));

    log("Mounting media:", mediaPathInZip, "mime:", mime, "bytes:", mediaBytes?.byteLength ?? mediaBytes?.length);
    mountPrimaryAsset(blobUrl, mime);

    setAssetStatus("mounted");
    setStatus("loaded");
  }

  // ---------------------------
  // Final Electron bridge (FINAL)
  // ---------------------------
  function attachFinalElectronBridge() {
    const FXS = window.FXS;
    if (!FXS || typeof FXS.onOpenFile !== "function") return false;

    log("Electron bridge detected ✅");
    setStatus("waiting for file…");

    FXS.onOpenFile(async (filePath) => {
      try {
        log("Open request:", filePath);
        setStatus("opening…");
        setAssetStatus("extracting…");

        if (typeof FXS.extractZipFromFXS !== "function") {
          warn("FXS.extractZipFromFXS missing in preload");
          setStatus("error: extractZipFromFXS missing");
          setAssetStatus("error");
          return;
        }

        const zipBytes = await FXS.extractZipFromFXS(filePath); // Uint8Array
        log("ZIP bytes length:", zipBytes?.byteLength ?? zipBytes?.length ?? "??");

        await bootFromZip(zipBytes);
      } catch (e) {
        err("Failed to open SmartFile:", e);
        setStatus("error");
        setAssetStatus("error");
      }
    });

    return true;
  }

  // ---------------------------
  // Buttons
  // ---------------------------
  function wireButtons() {
    el.btnOpenDashboard?.addEventListener("click", () => {
      window.open("https://theglobaltokenexchange.com/dashboard", "_blank");
    });

    el.btnViewCert?.addEventListener("click", () => {
      alert("Certificate viewing will be enabled once the certificate payload is wired.");
    });
  }

  // ---------------------------
  // Boot
  // ---------------------------
  document.addEventListener("DOMContentLoaded", () => {
    wireButtons();
    clearAssetMount();
    setStatus("waiting");
    setAssetStatus("pending");

    const ok = attachFinalElectronBridge();
    if (!ok) {
      warn("No Electron bridge found (window.FXS missing). Preload not wired or opened in browser.");
      setStatus("waiting (no bridge)");
    }
  });
})();
