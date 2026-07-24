/** Safe Drive file stem: username-DisplayName-sessionId (never overwrites). */
export function buildSpeakingDriveFileName(input: {
  username: string;
  displayName: string;
  sessionId: string;
  ext?: string;
}) {
  const ext = (input.ext || 'webm').replace(/[^a-z0-9]/gi, '') || 'webm';
  const username = sanitizeDriveNamePart(input.username) || 'user';
  const displayName = sanitizeDriveNamePart(input.displayName) || 'hoc-sinh';
  const sessionId = sanitizeDriveNamePart(input.sessionId) || String(Date.now());
  return `${username}-${displayName}-${sessionId}.${ext}`;
}

export function sanitizeDriveNamePart(value: string) {
  return String(value || '')
    .normalize('NFC')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export const DEFAULT_SPEAKING_DRIVE_FOLDER_ID = '1_r_lSba4dHyngN0boNm70kKEWxTaKa7G';

export function speakingDriveFolderId() {
  return (
    process.env.GOOGLE_DRIVE_SPEAKING_FOLDER_ID?.trim() ||
    DEFAULT_SPEAKING_DRIVE_FOLDER_ID
  );
}
