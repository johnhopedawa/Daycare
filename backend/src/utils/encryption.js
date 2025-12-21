/**
 * Encryption utilities for sensitive data (SimpleFIN Access URLs)
 * Algorithm: AES-256-GCM with authentication tag
 * Key source: ENCRYPTION_KEY environment variable (64 hex chars = 32 bytes)
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Validate encryption key on module load
if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

if (ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with: openssl rand -hex 32');
}

// Validate hex format
if (!/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
  throw new Error('ENCRYPTION_KEY must contain only hex characters (0-9, a-f)');
}

/**
 * Encrypt plaintext string
 * @param {string} text - Plaintext to encrypt
 * @returns {string} - Encrypted string in format: iv:authTag:ciphertext
 * @throws {Error} - If encryption fails
 */
function encrypt(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('encrypt() requires a non-empty string');
  }

  try {
    // Generate random initialization vector (IV)
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    // Encrypt
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag (for GCM mode integrity)
    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt encrypted string
 * @param {string} encryptedText - Encrypted string in format: iv:authTag:ciphertext
 * @returns {string} - Decrypted plaintext
 * @throws {Error} - If decryption fails or format is invalid
 */
function decrypt(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string') {
    throw new Error('decrypt() requires a non-empty string');
  }

  try {
    // Parse encrypted format
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format (expected iv:authTag:ciphertext)');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    // Validate IV length (should be 16 bytes = 32 hex chars)
    if (iv.length !== 16) {
      throw new Error('Invalid IV length');
    }

    // Validate auth tag length (should be 16 bytes = 32 hex chars for GCM)
    if (authTag.length !== 16) {
      throw new Error('Invalid auth tag length');
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    // Set authentication tag
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new Error('Failed to decrypt data (tampering or invalid key)');
  }
}

module.exports = { encrypt, decrypt };
