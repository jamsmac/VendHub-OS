import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WebSocketService } from '../websocket.service';
import { TokenBlacklistService } from '../../auth/services/token-blacklist.service';

export interface AuthenticatedPayload {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
  sessionId?: string;
  jti?: string;
  iat?: number;
}

export abstract class BaseGateway {
  protected abstract readonly logger: Logger;
  protected abstract server: Server;

  constructor(
    protected readonly jwtService: JwtService,
    protected readonly wsService: WebSocketService,
    protected readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  /**
   * Authenticate and register a WebSocket client.
   * Subclasses override onAuthenticated() to add gateway-specific room joins.
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Unauthorized connection attempt: ${client.id}`);
        client.disconnect();
        return;
      }

      const payload: AuthenticatedPayload = await this.jwtService.verifyAsync(token);

      // Check token blacklist (logout, password change)
      if (payload.jti) {
        const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(payload.jti);
        if (isBlacklisted) {
          this.logger.warn(`Blacklisted token used for WS connection: ${client.id}`);
          client.disconnect();
          return;
        }
      }
      if (payload.iat) {
        const isUserBlacklisted = await this.tokenBlacklistService.isUserBlacklisted(
          payload.sub,
          payload.iat,
        );
        if (isUserBlacklisted) {
          this.logger.warn(`User-blacklisted token used for WS connection: ${client.id}`);
          client.disconnect();
          return;
        }
      }

      this.wsService.addClient(client, {
        userId: payload.sub,
        organizationId: payload.organizationId,
        role: payload.role,
      });

      // Gateway-specific setup (room joins, init events)
      this.onAuthenticated(client, payload);
    } catch (error: any) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.wsService.removeClient(client.id);
  }

  /**
   * Called after successful authentication. Override to add
   * gateway-specific room joins and init events.
   */
  protected abstract onAuthenticated(client: Socket, payload: AuthenticatedPayload): void;

  protected extractToken(client: Socket): string | null {
    // Try Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Try query parameter
    const token = client.handshake.query.token;
    if (typeof token === 'string') {
      return token;
    }

    // Try auth object
    const auth = client.handshake.auth;
    if (auth?.token) {
      return auth.token;
    }

    return null;
  }
}
