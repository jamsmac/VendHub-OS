/**
 * Crypto Utilities for VendHub OS
 * Note: These are lightweight utilities for client-side use.
 * For server-side cryptography, use Node.js crypto module.
 */

/**
 * Generate a random string of specified length
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  // Use crypto API if available (browser)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i]! % chars.length];
    }
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }

  return result;
}

/**
 * Generate a random numeric code (for OTP, verification codes, etc.)
 */
export function generateNumericCode(length: number): string {
  const chars = '0123456789';
  let result = '';

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i]! % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }

  return result;
}

/**
 * Generate a UUID v4
 */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a short unique ID (URL-safe)
 */
export function generateShortId(length = 8): string {
  // chars variable kept for documentation of character set used by generateRandomString
  // const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return generateRandomString(length);
}

/**
 * Simple hash function (not cryptographic, for checksums/fingerprints)
 */
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a hash-based color from string
 */
export function stringToColor(str: string): string {
  const hash = simpleHash(str);
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

/**
 * Base64 encode (URL-safe)
 */
export function base64Encode(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  // Node.js fallback
  return Buffer.from(str).toString('base64url');
}

/**
 * Base64 decode (URL-safe)
 */
export function base64Decode(str: string): string {
  // Add padding if needed
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }

  if (typeof atob !== 'undefined') {
    return atob(base64);
  }
  // Node.js fallback
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Mask sensitive data (e.g., email, phone)
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain || !localPart) return email;

  const maskedLocal =
    localPart.length <= 2
      ? '*'.repeat(localPart.length)
      : localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];

  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '*'.repeat(phone.length);

  return phone.slice(0, 4) + '*'.repeat(phone.length - 8) + phone.slice(-4);
}

/**
 * Mask card number
 */
export function maskCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 8) return '*'.repeat(cardNumber.length);

  return digits.slice(0, 4) + ' **** **** ' + digits.slice(-4);
}

/**
 * Generate API key (64 characters)
 */
export function generateApiKey(): string {
  const prefix = 'vhub_';
  const key = generateRandomString(64 - prefix.length);
  return prefix + key;
}

/**
 * Generate webhook secret
 */
export function generateWebhookSecret(): string {
  return 'whsec_' + generateRandomString(32);
}

/**
 * Calculate HMAC signature (for webhooks) - browser version
 * Note: For actual HMAC, use crypto.subtle in browser or crypto module in Node
 */
export async function calculateHmacSignature(
  payload: string,
  secret: string
): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Fallback - not cryptographically secure, use only for development
  console.warn('crypto.subtle not available, using insecure fallback');
  return simpleHash(payload + secret).toString(16);
}

/**
 * Verify HMAC signature
 */
export async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = await calculateHmacSignature(payload, secret);
  return timingSafeEqual(signature, expectedSignature);
}

/**
 * Timing-safe string comparison
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Obfuscate sensitive data for logging
 */
export function obfuscateForLog(data: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'cardNumber',
    'card_number',
    'cvv',
    'pin',
  ];

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = obfuscateForLog(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}
