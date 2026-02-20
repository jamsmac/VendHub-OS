import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";

import { ContainersService } from "./containers.service";
import { Container, ContainerStatus } from "./entities/container.entity";

describe("ContainersService", () => {
  let service: ContainersService;
  let containerRepository: jest.Mocked<Repository<Container>>;

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";
  const machineId = "machine-uuid-1";

  const createMockContainer = (overrides?: Partial<Container>): Container =>
    ({
      id: "container-uuid-1",
      organizationId: orgId,
      machineId,
      nomenclatureId: "product-uuid-1",
      slotNumber: 1,
      name: "Hopper A1",
      capacity: 1000,
      currentQuantity: 500,
      unit: "g",
      minLevel: 100,
      lastRefillDate: null,
      status: ContainerStatus.ACTIVE,
      metadata: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      createdById: userId,
      updatedById: null,
      ...overrides,
    }) as unknown as Container;

  let mockContainer: Container;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest
      .fn()
      .mockImplementation(() => Promise.resolve([mockContainer])),
    getCount: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContainersService,
        {
          provide: getRepositoryToken(Container),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<ContainersService>(ContainersService);
    containerRepository = module.get(getRepositoryToken(Container));

    // Reset mockContainer for each test to avoid mutation leakage
    mockContainer = createMockContainer();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // findAll
  // ============================================================================

  describe("findAll", () => {
    it("should return paginated containers for organization", async () => {
      const result = await service.findAll(orgId, { page: 1, limit: 20 });

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total", 1);
      expect(result).toHaveProperty("page", 1);
      expect(result).toHaveProperty("totalPages", 1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "container.organizationId = :organizationId",
        { organizationId: orgId },
      );
    });

    it("should filter by machineId", async () => {
      await service.findAll(orgId, { machineId, page: 1, limit: 20 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "container.machineId = :machineId",
        { machineId },
      );
    });

    it("should filter by status", async () => {
      await service.findAll(orgId, {
        status: ContainerStatus.ACTIVE,
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "container.status = :status",
        { status: ContainerStatus.ACTIVE },
      );
    });

    it("should cap limit at 100", async () => {
      const result = await service.findAll(orgId, { page: 1, limit: 200 });

      expect(result.limit).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================================
  // findOne
  // ============================================================================

  describe("findOne", () => {
    it("should return container when found", async () => {
      containerRepository.findOne.mockResolvedValue(mockContainer);

      const result = await service.findOne("container-uuid-1", orgId);

      expect(result).toEqual(mockContainer);
      expect(containerRepository.findOne).toHaveBeenCalledWith({
        where: { id: "container-uuid-1", organizationId: orgId },
        relations: ["machine", "nomenclature"],
      });
    });

    it("should throw NotFoundException when container not found", async () => {
      containerRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne("non-existent", orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================================
  // findByMachine
  // ============================================================================

  describe("findByMachine", () => {
    it("should return containers ordered by slotNumber", async () => {
      containerRepository.find.mockResolvedValue([mockContainer]);

      const result = await service.findByMachine(machineId, orgId);

      expect(result).toEqual([mockContainer]);
      expect(containerRepository.find).toHaveBeenCalledWith({
        where: { machineId, organizationId: orgId },
        order: { slotNumber: "ASC" },
      });
    });
  });

  // ============================================================================
  // create
  // ============================================================================

  describe("create", () => {
    it("should create a new container", async () => {
      containerRepository.findOne.mockResolvedValue(null); // no duplicate
      containerRepository.create.mockReturnValue(mockContainer);
      containerRepository.save.mockResolvedValue(mockContainer);

      const result = await service.create(
        {
          machineId,
          slotNumber: 1,
          capacity: 1000,
        },
        orgId,
        userId,
      );

      expect(result).toEqual(mockContainer);
      expect(containerRepository.create).toHaveBeenCalled();
      expect(containerRepository.save).toHaveBeenCalledWith(mockContainer);
    });

    it("should throw BadRequestException for duplicate slot number", async () => {
      containerRepository.findOne.mockResolvedValue(mockContainer);

      await expect(
        service.create(
          {
            machineId,
            slotNumber: 1,
            capacity: 1000,
          },
          orgId,
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // update
  // ============================================================================

  describe("update", () => {
    it("should update container when found", async () => {
      const updatedContainer = {
        ...mockContainer,
        name: "Hopper B2",
      } as unknown as Container;

      containerRepository.findOne.mockResolvedValue(mockContainer);
      containerRepository.save.mockResolvedValue(updatedContainer);

      const result = await service.update(
        "container-uuid-1",
        { name: "Hopper B2" },
        orgId,
        userId,
      );

      expect(result.name).toBe("Hopper B2");
    });

    it("should throw NotFoundException when container not found", async () => {
      containerRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update("non-existent", { name: "X" }, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should auto-transition to EMPTY when currentQuantity = 0", async () => {
      const zeroContainer = {
        ...mockContainer,
        currentQuantity: 0,
        status: ContainerStatus.ACTIVE,
      } as unknown as Container;
      const savedContainer = {
        ...zeroContainer,
        status: ContainerStatus.EMPTY,
      } as unknown as Container;

      containerRepository.findOne.mockResolvedValue(zeroContainer);
      containerRepository.save.mockResolvedValue(savedContainer);

      const result = await service.update(
        "container-uuid-1",
        { currentQuantity: 0 },
        orgId,
      );

      expect(result.status).toBe(ContainerStatus.EMPTY);
    });

    it("should validate unique slot when changing slotNumber", async () => {
      containerRepository.findOne
        .mockResolvedValueOnce(mockContainer) // findOne (the container being updated)
        .mockResolvedValueOnce({
          ...mockContainer,
          id: "other-container-uuid",
          slotNumber: 2,
        } as unknown as Container); // duplicate check

      await expect(
        service.update("container-uuid-1", { slotNumber: 2 }, orgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // refill
  // ============================================================================

  describe("refill", () => {
    it("should refill container successfully", async () => {
      const refilledContainer = {
        ...mockContainer,
        currentQuantity: 700,
        lastRefillDate: new Date(),
        metadata: { refillHistory: [] },
      } as unknown as Container;

      containerRepository.findOne.mockResolvedValue(mockContainer);
      containerRepository.save.mockResolvedValue(refilledContainer);

      const result = await service.refill(
        "container-uuid-1",
        { quantity: 200 },
        orgId,
        userId,
      );

      expect(result.currentQuantity).toBe(700);
      expect(containerRepository.save).toHaveBeenCalled();
    });

    it("should throw BadRequestException when refill exceeds capacity", async () => {
      containerRepository.findOne.mockResolvedValue(mockContainer);

      await expect(
        service.refill(
          "container-uuid-1",
          { quantity: 600 }, // 500 + 600 = 1100 > 1000
          orgId,
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should transition from EMPTY to ACTIVE on refill", async () => {
      const emptyContainer = {
        ...mockContainer,
        currentQuantity: 0,
        status: ContainerStatus.EMPTY,
        metadata: null,
      } as unknown as Container;

      containerRepository.findOne.mockResolvedValue(emptyContainer);
      containerRepository.save.mockImplementation(
        async (entity) => entity as Container,
      );

      const result = await service.refill(
        "container-uuid-1",
        { quantity: 200 },
        orgId,
        userId,
      );

      expect(result.status).toBe(ContainerStatus.ACTIVE);
    });

    it("should store refill history in metadata", async () => {
      containerRepository.findOne.mockResolvedValue({
        ...mockContainer,
        metadata: null,
      } as unknown as Container);
      containerRepository.save.mockImplementation(
        async (entity) => entity as Container,
      );

      const result = await service.refill(
        "container-uuid-1",
        { quantity: 100, notes: "Regular refill", batchNumber: "B-001" },
        orgId,
        userId,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = result.metadata as any;
      expect(metadata.refillHistory).toBeDefined();
      expect(metadata.refillHistory).toHaveLength(1);
      expect(metadata.refillHistory[0].quantity).toBe(100);
      expect(metadata.refillHistory[0].batchNumber).toBe("B-001");
    });
  });

  // ============================================================================
  // deductQuantity
  // ============================================================================

  describe("deductQuantity", () => {
    it("should deduct quantity successfully", async () => {
      const fresh = createMockContainer({ currentQuantity: 500 });
      containerRepository.findOne.mockResolvedValue(fresh);
      containerRepository.save.mockImplementation(
        async (entity) => entity as Container,
      );

      const result = await service.deductQuantity(
        "container-uuid-1",
        100,
        orgId,
      );

      expect(Number(result.currentQuantity)).toBe(400);
    });

    it("should throw BadRequestException when insufficient quantity", async () => {
      const fresh = createMockContainer({ currentQuantity: 500 });
      containerRepository.findOne.mockResolvedValue(fresh);

      await expect(
        service.deductQuantity("container-uuid-1", 600, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should auto-transition to EMPTY when deducted to zero", async () => {
      const fresh = createMockContainer({ currentQuantity: 500 });
      containerRepository.findOne.mockResolvedValue(fresh);
      containerRepository.save.mockImplementation(
        async (entity) => entity as Container,
      );

      const result = await service.deductQuantity(
        "container-uuid-1",
        500,
        orgId,
      );

      expect(result.status).toBe(ContainerStatus.EMPTY);
    });
  });

  // ============================================================================
  // remove
  // ============================================================================

  describe("remove", () => {
    it("should soft delete container when found", async () => {
      containerRepository.findOne.mockResolvedValue(mockContainer);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      containerRepository.softDelete.mockResolvedValue(undefined as any);

      await service.remove("container-uuid-1", orgId);

      expect(containerRepository.softDelete).toHaveBeenCalledWith(
        "container-uuid-1",
      );
    });

    it("should throw NotFoundException when container not found", async () => {
      containerRepository.findOne.mockResolvedValue(null);

      await expect(service.remove("non-existent", orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================================
  // checkLowLevels
  // ============================================================================

  describe("checkLowLevels", () => {
    it("should return containers below min level", async () => {
      const lowContainer = {
        ...mockContainer,
        currentQuantity: 50, // below minLevel of 100
        minLevel: 100,
        capacity: 1000,
      } as unknown as Container;

      containerRepository.find.mockResolvedValue([lowContainer]);

      const result = await service.checkLowLevels(machineId, orgId);

      expect(result).toHaveLength(1);
      expect(result[0].fillPercentage).toBe(5);
      expect(result[0].deficit).toBe(950);
    });

    it("should return empty array when all containers are above min level", async () => {
      const aboveMin = createMockContainer({
        currentQuantity: 500,
        minLevel: 100,
      });
      containerRepository.find.mockResolvedValue([aboveMin]); // 500 > 100

      const result = await service.checkLowLevels(machineId, orgId);

      expect(result).toHaveLength(0);
    });

    it("should skip containers without minLevel set", async () => {
      const noMinContainer = {
        ...mockContainer,
        minLevel: null,
        currentQuantity: 0,
      } as unknown as Container;

      containerRepository.find.mockResolvedValue([noMinContainer]);

      const result = await service.checkLowLevels(machineId, orgId);

      expect(result).toHaveLength(0);
    });
  });

  // ============================================================================
  // getStatsByMachine
  // ============================================================================

  describe("getStatsByMachine", () => {
    it("should return stats for machine containers", async () => {
      const containers = [
        {
          ...mockContainer,
          status: ContainerStatus.ACTIVE,
          capacity: 1000,
          currentQuantity: 500,
        },
        {
          ...mockContainer,
          id: "c2",
          status: ContainerStatus.ACTIVE,
          capacity: 1000,
          currentQuantity: 800,
        },
        {
          ...mockContainer,
          id: "c3",
          status: ContainerStatus.EMPTY,
          capacity: 1000,
          currentQuantity: 0,
        },
        {
          ...mockContainer,
          id: "c4",
          status: ContainerStatus.MAINTENANCE,
          capacity: 1000,
          currentQuantity: 200,
        },
      ] as unknown as Container[];

      containerRepository.find.mockResolvedValue(containers);

      const result = await service.getStatsByMachine(machineId, orgId);

      expect(result.total).toBe(4);
      expect(result.active).toBe(2);
      expect(result.empty).toBe(1);
      expect(result.maintenance).toBe(1);
      expect(result.avgFillPercentage).toBeGreaterThanOrEqual(0);
    });

    it("should return zeros when no containers exist", async () => {
      containerRepository.find.mockResolvedValue([]);

      const result = await service.getStatsByMachine(machineId, orgId);

      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
      expect(result.empty).toBe(0);
      expect(result.maintenance).toBe(0);
      expect(result.avgFillPercentage).toBe(0);
    });
  });

  // ============================================================================
  // organizationId filtering
  // ============================================================================

  describe("organization isolation", () => {
    it("findOne should filter by organizationId", async () => {
      containerRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne("container-uuid-1", "wrong-org-id"),
      ).rejects.toThrow(NotFoundException);

      expect(containerRepository.findOne).toHaveBeenCalledWith({
        where: { id: "container-uuid-1", organizationId: "wrong-org-id" },
        relations: ["machine", "nomenclature"],
      });
    });
  });
});
