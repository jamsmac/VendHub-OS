/**
 * SMS Service
 * Sends SMS via Uzbekistan providers: Eskiz (primary) and PlayMobile (fallback)
 */

import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import {
  SendSmsDto,
  BulkSmsDto,
  SmsResponseDto,
  SmsProvider,
  SmsStatus,
} from "./dto/send-sms.dto";

interface EskizTokenCache {
  token: string;
  expiresAt: number;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  // Eskiz configuration
  private readonly eskizEmail: string;
  private readonly eskizPassword: string;
  private readonly eskizSenderId: string;
  private readonly eskizBaseUrl = "https://notify.eskiz.uz/api";

  // PlayMobile configuration
  private readonly playmobileLogin: string;
  private readonly playmobilePassword: string;
  private readonly playmobileSenderId: string;
  private readonly playmobileBaseUrl =
    "https://send.playmobile.uz/broker-api/send";

  // Cached Eskiz auth token
  private eskizTokenCache: EskizTokenCache | null = null;

  constructor(private readonly configService: ConfigService) {
    this.eskizEmail = this.configService.get<string>("ESKIZ_EMAIL", "");
    this.eskizPassword = this.configService.get<string>("ESKIZ_PASSWORD", "");
    this.eskizSenderId = this.configService.get<string>(
      "ESKIZ_SENDER_ID",
      "4546",
    );

    this.playmobileLogin = this.configService.get<string>(
      "PLAYMOBILE_LOGIN",
      "",
    );
    this.playmobilePassword = this.configService.get<string>(
      "PLAYMOBILE_PASSWORD",
      "",
    );
    this.playmobileSenderId = this.configService.get<string>(
      "PLAYMOBILE_SENDER_ID",
      "",
    );

    if (!this.isConfigured()) {
      this.logger.warn(
        "No SMS provider configured. Set ESKIZ_EMAIL/ESKIZ_PASSWORD or PLAYMOBILE_LOGIN/PLAYMOBILE_PASSWORD env vars.",
      );
    } else {
      const providers: string[] = [];
      if (this.isEskizConfigured()) providers.push("Eskiz");
      if (this.isPlayMobileConfigured()) providers.push("PlayMobile");
      this.logger.log(
        `SMS service initialized with providers: ${providers.join(", ")}`,
      );
    }
  }

  // ========================================================================
  // PUBLIC METHODS
  // ========================================================================

  /**
   * Send a single SMS
   */
  async send(dto: SendSmsDto): Promise<SmsResponseDto> {
    const phone = this.formatPhoneNumber(dto.to);

    if (!this.isConfigured()) {
      this.logger.warn(
        `SMS not configured. Would send to ${phone}: "${dto.message}"`,
      );
      return this.createMockResponse();
    }

    // Try Eskiz first (primary), then PlayMobile (fallback)
    if (this.isEskizConfigured()) {
      try {
        return await this.sendViaEskiz(phone, dto.message);
      } catch (error) {
        this.logger.error(
          `Eskiz send failed, trying PlayMobile fallback`,
          error,
        );
        if (this.isPlayMobileConfigured()) {
          return await this.sendViaPlayMobile(phone, dto.message);
        }
        return this.createErrorResponse(SmsProvider.ESKIZ, error);
      }
    }

    if (this.isPlayMobileConfigured()) {
      try {
        return await this.sendViaPlayMobile(phone, dto.message);
      } catch (error) {
        this.logger.error(`PlayMobile send failed`, error);
        return this.createErrorResponse(SmsProvider.PLAYMOBILE, error);
      }
    }

    return this.createMockResponse();
  }

  /**
   * Send SMS to multiple recipients
   */
  async sendBulk(dto: BulkSmsDto): Promise<SmsResponseDto[]> {
    const results: SmsResponseDto[] = [];

    for (const recipient of dto.recipients) {
      const result = await this.send({ to: recipient, message: dto.message });
      results.push(result);
    }

    const sent = results.filter((r) => r.status === SmsStatus.SENT).length;
    const failed = results.filter((r) => r.status === SmsStatus.FAILED).length;
    this.logger.log(
      `Bulk SMS: ${sent} sent, ${failed} failed out of ${dto.recipients.length}`,
    );

    return results;
  }

  /**
   * Send verification code SMS with template
   */
  async sendVerificationCode(
    phone: string,
    code: string,
  ): Promise<SmsResponseDto> {
    const message = `VendHub: Kod podtverzhdeniya / Tasdiqlash kodi: ${code}`;
    return this.send({ to: phone, message });
  }

  /**
   * Send task notification SMS with template
   */
  async sendTaskNotification(
    phone: string,
    taskType: string,
    machineNumber: string,
  ): Promise<SmsResponseDto> {
    const message = `VendHub: Novaya zadacha "${taskType}" dlya apparata ${machineNumber} / Yangi vazifa "${taskType}" apparat ${machineNumber}`;
    return this.send({ to: phone, message });
  }

  /**
   * Check if any SMS provider is configured
   */
  isConfigured(): boolean {
    return this.isEskizConfigured() || this.isPlayMobileConfigured();
  }

  // ========================================================================
  // ESKIZ PROVIDER
  // ========================================================================

  /**
   * Check if Eskiz is configured
   */
  private isEskizConfigured(): boolean {
    return !!(this.eskizEmail && this.eskizPassword);
  }

