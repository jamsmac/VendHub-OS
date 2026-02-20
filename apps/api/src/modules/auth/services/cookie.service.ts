import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, CookieOptions } from 'express';

/**
 * HttpOnly cookie management service for JWT tokens.
 *
 * Stores access and refresh tokens as secure, HttpOnly cookies so they are
 * not accessible from JavaScript and are automatically sent with every request.
 *
 * Environment variables:
 *   COOKIE_DOMAIN      — Domain scope for cookies (default: empty = current host)
 *   COOKIE_SECURE      — Require HTTPS (default: true in production)
 *   COOKIE_SAME_SITE   — SameSite attribute (default: lax)
 *   COOKIE_PATH        — Path scope (default: /)
 *   JWT_ACCESS_EXPIRES — Access token lifetime (e.g. '15m', used to compute maxAge)
 *   SESSION_DURATION_DAYS — Refresh token lifetime in days (default: 7)
 */
@Injectable()
export class CookieService {
  private readonly logger = new Logger(CookieService.name);

  /** Cookie name for the access token */
  private static readonly ACCESS_TOKEN_COOKIE = 'vhub_access_token';
  /** Cookie name for the refresh token */
  private static readonly REFRESH_TOKEN_COOKIE = 'vhub_refresh_token';

  private readonly isProduction: boolean;
  private readonly cookieDomain: string | undefined;
  private readonly cookieSecure: boolean;
  private readonly cookieSameSite: 'strict' | 'lax' | 'none';
  private readonly cookiePath: string;
  private readonly accessMaxAgeMs: number;
  private readonly refreshMaxAgeMs: number;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';

    const domain = this.configService.get<string>('COOKIE_DOMAIN', '');
    this.cookieDomain = domain || undefined;

    this.cookieSecure = this.configService.get<string>('COOKIE_SECURE', this.isProduction ? 'true' : 'false') === 'true';

    const sameSite = this.configService.get<string>('COOKIE_SAME_SITE', 'lax')?.toLowerCase();
    if (sameSite === 'strict' || sameSite === 'lax' || sameSite === 'none') {
      this.cookieSameSite = sameSite;
    } else {
      this.logger.warn(
        `Invalid COOKIE_SAME_SITE value "${sameSite}", falling back to "lax"`,
      );
      this.cookieSameSite = 'lax';
    }

    this.cookiePath = this.configService.get<string>('COOKIE_PATH', '/');

    // Parse access token expiry (e.g. '15m' -> 900_000ms)
    const accessExpires = this.configService.get<string>('JWT_ACCESS_EXPIRES', '15m');
    this.accessMaxAgeMs = this.parseDuration(accessExpires);

    // Refresh token expiry from session duration
    const sessionDays = this.configService.get<number>('SESSION_DURATION_DAYS', 7);
    this.refreshMaxAgeMs = sessionDays * 24 * 60 * 60 * 1000;

    this.logger.log(
      `Cookie service initialised: secure=${this.cookieSecure}, sameSite=${this.cookieSameSite}, ` +
      `domain=${this.cookieDomain || '(current host)'}, accessMaxAge=${this.accessMaxAgeMs}ms, ` +
      `refreshMaxAge=${this.refreshMaxAgeMs}ms`,
    );
  }

  /**
   * Set both access and refresh token cookies on the response.
   */
  setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie(
      CookieService.ACCESS_TOKEN_COOKIE,
      accessToken,
      this.getCookieOptions(this.accessMaxAgeMs),
    );

    res.cookie(
      CookieService.REFRESH_TOKEN_COOKIE,
      refreshToken,
      this.getCookieOptions(this.refreshMaxAgeMs),
    );
  }

  /**
   * Clear both token cookies from the response.
   */
  clearTokenCookies(res: Response): void {
    const clearOptions: CookieOptions = {
      ...this.getCookieOptions(0),
      maxAge: 0,
    };

    res.clearCookie(CookieService.ACCESS_TOKEN_COOKIE, clearOptions);
    res.clearCookie(CookieService.REFRESH_TOKEN_COOKIE, clearOptions);
  }

  /**
   * Extract the access token from the request cookie.
   * Returns null if not present.
   */
  getAccessTokenFromCookie(req: Request): string | null {
    return req.cookies?.[CookieService.ACCESS_TOKEN_COOKIE] || null;
  }

  /**
   * Extract the refresh token from the request cookie.
   * Returns null if not present.
   */
  getRefreshTokenFromCookie(req: Request): string | null {
    return req.cookies?.[CookieService.REFRESH_TOKEN_COOKIE] || null;
  }

  /**
   * Build cookie options with the given max-age.
   */
  private getCookieOptions(maxAge: number): CookieOptions {
    const options: CookieOptions = {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: this.cookieSameSite,
      path: this.cookiePath,
      maxAge,
    };

    if (this.cookieDomain) {
      options.domain = this.cookieDomain;
    }

    return options;
  }

  /**
   * Parse a duration string like '15m', '1h', '7d' into milliseconds.
   * Falls back to 15 minutes if the format is unrecognised.
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(s|m|h|d)$/);
    if (!match) {
      this.logger.warn(
        `Unrecognised duration format "${duration}", defaulting to 15m`,
      );
      return 15 * 60 * 1000;
    }

    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  }
}
