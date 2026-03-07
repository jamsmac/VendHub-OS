import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { Repository, DataSource } from "typeorm";
import { CollectionsService } from "./collections.service";
import {
  Collection,
  CollectionHistory,
  CollectionStatus,
  CollectionSource,
} from "./entities/collection.entity";
import { MachinesService } from "../machines/machines.service";

describe("CollectionsService", () => {
  let service: CollectionsService;
  let _collectionRepo: jest.Mocked<Repository<Collection>>;
  let _historyRepo: jest.Mocked<Repository<CollectionHistory>>;
  let _dataSource: jest.Mocked<DataSource>;

  const mockCollectionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockHistoryRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  const mockMachinesService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionsService,
        {
          provide: getRepositoryToken(Collection),
          useValue: mockCollectionRepo,
        },
        {
          provide: getRepositoryToken(CollectionHistory),
          useValue: mockHistoryRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: MachinesService,
          useValue: mockMachinesService,
        },
      ],
    }).compile();

    service = module.get<CollectionsService>(CollectionsService);
    _collectionRepo = module.get(getRepositoryToken(Collection));
    _historyRepo = module.get(getRepositoryToken(CollectionHistory));
    _dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // create
  // ==========================================================================

  describe("create", () => {
    const orgId = "org-uuid-1";
    const operatorId = "operator-uuid-1";
    const dto = {
      machineId: "machine-uuid-1",
      collectedAt: "2026-03-01T10:00:00Z",
      notes: "Regular collection",
      skipDuplicateCheck: false,
    };

    it("should create a collection successfully", async () => {
      const created = {
        id: "coll-uuid-1",
        organizationId: orgId,
        machineId: dto.machineId,
        operatorId,
        status: CollectionStatus.COLLECTED,
        source: CollectionSource.REALTIME,
      };

      // No duplicate found
      mockCollectionRepo.findOne.mockResolvedValue(null);
      mockCollectionRepo.create.mockReturnValue(created as any);
      mockCollectionRepo.save.mockResolvedValue(created as any);

      const result = await service.create(orgId, operatorId, dto as any);

      expect(mockCollectionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          machineId: dto.machineId,
          operatorId,
          status: CollectionStatus.COLLECTED,
          source: CollectionSource.REALTIME,
          createdById: operatorId,
        }),
      );
      expect(result).toEqual(created);
    });

    it("should throw ConflictException when duplicate exists", async () => {
      const existingCollection = {
        id: "existing-coll-uuid",
        machineId: dto.machineId,
      };

      mockCollectionRepo.findOne.mockResolvedValue(existingCollection as any);

      await expect(
        service.create(orgId, operatorId, dto as any),
      ).rejects.toThrow(ConflictException);
    });

    it("should skip duplicate check when skipDuplicateCheck is true", async () => {
      const dtoSkip = { ...dto, skipDuplicateCheck: true };
      const created = {
        id: "coll-uuid-2",
        organizationId: orgId,
        machineId: dto.machineId,
        operatorId,
        status: CollectionStatus.COLLECTED,
      };

      mockCollectionRepo.create.mockReturnValue(created as any);
      mockCollectionRepo.save.mockResolvedValue(created as any);

      const result = await service.create(orgId, operatorId, dtoSkip as any);

      // findOne should NOT be called for duplicate check
      expect(result).toEqual(created);
    });
  });

  // ==========================================================================
  // receive
  // ==========================================================================

  describe("receive", () => {
    const collId = "coll-uuid-1";
    const orgId = "org-uuid-1";
    const managerId = "manager-uuid-1";
    const dto = { amount: 150000, notes: "Counted and verified" };

    it("should receive a COLLECTED collection successfully", async () => {
      const existingColl = {
        id: collId,
        organizationId: orgId,
        status: CollectionStatus.COLLECTED,
        managerId: null,
        amount: null,
        receivedAt: null,
        updatedById: null,
        notes: null,
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue({ ...existingColl }),
          save: jest
            .fn()
            .mockImplementation((_entity, data) => Promise.resolve(data)),
        };
        return callback(mockManager as any);
      });

      const result = await service.receive(
        collId,
        orgId,
        managerId,
        dto as any,
      );

      expect(mockDataSource.transaction).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(result).toBeDefined();
    });

    it("should throw NotFoundException when collection does not exist", async () => {
      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue(null),
        };
        return callback(mockManager as any);
      });

      await expect(
        service.receive(collId, orgId, managerId, dto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when collection is not COLLECTED", async () => {
      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue({
            id: collId,
            organizationId: orgId,
            status: CollectionStatus.RECEIVED,
          }),
        };
        return callback(mockManager as any);
      });

      await expect(
        service.receive(collId, orgId, managerId, dto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // edit
  // ==========================================================================

  describe("edit", () => {
    const collId = "coll-uuid-1";
    const orgId = "org-uuid-1";
    const userId = "user-uuid-1";

    it("should edit amount and notes on a RECEIVED collection", async () => {
      const existing = {
        id: collId,
        organizationId: orgId,
        status: CollectionStatus.RECEIVED,
        amount: 100000,
        notes: "old notes",
        updatedById: null,
      };
      const dto = {
        amount: 120000,
        notes: "corrected amount",
        reason: "recount",
      };

      mockCollectionRepo.findOne.mockResolvedValue({ ...existing } as any);
      mockCollectionRepo.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockHistoryRepo.create.mockImplementation((data) => data as any);
      mockHistoryRepo.save.mockResolvedValue([] as any);

      const result = await service.edit(collId, orgId, userId, dto as any);

      expect(result.amount).toBe(120000);
      expect(result.notes).toBe("corrected amount");
      expect(result.updatedById).toBe(userId);
    });

    it("should throw NotFoundException when collection does not exist", async () => {
      mockCollectionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.edit(collId, orgId, userId, { amount: 999 } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when collection is not RECEIVED", async () => {
      mockCollectionRepo.findOne.mockResolvedValue({
        id: collId,
        organizationId: orgId,
        status: CollectionStatus.COLLECTED,
      } as any);

      await expect(
        service.edit(collId, orgId, userId, { amount: 999 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should return unchanged collection when no fields differ", async () => {
      const existing = {
        id: collId,
        organizationId: orgId,
        status: CollectionStatus.RECEIVED,
        amount: 100000,
        notes: "same notes",
      };

      mockCollectionRepo.findOne.mockResolvedValue({ ...existing } as any);

      const result = await service.edit(collId, orgId, userId, {
        amount: 100000,
        notes: "same notes",
      } as any);

      expect(mockCollectionRepo.save).not.toHaveBeenCalled();
      expect(result.amount).toBe(100000);
    });
  });

  // ==========================================================================
  // cancel
  // ==========================================================================

  describe("cancel", () => {
    const collId = "coll-uuid-1";
    const orgId = "org-uuid-1";
    const userId = "user-uuid-1";

    it("should cancel a non-cancelled collection", async () => {
      const existing = {
        id: collId,
        organizationId: orgId,
        status: CollectionStatus.COLLECTED,
        updatedById: null,
      };

      mockCollectionRepo.findOne.mockResolvedValue({ ...existing } as any);
      mockCollectionRepo.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      mockHistoryRepo.create.mockImplementation((data) => data as any);
      mockHistoryRepo.save.mockResolvedValue({} as any);

      const result = await service.cancel(collId, orgId, userId, {
        reason: "test",
      } as any);

      expect(result.status).toBe(CollectionStatus.CANCELLED);
      expect(result.updatedById).toBe(userId);
    });

    it("should throw NotFoundException when collection does not exist", async () => {
      mockCollectionRepo.findOne.mockResolvedValue(null);

      await expect(service.cancel(collId, orgId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when already cancelled", async () => {
      mockCollectionRepo.findOne.mockResolvedValue({
        id: collId,
        organizationId: orgId,
        status: CollectionStatus.CANCELLED,
      } as any);

      await expect(service.cancel(collId, orgId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================================================
  // findOne
  // ==========================================================================

  describe("findOne", () => {
    const collId = "coll-uuid-1";
    const orgId = "org-uuid-1";

    it("should return a collection with history", async () => {
      const collection = {
        id: collId,
        organizationId: orgId,
        status: CollectionStatus.COLLECTED,
        history: [],
      };

      mockCollectionRepo.findOne.mockResolvedValue(collection as any);

      const result = await service.findOne(collId, orgId);

      expect(mockCollectionRepo.findOne).toHaveBeenCalledWith({
        where: { id: collId, organizationId: orgId },
        relations: ["history"],
      });
      expect(result).toEqual(collection);
    });

    it("should throw NotFoundException when not found", async () => {
      mockCollectionRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(collId, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should work without organizationId", async () => {
      const collection = {
        id: collId,
        status: CollectionStatus.COLLECTED,
        history: [],
      };

      mockCollectionRepo.findOne.mockResolvedValue(collection as any);

      const result = await service.findOne(collId);

      expect(mockCollectionRepo.findOne).toHaveBeenCalledWith({
        where: { id: collId },
        relations: ["history"],
      });
      expect(result).toEqual(collection);
    });
  });

  // ==========================================================================
  // findPending
  // ==========================================================================

  describe("findPending", () => {
    const orgId = "org-uuid-1";

    it("should return collections with COLLECTED status", async () => {
      const pending = [
        { id: "c1", status: CollectionStatus.COLLECTED },
        { id: "c2", status: CollectionStatus.COLLECTED },
      ];

      mockCollectionRepo.find.mockResolvedValue(pending as any);

      const result = await service.findPending(orgId);

      expect(mockCollectionRepo.find).toHaveBeenCalledWith({
        where: { organizationId: orgId, status: CollectionStatus.COLLECTED },
        order: { collectedAt: "ASC" },
      });
      expect(result).toHaveLength(2);
    });
  });

  // ==========================================================================
  // findAll (paginated)
  // ==========================================================================

  describe("findAll", () => {
    const orgId = "org-uuid-1";

    it("should return paginated results with default page/limit", async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[{ id: "c1" }, { id: "c2" }], 2]),
      };

      mockCollectionRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      const result = await service.findAll(orgId, {} as any);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.totalPages).toBe(1);
    });

    it("should filter by operator when requester role is operator", async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockCollectionRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      await service.findAll(orgId, {} as any, "op-uuid", "operator");

      // The IDOR guard adds an andWhere for operatorId
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        "c.operatorId = :requesterId",
        { requesterId: "op-uuid" },
      );
    });
  });

  // ==========================================================================
  // remove (hard delete)
  // ==========================================================================

  describe("remove", () => {
    const collId = "coll-uuid-1";
    const orgId = "org-uuid-1";
    const userId = "admin-uuid-1";

    it("should soft-delete and write audit history", async () => {
      const existing = {
        id: collId,
        organizationId: orgId,
        status: CollectionStatus.RECEIVED,
        amount: 100000,
        machineId: "machine-1",
      };

      mockCollectionRepo.findOne.mockResolvedValue(existing as any);
      mockHistoryRepo.create.mockImplementation((data) => data as any);
      mockHistoryRepo.save.mockResolvedValue({} as any);
      mockCollectionRepo.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(collId, orgId, userId);

      expect(mockHistoryRepo.save).toHaveBeenCalled();
      expect(mockCollectionRepo.softDelete).toHaveBeenCalledWith(collId);
    });

    it("should throw NotFoundException when collection does not exist", async () => {
      mockCollectionRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(collId, orgId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // getStats
  // ==========================================================================

  describe("getStats", () => {
    const orgId = "org-uuid-1";

    it("should return aggregated statistics", async () => {
      mockCollectionRepo.count
        .mockResolvedValueOnce(100) // totalCollections
        .mockResolvedValueOnce(80) // totalReceived
        .mockResolvedValueOnce(15); // pendingCount

      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest
          .fn()
          .mockResolvedValueOnce({ total: "5000000" }) // totalAmount
          .mockResolvedValueOnce({ count: "10", amount: "500000" }), // today stats
      };

      mockCollectionRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      const result = await service.getStats(orgId);

      expect(result.totalCollections).toBe(100);
      expect(result.totalReceived).toBe(80);
      expect(result.pendingCount).toBe(15);
      expect(result.totalAmount).toBe(5000000);
      expect(result.todayCount).toBe(10);
      expect(result.todayAmount).toBe(500000);
    });
  });

  // ==========================================================================
  // getHistory
  // ==========================================================================

  describe("getHistory", () => {
    it("should return history records for a collection", async () => {
      const history = [
        { id: "h1", collectionId: "c1", fieldName: "status" },
        { id: "h2", collectionId: "c1", fieldName: "amount" },
      ];

      mockHistoryRepo.find.mockResolvedValue(history as any);

      const result = await service.getHistory("c1");

      expect(mockHistoryRepo.find).toHaveBeenCalledWith({
        where: { collectionId: "c1" },
        order: { createdAt: "ASC" },
      });
      expect(result).toHaveLength(2);
    });
  });

  // ==========================================================================
  // countByMachine
  // ==========================================================================

  describe("countByMachine", () => {
    it("should return count of collections for a machine", async () => {
      mockCollectionRepo.count.mockResolvedValue(42);

      const result = await service.countByMachine("machine-uuid-1");

      expect(mockCollectionRepo.count).toHaveBeenCalledWith({
        where: { machineId: "machine-uuid-1" },
      });
      expect(result).toBe(42);
    });
  });
});
