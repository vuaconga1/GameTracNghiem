import { mkdir, unlink, writeFile, readFile, stat } from 'fs/promises';
import path from 'path';
import { del, get, put } from '@vercel/blob';

export const EBOOK_STORAGE_DIR = path.join(process.cwd(), 'storage', 'ebooks');

export function usesBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}

export function ebookAbsolutePath(storageKey: string): string {
  const safe = path.basename(storageKey);
  return path.join(EBOOK_STORAGE_DIR, safe);
}

export function isRemoteEbookKey(storageKey: string) {
  return /^https?:\/\//i.test(storageKey);
}

export async function ensureEbookStorageDir() {
  await mkdir(EBOOK_STORAGE_DIR, { recursive: true });
}

/**
 * Save PDF bytes. Returns the storage key to persist in DB:
 * - local: `*.pdf` filename under storage/ebooks
 * - Vercel Blob (private store): blob URL — serve via get()
 */
export async function saveEbookFile(storageKey: string, bytes: Buffer): Promise<string> {
  const fileName = path.basename(storageKey.endsWith('.pdf') ? storageKey : `${storageKey}.pdf`);

  if (usesBlobStorage()) {
    const blob = await put(`ebooks/${fileName}`, bytes, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/pdf',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  // Vercel serverless filesystem is read-only — never attempt local write there.
  if (isVercelRuntime()) {
    throw new Error(
      'Thiếu BLOB_READ_WRITE_TOKEN trên Vercel. Vào Project → Settings → Environment Variables và thêm token Blob, rồi Redeploy.',
    );
  }

  await ensureEbookStorageDir();
  await writeFile(ebookAbsolutePath(fileName), bytes);
  return fileName;
}

export async function deleteEbookFile(storageKey: string) {
  try {
    if (usesBlobStorage() && (isRemoteEbookKey(storageKey) || storageKey.endsWith('.pdf'))) {
      await del(storageKey, { token: process.env.BLOB_READ_WRITE_TOKEN });
      return;
    }
    await unlink(ebookAbsolutePath(storageKey));
  } catch {
    // ignore missing file
  }
}

export async function openEbookFile(storageKey: string): Promise<{
  body: Buffer | ReadableStream;
  contentLength?: number;
} | null> {
  if (usesBlobStorage() && (isRemoteEbookKey(storageKey) || storageKey.includes('.pdf'))) {
    const key = isRemoteEbookKey(storageKey) ? storageKey : `ebooks/${path.basename(storageKey)}`;
    const result = await get(key, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result || result.statusCode === 304 || !result.stream) return null;
    return {
      body: result.stream as unknown as ReadableStream,
      contentLength: result.blob.size ?? undefined,
    };
  }

  const filePath = ebookAbsolutePath(storageKey);
  try {
    const fileStat = await stat(filePath);
    const bytes = await readFile(filePath);
    return { body: bytes, contentLength: fileStat.size };
  } catch {
    return null;
  }
}

export function makeEbookStorageKey(id: string) {
  return `${id}.pdf`;
}
