// src/app/api/mint/route.ts

import { NextResponse } from 'next/server';
import { buildFXS, FxsMetadata, FxsPayloadInput } from '@/builder/fxs-builder';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    // Debug: see exactly what the form is sending
    console.log('Mint API received keys:', Array.from(formData.keys()));

    const titleEntry = formData.get('title');
    const creatorEntry = formData.get('creator');
    const emailEntry = formData.get('email');
    const notesEntry = formData.get('notes');
    const mediaEntry = formData.get('media');

    // ---- Basic validation (what the UI shows in the red bar) ----
    if (!titleEntry || typeof titleEntry !== 'string') {
      return NextResponse.json(
        { error: 'Missing required fields (title, file).' },
        { status: 400 }
      );
    }

    if (!(mediaEntry instanceof File)) {
      return NextResponse.json(
        { error: 'Missing required fields (title, file).' },
        { status: 400 }
      );
    }

    const title = titleEntry;
    const creator =
      typeof creatorEntry === 'string' && creatorEntry.trim().length > 0
        ? creatorEntry
        : 'Unknown';
    const email =
      typeof emailEntry === 'string' && emailEntry.trim().length > 0
        ? emailEntry
        : 'Unknown';
    const notes =
      typeof notesEntry === 'string' && notesEntry.trim().length > 0
        ? notesEntry
        : '';

    const file = mediaEntry;

    // ---- Convert uploaded file into a Buffer for the builder ----
    const arrayBuffer = await file.arrayBuffer();

    const payload: FxsPayloadInput = {
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      data: Buffer.from(arrayBuffer),
    };

    const metadata: FxsMetadata = {
      title,
      creator,
      email,
      notes,
      mintedAt: new Date().toISOString(),
      workspace: 'internal',
    };

    // ---- Call the core builder to get the .fxs SmartFile ----
    const fxsBuffer = await buildFXS(metadata, payload);

    // Safe filename for download
    const safeTitle = title.replace(/[^\w\-]+/g, '_');
    const outFilename = `${safeTitle}.fxs`;

    // NextResponse wants a web-friendly BodyInit, not a Node Buffer
    const body = new Uint8Array(fxsBuffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${outFilename}"`,
      },
    });
  } catch (err: any) {
    console.error('Mint API error:', err);

    return NextResponse.json(
      {
        error: 'Mint failed on the server.',
        detail: err?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}
