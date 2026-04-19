import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Custom throttle guard that tracks by user ID for authenticated requests,
 * falling back to IP for anonymous requests.
 *
 * This prevents a single authenticated user from consuming the rate limit
 * of an entire office/NAT (shared IP), and also prevents authenticated
 * users from bypassing IP-based limits by rotating IPs.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(
    req: Record<string, unknown>,
  ): Promise<string> {
    const user = req.user as { id?: string; sub?: string } | undefined;
    const userId = user?.id ?? user?.sub;
    if (userId) {
      return `user_${userId}`;
    }

    const ips = req.ips as string[] | undefined;
    return ips?.length ? (ips[0] ?? (req.ip as string)) : (req.ip as string);
  }
}
