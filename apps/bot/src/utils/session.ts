import Redis from 'ioredis';
import { config } from '../config';
import { SessionData } from '../types';

// ============================================
// Redis Connection
// ============================================

export const redis = new Redis(config.redisUrl, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (error) => {
  console.error('❌ Redis error:', error);
});

// ============================================
// Session Store
// ============================================

const SESSION_PREFIX = 'bot:session:';
const SESSION_TTL = 86400; // 24 hours

export const sessionStore = {
  /**
   * Get session data for a user
   */
  async get(key: string): Promise<SessionData | undefined> {
    try {
      const data = await redis.get(`${SESSION_PREFIX}${key}`);
      if (!data) return undefined;

      const session = JSON.parse(data) as SessionData;
      session.lastActivity = Date.now();
      return session;
    } catch (error) {
      console.error('Session get error:', error);
      return undefined;
    }
  },

  /**
   * Save session data for a user
   */
  async set(key: string, session: SessionData): Promise<void> {
    try {
      session.lastActivity = Date.now();
      await redis.set(
        `${SESSION_PREFIX}${key}`,
        JSON.stringify(session),
        'EX',
        SESSION_TTL
      );
    } catch (error) {
      console.error('Session set error:', error);
    }
  },

  /**
   * Delete session data for a user
   */
  async delete(key: string): Promise<void> {
    try {
      await redis.del(`${SESSION_PREFIX}${key}`);
    } catch (error) {
      console.error('Session delete error:', error);
    }
  },

  /**
   * Clear cart from session
   */
  async clearCart(key: string): Promise<void> {
    const session = await this.get(key);
    if (session) {
      session.cart = [];
      session.machineId = undefined;
      await this.set(key, session);
    }
  },

  /**
   * Reset session step
   */
  async resetStep(key: string): Promise<void> {
    const session = await this.get(key);
    if (session) {
      session.step = undefined;
      session.data = undefined;
      await this.set(key, session);
    }
  },
};

// ============================================
// Session Middleware
// ============================================

export function createSessionMiddleware() {
  return async (ctx: any, next: () => Promise<void>) => {
    const key = ctx.from?.id?.toString();

    if (key) {
      // Load session
      ctx.session = (await sessionStore.get(key)) || {};

      // Execute handler
      await next();

      // Save session
      await sessionStore.set(key, ctx.session);
    } else {
      await next();
    }
  };
}

// ============================================
// Rate Limiting
// ============================================

const RATE_LIMIT_PREFIX = 'bot:rate:';
const RATE_LIMIT_WINDOW = 60; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute

export const rateLimiter = {
  /**
   * Check if user is rate limited
   */
  async isLimited(userId: number): Promise<boolean> {
    const key = `${RATE_LIMIT_PREFIX}${userId}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }

    return count > RATE_LIMIT_MAX;
  },

  /**
   * Get remaining requests
   */
  async getRemaining(userId: number): Promise<number> {
    const key = `${RATE_LIMIT_PREFIX}${userId}`;
    const count = parseInt(await redis.get(key) || '0', 10);
    return Math.max(0, RATE_LIMIT_MAX - count);
  },
};

// ============================================
// Cache Helpers
// ============================================

const CACHE_PREFIX = 'bot:cache:';

export const cache = {
  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(`${CACHE_PREFIX}${key}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Set cached value with TTL
   */
  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    try {
      await redis.set(
        `${CACHE_PREFIX}${key}`,
        JSON.stringify(value),
        'EX',
        ttl
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  },

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    await redis.del(`${CACHE_PREFIX}${key}`);
  },
};

export default {
  redis,
  sessionStore,
  rateLimiter,
  cache,
  createSessionMiddleware,
};
