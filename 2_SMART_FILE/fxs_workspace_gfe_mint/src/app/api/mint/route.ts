// src/app/api/mint/route.ts
import JSZip from "jszip";
import os from "os";
import path from "path";
import { promises as fs } from "fs";
import { spawn } from "child_process";

export const runtime = "nodejs";

function safeFileName(name: string) {
  return (name || "GFE_File")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function u32le(n: number) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

function u64le(n: number) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(Math.max(0, Math.floor(n))), 0);
  return b;
}

function bufferFromArrayBuffer(ab: ArrayBuffer) {
  return Buffer.from(new Uint8Array(ab));
}

function inferMimeFromName(fileName: string) {
  const f = (fileName || "").toLowerCase();
  if (f.endsWith(".mp4")) return "video/mp4";
  if (f.endsWith(".mov")) return "video/mp4"; // after convert
  if (f.endsWith(".webm")) return "video/webm";
  if (f.endsWith(".mp3")) return "audio/mpeg";
  if (f.endsWith(".wav")) return "audio/wav";
  if (f.endsWith(".png")) return "image/png";
  if (f.endsWith(".jpg") || f.endsWith(".jpeg")) return "image/jpeg";
  if (f.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

async function convertMovToMp4(inputMov: Buffer): Promise<Buffer> {
  // Uses system ffmpeg from PATH (most reliable on Windows + Next)
  // Output: H.264 + AAC, faststart
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "fxs-"));
  const inPath = path.join(tmpDir, "input.mov");
  const outPath = path.join(tmpDir, "output.mp4");

  await fs.writeFile(inPath, inputMov);

  await new Promise<void>((resolve, reject) => {
    const p = spawn(
      "ffmpeg",
      [
        "-y",
        "-i",
        inPath,
        "-movflags",
        "faststart",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        outPath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));

    p.on("error", (e) => reject(e));
    p.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg failed (code ${code})\n${stderr}`));
    });
  });

  const outBytes = await fs.readFile(outPath);

  // best-effort cleanup
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch {}

  return outBytes;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const file = form.get("file");
    if (!(file instanceof File)) {
      return new Response("Missing file", { status: 400 });
    }

    const title = String(form.get("title") || "").trim() || file.name;
    const creatorName = String(form.get("creator") || "Global Data Capture").trim();
    const ownerName = String(form.get("owner") || "REPLACE_WITH_OWNER_NAME").trim();
    const network = String(form.get("network") || "polygon-mainnet").trim();

    // ---- Read uploaded bytes
    let assetBytes = bufferFromArrayBuffer(await file.arrayBuffer());
    const originalName = file.name || "asset.bin";
    const originalType = file.type || inferMimeFromName(originalName);

    // ---- Convert MOV → MP4 if needed
    const looksLikeMov =
      originalType === "video/quicktime" || originalName.toLowerCase().endsWith(".mov");

    let mediaFileName = originalName;
    let mediaMime = originalType;

    if (looksLikeMov) {
      // This requires ffmpeg installed and available as "ffmpeg"
      assetBytes = await convertMovToMp4(assetBytes);
      mediaFileName = "asset.mp4";
      mediaMime = "video/mp4";
    } else {
      // normalize name for the viewer default
      // if it's already mp4, we still store as asset.mp4 so viewer doesn't miss it
      const lower = originalName.toLowerCase();
      if (lower.endsWith(".mp4")) {
        mediaFileName = "asset.mp4";
        mediaMime = "video/mp4";
      } else {
        // keep as generic asset.bin (viewer will still mount it if metadata points to it)
        mediaFileName = "asset.bin";
        mediaMime = originalType || inferMimeFromName(mediaFileName);
      }
    }

    // ---- Viewer expects these files
    const header = {
      title,
      creator_name: creatorName,
      owner_name: ownerName,
      network,
      issued_at: new Date().toISOString(),
      token_id: "",
      credential_id: "",
      version: "fxs-zip-v1",
    };

    const metadata = {
      title,
      creator: { name: creatorName },
      current_owner: { name: ownerName, wallet_address: "" },
      blockchain: { network_name: network, token_id: "" },
      stats: { opens: 0, views: 0 },
      minted_at: header.issued_at,
      credential_id: "",
      media: {
        file_path: "media/asset.mp4", // keep viewer default path stable
        mime_type: mediaMime,
        bytes: assetBytes.length,
        original_filename: originalName,
      },
      version: "fxs-zip-v1",
    };

    // If we didn't end up with mp4, point metadata to the real stored path
    const storedMediaPath =
      mediaFileName === "asset.mp4" ? "media/asset.mp4" : `media/${mediaFileName}`;
    metadata.media.file_path = storedMediaPath;

    const headerJson = Buffer.from(JSON.stringify(header, null, 2), "utf8");
    const metadataJson = Buffer.from(JSON.stringify(metadata, null, 2), "utf8");

    // ---- ZIP payload (what Electron extracts)
    const zip = new JSZip();
    zip.file("metadata/header.json", headerJson);
    zip.file("metadata/metadata.json", metadataJson);
    zip.file(storedMediaPath, assetBytes);

    const zipBytes: Buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    // ---- Outer .fxs container
    const MAGIC = Buffer.from("FXS1");
    const VERSION = u32le(1);

    const metaLen = u32le(metadataJson.length);
    const zipLen = u64le(zipBytes.length);

    const fxsBytes = Buffer.concat([
      MAGIC,
      VERSION,
      metaLen,
      metadataJson,
      zipLen,
      zipBytes,
    ]);

    const outName = `${safeFileName(title)}.fxs`;

    return new Response(fxsBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${outName}"`,
      },
    });
  } catch (e: any) {
    console.error("Mint error:", e);
    return new Response(`Mint error: ${e?.message || String(e)}`, { status: 500 });
  }
}
