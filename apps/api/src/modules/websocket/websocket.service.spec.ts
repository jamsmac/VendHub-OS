import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketService, WebSocketUser } from './websocket.service';
import { Server, Socket } from 'socket.io';

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockServer: jest.Mocked<Partial<Server>>;
  let mockSocket: jest.Mocked<Partial<Socket>>;
  let mockRoomEmit: jest.Mock;

  const clientId = 'socket-id-1';
  const userId = 'user-uuid-1';
  const orgId = 'org-uuid-1';

  beforeEach(async () => {
    mockRoomEmit = jest.fn();
    mockServer = {
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: mockRoomEmit }),
    };

    mockSocket = {
      id: clientId,
      join: jest.fn(),
      leave: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WebSocketService],
    }).compile();

    service = module.get<WebSocketService>(WebSocketService);
    service.setServer(mockServer as unknown as Server);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================================================
  // Server Management
  // ========================================================================

  describe('setServer / getServer', () => {
    it('should set and return the server instance', () => {
      const newServer = { emit: jest.fn() } as any;
      service.setServer(newServer);
      expect(service.getServer()).toBe(newServer);
    });
  });

  // ========================================================================
  // Client Management
  // ========================================================================

  describe('addClient', () => {
    it('should add a client with user data', () => {
      service.addClient(mockSocket as unknown as Socket, {
        userId,
        organizationId: orgId,
        role: 'admin',
      });

      const client = service.getClient(clientId);
      expect(client).toBeDefined();
      expect(client!.id).toBe(clientId);
      expect(client!.userId).toBe(userId);
      expect(client!.organizationId).toBe(orgId);
      expect(client!.role).toBe('admin');
      expect(client!.rooms).toBeInstanceOf(Set);
    });

    it('should increment connected clients count', () => {
      expect(service.getConnectedClientsCount()).toBe(0);

      service.addClient(mockSocket as unknown as Socket, { userId });

      expect(service.getConnectedClientsCount()).toBe(1);
    });
  });

  describe('removeClient', () => {
    it('should remove a connected client', () => {
      service.addClient(mockSocket as unknown as Socket, { userId });
      expect(service.getConnectedClientsCount()).toBe(1);

      service.removeClient(clientId);

      expect(service.getConnectedClientsCount()).toBe(0);
      expect(service.getClient(clientId)).toBeUndefined();
    });

    it('should handle removing a non-existent client gracefully', () => {
      expect(() => service.removeClient('nonexistent')).not.toThrow();
    });
  });

  describe('getClient', () => {
    it('should return undefined for non-existent client', () => {
      expect(service.getClient('nonexistent')).toBeUndefined();
    });
  });

  describe('getConnectedClientsCount', () => {
    it('should return correct count with multiple clients', () => {
      service.addClient({ id: 'c1' } as any, { userId: 'u1' });
      service.addClient({ id: 'c2' } as any, { userId: 'u2' });
      service.addClient({ id: 'c3' } as any, { userId: 'u3' });

      expect(service.getConnectedClientsCount()).toBe(3);

      service.removeClient('c2');
      expect(service.getConnectedClientsCount()).toBe(2);
    });
  });

  // ========================================================================
  // Room Management
  // ========================================================================

  describe('joinRoom', () => {
    it('should join a room and track it on the user', () => {
      service.addClient(mockSocket as unknown as Socket, { userId });

      service.joinRoom(mockSocket as unknown as Socket, 'org:org-1');

      expect(mockSocket.join).toHaveBeenCalledWith('org:org-1');
      const client = service.getClient(clientId);
      expect(client!.rooms.has('org:org-1')).toBe(true);
    });

    it('should handle joining when client not registered', () => {
      // Should not throw even if client is not tracked
      expect(() => service.joinRoom(mockSocket as unknown as Socket, 'some-room')).not.toThrow();
      expect(mockSocket.join).toHaveBeenCalledWith('some-room');
    });
  });

  describe('leaveRoom', () => {
    it('should leave a room and remove tracking', () => {
      service.addClient(mockSocket as unknown as Socket, { userId });
      service.joinRoom(mockSocket as unknown as Socket, 'org:org-1');

      service.leaveRoom(mockSocket as unknown as Socket, 'org:org-1');

      expect(mockSocket.leave).toHaveBeenCalledWith('org:org-1');
      const client = service.getClient(clientId);
      expect(client!.rooms.has('org:org-1')).toBe(false);
    });
  });

  // ========================================================================
  // Emit Events
  // ========================================================================

  describe('emitToAll', () => {
    it('should emit event to all connected clients', () => {
      service.emitToAll('test-event', { foo: 'bar' });

      expect(mockServer.emit).toHaveBeenCalledWith('test-event', { foo: 'bar' });
    });

    it('should not throw when server is not set', () => {
      service.setServer(undefined as any);
      expect(() => service.emitToAll('event', {})).not.toThrow();
    });
  });

  describe('emitToRoom', () => {
    it('should emit event to a specific room', () => {
      service.emitToRoom('room-1', 'event', { data: 123 });

      expect(mockServer.to).toHaveBeenCalledWith('room-1');
      expect(mockRoomEmit).toHaveBeenCalledWith('event', { data: 123 });
    });
  });

  describe('emitToClient', () => {
    it('should emit event to a specific client', () => {
      service.emitToClient('client-1', 'event', { msg: 'hello' });

      expect(mockServer.to).toHaveBeenCalledWith('client-1');
      expect(mockRoomEmit).toHaveBeenCalledWith('event', { msg: 'hello' });
    });
  });

  describe('emitToOrganization', () => {
    it('should emit to the organization room with org: prefix', () => {
      service.emitToOrganization(orgId, 'update', { status: 'ok' });

      expect(mockServer.to).toHaveBeenCalledWith(`org:${orgId}`);
      expect(mockRoomEmit).toHaveBeenCalledWith('update', { status: 'ok' });
    });
  });

  describe('emitToUser', () => {
    it('should emit to the user room with user: prefix', () => {
      service.emitToUser(userId, 'notification', { text: 'Hi' });

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockRoomEmit).toHaveBeenCalledWith('notification', { text: 'Hi' });
    });
  });

  // ========================================================================
  // Machine Events
  // ========================================================================

  describe('emitMachineStatusChange', () => {
    it('should emit machine:status to machine room and org room', () => {
      service.emitMachineStatusChange('machine-1', 'online', orgId);

      // First call: machine room, Second call: org room
      expect(mockServer.to).toHaveBeenCalledWith('machine:machine-1');
      expect(mockServer.to).toHaveBeenCalledWith(`org:${orgId}`);
      expect(mockRoomEmit).toHaveBeenCalledWith(
        'machine:status',
        expect.objectContaining({ machineId: 'machine-1', status: 'online' }),
      );
    });
  });

  describe('emitMachineInventoryUpdate', () => {
    it('should emit machine:inventory event', () => {
      service.emitMachineInventoryUpdate('machine-1', 'product-1', 5, orgId);

      expect(mockRoomEmit).toHaveBeenCalledWith(
        'machine:inventory',
        expect.objectContaining({ machineId: 'machine-1', productId: 'product-1', quantity: 5 }),
      );
    });
  });

  describe('emitMachineError', () => {
    it('should emit machine:error event', () => {
      service.emitMachineError('machine-1', 'Coin jam', orgId);

      expect(mockRoomEmit).toHaveBeenCalledWith(
        'machine:error',
        expect.objectContaining({ machineId: 'machine-1', error: 'Coin jam' }),
      );
    });
  });

  // ========================================================================
  // Order Events
  // ========================================================================

  describe('emitOrderCreated', () => {
    it('should emit order:created to user, org, and machine rooms', () => {
      const order = {
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: 'pending',
        totalAmount: 50000,
        machineId: 'machine-1',
        userId,
        organizationId: orgId,
      };

      service.emitOrderCreated(order);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockServer.to).toHaveBeenCalledWith(`org:${orgId}`);
      expect(mockServer.to).toHaveBeenCalledWith('machine:machine-1');
    });

    it('should handle order without userId', () => {
      const order = { id: 'order-1', machineId: 'machine-1', organizationId: orgId };

      expect(() => service.emitOrderCreated(order)).not.toThrow();
    });
  });

  describe('emitOrderStatusChange', () => {
    it('should emit order:status event', () => {
      const order = {
        id: 'order-1',
        orderNumber: 'ORD-001',
        status: 'completed',
        previousStatus: 'pending',
        userId,
        organizationId: orgId,
      };

      service.emitOrderStatusChange(order);

      expect(mockRoomEmit).toHaveBeenCalledWith(
        'order:status',
        expect.objectContaining({ orderId: 'order-1', status: 'completed' }),
      );
    });
  });

  describe('emitOrderDispensed', () => {
    it('should emit order:dispensed event with item index', () => {
      const order = {
        id: 'order-1',
        orderNumber: 'ORD-001',
        items: [{}, {}, {}],
        userId,
      };

      service.emitOrderDispensed(order, 1);

      expect(mockRoomEmit).toHaveBeenCalledWith(
        'order:dispensed',
        expect.objectContaining({ orderId: 'order-1', itemIndex: 1, totalItems: 3 }),
      );
    });
  });

  // ========================================================================
  // Notification Events
  // ========================================================================

  describe('emitNotification', () => {
    it('should emit notification to user', () => {
      const notification = {
        id: 'notif-1',
        type: 'alert',
        title: 'Test',
        message: 'Hello',
        data: {},
        createdAt: new Date(),
      };

      service.emitNotification(userId, notification);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockRoomEmit).toHaveBeenCalledWith('notification', expect.objectContaining({ id: 'notif-1' }));
    });
  });

  describe('emitBroadcastNotification', () => {
    it('should emit broadcast notification to organization', () => {
      service.emitBroadcastNotification(orgId, { title: 'Maintenance' });

      expect(mockServer.to).toHaveBeenCalledWith(`org:${orgId}`);
      expect(mockRoomEmit).toHaveBeenCalledWith('notification:broadcast', { title: 'Maintenance' });
    });
  });

  // ========================================================================
  // Loyalty Events
  // ========================================================================

  describe('emitPointsEarned', () => {
    it('should emit loyalty:points earned event', () => {
      service.emitPointsEarned(userId, 100, 'Purchase');

      expect(mockRoomEmit).toHaveBeenCalledWith(
        'loyalty:points',
        expect.objectContaining({ type: 'earned', points: 100, reason: 'Purchase' }),
      );
    });
  });

  describe('emitPointsRedeemed', () => {
    it('should emit loyalty:points redeemed event', () => {
      service.emitPointsRedeemed(userId, 50, 'Free Coffee');

      expect(mockRoomEmit).toHaveBeenCalledWith(
        'loyalty:points',
        expect.objectContaining({ type: 'redeemed', points: 50, rewardName: 'Free Coffee' }),
      );
    });
  });

  describe('emitTierUpgrade', () => {
    it('should emit loyalty:tier event', () => {
      service.emitTierUpgrade(userId, 'gold', ['Free delivery', '10% off']);

      expect(mockRoomEmit).toHaveBeenCalledWith(
        'loyalty:tier',
        expect.objectContaining({ type: 'upgrade', tier: 'gold', benefits: ['Free delivery', '10% off'] }),
      );
    });
  });

  // ========================================================================
  // Quest Events
  // ========================================================================

  describe('emitQuestProgress', () => {
    it('should emit quest:progress event with percentage', () => {
      service.emitQuestProgress(userId, 'quest-1', 3, 10);

      expect(mockRoomEmit).toHaveBeenCalledWith(
        'quest:progress',
        expect.objectContaining({ questId: 'quest-1', progress: 3, target: 10, percentage: 30 }),
      );
    });
  });

  describe('emitQuestCompleted', () => {
    it('should emit quest:completed event with reward', () => {
      service.emitQuestCompleted(userId, 'quest-1', 500);

      expect(mockRoomEmit).toHaveBeenCalledWith(
        'quest:completed',
        expect.objectContaining({ questId: 'quest-1', reward: 500 }),
      );
    });
  });
});
