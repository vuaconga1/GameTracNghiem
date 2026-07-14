import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';

export const EBOOK_STORAGE_DIR = path.join(process.cwd(), 'storage', 'ebooks');

export function ebookAbsolutePath(storageKey: string): string {
  const safe = path.basename(storageKey);
  return path.join(EBOOK_STORAGE_DIR, safe);
}

export async function ensureEbookStorageDir() {
  await mkdir(EBOOK_STORAGE_DIR, { recursive: true });
}

export async function saveEbookFile(storageKey: string, bytes: Buffer) {
  await ensureEbookStorageDir();
  await writeFile(ebookAbsolutePath(storageKey), bytes);
}

export async function deleteEbookFile(storageKey: string) {
  try {
    await unlink(ebookAbsolutePath(storageKey));
  } catch {
    // ignore missing file
  }
}

export function makeEbookStorageKey(id: string) {
  return `${id}.pdf`;
}
