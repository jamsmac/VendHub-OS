/**
 * Sensitive Data Masker
 *
 * Recursively masks sensitive fields in objects before logging.
 * Prevents accidental leakage of passwords, tokens, secrets, etc.
 */

const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'bot_token',
  'bot_token_encrypted',
  'credit_card',
  'cvv',
  'pin',
  'accesstoken',
  'refreshtoken',
  'passwordhash',
  'cardnumber',
  'bankaccount',
];

const MAX_DEPTH = 5;

/**
 * Recursively masks sensitive fields in an object.
 *
 * @param data - The data to mask
 * @param depth - Current recursion depth (prevents infinite loops)
 * @returns A new object with sensitive fields replaced by '***MASKED***'
 */
export function maskSensitiveData(data: any, depth = 0): any {
  if (depth > MAX_DEPTH || data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const masked: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      if (SENSITIVE_KEYS.some((sk) => keyLower.includes(sk))) {
        masked[key] = '***MASKED***';
      } else {
        masked[key] = maskSensitiveData(value, depth + 1);
      }
    }
    return masked;
  }

  return data;
}
