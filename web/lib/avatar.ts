/**
 * Avatar values are stored on `User.avatarUrl` as one of:
 *  - a whitelisted preset path under `/images/avatars/...` (or the mascot png)
 *  - a small cropped data URL (image/jpeg | image/webp | image/png)
 *
 * Uploads are cropped client-side to a square ~320px circle-ready image, so the
 * stored data URL stays small enough to live directly in the database.
 */

export const PRESET_AVATARS: string[] = [
  '/images/avatars/wewin-1.svg',
  '/images/avatars/wewin-2.svg',
  '/images/avatars/wewin-3.svg',
  '/images/avatars/wewin-4.svg',
  '/images/avatars/wewin-5.svg',
  '/images/avatars/wewin-6.svg',
  '/images/avatars/wewin-7.svg',
  '/images/avatars/wewin-8.svg',
  '/images/avatars/wewin-9.svg',
  '/images/avatars/wewin-10.svg',
  '/images/tour/wewin-knight.png',
];

const PRESET_SET = new Set(PRESET_AVATARS);

/** ~500KB ceiling for an uploaded (cropped) data URL. */
export const MAX_AVATAR_DATA_URL_BYTES = 500 * 1024;

const DATA_URL_PREFIX = /^data:image\/(jpeg|jpg|png|webp);base64,/i;

export function isPresetAvatar(value: string): boolean {
  return PRESET_SET.has(value);
}

export function isAvatarDataUrl(value: string): boolean {
  return DATA_URL_PREFIX.test(value);
}

export type AvatarValidation =
  | { ok: true; value: string }
  | { ok: false; message: string };

/**
 * Validate/normalize an incoming avatar value. Returns the value to persist or
 * an error message safe to surface to the client.
 */
export function validateAvatarValue(input: unknown): AvatarValidation {
  if (typeof input !== 'string' || input.trim() === '') {
    return { ok: false, message: 'Thiếu dữ liệu ảnh đại diện' };
  }

  const value = input.trim();

  if (isPresetAvatar(value)) {
    return { ok: true, value };
  }

  if (isAvatarDataUrl(value)) {
    const base64 = value.slice(value.indexOf(',') + 1);
    // Approximate decoded byte length from base64 without allocating a Buffer.
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    const bytes = Math.floor((base64.length * 3) / 4) - padding;
    if (bytes > MAX_AVATAR_DATA_URL_BYTES) {
      return { ok: false, message: 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn.' };
    }
    return { ok: true, value };
  }

  return { ok: false, message: 'Định dạng ảnh đại diện không hợp lệ' };
}
