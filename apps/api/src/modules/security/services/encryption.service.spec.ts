import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EncryptionService, EncryptedData } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: { get: jest.Mock };

  // A valid 64-char hex key (32 bytes)
  const validKey = crypto.randomBytes(32).toString('hex');

  beforeEach(async () => {
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'ENCRYPTION_KEY') return validKey;
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  // ================================================================
  // encrypt / decrypt
  // ================================================================

  describe('encrypt', () => {
    it('should return an EncryptedData object with all required fields', () => {
      const result = service.encrypt('Hello World');

      expect(result.ciphertext).toBeDefined();
      expect(result.ciphertext.length).toBeGreaterThan(0);
      expect(result.iv).toBeDefined();
      expect(result.iv.length).toBe(32); // 16 bytes = 32 hex chars
      expect(result.authTag).toBeDefined();
      expect(result.algorithm).toBe('aes-256-gcm');
      expect(result.keyVersion).toBe(1);
    });

    it('should produce different ciphertexts for the same plaintext (random IV)', () => {
      const result1 = service.encrypt('same text');
      const result2 = service.encrypt('same text');

      expect(result1.ciphertext).not.toEqual(result2.ciphertext);
      expect(result1.iv).not.toEqual(result2.iv);
    });

    it('should handle empty string', () => {
      const result = service.encrypt('');
      expect(result.ciphertext).toBeDefined();
    });

    it('should handle unicode text', () => {
      const result = service.encrypt('Toshkent shahri');
      expect(result.ciphertext).toBeDefined();
      expect(result.ciphertext.length).toBeGreaterThan(0);
    });
  });

  describe('decrypt', () => {
    it('should decrypt back to original plaintext', () => {
      const plaintext = 'Secret API Key: sk_live_abc123';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt unicode text correctly', () => {
      const plaintext = 'Parol: 12345';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw when authTag is tampered', () => {
      const encrypted = service.encrypt('sensitive data');
      encrypted.authTag = 'a'.repeat(32); // tamper the auth tag

      expect(() => service.decrypt(encrypted)).toThrow();
    });

    it('should throw when ciphertext is tampered', () => {
      const encrypted = service.encrypt('sensitive data');
      encrypted.ciphertext = 'ff' + encrypted.ciphertext.substring(2);

      expect(() => service.decrypt(encrypted)).toThrow();
    });

    it('should throw when IV is tampered', () => {
      const encrypted = service.encrypt('sensitive data');
      encrypted.iv = crypto.randomBytes(16).toString('hex');

      expect(() => service.decrypt(encrypted)).toThrow();
    });
  });

  // ================================================================
  // encryptField / decryptField
  // ================================================================

  describe('encryptField', () => {
    it('should return a JSON string', () => {
      const result = service.encryptField('my-secret');
      const parsed = JSON.parse(result);

      expect(parsed.ciphertext).toBeDefined();
      expect(parsed.iv).toBeDefined();
      expect(parsed.authTag).toBeDefined();
      expect(parsed.algorithm).toBe('aes-256-gcm');
    });
  });

  describe('decryptField', () => {
    it('should decrypt a JSON-serialized encrypted field', () => {
      const original = 'payme_merchant_key_12345';
      const encryptedJson = service.encryptField(original);
      const decrypted = service.decryptField(encryptedJson);

      expect(decrypted).toBe(original);
    });

    it('should round-trip correctly for arbitrary strings', () => {
      const values = ['', 'a', 'long'.repeat(100), '{"json": true}', '<xml/>'];
      for (const val of values) {
        const encrypted = service.encryptField(val);
        const decrypted = service.decryptField(encrypted);
        expect(decrypted).toBe(val);
      }
    });
  });

  // ================================================================
  // hash
  // ================================================================

  describe('hash', () => {
    it('should produce consistent sha256 hash', () => {
      const hash1 = service.hash('test-value');
      const hash2 = service.hash('test-value');

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // sha256 hex = 64 chars
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = service.hash('value1');
      const hash2 = service.hash('value2');

      expect(hash1).not.toBe(hash2);
    });

    it('should support alternate algorithms', () => {
      const sha512 = service.hash('test', 'sha512');
      expect(sha512.length).toBe(128); // sha512 hex = 128 chars
    });

    it('should match Node.js crypto output', () => {
      const input = 'verify-this';
      const expected = crypto.createHash('sha256').update(input).digest('hex');
      expect(service.hash(input)).toBe(expected);
    });
  });

  // ================================================================
  // generateSecureToken
  // ================================================================

  describe('generateSecureToken', () => {
    it('should generate a 64-char hex token by default (32 bytes)', () => {
      const token = service.generateSecureToken();
      expect(token.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it('should generate token of custom byte length', () => {
      const token = service.generateSecureToken(16);
      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should generate unique tokens', () => {
      const tokens = new Set(
        Array.from({ length: 100 }, () => service.generateSecureToken()),
      );
      expect(tokens.size).toBe(100);
    });
  });

  // ================================================================
  // Key Management (getEncryptionKey edge cases)
  // ================================================================

  describe('key management', () => {
    it('should use dev fallback key when ENCRYPTION_KEY is not set in non-production', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ENCRYPTION_KEY') return undefined;
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      // Should not throw in development
      const result = service.encrypt('test');
      expect(result.ciphertext).toBeDefined();
    });

    it('should throw in production when ENCRYPTION_KEY is not set', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ENCRYPTION_KEY') return undefined;
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      expect(() => service.encrypt('test')).toThrow(/CRITICAL/);
    });

    it('should throw in production when ENCRYPTION_KEY is wrong length', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ENCRYPTION_KEY') return 'tooshort';
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      expect(() => service.encrypt('test')).toThrow(/CRITICAL/);
    });

    it('should use dev fallback when key is wrong length in non-production', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ENCRYPTION_KEY') return 'short';
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      });

      const result = service.encrypt('test');
      expect(result.ciphertext).toBeDefined();
    });
  });
});