  /**
   * Authenticate with Eskiz API and cache token
   */
  private async getEskizToken(): Promise<string> {
    // Return cached token if still valid (with 5 min buffer)
    if (
      this.eskizTokenCache &&
      this.eskizTokenCache.expiresAt > Date.now() + 5 * 60 * 1000
    ) {
      return this.eskizTokenCache.token;
    }

    this.logger.log("Refreshing Eskiz auth token...");

    const response = await fetch(`${this.eskizBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: this.eskizEmail,
        password: this.eskizPassword,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadGatewayException(
        `Eskiz auth failed (${response.status}): ${errorText}`,
      );
    }

    const data = (await response.json()) as { data?: { token?: string } };
    const token = data?.data?.token;

    if (!token) {
      throw new BadGatewayException("Eskiz auth response missing token");
    }

    // Cache token for 29 days (Eskiz tokens expire in ~30 days)
    this.eskizTokenCache = {
      token,
      expiresAt: Date.now() + 29 * 24 * 60 * 60 * 1000,
    };

    this.logger.log("Eskiz auth token refreshed successfully");
    return token;
  }

  /**
   * Send SMS via Eskiz API
   */
  private async sendViaEskiz(
    phone: string,
    message: string,
  ): Promise<SmsResponseDto> {
    const token = await this.getEskizToken();

    const response = await fetch(`${this.eskizBaseUrl}/message/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mobile_phone: phone,
        message,
        from: this.eskizSenderId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // If 401, invalidate token cache and retry once
      if (response.status === 401) {
        this.eskizTokenCache = null;
        this.logger.warn("Eskiz token expired, retrying with fresh token...");
        const freshToken = await this.getEskizToken();

        const retryResponse = await fetch(
          `${this.eskizBaseUrl}/message/sms/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${freshToken}`,
            },
            body: JSON.stringify({
              mobile_phone: phone,
              message,
              from: this.eskizSenderId,
            }),
          },
        );

        if (!retryResponse.ok) {
          const retryError = await retryResponse.text();
          throw new BadGatewayException(
            `Eskiz send failed after retry (${retryResponse.status}): ${retryError}`,
          );
        }

        const retryData = (await retryResponse.json()) as { id?: string };
        this.logger.log(`SMS sent via Eskiz (retry) to ${phone}`);
        return {
          messageId: retryData?.id || crypto.randomUUID(),
          status: SmsStatus.SENT,
          provider: SmsProvider.ESKIZ,
        };
      }

      throw new BadGatewayException(
        `Eskiz send failed (${response.status}): ${errorText}`,
      );
    }

    const data = (await response.json()) as { id?: string };
    this.logger.log(`SMS sent via Eskiz to ${phone}`);

    return {
      messageId: data?.id || crypto.randomUUID(),
      status: SmsStatus.SENT,
      provider: SmsProvider.ESKIZ,
    };
  }

  // ========================================================================
  // PLAYMOBILE PROVIDER
  // ========================================================================

  /**
   * Check if PlayMobile is configured
   */
  private isPlayMobileConfigured(): boolean {
    return !!(this.playmobileLogin && this.playmobilePassword);
  }

  /**
   * Send SMS via PlayMobile API
   */
  private async sendViaPlayMobile(
    phone: string,
    message: string,
  ): Promise<SmsResponseDto> {
    const messageId = crypto.randomUUID();

    const basicAuth = Buffer.from(
      `${this.playmobileLogin}:${this.playmobilePassword}`,
    ).toString("base64");

    const response = await fetch(this.playmobileBaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        messages: [
          {
            recipient: phone,
            "message-id": messageId,
            sms: {
              originator: this.playmobileSenderId,
              content: {
                text: message,
              },
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadGatewayException(
        `PlayMobile send failed (${response.status}): ${errorText}`,
      );
    }

    this.logger.log(`SMS sent via PlayMobile to ${phone}`);

    return {
      messageId,
      status: SmsStatus.SENT,
      provider: SmsProvider.PLAYMOBILE,
    };
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Format Uzbek phone number to standard format (998XXXXXXXXX)
   * Handles: +998901234567, 998901234567, 901234567, +998 90 123 45 67
   */
  formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters (spaces, dashes, parens, plus)
    let cleaned = phone.replace(/\D/g, "");

    // If starts with leading country code indicator "00998", strip "00"
    if (cleaned.startsWith("00998")) {
      cleaned = cleaned.substring(2);
    }

    // If 9 digits (local format without country code), prepend 998
    if (cleaned.length === 9 && /^[0-9]{9}$/.test(cleaned)) {
      cleaned = `998${cleaned}`;
    }

    // Should now be 12 digits starting with 998
    if (cleaned.length === 12 && cleaned.startsWith("998")) {
      return cleaned;
    }

    // Return as-is if we can't normalize (provider will reject if invalid)
    this.logger.warn(
      `Could not normalize phone number: ${phone} -> ${cleaned}`,
    );
    return cleaned;
  }

  /**
   * Create a mock response when no provider is configured
   */
  private createMockResponse(): SmsResponseDto {
    return {
      messageId: `mock-${crypto.randomUUID()}`,
      status: SmsStatus.NOT_CONFIGURED,
      provider: SmsProvider.MOCK,
      error: "No SMS provider configured",
    };
  }

  /**
   * Create an error response
   */
  private createErrorResponse(
    provider: SmsProvider,
    error: unknown,
  ): SmsResponseDto {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      messageId: `err-${crypto.randomUUID()}`,
      status: SmsStatus.FAILED,
      provider,
      error: errorMessage,
    };
  }
}
