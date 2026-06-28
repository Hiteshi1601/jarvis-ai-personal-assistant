import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Readable } from 'stream';

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
}

/**
 * Lists or searches files on Google Drive
 */
export async function listFiles(
  auth: OAuth2Client,
  query = '',
  maxResults = 20
): Promise<DriveFileInfo[]> {
  const drive = google.drive({ version: 'v3', auth });
  
  const response = await drive.files.list({
    q: query || undefined,
    pageSize: maxResults,
    fields: 'files(id, name, mimeType, webViewLink, createdTime)'
  });

  const files = response.data.files || [];
  return files.map(f => ({
    id: f.id || '',
    name: f.name || '',
    mimeType: f.mimeType || '',
    webViewLink: f.webViewLink || undefined,
    createdTime: f.createdTime || undefined
  }));
}

/**
 * Creates a folder on Google Drive
 */
export async function createFolder(
  auth: OAuth2Client,
  name: string,
  parentId?: string
): Promise<{ id: string }> {
  const drive = google.drive({ version: 'v3', auth });
  const fileMetadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : undefined
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id'
  });

  return { id: response.data.id || '' };
}

/**
 * Upload a text or binary file to Google Drive
 */
export async function uploadFile(
  auth: OAuth2Client,
  name: string,
  mimeType: string,
  content: string,
  parentId?: string
): Promise<DriveFileInfo> {
  const drive = google.drive({ version: 'v3', auth });
  
  // Convert string content to readable stream
  const mediaStream = new Readable();
  mediaStream.push(content);
  mediaStream.push(null);

  const fileMetadata = {
    name,
    parents: parentId ? [parentId] : undefined
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: {
      mimeType,
      body: mediaStream
    },
    fields: 'id, name, mimeType, webViewLink, createdTime'
  });

  const file = response.data;
  return {
    id: file.id || '',
    name: file.name || '',
    mimeType: file.mimeType || '',
    webViewLink: file.webViewLink || undefined,
    createdTime: file.createdTime || undefined
  };
}

/**
 * Deletes a file or folder from Google Drive
 */
export async function deleteFile(auth: OAuth2Client, fileId: string): Promise<void> {
  const drive = google.drive({ version: 'v3', auth });
  await drive.files.delete({
    fileId
  });
}
