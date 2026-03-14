import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import * as crypto from "crypto";

import { User, UserSession } from "../../users/entities/user.entity";

interface DeviceInfo {
  os?: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  deviceType?: "desktop" | "mobile" | "tablet" | "unknown";
  userAgent?: string;
}

@Injectable()
export class AuthSessionService {
  private readonly SESSION_DURATION_DAYS = 7;

  constructor(
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
  ) {}

  /**
   * Get active sessions for user
   */
  async getSessions(userId: string) {
    const sessions = await this.sessionRepository.find({
      where: {
        userId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { lastActivityAt: "DESC" },
    });

    return sessions.map((s) => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      ipAddress: s.ipAddress,
      lastActivityAt: s.lastActivityAt,
      createdAt: s.createdAt,
    }));
  }

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: string, reason: string = "Manual revocation") {
    await this.sessionRepository.update(
      { id: sessionId },
      { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
    );
  }

  /**
   * Create a new session for a user
   */
  async createSession(
    user: User,
    ipAddress: string,
    deviceInfo: DeviceInfo,
  ): Promise<UserSession> {
    const refreshToken = this.generateRefreshToken();
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const session = this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash: tokenHash,
      refreshTokenHint: tokenHash.substring(0, 16),
      deviceInfo,
      ipAddress,
      lastActivityAt: new Date(),
      expiresAt: new Date(
        Date.now() + this.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
      ),
    });

    return this.sessionRepository.save(session);
  }

  /**
   * Parse user agent string into structured device info
   */
  parseUserAgent(userAgent: string): DeviceInfo {
    const info: DeviceInfo = {
      userAgent,
      deviceType: "unknown",
    };

    if (/mobile/i.test(userAgent)) {
      info.deviceType = "mobile";
    } else if (/tablet|ipad/i.test(userAgent)) {
      info.deviceType = "tablet";
    } else {
      info.deviceType = "desktop";
    }

    if (/windows/i.test(userAgent)) info.os = "Windows";
    else if (/macintosh|mac os/i.test(userAgent)) info.os = "macOS";
    else if (/linux/i.test(userAgent)) info.os = "Linux";
    else if (/android/i.test(userAgent)) info.os = "Android";
    else if (/iphone|ipad/i.test(userAgent)) info.os = "iOS";

    if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent))
      info.browser = "Chrome";
    else if (/firefox/i.test(userAgent)) info.browser = "Firefox";
    else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent))
      info.browser = "Safari";
    else if (/edge/i.test(userAgent)) info.browser = "Edge";

    return info;
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString("hex");
  }
}
