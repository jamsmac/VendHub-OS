import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, ObjectLiteral, DataSource } from "typeorm";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InvitesService } from "./invites.service";
import { Invite, InviteStatus } from "./entities/invite.entity";
import { UserRole } from "../../common/enums";

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;
const createMockRepository = <
  T extends ObjectLiteral,
>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  setLock: jest.fn().mockReturnThis(),
});

const createMockQueryRunner = () => {
  const qb = createMockQueryBuilder();
  return {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      save: jest.fn(),
    },
    _qb: qb,
  };
};

describe("InvitesService", () => {
  let service: InvitesService;
  let inviteRepo: MockRepository<Invite>;
  let mockQueryRunner: ReturnType<typeof createMockQueryRunner>;

  const orgId = "org-1";
  const userId = "user-1";

  beforeEach(async () => {
    inviteRepo = createMockRepository<Invite>();
    mockQueryRunner = createMockQueryRunner();

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitesService,
        { provide: getRepositoryToken(Invite), useValue: inviteRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<InvitesService>(InvitesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // create
  // ==========================================================================

  describe("create", () => {
    it("should create an invite with default expiration and maxUses", async () => {
      const savedInvite = {
        id: "inv-1",
        code: "abc123def456",
        role: UserRole.OPERATOR,
        organizationId: orgId,
        createdById: userId,
        maxUses: 1,
        currentUses: 0,
        status: InviteStatus.ACTIVE,
        description: null,
      };
      inviteRepo.create!.mockReturnValue(savedInvite);
      inviteRepo.save!.mockResolvedValue(savedInvite);

      const result = await service.create(UserRole.OPERATOR, orgId, userId);

      expect(inviteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.OPERATOR,
          organizationId: orgId,
          createdById: userId,
          maxUses: 1,
          currentUses: 0,
          status: InviteStatus.ACTIVE,
          description: null,
          usedById: null,
          usedAt: null,
        }),
      );
      expect(inviteRepo.save).toHaveBeenCalledWith(savedInvite);
      expect(result).toEqual(savedInvite);
    });

    it("should create invite with custom expiration and maxUses", async () => {
      const savedInvite = { id: "inv-2", maxUses: 5 };
      inviteRepo.create!.mockReturnValue(savedInvite);
      inviteRepo.save!.mockResolvedValue(savedInvite);

      await service.create(UserRole.ADMIN, orgId, userId, 48, 5, "Test invite");

      expect(inviteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          maxUses: 5,
          description: "Test invite",
        }),
      );
    });

    it("should throw BadRequestException for owner role", async () => {
      await expect(
        service.create(UserRole.OWNER, orgId, userId),
      ).rejects.toThrow(BadRequestException);

      expect(inviteRepo.create).not.toHaveBeenCalled();
    });

    it("should generate a 12-char hex code", async () => {
      inviteRepo.create!.mockImplementation((data) => data);
      inviteRepo.save!.mockImplementation((data) => Promise.resolve(data));

      const result = await service.create(UserRole.OPERATOR, orgId, userId);

      expect(result.code).toMatch(/^[0-9a-f]{12}$/);
    });

    it("should set expiresAt based on expiresInHours", async () => {
      const before = Date.now();
      inviteRepo.create!.mockImplementation((data) => data);
      inviteRepo.save!.mockImplementation((data) => Promise.resolve(data));

      const result = await service.create(UserRole.OPERATOR, orgId, userId, 48);
      const after = Date.now();

      const expiresMs = result.expiresAt.getTime();
      // Should be ~48 hours from now
      expect(expiresMs).toBeGreaterThanOrEqual(
        before + 48 * 60 * 60 * 1000 - 1000,
      );
      expect(expiresMs).toBeLessThanOrEqual(after + 48 * 60 * 60 * 1000 + 1000);
    });
  });

  // ==========================================================================
  // findByCode
  // ==========================================================================

  describe("findByCode", () => {
    it("should return invite when found", async () => {
      const invite = { id: "inv-1", code: "abc123" };
      inviteRepo.findOne!.mockResolvedValue(invite);

      const result = await service.findByCode("abc123");

      expect(result).toEqual(invite);
      expect(inviteRepo.findOne).toHaveBeenCalledWith({
        where: { code: "abc123" },
      });
    });

    it("should return null when not found", async () => {
      inviteRepo.findOne!.mockResolvedValue(null);

      const result = await service.findByCode("nonexistent");

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // validateInvite
  // ==========================================================================

  describe("validateInvite", () => {
    it("should return valid invite", async () => {
      const invite = {
        id: "inv-1",
        code: "abc123",
        status: InviteStatus.ACTIVE,
        isExpired: false,
        isUsed: false,
      };
      inviteRepo.findOne!.mockResolvedValue(invite);

      const result = await service.validateInvite("abc123");

      expect(result).toEqual(invite);
    });

    it("should throw NotFoundException when invite not found", async () => {
      inviteRepo.findOne!.mockResolvedValue(null);

      await expect(service.validateInvite("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when invite is revoked", async () => {
      const invite = {
        id: "inv-1",
        status: InviteStatus.REVOKED,
        isExpired: false,
        isUsed: false,
      };
      inviteRepo.findOne!.mockResolvedValue(invite);

      await expect(service.validateInvite("abc123")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when invite is expired", async () => {
      const invite = {
        id: "inv-1",
        status: InviteStatus.ACTIVE,
        isExpired: true,
        isUsed: false,
      };
      inviteRepo.findOne!.mockResolvedValue(invite);

      await expect(service.validateInvite("abc123")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when invite is fully used", async () => {
      const invite = {
        id: "inv-1",
        status: InviteStatus.ACTIVE,
        isExpired: false,
        isUsed: true,
      };
      inviteRepo.findOne!.mockResolvedValue(invite);

      await expect(service.validateInvite("abc123")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================================================
  // claimInvite
  // ==========================================================================

  describe("claimInvite", () => {
    it("should claim a valid invite and increment currentUses", async () => {
      const invite = {
        id: "inv-1",
        code: "abc123",
        currentUses: 0,
        maxUses: 1,
        status: InviteStatus.ACTIVE,
        isValid: true,
        isExpired: false,
        usedById: null,
        usedAt: null,
      };
      mockQueryRunner._qb.getOne.mockResolvedValue(invite);
      mockQueryRunner.manager.save.mockResolvedValue(invite);

      const result = await service.claimInvite("abc123", "user-2");

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner._qb.setLock).toHaveBeenCalledWith(
        "pessimistic_write",
      );
      expect(invite.currentUses).toBe(1);
      expect(invite.usedById).toBe("user-2");
      expect(invite.usedAt).toBeInstanceOf(Date);
      expect(invite.status).toBe(InviteStatus.USED);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toEqual(invite);
    });

    it("should not change status to USED if maxUses > currentUses after claim", async () => {
      const invite = {
        id: "inv-1",
        code: "abc123",
        currentUses: 0,
        maxUses: 5,
        status: InviteStatus.ACTIVE,
        isValid: true,
        isExpired: false,
        usedById: null,
        usedAt: null,
      };
      mockQueryRunner._qb.getOne.mockResolvedValue(invite);
      mockQueryRunner.manager.save.mockResolvedValue(invite);

      await service.claimInvite("abc123", "user-2");

      expect(invite.currentUses).toBe(1);
      expect(invite.status).toBe(InviteStatus.ACTIVE);
    });

    it("should throw NotFoundException when invite not found in transaction", async () => {
      mockQueryRunner._qb.getOne.mockResolvedValue(null);

      await expect(
        service.claimInvite("nonexistent", "user-2"),
      ).rejects.toThrow(NotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it("should throw ConflictException when invite is expired", async () => {
      const invite = {
        id: "inv-1",
        isValid: false,
        isExpired: true,
      };
      mockQueryRunner._qb.getOne.mockResolvedValue(invite);

      await expect(service.claimInvite("abc123", "user-2")).rejects.toThrow(
        ConflictException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it("should throw ConflictException when invite is already used", async () => {
      const invite = {
        id: "inv-1",
        isValid: false,
        isExpired: false,
      };
      mockQueryRunner._qb.getOne.mockResolvedValue(invite);

      await expect(service.claimInvite("abc123", "user-2")).rejects.toThrow(
        ConflictException,
      );
    });

    it("should release query runner even on error", async () => {
      mockQueryRunner._qb.getOne.mockRejectedValue(new Error("DB error"));

      await expect(service.claimInvite("abc123", "user-2")).rejects.toThrow(
        "DB error",
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // findByOrganization
  // ==========================================================================

  describe("findByOrganization", () => {
    it("should return active invites by default", async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue([{ id: "inv-1" }]);
      inviteRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.findByOrganization(orgId);

      expect(mockQb.where).toHaveBeenCalledWith(
        "invite.organizationId = :organizationId",
        { organizationId: orgId },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith("invite.status = :status", {
        status: InviteStatus.ACTIVE,
      });
      expect(mockQb.orderBy).toHaveBeenCalledWith("invite.createdAt", "DESC");
      expect(result).toHaveLength(1);
    });

    it("should include expired invites when requested", async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue([]);
      inviteRepo.createQueryBuilder!.mockReturnValue(mockQb);

      await service.findByOrganization(orgId, true);

      expect(mockQb.andWhere).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // findById
  // ==========================================================================

  describe("findById", () => {
    it("should return invite when found", async () => {
      const invite = { id: "inv-1", organizationId: orgId };
      inviteRepo.findOne!.mockResolvedValue(invite);

      const result = await service.findById("inv-1", orgId);

      expect(result).toEqual(invite);
      expect(inviteRepo.findOne).toHaveBeenCalledWith({
        where: { id: "inv-1", organizationId: orgId },
      });
    });

    it("should throw NotFoundException when not found", async () => {
      inviteRepo.findOne!.mockResolvedValue(null);

      await expect(service.findById("inv-999", orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // revoke
  // ==========================================================================

  describe("revoke", () => {
    it("should revoke an active invite", async () => {
      const invite = {
        id: "inv-1",
        organizationId: orgId,
        status: InviteStatus.ACTIVE,
      };
      inviteRepo.findOne!.mockResolvedValue(invite);
      inviteRepo.save!.mockResolvedValue({
        ...invite,
        status: InviteStatus.REVOKED,
      });

      const result = await service.revoke("inv-1", orgId);

      expect(result.status).toBe(InviteStatus.REVOKED);
      expect(inviteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InviteStatus.REVOKED }),
      );
    });

    it("should throw BadRequestException when invite is not active", async () => {
      const invite = {
        id: "inv-1",
        organizationId: orgId,
        status: InviteStatus.USED,
      };
      inviteRepo.findOne!.mockResolvedValue(invite);

      await expect(service.revoke("inv-1", orgId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when invite not found", async () => {
      inviteRepo.findOne!.mockResolvedValue(null);

      await expect(service.revoke("inv-999", orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
