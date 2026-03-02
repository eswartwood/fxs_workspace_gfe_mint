// src/app/api/r2/presign/route.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";

function safeKeyPart(s: string) {
  return (s || "")
    .replace(/[^\w\-./]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function extFromName(name: string) {
  const m = (name || "").toLowerCase().match(/\.([a-z0-9]{1,8})$/);
  return m ? `.${m[1]}` : "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const fileName = String(body.fileName || "asset.bin");
    const contentType = String(body.contentType || "application/octet-stream");

    const bucket = process.env.R2_BUCKET;
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!bucket || !accountId || !accessKeyId || !secretAccessKey) {
      return new Response("Missing R2 env vars", { status: 500 });
    }

    // Key layout: gfe-assets/YYYY/MM/DD/<timestamp>_<safeName>.ext
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");

    const base = safeKeyPart(fileName.replace(extFromName(fileName), ""));
    const ext = extFromName(fileName) || ".bin";
    const stamp = `${Date.now()}`;

    const r2Key = `gfe-assets/${yyyy}/${mm}/${dd}/${stamp}_${base}${ext}`;

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    // IMPORTANT: do NOT sign ContentLength (avoids browser mismatch headaches)
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: r2Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 }); // 5 minutes

    return Response.json({ uploadUrl, r2Key });
  } catch (e: any) {
    console.error("presign error:", e);
    return new Response(`presign error: ${e?.message || String(e)}`, { status: 500 });
  }
}
