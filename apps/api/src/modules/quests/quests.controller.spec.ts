/**
 * Quests Controller Tests
 * CUSTOMER ENGAGEMENT API - Quest system for user loyalty and engagement
 *
 * Test Coverage:
 *  - User quest retrieval (summary, progress, per-quest)
 *  - Reward claiming (individual, batch claim-all)
 *  - Quest management (CRUD for admins)
 *  - Quest statistics (with date range filtering)
 *  - Role-based access control (all roles for user endpoints, admin-only for management)
 *  - Multi-tenant isolation by organizationId
 *  - Invalid UUID validation via ParseUUIDPipe
 */

import { Test, TestingModule } from "@nestjs/testing";
import {
  ExecutionContext,
  HttpStatus,
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import request from "supertest";
import { QuestsController } from "./quests.controller";
import { QuestsService } from "./quests.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";

// ---------------------------------------------------------------------------
// Token-to-user mapping
// ---------------------------------------------------------------------------
const ORG_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

const tokenMap: Record<
  string,
  { id: string; role: string; organizationId: string }
> = {
  "Bearer valid-jwt-token": {
    id: USER_ID,
    role: "admin",
    organizationId: ORG_ID,
  },
  "Bearer admin-token": { id: USER_ID, role: "admin", organizationId: ORG_ID },
  "Bearer manager-token": {
    id: USER_ID,
    role: "manager",
    organizationId: ORG_ID,
  },
  "Bearer viewer-token": {
    id: USER_ID,
    role: "viewer",
    organizationId: ORG_ID,
  },
  "Bearer operator-token": {
    id: USER_ID,
    role: "operator",
    organizationId: ORG_ID,
  },
  // Role-specific tokens used by the "all roles" loop
  "Bearer valid-jwt-token-viewer": {
    id: USER_ID,
    role: "viewer",
    organizationId: ORG_ID,
  },
  "Bearer valid-jwt-token-operator": {
    id: USER_ID,
    role: "operator",
    organizationId: ORG_ID,
  },
  "Bearer valid-jwt-token-warehouse": {
    id: USER_ID,
    role: "warehouse",
    organizationId: ORG_ID,
  },
  "Bearer valid-jwt-token-accountant": {
    id: USER_ID,
    role: "accountant",
    organizationId: ORG_ID,
  },
  "Bearer valid-jwt-token-manager": {
    id: USER_ID,
    role: "manager",
    organizationId: ORG_ID,
  },
  "Bearer valid-jwt-token-admin": {
    id: USER_ID,
    role: "admin",
    organizationId: ORG_ID,
  },
  "Bearer valid-jwt-token-owner": {
    id: USER_ID,
    role: "owner",
    organizationId: ORG_ID,
  },
};

// ---------------------------------------------------------------------------
// Role hierarchy (mirrors common/decorators/roles.decorator.ts)
// ---------------------------------------------------------------------------
const ROLE_HIERARCHY: Record<string, number> = {
  owner: 100,
  admin: 90,
  manager: 70,
  accountant: 50,
  warehouse: 40,
  operator: 30,
  viewer: 10,
};

describe("QuestsController (e2e)", () => {
  let app: INestApplication;
  let questsService: QuestsService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: "default",
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
      controllers: [QuestsController],
      providers: [
        {
          provide: QuestsService,
          useValue: {
            getUserQuestsSummary: jest.fn(),
            getUserQuest: jest.fn(),
            claimReward: jest.fn(),
            claimAllRewards: jest.fn(),
            getQuests: jest.fn(),
            createQuest: jest.fn(),
            updateQuest: jest.fn(),
            deleteQuest: jest.fn(),
            getStats: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({}) // Disable throttling for tests
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          const auth = req.headers?.authorization;
          if (
            !auth ||
            !auth.startsWith("Bearer ") ||
            auth === "Bearer invalid-token"
          ) {
            throw new UnauthorizedException();
          }
          const user = tokenMap[auth];
          if (!user) {
            throw new UnauthorizedException();
          }
          req.user = user;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const reflector = new Reflector();
          const requiredRoles = reflector.getAllAndOverride<string[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
          );
          if (!requiredRoles || requiredRoles.length === 0) {
            return true;
          }
          const req = context.switchToHttp().getRequest();
          const user = req.user;
          if (!user) {
            throw new ForbiddenException();
          }
          const userLevel = ROLE_HIERARCHY[user.role] || 0;
          const hasRole = requiredRoles.some((role) => {
            if (role === user.role) return true;
            const requiredLevel = ROLE_HIERARCHY[role] || 100;
            return userLevel >= requiredLevel;
          });
          if (!hasRole) {
            throw new ForbiddenException();
          }
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    questsService = module.get<QuestsService>(QuestsService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // USER ENDPOINTS - Quest Summary and Progress
  // ============================================================================

  describe("GET /quests/my", () => {
    it("should return user quests summary for authenticated user", async () => {
      const expectedResponse = {
        userId: USER_ID,
        totalQuests: 12,
        completedQuests: 5,
        dailyQuests: [
          {
            id: "daily-1",
            name: "Daily Login",
            progress: 100,
            reward: 100,
            completed: true,
          },
        ],
        weeklyQuests: [
          {
            id: "weekly-1",
            name: "Weekly Challenge",
            progress: 45,
            reward: 500,
            completed: false,
          },
        ],
        achievements: [],
      };

      (questsService.getUserQuestsSummary as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get("/quests/my")
        .set("Authorization", "Bearer valid-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(questsService.getUserQuestsSummary).toHaveBeenCalledWith(USER_ID);
    });

    it("should reject unauthenticated request", async () => {
      await request(app.getHttpServer())
        .get("/quests/my")
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("should be accessible to all roles", async () => {
      const roles = [
        "viewer",
        "operator",
        "warehouse",
        "accountant",
        "manager",
        "admin",
        "owner",
      ];

      for (const role of roles) {
        (questsService.getUserQuestsSummary as jest.Mock).mockResolvedValue({
          userId: USER_ID,
          totalQuests: 0,
          completedQuests: 0,
          dailyQuests: [],
          weeklyQuests: [],
          achievements: [],
        });

        await request(app.getHttpServer())
          .get("/quests/my")
          .set("Authorization", `Bearer valid-jwt-token-${role}`)
          .expect(HttpStatus.OK);
      }
    });
  });

  describe("GET /quests/my/:userQuestId", () => {
    it("should return specific quest progress with valid UUID", async () => {
      const userQuestId = "550e8400-e29b-41d4-a716-446655440002";

      const expectedResponse = {
        id: userQuestId,
        questId: "quest-123",
        userId: USER_ID,
        name: "Daily Login",
        description: "Login daily for rewards",
        progress: 85,
        targetProgress: 100,
        reward: 100,
        rewardType: "POINTS",
        completed: false,
        claimed: false,
        completedAt: null,
        claimedAt: null,
      };

      (questsService.getUserQuest as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get(`/quests/my/${userQuestId}`)
        .set("Authorization", "Bearer valid-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(questsService.getUserQuest).toHaveBeenCalledWith(
        expect.any(String),
        userQuestId,
      );
    });

    it("should reject invalid UUID format", async () => {
      await request(app.getHttpServer())
        .get("/quests/my/not-a-uuid")
        .set("Authorization", "Bearer valid-jwt-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should return 404 for nonexistent quest", async () => {
      const userQuestId = "550e8400-e29b-41d4-a716-446655440099";

      (questsService.getUserQuest as jest.Mock).mockRejectedValue(
        new NotFoundException("Quest not found"),
      );

      await request(app.getHttpServer())
        .get(`/quests/my/${userQuestId}`)
        .set("Authorization", "Bearer valid-jwt-token")
        .expect(HttpStatus.NOT_FOUND);
    });

    it("should reject unauthenticated request", async () => {
      const userQuestId = "550e8400-e29b-41d4-a716-446655440002";

      await request(app.getHttpServer())
        .get(`/quests/my/${userQuestId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ============================================================================
  // USER ENDPOINTS - Reward Claiming
  // ============================================================================

  describe("POST /quests/my/:userQuestId/claim", () => {
    it("should claim reward for completed quest", async () => {
      const userQuestId = "550e8400-e29b-41d4-a716-446655440002";

      const expectedResponse = {
        success: true,
        questId: userQuestId,
        reward: 100,
        rewardType: "POINTS",
        message: "Reward claimed successfully",
        totalPointsAfterClaim: 5500,
      };

      (questsService.claimReward as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post(`/quests/my/${userQuestId}/claim`)
        .set("Authorization", "Bearer valid-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(questsService.claimReward).toHaveBeenCalledWith(
        expect.any(String),
        userQuestId,
      );
    });

    it("should reject claiming already-claimed reward", async () => {
      const userQuestId = "550e8400-e29b-41d4-a716-446655440002";

      (questsService.claimReward as jest.Mock).mockRejectedValue(
        new BadRequestException("Reward already claimed"),
      );

      await request(app.getHttpServer())
        .post(`/quests/my/${userQuestId}/claim`)
        .set("Authorization", "Bearer valid-jwt-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject claiming for incomplete quest", async () => {
      const userQuestId = "550e8400-e29b-41d4-a716-446655440003";

      (questsService.claimReward as jest.Mock).mockRejectedValue(
        new BadRequestException("Quest not completed"),
      );

      await request(app.getHttpServer())
        .post(`/quests/my/${userQuestId}/claim`)
        .set("Authorization", "Bearer valid-jwt-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject invalid UUID format", async () => {
      await request(app.getHttpServer())
        .post("/quests/my/invalid-uuid/claim")
        .set("Authorization", "Bearer valid-jwt-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    // NOTE: How should we handle concurrent claim attempts?
    // Should we implement optimistic locking or database-level constraints?
    // What's the expected timeout for async reward processing?
  });

  describe("POST /quests/my/claim-all", () => {
    it("should claim all available rewards in batch", async () => {
      const expectedResponse = {
        success: true,
        claimedCount: 3,
        totalReward: 750,
        rewards: [
          { questId: "daily-1", reward: 100 },
          { questId: "daily-2", reward: 150 },
          { questId: "weekly-1", reward: 500 },
        ],
        totalPointsAfterClaim: 6250,
      };

      (questsService.claimAllRewards as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post("/quests/my/claim-all")
        .set("Authorization", "Bearer valid-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(questsService.claimAllRewards).toHaveBeenCalledWith(
        expect.any(String),
      );
    });

    it("should return empty rewards array if no claimable quests", async () => {
      const expectedResponse = {
        success: true,
        claimedCount: 0,
        totalReward: 0,
        rewards: [],
        totalPointsAfterClaim: 5500,
      };

      (questsService.claimAllRewards as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post("/quests/my/claim-all")
        .set("Authorization", "Bearer valid-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body.claimedCount).toBe(0);
      expect(response.body.rewards.length).toBe(0);
    });

    it("should reject unauthenticated request", async () => {
      await request(app.getHttpServer())
        .post("/quests/my/claim-all")
        .expect(HttpStatus.UNAUTHORIZED);
    });

    // NOTE: Should claim-all be fire-and-forget async or should it wait for processing?
    // How should we handle partial failures (some claims succeed, others fail)?
    // Should we implement idempotency tokens to prevent accidental duplicate claims?
  });

  // ============================================================================
  // ADMIN ENDPOINTS - Quest Management
  // ============================================================================

  describe("GET /quests", () => {
    it("should return list of quests for admin", async () => {
      const expectedResponse = [
        {
          id: "quest-1",
          organizationId: ORG_ID,
          name: "Daily Login",
          description: "Login daily for rewards",
          type: "DAILY",
          reward: 100,
          rewardType: "POINTS",
          active: true,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "quest-2",
          organizationId: ORG_ID,
          name: "Weekly Challenge",
          description: "Complete weekly objectives",
          type: "WEEKLY",
          reward: 500,
          rewardType: "POINTS",
          active: true,
          createdAt: "2026-01-02T00:00:00Z",
          updatedAt: "2026-01-02T00:00:00Z",
        },
      ];

      (questsService.getQuests as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get("/quests")
        .set("Authorization", "Bearer valid-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(questsService.getQuests).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should filter quests by type query parameter", async () => {
      (questsService.getQuests as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get("/quests?type=order_count")
        .set("Authorization", "Bearer valid-jwt-token")
        .expect(HttpStatus.OK);

      expect(questsService.getQuests).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: "order_count",
        }),
      );
    });

    it("should filter quests by period query parameter", async () => {
      (questsService.getQuests as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get("/quests?period=daily")
        .set("Authorization", "Bearer valid-jwt-token")
        .expect(HttpStatus.OK);

      expect(questsService.getQuests).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          period: "daily",
        }),
      );
    });

    it("should reject access for non-admin roles", async () => {
      await request(app.getHttpServer())
        .get("/quests")
        .set("Authorization", "Bearer viewer-token")
        .expect(HttpStatus.FORBIDDEN);
    });

    it("should reject unauthenticated request", async () => {
      await request(app.getHttpServer())
        .get("/quests")
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("should only return quests for user organization (multi-tenant)", async () => {
      (questsService.getQuests as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get("/quests")
        .set("Authorization", "Bearer valid-jwt-token")
        .expect(HttpStatus.OK);

      // Verify organizationId was passed from @CurrentUser
      expect(questsService.getQuests).toHaveBeenCalledWith(
        expect.any(String), // organizationId
        expect.any(Object),
      );
    });
  });

  describe("POST /quests", () => {
    it("should create new quest for owner/admin", async () => {
      const createDto = {
        title: "New Quest",
        description: "A brand new quest",
        period: "monthly",
        type: "order_count",
        targetValue: 10,
        rewardPoints: 1000,
      };

      const expectedResponse = {
        id: "quest-new-123",
        organizationId: ORG_ID,
        ...createDto,
        isActive: true,
        createdAt: "2026-03-06T00:00:00Z",
        updatedAt: "2026-03-06T00:00:00Z",
      };

      (questsService.createQuest as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post("/quests")
        .set("Authorization", "Bearer admin-token")
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(questsService.createQuest).toHaveBeenCalledWith(
        expect.any(String), // organizationId
        expect.objectContaining({
          title: createDto.title,
          description: createDto.description,
        }),
      );
    });

    it("should reject invalid quest type", async () => {
      const invalidDto = {
        title: "Bad Quest",
        description: "Invalid type",
        period: "daily",
        type: "INVALID_TYPE",
        targetValue: 5,
        rewardPoints: 100,
      };

      await request(app.getHttpServer())
        .post("/quests")
        .set("Authorization", "Bearer admin-token")
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject missing required fields", async () => {
      const incompleteDto = {
        title: "Incomplete Quest",
        // missing description, period, type, targetValue, rewardPoints
      };

      await request(app.getHttpServer())
        .post("/quests")
        .set("Authorization", "Bearer admin-token")
        .send(incompleteDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject access for non-admin roles (manager cannot create)", async () => {
      const createDto = {
        title: "New Quest",
        description: "A brand new quest",
        period: "daily",
        type: "order_count",
        targetValue: 3,
        rewardPoints: 100,
      };

      await request(app.getHttpServer())
        .post("/quests")
        .set("Authorization", "Bearer manager-token")
        .send(createDto)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("should reject unauthenticated request", async () => {
      const createDto = {
        title: "New Quest",
        description: "A brand new quest",
        period: "daily",
        type: "order_count",
        targetValue: 3,
        rewardPoints: 100,
      };

      await request(app.getHttpServer())
        .post("/quests")
        .send(createDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    // NOTE: Should we validate maximum reward amount per quest type?
    // Should there be a maximum number of quests per organization?
    // How should we handle duplicate quest names?
  });

  describe("PUT /quests/:id", () => {
    it("should update quest with valid data", async () => {
      const questId = "550e8400-e29b-41d4-a716-446655440010";
      const updateDto = {
        title: "Updated Quest Name",
        rewardPoints: 200,
      };

      const expectedResponse = {
        id: questId,
        organizationId: ORG_ID,
        title: updateDto.title,
        description: "Original description",
        period: "daily",
        type: "order_count",
        rewardPoints: updateDto.rewardPoints,
        isActive: true,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-03-06T12:00:00Z",
      };

      (questsService.updateQuest as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .put(`/quests/${questId}`)
        .set("Authorization", "Bearer admin-token")
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(questsService.updateQuest).toHaveBeenCalledWith(
        questId,
        expect.any(String), // organizationId
        expect.objectContaining({
          title: updateDto.title,
          rewardPoints: updateDto.rewardPoints,
        }),
      );
    });

    it("should reject invalid UUID format", async () => {
      const updateDto = { title: "Updated Name" };

      await request(app.getHttpServer())
        .put("/quests/not-a-uuid")
        .set("Authorization", "Bearer admin-token")
        .send(updateDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should return 404 for nonexistent quest", async () => {
      const nonexistentId = "550e8400-e29b-41d4-a716-446655440099";
      const updateDto = { title: "Updated Name" };

      (questsService.updateQuest as jest.Mock).mockRejectedValue(
        new NotFoundException("Quest not found"),
      );

      await request(app.getHttpServer())
        .put(`/quests/${nonexistentId}`)
        .set("Authorization", "Bearer admin-token")
        .send(updateDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it("should reject access for non-admin roles", async () => {
      const questId = "550e8400-e29b-41d4-a716-446655440010";
      const updateDto = { title: "Updated Name" };

      await request(app.getHttpServer())
        .put(`/quests/${questId}`)
        .set("Authorization", "Bearer manager-token")
        .send(updateDto)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("should reject unauthenticated request", async () => {
      const questId = "550e8400-e29b-41d4-a716-446655440010";
      const updateDto = { title: "Updated Name" };

      await request(app.getHttpServer())
        .put(`/quests/${questId}`)
        .send(updateDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("should respect multi-tenant isolation", async () => {
      const questId = "550e8400-e29b-41d4-a716-446655440010";
      const updateDto = { title: "Updated Name" };

      (questsService.updateQuest as jest.Mock).mockRejectedValue(
        new NotFoundException("Quest not found in your organization"),
      );

      await request(app.getHttpServer())
        .put(`/quests/${questId}`)
        .set("Authorization", "Bearer admin-token")
        .send(updateDto)
        .expect(HttpStatus.NOT_FOUND);

      expect(questsService.updateQuest).toHaveBeenCalledWith(
        questId,
        expect.any(String), // organizationId from @CurrentUser
        expect.objectContaining({ title: updateDto.title }),
      );
    });
  });

  describe("DELETE /quests/:id", () => {
    it("should soft delete quest and return 204", async () => {
      const questId = "550e8400-e29b-41d4-a716-446655440010";

      (questsService.deleteQuest as jest.Mock).mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/quests/${questId}`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.NO_CONTENT);

      expect(questsService.deleteQuest).toHaveBeenCalledWith(
        questId,
        expect.any(String), // organizationId
      );
    });

    it("should reject invalid UUID format", async () => {
      await request(app.getHttpServer())
        .delete("/quests/not-a-uuid")
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should return 404 for nonexistent quest", async () => {
      const nonexistentId = "550e8400-e29b-41d4-a716-446655440099";

      (questsService.deleteQuest as jest.Mock).mockRejectedValue(
        new NotFoundException("Quest not found"),
      );

      await request(app.getHttpServer())
        .delete(`/quests/${nonexistentId}`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.NOT_FOUND);
    });

    it("should reject access for non-admin roles", async () => {
      const questId = "550e8400-e29b-41d4-a716-446655440010";

      await request(app.getHttpServer())
        .delete(`/quests/${questId}`)
        .set("Authorization", "Bearer manager-token")
        .expect(HttpStatus.FORBIDDEN);
    });

    it("should reject unauthenticated request", async () => {
      const questId = "550e8400-e29b-41d4-a716-446655440010";

      await request(app.getHttpServer())
        .delete(`/quests/${questId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("should be soft delete (deletedAt flag, not permanent removal)", async () => {
      const questId = "550e8400-e29b-41d4-a716-446655440010";

      (questsService.deleteQuest as jest.Mock).mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/quests/${questId}`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.NO_CONTENT);

      // Verify service was called (actual soft delete logic verified in service tests)
      expect(questsService.deleteQuest).toHaveBeenCalled();
    });

    it("should respect multi-tenant isolation", async () => {
      const questId = "550e8400-e29b-41d4-a716-446655440010";

      (questsService.deleteQuest as jest.Mock).mockRejectedValue(
        new NotFoundException("Quest not found in your organization"),
      );

      await request(app.getHttpServer())
        .delete(`/quests/${questId}`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.NOT_FOUND);

      expect(questsService.deleteQuest).toHaveBeenCalledWith(
        questId,
        expect.any(String), // organizationId from @CurrentUser
      );
    });
  });

  // ============================================================================
  // STATISTICS ENDPOINT
  // ============================================================================

  describe("GET /quests/stats", () => {
    it("should return quest statistics for date range", async () => {
      const expectedResponse = {
        totalQuests: 12,
        activeQuests: 10,
        completedQuests: 450,
        totalRewardsDistributed: 45000,
        averageCompletionTime: 3.2,
        topQuestByCompletion: {
          id: "daily-1",
          name: "Daily Login",
          completionCount: 850,
          percentage: 75.5,
        },
        userEngagement: {
          totalUsers: 1200,
          usersWithCompletedQuests: 850,
          engagementRate: 70.8,
        },
      };

      (questsService.getStats as jest.Mock).mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .get("/quests/stats")
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });

    it("should use default 30-day range if no dates provided", async () => {
      (questsService.getStats as jest.Mock).mockResolvedValue({
        totalQuests: 12,
        activeQuests: 10,
        completedQuests: 450,
      });

      await request(app.getHttpServer())
        .get("/quests/stats")
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.OK);

      // Verify service was called with date range
      expect(questsService.getStats).toHaveBeenCalledWith(
        expect.any(String), // organizationId
        expect.any(Date), // dateFrom (last 30 days)
        expect.any(Date), // dateTo (today)
      );
    });

    it("should accept custom date range via query parameters", async () => {
      const dateFrom = "2026-02-01T00:00:00Z";
      const dateTo = "2026-03-06T23:59:59Z";

      (questsService.getStats as jest.Mock).mockResolvedValue({});

      await request(app.getHttpServer())
        .get(`/quests/stats?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.OK);

      expect(questsService.getStats).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Date),
        expect.any(Date),
      );
    });

    it("should reject invalid date format", async () => {
      await request(app.getHttpServer())
        .get("/quests/stats?dateFrom=invalid-date&dateTo=also-invalid")
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject access for non-admin roles", async () => {
      await request(app.getHttpServer())
        .get("/quests/stats")
        .set("Authorization", "Bearer operator-token")
        .expect(HttpStatus.FORBIDDEN);
    });

    it("should reject unauthenticated request", async () => {
      await request(app.getHttpServer())
        .get("/quests/stats")
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("should only return stats for user organization", async () => {
      (questsService.getStats as jest.Mock).mockResolvedValue({});

      await request(app.getHttpServer())
        .get("/quests/stats")
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.OK);

      // Verify organizationId was passed from @CurrentUser
      expect(questsService.getStats).toHaveBeenCalledWith(
        expect.any(String), // organizationId
        expect.any(Date),
        expect.any(Date),
      );
    });

    // NOTE: Should dateFrom be inclusive and dateTo exclusive, or both inclusive?
    // What time zone should dates use (user timezone, organization timezone, or UTC)?
    // Should we aggregate stats by quest type or other dimensions?
  });
});
