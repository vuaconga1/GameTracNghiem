import 'server-only';

import { google } from 'googleapis';
import { Readable } from 'stream';

import {
  speakingDriveFolderId,
} from '@/lib/speaking/driveFileName';

export {
  buildSpeakingDriveFileName,
  sanitizeDriveNamePart,
  speakingDriveFolderId,
  DEFAULT_SPEAKING_DRIVE_FOLDER_ID,
} from '@/lib/speaking/driveFileName';

type ServiceAccountCreds = {
  client_email: string;
  private_key: string;
};

function loadServiceAccount(): ServiceAccountCreds | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  let jsonText = '';
  if (raw) {
    jsonText = raw;
  } else if (b64) {
    jsonText = Buffer.from(b64, 'base64').toString('utf8');
  } else {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as Partial<ServiceAccountCreds>;
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      client_email: parsed.client_email,
      private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
    };
  } catch {
    return null;
  }
}

export function isSpeakingDriveConfigured() {
  return Boolean(loadServiceAccount());
}

export async function uploadSpeakingRecordingToDrive(input: {
  bytes: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<{ fileId: string; webViewLink: string | null; fileName: string }> {
  const creds = loadServiceAccount();
  if (!creds) {
    throw new Error(
      'Thiếu GOOGLE_SERVICE_ACCOUNT_JSON (hoặc GOOGLE_SERVICE_ACCOUNT_JSON_BASE64)'
    );
  }

  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });
  const folderId = speakingDriveFolderId();

  const created = await drive.files.create({
    requestBody: {
      name: input.fileName,
      parents: [folderId],
    },
    media: {
      mimeType: input.mimeType || 'audio/webm',
      body: Readable.from(input.bytes),
    },
    fields: 'id, name, webViewLink',
    supportsAllDrives: true,
  });

  const fileId = created.data.id;
  if (!fileId) {
    throw new Error('Google Drive không trả file id');
  }

  return {
    fileId,
    webViewLink: created.data.webViewLink || null,
    fileName: created.data.name || input.fileName,
  };
}
