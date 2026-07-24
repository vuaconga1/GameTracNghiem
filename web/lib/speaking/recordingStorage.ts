import 'server-only';

import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import path from 'path';
import { get, put } from '@vercel/blob';

const SPEAKING_RECORDING_DIR = path.join(process.cwd(), 'storage', 'speaking-recordings');

function usesBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}

function isRemoteKey(storageKey: string) {
  return /^https?:\/\//i.test(storageKey);
}

/** App-facing URL — always go through authenticated API (private Blob is not public). */
export function speakingRecordingPublicUrl(sessionId: string) {
  return `/api/speaking/sessions/${sessionId}/recording`;
}

export async function saveSpeakingRecording(input: {
  sessionId: string;
  bytes: Buffer;
  mimeType: string;
  ext: string;
}): Promise<{ url: string; key: string; bytes: number }> {
  const safeExt = input.ext.replace(/[^a-z0-9]/gi, '') || 'webm';
  const fileName = `${input.sessionId}.${safeExt}`;
  const contentType = input.mimeType || 'audio/webm';
  const publicUrl = speakingRecordingPublicUrl(input.sessionId);

  if (usesBlobStorage()) {
    const blob = await put(`speaking-recordings/${fileName}`, input.bytes, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { url: publicUrl, key: blob.url, bytes: input.bytes.length };
  }

  if (isVercelRuntime()) {
    throw new Error(
      'Thiếu BLOB_READ_WRITE_TOKEN trên Vercel để lưu recording Speaking.'
    );
  }

  await mkdir(SPEAKING_RECORDING_DIR, { recursive: true });
  const abs = path.join(SPEAKING_RECORDING_DIR, fileName);
  await writeFile(abs, input.bytes);
  return {
    url: publicUrl,
    key: fileName,
    bytes: input.bytes.length,
  };
}

export async function openSpeakingRecording(storageKey: string): Promise<{
  body: Buffer | ReadableStream;
  contentLength?: number;
} | null> {
  if (!storageKey) return null;

  if (usesBlobStorage() && (isRemoteKey(storageKey) || storageKey.includes('speaking-recordings/'))) {
    const key = isRemoteKey(storageKey)
      ? storageKey
      : `speaking-recordings/${path.basename(storageKey)}`;
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

  const filePath = path.join(SPEAKING_RECORDING_DIR, path.basename(storageKey));
  try {
    const fileStat = await stat(filePath);
    const bytes = await readFile(filePath);
    return { body: bytes, contentLength: fileStat.size };
  } catch {
    return null;
  }
}
