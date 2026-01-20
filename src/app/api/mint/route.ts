// src/app/api/mint/route.ts
import { NextResponse } from 'next/server';
import { buildFXS, FxsMetadata, FxsPayloadInput } from '@/builder/fxs-builder';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    // For debug: log what actually arrived
    const keys = Array.from(formData.keys());
    console.log('Mint API received keys:', keys);

    const title = formData.get('title') as string | null;
    const creator = formData.get('creator') as string | null;
    const email = formData.get('email') as string | null;
    const notes = formData.get('notes') as string | null;
    const file = formData.get('media') as File | null; // <-- key MUST be "media"

    const missing: string[] = [];
    if (!title) missing.push('title');
    if (!file) missing.push('file');

    // creator + email are useful but not hard-stop if you want to keep it loose:
    // if (!creator) missing.push('creator');
    // if (!email) missing.push('email');

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required fields (${missing.join(', ')}).`,
        },
        { status: 400 },
      );
    }

    // At this point TS still thinks these might be null; runtime check above guarantees they’re not.
    const safeTitle = title as string;
    const mediaFile = file as File;

    const metadata: FxsMetadata = {
      title: safeTitle,
      creator: (creator as string) || 'Global Data Capture, LLC',
      email: (email as string) || '',
      ...(notes ? { notes } : {}),
      mintedAt: new Date().toISOString(),
      workspace: 'GFE – Internal',
    };

    const arrayBuffer = await mediaFile.arrayBuffer();
    const mediaBuffer = Buffer.from(arrayBuffer);

    const payload: FxsPayloadInput = {
      filename: mediaFile.name,
      mimeType: mediaFile.type || 'application/octet-stream',
      data: mediaBuffer,
    };

    const fxsBuffer = await buildFXS(metadata, payload);

    const safeName = safeTitle.replace(/[^\w\-]+/g, '_');
    const outFilename = `${safeName}.fxs`;

    return new NextResponse(fxsBuffer, {
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
      { status: 500 },
    );
  }
}
