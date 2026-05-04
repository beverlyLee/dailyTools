import crypto from 'node:crypto';

const DERIVED_KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 600000;

export async function deriveKeyFromPassword(password, salt = null) {
  const actualSalt = salt || crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(
    password,
    actualSalt,
    PBKDF2_ITERATIONS,
    DERIVED_KEY_LENGTH,
    'sha512'
  );
  
  return {
    key,
    salt: actualSalt
  };
}

export async function encrypt(data, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const dataStr = typeof data === 'string' ? data : (data instanceof Uint8Array ? data : JSON.stringify(data));
  const dataBuffer = typeof dataStr === 'string' ? Buffer.from(dataStr, 'utf8') : Buffer.from(dataStr);
  
  const ciphertext = Buffer.concat([
    cipher.update(dataBuffer),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();
  
  return {
    ciphertext: new Uint8Array(ciphertext),
    nonce: new Uint8Array(iv),
    tag: new Uint8Array(tag)
  };
}

export async function decrypt(encrypted, key) {
  const { ciphertext, nonce, tag } = encrypted;
  
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.isBuffer(key) ? key : Buffer.from(key),
    Buffer.isBuffer(nonce) ? nonce : Buffer.from(nonce)
  );
  
  decipher.setAuthTag(Buffer.isBuffer(tag) ? tag : Buffer.from(tag));
  
  const plaintext = Buffer.concat([
    decipher.update(Buffer.isBuffer(ciphertext) ? ciphertext : Buffer.from(ciphertext)),
    decipher.final()
  ]);
  
  return plaintext.toString('utf8');
}

export async function generateMasterKey() {
  return crypto.randomBytes(DERIVED_KEY_LENGTH);
}

export async function wrapMasterKey(masterKey, derivedKey) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.isBuffer(masterKey) ? masterKey : Buffer.from(masterKey)),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();
  
  return {
    ciphertext: new Uint8Array(ciphertext),
    nonce: new Uint8Array(iv),
    tag: new Uint8Array(tag)
  };
}

export async function unwrapMasterKey(wrapped, derivedKey) {
  const { ciphertext, nonce, tag } = wrapped;
  
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.isBuffer(derivedKey) ? derivedKey : Buffer.from(derivedKey),
    Buffer.isBuffer(nonce) ? nonce : Buffer.from(nonce)
  );
  
  decipher.setAuthTag(Buffer.isBuffer(tag) ? tag : Buffer.from(tag));
  
  const plaintext = Buffer.concat([
    decipher.update(Buffer.isBuffer(ciphertext) ? ciphertext : Buffer.from(ciphertext)),
    decipher.final()
  ]);
  
  return new Uint8Array(plaintext);
}

export function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

export function fromBase64(str) {
  return new Uint8Array(Buffer.from(str, 'base64'));
}

export function secureWipe(array) {
  if (array instanceof Uint8Array || Buffer.isBuffer(array)) {
    const buffer = Buffer.isBuffer(array) ? array : Buffer.from(array);
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = 0;
    }
  }
}
