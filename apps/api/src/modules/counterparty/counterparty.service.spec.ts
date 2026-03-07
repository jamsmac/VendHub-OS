import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { CounterpartyService } from "./counterparty.service";
import {
  Counterparty,
  Contract,
  CommissionCalculation,
  CounterpartyType,
  ContractStatus,
  CommissionType,
} from "./entities/counterparty.entity";

const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  softDelete: jest.fn(),
  softRemove: jest.fn(),
  count: jest.fn(),
  increment: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
    getCount: jest.fn(),
  })),
});

describe("CounterpartyService", () => {
  let service: CounterpartyService;
  let counterpartyRepo: jest.Mocked<Repository<Counterparty>>;
  let contractRepo: jest.Mocked<Repository<Contract>>;
  let commissionRepo: jest.Mocked<Repository<CommissionCalculation>>;

  const orgId = "550e8400-e29b-41d4-a716-446655440000";

  const mockCounterparty: Counterparty = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    organizationId: orgId,
    name: "ABC Trading Company",
    shortName: "ABC",
    type: CounterpartyType.SUPPLIER,
    inn: "123456789",
    oked: "52.46",
    mfo: "00365",
    bankAccount: "20208000100000012345",
    bankName: "Tashkent Bank",
    legalAddress: "Tashkent, Uzbekistan",
    actualAddress: "Samarkand, Uzbekistan",
    contactPerson: "John Smith",
    phone: "+998901234567",
    email: "contact@abc.uz",
    directorName: "Alex Director",
    directorPosition: "CEO",
    isVatPayer: true,
    vatRate: 15.0,
    paymentTermDays: 30,
    creditLimit: 10000000,
    isActive: true,
    notes: "Reliable supplier",
    contracts: [],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null,
    createdById: null,
    updatedById: null,
  };

  const mockContract: Contract = {
    id: "550e8400-e29b-41d4-a716-446655440002",
    organizationId: orgId,
    contractNumber: "CNT-2025-001",
    startDate: new Date("2025-01-01"),
    endDate: new Date("2025-12-31"),
    status: ContractStatus.ACTIVE,
    counterpartyId: mockCounterparty.id,
    counterparty: mockCounterparty,
    commissionType: CommissionType.PERCENTAGE,
    commissionRate: 2.5,
    commissionFixedAmount: null,
    commissionFixedPeriod: null,
    commissionTiers: null,
    commissionHybridFixed: null,
    commissionHybridRate: null,
    currency: "UZS",
    paymentTermDays: 30,
    paymentType: "postpayment" as any,
    minimumMonthlyRevenue: null,
    penaltyRate: null,
    specialConditions: null,
    notes: "Standard contract",
    contractFileId: null,
    commissionCalculations: [],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null,
    createdById: null,
    updatedById: null,
    isCurrentlyActive: jest.fn().mockReturnValue(true),
  };

  const mockCommission: CommissionCalculation = {
    id: "550e8400-e29b-41d4-a716-446655440003",
    organizationId: orgId,
    contractId: mockContract.id,
    contract: mockContract,
    periodStart: new Date("2025-01-01"),
    periodEnd: new Date("2025-01-31"),
    totalRevenue: 1000000,
    transactionCount: 50,
    commissionAmount: 25000,
    commissionType: CommissionType.PERCENTAGE,
    calculationDetails: { rate: 2.5, amount: 1000000 },
    paymentStatus: "pending" as any,
    paymentDueDate: new Date("2025-02-15"),
    paymentDate: null,
    paymentTransactionId: null,
    notes: null,
    calculatedByUserId: null,
    createdAt: new Date("2025-02-01"),
    updatedAt: new Date("2025-02-01"),
    deletedAt: null,
    createdById: null,
    updatedById: null,
    isOverdue: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounterpartyService,
        {
          provide: getRepositoryToken(Counterparty),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Contract),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(CommissionCalculation),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<CounterpartyService>(CounterpartyService);
    counterpartyRepo = module.get(getRepositoryToken(Counterparty));
    contractRepo = module.get(getRepositoryToken(Contract));
    commissionRepo = module.get(getRepositoryToken(CommissionCalculation));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // createCounterparty
  // =========================================================================

  describe("createCounterparty", () => {
    it("should create a new counterparty", async () => {
      const dto = {
        name: "ABC Trading Company",
        type: CounterpartyType.SUPPLIER,
        inn: "123456789",
        phone: "+998901234567",
      };

      counterpartyRepo.findOne.mockResolvedValue(null); // INN doesn't exist
      counterpartyRepo.create.mockReturnValue(mockCounterparty);
      counterpartyRepo.save.mockResolvedValue(mockCounterparty);

      const result = await service.createCounterparty(orgId, dto);

      expect(result).toEqual(mockCounterparty);
      expect(counterpartyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          name: "ABC Trading Company",
          type: CounterpartyType.SUPPLIER,
          isActive: true,
          isVatPayer: true,
          vatRate: 15.0,
        }),
      );
      expect(counterpartyRepo.save).toHaveBeenCalledWith(mockCounterparty);
    });

    it("should set default VAT rate", async () => {
      const dto = {
        name: "Test Company",
        type: CounterpartyType.CLIENT,
        inn: "987654321",
      };

      counterpartyRepo.findOne.mockResolvedValue(null);
      counterpartyRepo.create.mockReturnValue({
        ...mockCounterparty,
        vatRate: 15.0,
      });
      counterpartyRepo.save.mockResolvedValue(mockCounterparty);

      await service.createCounterparty(orgId, dto);

      expect(counterpartyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vatRate: 15.0,
        }),
      );
    });

    it("should throw BadRequestException when INN already exists", async () => {
      const dto = {
        name: "Duplicate Company",
        type: CounterpartyType.SUPPLIER,
        inn: "123456789",
      };

      counterpartyRepo.findOne.mockResolvedValue(mockCounterparty); // INN exists

      await expect(service.createCounterparty(orgId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      const dto = {
        name: "Test",
        type: CounterpartyType.CLIENT,
        inn: "123456789",
      };

      await expect(service.createCounterparty("", dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // getCounterparty
  // =========================================================================

  describe("getCounterparty", () => {
    it("should return a counterparty by ID", async () => {
      counterpartyRepo.findOne.mockResolvedValue(mockCounterparty);

      const result = await service.getCounterparty(orgId, mockCounterparty.id);

      expect(result).toEqual(mockCounterparty);
      expect(counterpartyRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ["contracts"],
        }),
      );
    });

    it("should throw NotFoundException when counterparty not found", async () => {
      counterpartyRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getCounterparty(orgId, "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        service.getCounterparty("", mockCounterparty.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // getCounterpartiesByType
  // =========================================================================

  describe("getCounterpartiesByType", () => {
    it("should return all suppliers", async () => {
      const suppliers = [mockCounterparty];
      counterpartyRepo.find.mockResolvedValue(suppliers);

      const result = await service.getCounterpartiesByType(
        orgId,
        CounterpartyType.SUPPLIER,
      );

      expect(result).toEqual(suppliers);
      expect(counterpartyRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { name: "ASC" },
        }),
      );
    });

    it("should return all clients", async () => {
      const clients = [{ ...mockCounterparty, type: CounterpartyType.CLIENT }];
      counterpartyRepo.find.mockResolvedValue(clients);

      const result = await service.getCounterpartiesByType(
        orgId,
        CounterpartyType.CLIENT,
      );

      expect(result).toEqual(clients);
    });

    it("should return empty array when no counterparties of type exist", async () => {
      counterpartyRepo.find.mockResolvedValue([]);

      const result = await service.getCounterpartiesByType(
        orgId,
        CounterpartyType.PARTNER,
      );

      expect(result).toEqual([]);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        service.getCounterpartiesByType("", CounterpartyType.SUPPLIER),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // updateCounterparty
  // =========================================================================

  describe("updateCounterparty", () => {
    it("should update counterparty details", async () => {
      const updated = { ...mockCounterparty, name: "Updated Name" };
      counterpartyRepo.findOne.mockResolvedValue(mockCounterparty);
      counterpartyRepo.save.mockResolvedValue(updated);

      const result = await service.updateCounterparty(
        orgId,
        mockCounterparty.id,
        {
          name: "Updated Name",
        },
      );

      expect(result.name).toBe("Updated Name");
      expect(counterpartyRepo.save).toHaveBeenCalled();
    });

    it("should validate new INN uniqueness", async () => {
      counterpartyRepo.findOne
        .mockResolvedValueOnce(mockCounterparty) // getCounterparty call
        .mockResolvedValueOnce(mockCounterparty); // INN check

      await expect(
        service.updateCounterparty(orgId, mockCounterparty.id, {
          inn: "999999999",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should allow same INN update", async () => {
      counterpartyRepo.findOne.mockResolvedValue(mockCounterparty);
      counterpartyRepo.save.mockResolvedValue(mockCounterparty);

      const result = await service.updateCounterparty(
        orgId,
        mockCounterparty.id,
        {
          inn: mockCounterparty.inn,
        },
      );

      expect(result).toEqual(mockCounterparty);
    });

    it("should throw NotFoundException when counterparty not found", async () => {
      counterpartyRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateCounterparty(orgId, "nonexistent", { name: "New" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // deleteCounterparty
  // =========================================================================

  describe("deleteCounterparty", () => {
    it("should soft delete a counterparty without active contracts", async () => {
      counterpartyRepo.findOne.mockResolvedValue(mockCounterparty);
      contractRepo.count.mockResolvedValue(0); // No active contracts
      counterpartyRepo.softRemove.mockResolvedValue(mockCounterparty);

      await service.deleteCounterparty(orgId, mockCounterparty.id);

      expect(counterpartyRepo.softRemove).toHaveBeenCalledWith(
        mockCounterparty,
      );
    });

    it("should throw BadRequestException when counterparty has active contracts", async () => {
      counterpartyRepo.findOne.mockResolvedValue(mockCounterparty);
      contractRepo.count.mockResolvedValue(2); // Has active contracts

      await expect(
        service.deleteCounterparty(orgId, mockCounterparty.id),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when counterparty not found", async () => {
      counterpartyRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteCounterparty(orgId, "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // createContract
  // =========================================================================

  describe("createContract", () => {
    it("should create a new contract", async () => {
      const dto = {
        contractNumber: "CNT-2025-001",
        startDate: new Date("2025-01-01"),
        counterpartyId: mockCounterparty.id,
        commissionType: CommissionType.PERCENTAGE,
        commissionRate: 2.5,
      };

      counterpartyRepo.findOne.mockResolvedValue(mockCounterparty);
      contractRepo.findOne.mockResolvedValue(null); // Contract number unique
      contractRepo.create.mockReturnValue(mockContract);
      contractRepo.save.mockResolvedValue(mockContract);

      const result = await service.createContract(orgId, dto);

      expect(result).toEqual(mockContract);
      expect(contractRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          contractNumber: "CNT-2025-001",
          status: ContractStatus.DRAFT,
          paymentTermDays: 30,
        }),
      );
    });

    it("should throw BadRequestException when contract number already exists", async () => {
      const dto = {
        contractNumber: "CNT-2025-001",
        startDate: new Date("2025-01-01"),
        counterpartyId: mockCounterparty.id,
        commissionType: CommissionType.PERCENTAGE,
      };

      counterpartyRepo.findOne.mockResolvedValue(mockCounterparty);
      contractRepo.findOne.mockResolvedValue(mockContract); // Number exists

      await expect(service.createContract(orgId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      const dto = {
        contractNumber: "CNT-2025-001",
        startDate: new Date("2025-01-01"),
        counterpartyId: mockCounterparty.id,
        commissionType: CommissionType.PERCENTAGE,
      };

      await expect(service.createContract("", dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // getContract
  // =========================================================================

  describe("getContract", () => {
    it("should return a contract by ID", async () => {
      contractRepo.findOne.mockResolvedValue(mockContract);

      const result = await service.getContract(orgId, mockContract.id);

      expect(result).toEqual(mockContract);
    });

    it("should throw NotFoundException when contract not found", async () => {
      contractRepo.findOne.mockResolvedValue(null);

      await expect(service.getContract(orgId, "nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(service.getContract("", mockContract.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // getCounterpartyContracts
  // =========================================================================

  describe("getCounterpartyContracts", () => {
    it("should return all contracts for a counterparty", async () => {
      const contracts = [mockContract];
      counterpartyRepo.findOne.mockResolvedValue(mockCounterparty);
      contractRepo.find.mockResolvedValue(contracts);

      const result = await service.getCounterpartyContracts(
        orgId,
        mockCounterparty.id,
      );

      expect(result).toEqual(contracts);
      expect(contractRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { startDate: "DESC" },
          relations: ["commissionCalculations"],
        }),
      );
    });

    it("should throw NotFoundException when counterparty not found", async () => {
      counterpartyRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getCounterpartyContracts(orgId, "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // activateContract
  // =========================================================================

  describe("activateContract", () => {
    it("should activate a draft contract", async () => {
      const draftContract = {
        ...mockContract,
        status: ContractStatus.DRAFT,
        isCurrentlyActive: jest.fn().mockReturnValue(false),
      };
      const activeContract = {
        ...draftContract,
        status: ContractStatus.ACTIVE,
        isCurrentlyActive: jest.fn().mockReturnValue(true),
      };

      contractRepo.findOne.mockResolvedValue(draftContract as any);
      contractRepo.save.mockResolvedValue(activeContract as any);

      const result = await service.activateContract(orgId, mockContract.id);

      expect(result.status).toBe(ContractStatus.ACTIVE);
    });

    it("should throw BadRequestException when trying to activate non-draft contract", async () => {
      contractRepo.findOne.mockResolvedValue(mockContract);

      await expect(
        service.activateContract(orgId, mockContract.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // terminateContract
  // =========================================================================

  describe("terminateContract", () => {
    it("should terminate a contract", async () => {
      const terminatedContract = {
        ...mockContract,
        status: ContractStatus.TERMINATED,
        endDate: expect.any(Date),
        isCurrentlyActive: jest.fn().mockReturnValue(false),
      };

      contractRepo.findOne.mockResolvedValue(mockContract as any);
      contractRepo.save.mockResolvedValue(terminatedContract as any);

      const result = await service.terminateContract(orgId, mockContract.id);

      expect(result.status).toBe(ContractStatus.TERMINATED);
      expect(result.endDate).not.toBeNull();
    });
  });

  // =========================================================================
  // getCommissionCalculations
  // =========================================================================

  describe("getCommissionCalculations", () => {
    it("should return commission calculations for a contract", async () => {
      const commissions = [mockCommission];
      commissionRepo.find.mockResolvedValue(commissions);

      const result = await service.getCommissionCalculations(
        orgId,
        mockContract.id,
      );

      expect(result).toEqual(commissions);
      expect(commissionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { periodStart: "DESC" },
        }),
      );
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        service.getCommissionCalculations("", mockContract.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // calculateTotalCommission
  // =========================================================================

  describe("calculateTotalCommission", () => {
    it("should calculate total commission for a contract", async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: "100000" }),
      };

      commissionRepo.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.calculateTotalCommission(
        orgId,
        mockContract.id,
      );

      expect(result).toBe(100000);
    });

    it("should return 0 when no commissions found", async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      };

      commissionRepo.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.calculateTotalCommission(
        orgId,
        mockContract.id,
      );

      expect(result).toBe(0);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        service.calculateTotalCommission("", mockContract.id),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
