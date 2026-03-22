import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";

import { User, TwoFactorAuth } from "../../users/entities/user.entity";

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly TOTP_WINDOW = 1;

  constructor(
    @InjectRepository(TwoFactorAuth)
    private readonly twoFactorRepository: Repository<TwoFactorAuth>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    // Configure TOTP
    authenticator.options = {
      window: this.TOTP_WINDOW,
    };
  }

  /**
   * Setup TOTP 2FA
   */
  async setupTotp(
    userId: string,
  ): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException("User not found");
    }

    // Generate secret
    const secret = authenticator.generateSecret();

    // Generate QR code
    const otpauth = authenticator.keyuri(user.email, "VendHub OS", secret);
    const qrCode = await QRCode.toDataURL(otpauth);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );

    // Encrypt secret
    const { encrypted, iv } = this.encryptTotpSecret(secret);

    // Save or update 2FA record
    let twoFactor = await this.twoFactorRepository.findOne({
      where: { userId },
    });

    if (twoFactor) {
      twoFactor.totpSecret = encrypted;
      twoFactor.totpSecretIv = iv;
      twoFactor.backupCodes = hashedBackupCodes;
      twoFactor.usedBackupCodes = [];
    } else {
      twoFactor = this.twoFactorRepository.create({
        userId,
        totpSecret: encrypted,
        totpSecretIv: iv,
        backupCodes: hashedBackupCodes,
        usedBackupCodes: [],
      });
    }

    await this.twoFactorRepository.save(twoFactor);

    return { secret, qrCode, backupCodes };
  }

  /**
   * Verify and enable TOTP
   */
  async verifyAndEnableTotp(userId: string, code: string) {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { userId },
    });
    if (!twoFactor?.totpSecret) {
      throw new BadRequestException("TOTP not set up");
    }

    // Decrypt and verify
    const secret = this.decryptTotpSecret(
      twoFactor.totpSecret,
      twoFactor.totpSecretIv,
    );
    const isValid = authenticator.verify({ token: code, secret });

    if (!isValid) {
      throw new BadRequestException("Invalid verification code");
    }

    // Enable 2FA on user
    await this.userRepository.update(userId, { twoFactorEnabled: true });

    return { message: "2FA enabled successfully" };
  }

  /**
   * Regenerate backup codes for user
   */
  async regenerateBackupCodes(
    userId: string,
  ): Promise<{ backupCodes: string[] }> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { userId },
    });
    if (!twoFactor) {
      throw new BadRequestException("2FA not enabled");
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );

    // Update record
    twoFactor.backupCodes = hashedBackupCodes;
    twoFactor.usedBackupCodes = [];
    await this.twoFactorRepository.save(twoFactor);

    return { backupCodes };
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string, password: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException("User not found");
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException("Invalid password");
    }

    // Disable 2FA
    await this.userRepository.update(userId, { twoFactorEnabled: false });
    await this.twoFactorRepository.softDelete({ userId });

    return { message: "2FA disabled successfully" };
  }

  /**
   * Verify 2FA code (TOTP or backup)
   */
  async verify2FA(
    userId: string,
    totpCode?: string,
    backupCode?: string,
  ): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { userId },
    });
    if (!twoFactor) {
      return false;
    }

    // Check if locked
    if (twoFactor.isLocked) {
      return false;
    }

    // Try TOTP first
    if (totpCode && twoFactor.totpSecret) {
      const secret = this.decryptTotpSecret(
        twoFactor.totpSecret,
        twoFactor.totpSecretIv,
      );
      const isValid = authenticator.verify({ token: totpCode, secret });

      if (isValid) {
        twoFactor.lastUsedAt = new Date();
        twoFactor.failedAttempts = 0;
        await this.twoFactorRepository.save(twoFactor);
        return true;
      }
    }

    // Try backup code
    if (backupCode && twoFactor.backupCodes?.length > 0) {
      for (const hashedCode of twoFactor.backupCodes) {
        const isValid = await bcrypt.compare(backupCode, hashedCode);
        if (isValid && !twoFactor.usedBackupCodes?.includes(hashedCode)) {
          twoFactor.usedBackupCodes = [
            ...(twoFactor.usedBackupCodes || []),
            hashedCode,
          ];
          twoFactor.lastUsedAt = new Date();
          twoFactor.failedAttempts = 0;
          await this.twoFactorRepository.save(twoFactor);
          return true;
        }
      }
    }

    // Increment failed attempts
    twoFactor.failedAttempts += 1;
    if (twoFactor.failedAttempts >= 5) {
      twoFactor.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }
    await this.twoFactorRepository.save(twoFactor);

    return false;
  }

  /**
   * Get available 2FA methods for user
   */
  async getAvailable2FAMethods(userId: string): Promise<string[]> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { userId },
    });
    if (!twoFactor) return [];

    const methods: string[] = [];
    if (twoFactor.hasTotp) methods.push("totp");
    if (twoFactor.hasSms) methods.push("sms");
    if (twoFactor.hasEmail) methods.push("email");
    if (twoFactor.hasBackupCodes) methods.push("backup");

    return methods;
  }

  // ==================== Private Helpers ====================

  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
    }
    return codes;
  }

  private encryptTotpSecret(secret: string): { encrypted: string; iv: string } {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(secret, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    return {
      encrypted: encrypted + ":" + authTag,
      iv: iv.toString("hex"),
    };
  }

  private decryptTotpSecret(encryptedData: string, ivHex: string): string {
    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const [encrypted, authTag] = encryptedData.split(":") as [string, string];

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    let decrypted: string = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  private getEncryptionKey(): Buffer {
    const keyHex = this.configService.get("ENCRYPTION_KEY");
    const nodeEnv = this.configService.get("NODE_ENV");

    if (!keyHex || keyHex.length !== 64) {
      // SECURITY: In production, encryption key MUST be set
      if (nodeEnv === "production") {
        throw new InternalServerErrorException(
          "CRITICAL: ENCRYPTION_KEY must be set in production. " +
            "Generate with: openssl rand -hex 32",
        );
      }

      // Development only: use derived key with warning
      this.logger.warn(
        "ENCRYPTION_KEY not set - using development fallback. " +
          "DO NOT use in production!",
      );
      return crypto.scryptSync("vendhub-dev-key-unsafe", "vendhub-salt", 32);
    }

    return Buffer.from(keyHex, "hex");
  }
}
