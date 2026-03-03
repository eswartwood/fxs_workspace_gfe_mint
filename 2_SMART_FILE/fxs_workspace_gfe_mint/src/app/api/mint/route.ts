// src/app/api/mint/route.ts
import JSZip from "jszip";

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

function inferMimeFromName(fileName: string) {
  const f = (fileName || "").toLowerCase();
  if (f.endsWith(".mp4")) return "video/mp4";
  if (f.endsWith(".webm")) return "video/webm";
  if (f.endsWith(".mov")) return "video/quicktime";
  if (f.endsWith(".mp3")) return "audio/mpeg";
  if (f.endsWith(".wav")) return "audio/wav";
  if (f.endsWith(".png")) return "image/png";
  if (f.endsWith(".jpg") || f.endsWith(".jpeg")) return "image/jpeg";
  if (f.endsWith(".gif")) return "image/gif";
  if (f.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

/**
 * Option 2: pointer-based SmartFile
 * - Upload media to R2 first (browser PUT)
 * - Then mint a SMALL .fxs containing metadata + R2 pointer
 *
 * Viewer must read metadata.media.remote.* and fetch from URL/key.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const r2Key = String(body.r2Key || "").trim();
    if (!r2Key) return new Response("Missing r2Key", { status: 400 });

    const title =
      String(body.title || "").trim() ||
      r2Key.split("/").pop() ||
      "GFE_File";

    const creatorName = String(body.creator || "Global Data Capture, LLC").trim();
    const ownerName = String(body.owner || "REPLACE_WITH_OWNER_NAME").trim();
    const network = String(body.network || "polygon-mainnet").trim();

    const originalName =
      String(body.originalName || r2Key.split("/").pop() || "asset.bin").trim();

    const mimeType = String(body.mimeType || inferMimeFromName(originalName)).trim();

    const bytes =
      typeof body.bytes === "number" && Number.isFinite(body.bytes)
        ? Math.max(0, body.bytes)
        : 0;

    // REQUIRED for Option 2 “public fetch”
    // Set this to your R2 custom domain or public base URL, WITHOUT trailing slash.
    const publicBaseUrl = String(process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    if (!publicBaseUrl) {
      return new Response("Missing env R2_PUBLIC_BASE_URL", { status: 500 });
    }

    // Optional: which bucket this key belongs to (for internal/debug)
    const bucket = String(process.env.R2_BUCKET || "").trim();

    const issuedAt = new Date().toISOString();

    // --- Build asset URL
    const assetUrl = `${publicBaseUrl}/${encodeURI(r2Key)}`;

    // --- Header (small)
    const header = {
      title,
      creator_name: creatorName,
      owner_name: ownerName,
      network,
      issued_at: issuedAt,
      token_id: "",
      credential_id: "",
      version: "fxs-zip-v1",
      mode: "remote-r2-v1",

      // ✅ ADD so tools/viewer can find it easily
      r2Key,
      assetUrl,
    };

    // --- Metadata (the important part)
    const metadata = {
      title,

      // ✅ ADD top-level pointer fields (your console helper likely expects this)
      r2Key,
      assetUrl,

      creator: { name: creatorName },
      current_owner: { name: ownerName, wallet_address: "" },
      blockchain: { network_name: network, token_id: "" },
      stats: { opens: 0, views: 0 },
      minted_at: issuedAt,
      credential_id: "",

      media: {
        // keep a stable “logical” path, but signal remote mode
        file_path: "media/asset",
        mime_type: mimeType,
        bytes,
        original_filename: originalName,

        remote: {
          provider: "cloudflare-r2",
          bucket,

          // ✅ keep original field
          key: r2Key,

          // ✅ duplicate field name that many scripts expect
          r2Key,

          url: assetUrl,
        },
      },

      version: "fxs-zip-v1",
    };

    const headerJson = Buffer.from(JSON.stringify(header, null, 2), "utf8");
    const metadataJson = Buffer.from(JSON.stringify(metadata, null, 2), "utf8");

    // --- ZIP payload: ONLY metadata (no big media bytes)
    const zip = new JSZip();
    zip.file("metadata/header.json", headerJson);
    zip.file("metadata/metadata.json", metadataJson);

    // placeholder so viewer has something locally
    zip.file(
      "media/README_REMOTE.txt",
      "Remote media pointer. Viewer should fetch metadata.media.remote.url\n"
    );

    const zipBytes = (await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    })) as Buffer;

    // --- Outer .fxs container (tiny payload)
    const MAGIC = Buffer.from("FXS1");
    const VERSION = u32le(1);

    const metaLen = u32le(metadataJson.length);
    const zipLen = u64le(zipBytes.length);

    const fxsBytes = Buffer.concat([MAGIC, VERSION, metaLen, metadataJson, zipLen, zipBytes]);

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

