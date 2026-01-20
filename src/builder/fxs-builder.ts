// src/builder/fxs-builder.ts

// Types for our metadata + payload
export interface FxsMetadata {
  title: string;
  creator: string;
  email: string;
  notes?: string;
  mintedAt: string;
  workspace?: string;
  [key: string]: any;
}

export interface FxsPayloadInput {
  filename: string;
  mimeType: string;
  data: Buffer; // raw bytes of the media file
}

/**
 * buildFXS
 * ----------
 * Pure in-memory FXS SmartFile builder.
 *
 * Binary layout:
 *   [4 bytes]  ASCII "FXS1" magic
 *   [4 bytes]  header length (uint32 big-endian)
 *   [N bytes]  UTF-8 JSON header
 *   [M bytes]  raw media payload
 */
export async function buildFXS(
  metadata: FxsMetadata,
  payload: FxsPayloadInput
): Promise<Buffer> {
  // 1) Build header JSON
  const header = {
    version: '0.1.0',
    type: 'fxs-smartfile',
    createdAt: new Date().toISOString(),
    metadata,
    payload: {
      filename: payload.filename,
      mimeType: payload.mimeType,
      length: payload.data.length,
    },
  };

  const headerJson = JSON.stringify(header, null, 2);
  const headerBytes = Buffer.from(headerJson, 'utf8');

  // 2) Magic + header length
  const magic = Buffer.from('FXS1', 'ascii'); // 4 bytes
  const headerLenBuf = Buffer.alloc(4);
  headerLenBuf.writeUInt32BE(headerBytes.length, 0);

  // 3) Concatenate: [magic][headerLen][header][payload]
  const fxsBuffer = Buffer.concat([
    magic,
    headerLenBuf,
    headerBytes,
    payload.data,
  ]);

  return fxsBuffer;
}
