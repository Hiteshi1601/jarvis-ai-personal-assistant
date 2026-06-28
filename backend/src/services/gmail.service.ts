import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface EmailInfo {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body?: string;
  labelIds: string[];
}

/**
 * Builds RFC 2822 base64url encoded email string
 */
function buildRawEmail(to: string, subject: string, body: string, threadId?: string): string {
  const emailLines = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    '',
    body
  ];
  const email = emailLines.join('\r\n');
  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Extract header value by name
 */
function getHeader(headers: any[] | undefined, name: string): string {
  if (!headers) return '';
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
}

/**
 * Extract email body from Gmail payload parts
 */
function getBody(payload: any): string {
  if (!payload) return '';
  if (payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const partBody = getBody(part);
      if (partBody) return partBody;
    }
  }
  return '';
}

/**
 * List messages in user inbox
 */
export async function listEmails(auth: OAuth2Client, query = '', maxResults = 10): Promise<EmailInfo[]> {
  const gmail = google.gmail({ version: 'v1', auth });
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults
  });

  const messages = response.data.messages || [];
  const emails: EmailInfo[] = [];

  for (const msg of messages) {
    if (msg.id) {
      try {
        const details = await getEmailDetails(auth, msg.id);
        emails.push(details);
      } catch (err) {
        console.error(`Error fetching email details for ${msg.id}:`, err);
      }
    }
  }

  return emails;
}

/**
 * Get full email details
 */
export async function getEmailDetails(auth: OAuth2Client, id: string): Promise<EmailInfo> {
  const gmail = google.gmail({ version: 'v1', auth });
  const response = await gmail.users.messages.get({
    userId: 'me',
    id
  });

  const data = response.data;
  const headers = data.payload?.headers;
  
  const from = getHeader(headers, 'from');
  const to = getHeader(headers, 'to');
  const subject = getHeader(headers, 'subject');
  const date = getHeader(headers, 'date');
  const snippet = data.snippet || '';
  const body = getBody(data.payload);

  return {
    id: data.id || id,
    threadId: data.threadId || '',
    from,
    to,
    subject,
    date,
    snippet,
    body,
    labelIds: data.labelIds || []
  };
}

/**
 * Send an email
 */
export async function sendEmail(
  auth: OAuth2Client,
  to: string,
  subject: string,
  body: string,
  threadId?: string
): Promise<any> {
  const gmail = google.gmail({ version: 'v1', auth });
  const raw = buildRawEmail(to, subject, body, threadId);

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
      ...(threadId && { threadId })
    }
  });

  return response.data;
}

/**
 * Archive an email (remove INBOX label)
 */
export async function archiveEmail(auth: OAuth2Client, id: string): Promise<any> {
  const gmail = google.gmail({ version: 'v1', auth });
  const response = await gmail.users.messages.batchModify({
    userId: 'me',
    requestBody: {
      ids: [id],
      removeLabelIds: ['INBOX']
    }
  });
  return response.data;
}

/**
 * Modify labels on an email
 */
export async function modifyEmailLabels(
  auth: OAuth2Client,
  id: string,
  addLabelIds: string[],
  removeLabelIds: string[]
): Promise<any> {
  const gmail = google.gmail({ version: 'v1', auth });
  const response = await gmail.users.messages.modify({
    userId: 'me',
    id,
    requestBody: {
      addLabelIds,
      removeLabelIds
    }
  });
  return response.data;
}
