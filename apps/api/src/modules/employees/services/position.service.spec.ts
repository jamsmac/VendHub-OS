import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, ConflictException } from "@nestjs/common";

import { PositionService } from "./position.service";
import { Position, PositionLevel } from "../entities/position.entity";

const ORG_ID = "org-uuid-00000000-0000-0000-0000-000000000001";

describe("PositionService", () => {
  let service: PositionService;
  let positionRepo: any;

  const mockPosition = {
    id: "pos-uuid-1",
    organizationId: ORG_ID,
    title: "Senior Operator",
    code: "SR-OP",
    description: "Senior vending machine operator",
    departmentId: "dept-uuid-1",
    level: PositionLevel.SENIOR,
    minSalary: 3000000,
    maxSalary: 6000000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Position;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockPosition], 1]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.skip.mockReturnThis();
    mockQueryBuilder.take.mockReturnThis();
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockPosition], 1]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PositionService,
        {
          provide: getRepositoryToken(Position),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<PositionService>(PositionService);
    positionRepo = module.get(getRepositoryToken(Position));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createPosition", () => {
    it("should create a position successfully", async () => {
      positionRepo.findOne.mockResolvedValue(null);
      positionRepo.create.mockReturnValue(mockPosition);
      positionRepo.save.mockResolvedValue(mockPosition);

      const dto = {
        title: "Senior Operator",
        code: "SR-OP",
        level: PositionLevel.SENIOR,
        departmentId: "dept-uuid-1",
        minSalary: 3000000,
        maxSalary: 6000000,
      };

      const result = await service.createPosition(ORG_ID, dto);

      expect(result).toBeDefined();
      expect(result.id).toBe("pos-uuid-1");
      expect(positionRepo.save).toHaveBeenCalled();
    });

    it("should throw ConflictException when code already exists", async () => {
      positionRepo.findOne.mockResolvedValue(mockPosition);

      const dto = {
        title: "Another Position",
        code: "SR-OP",
        level: PositionLevel.JUNIOR,
      };

      await expect(service.createPosition(ORG_ID, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should default isActive to true when not provided", async () => {
      positionRepo.findOne.mockResolvedValue(null);
      positionRepo.create.mockReturnValue(mockPosition);
      positionRepo.save.mockResolvedValue(mockPosition);

      const dto = { title: "Tech Lead", code: "TL", level: PositionLevel.LEAD };

      await service.createPosition(ORG_ID, dto);

      expect(positionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });

    it("should set null for optional fields when not provided", async () => {
      positionRepo.findOne.mockResolvedValue(null);
      positionRepo.create.mockReturnValue(mockPosition);
      positionRepo.save.mockResolvedValue(mockPosition);

      const dto = { title: "Intern", code: "INT", level: PositionLevel.INTERN };

      await service.createPosition(ORG_ID, dto);

      expect(positionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
          departmentId: null,
          minSalary: null,
          maxSalary: null,
        }),
      );
    });
  });

  describe("updatePosition", () => {
    it("should update a position successfully", async () => {
      positionRepo.findOne.mockResolvedValue({ ...mockPosition });
      positionRepo.save.mockImplementation(async (p: any) => p);

      const result = await service.updatePosition("pos-uuid-1", ORG_ID, {
        title: "Lead Operator",
      });

      expect(result).toBeDefined();
      expect(positionRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when position not found", async () => {
      positionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updatePosition("non-existent", ORG_ID, { title: "New" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when changing to duplicate code", async () => {
      positionRepo.findOne
        .mockResolvedValueOnce({ ...mockPosition, code: "OLD-CODE" })
        .mockResolvedValueOnce({ id: "other-pos", code: "TAKEN" });

      await expect(
        service.updatePosition("pos-uuid-1", ORG_ID, { code: "TAKEN" }),
      ).rejects.toThrow(ConflictException);
    });

    it("should allow updating code when it does not conflict", async () => {
      positionRepo.findOne
        .mockResolvedValueOnce({ ...mockPosition, code: "OLD-CODE" })
        .mockResolvedValueOnce(null);
      positionRepo.save.mockImplementation(async (p: any) => p);

      const result = await service.updatePosition("pos-uuid-1", ORG_ID, {
        code: "NEW-CODE",
      });

      expect(result).toBeDefined();
    });

    it("should skip code uniqueness check when code unchanged", async () => {
      positionRepo.findOne.mockResolvedValueOnce({ ...mockPosition });
      positionRepo.save.mockImplementation(async (p: any) => p);

      await service.updatePosition("pos-uuid-1", ORG_ID, { code: "SR-OP" });

      expect(positionRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe("getPositions", () => {
    it("should return paginated positions", async () => {
      const result = await service.getPositions(ORG_ID, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should filter by search term", async () => {
      await service.getPositions(ORG_ID, { search: "Operator" });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "(p.title ILIKE :search OR p.code ILIKE :search)",
        { search: "%Operator%" },
      );
    });

    it("should filter by departmentId", async () => {
      await service.getPositions(ORG_ID, { departmentId: "dept-uuid-1" });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "p.departmentId = :departmentId",
        { departmentId: "dept-uuid-1" },
      );
    });

    it("should filter by isActive", async () => {
      await service.getPositions(ORG_ID, { isActive: true });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "p.isActive = :isActive",
        { isActive: true },
      );
    });
  });

  describe("getPosition", () => {
    it("should return a single position by id", async () => {
      positionRepo.findOne.mockResolvedValue(mockPosition);

      const result = await service.getPosition("pos-uuid-1", ORG_ID);

      expect(result.id).toBe("pos-uuid-1");
      expect(result.title).toBe("Senior Operator");
    });

    it("should throw NotFoundException when position not found", async () => {
      positionRepo.findOne.mockResolvedValue(null);

      await expect(service.getPosition("non-existent", ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
