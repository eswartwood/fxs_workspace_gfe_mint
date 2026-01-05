// src/builder/fxs-builder.ts
import path from "path";
import { promises as fs } from "fs";

const MAGIC = Buffer.from("FXS1", "utf8"); // 4 bytes
const VERSION = 1;

// Folder conventions inside your Next project
const TEMPLATES_DIR = path.join(process.cwd(), "src", "builder", "templates");
const GENERATED_DIR = path.join(process.cwd(), "src", "builder", "generated");

// ---- Schema (LOCKED) ----
// These keys should remain stable once we ship.
export type FxsMetadataV1 = {
  schemaVersion: "fxs.meta.v1";

  // Public display fields (viewer may show these)
  title: string;
  creatorName: string; // who created the work (artist / company / rights-holder)
  ownerName: string;   // who owns this token instance (collector / current owner label)
  network: string;

  // Machine fields (viewer can show or hide)
  issuedAt: string; // ISO datetime
  tokenId: string;  // placeholder until on-chain mint exists
  opens: number;

  // Optional / “hidden by UI” fields (still stored in file)
  ownerWallet?: string;
  creatorWallet?: string;
  credentialId?: string;
  dashboardUrl?: string;
  assetFilename?: string;
  assetMime?: string;
};

export type FxsBuildInput = {
  title: string;
  creatorName: string;
  ownerName: string;
  network: string;
  assetFilename: string;
  assetBytes: Buffer;

  // optional advanced fields (safe to omit)
  ownerWallet?: string;
  creatorWallet?: string;
  credentialId?: string;
  dashboardUrl?: string;

  // certificate template override if you ever want it
  certificatePngPath?: string;
};

// -------------------------
// Utilities
// -------------------------
function u32le(n: number) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

function inferMime(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".mov") return "video/quicktime";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

async function safeReadFile(filePath: string): Promise<Buffer> {
  try {
    return await fs.readFile(filePath);
  } catch {
    return Buffer.alloc(0);
  }
}

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // ignore
  }
}

// -------------------------
// Builder (single entry point)
// -------------------------
export async function buildFXSBuffer(input: FxsBuildInput): Promise<Buffer> {
  const issuedAt = new Date().toISOString();
  const assetMime = inferMime(input.assetFilename);

  // ---- LOCKED metadata payload ----
  const meta: FxsMetadataV1 = {
    schemaVersion: "fxs.meta.v1",
    title: input.title,
    creatorName: input.creatorName,
    ownerName: input.ownerName,
    network: input.network,

    issuedAt,
    tokenId: "PENDING_ONCHAIN_TOKEN_ID",
    opens: 0,

    ownerWallet: input.ownerWallet,
    creatorWallet: input.creatorWallet,
    credentialId: input.credentialId ?? "CRED-PLACEHOLDER",
    dashboardUrl: input.dashboardUrl,
    assetFilename: input.assetFilename,
    assetMime
  };

  const metadataBytes = Buffer.from(JSON.stringify(meta, null, 2), "utf8");

  // ---- Header (simple + reliable) ----
  const header = {
    magic: "FXS1",
    version: VERSION,
    createdAt: issuedAt,
    layout: "FXS1|u32(headerLen)+headerJSON|u32(metaLen)+metaJSON|u32(certLen)+certPNG|u32(assetLen)+assetBytes",
    assetFilename: input.assetFilename,
    assetMime
  };
  const headerBytes = Buffer.from(JSON.stringify(header, null, 2), "utf8");

  // ---- Certificate bytes (optional but supported) ----
  // If template missing, we still include the block with len=0 (viewer should handle).
  const certPath = input.certificatePngPath
    ? input.certificatePngPath
    : path.join(TEMPLATES_DIR, "certificate.png");

  const certBytes = await safeReadFile(certPath);

  // ---- Assemble final .fxs container ----
  const packaged = Buffer.concat([
    MAGIC,

    u32le(headerBytes.length),
    headerBytes,

    u32le(metadataBytes.length),
    metadataBytes,

    u32le(certBytes.length),
    certBytes,

    u32le(input.assetBytes.length),
    input.assetBytes
  ]);

  // Optional: write debug artifacts (helps when troubleshooting)
  await ensureDir(GENERATED_DIR);
  const safeTitle = input.title.replace(/[^\w.-]+/g, "_").replace(/_+/g, "_");
  await fs.writeFile(path.join(GENERATED_DIR, `${safeTitle}.header.json`), headerBytes);
  await fs.writeFile(path.join(GENERATED_DIR, `${safeTitle}.metadata.json`), metadataBytes);

  return packaged;
}
