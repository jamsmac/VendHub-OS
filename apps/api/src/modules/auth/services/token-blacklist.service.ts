import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Redis-based JWT token blacklisting service.
 *
 * Supports two levels of blacklisting:
 * 1. Individual token blacklisting by JTI (JWT ID)
 * 2. User-level blacklisting by timestamp — all tokens issued before the
 *    recorded timestamp are considered invalid.
 *
 * Keys stored in Redis:
 *   bl:{jti}       — individual token blacklist
 *   bl:user:{userId} — user-level blacklist timestamp
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Blacklist a single token by its JTI.
   * The entry is stored with a TTL that matches the token's remaining lifetime
   * so it is automatically cleaned up once the token would have expired anyway.
   *
   * @param jti              JWT ID
   * @param expiresInSeconds Remaining lifetime of the token in seconds
   */
  async blacklist(jti: string, expiresInSeconds: number): Promise<void> {
    if (!jti) {
      this.logger.warn('Attempted to blacklist a token without JTI — skipping');
      return;
    }

    // cache-manager v5 expects TTL in milliseconds
    await this.cacheManager.set(
      `bl:${jti}`,
      '1',
      expiresInSeconds * 1000,
    );

    this.logger.debug(`Token blacklisted: jti=${jti}, ttl=${expiresInSeconds}s`);
  }

  /**
   * Check whether a specific token (by JTI) has been blacklisted.
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    if (!jti) return false;

    const result = await this.cacheManager.get(`bl:${jti}`);
    return !!result;
  }

  /**
   * Blacklist ALL tokens for a given user by recording the current timestamp.
   * Any token whose `iat` (issued-at) is earlier than this timestamp will be
   * rejected by {@link isUserBlacklisted}.
   *
   * @param userId           User UUID
   * @param expiresInSeconds How long to keep the entry (should match the
   *                         longest possible token lifetime, e.g. refresh TTL)
   */
  async blacklistAllForUser(userId: string, expiresInSeconds: number): Promise<void> {
    if (!userId) {
      this.logger.warn('Attempted to blacklist tokens for empty userId — skipping');
      return;
    }

    await this.cacheManager.set(
      `bl:user:${userId}`,
      Date.now().toString(),
      expiresInSeconds * 1000,
    );

    this.logger.log(`All tokens blacklisted for user=${userId}`);
  }

  /**
   * Check whether a user-level blacklist entry exists and whether the supplied
   * token was issued before that timestamp.
   *
   * @param userId        User UUID
   * @param tokenIssuedAt The `iat` claim from the JWT (Unix seconds)
   */
  async isUserBlacklisted(userId: string, tokenIssuedAt: number): Promise<boolean> {
    if (!userId) return false;

    const timestamp = await this.cacheManager.get<string>(`bl:user:${userId}`);
    if (!timestamp) return false;

    // tokenIssuedAt is in seconds, timestamp is in milliseconds
    return tokenIssuedAt * 1000 < parseInt(timestamp, 10);
  }
}
