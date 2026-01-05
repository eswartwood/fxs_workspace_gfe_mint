/* renderer.js (FULL REPLACEMENT)
   Works with your current preload.js API:
   - window.FXS.extractZipFromFXS(path) -> Uint8Array
   - window.FXS.loadFile(path)          -> Uint8Array
   - window.FXS.onOpenFile(cb)
   ZIP viewer parsing via JSZip (must be included in index.html)
*/

(function () {
  const $ = (id) => document.getElementById(id);

  // Optional IDs (won’t crash if missing)
  const els = {
    fileInput: $("fileInput"),   // <input type="file" id="fileInput" />
    status: $("status"),
    fileName: $("fileName"),
    title: $("title"),
    creator: $("creator"),
    description: $("description"),
    certImg: $("certImg"),
    video: $("video"),
    audio: $("audio"),
  };

  function setStatus(msg, isError = false) {
    if (els.status) {
      els.status.textContent = msg;
      els.status.style.color = isError ? "#ff6b6b" : "";
    } else {
      console.log("[STATUS]", msg);
    }
  }

  function setFileName(name) {
    if (els.fileName) els.fileName.textContent = name || "";
  }

  function clearMedia() {
    if (els.video) {
      els.video.pause?.();
      els.video.removeAttribute("src");
      els.video.load?.();
    }
    if (els.audio) {
      els.audio.pause?.();
      els.audio.removeAttribute("src");
      els.audio.load?.();
    }
    if (els.certImg) {
      els.certImg.removeAttribute("src");
      els.certImg.style.display = "none";
    }
  }

  function setText(el, val) {
    if (!el) return;
    el.textContent = val ?? "";
  }

  function u8ToArrayBuffer(u8) {
    // Ensure we return a *tight* ArrayBuffer (not a larger underlying buffer)
    if (u8 instanceof ArrayBuffer) return u8;
    if (!(u8 instanceof Uint8Array)) throw new Error("Expected Uint8Array from preload.");
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  }

  async function parseZipPayload(zipArrayBuffer) {
    if (!window.JSZip) {
      throw new Error("JSZip not found. Add it to index.html (see below).");
    }

    const zip = await window.JSZip.loadAsync(zipArrayBuffer);

    const readText = async (path) => {
      const f = zip.file(path);
      if (!f) return null;
      return await f.async("string");
    };

    const readJSON = async (path) => {
      const txt = await readText(path);
      if (!txt) return null;
      try { return JSON.parse(txt); } catch { return txt; }
    };

    const readBlobUrl = async (path, mime) => {
      const f = zip.file(path);
      if (!f) return null;
      const data = await f.async("uint8array");
      const blob = new Blob([data], { type: mime || "application/octet-stream" });
      return URL.createObjectURL(blob);
    };

    // Flexible meta paths (covers your variations)
    const meta =
      (await readJSON("metadata/meta.json")) ||
      (await readJSON("meta.json")) ||
      (await readJSON("metadata.json")) ||
      null;

    // Optional assets
    const certUrl =
      (await readBlobUrl("certificate/certificate.png", "image/png")) ||
      (await readBlobUrl("certificate.png", "image/png")) ||
      null;

    const videoUrl =
      (await readBlobUrl("media/asset.mov", "video/quicktime")) ||
      (await readBlobUrl("media/asset.mp4", "video/mp4")) ||
      (await readBlobUrl("asset.mov", "video/quicktime")) ||
      (await readBlobUrl("asset.mp4", "video/mp4")) ||
      null;

    const audioUrl =
      (await readBlobUrl("media/asset.mp3", "audio/mpeg")) ||
      (await readBlobUrl("asset.mp3", "audio/mpeg")) ||
      null;

    return { meta, certUrl, videoUrl, audioUrl };
  }

  function applyToUI(parsed) {
    const meta = parsed?.meta || {};

    setText(els.title, meta.title || meta.name || "");
    setText(els.creator, meta.creator || meta.artist || meta.author || "");
    setText(els.description, meta.description || meta.desc || "");

    if (els.certImg && parsed.certUrl) {
      els.certImg.src = parsed.certUrl;
      els.certImg.style.display = "";
    }

    if (els.video && parsed.videoUrl) {
      els.video.src = parsed.videoUrl;
      els.video.load?.();
    }

    if (els.audio && parsed.audioUrl) {
      els.audio.src = parsed.audioUrl;
      els.audio.load?.();
    }
  }

  async function loadFromNativePath(filePath) {
    clearMedia();
    setFileName(filePath.split(/[\\/]/).pop());
    setStatus("Extracting ZIP payload...");

    if (!window.FXS?.extractZipFromFXS) {
      throw new Error("preload missing window.FXS.extractZipFromFXS");
    }

    // This returns Uint8Array (per your preload)
    const zipU8 = await window.FXS.extractZipFromFXS(filePath);
    const zipBuf = u8ToArrayBuffer(zipU8);

    setStatus("Parsing ZIP...");
    const parsed = await parseZipPayload(zipBuf);

    applyToUI(parsed);
    setStatus("Loaded.");
  }

  async function loadFromFileInput(file) {
    if (!file) return;
    clearMedia();
    setFileName(file.name);
    setStatus("Loading...");

    const buf = await file.arrayBuffer();

    // If user picks a *zip* directly, parse it.
    // If they pick a container .fxs, browser can’t call extractZipFromFXS (needs a path).
    const u8 = new Uint8Array(buf);
    const isZip = u8.length >= 2 && u8[0] === 0x50 && u8[1] === 0x4b;

    if (!isZip) {
      setStatus(
        "This looks like a container .fxs. Use native open (double-click / open-with) so Electron can extract the embedded ZIP.",
        true
      );
      return;
    }

    const parsed = await parseZipPayload(buf);
    applyToUI(parsed);
    setStatus("Loaded.");
  }

  // Wire file input (optional)
  if (els.fileInput) {
    els.fileInput.addEventListener("change", async (e) => {
      try {
        await loadFromFileInput(e.target.files?.[0]);
      } catch (err) {
        console.error(err);
        setStatus("Error: " + (err?.message || String(err)), true);
      }
    });
  }

  // Wire native open event (THIS is your main flow)
  if (window.FXS?.onOpenFile) {
    window.FXS.onOpenFile(async (filePath) => {
      try {
        if (filePath) await loadFromNativePath(filePath);
      } catch (err) {
        console.error(err);
        setStatus("Error: " + (err?.message || String(err)), true);
      }
    });
  }

  setStatus("Ready. (Tip: double-click an .fxs to test)");
})();
