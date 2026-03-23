import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { WebSocketService } from "../websocket.service";
import { TokenBlacklistService } from "../../auth/services/token-blacklist.service";
import { BaseGateway, AuthenticatedPayload } from "./base.gateway";

// Allowed topic prefixes that users can subscribe to
const ALLOWED_TOPIC_PREFIXES = [
  "orders",
  "machines",
  "inventory",
  "alerts",
  "system",
] as const;

@WebSocketGateway({
  namespace: "/notifications",
  cors: {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",").map((s: string) => s.trim())
      : [],
    credentials: true,
  },
  transports: ["websocket", "polling"],
})
export class NotificationGateway
  extends BaseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  protected readonly logger = new Logger(NotificationGateway.name);

  constructor(
    jwtService: JwtService,
    wsService: WebSocketService,
    tokenBlacklistService: TokenBlacklistService,
  ) {
    super(jwtService, wsService, tokenBlacklistService);
  }

  afterInit(_server: Server) {
    this.logger.log("Notification Gateway initialized");
  }

  protected onAuthenticated(
    client: Socket,
    payload: AuthenticatedPayload,
  ): void {
    // Join user-specific notification room
    this.wsService.joinRoom(client, `user:${payload.sub}`);

    // Join organization broadcast room
    if (payload.organizationId) {
      this.wsService.joinRoom(
        client,
        `org:${payload.organizationId}:notifications`,
      );
    }

    this.logger.log(`Client connected to notifications: ${client.id}`);

    // Send pending notifications count
    client.emit("notifications:init", {
      connected: true,
      userId: payload.sub,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Validate that a topic category is in the allowlist.
   * All topics are org-scoped when joined — the room name becomes
   * org:{orgId}:topic:{category} to prevent cross-tenant leaks.
   */
  private isTopicAllowed(topic: string): boolean {
    return ALLOWED_TOPIC_PREFIXES.some(
      (prefix) => topic === prefix || topic.startsWith(`${prefix}:`),
    );
  }

  // ============================================
  // Notification Management
  // ============================================

  @SubscribeMessage("notifications:read")
  handleNotificationRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { notificationId: string },
  ) {
    const user = this.wsService.getClient(client.id);

    if (!user?.userId || !user?.organizationId) {
      return { success: false, error: "Authentication required" };
    }

    const { notificationId } = payload;

    // In real implementation, mark notification as read in DB
    // and verify the notification belongs to user's organization
    this.logger.debug(
      `Notification ${notificationId} marked as read by user ${user.userId} (org: ${user.organizationId})`,
    );

    return { success: true, notificationId };
  }

  @SubscribeMessage("notifications:readAll")
  handleNotificationsReadAll(@ConnectedSocket() client: Socket) {
    const user = this.wsService.getClient(client.id);

    if (!user?.userId) {
      return { success: false, error: "User not authenticated" };
    }

    // In real implementation, mark all notifications as read in DB
    this.logger.debug(
      `All notifications marked as read for user ${user.userId}`,
    );

    return { success: true };
  }

  @SubscribeMessage("notifications:subscribe")
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { topics: string[] },
  ) {
    const user = this.wsService.getClient(client.id);

    if (!user?.userId || !user?.organizationId) {
      return { success: false, error: "Authentication required" };
    }

    const { topics } = payload;

    if (!topics || !Array.isArray(topics)) {
      return { success: false, error: "Topics array is required" };
    }

    // Only subscribe to allowed topic categories — rooms are org-scoped
    const allowedTopics = topics.filter((topic) => this.isTopicAllowed(topic));

    allowedTopics.forEach((topic) => {
      this.wsService.joinRoom(
        client,
        `org:${user.organizationId}:topic:${topic}`,
      );
    });

    const rejected = topics.length - allowedTopics.length;
    if (rejected > 0) {
      this.logger.warn(
        `Client ${client.id} attempted ${rejected} unauthorized topic subscriptions`,
      );
    }

    return { success: true, topics: allowedTopics };
  }

  @SubscribeMessage("notifications:unsubscribe")
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { topics: string[] },
  ) {
    const user = this.wsService.getClient(client.id);

    if (!user?.userId || !user?.organizationId) {
      return { success: false, error: "Authentication required" };
    }

    const { topics } = payload;

    if (!topics || !Array.isArray(topics)) {
      return { success: false, error: "Topics array is required" };
    }

    topics.forEach((topic) => {
      this.wsService.leaveRoom(
        client,
        `org:${user.organizationId}:topic:${topic}`,
      );
    });

    return { success: true, topics };
  }

  // ============================================
  // Presence
  // ============================================

  @SubscribeMessage("presence:online")
  handlePresenceOnline(@ConnectedSocket() client: Socket) {
    const user = this.wsService.getClient(client.id);

    if (user?.userId && user?.organizationId) {
      // Notify organization about user presence (use notifications room)
      this.server
        .to(`org:${user.organizationId}:notifications`)
        .emit("presence:user-online", {
          userId: user.userId,
          timestamp: new Date().toISOString(),
        });
    }

    return { success: true };
  }

  @SubscribeMessage("presence:typing")
  handlePresenceTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; isTyping: boolean },
  ) {
    const user = this.wsService.getClient(client.id);
    const { roomId, isTyping } = payload;

    if (user?.userId) {
      this.server.to(roomId).emit("presence:typing", {
        userId: user.userId,
        isTyping,
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true };
  }
}
