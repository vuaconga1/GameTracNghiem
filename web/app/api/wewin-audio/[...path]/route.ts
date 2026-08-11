import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_AUDIO_ROOT = 'E:/Wewin/WeWinGame/Wewin-Education-main/audio_wewin';

function audioRoot(): string {
  return process.env.WEWIN_AUDIO_ROOT || DEFAULT_AUDIO_ROOT;
}

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.m4a') return 'audio/mp4';
  return 'application/octet-stream';
}

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { path: parts } = await context.params;
  if (!parts?.length) {
    return NextResponse.json({ success: false, message: 'Missing audio path' }, { status: 400 });
  }

  const root = path.resolve(audioRoot());
  const decoded = parts.map((part) => decodeURIComponent(part));
  const absolute = path.resolve(root, ...decoded);
  if (!absolute.startsWith(root + path.sep) && absolute !== root) {
    return NextResponse.json({ success: false, message: 'Invalid path' }, { status: 400 });
  }
  if (!existsSync(absolute) || !statSync(absolute).isFile()) {
    return NextResponse.json({ success: false, message: 'Audio not found' }, { status: 404 });
  }

  const nodeStream = createReadStream(absolute);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;
  return new NextResponse(webStream, {
    headers: {
      'Content-Type': contentTypeFor(absolute),
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
