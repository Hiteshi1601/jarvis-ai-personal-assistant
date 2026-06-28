import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

/**
 * Creates a new Google Document
 */
export async function createDocument(auth: OAuth2Client, title: string): Promise<{ id: string; url: string }> {
  const docs = google.docs({ version: 'v1', auth });
  const response = await docs.documents.create({
    requestBody: {
      title
    }
  });

  const id = response.data.documentId || '';
  const url = `https://docs.google.com/document/d/${id}/edit`;

  return { id, url };
}

/**
 * Get plain text representation of a Google Document
 */
export async function getDocumentText(auth: OAuth2Client, documentId: string): Promise<string> {
  const docs = google.docs({ version: 'v1', auth });
  const response = await docs.documents.get({
    documentId
  });

  const bodyContent = response.data.body?.content || [];
  let text = '';

  for (const element of bodyContent) {
    if (element.paragraph) {
      const elements = element.paragraph.elements || [];
      for (const el of elements) {
        if (el.textRun?.content) {
          text += el.textRun.content;
        }
      }
    }
  }

  return text;
}

/**
 * Appends text to the end of a Google Document
 */
export async function appendDocumentText(
  auth: OAuth2Client,
  documentId: string,
  text: string
): Promise<any> {
  const docs = google.docs({ version: 'v1', auth });
  
  // We need to find the end index of the document
  const doc = await docs.documents.get({ documentId });
  const content = doc.data.body?.content || [];
  const lastElement = content[content.length - 1];
  const endIndex = lastElement?.endIndex || 1;
  const targetIndex = endIndex - 1 > 0 ? endIndex - 1 : 1;

  const response = await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            text,
            location: {
              index: targetIndex
            }
          }
        }
      ]
    }
  });

  return response.data;
}
