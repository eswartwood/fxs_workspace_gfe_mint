// src/app/api/r2/get/route.ts
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const r2Key = String(body.r2Key || "").trim();

    if (!r2Key) return new Response("Missing r2Key", { status: 400 });

    const bucket = process.env.R2_BUCKET!;
    const accountId = process.env.R2_ACCOUNT_ID!;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;

    if (!bucket || !accountId || !accessKeyId || !secretAccessKey) {
      return new Response("Missing R2 env vars", { status: 500 });
    }

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const cmd = new GetObjectCommand({
      Bucket: bucket,
      Key: r2Key,
    });

    const downloadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 }); // 5 minutes

    return Response.json({ downloadUrl });
  } catch (e: any) {
    console.error("r2 get presign error:", e);
    return new Response(`r2 get presign error: ${e?.message || String(e)}`, {
      status: 500,
    });
  }
}

