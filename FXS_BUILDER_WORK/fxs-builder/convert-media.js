// fxs-builder/convert-media.js
// Simple helper: convert asset.mov -> asset.mp4 and update metadata.json

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const TEMPLATE_ROOT = path.join(__dirname, "fxs_template_v1");
const MEDIA_DIR = path.join(TEMPLATE_ROOT, "media");
const METADATA_PATH = path.join(TEMPLATE_ROOT, "metadata", "metadata.json");

// You can change these later if you want different names
const INPUT_NAME = "asset.mov";
const OUTPUT_NAME = "asset.mp4";

const inputPath = path.join(MEDIA_DIR, INPUT_NAME);
const outputPath = path.join(MEDIA_DIR, OUTPUT_NAME);

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function run() {
  console.log("=== FXS Media Converter ===");

  // 1) Make sure asset.mov exists
  if (!fileExists(inputPath)) {
    console.error(`[ERROR] Could not find ${INPUT_NAME} in media folder:`);
    console.error(`  ${inputPath}`);
    console.error("Drop your .mov file there and run this again.");
    process.exit(1);
  }

  console.log(`[INFO] Found input: ${inputPath}`);

  // 2) Run ffmpeg to convert .mov -> .mp4
  console.log("[INFO] Converting to MP4 with ffmpeg...");

  await new Promise((resolve, reject) => {
    const args = [
      "-y",          // overwrite output if it exists
      "-i", inputPath,
      "-c:v", "libx264",
      "-c:a", "aac",
      outputPath,
    ];

    const child = execFile("ffmpeg", args, (error, stdout, stderr) => {
      if (error) {
        console.error("[ERROR] ffmpeg failed:");
        console.error(stderr || error.message);
        return reject(error);
      }

      console.log("[INFO] ffmpeg conversion complete.");
      resolve();
    });

    child.stdout?.on("data", (d) => process.stdout.write(d));
    child.stderr?.on("data", (d) => process.stderr.write(d));
  });

  // 3) Confirm MP4 exists
  if (!fileExists(outputPath)) {
    console.error("[ERROR] Conversion finished but asset.mp4 not found.");
    process.exit(1);
  }

  const stats = fs.statSync(outputPath);
  const byteSize = stats.size;

  console.log(`[INFO] Wrote ${OUTPUT_NAME} (${byteSize} bytes).`);

  // 4) Update metadata.json
  console.log("[INFO] Updating metadata.json ...");

  const raw = fs.readFileSync(METADATA_PATH, "utf8");
  const metadata = JSON.parse(raw);

  if (!metadata.media) {
    metadata.media = {};
  }

  metadata.media.file_path = "media/asset.mp4";
  metadata.media.mime_type = "video/mp4";

  // Optional: fill size; duration_seconds & hash can be added later
  metadata.media.byte_size = byteSize;
  metadata.media.duration_seconds = metadata.media.duration_seconds || 0;
  metadata.media.hash_sha256 = metadata.media.hash_sha256 || "REPLACE_WITH_MEDIA_HASH";

  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2), "utf8");

  console.log("[INFO] metadata.json updated:");
  console.log("  media.file_path  = media/asset.mp4");
  console.log("  media.mime_type  = video/mp4");
  console.log("  media.byte_size  =", byteSize);
  console.log("=== Done. You can now run the builder. ===");
}

run().catch((err) => {
  console.error("[FATAL] Unexpected error in convert-media.js:");
  console.error(err);
  process.exit(1);
});
