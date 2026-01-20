import { NextResponse } from 'next/server';
import { buildFXS } from '@/builder/fxs-builder';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const title = formData.get('title') as string | null;
    const creator = formData.get('creator') as string | null;
    const email = formData.get('email') as string | null;
    const notes = formData.get('notes') as string | null;
    const file = formData.get('file') as File | null;

    if (!title || !creator || !email || !file) {
      return NextResponse.json(
        { error: 'Missing required fields (title, creator, email, file).' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const mediaBuffer = Buffer.from(arrayBuffer);

    const metadata = {
      title,
      creator,
      email,
      notes,
    };

    const fxsBuffer = await buildFXS(metadata, {
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      data: mediaBuffer,
    });

    const safeTitle = title.replace(/[^\w\-]+/g, '_');
    const downloadName = `${safeTitle || 'smartfile'}.fxs`;

    return new NextResponse(fxsBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
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
