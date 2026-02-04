import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface WebSocketUser {
  id: string;
  userId?: string;
  organizationId?: string;
  role?: string;
  rooms: Set<string>;
}

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private server: Server;
  private connectedClients: Map<string, WebSocketUser> = new Map();

  setServer(server: Server) {
    this.server = server;
  }

  getServer(): Server {
    return this.server;
  }

  // ============================================
  // Client Management
  // ============================================

  addClient(client: Socket, userData: Partial<WebSocketUser>) {
    const user: WebSocketUser = {
      id: client.id,
      userId: userData.userId,
      organizationId: userData.organizationId,
      role: userData.role,
      rooms: new Set(),
    };
    this.connectedClients.set(client.id, user);
    this.logger.log(`Client connected: ${client.id} (User: ${userData.userId})`);
  }

  removeClient(clientId: string) {
    const user = this.connectedClients.get(clientId);
    if (user) {
      this.connectedClients.delete(clientId);
      this.logger.log(`Client disconnected: ${clientId}`);
    }
  }

  getClient(clientId: string): WebSocketUser | undefined {
    return this.connectedClients.get(clientId);
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // ============================================
  // Room Management
  // ============================================

  joinRoom(client: Socket, room: string) {
    client.join(room);
    const user = this.connectedClients.get(client.id);
    if (user) {
      user.rooms.add(room);
    }
    this.logger.debug(`Client ${client.id} joined room: ${room}`);
  }

  leaveRoom(client: Socket, room: string) {
    client.leave(room);
    const user = this.connectedClients.get(client.id);
    if (user) {
      user.rooms.delete(room);
    }
    this.logger.debug(`Client ${client.id} left room: ${room}`);
  }

  // ============================================
  // Emit Events
  // ============================================

  // Emit to all connected clients
  emitToAll(event: string, data: any) {
    this.server?.emit(event, data);
  }

  // Emit to specific room
  emitToRoom(room: string, event: string, data: any) {
    this.server?.to(room).emit(event, data);
  }

  // Emit to specific client
  emitToClient(clientId: string, event: string, data: any) {
    this.server?.to(clientId).emit(event, data);
  }

  // Emit to organization room
  emitToOrganization(organizationId: string, event: string, data: any) {
    this.emitToRoom(`org:${organizationId}`, event, data);
  }

  // Emit to user
  emitToUser(userId: string, event: string, data: any) {
    this.emitToRoom(`user:${userId}`, event, data);
  }

  // ============================================
  // Machine Events
  // ============================================

  emitMachineStatusChange(machineId: string, status: string, organizationId: string) {
    const event = 'machine:status';
    const data = {
      machineId,
      status,
      timestamp: new Date().toISOString(),
    };

    // Emit to machine room
    this.emitToRoom(`machine:${machineId}`, event, data);

    // Emit to organization
    this.emitToOrganization(organizationId, event, data);
  }

  emitMachineInventoryUpdate(
    machineId: string,
    productId: string,
    quantity: number,
    organizationId: string,
  ) {
    const event = 'machine:inventory';
    const data = {
      machineId,
      productId,
      quantity,
      timestamp: new Date().toISOString(),
    };

    this.emitToRoom(`machine:${machineId}`, event, data);
    this.emitToOrganization(organizationId, event, data);
  }

  emitMachineError(machineId: string, error: string, organizationId: string) {
    const event = 'machine:error';
    const data = {
      machineId,
      error,
      timestamp: new Date().toISOString(),
    };

    this.emitToRoom(`machine:${machineId}`, event, data);
    this.emitToOrganization(organizationId, event, data);
  }

  // ============================================
  // Order Events
  // ============================================

  emitOrderCreated(order: any) {
    const event = 'order:created';
    const data = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      machineId: order.machineId,
      timestamp: new Date().toISOString(),
    };

    // Emit to user who created order
    if (order.userId) {
      this.emitToUser(order.userId, event, data);
    }

    // Emit to organization
    if (order.organizationId) {
      this.emitToOrganization(order.organizationId, event, data);
    }

    // Emit to machine room
    this.emitToRoom(`machine:${order.machineId}`, event, data);
  }

  emitOrderStatusChange(order: any) {
    const event = 'order:status';
    const data = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      previousStatus: order.previousStatus,
      timestamp: new Date().toISOString(),
    };

    if (order.userId) {
      this.emitToUser(order.userId, event, data);
    }

    if (order.organizationId) {
      this.emitToOrganization(order.organizationId, event, data);
    }
  }

  emitOrderDispensed(order: any, itemIndex: number) {
    const event = 'order:dispensed';
    const data = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      itemIndex,
      totalItems: order.items.length,
      timestamp: new Date().toISOString(),
    };

    if (order.userId) {
      this.emitToUser(order.userId, event, data);
    }
  }

  // ============================================
  // Notification Events
  // ============================================

  emitNotification(userId: string, notification: any) {
    this.emitToUser(userId, 'notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      createdAt: notification.createdAt,
    });
  }

  emitBroadcastNotification(organizationId: string, notification: any) {
    this.emitToOrganization(organizationId, 'notification:broadcast', notification);
  }

  // ============================================
  // Loyalty Events
  // ============================================

  emitPointsEarned(userId: string, points: number, reason: string) {
    this.emitToUser(userId, 'loyalty:points', {
      type: 'earned',
      points,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  emitPointsRedeemed(userId: string, points: number, rewardName: string) {
    this.emitToUser(userId, 'loyalty:points', {
      type: 'redeemed',
      points,
      rewardName,
      timestamp: new Date().toISOString(),
    });
  }

  emitTierUpgrade(userId: string, newTier: string, benefits: string[]) {
    this.emitToUser(userId, 'loyalty:tier', {
      type: 'upgrade',
      tier: newTier,
      benefits,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // Quest Events
  // ============================================

  emitQuestProgress(userId: string, questId: string, progress: number, target: number) {
    this.emitToUser(userId, 'quest:progress', {
      questId,
      progress,
      target,
      percentage: Math.round((progress / target) * 100),
      timestamp: new Date().toISOString(),
    });
  }

  emitQuestCompleted(userId: string, questId: string, reward: number) {
    this.emitToUser(userId, 'quest:completed', {
      questId,
      reward,
      timestamp: new Date().toISOString(),
    });
  }
}
