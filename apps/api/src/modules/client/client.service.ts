/**
 * Client B2C Service
 * Business logic for customer-facing operations: registration, wallet, orders, loyalty
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';

import { ClientUser } from './entities/client-user.entity';
import { ClientWallet } from './entities/client-wallet.entity';
import { ClientWalletLedger, WalletTransactionType } from './entities/client-wallet-ledger.entity';
import { ClientLoyaltyAccount } from './entities/client-loyalty-account.entity';
import { ClientLoyaltyLedger, LoyaltyTransactionReason } from './entities/client-loyalty-ledger.entity';
import { ClientOrder, ClientOrderStatus } from './entities/client-order.entity';
import { ClientPayment, ClientPaymentStatus } from './entities/client-payment.entity';
import { Product } from '../products/entities/product.entity';

import { CreateClientUserDto, UpdateClientUserDto } from './dto/create-client-user.dto';
import { TopUpWalletDto, WalletAdjustmentDto } from './dto/wallet.dto';
import { CreateClientOrderDto } from './dto/client-order.dto';
import { QueryClientsDto, QueryOrdersDto } from './dto/query-clients.dto';

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

  constructor(
    @InjectRepository(ClientUser)
    private readonly clientUserRepo: Repository<ClientUser>,

    @InjectRepository(ClientWallet)
    private readonly walletRepo: Repository<ClientWallet>,

    @InjectRepository(ClientWalletLedger)
    private readonly walletLedgerRepo: Repository<ClientWalletLedger>,

    @InjectRepository(ClientLoyaltyAccount)
    private readonly loyaltyAccountRepo: Repository<ClientLoyaltyAccount>,

    @InjectRepository(ClientLoyaltyLedger)
    private readonly loyaltyLedgerRepo: Repository<ClientLoyaltyLedger>,

    @InjectRepository(ClientOrder)
    private readonly orderRepo: Repository<ClientOrder>,

    @InjectRepository(ClientPayment)
    private readonly paymentRepo: Repository<ClientPayment>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    private readonly dataSource: DataSource,
  ) {}

  // ============================================
  // CLIENT USER MANAGEMENT
  // ============================================

  /**
   * Register a new client. Auto-creates wallet and loyalty account.
   * Uses a transaction to ensure atomicity.
   */
  async createClient(dto: CreateClientUserDto): Promise<ClientUser> {
    // Check for duplicates
    if (dto.telegramId) {
      const existing = await this.clientUserRepo.findOne({
        where: { telegram_id: dto.telegramId },
      });
      if (existing) {
        throw new ConflictException('Client with this Telegram ID already exists');
      }
    }

    if (dto.phone) {
      const existing = await this.clientUserRepo.findOne({
        where: { phone: dto.phone },
      });
      if (existing) {
        throw new ConflictException('Client with this phone number already exists');
      }
    }

    if (dto.email) {
      const existing = await this.clientUserRepo.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Client with this email already exists');
      }
    }

    return this.dataSource.transaction(async (manager) => {
      // Create client user
      const clientUser = manager.create(ClientUser, {
        telegram_id: dto.telegramId || null,
        phone: dto.phone || null,
        email: dto.email || null,
        first_name: dto.firstName || null,
        last_name: dto.lastName || null,
        username: dto.username || null,
        language: dto.language || 'ru',
        organization_id: null,
      });
      const savedUser = await manager.save(ClientUser, clientUser);

      // Auto-create wallet
      const wallet = manager.create(ClientWallet, {
        client_user_id: savedUser.id,
        organization_id: null,
        balance: 0,
        currency: 'UZS',
        is_active: true,
      });
      await manager.save(ClientWallet, wallet);

      // Auto-create loyalty account
      const loyaltyAccount = manager.create(ClientLoyaltyAccount, {
        client_user_id: savedUser.id,
        organization_id: null,
        points_balance: 0,
        total_earned: 0,
        total_redeemed: 0,
        tier: 'bronze',
      });
      await manager.save(ClientLoyaltyAccount, loyaltyAccount);

      this.logger.log(`New client registered: ${savedUser.id} (${dto.telegramId || dto.phone || dto.email})`);

      return savedUser;
    });
  }

  /**
   * Find a client by their internal UUID
   */
  async findClientById(id: string): Promise<ClientUser> {
    const client = await this.clientUserRepo.findOne({
      where: { id },
      relations: ['wallet', 'loyalty_account'],
    });
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
    return client;
  }

  /**
   * Find a client by their Telegram ID
   */
  async findClientByTelegramId(telegramId: string): Promise<ClientUser> {
    const client = await this.clientUserRepo.findOne({
      where: { telegram_id: telegramId },
      relations: ['wallet', 'loyalty_account'],
    });
    if (!client) {
      throw new NotFoundException(`Client with Telegram ID ${telegramId} not found`);
    }
    return client;
  }

  /**
   * Update client profile fields
   */
  async updateClient(id: string, dto: UpdateClientUserDto): Promise<ClientUser> {
    const client = await this.findClientById(id);

    // Check unique constraints if changing identifiers
    if (dto.telegramId && dto.telegramId !== client.telegram_id) {
      const existing = await this.clientUserRepo.findOne({
        where: { telegram_id: dto.telegramId },
      });
      if (existing) {
        throw new ConflictException('Client with this Telegram ID already exists');
      }
    }

    if (dto.phone && dto.phone !== client.phone) {
      const existing = await this.clientUserRepo.findOne({
        where: { phone: dto.phone },
      });
      if (existing) {
        throw new ConflictException('Client with this phone number already exists');
      }
    }

    if (dto.email && dto.email !== client.email) {
      const existing = await this.clientUserRepo.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Client with this email already exists');
      }
    }

    // Map DTO fields to entity columns
    if (dto.telegramId !== undefined) client.telegram_id = dto.telegramId;
    if (dto.phone !== undefined) client.phone = dto.phone;
    if (dto.email !== undefined) client.email = dto.email;
    if (dto.firstName !== undefined) client.first_name = dto.firstName;
    if (dto.lastName !== undefined) client.last_name = dto.lastName;
    if (dto.username !== undefined) client.username = dto.username;
    if (dto.language !== undefined) client.language = dto.language;

    return this.clientUserRepo.save(client);
  }

  /**
   * Paginated list of clients with search and filters
   */
  async getClients(
    query: QueryClientsDto,
    organizationId?: string,
  ): Promise<{ data: ClientUser[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.clientUserRepo.createQueryBuilder('client');

    if (organizationId) {
      qb.andWhere('client.organization_id = :organizationId', { organizationId });
    }

    if (query.search) {
      qb.andWhere(
        '(client.first_name ILIKE :search OR client.last_name ILIKE :search OR client.phone ILIKE :search OR client.email ILIKE :search OR client.telegram_id ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.isVerified !== undefined) {
      qb.andWhere('client.is_verified = :isVerified', {
        isVerified: query.isVerified === 'true',
      });
    }

    if (query.isBlocked !== undefined) {
      qb.andWhere('client.is_blocked = :isBlocked', {
        isBlocked: query.isBlocked === 'true',
      });
    }

    qb.orderBy('client.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  // ============================================
  // WALLET OPERATIONS
  // ============================================

  /**
   * Get wallet for a client
   */
  async getWallet(clientUserId: string): Promise<ClientWallet> {
    const wallet = await this.walletRepo.findOne({
      where: { client_user_id: clientUserId },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet not found for client ${clientUserId}`);
    }
    return wallet;
  }

  /**
   * Top up a client wallet (admin action)
   */
  async topUpWallet(clientUserId: string, dto: TopUpWalletDto): Promise<ClientWalletLedger> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(ClientWallet, {
        where: { client_user_id: clientUserId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException(`Wallet not found for client ${clientUserId}`);
      }

      if (!wallet.is_active) {
        throw new BadRequestException('Wallet is deactivated');
      }

      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore + dto.amount;

      // Update wallet balance
      wallet.balance = balanceAfter;
      await manager.save(ClientWallet, wallet);

      // Create ledger entry
      const ledgerEntry = manager.create(ClientWalletLedger, {
        wallet_id: wallet.id,
        organization_id: wallet.organization_id,
        transaction_type: WalletTransactionType.TOP_UP,
        amount: dto.amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: dto.description || 'Wallet top-up',
      });
      const savedEntry = await manager.save(ClientWalletLedger, ledgerEntry);

      this.logger.log(`Wallet top-up: client=${clientUserId}, amount=${dto.amount}, newBalance=${balanceAfter}`);

      return savedEntry;
    });
  }

  /**
   * Manual wallet adjustment (admin action, can be positive or negative)
   */
  async adjustWallet(
    clientUserId: string,
    dto: WalletAdjustmentDto,
    userId: string,
  ): Promise<ClientWalletLedger> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(ClientWallet, {
        where: { client_user_id: clientUserId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException(`Wallet not found for client ${clientUserId}`);
      }

      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore + dto.amount;

      if (balanceAfter < 0) {
        throw new BadRequestException(
          `Insufficient balance. Current: ${balanceBefore}, adjustment: ${dto.amount}`,
        );
      }

      wallet.balance = balanceAfter;
      await manager.save(ClientWallet, wallet);

      const ledgerEntry = manager.create(ClientWalletLedger, {
        wallet_id: wallet.id,
        organization_id: wallet.organization_id,
        transaction_type: WalletTransactionType.MANUAL_ADJUSTMENT,
        amount: dto.amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: dto.description || dto.reason,
        created_by_id: userId,
      });
      const savedEntry = await manager.save(ClientWalletLedger, ledgerEntry);

      this.logger.log(
        `Wallet adjustment: client=${clientUserId}, amount=${dto.amount}, reason=${dto.reason}, by=${userId}`,
      );

      return savedEntry;
    });
  }

  /**
   * Get paginated wallet ledger for a client
   */
  async getWalletLedger(
    clientUserId: string,
    query: { page?: number; limit?: number },
  ): Promise<{ data: ClientWalletLedger[]; total: number; page: number; limit: number }> {
    const wallet = await this.getWallet(clientUserId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.walletLedgerRepo.findAndCount({
      where: { wallet_id: wallet.id },
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  // ============================================
  // ORDER MANAGEMENT
  // ============================================

  /**
   * Create a new order for a client.
   * Calculates totals from items. Does NOT process payment yet.
   */
  async createOrder(clientUserId: string, dto: CreateClientOrderDto): Promise<ClientOrder> {
    const client = await this.findClientById(clientUserId);

    // Fetch product details for pricing
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.productRepo.findByIds(productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));

    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      const unitPrice = product ? Number(product.sellingPrice) : 0;
      const totalPrice = unitPrice * item.quantity;

      if (!product) {
        this.logger.warn(`Product ${item.productId} not found, using price 0`);
      }

      return {
        product_id: item.productId,
        product_name: product?.name || `Unknown (${item.productId.substring(0, 8)})`,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.total_price, 0);
    const discountAmount = 0; // Promo code logic would go here
    const loyaltyPointsUsed = dto.useLoyaltyPoints || 0;
    const totalAmount = Math.max(0, subtotal - discountAmount);

    const order = this.orderRepo.create({
      organization_id: client.organization_id,
      client_user_id: clientUserId,
      machine_id: dto.machineId || null,
      status: ClientOrderStatus.PENDING,
      items: orderItems,
      subtotal,
      discount_amount: discountAmount,
      loyalty_points_used: loyaltyPointsUsed,
      total_amount: totalAmount,
      currency: 'UZS',
    });

    const savedOrder = await this.orderRepo.save(order);

    this.logger.log(`Order created: ${savedOrder.order_number} for client ${clientUserId}`);

    // Attempt to process payment immediately
    await this.processPayment(savedOrder.id, dto.paymentProvider);

    const updatedOrder = await this.orderRepo.findOne({
      where: { id: savedOrder.id },
      relations: ['payments'],
    });
    if (!updatedOrder) {
      throw new NotFoundException(`Order ${savedOrder.id} not found after creation`);
    }
    return updatedOrder;
  }

  /**
   * Create a payment record for an order
   */
  async processPayment(orderId: string, provider: string): Promise<ClientPayment> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status !== ClientOrderStatus.PENDING) {
      throw new BadRequestException(`Order ${order.order_number} is not in PENDING status`);
    }

    const payment = this.paymentRepo.create({
      organization_id: order.organization_id,
      order_id: orderId,
      client_user_id: order.client_user_id,
      provider,
      amount: order.total_amount,
      currency: order.currency,
      status: ClientPaymentStatus.PENDING,
    });

    const savedPayment = await this.paymentRepo.save(payment);

    this.logger.log(
      `Payment created: ${savedPayment.id} for order ${order.order_number}, provider=${provider}`,
    );

    // For wallet payments, process immediately
    if (provider === 'wallet') {
      return this.processWalletPayment(savedPayment, order);
    }

    // For external providers, payment will be confirmed via webhook
    return savedPayment;
  }

  /**
   * Process a payment using the client wallet balance
   */
  private async processWalletPayment(
    payment: ClientPayment,
    order: ClientOrder,
  ): Promise<ClientPayment> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(ClientWallet, {
        where: { client_user_id: order.client_user_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet || !wallet.is_active) {
        payment.status = ClientPaymentStatus.FAILED;
        payment.error_message = 'Wallet not found or inactive';
        return manager.save(ClientPayment, payment);
      }

      const balanceBefore = Number(wallet.balance);
      const amount = Number(order.total_amount);

      if (balanceBefore < amount) {
        payment.status = ClientPaymentStatus.FAILED;
        payment.error_message = `Insufficient wallet balance. Required: ${amount}, available: ${balanceBefore}`;
        return manager.save(ClientPayment, payment);
      }

      // Deduct from wallet
      const balanceAfter = balanceBefore - amount;
      wallet.balance = balanceAfter;
      await manager.save(ClientWallet, wallet);

      // Create wallet ledger entry
      const ledgerEntry = manager.create(ClientWalletLedger, {
        wallet_id: wallet.id,
        organization_id: wallet.organization_id,
        transaction_type: WalletTransactionType.PURCHASE,
        amount: -amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: `Payment for order ${order.order_number}`,
        reference_id: order.id,
        reference_type: 'order',
      });
      await manager.save(ClientWalletLedger, ledgerEntry);

      // Mark payment as success
      payment.status = ClientPaymentStatus.SUCCESS;
      payment.paid_at = new Date();
      const savedPayment = await manager.save(ClientPayment, payment);

      // Mark order as paid
      order.status = ClientOrderStatus.PAID;
      order.paid_at = new Date();
      await manager.save(ClientOrder, order);

      this.logger.log(
        `Wallet payment successful: order=${order.order_number}, amount=${amount}`,
      );

      return savedPayment;
    });
  }

  /**
   * Mark an order as completed and award loyalty points
   */
  async completeOrder(orderId: string): Promise<ClientOrder> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status !== ClientOrderStatus.PAID && order.status !== ClientOrderStatus.DISPENSING) {
      throw new BadRequestException(
        `Order ${order.order_number} cannot be completed from status ${order.status}`,
      );
    }

    order.status = ClientOrderStatus.COMPLETED;
    order.completed_at = new Date();
    const savedOrder = await this.orderRepo.save(order);

    // Award loyalty points (1 point per 1000 UZS)
    const pointsToAward = Math.floor(Number(order.total_amount) / 1000);
    if (pointsToAward > 0) {
      await this.earnLoyaltyPoints(
        order.client_user_id,
        pointsToAward,
        LoyaltyTransactionReason.ORDER_EARNED,
        order.id,
      );
    }

    this.logger.log(`Order completed: ${order.order_number}, points awarded: ${pointsToAward}`);

    return savedOrder;
  }

  /**
   * Cancel an order. If paid, attempt refund to wallet.
   */
  async cancelOrder(orderId: string, reason: string): Promise<ClientOrder> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(ClientOrder, { where: { id: orderId } });
      if (!order) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }

      if (
        order.status === ClientOrderStatus.COMPLETED ||
        order.status === ClientOrderStatus.CANCELLED ||
        order.status === ClientOrderStatus.REFUNDED
      ) {
        throw new BadRequestException(
          `Order ${order.order_number} cannot be cancelled from status ${order.status}`,
        );
      }

      const wasPaid = order.status === ClientOrderStatus.PAID ||
                      order.status === ClientOrderStatus.DISPENSING;

      order.status = wasPaid ? ClientOrderStatus.REFUNDED : ClientOrderStatus.CANCELLED;
      order.cancelled_at = new Date();
      order.cancellation_reason = reason;
      const savedOrder = await manager.save(ClientOrder, order);

      // If was paid, refund to wallet
      if (wasPaid) {
        const wallet = await manager.findOne(ClientWallet, {
          where: { client_user_id: order.client_user_id },
          lock: { mode: 'pessimistic_write' },
        });

        if (wallet) {
          const balanceBefore = Number(wallet.balance);
          const refundAmount = Number(order.total_amount);
          const balanceAfter = balanceBefore + refundAmount;

          wallet.balance = balanceAfter;
          await manager.save(ClientWallet, wallet);

          const ledgerEntry = manager.create(ClientWalletLedger, {
            wallet_id: wallet.id,
            organization_id: wallet.organization_id,
            transaction_type: WalletTransactionType.REFUND,
            amount: refundAmount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            description: `Refund for cancelled order ${order.order_number}: ${reason}`,
            reference_id: order.id,
            reference_type: 'order',
          });
          await manager.save(ClientWalletLedger, ledgerEntry);

          // Mark payment as refunded
          await manager.update(
            ClientPayment,
            { order_id: orderId, status: ClientPaymentStatus.SUCCESS },
            { status: ClientPaymentStatus.REFUNDED },
          );
        }

        // Refund loyalty points if any were used
        if (order.loyalty_points_used > 0) {
          const loyaltyAccount = await manager.findOne(ClientLoyaltyAccount, {
            where: { client_user_id: order.client_user_id },
          });

          if (loyaltyAccount) {
            const pointsBefore = loyaltyAccount.points_balance;
            const pointsAfter = pointsBefore + order.loyalty_points_used;

            loyaltyAccount.points_balance = pointsAfter;
            loyaltyAccount.total_redeemed -= order.loyalty_points_used;
            await manager.save(ClientLoyaltyAccount, loyaltyAccount);

            const loyaltyLedger = manager.create(ClientLoyaltyLedger, {
              loyalty_account_id: loyaltyAccount.id,
              organization_id: loyaltyAccount.organization_id,
              reason: LoyaltyTransactionReason.ORDER_REFUND,
              points: order.loyalty_points_used,
              balance_before: pointsBefore,
              balance_after: pointsAfter,
              description: `Points refund for cancelled order ${order.order_number}`,
              reference_id: order.id,
              reference_type: 'order',
            });
            await manager.save(ClientLoyaltyLedger, loyaltyLedger);
          }
        }
      }

      this.logger.log(
        `Order ${wasPaid ? 'refunded' : 'cancelled'}: ${order.order_number}, reason: ${reason}`,
      );

      return savedOrder;
    });
  }

  /**
   * Get paginated order history for a client or all orders with filters
   */
  async getOrderHistory(
    query: QueryOrdersDto,
    organizationId?: string,
  ): Promise<{ data: ClientOrder[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.orderRepo.createQueryBuilder('order');
    qb.leftJoinAndSelect('order.payments', 'payment');

    if (organizationId) {
      qb.andWhere('order.organization_id = :organizationId', { organizationId });
    }

    if (query.clientUserId) {
      qb.andWhere('order.client_user_id = :clientUserId', { clientUserId: query.clientUserId });
    }

    if (query.machineId) {
      qb.andWhere('order.machine_id = :machineId', { machineId: query.machineId });
    }

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.dateFrom) {
      qb.andWhere('order.created_at >= :dateFrom', { dateFrom: query.dateFrom });
    }

    if (query.dateTo) {
      qb.andWhere('order.created_at <= :dateTo', { dateTo: query.dateTo });
    }

    qb.orderBy('order.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  // ============================================
  // LOYALTY OPERATIONS
  // ============================================

  /**
   * Get loyalty account for a client
   */
  async getLoyaltyAccount(clientUserId: string): Promise<ClientLoyaltyAccount> {
    const account = await this.loyaltyAccountRepo.findOne({
      where: { client_user_id: clientUserId },
    });
    if (!account) {
      throw new NotFoundException(`Loyalty account not found for client ${clientUserId}`);
    }
    return account;
  }

  /**
   * Earn loyalty points (credit)
   */
  async earnLoyaltyPoints(
    clientUserId: string,
    points: number,
    reason: LoyaltyTransactionReason,
    referenceId?: string,
  ): Promise<ClientLoyaltyLedger> {
    if (points <= 0) {
      throw new BadRequestException('Points to earn must be positive');
    }

    return this.dataSource.transaction(async (manager) => {
      const account = await manager.findOne(ClientLoyaltyAccount, {
        where: { client_user_id: clientUserId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!account) {
        throw new NotFoundException(`Loyalty account not found for client ${clientUserId}`);
      }

      const balanceBefore = account.points_balance;
      const balanceAfter = balanceBefore + points;

      account.points_balance = balanceAfter;
      account.total_earned += points;

      // Update tier based on total earned
      account.tier = this.calculateTier(account.total_earned);
      account.tier_updated_at = new Date();

      await manager.save(ClientLoyaltyAccount, account);

      const ledgerEntry = manager.create(ClientLoyaltyLedger, {
        loyalty_account_id: account.id,
        organization_id: account.organization_id,
        reason,
        points,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: `Earned ${points} points`,
        reference_id: referenceId || null,
        reference_type: referenceId ? 'order' : null,
      });
      const saved = await manager.save(ClientLoyaltyLedger, ledgerEntry);

      this.logger.log(
        `Loyalty earned: client=${clientUserId}, points=${points}, reason=${reason}`,
      );

      return saved;
    });
  }

  /**
   * Redeem loyalty points (debit). Fails if insufficient balance.
   */
  async redeemLoyaltyPoints(
    clientUserId: string,
    points: number,
    reason: LoyaltyTransactionReason,
    referenceId?: string,
  ): Promise<ClientLoyaltyLedger> {
    if (points <= 0) {
      throw new BadRequestException('Points to redeem must be positive');
    }

    return this.dataSource.transaction(async (manager) => {
      const account = await manager.findOne(ClientLoyaltyAccount, {
        where: { client_user_id: clientUserId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!account) {
        throw new NotFoundException(`Loyalty account not found for client ${clientUserId}`);
      }

      if (account.points_balance < points) {
        throw new BadRequestException(
          `Insufficient loyalty points. Available: ${account.points_balance}, requested: ${points}`,
        );
      }

      const balanceBefore = account.points_balance;
      const balanceAfter = balanceBefore - points;

      account.points_balance = balanceAfter;
      account.total_redeemed += points;
      await manager.save(ClientLoyaltyAccount, account);

      const ledgerEntry = manager.create(ClientLoyaltyLedger, {
        loyalty_account_id: account.id,
        organization_id: account.organization_id,
        reason,
        points: -points,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: `Redeemed ${points} points`,
        reference_id: referenceId || null,
        reference_type: referenceId ? 'order' : null,
      });
      const saved = await manager.save(ClientLoyaltyLedger, ledgerEntry);

      this.logger.log(
        `Loyalty redeemed: client=${clientUserId}, points=${points}, reason=${reason}`,
      );

      return saved;
    });
  }

  /**
   * Calculate loyalty tier based on total earned points
   */
  private calculateTier(totalEarned: number): string {
    if (totalEarned >= 10000) return 'platinum';
    if (totalEarned >= 5000) return 'gold';
    if (totalEarned >= 1000) return 'silver';
    return 'bronze';
  }
}
