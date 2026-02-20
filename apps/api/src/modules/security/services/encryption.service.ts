import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  algorithm: string;
  keyVersion: number;
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyVersion = 1;

  constructor(private readonly configService: ConfigService) {}

  encrypt(plaintext: string): EncryptedData {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      ciphertext,
      iv: iv.toString('hex'),
      authTag,
      algorithm: this.algorithm,
      keyVersion: this.keyVersion,
    };
  }

  decrypt(data: EncryptedData): string {
    const key = this.getEncryptionKey(data.keyVersion);
    const iv = Buffer.from(data.iv, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

    let plaintext = decipher.update(data.ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  encryptField(value: string): string {
    const encrypted = this.encrypt(value);
    return JSON.stringify(encrypted);
  }

  decryptField(encryptedJson: string): string {
    const data: EncryptedData = JSON.parse(encryptedJson);
    return this.decrypt(data);
  }

  hash(value: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(value).digest('hex');
  }

  generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  private getEncryptionKey(version: number = this.keyVersion): Buffer {
    const keyEnvVar = version === 1 ? 'ENCRYPTION_KEY' : `ENCRYPTION_KEY_V${version}`;
    const keyHex = this.configService.get<string>(keyEnvVar);
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    if (!keyHex || keyHex.length !== 64) {
      if (nodeEnv === 'production') {
        throw new Error(
          `CRITICAL: ${keyEnvVar} must be a 64-char hex string (32 bytes). ` +
          'Generate with: openssl rand -hex 32',
        );
      }

      this.logger.warn(
        `${keyEnvVar} not set — using development fallback. DO NOT use in production!`,
      );
      return crypto.scryptSync(`vendhub-dev-key-v${version}`, 'vendhub-salt', 32);
    }

    return Buffer.from(keyHex, 'hex');
  }
}
