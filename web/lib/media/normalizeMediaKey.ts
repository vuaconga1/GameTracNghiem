export const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
export const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'webm']);

export function normalizeMediaKey(input: string): string {
  const base = input.trim().replace(/^.*[\\/]/, '');
  const withoutExt = base.replace(/\.[^.]+$/, '');
  return withoutExt
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extensionOf(filename: string): string {
  const m = filename.trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

export function mediaKindFromFilename(filename: string): 'image' | 'audio' | null {
  const ext = extensionOf(filename);
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  return null;
}
