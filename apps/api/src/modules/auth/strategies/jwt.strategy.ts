import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
  sessionId?: string;
  jti?: string;
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error(
        'CRITICAL: JWT_SECRET environment variable is not configured. ' +
        'This is required for secure authentication. ' +
        'Please set JWT_SECRET in your environment variables.'
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // First try cookie
        (req: Request) => {
          return req?.cookies?.vhub_access_token || null;
        },
        // Then try Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    // Check if specific token is blacklisted (by JTI)
    if (payload.jti) {
      const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(payload.jti);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    // Check if all tokens for user are blacklisted (e.g., after password change)
    if (payload.iat) {
      const isUserBlacklisted = await this.tokenBlacklistService.isUserBlacklisted(
        payload.sub,
        payload.iat,
      );
      if (isUserBlacklisted) {
        throw new UnauthorizedException('All sessions have been invalidated');
      }
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      firstName: user.firstName,
      lastName: user.lastName,
      sessionId: payload.sessionId,
      jti: payload.jti,
    };
  }
}
