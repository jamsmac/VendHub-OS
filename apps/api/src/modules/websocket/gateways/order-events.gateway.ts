import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WebSocketService } from '../websocket.service';
import { TokenBlacklistService } from '../../auth/services/token-blacklist.service';
import { BaseGateway, AuthenticatedPayload } from './base.gateway';

@WebSocketGateway({
  namespace: '/orders',
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
      .split(',')
      .map((s: string) => s.trim()),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class OrderEventsGateway
  extends BaseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  protected readonly logger = new Logger(OrderEventsGateway.name);

  constructor(
    jwtService: JwtService,
    wsService: WebSocketService,
    tokenBlacklistService: TokenBlacklistService,
  ) {
    super(jwtService, wsService, tokenBlacklistService);
  }

  afterInit(_server: Server) {
    this.logger.log('Order Events Gateway initialized');
  }

  protected onAuthenticated(client: Socket, payload: AuthenticatedPayload): void {
    // Auto-join user room for order updates
    this.wsService.joinRoom(client, `user:${payload.sub}`);

    // Admin/operators join organization room
    if (['admin', 'operator', 'manager'].includes(payload.role)) {
      this.wsService.joinRoom(client, `org:${payload.organizationId}`);
    }

    this.logger.log(`Client connected to orders: ${client.id}`);
  }

  // ============================================
  // Subscribe to Order Updates
  // ============================================

  @SubscribeMessage('subscribe:order')
  handleSubscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { orderId: string },
  ) {
    const { orderId } = payload;
    const user = this.wsService.getClient(client.id);

    if (!orderId) {
      return { success: false, error: 'Order ID is required' };
    }

    if (!user?.organizationId) {
      return { success: false, error: 'Authentication required' };
    }

    this.wsService.joinRoom(client, `order:${orderId}`);
    this.logger.debug(`Client ${client.id} subscribed to order: ${orderId}`);

    return { success: true, orderId };
  }

  @SubscribeMessage('unsubscribe:order')
  handleUnsubscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { orderId: string },
  ) {
    const { orderId } = payload;

    if (!orderId) {
      return { success: false, error: 'Order ID is required' };
    }

    this.wsService.leaveRoom(client, `order:${orderId}`);
    this.logger.debug(`Client ${client.id} unsubscribed from order: ${orderId}`);

    return { success: true, orderId };
  }

  // ============================================
  // Order Actions (for machines/admins)
  // ============================================

  @SubscribeMessage('order:confirm')
  handleOrderConfirm(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      orderId: string;
      machineId: string;
    },
  ) {
    const user = this.wsService.getClient(client.id);

    if (!user?.role || !['admin', 'operator', 'manager', 'owner'].includes(user.role)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const { orderId, machineId } = payload;

    // Emit order confirmation to all subscribers
    this.server.to(`order:${orderId}`).emit('order:confirmed', {
      orderId,
      machineId,
      status: 'confirmed',
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  @SubscribeMessage('order:dispense')
  handleOrderDispense(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      orderId: string;
      itemIndex: number;
      success: boolean;
      error?: string;
    },
  ) {
    const user = this.wsService.getClient(client.id);

    if (!user?.role || !['admin', 'operator', 'manager', 'owner'].includes(user.role)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const { orderId, itemIndex, success, error } = payload;

    this.server.to(`order:${orderId}`).emit('order:item-dispensed', {
      orderId,
      itemIndex,
      success,
      error,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  @SubscribeMessage('order:complete')
  handleOrderComplete(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      orderId: string;
      pointsEarned?: number;
    },
  ) {
    const user = this.wsService.getClient(client.id);

    if (!user?.role || !['admin', 'operator', 'manager', 'owner'].includes(user.role)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const { orderId, pointsEarned } = payload;

    this.server.to(`order:${orderId}`).emit('order:completed', {
      orderId,
      status: 'completed',
      pointsEarned,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }
}
