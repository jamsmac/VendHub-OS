import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import { ClientService } from './client.service';
import { ClientUser } from './entities/client-user.entity';
import { ClientWallet } from './entities/client-wallet.entity';
import { ClientWalletLedger, WalletTransactionType } from './entities/client-wallet-ledger.entity';
import { ClientLoyaltyAccount } from './entities/client-loyalty-account.entity';
import { ClientLoyaltyLedger, LoyaltyTransactionReason } from './entities/client-loyalty-ledger.entity';
import { ClientOrder, ClientOrderStatus } from './entities/client-order.entity';
import { ClientPayment, ClientPaymentStatus } from './entities/client-payment.entity';
import { Product } from '../products/entities/product.entity';

describe('ClientService', () => {
  let service: ClientService;
  let clientUserRepo: jest.Mocked<Repository<ClientUser>>;
  let walletRepo: jest.Mocked<Repository<ClientWallet>>;
  let walletLedgerRepo: jest.Mocked<Repository<ClientWalletLedger>>;
  let loyaltyAccountRepo: jest.Mocked<Repository<ClientLoyaltyAccount>>;
  let loyaltyLedgerRepo: jest.Mocked<Repository<ClientLoyaltyLedger>>;
  let orderRepo: jest.Mocked<Repository<ClientOrder>>;
  let paymentRepo: jest.Mocked<Repository<ClientPayment>>;
  let productRepo: jest.Mocked<Repository<Product>>;

  const clientId = 'client-uuid-1';

  const mockClient: ClientUser = {
    id: clientId,
    telegram_id: '123456789',
    phone: '+998901234567',
    email: 'client@test.com',
    first_name: 'John',
    last_name: 'Doe',
    username: 'johndoe',
    language: 'ru',
    organization_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as ClientUser;

  const mockWallet: ClientWallet = {
    id: 'wallet-uuid-1',
    client_user_id: clientId,
    organization_id: null,
    balance: 50000,
    currency: 'UZS',
    is_active: true,
  } as unknown as ClientWallet;

  const mockLoyaltyAccount: ClientLoyaltyAccount = {
    id: 'loyalty-uuid-1',
    client_user_id: clientId,
    organization_id: null,
    points_balance: 100,
    total_earned: 500,
    total_redeemed: 400,
    tier: 'bronze',
  } as unknown as ClientLoyaltyAccount;

  const mockOrder: ClientOrder = {
    id: 'order-uuid-1',
    organization_id: null,
    client_user_id: clientId,
    machine_id: null,
    order_number: 'ORD-001',
    status: ClientOrderStatus.PENDING,
    items: [],
    subtotal: 24000,
    discount_amount: 0,
    loyalty_points_used: 0,
    total_amount: 24000,
    currency: 'UZS',
    created_at: new Date(),
  } as unknown as ClientOrder;

  const mockLedgerEntry: ClientWalletLedger = {
    id: 'ledger-uuid-1',
    wallet_id: 'wallet-uuid-1',
    transaction_type: WalletTransactionType.TOP_UP,
    amount: 10000,
    balance_before: 50000,
    balance_after: 60000,
  } as unknown as ClientWalletLedger;

  const mockLoyaltyLedger: ClientLoyaltyLedger = {
    id: 'loyalty-ledger-uuid-1',
    loyalty_account_id: 'loyalty-uuid-1',
    reason: LoyaltyTransactionReason.ORDER_EARNED,
    points: 24,
    balance_before: 100,
    balance_after: 124,
  } as unknown as ClientLoyaltyLedger;

  // Mock transaction manager
  const mockManager = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((cb: any) => cb(mockManager)),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockClient], 1]),
  };

  beforeEach(async () => {
    // Reset mock manager
    mockManager.create.mockReset();
    mockManager.save.mockReset();
    mockManager.findOne.mockReset();
    mockManager.update.mockReset();
    mockDataSource.transaction.mockImplementation((cb: any) => cb(mockManager));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientService,
        {
          provide: getRepositoryToken(ClientUser),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(ClientWallet),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ClientWalletLedger),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ClientLoyaltyAccount),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ClientLoyaltyLedger),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ClientOrder),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(ClientPayment),
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
            findByIds: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ClientService>(ClientService);
    clientUserRepo = module.get(getRepositoryToken(ClientUser));
    walletRepo = module.get(getRepositoryToken(ClientWallet));
    walletLedgerRepo = module.get(getRepositoryToken(ClientWalletLedger));
    loyaltyAccountRepo = module.get(getRepositoryToken(ClientLoyaltyAccount));
    loyaltyLedgerRepo = module.get(getRepositoryToken(ClientLoyaltyLedger));
    orderRepo = module.get(getRepositoryToken(ClientOrder));
    paymentRepo = module.get(getRepositoryToken(ClientPayment));
    productRepo = module.get(getRepositoryToken(Product));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CLIENT USER MANAGEMENT
  // ============================================================================

  describe('createClient', () => {
    it('should create a new client with wallet and loyalty account', async () => {
      const dto = {
        telegramId: '123456789',
        firstName: 'John',
        lastName: 'Doe',
        language: 'ru',
      };

      clientUserRepo.findOne.mockResolvedValue(null);
      mockManager.create.mockReturnValue(mockClient);
      mockManager.save.mockResolvedValue(mockClient);

      const result = await service.createClient(dto as any);

      expect(result).toEqual(mockClient);
      expect(mockManager.create).toHaveBeenCalledTimes(3); // user + wallet + loyalty
      expect(mockManager.save).toHaveBeenCalledTimes(3);
    });

    it('should throw ConflictException for duplicate telegramId', async () => {
      clientUserRepo.findOne.mockResolvedValue(mockClient);

      await expect(
        service.createClient({
          telegramId: '123456789',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for duplicate phone', async () => {
      clientUserRepo.findOne
        .mockResolvedValueOnce(null) // telegramId check - not found
        .mockResolvedValueOnce(mockClient); // phone check - found

      await expect(
        service.createClient({
          telegramId: '999',
          phone: '+998901234567',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for duplicate email', async () => {
      clientUserRepo.findOne
        .mockResolvedValueOnce(null)  // telegramId
        .mockResolvedValueOnce(null)  // phone
        .mockResolvedValueOnce(mockClient); // email

      await expect(
        service.createClient({
          telegramId: '999',
          phone: '+998999999999',
          email: 'client@test.com',
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findClientById', () => {
    it('should return client with relations', async () => {
      clientUserRepo.findOne.mockResolvedValue(mockClient);

      const result = await service.findClientById(clientId);

      expect(result).toEqual(mockClient);
      expect(clientUserRepo.findOne).toHaveBeenCalledWith({
        where: { id: clientId },
        relations: ['wallet', 'loyalty_account'],
      });
    });

    it('should throw NotFoundException when client not found', async () => {
      clientUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findClientById('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findClientByTelegramId', () => {
    it('should return client by telegram id', async () => {
      clientUserRepo.findOne.mockResolvedValue(mockClient);

      const result = await service.findClientByTelegramId('123456789');

      expect(result).toEqual(mockClient);
      expect(clientUserRepo.findOne).toHaveBeenCalledWith({
        where: { telegram_id: '123456789' },
        relations: ['wallet', 'loyalty_account'],
      });
    });

    it('should throw NotFoundException when not found', async () => {
      clientUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findClientByTelegramId('999'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateClient', () => {
    it('should update client fields', async () => {
      const dto = { firstName: 'Jane' };
      const updated = { ...mockClient, first_name: 'Jane' };

      clientUserRepo.findOne.mockResolvedValue(mockClient);
      clientUserRepo.save.mockResolvedValue(updated as ClientUser);

      const result = await service.updateClient(clientId, dto as any);

      expect(result.first_name).toEqual('Jane');
    });

    it('should throw ConflictException when changing to duplicate telegramId', async () => {
      const otherClient = { ...mockClient, id: 'other' };
      clientUserRepo.findOne
        .mockResolvedValueOnce(mockClient) // findClientById
        .mockResolvedValueOnce(otherClient as ClientUser); // duplicate check

      await expect(
        service.updateClient(clientId, {
          telegramId: 'taken-id',
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getClients', () => {
    it('should return paginated clients', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockClient], 1]);

      const result = await service.getClients({} as any);

      expect(result).toEqual({
        data: [mockClient],
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('should apply search filter', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getClients({ search: 'john' } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('client.first_name ILIKE :search'),
        { search: '%john%' },
      );
    });
  });

  // ============================================================================
  // WALLET OPERATIONS
  // ============================================================================

  describe('getWallet', () => {
    it('should return wallet for client', async () => {
      walletRepo.findOne.mockResolvedValue(mockWallet);

      const result = await service.getWallet(clientId);

      expect(result).toEqual(mockWallet);
    });

    it('should throw NotFoundException when wallet not found', async () => {
      walletRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getWallet('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('topUpWallet', () => {
    it('should top up wallet and create ledger entry', async () => {
      const dto = { amount: 10000, description: 'Top up' };

      mockManager.findOne.mockResolvedValue(mockWallet);
      mockManager.save.mockResolvedValue(mockWallet);
      mockManager.create.mockReturnValue(mockLedgerEntry);

      const result = await service.topUpWallet(clientId, dto as any);

      expect(mockManager.save).toHaveBeenCalled();
      expect(mockManager.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when wallet not found', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        service.topUpWallet('non-existent', { amount: 10000 } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when wallet is deactivated', async () => {
      const inactiveWallet = { ...mockWallet, is_active: false };
      mockManager.findOne.mockResolvedValue(inactiveWallet);

      await expect(
        service.topUpWallet(clientId, { amount: 10000 } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('adjustWallet', () => {
    it('should adjust wallet balance', async () => {
      const dto = { amount: -5000, reason: 'Correction' };

      mockManager.findOne.mockResolvedValue(mockWallet);
      mockManager.save.mockResolvedValue(mockWallet);
      mockManager.create.mockReturnValue(mockLedgerEntry);

      await service.adjustWallet(clientId, dto as any, 'admin-uuid');

      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      const dto = { amount: -999999, reason: 'Correction' };

      mockManager.findOne.mockResolvedValue(mockWallet);

      await expect(
        service.adjustWallet(clientId, dto as any, 'admin-uuid'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWalletLedger', () => {
    it('should return paginated wallet ledger', async () => {
      walletRepo.findOne.mockResolvedValue(mockWallet);
      walletLedgerRepo.findAndCount.mockResolvedValue([[mockLedgerEntry], 1]);

      const result = await service.getWalletLedger(clientId, {});

      expect(result).toEqual({
        data: [mockLedgerEntry],
        total: 1,
        page: 1,
        limit: 20,
      });
    });
  });

  // ============================================================================
  // ORDER MANAGEMENT
  // ============================================================================

  describe('completeOrder', () => {
    it('should complete a paid order and award loyalty points', async () => {
      const paidOrder = {
        ...mockOrder,
        status: ClientOrderStatus.PAID,
        total_amount: 24000,
      };
      const completedOrder = {
        ...paidOrder,
        status: ClientOrderStatus.COMPLETED,
      };

      orderRepo.findOne.mockResolvedValue(paidOrder as ClientOrder);
      orderRepo.save.mockResolvedValue(completedOrder as ClientOrder);

      // For earnLoyaltyPoints call (via transaction)
      mockManager.findOne.mockResolvedValue(mockLoyaltyAccount);
      mockManager.save.mockResolvedValue(mockLoyaltyAccount);
      mockManager.create.mockReturnValue(mockLoyaltyLedger);

      const result = await service.completeOrder('order-uuid-1');

      expect(result.status).toEqual(ClientOrderStatus.COMPLETED);
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(
        service.completeOrder('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid status', async () => {
      const completedOrder = {
        ...mockOrder,
        status: ClientOrderStatus.COMPLETED,
      };
      orderRepo.findOne.mockResolvedValue(completedOrder as ClientOrder);

      await expect(
        service.completeOrder('order-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('processPayment', () => {
    it('should throw NotFoundException for non-existent order', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(
        service.processPayment('non-existent', 'wallet'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-pending order', async () => {
      const paidOrder = { ...mockOrder, status: ClientOrderStatus.PAID };
      orderRepo.findOne.mockResolvedValue(paidOrder as ClientOrder);

      await expect(
        service.processPayment('order-uuid-1', 'wallet'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // LOYALTY OPERATIONS
  // ============================================================================

  describe('getLoyaltyAccount', () => {
    it('should return loyalty account', async () => {
      loyaltyAccountRepo.findOne.mockResolvedValue(mockLoyaltyAccount);

      const result = await service.getLoyaltyAccount(clientId);

      expect(result).toEqual(mockLoyaltyAccount);
    });

    it('should throw NotFoundException when not found', async () => {
      loyaltyAccountRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getLoyaltyAccount('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('earnLoyaltyPoints', () => {
    it('should earn loyalty points', async () => {
      mockManager.findOne.mockResolvedValue(mockLoyaltyAccount);
      mockManager.save.mockResolvedValue(mockLoyaltyAccount);
      mockManager.create.mockReturnValue(mockLoyaltyLedger);

      const result = await service.earnLoyaltyPoints(
        clientId,
        50,
        LoyaltyTransactionReason.ORDER_EARNED,
        'order-uuid-1',
      );

      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for zero or negative points', async () => {
      await expect(
        service.earnLoyaltyPoints(
          clientId,
          0,
          LoyaltyTransactionReason.ORDER_EARNED,
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.earnLoyaltyPoints(
          clientId,
          -10,
          LoyaltyTransactionReason.ORDER_EARNED,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('redeemLoyaltyPoints', () => {
    it('should redeem loyalty points', async () => {
      mockManager.findOne.mockResolvedValue(mockLoyaltyAccount);
      mockManager.save.mockResolvedValue(mockLoyaltyAccount);
      mockManager.create.mockReturnValue(mockLoyaltyLedger);

      const result = await service.redeemLoyaltyPoints(
        clientId,
        50,
        LoyaltyTransactionReason.ORDER_REDEEMED,
      );

      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for insufficient points', async () => {
      const lowBalance = { ...mockLoyaltyAccount, points_balance: 10 };
      mockManager.findOne.mockResolvedValue(lowBalance);

      await expect(
        service.redeemLoyaltyPoints(
          clientId,
          100,
          LoyaltyTransactionReason.ORDER_REDEEMED,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for zero or negative points', async () => {
      await expect(
        service.redeemLoyaltyPoints(
          clientId,
          0,
          LoyaltyTransactionReason.ORDER_REDEEMED,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
