import { randomUUID } from 'crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import path from 'path';

import { del, get, put } from '@vercel/blob';

export const COURSE_BACKGROUND_DIR = path.join(process.cwd(), 'storage', 'course-backgrounds');
export const MAX_COURSE_BACKGROUND_BYTES = 5 * 1024 * 1024;

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

function extensionOf(filename: string): string {
  const pathname = filename.split('?')[0];
  return path.extname(pathname).slice(1).toLowerCase();
}

export function isSupportedCourseBackground(filename: string, contentType = ''): boolean {
  const ext = extensionOf(filename);
  return Boolean(CONTENT_TYPES[ext]) && (!contentType || contentType.startsWith('image/'));
}

function usesBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}

function localAbsolutePath(storageKey: string) {
  const safe = path.basename(storageKey);
  if (safe !== storageKey || safe.includes('..')) throw new Error('Invalid background image key');
  return path.join(COURSE_BACKGROUND_DIR, safe);
}

export async function saveCourseBackground(
  courseId: string,
  originalFilename: string,
  bytes: Buffer,
  contentType: string
): Promise<string> {
  const ext = extensionOf(originalFilename);
  if (!isSupportedCourseBackground(originalFilename, contentType)) {
    throw new Error('Chỉ chấp nhận ảnh PNG, JPG hoặc WebP');
  }

  const fileName = `${courseId}-${randomUUID()}.${ext}`;
  if (usesBlobStorage()) {
    const blob = await put(`course-backgrounds/${fileName}`, bytes, {
      access: 'private',
      addRandomSuffix: false,
      contentType: CONTENT_TYPES[ext],
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  if (isVercelRuntime()) {
    throw new Error('Thiếu BLOB_READ_WRITE_TOKEN để lưu ảnh trên Vercel');
  }

  await mkdir(COURSE_BACKGROUND_DIR, { recursive: true });
  await writeFile(localAbsolutePath(fileName), bytes);
  return fileName;
}

export async function deleteCourseBackground(storageKey: string | null | undefined) {
  const key = String(storageKey || '').trim();
  if (!key) return;

  try {
    if (/^https?:\/\//i.test(key)) {
      await del(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
      return;
    }
    await unlink(localAbsolutePath(key));
  } catch {
    // Missing old files must not block replacing/removing the configured background.
  }
}

export async function openCourseBackground(storageKey: string): Promise<{
  body: Buffer | ReadableStream;
  contentType: string;
  contentLength?: number;
} | null> {
  if (/^https?:\/\//i.test(storageKey)) {
    const result = await get(storageKey, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result || result.statusCode === 304 || !result.stream) return null;
    return {
      body: result.stream as unknown as ReadableStream,
      contentType: CONTENT_TYPES[extensionOf(storageKey)] || 'image/jpeg',
      contentLength: result.blob.size ?? undefined,
    };
  }

  try {
    const filePath = localAbsolutePath(storageKey);
    const [bytes, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);
    return {
      body: bytes,
      contentType: CONTENT_TYPES[extensionOf(storageKey)] || 'image/jpeg',
      contentLength: fileStat.size,
    };
  } catch {
    return null;
  }
}
