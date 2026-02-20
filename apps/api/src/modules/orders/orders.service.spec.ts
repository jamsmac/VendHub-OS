import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { OrdersService } from './orders.service';
import {
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from './entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { PromoCodesService } from '../promo-codes/promo-codes.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: jest.Mocked<Repository<Order>>;
  let itemRepo: jest.Mocked<Repository<OrderItem>>;
  let productRepo: jest.Mocked<Repository<Product>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let promoCodesService: jest.Mocked<PromoCodesService>;

  const orgId = 'org-uuid-1';

  // ---------------------------------------------------------------------------
  // MOCK DATA
  // ---------------------------------------------------------------------------

  const mockProduct1 = {
    id: 'product-uuid-1',
    name: 'Americano',
    sku: 'AMR-001',
    sellingPrice: 15000,
    organizationId: orgId,
  } as unknown as Product;

  const mockProduct2 = {
    id: 'product-uuid-2',
    name: 'Latte',
    sku: 'LTE-001',
    sellingPrice: 20000,
    organizationId: orgId,
  } as unknown as Product;

  const mockUser = {
    id: 'user-uuid-1',
    firstName: 'Test',
    lastName: 'User',
    pointsBalance: 5000,
  } as unknown as User;

  const mockOrderItem = {
    id: 'item-uuid-1',
    orderId: 'order-uuid-1',
    productId: 'product-uuid-1',
    productName: 'Americano',
    productSku: 'AMR-001',
    quantity: 2,
    unitPrice: 15000,
    totalPrice: 30000,
    customizations: null,
    notes: null,
  } as unknown as OrderItem;

  const mockOrder = {
    id: 'order-uuid-1',
    organizationId: orgId,
    orderNumber: 'ORD-2025-00001',
    userId: 'user-uuid-1',
    user: mockUser,
    machineId: 'machine-uuid-1',
    machine: { id: 'machine-uuid-1', name: 'Machine A' },
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.CASH,
    subtotalAmount: 30000,
    discountAmount: 0,
    bonusAmount: 0,
    totalAmount: 30000,
    pointsEarned: 0,
    pointsUsed: 0,
    promoCode: null,
    promoDiscount: 0,
    items: [mockOrderItem],
    notes: null,
    cancellationReason: null,
    confirmedAt: null,
    preparedAt: null,
    completedAt: null,
    cancelledAt: null,
    paidAt: null,
    refundedAt: null,
    metadata: null,
    created_at: new Date('2025-06-01T10:00:00Z'),
    updated_at: new Date('2025-06-01T10:00:00Z'),
  } as unknown as Order;

  // ---------------------------------------------------------------------------
  // QUERY BUILDER MOCK
  // ---------------------------------------------------------------------------

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    clone: jest.fn(),
    getMany: jest.fn().mockResolvedValue([mockOrder]),
    getCount: jest.fn().mockResolvedValue(1),
    getManyAndCount: jest.fn().mockResolvedValue([[mockOrder], 1]),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  // clone() returns a fresh copy of the builder so chained calls work
  mockQueryBuilder.clone.mockReturnValue(mockQueryBuilder);

  // ---------------------------------------------------------------------------
  // TEST MODULE SETUP
  // ---------------------------------------------------------------------------

  beforeEach(async () => {
    // Reset all mock functions before each test
    Object.values(mockQueryBuilder).forEach((fn) => {
      if (jest.isMockFunction(fn)) {
        fn.mockClear();
      }
    });
    // Re-establish returnThis chains after clear
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.skip.mockReturnThis();
    mockQueryBuilder.take.mockReturnThis();
    mockQueryBuilder.select.mockReturnThis();
    mockQueryBuilder.addSelect.mockReturnThis();
    mockQueryBuilder.leftJoinAndSelect.mockReturnThis();
    mockQueryBuilder.groupBy.mockReturnThis();
    mockQueryBuilder.clone.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockOrder], 1]);
    mockQueryBuilder.getRawMany.mockResolvedValue([]);
    mockQueryBuilder.getRawOne.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findByIds: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findByIds: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: PromoCodesService,
          useValue: {
            validate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepo = module.get(getRepositoryToken(Order));
    itemRepo = module.get(getRepositoryToken(OrderItem));
    productRepo = module.get(getRepositoryToken(Product));
    userRepo = module.get(getRepositoryToken(User));
    eventEmitter = module.get(EventEmitter2);
    promoCodesService = module.get(PromoCodesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // CREATE ORDER
  // ==========================================================================

  describe('createOrder', () => {
    const createDto = {
      machineId: 'machine-uuid-1',
      items: [
        { productId: 'product-uuid-1', quantity: 2 },
      ],
      paymentMethod: PaymentMethod.CASH,
    };

    it('should create an order with items and calculate totals', async () => {
      productRepo.findByIds.mockResolvedValue([mockProduct1]);
      orderRepo.count.mockResolvedValue(0);
      itemRepo.create.mockImplementation((data) => data as any);
      orderRepo.create.mockImplementation((data) => ({
        id: 'order-uuid-new',
        ...data,
      }) as any);
      orderRepo.save.mockImplementation((order) => Promise.resolve(order as any));

      const result = await service.createOrder('user-uuid-1', orgId, createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('order-uuid-new');
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(result.subtotalAmount).toBe(30000); // 15000 * 2
      expect(result.totalAmount).toBe(30000);
      expect(orderRepo.create).toHaveBeenCalled();
      expect(orderRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'order.created',
        expect.objectContaining({
          userId: 'user-uuid-1',
          organizationId: orgId,
          totalAmount: 30000,
        }),
      );
    });

    it('should create an order with multiple items from different products', async () => {
      productRepo.findByIds.mockResolvedValue([mockProduct1, mockProduct2]);
      orderRepo.count.mockResolvedValue(5);
      itemRepo.create.mockImplementation((data) => data as any);
      orderRepo.create.mockImplementation((data) => ({
        id: 'order-uuid-multi',
        ...data,
      }) as any);
      orderRepo.save.mockImplementation((order) => Promise.resolve(order as any));

      const multiItemDto = {
        machineId: 'machine-uuid-1',
        items: [
          { productId: 'product-uuid-1', quantity: 1 }, // 15000
          { productId: 'product-uuid-2', quantity: 3 }, // 60000
        ],
        paymentMethod: PaymentMethod.PAYME,
      };

      const result = await service.createOrder('user-uuid-1', orgId, multiItemDto);

      expect(result.subtotalAmount).toBe(75000); // 15000 + 60000
      expect(result.totalAmount).toBe(75000);
      expect(result.orderNumber).toBe('ORD-2025-00006'); // count(5) + 1
    });

    it('should throw BadRequestException when some products not found', async () => {
      // Return only 1 product when 2 are requested
      productRepo.findByIds.mockResolvedValue([mockProduct1]);

      const dto = {
        items: [
          { productId: 'product-uuid-1', quantity: 1 },
          { productId: 'non-existent-product', quantity: 1 },
        ],
      };

      await expect(
        service.createOrder('user-uuid-1', orgId, dto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should apply valid promo code discount', async () => {
      productRepo.findByIds.mockResolvedValue([mockProduct1]);
      orderRepo.count.mockResolvedValue(0);
      promoCodesService.validate.mockResolvedValue({
        valid: true,
        discountAmount: 5000,
      } as any);
      itemRepo.create.mockImplementation((data) => data as any);
      orderRepo.create.mockImplementation((data) => ({
        id: 'order-uuid-promo',
        ...data,
      }) as any);
      orderRepo.save.mockImplementation((order) => Promise.resolve(order as any));

      const promoDto = {
        ...createDto,
        promoCode: 'SUMMER20',
      };

      const result = await service.createOrder('user-uuid-1', orgId, promoDto);

      expect(promoCodesService.validate).toHaveBeenCalledWith(
        { code: 'SUMMER20', clientUserId: 'user-uuid-1', orderAmount: 30000 },
        orgId,
      );
      expect(result.discountAmount).toBe(5000);
      expect(result.totalAmount).toBe(25000); // 30000 - 5000
    });

    it('should ignore rejected promo code and proceed without discount', async () => {
      productRepo.findByIds.mockResolvedValue([mockProduct1]);
      orderRepo.count.mockResolvedValue(0);
      promoCodesService.validate.mockResolvedValue({
        valid: false,
        reason: 'Expired',
      } as any);
      itemRepo.create.mockImplementation((data) => data as any);
      orderRepo.create.mockImplementation((data) => ({
        id: 'order-uuid-nopromo',
        ...data,
      }) as any);
      orderRepo.save.mockImplementation((order) => Promise.resolve(order as any));

      const promoDto = {
        ...createDto,
        promoCode: 'EXPIRED_CODE',
      };

      const result = await service.createOrder('user-uuid-1', orgId, promoDto);

      expect(result.discountAmount).toBe(0);
      expect(result.totalAmount).toBe(30000);
    });

    it('should apply bonus points when user has sufficient balance', async () => {
      productRepo.findByIds.mockResolvedValue([mockProduct1]);
      orderRepo.count.mockResolvedValue(0);
      userRepo.findOne.mockResolvedValue(mockUser); // pointsBalance = 5000
      itemRepo.create.mockImplementation((data) => data as any);
      orderRepo.create.mockImplementation((data) => ({
        id: 'order-uuid-bonus',
        ...data,
      }) as any);
      orderRepo.save.mockImplementation((order) => Promise.resolve(order as any));

      const bonusDto = {
        ...createDto,
        usePoints: 3000,
      };

      const result = await service.createOrder('user-uuid-1', orgId, bonusDto);

      expect(result.bonusAmount).toBe(3000);
      expect(result.totalAmount).toBe(27000); // 30000 - 3000
    });

    it('should generate correct order number based on existing count', async () => {
      productRepo.findByIds.mockResolvedValue([mockProduct1]);
      orderRepo.count.mockResolvedValue(42);
      itemRepo.create.mockImplementation((data) => data as any);
      orderRepo.create.mockImplementation((data) => ({
        id: 'order-uuid-num',
        ...data,
      }) as any);
      orderRepo.save.mockImplementation((order) => Promise.resolve(order as any));

      const result = await service.createOrder('user-uuid-1', orgId, createDto);

      const year = new Date().getFullYear();
      expect(result.orderNumber).toBe(`ORD-${year}-00043`);
    });
  });

  // ==========================================================================
  // UPDATE STATUS
  // ==========================================================================

  describe('updateStatus', () => {
    it('should transition from PENDING to CONFIRMED', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING } as any;
      orderRepo.findOne.mockResolvedValue(pendingOrder);
      orderRepo.save.mockImplementation((order) => Promise.resolve(order as any));

      const result = await service.updateStatus('order-uuid-1', orgId, {
        status: OrderStatus.CONFIRMED,
      });

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'order.status-changed',
        expect.objectContaining({
          oldStatus: OrderStatus.PENDING,
          newStatus: OrderStatus.CONFIRMED,
        }),
      );
    });

    it('should transition from CONFIRMED to PREPARING', async () => {
      const confirmedOrder = { ...mockOrder, status: OrderStatus.CONFIRMED } as any;
      orderRepo.findOne.mockResolvedValue(confirmedOrder);
      orderRepo.save.mockImplementation((order) => Promise.resolve(order as any));

      const result = await service.updateStatus('order-uuid-1', orgId, {
        status: OrderStatus.PREPARING,
      });

      expect(result.status).toBe(OrderStatus.PREPARING);
    });

    it('should transition from PREPARING to READY', async () => {
      const preparingOrder = { ...mockOrder, status: OrderStatus.PREPARING } as any;
      orderRepo.findOne.mockResolvedValue(preparingOrder);
      orderRepo.save.mockImplementation((order) => Promise.resolve(order as any));

      const result = await service.updateStatus('order-uuid-1', orgId, {
        status: OrderStatus.READY,
      });

      expect(result.status).toBe(OrderStatus.READY);
    });

    it('should transition from READY to COMPLETED and emit order.completed for paid orders', async () => {
      const readyOrder = {
        ...mockOrder,
        status: OrderStatus.READY,
        paymentStatus: PaymentStatus.PAID,
      } as any;
      orderRepo.findOne.mockResolvedValue(readyOrder);
      orderRepo.save.mockImplementation((order) => Promise.resolve(order as any));

      const result = await service.updateStatus('order-uuid-1', orgId, {
        status: OrderStatus.COMPLETED,
      });

      expect(result.status).toBe(OrderStatus.COMPLETED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'order.completed',
        expect.objectContaining({
          orderId: 'order-uuid-1',
          userId: 'user-uuid-1',
          organizationId: orgId,
        }),
      );
    });

    it('should transition from PENDING to CANCELLED with reason', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING } as any;
      orderRepo.findOne.mockResolvedValue(pendingOrder);
      orderRepo.save.mockImplementation((order) => Promise.resolve(order as any));

      const result = await service.updateStatus('order-uuid-1', orgId, {
        status: OrderStatus.CANCELLED,
        reason: 'Customer changed mind',
      });

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.cancellationReason).toBe('Customer changed mind');
    });

    it('should throw BadRequestException on invalid transition (PENDING -> COMPLETED)', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING } as any;
      orderRepo.findOne.mockResolvedValue(pendingOrder);

      await expect(
        service.updateStatus('order-uuid-1', orgId, {
          status: OrderStatus.COMPLETED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on invalid transition (CANCELLED -> PENDING)', async () => {
      const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED } as any;
      orderRepo.findOne.mockResolvedValue(cancelledOrder);

      await expect(
        service.updateStatus('order-uuid-1', orgId, {
          status: OrderStatus.PENDING,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus('non-existent', orgId, {
          status: OrderStatus.CONFIRMED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // UPDATE PAYMENT STATUS
  // ==========================================================================

  describe('updatePaymentStatus', () => {
    it('should update payment status to PAID and set paidAt timestamp', async () => {
      const order = { ...mockOrder } as any;
      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.save.mockImplementation((o) => Promise.resolve(o as any));

      const result = await service.updatePaymentStatus('order-uuid-1', orgId, {
        paymentStatus: PaymentStatus.PAID,
      });

      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(result.paidAt).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'order.payment-updated',
        expect.objectContaining({
          orderId: 'order-uuid-1',
          paymentStatus: PaymentStatus.PAID,
          organizationId: orgId,
        }),
      );
    });

    it('should update payment status to FAILED without setting paidAt', async () => {
      const order = { ...mockOrder } as any;
      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.save.mockImplementation((o) => Promise.resolve(o as any));

      const result = await service.updatePaymentStatus('order-uuid-1', orgId, {
        paymentStatus: PaymentStatus.FAILED,
      });

      expect(result.paymentStatus).toBe(PaymentStatus.FAILED);
      // paidAt should not be set for FAILED
      expect(order.paidAt).toBeNull();
    });

    it('should also update paymentMethod when provided', async () => {
      const order = { ...mockOrder, paymentMethod: PaymentMethod.CASH } as any;
      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.save.mockImplementation((o) => Promise.resolve(o as any));

      const result = await service.updatePaymentStatus('order-uuid-1', orgId, {
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.PAYME,
      });

      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(result.paymentMethod).toBe(PaymentMethod.PAYME);
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updatePaymentStatus('non-existent', orgId, {
          paymentStatus: PaymentStatus.PAID,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // GET ORDER
  // ==========================================================================

  describe('getOrder', () => {
    it('should return order DTO when found', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder);

      const result = await service.getOrder('order-uuid-1', orgId);

      expect(result).toBeDefined();
      expect(result.id).toBe('order-uuid-1');
      expect(result.orderNumber).toBe('ORD-2025-00001');
      expect(result.userName).toBe('Test User');
      expect(result.items).toHaveLength(1);
      expect(orderRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'order-uuid-1', organizationId: orgId },
        relations: ['items', 'items.product', 'user', 'machine'],
      });
    });

    it('should throw NotFoundException when order does not exist', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getOrder('non-existent', orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // GET ORDER BY NUMBER
  // ==========================================================================

  describe('getOrderByNumber', () => {
    it('should return order DTO when found by order number', async () => {
      orderRepo.findOne.mockResolvedValue(mockOrder);

      const result = await service.getOrderByNumber('ORD-2025-00001', orgId);

      expect(result).toBeDefined();
      expect(result.orderNumber).toBe('ORD-2025-00001');
      expect(orderRepo.findOne).toHaveBeenCalledWith({
        where: { orderNumber: 'ORD-2025-00001', organizationId: orgId },
        relations: ['items', 'items.product', 'user', 'machine'],
      });
    });

    it('should throw NotFoundException when order number does not exist', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getOrderByNumber('ORD-9999-99999', orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // GET ORDERS (PAGINATED)
  // ==========================================================================

  describe('getOrders', () => {
    it('should return paginated order list', async () => {
      const result = await service.getOrders(orgId, { page: 1, limit: 20 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 20);
      expect(result).toHaveProperty('totalPages', 1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'o.organizationId = :organizationId',
        { organizationId: orgId },
      );
    });

    it('should filter by status', async () => {
      await service.getOrders(orgId, {
        status: OrderStatus.PENDING,
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'o.status = :status',
        { status: OrderStatus.PENDING },
      );
    });

    it('should filter by date range', async () => {
      await service.getOrders(orgId, {
        fromDate: '2025-06-01',
        toDate: '2025-06-30',
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'o.createdAt >= :fromDate',
        { fromDate: '2025-06-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'o.createdAt <= :toDate',
        { toDate: '2025-06-30' },
      );
    });

    it('should filter by search (order number ILIKE)', async () => {
      await service.getOrders(orgId, {
        search: 'ORD-2025',
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'o.orderNumber ILIKE :search',
        { search: '%ORD-2025%' },
      );
    });

    it('should calculate totalPages correctly', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockOrder], 45]);

      const result = await service.getOrders(orgId, { page: 1, limit: 20 });

      expect(result.totalPages).toBe(3); // ceil(45 / 20)
    });
  });

  // ==========================================================================
  // GET USER ORDERS
  // ==========================================================================

  describe('getUserOrders', () => {
    it('should delegate to getOrders with userId filter', async () => {
      const result = await service.getUserOrders('user-uuid-1', orgId, {
        page: 1,
        limit: 10,
      });

      expect(result).toHaveProperty('items');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'o.userId = :userId',
        { userId: 'user-uuid-1' },
      );
    });
  });

  // ==========================================================================
  // GET STATS
  // ==========================================================================

  describe('getStats', () => {
    it('should return aggregated order statistics', async () => {
      mockQueryBuilder.getRawMany
        // First call: status counts
        .mockResolvedValueOnce([
          { status: OrderStatus.PENDING, count: '5' },
          { status: OrderStatus.COMPLETED, count: '20' },
          { status: OrderStatus.CANCELLED, count: '3' },
        ])
        // Second call: revenue by payment method
        .mockResolvedValueOnce([
          { paymentMethod: PaymentMethod.CASH, count: '10', amount: '150000', pointsEarned: '1500', pointsUsed: '500' },
          { paymentMethod: PaymentMethod.PAYME, count: '10', amount: '200000', pointsEarned: '2000', pointsUsed: '300' },
        ]);

      mockQueryBuilder.getRawOne.mockResolvedValue({
        totalPointsEarned: '3500',
        totalPointsUsed: '800',
      });

      const result = await service.getStats(orgId);

      expect(result.totalOrders).toBe(28); // 5 + 20 + 3
      expect(result.pendingOrders).toBe(5);
      expect(result.completedOrders).toBe(20);
      expect(result.cancelledOrders).toBe(3);
      expect(result.totalRevenue).toBe(350000); // 150000 + 200000
      expect(result.averageOrderValue).toBe(17500); // 350000 / 20
      expect(result.totalPointsEarned).toBe(3500);
      expect(result.totalPointsUsed).toBe(800);
    });

    it('should return zeros when no orders exist', async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([])  // no status counts
        .mockResolvedValueOnce([]); // no revenue data

      mockQueryBuilder.getRawOne.mockResolvedValue({
        totalPointsEarned: '0',
        totalPointsUsed: '0',
      });

      const result = await service.getStats(orgId);

      expect(result.totalOrders).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.averageOrderValue).toBe(0);
      expect(result.completedOrders).toBe(0);
    });

    it('should filter by date range when provided', async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockQueryBuilder.getRawOne.mockResolvedValue(null);

      const from = new Date('2025-06-01');
      const to = new Date('2025-06-30');

      await service.getStats(orgId, from, to);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'o.createdAt >= :fromDate',
        { fromDate: from },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'o.createdAt <= :toDate',
        { toDate: to },
      );
    });
  });
});
