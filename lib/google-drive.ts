import "server-only";

import { Readable } from "node:stream";
import { google } from "googleapis";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  }
  return value;
}

function getGoogleDriveConfig() {
  return {
    folderId: getRequiredEnv("GOOGLE_DRIVE_FOLDER_ID"),
    projectId: getRequiredEnv("GOOGLE_PROJECT_ID"),
    clientEmail: getRequiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    privateKey: getRequiredEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  };
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function normalizePdfName(fileName: string) {
  const safeName = fileName.trim().replace(/[<>:"/\\|?*]+/g, "-");
  return safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`;
}

export function hasGoogleDriveUploadEnv() {
  return Boolean(
    process.env.GOOGLE_DRIVE_FOLDER_ID &&
      process.env.GOOGLE_PROJECT_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY,
  );
}

function getDriveClient() {
  const { clientEmail, privateKey, projectId } = getGoogleDriveConfig();
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    projectId,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

export async function uploadPdfToGoogleDrive(fileName: string, fileBuffer: Buffer) {
  const { folderId } = getGoogleDriveConfig();
  const drive = getDriveClient();
  const normalizedName = normalizePdfName(fileName);

  const existing = await drive.files.list({
    q: `'${folderId}' in parents and name = '${escapeDriveQueryValue(normalizedName)}' and trashed = false`,
    fields: "files(id, name, webViewLink)",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    corpora: "allDrives",
    pageSize: 1,
  });

  const media = {
    mimeType: "application/pdf",
    body: Readable.from(fileBuffer),
  };

  if (existing.data.files?.[0]?.id) {
    const updated = await drive.files.update({
      fileId: existing.data.files[0].id,
      media,
      supportsAllDrives: true,
      fields: "id, name, webViewLink, webContentLink",
    });

    return updated.data;
  }

  const created = await drive.files.create({
    requestBody: {
      name: normalizedName,
      parents: [folderId],
      mimeType: "application/pdf",
    },
    media,
    supportsAllDrives: true,
    fields: "id, name, webViewLink, webContentLink",
  });

  return created.data;
}
