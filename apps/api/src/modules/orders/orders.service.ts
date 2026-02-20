/**
 * Orders Service
 * Управление заказами клиентов
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
  OrderFilterDto,
  OrderDto,
  OrderListDto,
  OrderStatsDto,
  OrderItemDto,
} from './dto/order.dto';

// ============================================================================
// WORKFLOW TRANSITIONS
// ============================================================================

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
    private readonly promoCodesService: PromoCodesService,
  ) {}

  // ============================================================================
  // CREATE ORDER
  // ============================================================================

  /**
   * Создать заказ
   */
  async createOrder(
    userId: string,
    organizationId: string,
    dto: CreateOrderDto,
  ): Promise<OrderDto> {
    // Get products
    const productIds = dto.items.map(item => item.productId);
    const products = await this.productRepo.findByIds(productIds);

    if (products.length !== productIds.length) {
      throw new BadRequestException('Some products not found');
    }

    // Build product map
    const productMap = new Map(products.map(p => [p.id, p]));

    // Calculate order items
    let subtotal = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      const unitPrice = Number(product.sellingPrice) || 0;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productId: item.productId,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        customizations: item.customizations,
        notes: item.notes,
      });
    }

    // Validate and apply promo code
    let promoDiscount = 0;
    if (dto.promoCode) {
      const validation = await this.promoCodesService.validate(
        { code: dto.promoCode, clientUserId: userId, orderAmount: subtotal },
        organizationId,
      );
      if (validation.valid && validation.discountAmount) {
        promoDiscount = validation.discountAmount;
      } else {
        this.logger.debug(`Promo code "${dto.promoCode}" rejected: ${validation.reason}`);
      }
    }

    // Apply bonus points
    let bonusAmount = 0;
    if (dto.usePoints && dto.usePoints > 0) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user && user.pointsBalance >= dto.usePoints) {
        // 1 point = 1 sum (configurable)
        bonusAmount = Math.min(dto.usePoints, subtotal - promoDiscount);
      }
    }

    // Calculate total
    const discountAmount = promoDiscount;
    const totalAmount = subtotal - discountAmount - bonusAmount;

    // Generate order number
    const orderNumber = await this.generateOrderNumber(organizationId);

    // Create order
    const order = this.orderRepo.create({
      organizationId,
      orderNumber,
      userId,
      machineId: dto.machineId,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: dto.paymentMethod,
      subtotalAmount: subtotal,
      discountAmount,
      bonusAmount,
      totalAmount,
      promoCode: dto.promoCode,
      promoDiscount,
      pointsUsed: bonusAmount,
      notes: dto.notes,
      items: orderItems.map(item => this.itemRepo.create(item)),
    });

    await this.orderRepo.save(order);

    this.logger.log(`Order ${orderNumber} created for user ${userId}`);

    this.eventEmitter.emit('order.created', {
      orderId: order.id,
      orderNumber,
      userId,
      organizationId,
      totalAmount,
    });

    return this.mapToDto(order);
  }

  // ============================================================================
  // UPDATE ORDER STATUS
  // ============================================================================

  /**
   * Обновить статус заказа
   */
  async updateStatus(
    orderId: string,
    organizationId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderDto> {
    const order = await this.findOrder(orderId, organizationId);

    // Validate transition
    const allowedTransitions = STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${order.status} to ${dto.status}`,
      );
    }

    const oldStatus = order.status;
    order.status = dto.status;

    // Set timestamps
    switch (dto.status) {
      case OrderStatus.CONFIRMED:
        order.confirmedAt = new Date();
        break;
      case OrderStatus.PREPARING:
        order.preparedAt = new Date();
        break;
      case OrderStatus.COMPLETED:
        order.completedAt = new Date();
        break;
      case OrderStatus.CANCELLED:
        order.cancelledAt = new Date();
        order.cancellationReason = dto.reason || '';
        break;
      case OrderStatus.REFUNDED:
        order.refundedAt = new Date();
        break;
    }

    await this.orderRepo.save(order);

    this.eventEmitter.emit('order.status-changed', {
      orderId: order.id,
      oldStatus,
      newStatus: dto.status,
      organizationId,
    });

    // Calculate loyalty points on completion
    if (dto.status === OrderStatus.COMPLETED && order.paymentStatus === PaymentStatus.PAID) {
      this.eventEmitter.emit('order.completed', {
        orderId: order.id,
        userId: order.userId,
        totalAmount: order.totalAmount,
        organizationId,
      });
    }

    return this.mapToDto(order);
  }

  /**
   * Обновить статус оплаты
   */
  async updatePaymentStatus(
    orderId: string,
    organizationId: string,
    dto: UpdatePaymentStatusDto,
  ): Promise<OrderDto> {
    const order = await this.findOrder(orderId, organizationId);

    order.paymentStatus = dto.paymentStatus;
    if (dto.paymentMethod) {
      order.paymentMethod = dto.paymentMethod;
    }

    if (dto.paymentStatus === PaymentStatus.PAID) {
      order.paidAt = new Date();
    }

    await this.orderRepo.save(order);

    this.eventEmitter.emit('order.payment-updated', {
      orderId: order.id,
      paymentStatus: dto.paymentStatus,
      organizationId,
    });

    return this.mapToDto(order);
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Получить заказ
   */
  async getOrder(orderId: string, organizationId: string): Promise<OrderDto> {
    const order = await this.findOrder(orderId, organizationId);
    return this.mapToDto(order);
  }

  /**
   * Получить заказ по номеру
   */
  async getOrderByNumber(
    orderNumber: string,
    organizationId: string,
  ): Promise<OrderDto> {
    const order = await this.orderRepo.findOne({
      where: { orderNumber, organizationId },
      relations: ['items', 'items.product', 'user', 'machine'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapToDto(order);
  }

  /**
   * Получить список заказов
   */
  async getOrders(
    organizationId: string,
    filter: OrderFilterDto,
  ): Promise<OrderListDto> {
    const {
      status,
      paymentStatus,
      machineId,
      userId,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 20,
    } = filter;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('o.user', 'user')
      .leftJoinAndSelect('o.machine', 'machine')
      .where('o.organizationId = :organizationId', { organizationId });

    if (status) {
      qb.andWhere('o.status = :status', { status });
    }

    if (paymentStatus) {
      qb.andWhere('o.paymentStatus = :paymentStatus', { paymentStatus });
    }

    if (machineId) {
      qb.andWhere('o.machineId = :machineId', { machineId });
    }

    if (userId) {
      qb.andWhere('o.userId = :userId', { userId });
    }

    if (fromDate) {
      qb.andWhere('o.createdAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      qb.andWhere('o.createdAt <= :toDate', { toDate });
    }

    if (search) {
      qb.andWhere('o.orderNumber ILIKE :search', { search: `%${search}%` });
    }

    const [items, total] = await qb
      .orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(o => this.mapToDto(o)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получить заказы пользователя
   */
  async getUserOrders(
    userId: string,
    organizationId: string,
    filter: OrderFilterDto,
  ): Promise<OrderListDto> {
    return this.getOrders(organizationId, { ...filter, userId });
  }

  /**
   * Получить статистику заказов.
   * Optimized: uses SQL aggregation instead of loading all orders into memory.
   */
  async getStats(
    organizationId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<OrderStatsDto> {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.organizationId = :organizationId', { organizationId });

    if (fromDate) {
      qb.andWhere('o.createdAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      qb.andWhere('o.createdAt <= :toDate', { toDate });
    }

    // Status counts via SQL
    const statusCountsRaw = await qb.clone()
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.status')
      .getRawMany();

    // Revenue and payment method breakdown via SQL
    const revenueRaw = await qb.clone()
      .select('o.paymentMethod', 'paymentMethod')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(o.totalAmount), 0)', 'amount')
      .addSelect('COALESCE(SUM(o.pointsEarned), 0)', 'pointsEarned')
      .addSelect('COALESCE(SUM(o.pointsUsed), 0)', 'pointsUsed')
      .andWhere('o.paymentStatus = :paidStatus', { paidStatus: PaymentStatus.PAID })
      .groupBy('o.paymentMethod')
      .getRawMany();

    // Points aggregation (all orders, not just paid)
    const pointsRaw = await qb.clone()
      .select('COALESCE(SUM(o.pointsEarned), 0)', 'totalPointsEarned')
      .addSelect('COALESCE(SUM(o.pointsUsed), 0)', 'totalPointsUsed')
      .getRawOne();

    const stats: OrderStatsDto = {
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      totalPointsEarned: parseInt(pointsRaw?.totalPointsEarned || '0'),
      totalPointsUsed: parseInt(pointsRaw?.totalPointsUsed || '0'),
      byPaymentMethod: {} as any,
    };

    // Initialize payment method stats
    for (const method of Object.values(PaymentMethod)) {
      stats.byPaymentMethod[method] = { count: 0, amount: 0 };
    }

    // Process status counts
    const pendingStatuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY];
    for (const row of statusCountsRaw) {
      const count = parseInt(row.count);
      stats.totalOrders += count;
      if (pendingStatuses.includes(row.status)) {
        stats.pendingOrders += count;
      } else if (row.status === OrderStatus.COMPLETED) {
        stats.completedOrders = count;
      } else if (row.status === OrderStatus.CANCELLED) {
        stats.cancelledOrders = count;
      }
    }

    // Process revenue by payment method
    for (const row of revenueRaw) {
      const amount = parseFloat(row.amount);
      stats.totalRevenue += amount;
      if (row.paymentMethod && stats.byPaymentMethod[row.paymentMethod]) {
        stats.byPaymentMethod[row.paymentMethod].count = parseInt(row.count);
        stats.byPaymentMethod[row.paymentMethod].amount = amount;
      }
    }

    stats.averageOrderValue =
      stats.completedOrders > 0
        ? stats.totalRevenue / stats.completedOrders
        : 0;

    return stats;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async findOrder(orderId: string, organizationId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, organizationId },
      relations: ['items', 'items.product', 'user', 'machine'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  private async generateOrderNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.orderRepo.count({ where: { organizationId } });
    return `ORD-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private mapToDto(order: Order): OrderDto {
    return {
      id: order.id,
      organizationId: order.organizationId,
      orderNumber: order.orderNumber,
      userId: order.userId,
      userName: order.user
        ? `${order.user.firstName} ${order.user.lastName}`
        : undefined,
      machineId: order.machineId,
      machineName: order.machine?.name,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotalAmount: Number(order.subtotalAmount),
      discountAmount: Number(order.discountAmount),
      bonusAmount: Number(order.bonusAmount),
      totalAmount: Number(order.totalAmount),
      pointsEarned: order.pointsEarned,
      pointsUsed: order.pointsUsed,
      promoCode: order.promoCode,
      promoDiscount: Number(order.promoDiscount),
      items: (order.items || []).map(item => this.mapItemToDto(item)),
      notes: order.notes,
      cancellationReason: order.cancellationReason,
      confirmedAt: order.confirmedAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      paidAt: order.paidAt,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    };
  }

  private mapItemToDto(item: OrderItem): OrderItemDto {
    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      customizations: item.customizations,
      notes: item.notes,
    };
  }
}
