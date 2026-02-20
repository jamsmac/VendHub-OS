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

interface SubscribeMachinePayload {
  machineId: string;
}

interface SubscribeMachinesPayload {
  machineIds: string[];
}

@WebSocketGateway({
  namespace: '/machines',
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
      .split(',')
      .map((s: string) => s.trim()),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class MachineEventsGateway
  extends BaseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  protected readonly logger = new Logger(MachineEventsGateway.name);

  constructor(
    jwtService: JwtService,
    wsService: WebSocketService,
    tokenBlacklistService: TokenBlacklistService,
  ) {
    super(jwtService, wsService, tokenBlacklistService);
  }

  afterInit(server: Server) {
    this.wsService.setServer(server);
    this.logger.log('Machine Events Gateway initialized');
  }

  protected onAuthenticated(client: Socket, payload: AuthenticatedPayload): void {
    // Auto-join organization room
    if (payload.organizationId) {
      this.wsService.joinRoom(client, `org:${payload.organizationId}`);
    }
  }

  // ============================================
  // Subscribe to Machine Updates
  // ============================================

  @SubscribeMessage('subscribe:machine')
  handleSubscribeMachine(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribeMachinePayload,
  ) {
    const { machineId } = payload;
    const user = this.wsService.getClient(client.id);

    if (!machineId) {
      return { success: false, error: 'Machine ID is required' };
    }

    if (!user?.organizationId) {
      return { success: false, error: 'Authentication required' };
    }

    this.wsService.joinRoom(client, `machine:${machineId}`);
    this.logger.debug(`Client ${client.id} subscribed to machine: ${machineId}`);

    return { success: true, machineId };
  }

  @SubscribeMessage('unsubscribe:machine')
  handleUnsubscribeMachine(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribeMachinePayload,
  ) {
    const { machineId } = payload;

    if (!machineId) {
      return { success: false, error: 'Machine ID is required' };
    }

    this.wsService.leaveRoom(client, `machine:${machineId}`);
    this.logger.debug(`Client ${client.id} unsubscribed from machine: ${machineId}`);

    return { success: true, machineId };
  }

  @SubscribeMessage('subscribe:machines')
  handleSubscribeMachines(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribeMachinesPayload,
  ) {
    const { machineIds } = payload;
    const user = this.wsService.getClient(client.id);

    if (!machineIds || !Array.isArray(machineIds)) {
      return { success: false, error: 'Machine IDs array is required' };
    }

    if (!user?.organizationId) {
      return { success: false, error: 'Authentication required' };
    }

    machineIds.forEach((machineId) => {
      this.wsService.joinRoom(client, `machine:${machineId}`);
    });

    this.logger.debug(
      `Client ${client.id} subscribed to ${machineIds.length} machines`,
    );

    return { success: true, count: machineIds.length };
  }

  // ============================================
  // Machine Heartbeat (for physical machines)
  // ============================================

  @SubscribeMessage('machine:heartbeat')
  handleMachineHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      machineId: string;
      status: string;
      metrics?: {
        temperature?: number;
        humidity?: number;
        inventory?: Record<string, number>;
      };
    },
  ) {
    const user = this.wsService.getClient(client.id);

    if (!user?.userId) {
      return { success: false, error: 'Authentication required' };
    }

    const { machineId, status, metrics } = payload;

    // Emit heartbeat to all subscribers
    this.server.to(`machine:${machineId}`).emit('machine:heartbeat', {
      machineId,
      status,
      metrics,
      timestamp: new Date().toISOString(),
    });

    return { success: true, received: new Date().toISOString() };
  }
}
