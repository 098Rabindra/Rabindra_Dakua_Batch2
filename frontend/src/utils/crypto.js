/**
 * Web Crypto API Utility for Password Fault / Vault
 * Implements PBKDF2 Key Derivation and AES-256-GCM Encryption/Decryption
 */

// Derive AES-256-GCM key from Master Password and User Salt using PBKDF2
export async function deriveKey(masterPassword, saltBase64) {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(masterPassword);
  
  // Convert base64 salt to Uint8Array
  let saltBuffer;
  try {
    const binarySalt = atob(saltBase64);
    saltBuffer = new Uint8Array(binarySalt.length);
    for (let i = 0; i < binarySalt.length; i++) {
      saltBuffer[i] = binarySalt.charCodeAt(i);
    }
  } catch (e) {
    saltBuffer = enc.encode(saltBase64);
  }

  // Import master password as raw key
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive AES-GCM 256-bit key
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return key;
}

// Encrypt plain text secret with derived AES key
export async function encryptPassword(plainText, key) {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );

  // Convert array buffers to Base64 strings for transfer
  const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return {
    encryptedPassword: ciphertextBase64,
    iv: ivBase64
  };
}

// Decrypt encrypted payload with derived AES key and IV
export async function decryptPassword(ciphertextBase64, ivBase64, key) {
  try {
    const binaryCipher = atob(ciphertextBase64);
    const cipherBuffer = new Uint8Array(binaryCipher.length);
    for (let i = 0; i < binaryCipher.length; i++) {
      cipherBuffer[i] = binaryCipher.charCodeAt(i);
    }

    const binaryIv = atob(ivBase64);
    const ivBuffer = new Uint8Array(binaryIv.length);
    for (let i = 0; i < binaryIv.length; i++) {
      ivBuffer[i] = binaryIv.charCodeAt(i);
    }

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      cipherBuffer
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.error('Decryption failed:', err);
    return '[Decryption Error: Invalid Master Password]';
  }
}

// Calculate Password Strength Score (0 to 100) & Status
export function calculatePasswordStrength(password) {
  if (!password) return { score: 0, label: 'Empty', color: '#64748b' };
  
  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 20;
  if (password.length >= 16) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 10;

  if (score < 40) return { score, label: 'Weak', color: '#f43f5e' };
  if (score < 70) return { score, label: 'Moderate', color: '#f59e0b' };
  if (score < 90) return { score, label: 'Strong', color: '#10b981' };
  return { score: 100, label: 'Very Strong', color: '#06b6d4' };
}

// Generate Cryptographically Secure Random Password
export function generateSecurePassword(length = 16, options = { uppercase: true, lowercase: true, numbers: true, symbols: true }) {
  const charset = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  let validChars = '';
  if (options.uppercase) validChars += charset.uppercase;
  if (options.lowercase) validChars += charset.lowercase;
  if (options.numbers) validChars += charset.numbers;
  if (options.symbols) validChars += charset.symbols;

  if (!validChars) validChars = charset.lowercase + charset.numbers;

  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += validChars[array[i] % validChars.length];
  }

  return result;
}

// Encode JSON payload to URL-safe Base64
export function encodeSharePayload(obj) {
  try {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (err) {
    console.error('Failed to encode share payload', err);
    return '';
  }
}

// Decode URL-safe Base64 string to JSON payload
export function decodeSharePayload(str) {
  if (!str) return null;
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch (err) {
    // Fallback for legacy unescape/atob format
    try {
      const clean = decodeURIComponent(str);
      const jsonStr = decodeURIComponent(escape(atob(clean)));
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to decode share payload', e);
      return null;
    }
  }
}

