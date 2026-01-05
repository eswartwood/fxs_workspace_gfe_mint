// fxs-builder.js
// FINAL builder: pulls UI directly from the Player renderer (single source of truth)
// - Zips renderer/ (index.html, viewer.js, viewer.css, vendor/, metadata/, media/)
// - Hydrates metadata timestamps
// - Adds certificate.png from fxs-output/
// - Writes FFX-<tokenId>.fxs into fxs-output/

const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

// -------------------------
// Helpers
// -------------------------

function fileExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function readJson(p) {
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function safeMkdir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function addFileToZip(zip, zipEntryName, filePath, required = true) {
  if (!fileExists(filePath)) {
    const msg = `[FXS Builder] File not found for "${zipEntryName}": ${filePath}`;
    if (required) throw new Error(msg);
    console.warn(msg);
    return;
  }
  const data = fs.readFileSync(filePath);
  zip.file(zipEntryName, data);
  // console.log(`[FXS Builder] Added ${zipEntryName}`);
}

function addTextToZip(zip, zipEntryName, text) {
  zip.file(zipEntryName, text);
  // console.log(`[FXS Builder] Added ${zipEntryName} (text)`);
}

function addDirToZip(zip, srcDir, zipRoot = "") {
  // Recursively add a directory to zip, preserving structure
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const ent of entries) {
    const srcPath = path.join(srcDir, ent.name);
    const zipPath = zipRoot ? `${zipRoot}/${ent.name}` : ent.name;

    // Skip junk
    if (ent.name === ".DS_Store") continue;
    if (ent.name === "Thumbs.db") continue;
    if (ent.name === "node_modules") continue;

    if (ent.isDirectory()) {
      addDirToZip(zip, srcPath, zipPath);
    } else {
      addFileToZip(zip, zipPath, srcPath, true);
    }
  }
}

function loadBuildConfig() {
  const cfgPath = path.join(__dirname, "build-config.json");
  if (fileExists(cfgPath)) return readJson(cfgPath);
  return {};
}

function resolveRendererPath(cfg) {
  // 1) If config specifies rendererPath, use it (recommended)
  if (cfg.rendererPath) {
    const abs = path.isAbsolute(cfg.rendererPath)
      ? cfg.rendererPath
      : path.resolve(__dirname, cfg.rendererPath);
    if (!fileExists(abs)) {
      throw new Error(
        `[FXS Builder] rendererPath in build-config.json does not exist:\n${abs}`
      );
    }
    return abs;
  }

  // 2) Otherwise try common locations (best-effort)
  const tries = [
    path.resolve(__dirname, "..", "FXS_MASTER_SYSTEM", "3_SMART_PLAYER", "renderer"),
    path.resolve(__dirname, "..", "FXS_MASTER_STSTEM", "3_SMART_PLAYER", "renderer"),
    path.resolve(process.cwd(), "FXS_MASTER_SYSTEM", "3_SMART_PLAYER", "renderer"),
    path.resolve(process.cwd(), "FXS_MASTER_STSTEM", "3_SMART_PLAYER", "renderer"),
  ];

  for (const t of tries) {
    if (fileExists(t)) return t;
  }

  throw new Error(
    `[FXS Builder] Could not find renderer folder.\n` +
      `Create build-config.json next to fxs-builder.js with:\n` +
      `{\n  "rendererPath": "C:/.../FXS_MASTER_STSTEM/3_SMART_PLAYER/renderer"\n}\n` +
      `Tried:\n- ${tries.join("\n- ")}`
  );
}

function hydrateMetadata(metadataObj, tokenInfo = {}) {
  const now = new Date().toISOString();
  const tz =
    (Intl &&
      Intl.DateTimeFormat &&
      Intl.DateTimeFormat().resolvedOptions &&
      Intl.DateTimeFormat().resolvedOptions().timeZone) ||
    "UTC";

  // Preserve existing values if present, but ensure required ones exist
  metadataObj.created_at = metadataObj.created_at || now;
  metadataObj.minted_at = metadataObj.minted_at || now;
  metadataObj.timezone = metadataObj.timezone || tz;

  // If you pass tokenInfo overrides, apply them
  if (tokenInfo.engine_id) metadataObj.engine_id = tokenInfo.engine_id;
  if (tokenInfo.credential_id) metadataObj.credential_id = tokenInfo.credential_id;
  if (tokenInfo.title) metadataObj.title = tokenInfo.title;
  if (tokenInfo.subtitle) metadataObj.subtitle = tokenInfo.subtitle;
  if (tokenInfo.description) metadataObj.description = tokenInfo.description;

  // Ensure metrics exists (your newer UI uses this for views)
  metadataObj.metrics = metadataObj.metrics || {};
  if (typeof metadataObj.metrics.opens !== "number") metadataObj.metrics.opens = 0;

  // Owner acquired timestamp
  if (metadataObj.current_owner && !metadataObj.current_owner.acquired_at) {
    metadataObj.current_owner.acquired_at = now;
  }

  return metadataObj;
}

// -------------------------
// Main build function
// -------------------------

async function buildFXS(tokenInfo = {}) {
  const cfg = loadBuildConfig();

  const rendererDir = resolveRendererPath(cfg);
  const outputDirName = cfg.outputDir || "fxs-output";
  const outputDir = path.join(__dirname, outputDirName);
  safeMkdir(outputDir);

  const tokenId = tokenInfo.tokenId || cfg.defaultTokenId || "0001";
  const outName = `FFX-${tokenId}.fxs`;
  const outPath = path.join(outputDir, outName);

  console.log("▶ Building FXS SmartFile...");
  console.log(`[FXS Builder] Using renderer: ${rendererDir}`);

  const zip = new JSZip();

  // 1) Add entire renderer folder contents to root of .fxs
  // This guarantees we always run the exact same UI as the Electron player.
  // Expected inside the .fxs:
  // - index.html
  // - viewer.js / viewer.css
  // - vendor/
  // - metadata/
  // - media/
  // - file-icon.png, etc.
  addDirToZip(zip, rendererDir, "");

  // 2) Hydrate metadata timestamps and re-inject metadata/metadata.json (overwrite)
  const metadataPath = path.join(rendererDir, "metadata", "metadata.json");
  if (!fileExists(metadataPath)) {
    throw new Error(
      `[FXS Builder] Missing metadata.json at: ${metadataPath}\n` +
        `Your renderer must contain /metadata/metadata.json`
    );
  }

  let metadataObj = readJson(metadataPath);
  metadataObj = hydrateMetadata(metadataObj, tokenInfo);

  addTextToZip(zip, "metadata/metadata.json", JSON.stringify(metadataObj, null, 2));
  console.log("[FXS Builder] Metadata hydrated with timestamps");

  // 3) Certificate (from builder output folder)
  // Put it at /certificate.png (your UI links to this), and also /cert/certificate.png for safety.
  const certPath = path.join(outputDir, "certificate.png");
  if (fileExists(certPath)) {
    addFileToZip(zip, "certificate.png", certPath, false);
    addFileToZip(zip, "cert/certificate.png", certPath, false);
    console.log("[FXS Builder] Added certificate.png");
  } else {
    console.warn(
      `[FXS Builder] certificate.png not found at ${certPath} (skipping for now)`
    );
  }

  // 4) Write output
  const outBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  fs.writeFileSync(outPath, outBuffer);
  console.log(`✅ FXS SmartFile created at: ${outPath}`);
  return outPath;
}

module.exports = { buildFXS };
