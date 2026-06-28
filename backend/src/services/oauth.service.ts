import { google } from 'googleapis';
import prisma from '../config/db';
import { encrypt, decrypt } from '../utils/encryption';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

export const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents'
];

/**
 * Creates a new Google OAuth2 Client
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

/**
 * Generates the Google OAuth authorization URL
 */
export function getAuthUrl(): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Requests refresh token
    scope: SCOPES,
    prompt: 'consent' // Forces consent screen to ensure refresh token is returned
  });
}

/**
 * Exchange auth code for tokens, retrieve user info, and save/update in DB
 */
export async function handleOAuthCallback(code: string): Promise<{ userId: string; email: string; name: string }> {
  const oauth2Client = createOAuth2Client();
  
  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  
  // Fetch user information
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfoResponse = await oauth2.userinfo.get();
  
  const email = userInfoResponse.data.email;
  const name = userInfoResponse.data.name || '';
  const avatar = userInfoResponse.data.picture || '';
  
  if (!email) {
    throw new Error('Could not retrieve user email from Google OAuth');
  }

  // Find or create User
  let user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    user = await prisma.user.create({
      data: { email, name, avatar }
    });
  } else {
    // Update name and avatar
    user = await prisma.user.update({
      where: { id: user.id },
      data: { name, avatar }
    });
  }

  // Encrypt tokens
  const encryptedAccessToken = encrypt(tokens.access_token || '');
  const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;
  const expiryDate = tokens.expiry_date ? BigInt(tokens.expiry_date) : null;

  // Save or update credentials
  const existingCreds = await prisma.oAuthCredentials.findFirst({
    where: { userId: user.id }
  });

  if (existingCreds) {
    await prisma.oAuthCredentials.update({
      where: { id: existingCreds.id },
      data: {
        accessToken: encryptedAccessToken,
        ...(encryptedRefreshToken && { refreshToken: encryptedRefreshToken }),
        expiryDate,
        scope: tokens.scope,
        tokenType: tokens.token_type
      }
    });
  } else {
    await prisma.oAuthCredentials.create({
      data: {
        userId: user.id,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiryDate,
        scope: tokens.scope,
        tokenType: tokens.token_type
      }
    });
  }

  return { userId: user.id, email, name };
}

/**
 * Gets an authorized Google OAuth2 client for a user, handling decryption and token auto-refresh saving.
 */
export async function getOAuth2ClientForUser(userId: string) {
  const credentials = await prisma.oAuthCredentials.findFirst({
    where: { userId }
  });

  if (!credentials) {
    throw new Error(`No Google API credentials found for user ${userId}`);
  }

  const oauth2Client = createOAuth2Client();
  
  // Decrypt tokens
  const accessToken = decrypt(credentials.accessToken);
  const refreshToken = credentials.refreshToken ? decrypt(credentials.refreshToken) : undefined;
  
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: credentials.expiryDate ? Number(credentials.expiryDate) : undefined,
    scope: credentials.scope || undefined,
    token_type: credentials.tokenType || undefined
  });

  // Attach listener to save auto-refreshed tokens
  oauth2Client.on('tokens', async (tokens) => {
    console.log(`🔄 Google access token refreshed automatically for user: ${userId}`);
    const updateData: any = {
      accessToken: encrypt(tokens.access_token || ''),
      updatedAt: new Date()
    };
    if (tokens.refresh_token) {
      updateData.refreshToken = encrypt(tokens.refresh_token);
    }
    if (tokens.expiry_date) {
      updateData.expiryDate = BigInt(tokens.expiry_date);
    }
    if (tokens.scope) {
      updateData.scope = tokens.scope;
    }
    if (tokens.token_type) {
      updateData.tokenType = tokens.token_type;
    }

    await prisma.oAuthCredentials.update({
      where: { id: credentials.id },
      data: updateData
    });
  });

  return oauth2Client;
}
