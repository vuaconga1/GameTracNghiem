import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { AUDIO_EXTS, IMAGE_EXTS, extensionOf } from '@/lib/media/normalizeMediaKey';

export const MEDIA_STORAGE_DIR = path.join(process.cwd(), 'storage', 'media');
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  webm: 'audio/webm',
};

export function mediaAbsolutePath(fileKey: string): string {
  const safe = path.basename(fileKey);
  if (safe !== fileKey || safe.includes('..')) throw new Error('Invalid media key');
  return path.join(MEDIA_STORAGE_DIR, safe);
}

export async function ensureMediaStorageDir() {
  await mkdir(MEDIA_STORAGE_DIR, { recursive: true });
}

export function makeMediaFileKey(originalFilename: string): string {
  const ext = extensionOf(originalFilename);
  if (!IMAGE_EXTS.has(ext) && !AUDIO_EXTS.has(ext)) throw new Error('Unsupported media extension');
  return `${randomUUID()}.${ext}`;
}

export function mediaPublicUrl(fileKey: string): string {
  return `/api/media/${encodeURIComponent(fileKey)}`;
}

export function contentTypeForFileKey(fileKey: string): string {
  return CONTENT_TYPES[extensionOf(fileKey)] || 'application/octet-stream';
}

export async function saveMediaFile(fileKey: string, bytes: Buffer) {
  await ensureMediaStorageDir();
  await writeFile(mediaAbsolutePath(fileKey), bytes);
}

export function maxBytesForKind(kind: 'image' | 'audio'): number {
  return kind === 'image' ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES;
}
