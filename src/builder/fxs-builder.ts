import fs from "fs";
import path from "path";

/**
 * Build a real .fxs SmartFile
 * - Embeds header.json
 * - Embeds metadata.json (with auto timestamp)
 * - Embeds certificate.png
 * - Embeds the user’s media file
 * - Produces a structured .fxs container
 */

export async function buildFXS(fileBuffer: Buffer, workspaceDir: string) {
  const templatesDir = path.join(workspaceDir, "src", "builder", "templates");

  // Load header
  const headerRaw = fs.readFileSync(path.join(templatesDir, "header.json"), "utf8");
  const header = JSON.parse(headerRaw);

  // Load & update metadata
  const metadataPath = path.join(templatesDir, "metadata.json");
  const metadataRaw = fs.readFileSync(metadataPath, "utf8");
  const metadata = JSON.parse(metadataRaw);
  metadata.timestamp = new Date().toISOString();

  // Load certificate
  const certificate = fs.readFileSync(path.join(templatesDir, "certificate.png"));

  // --- PACKAGE FORMAT ---
  // [HEADER LENGTH][HEADER JSON]
  // [METADATA LENGTH][METADATA JSON]
  // [CERT LENGTH][CERT BYTES]
  // [MEDIA LENGTH][MEDIA BYTES]

  function encodeSection(json: any | Buffer) {
    const payload = Buffer.isBuffer(json)
      ? json
      : Buffer.from(JSON.stringify(json), "utf8");

    const length = Buffer.alloc(4);
    length.writeUInt32BE(payload.length);

    return Buffer.concat([length, payload]);
  }

  const packaged = Buffer.concat([
    encodeSection(header),
    encodeSection(metadata),
    encodeSection(certificate),
    encodeSection(fileBuffer)
  ]);

  return packaged;
}
