/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { CashFinanceService } from './cash-finance.service';
import { BankDeposit } from './entities/bank-deposit.entity';
import { Collection } from '../collections/entities/collection.entity';
import { CreateDepositDto } from './dto/create-deposit.dto';

describe('CashFinanceService', () => {
  let service: CashFinanceService;
  let _depositRepo: jest.Mocked<Repository<BankDeposit>>;
  let _collectionRepo: jest.Mocked<Repository<Collection>>;
  let _dataSource: jest.Mocked<DataSource>;

  const mockDepositRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockCollectionRepo = {};

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashFinanceService,
        {
          provide: getRepositoryToken(BankDeposit),
          useValue: mockDepositRepo,
        },
        {
          provide: getRepositoryToken(Collection),
          useValue: mockCollectionRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<CashFinanceService>(CashFinanceService);
    _depositRepo = module.get(getRepositoryToken(BankDeposit));
    _collectionRepo = module.get(getRepositoryToken(Collection));
    _dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // createDeposit
  // ==========================================================================

  describe('createDeposit', () => {
    const orgId = 'org-uuid-1';
    const userId = 'user-uuid-1';
    const dto: CreateDepositDto = {
      amount: 500000,
      date: '2026-03-01',
      notes: 'Weekly bank deposit',
    };

    it('should create and return a bank deposit', async () => {
      const created = {
        id: 'deposit-uuid-1',
        organizationId: orgId,
        amount: dto.amount,
        depositDate: new Date(dto.date),
        notes: dto.notes,
        createdById: userId,
      };

      mockDepositRepo.create.mockReturnValue(created as any);
      mockDepositRepo.save.mockResolvedValue(created as any);

      const result = await service.createDeposit(orgId, userId, dto);

      expect(mockDepositRepo.create).toHaveBeenCalledWith({
        organizationId: orgId,
        amount: dto.amount,
        depositDate: expect.any(Date),
        notes: dto.notes,
        createdById: userId,
      });
      expect(mockDepositRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('should set notes to null when not provided', async () => {
      const dtoNoNotes: CreateDepositDto = { amount: 100000, date: '2026-03-01' };
      const created = {
        id: 'deposit-uuid-2',
        organizationId: orgId,
        amount: dtoNoNotes.amount,
        depositDate: new Date(dtoNoNotes.date),
        notes: null,
        createdById: userId,
      };

      mockDepositRepo.create.mockReturnValue(created as any);
      mockDepositRepo.save.mockResolvedValue(created as any);

      await service.createDeposit(orgId, userId, dtoNoNotes);

      expect(mockDepositRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ notes: null }),
      );
    });
  });

  // ==========================================================================
  // findAllDeposits
  // ==========================================================================

  describe('findAllDeposits', () => {
    const orgId = 'org-uuid-1';

    it('should return all deposits for the organization ordered by date DESC', async () => {
      const deposits = [
        { id: 'dep-1', organizationId: orgId, amount: 100000, depositDate: new Date('2026-03-02') },
        { id: 'dep-2', organizationId: orgId, amount: 200000, depositDate: new Date('2026-03-01') },
      ];

      mockDepositRepo.find.mockResolvedValue(deposits as any);

      const result = await service.findAllDeposits(orgId);

      expect(mockDepositRepo.find).toHaveBeenCalledWith({
        where: { organizationId: orgId },
        order: { depositDate: 'DESC' },
      });
      expect(result).toEqual(deposits);
    });

    it('should return empty array when no deposits exist', async () => {
      mockDepositRepo.find.mockResolvedValue([]);

      const result = await service.findAllDeposits(orgId);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // getBalance
  // ==========================================================================

  describe('getBalance', () => {
    const orgId = 'org-uuid-1';

    it('should return received, deposited, and balance values', async () => {
      const expectedBalance = {
        received: 1000000,
        deposited: 600000,
        balance: 400000,
      };

      mockDataSource.transaction.mockImplementation(async (_isolation, callback) => {
        const mockManager = {
          createQueryBuilder: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn()
            .mockResolvedValueOnce({ total: '1000000' })   // received
            .mockResolvedValueOnce({ total: '600000' }),    // deposited
        };
        return callback(mockManager as any);
      });

      const result = await service.getBalance(orgId);

      expect(mockDataSource.transaction).toHaveBeenCalledWith(
        'REPEATABLE READ',
        expect.any(Function),
      );
      expect(result).toEqual(expectedBalance);
    });

    it('should return zero balance when no data exists', async () => {
      mockDataSource.transaction.mockImplementation(async (_isolation, callback) => {
        const mockManager = {
          createQueryBuilder: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn()
            .mockResolvedValueOnce({ total: '0' })
            .mockResolvedValueOnce({ total: '0' }),
        };
        return callback(mockManager as any);
      });

      const result = await service.getBalance(orgId);

      expect(result).toEqual({
        received: 0,
        deposited: 0,
        balance: 0,
      });
    });
  });

  // ==========================================================================
  // removeDeposit
  // ==========================================================================

  describe('removeDeposit', () => {
    const depositId = 'deposit-uuid-1';
    const orgId = 'org-uuid-1';

    it('should soft-delete an existing deposit', async () => {
      const deposit = { id: depositId, organizationId: orgId, amount: 500000 };

      mockDepositRepo.findOne.mockResolvedValue(deposit as any);
      mockDepositRepo.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.removeDeposit(depositId, orgId);

      expect(mockDepositRepo.findOne).toHaveBeenCalledWith({
        where: { id: depositId, organizationId: orgId },
      });
      expect(mockDepositRepo.softDelete).toHaveBeenCalledWith(depositId);
    });

    it('should throw NotFoundException when deposit does not exist', async () => {
      mockDepositRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeDeposit(depositId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when deposit belongs to another org', async () => {
      mockDepositRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeDeposit(depositId, 'other-org-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
