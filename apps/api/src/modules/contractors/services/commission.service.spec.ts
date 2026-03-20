import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { CommissionService } from "./commission.service";
import {
  Contract,
  ContractStatus,
  CommissionType,
  CommissionCalculation,
  CommissionPaymentStatus,
} from "../entities/contract.model";
import { Transaction } from "../../transactions/entities/transaction.entity";

describe("CommissionService", () => {
  let service: CommissionService;
  let commissionRepo: jest.Mocked<Repository<CommissionCalculation>>;
  let contractRepo: jest.Mocked<Repository<Contract>>;
  let _transactionRepo: jest.Mocked<Repository<Transaction>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";
  const contractId = "contract-uuid-1";
  const commissionId = "commission-uuid-1";

  const makeContract = (overrides: Partial<Contract> = {}): Contract =>
    ({
      id: contractId,
      organizationId: orgId,
      contractNumber: "C-001",
      status: ContractStatus.ACTIVE,
      commissionType: CommissionType.PERCENTAGE,
      commissionRate: 15,
      commissionFixedAmount: null,
      commissionTiers: null,
      commissionHybridFixed: null,
      commissionHybridRate: null,
      currency: "UZS",
      paymentTermDays: 30,
      ...overrides,
    }) as unknown as Contract;

  const mockCommission = {
    id: commissionId,
    organizationId: orgId,
    contractId,
    periodStart: new Date("2025-01-01"),
    periodEnd: new Date("2025-01-31"),
    totalRevenue: 1000000,
    transactionCount: 50,
    commissionAmount: 150000,
    commissionType: CommissionType.PERCENTAGE,
    paymentStatus: CommissionPaymentStatus.PENDING,
    paymentDueDate: new Date("2025-03-02"),
    contract: makeContract(),
  } as unknown as CommissionCalculation;

  const mockTransactionQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({
      totalRevenue: "1000000",
      transactionCount: "50",
    }),
  };

  const mockCommissionQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockCommission], 1]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionService,
        {
          provide: getRepositoryToken(CommissionCalculation),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockCommissionQb),
          },
        },
        {
          provide: getRepositoryToken(Contract),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockTransactionQb),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CommissionService>(CommissionService);
    commissionRepo = module.get(getRepositoryToken(CommissionCalculation));
    contractRepo = module.get(getRepositoryToken(Contract));
    _transactionRepo = module.get(getRepositoryToken(Transaction));
    eventEmitter = module.get(EventEmitter2);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("calculate", () => {
    it("should calculate PERCENTAGE commission correctly", async () => {
      const contract = makeContract({
        commissionType: CommissionType.PERCENTAGE,
        commissionRate: 15,
      });
      contractRepo.findOne.mockResolvedValue(contract);
      commissionRepo.create.mockReturnValue(mockCommission);
      commissionRepo.save.mockResolvedValue(mockCommission);

      const result = await service.calculate(
        orgId,
        contractId,
        "2025-01-01",
        "2025-01-31",
        userId,
      );

      expect(result).toBeDefined();
      expect(commissionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          commissionAmount: 150000,
          paymentStatus: CommissionPaymentStatus.PENDING,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "commission.calculated",
        expect.any(Object),
      );
    });

    it("should throw NotFoundException when contract not found", async () => {
      contractRepo.findOne.mockResolvedValue(null);

      await expect(
        service.calculate(
          orgId,
          contractId,
          "2025-01-01",
          "2025-01-31",
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when contract is not ACTIVE", async () => {
      const draftContract = makeContract({ status: ContractStatus.DRAFT });
      contractRepo.findOne.mockResolvedValue(draftContract);

      await expect(
        service.calculate(
          orgId,
          contractId,
          "2025-01-01",
          "2025-01-31",
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should calculate FIXED commission correctly", async () => {
      const contract = makeContract({
        commissionType: CommissionType.FIXED,
        commissionFixedAmount: 500000,
      });
      contractRepo.findOne.mockResolvedValue(contract);
      commissionRepo.create.mockReturnValue(mockCommission);
      commissionRepo.save.mockResolvedValue(mockCommission);

      await service.calculate(
        orgId,
        contractId,
        "2025-01-01",
        "2025-01-31",
        userId,
      );

      expect(commissionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          commissionAmount: 500000,
        }),
      );
    });

    it("should calculate TIERED commission correctly", async () => {
      const contract = makeContract({
        commissionType: CommissionType.TIERED,
        commissionTiers: [
          { minRevenue: 0, maxRevenue: 500000, rate: 10 },
          { minRevenue: 500000, maxRevenue: null, rate: 20 },
        ],
      });
      contractRepo.findOne.mockResolvedValue(contract);
      commissionRepo.create.mockReturnValue(mockCommission);
      commissionRepo.save.mockResolvedValue(mockCommission);

      await service.calculate(
        orgId,
        contractId,
        "2025-01-01",
        "2025-01-31",
        userId,
      );

      expect(commissionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          calculationDetails: expect.objectContaining({
            tierBreakdown: expect.any(Array),
          }),
        }),
      );
    });

    it("should calculate HYBRID commission correctly", async () => {
      const contract = makeContract({
        commissionType: CommissionType.HYBRID,
        commissionHybridFixed: 200000,
        commissionHybridRate: 10,
      });
      contractRepo.findOne.mockResolvedValue(contract);
      commissionRepo.create.mockReturnValue(mockCommission);
      commissionRepo.save.mockResolvedValue(mockCommission);

      await service.calculate(
        orgId,
        contractId,
        "2025-01-01",
        "2025-01-31",
        userId,
      );

      expect(commissionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          commissionAmount: 300000,
        }),
      );
    });

    it("should return 0 commission for TIERED with empty tiers", async () => {
      const contract = makeContract({
        commissionType: CommissionType.TIERED,
        commissionTiers: [],
      });
      contractRepo.findOne.mockResolvedValue(contract);
      commissionRepo.create.mockReturnValue(mockCommission);
      commissionRepo.save.mockResolvedValue(mockCommission);

      await service.calculate(
        orgId,
        contractId,
        "2025-01-01",
        "2025-01-31",
        userId,
      );

      expect(commissionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          commissionAmount: 0,
        }),
      );
    });
  });

  describe("markAsPaid", () => {
    it("should mark a pending commission as paid", async () => {
      const commission = { ...mockCommission } as any;
      commissionRepo.findOne.mockResolvedValue(commission);
      commissionRepo.save.mockResolvedValue(commission);

      const result = await service.markAsPaid(
        commissionId,
        orgId,
        "tx-uuid-1",
        "Payment received",
      );

      expect(result.paymentStatus).toBe(CommissionPaymentStatus.PAID);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "commission.paid",
        expect.any(Object),
      );
    });

    it("should throw NotFoundException when commission not found", async () => {
      commissionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.markAsPaid("nonexistent", orgId, "tx-uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when already paid", async () => {
      const paidCommission = {
        ...mockCommission,
        paymentStatus: CommissionPaymentStatus.PAID,
      } as any;
      commissionRepo.findOne.mockResolvedValue(paidCommission);

      await expect(
        service.markAsPaid(commissionId, orgId, "tx-uuid-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when commission is cancelled", async () => {
      const cancelled = {
        ...mockCommission,
        paymentStatus: CommissionPaymentStatus.CANCELLED,
      } as any;
      commissionRepo.findOne.mockResolvedValue(cancelled);

      await expect(
        service.markAsPaid(commissionId, orgId, "tx-uuid-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("markAsOverdue", () => {
    it("should mark pending commissions past due date as overdue", async () => {
      const overdueCommission = {
        ...mockCommission,
        paymentStatus: CommissionPaymentStatus.PENDING,
        paymentDueDate: new Date("2024-01-01"),
      } as any;
      commissionRepo.find.mockResolvedValue([overdueCommission]);
      commissionRepo.save.mockResolvedValue(overdueCommission);

      await service.markAsOverdue();

      expect(commissionRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "commission.overdue",
        expect.objectContaining({
          commissionId: mockCommission.id,
        }),
      );
    });

    it("should do nothing when no overdue commissions exist", async () => {
      commissionRepo.find.mockResolvedValue([]);

      await service.markAsOverdue();

      expect(commissionRepo.save).not.toHaveBeenCalled();
    });
  });
});
