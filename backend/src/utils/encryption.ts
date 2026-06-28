import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size

// Ensure key is 32 bytes (64 hex characters)
const getEncryptionKey = (): Buffer => {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey) {
    console.warn('⚠️ WARNING: ENCRYPTION_KEY not specified. Using insecure default key for development.');
    // 32-byte fallback key
    return Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
  }
  try {
    return Buffer.from(hexKey, 'hex');
  } catch (error) {
    console.error('❌ Invalid ENCRYPTION_KEY format. Must be a 64-character hex string.');
    throw error;
  }
};

/**
 * Encrypt plain text using AES-256-CBC
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt cipher text using AES-256-CBC
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
