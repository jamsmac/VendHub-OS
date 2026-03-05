import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { AccessRequestsService } from "./access-requests.service";
import {
  AccessRequest,
  AccessRequestStatus,
  AccessRequestSource,
} from "../telegram-bot/entities/access-request.entity";
import { UsersService } from "../users/users.service";
import { UserRole } from "../../common/enums";

// Mock bcrypt to avoid native module loading issues
jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
  compare: jest.fn().mockResolvedValue(true),
}));

describe("AccessRequestsService", () => {
  let service: AccessRequestsService;
  let accessRequestRepo: jest.Mocked<Repository<AccessRequest>>;
  let usersService: jest.Mocked<UsersService>;

  const orgId = "550e8400-e29b-41d4-a716-446655440000";
  const userId = "550e8400-e29b-41d4-a716-446655440001";
  const adminUserId = "550e8400-e29b-41d4-a716-446655440002";

  const mockAccessRequestBase = {
    id: "550e8400-e29b-41d4-a716-446655440003",
    organizationId: orgId,
    telegramId: "12345678",
    telegramUsername: "testuser",
    telegramFirstName: "Test",
    telegramLastName: "User",
    source: AccessRequestSource.TELEGRAM,
    status: AccessRequestStatus.NEW,
    processedByUserId: null,
    processedBy: null,
    processedAt: null,
    rejectionReason: null,
    createdUserId: null,
    createdUser: null,
    metadata: null,
    notes: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null,
    createdById: null,
    updatedById: null,
  };

  const mockAccessRequest = mockAccessRequestBase as unknown as AccessRequest;

  const createMockQueryBuilder = (result: unknown[] = [], count = 1) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
    getOne: jest.fn().mockResolvedValue(result[0] || null),
    getCount: jest.fn().mockResolvedValue(count),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(result),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessRequestsService,
        {
          provide: getRepositoryToken(AccessRequest),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AccessRequestsService>(AccessRequestsService);
    accessRequestRepo = module.get(getRepositoryToken(AccessRequest));
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // create
  // ==========================================================================

  describe("create", () => {
    it("should create a new access request", async () => {
      const dto = {
        telegramId: "12345678",
        telegramUsername: "testuser",
        telegramFirstName: "Test",
        telegramLastName: "User",
        source: AccessRequestSource.TELEGRAM,
      };

      accessRequestRepo.findOne.mockResolvedValue(null);
      accessRequestRepo.create.mockReturnValue(
        mockAccessRequest as unknown as AccessRequest,
      );
      accessRequestRepo.save.mockResolvedValue(mockAccessRequest);

      const result = await service.create(dto);

      expect(result).toEqual(mockAccessRequest);
      expect(accessRequestRepo.findOne).toHaveBeenCalledWith({
        where: {
          telegramId: "12345678",
          status: AccessRequestStatus.NEW,
        },
      });
      expect(accessRequestRepo.create).toHaveBeenCalled();
      expect(accessRequestRepo.save).toHaveBeenCalled();
    });

    it("should throw ConflictException if pending request already exists", async () => {
      const dto = {
        telegramId: "12345678",
        telegramUsername: "testuser",
        telegramFirstName: "Test",
        telegramLastName: "User",
        source: AccessRequestSource.TELEGRAM,
      };

      const existingRequest = {
        ...mockAccessRequest,
        status: AccessRequestStatus.NEW,
      };

      accessRequestRepo.findOne.mockResolvedValue(existingRequest);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(accessRequestRepo.findOne).toHaveBeenCalledWith({
        where: {
          telegramId: "12345678",
          status: AccessRequestStatus.NEW,
        },
      });
    });

    it("should allow creating a request if previous one was rejected", async () => {
      const dto = {
        telegramId: "12345678",
        telegramUsername: "testuser",
        telegramFirstName: "Test",
        telegramLastName: "User",
        source: AccessRequestSource.TELEGRAM,
      };

      accessRequestRepo.findOne.mockResolvedValue(null);
      accessRequestRepo.create.mockReturnValue(mockAccessRequest);
      accessRequestRepo.save.mockResolvedValue(mockAccessRequest);

      const result = await service.create(dto);

      expect(result).toEqual(mockAccessRequest);
      expect(accessRequestRepo.save).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // findAll
  // ==========================================================================

  describe("findAll", () => {
    it("should return paginated access requests", async () => {
      const mockQB = createMockQueryBuilder([mockAccessRequest], 1);
      accessRequestRepo.createQueryBuilder.mockReturnValue(
        mockQB as unknown as ReturnType<
          Repository<AccessRequest>["createQueryBuilder"]
        >,
      );

      const result = await service.findAll(orgId, { page: 1, limit: 50 });

      expect(result.data).toEqual([mockAccessRequest]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
      expect(mockQB.where).toHaveBeenCalledWith(
        "ar.organizationId = :organizationId",
        { organizationId: orgId },
      );
    });

    it("should filter by status", async () => {
      const mockQB = createMockQueryBuilder([mockAccessRequest], 1);
      accessRequestRepo.createQueryBuilder.mockReturnValue(
        mockQB as unknown as ReturnType<
          Repository<AccessRequest>["createQueryBuilder"]
        >,
      );

      await service.findAll(orgId, {
        page: 1,
        limit: 50,
        status: AccessRequestStatus.APPROVED,
      });

      expect(mockQB.andWhere).toHaveBeenCalledWith("ar.status = :status", {
        status: AccessRequestStatus.APPROVED,
      });
    });

    it("should filter by source", async () => {
      const mockQB = createMockQueryBuilder([mockAccessRequest], 1);
      accessRequestRepo.createQueryBuilder.mockReturnValue(
        mockQB as unknown as ReturnType<
          Repository<AccessRequest>["createQueryBuilder"]
        >,
      );

      await service.findAll(orgId, {
        page: 1,
        limit: 50,
        source: AccessRequestSource.TELEGRAM,
      });

      expect(mockQB.andWhere).toHaveBeenCalledWith("ar.source = :source", {
        source: AccessRequestSource.TELEGRAM,
      });
    });

    it("should limit maximum to 100 items per page", async () => {
      const mockQB = createMockQueryBuilder([mockAccessRequest], 1);
      accessRequestRepo.createQueryBuilder.mockReturnValue(
        mockQB as unknown as ReturnType<
          Repository<AccessRequest>["createQueryBuilder"]
        >,
      );

      await service.findAll(orgId, { page: 1, limit: 200 });

      expect(mockQB.take).toHaveBeenCalledWith(100);
    });
  });

  // ==========================================================================
  // findById
  // ==========================================================================

  describe("findById", () => {
    it("should return an access request by id", async () => {
      accessRequestRepo.findOne.mockResolvedValue(mockAccessRequest);

      const result = await service.findById(
        "550e8400-e29b-41d4-a716-446655440003",
        orgId,
      );

      expect(result).toEqual(mockAccessRequest);
      expect(accessRequestRepo.findOne).toHaveBeenCalledWith({
        where: { id: "550e8400-e29b-41d4-a716-446655440003" },
        relations: ["processedBy", "createdUser"],
      });
    });

    it("should throw NotFoundException when request not found", async () => {
      accessRequestRepo.findOne.mockResolvedValue(null);

      await expect(service.findById("nonexistent-id", orgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException when orgId does not match", async () => {
      const requestFromOtherOrg = {
        ...mockAccessRequest,
        organizationId: "other-org-id",
      };
      accessRequestRepo.findOne.mockResolvedValue(requestFromOtherOrg);

      await expect(
        service.findById("550e8400-e29b-41d4-a716-446655440003", orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // approve
  // ==========================================================================

  describe("approve", () => {
    it("should approve an access request and create a user", async () => {
      const approveDto = {
        email: "newuser@example.com",
        password: "SecurePass123!",
        role: UserRole.OPERATOR,
      };

      const newUser = {
        id: userId,
        email: approveDto.email,
        firstName: "Test",
        lastName: "User",
        organizationId: orgId,
      };

      const approvedRequest = {
        ...mockAccessRequest,
        status: AccessRequestStatus.APPROVED,
        processedByUserId: adminUserId,
        processedAt: new Date(),
        createdUserId: userId,
      };

      accessRequestRepo.findOne.mockResolvedValue(mockAccessRequest);
      usersService.create.mockResolvedValue(newUser as never);
      accessRequestRepo.save.mockResolvedValue(approvedRequest);

      const result = await service.approve(
        "550e8400-e29b-41d4-a716-446655440003",
        adminUserId,
        orgId,
        approveDto,
      );

      expect(result.status).toBe(AccessRequestStatus.APPROVED);
      expect(result.processedByUserId).toBe(adminUserId);
      expect(result.createdUserId).toBe(userId);
      expect(usersService.create).toHaveBeenCalled();
      expect(accessRequestRepo.save).toHaveBeenCalled();
    });

    it("should throw BadRequestException if request is not NEW", async () => {
      const approvedRequest = {
        ...mockAccessRequest,
        status: AccessRequestStatus.APPROVED,
      };

      accessRequestRepo.findOne.mockResolvedValue(approvedRequest);

      await expect(
        service.approve(
          "550e8400-e29b-41d4-a716-446655440003",
          adminUserId,
          orgId,
          {
            email: "test@example.com",
            password: "pass",
            role: UserRole.OPERATOR,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException if request does not exist", async () => {
      accessRequestRepo.findOne.mockResolvedValue(null);

      await expect(
        service.approve("nonexistent-id", adminUserId, orgId, {
          email: "test@example.com",
          password: "pass",
          role: UserRole.OPERATOR,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // reject
  // ==========================================================================

  describe("reject", () => {
    it("should reject an access request", async () => {
      const rejectDto = {
        rejectionReason: "Suspicious activity detected",
      };

      const newRequest = {
        ...mockAccessRequest,
        status: AccessRequestStatus.NEW,
      };

      const rejectedRequest = {
        ...newRequest,
        status: AccessRequestStatus.REJECTED,
        processedByUserId: adminUserId,
        processedAt: new Date(),
        rejectionReason: rejectDto.rejectionReason,
      };

      accessRequestRepo.findOne.mockResolvedValue(newRequest);
      accessRequestRepo.save.mockResolvedValue(rejectedRequest);

      const result = await service.reject(
        "550e8400-e29b-41d4-a716-446655440003",
        adminUserId,
        orgId,
        rejectDto,
      );

      expect(result.status).toBe(AccessRequestStatus.REJECTED);
      expect(result.processedByUserId).toBe(adminUserId);
      expect(result.rejectionReason).toBe(rejectDto.rejectionReason);
      expect(accessRequestRepo.save).toHaveBeenCalled();
    });

    it("should throw BadRequestException if request is not NEW", async () => {
      const approvedRequest = {
        ...mockAccessRequest,
        status: AccessRequestStatus.APPROVED,
      };

      accessRequestRepo.findOne.mockResolvedValue(approvedRequest);

      await expect(
        service.reject(
          "550e8400-e29b-41d4-a716-446655440003",
          adminUserId,
          orgId,
          { rejectionReason: "Already approved" },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException if request does not exist", async () => {
      accessRequestRepo.findOne.mockResolvedValue(null);

      await expect(
        service.reject("nonexistent-id", adminUserId, orgId, {
          rejectionReason: "Not found",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // findPendingByTelegramId
  // ==========================================================================

  describe("findPendingByTelegramId", () => {
    it("should return pending access request by telegram id", async () => {
      accessRequestRepo.findOne.mockResolvedValue(mockAccessRequest);

      const result = await service.findPendingByTelegramId("12345678");

      expect(result).toEqual(mockAccessRequest);
      expect(accessRequestRepo.findOne).toHaveBeenCalledWith({
        where: {
          telegramId: "12345678",
          status: AccessRequestStatus.NEW,
        },
      });
    });

    it("should return null if no pending request exists", async () => {
      accessRequestRepo.findOne.mockResolvedValue(null);

      const result = await service.findPendingByTelegramId("nonexistent");

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // getStats
  // ==========================================================================

  describe("getStats", () => {
    it("should return stats grouped by status", async () => {
      const mockQB = createMockQueryBuilder(
        [
          { status: AccessRequestStatus.NEW, count: "5" },
          { status: AccessRequestStatus.APPROVED, count: "10" },
          { status: AccessRequestStatus.REJECTED, count: "2" },
        ],
        3,
      );

      accessRequestRepo.createQueryBuilder.mockReturnValue(
        mockQB as unknown as ReturnType<
          Repository<AccessRequest>["createQueryBuilder"]
        >,
      );

      const result = await service.getStats(orgId);

      expect(result).toEqual({
        [AccessRequestStatus.NEW]: 5,
        [AccessRequestStatus.APPROVED]: 10,
        [AccessRequestStatus.REJECTED]: 2,
      });
      expect(mockQB.where).toHaveBeenCalledWith(
        "ar.organizationId = :organizationId",
        { organizationId: orgId },
      );
    });

    it("should return empty stats when no data", async () => {
      const mockQB = createMockQueryBuilder([], 0);
      accessRequestRepo.createQueryBuilder.mockReturnValue(
        mockQB as unknown as ReturnType<
          Repository<AccessRequest>["createQueryBuilder"]
        >,
      );

      const result = await service.getStats(orgId);

      expect(result).toEqual({});
    });

    it("should return stats without orgId filter when not provided", async () => {
      const mockQB = createMockQueryBuilder(
        [{ status: AccessRequestStatus.NEW, count: "3" }],
        1,
      );

      accessRequestRepo.createQueryBuilder.mockReturnValue(
        mockQB as unknown as ReturnType<
          Repository<AccessRequest>["createQueryBuilder"]
        >,
      );

      const result = await service.getStats();

      expect(result).toEqual({
        [AccessRequestStatus.NEW]: 3,
      });
      expect(mockQB.where).not.toHaveBeenCalled();
    });
  });
});
