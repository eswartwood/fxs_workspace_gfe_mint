// src/app/api/mint/route.ts
import { NextResponse } from 'next/server';

// IMPORTANT: adjust this import if your path alias is different.
// If "@/builder/..." doesn't compile, change it to
//   import { buildFxsFile } from '../../builder/fxs-builder';
// based on where fxs-builder.ts lives.
import { buildFxsFile } from '@/builder/fxs-builder';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const media = formData.get('media') as File | null;
    if (!media) {
      return NextResponse.json(
        { error: 'Media file is required.' },
        { status: 400 }
      );
    }

    const title = (formData.get('title') as string | null) ?? 'Untitled Media';
    const creator = (formData.get('creator') as string | null) ?? 'Unknown';
    const email = (formData.get('email') as string | null) ?? undefined;
    const description =
      (formData.get('description') as string | null) ?? undefined;
    const tags =
      (formData.get('tags') as string | null)?.split(',').map(t => t.trim()).filter(Boolean) ??
      [];
    const rights = (formData.get('rights') as string | null) ?? undefined;
    const referenceUrl =
      (formData.get('referenceUrl') as string | null) ?? undefined;
    const referenceId =
      (formData.get('referenceId') as string | null) ?? undefined;

    // Convert the uploaded File into a Node Buffer
    const mediaArrayBuffer = await media.arrayBuffer();
    const mediaBuffer = Buffer.from(mediaArrayBuffer);

    // Metadata object passed into the builder – extend as needed
    const metadata = {
      title,
      creator,
      email,
      description,
      tags,
      rights,
      referenceUrl,
      referenceId,
      mintedAt: new Date().toISOString(),
      schemaVersion: '1.0.0',
      kind: 'media',
    };

    // 🔧 CALL INTO YOUR EXISTING BUILDER
    //
    // This assumes your fxs-builder.ts exports:
    //   export async function buildFxsFile(
    //     metadata: Record<string, any>,
    //     media: { filename: string; mimeType: string; data: Buffer }
    //   ): Promise<Buffer>
    //
    // If your function signature is different, just adjust this call.
    const fxsBuffer = await buildFxsFile(metadata, {
      filename: media.name,
      mimeType: media.type || 'application/octet-stream',
      data: mediaBuffer,
    });

    const safeName = title.replace(/[^\w\-]+/g, '_') || 'minted_file';
    const filename = `${safeName}.fxs`;

    return new NextResponse(fxsBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
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
