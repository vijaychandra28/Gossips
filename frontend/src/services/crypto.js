// Helpers to convert between ArrayBuffer and Base64 strings safely

export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives a 256-bit AES-GCM key from a room password and room ID (as salt).
 * @param {string} password - The room password.
 * @param {string} roomId - The unique room ID (used as salt).
 * @returns {Promise<CryptoKey>} - The derived CryptoKey object.
 */
export async function deriveKey(password, roomId) {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password || "default_fallback_password_9923");
  const saltBytes = encoder.encode(roomId);

  // Import raw password text as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // Derive AES-GCM key
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts an ArrayBuffer of file content using the derived key.
 * @param {ArrayBuffer} arrayBuffer - The plain file data.
 * @param {CryptoKey} key - The derived AES-GCM CryptoKey.
 * @returns {Promise<{cipherText: ArrayBuffer, iv: string}>} - Encrypted buffer and Base64 IV.
 */
export async function encryptFile(arrayBuffer, key) {
  // Generate a random 12-byte initialization vector (IV)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const cipherText = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    arrayBuffer
  );

  return {
    cipherText,
    iv: arrayBufferToBase64(iv)
  };
}

/**
 * Decrypts an ArrayBuffer of encrypted file content.
 * @param {ArrayBuffer} encryptedBuffer - The encrypted file data from the server.
 * @param {CryptoKey} key - The derived AES-GCM CryptoKey.
 * @param {string} ivBase64 - The Base64 encoded IV.
 * @returns {Promise<ArrayBuffer>} - The decrypted plain ArrayBuffer.
 */
export async function decryptFile(encryptedBuffer, key, ivBase64) {
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  
  return await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encryptedBuffer
  );
}

/**
 * Encrypts a plain text string (e.g. filename) using the derived key and IV.
 * @param {string} text - The plain string.
 * @param {CryptoKey} key - The derived AES-GCM CryptoKey.
 * @param {string} ivBase64 - The Base64 encoded IV.
 * @returns {Promise<string>} - The encrypted Base64 string.
 */
export async function encryptString(text, key, ivBase64) {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));

  const cipherText = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    textBytes
  );

  return arrayBufferToBase64(cipherText);
}

/**
 * Decrypts an encrypted Base64 string.
 * @param {string} encryptedBase64 - The encrypted string in Base64.
 * @param {CryptoKey} key - The derived AES-GCM CryptoKey.
 * @param {string} ivBase64 - The Base64 encoded IV.
 * @returns {Promise<string>} - The decrypted plain text.
 */
export async function decryptString(encryptedBase64, key, ivBase64) {
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const encryptedBytes = base64ToArrayBuffer(encryptedBase64);

  const decryptedBytes = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encryptedBytes
  );

  return new TextDecoder().decode(decryptedBytes);
}
