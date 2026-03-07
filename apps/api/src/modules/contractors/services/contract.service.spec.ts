import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { ContractService } from "./contract.service";
import {
  Contract,
  ContractStatus,
  CommissionType,
} from "../entities/contract.entity";
import { Contractor } from "../entities/contractor.entity";

describe("ContractService", () => {
  let service: ContractService;
  let contractRepo: jest.Mocked<Repository<Contract>>;
  let contractorRepo: jest.Mocked<Repository<Contractor>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";
  const contractId = "contract-uuid-1";
  const contractorId = "contractor-uuid-1";

  const mockContractor = {
    id: contractorId,
    organizationId: orgId,
    companyName: "TechServ LLC",
  } as unknown as Contractor;

  const mockContract = {
    id: contractId,
    organizationId: orgId,
    contractorId,
    contractNumber: "C-001",
    startDate: new Date("2025-01-01"),
    endDate: new Date("2025-12-31"),
    status: ContractStatus.DRAFT,
    commissionType: CommissionType.PERCENTAGE,
    commissionRate: 15,
    currency: "UZS",
    paymentTermDays: 30,
    contractor: mockContractor,
  } as unknown as Contract;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockContract], 1]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractService,
        {
          provide: getRepositoryToken(Contract),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Contractor),
          useValue: {
            findOne: jest.fn(),
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

    service = module.get<ContractService>(ContractService);
    contractRepo = module.get(getRepositoryToken(Contract));
    contractorRepo = module.get(getRepositoryToken(Contractor));
    eventEmitter = module.get(EventEmitter2);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    const dto = {
      contractorId,
      contractNumber: "C-001",
      startDate: "2025-01-01",
      commissionType: CommissionType.PERCENTAGE,
      commissionRate: 15,
    } as any;

    it("should create a contract successfully", async () => {
      contractorRepo.findOne.mockResolvedValue(mockContractor);
      contractRepo.findOne.mockResolvedValue(null);
      contractRepo.create.mockReturnValue(mockContract);
      contractRepo.save.mockResolvedValue(mockContract);

      const result = await service.create(orgId, userId, dto);

      expect(result).toEqual(mockContract);
      expect(contractRepo.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "contract.created",
        expect.objectContaining({ contractId: mockContract.id }),
      );
    });

    it("should throw NotFoundException when contractor not found", async () => {
      contractorRepo.findOne.mockResolvedValue(null);

      await expect(service.create(orgId, userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ConflictException when contract number already exists", async () => {
      contractorRepo.findOne.mockResolvedValue(mockContractor);
      contractRepo.findOne.mockResolvedValue(mockContract);

      await expect(service.create(orgId, userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("findById", () => {
    it("should return contract when found", async () => {
      contractRepo.findOne.mockResolvedValue(mockContract);

      const result = await service.findById(contractId, orgId);

      expect(result).toEqual(mockContract);
    });

    it("should throw NotFoundException when contract not found", async () => {
      contractRepo.findOne.mockResolvedValue(null);

      await expect(service.findById("nonexistent", orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update a non-terminated contract", async () => {
      contractRepo.findOne.mockResolvedValue(mockContract);
      contractRepo.save.mockResolvedValue(mockContract);

      const result = await service.update(contractId, orgId, {
        commissionRate: 20,
      });

      expect(result).toBeDefined();
      expect(contractRepo.save).toHaveBeenCalled();
    });

    it("should throw BadRequestException when updating terminated contract", async () => {
      const terminatedContract = {
        ...mockContract,
        status: ContractStatus.TERMINATED,
      } as unknown as Contract;
      contractRepo.findOne.mockResolvedValue(terminatedContract);

      await expect(
        service.update(contractId, orgId, { commissionRate: 20 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("should soft-delete a DRAFT contract", async () => {
      contractRepo.findOne.mockResolvedValue(mockContract);
      contractRepo.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(contractId, orgId);

      expect(contractRepo.softDelete).toHaveBeenCalledWith(contractId);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "contract.deleted",
        expect.objectContaining({ contractId }),
      );
    });

    it("should throw BadRequestException when deleting non-DRAFT contract", async () => {
      const activeContract = {
        ...mockContract,
        status: ContractStatus.ACTIVE,
      } as unknown as Contract;
      contractRepo.findOne.mockResolvedValue(activeContract);

      await expect(service.remove(contractId, orgId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("activate", () => {
    it("should activate a DRAFT contract", async () => {
      const draftContract = { ...mockContract } as unknown as Contract;
      contractRepo.findOne.mockResolvedValue(draftContract);
      contractRepo.save.mockImplementation(async (c) => c as Contract);

      const result = await service.activate(contractId, orgId);

      expect(result.status).toBe(ContractStatus.ACTIVE);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "contract.activated",
        expect.any(Object),
      );
    });

    it("should throw BadRequestException when activating non-DRAFT contract", async () => {
      const activeContract = {
        ...mockContract,
        status: ContractStatus.ACTIVE,
      } as unknown as Contract;
      contractRepo.findOne.mockResolvedValue(activeContract);

      await expect(service.activate(contractId, orgId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("suspend", () => {
    it("should suspend an ACTIVE contract", async () => {
      const activeContract = {
        ...mockContract,
        status: ContractStatus.ACTIVE,
      } as unknown as Contract;
      contractRepo.findOne.mockResolvedValue(activeContract);
      contractRepo.save.mockImplementation(async (c) => c as Contract);

      const result = await service.suspend(contractId, orgId);

      expect(result.status).toBe(ContractStatus.SUSPENDED);
    });

    it("should throw BadRequestException when suspending non-ACTIVE contract", async () => {
      contractRepo.findOne.mockResolvedValue(mockContract);

      await expect(service.suspend(contractId, orgId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("terminate", () => {
    it("should terminate an ACTIVE contract", async () => {
      const activeContract = {
        ...mockContract,
        status: ContractStatus.ACTIVE,
      } as unknown as Contract;
      contractRepo.findOne.mockResolvedValue(activeContract);
      contractRepo.save.mockImplementation(async (c) => c as Contract);

      const result = await service.terminate(contractId, orgId);

      expect(result.status).toBe(ContractStatus.TERMINATED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "contract.terminated",
        expect.any(Object),
      );
    });

    it("should throw BadRequestException when terminating already terminated contract", async () => {
      const terminated = {
        ...mockContract,
        status: ContractStatus.TERMINATED,
      } as unknown as Contract;
      contractRepo.findOne.mockResolvedValue(terminated);

      await expect(service.terminate(contractId, orgId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated contracts", async () => {
      const result = await service.findAll(orgId, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });
});
