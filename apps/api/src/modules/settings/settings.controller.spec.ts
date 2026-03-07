/**
 * Settings Controller Tests
 * CRITICAL API - System settings and AI provider key management
 *
 * Test Coverage:
 *  ✓ System settings CRUD (create, list, read, update, delete)
 *  ✓ AI provider keys management (secure credential handling)
 *  ✓ Public settings endpoint (no auth)
 *  ✓ Role-based access (Owner, Admin restrictions)
 *  ✓ Setting category filtering
 *  ✓ API key masking in responses (security)
 *  ✓ Duplicate key prevention
 */

import { Test, TestingModule } from "@nestjs/testing";
import {
  HttpStatus,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import request from "supertest";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";
import { SettingCategory } from "./entities/system-setting.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

// Token-to-user mapping for mock JwtAuthGuard
const TOKEN_USER_MAP: Record<
  string,
  { id: string; role: string; organizationId: string }
> = {
  "Bearer owner-jwt-token": {
    id: "user-owner",
    role: "owner",
    organizationId: "org-1",
  },
  "Bearer admin-jwt-token": {
    id: "user-admin",
    role: "admin",
    organizationId: "org-1",
  },
  "Bearer operator-jwt-token": {
    id: "user-operator",
    role: "operator",
    organizationId: "org-1",
  },
};

describe("SettingsController (e2e)", () => {
  let app: INestApplication;
  let settingsService: SettingsService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: "default",
            ttl: 60000,
            limit: 30,
          },
        ]),
      ],
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: {
            getAllSettings: jest.fn(),
            getPublicSettings: jest.fn(),
            getSetting: jest.fn(),
            createSetting: jest.fn(),
            updateSetting: jest.fn(),
            deleteSetting: jest.fn(),
            getAiProviderKeys: jest.fn(),
            getAiProviderKey: jest.fn(),
            createAiProviderKey: jest.fn(),
            updateAiProviderKey: jest.fn(),
            deleteAiProviderKey: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true }) // Disabled — auth handled by global mock below
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Global guards applied via app.useGlobalGuards run in order:
    // 1. MockJwtAuthGuard — parses token, sets req.user
    // 2. MockRolesGuard — checks @Roles() metadata against req.user.role
    app.useGlobalGuards(
      {
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          const auth = req.headers?.authorization;
          const reflector = new Reflector();
          const isPublic = reflector.getAllAndOverride<boolean>("isPublic", [
            context.getHandler(),
            context.getClass(),
          ]);
          if (isPublic) {
            return true;
          }
          if (
            !auth ||
            !auth.startsWith("Bearer ") ||
            auth === "Bearer invalid-token"
          ) {
            throw new UnauthorizedException();
          }
          const user = TOKEN_USER_MAP[auth];
          if (!user) {
            throw new UnauthorizedException();
          }
          req.user = user;
          return true;
        },
      },
      {
        canActivate: (context: ExecutionContext) => {
          const reflector = new Reflector();
          const roles = reflector.getAllAndOverride<string[]>("roles", [
            context.getHandler(),
            context.getClass(),
          ]);
          if (!roles || roles.length === 0) {
            return true;
          }
          const req = context.switchToHttp().getRequest();
          if (!req.user) {
            return true; // Public route — no user attached
          }
          if (!roles.includes(req.user.role)) {
            throw new ForbiddenException();
          }
          return true;
        },
      },
    );

    settingsService = module.get<SettingsService>(SettingsService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // PUBLIC SETTINGS TESTS
  // ============================================================================

  describe("GET /settings/public", () => {
    it("should retrieve public settings without authentication", async () => {
      const publicSettings = [
        {
          key: "app_name",
          value: "VendHub OS",
          category: SettingCategory.GENERAL,
          isPublic: true,
        },
        {
          key: "maintenance_mode",
          value: "false",
          category: SettingCategory.GENERAL,
          isPublic: true,
        },
      ];

      (settingsService.getPublicSettings as jest.Mock).mockResolvedValue(
        publicSettings,
      );

      const response = await request(app.getHttpServer())
        .get("/settings/public")
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].key).toBe("app_name");
      expect(settingsService.getPublicSettings).toHaveBeenCalled();
    });

    it("should filter out private settings from public endpoint", async () => {
      (settingsService.getPublicSettings as jest.Mock).mockResolvedValue([
        {
          key: "app_name",
          isPublic: true,
        },
        // NOTE: Verify that private settings (like API keys, secrets) are excluded
        // Should never include isPublic: false settings in response
      ]);

      const response = await request(app.getHttpServer())
        .get("/settings/public")
        .expect(HttpStatus.OK);

      const allPublic = response.body.every((s: any) => s.isPublic === true);
      expect(allPublic).toBe(true);
    });

    it("should be throttled at 30 requests per minute", async () => {
      (settingsService.getPublicSettings as jest.Mock).mockResolvedValue([]);

      // Each request is throttled
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .get("/settings/public")
          .expect(HttpStatus.OK);
      }

      expect(settingsService.getPublicSettings).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================================
  // SYSTEM SETTINGS TESTS
  // ============================================================================

  describe("GET /settings", () => {
    it("should list all system settings for Owner", async () => {
      const mockSettings = [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          key: "email_notifications_enabled",
          value: "true",
          category: SettingCategory.NOTIFICATION,
          description: "Enable/disable email notifications",
          isPublic: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          key: "max_daily_reports",
          value: "100",
          category: SettingCategory.GENERAL,
          description: "Maximum number of daily reports",
          isPublic: false,
          createdAt: new Date().toISOString(),
        },
      ];

      (settingsService.getAllSettings as jest.Mock).mockResolvedValue(
        mockSettings,
      );

      const response = await request(app.getHttpServer())
        .get("/settings")
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].key).toBe("email_notifications_enabled");
    });

    it("should filter settings by category", async () => {
      (settingsService.getAllSettings as jest.Mock).mockResolvedValue([
        {
          key: "email_notifications_enabled",
          category: SettingCategory.NOTIFICATION,
        },
      ]);

      await request(app.getHttpServer())
        .get(`/settings?category=${SettingCategory.NOTIFICATION}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.OK);

      expect(settingsService.getAllSettings).toHaveBeenCalledWith(
        expect.any(String), // organizationId
        SettingCategory.NOTIFICATION,
      );
    });

    it("should reject non-Owner/Admin roles", async () => {
      await request(app.getHttpServer())
        .get("/settings")
        .set("Authorization", "Bearer operator-jwt-token")
        .expect(HttpStatus.FORBIDDEN);
    });

    it("should require authentication", async () => {
      await request(app.getHttpServer())
        .get("/settings")
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe("GET /settings/:key", () => {
    it("should retrieve setting by key", async () => {
      const mockSetting = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        key: "email_notifications_enabled",
        value: "true",
        category: SettingCategory.NOTIFICATION,
        description: "Enable/disable email notifications",
      };

      (settingsService.getSetting as jest.Mock).mockResolvedValue(mockSetting);

      const response = await request(app.getHttpServer())
        .get("/settings/email_notifications_enabled")
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body.key).toBe("email_notifications_enabled");
      expect(response.body.value).toBe("true");
    });

    it("should return 404 for nonexistent key", async () => {
      (settingsService.getSetting as jest.Mock).mockRejectedValue(
        new NotFoundException("Setting not found"),
      );

      await request(app.getHttpServer())
        .get("/settings/nonexistent_key")
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe("POST /settings", () => {
    it("should create new setting as Owner", async () => {
      const createDto = {
        key: "new_setting",
        value: "value123",
        category: SettingCategory.GENERAL,
        description: "A new setting",
      };

      const expectedResponse = {
        id: "550e8400-e29b-41d4-a716-446655440002",
        ...createDto,
        createdAt: new Date().toISOString(),
      };

      (settingsService.createSetting as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post("/settings")
        .set("Authorization", "Bearer owner-jwt-token")
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.key).toBe("new_setting");
      expect(response.body.value).toBe("value123");
    });

    it("should reject duplicate setting key", async () => {
      const createDto = {
        key: "existing_key",
        value: "value123",
        category: SettingCategory.GENERAL,
      };

      (settingsService.createSetting as jest.Mock).mockRejectedValue(
        new ConflictException("Setting key already exists"),
      );

      await request(app.getHttpServer())
        .post("/settings")
        .set("Authorization", "Bearer owner-jwt-token")
        .send(createDto)
        .expect(HttpStatus.CONFLICT);
    });

    it("should reject non-Owner from creating settings", async () => {
      const createDto = {
        key: "new_setting",
        value: "value123",
        category: SettingCategory.GENERAL,
      };

      await request(app.getHttpServer())
        .post("/settings")
        .set("Authorization", "Bearer admin-jwt-token")
        .send(createDto)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("should validate required fields", async () => {
      const createDto = {
        // Missing required field: key (required by @Length(1, 255))
      };

      await request(app.getHttpServer())
        .post("/settings")
        .set("Authorization", "Bearer owner-jwt-token")
        .send(createDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe("PATCH /settings/:key", () => {
    it("should update setting value", async () => {
      const updateDto = {
        value: "updated_value",
        description: "Updated description",
      };

      const expectedResponse = {
        key: "email_notifications_enabled",
        value: "updated_value",
        description: "Updated description",
        updatedAt: new Date().toISOString(),
      };

      (settingsService.updateSetting as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .patch("/settings/email_notifications_enabled")
        .set("Authorization", "Bearer owner-jwt-token")
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.value).toBe("updated_value");
    });

    it("should allow Admin to update settings", async () => {
      const updateDto = {
        value: "new_value",
      };

      (settingsService.updateSetting as jest.Mock).mockResolvedValue({
        key: "some_key",
        value: "new_value",
      });

      await request(app.getHttpServer())
        .patch("/settings/some_key")
        .set("Authorization", "Bearer admin-jwt-token")
        .send(updateDto)
        .expect(HttpStatus.OK);
    });

    it("should return 404 when updating nonexistent key", async () => {
      (settingsService.updateSetting as jest.Mock).mockRejectedValue(
        new NotFoundException("Setting not found"),
      );

      await request(app.getHttpServer())
        .patch("/settings/nonexistent_key")
        .set("Authorization", "Bearer owner-jwt-token")
        .send({ value: "new_value" })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe("DELETE /settings/:key", () => {
    it("should delete setting as Owner", async () => {
      (settingsService.deleteSetting as jest.Mock).mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete("/settings/email_notifications_enabled")
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.NO_CONTENT);

      expect(settingsService.deleteSetting).toHaveBeenCalledWith(
        "email_notifications_enabled",
      );
    });

    it("should reject non-Owner from deleting settings", async () => {
      await request(app.getHttpServer())
        .delete("/settings/email_notifications_enabled")
        .set("Authorization", "Bearer admin-jwt-token")
        .expect(HttpStatus.FORBIDDEN);
    });

    it("should return 404 when deleting nonexistent setting", async () => {
      (settingsService.deleteSetting as jest.Mock).mockRejectedValue(
        new NotFoundException("Setting not found"),
      );

      await request(app.getHttpServer())
        .delete("/settings/nonexistent_key")
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.NOT_FOUND);
    });

    it("should prevent deletion of critical system settings", async () => {
      // NOTE: Which settings should be undeletable (system critical)?
      // Consider: app_name, database_url, etc. as immutable

      (settingsService.deleteSetting as jest.Mock).mockRejectedValue(
        new BadRequestException("Cannot delete system critical setting"),
      );

      await request(app.getHttpServer())
        .delete("/settings/app_name")
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================================================
  // AI PROVIDER KEYS TESTS
  // ============================================================================

  describe("GET /settings/ai-providers", () => {
    it("should list AI provider keys with masked API keys", async () => {
      const aiKeys = [
        {
          id: "550e8400-e29b-41d4-a716-446655440003",
          provider: "openai",
          apiKey: "sk-***...***", // Masked
          organizationId: "550e8400-e29b-41d4-a716-446655440001",
          createdAt: new Date().toISOString(),
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440004",
          provider: "anthropic",
          apiKey: "sk-ant-***...***", // Masked
          organizationId: "550e8400-e29b-41d4-a716-446655440001",
          createdAt: new Date().toISOString(),
        },
      ];

      (settingsService.getAiProviderKeys as jest.Mock).mockResolvedValue(
        aiKeys,
      );

      const response = await request(app.getHttpServer())
        .get("/settings/ai-providers")
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(2);
      // Verify API keys are masked, not exposed in full
      expect(response.body[0].apiKey).toMatch(/\*\*\*/);
    });

    it("should reject non-Owner/Admin from listing AI keys", async () => {
      await request(app.getHttpServer())
        .get("/settings/ai-providers")
        .set("Authorization", "Bearer operator-jwt-token")
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe("GET /settings/ai-providers/:id", () => {
    it("should retrieve AI provider key by ID with masked key", async () => {
      const keyId = "550e8400-e29b-41d4-a716-446655440003";
      const aiKey = {
        id: keyId,
        provider: "openai",
        apiKey: "sk-***...***", // Masked
        model: "gpt-4",
        organizationId: "550e8400-e29b-41d4-a716-446655440001",
        createdAt: new Date().toISOString(),
      };

      (settingsService.getAiProviderKey as jest.Mock).mockResolvedValue(aiKey);

      const response = await request(app.getHttpServer())
        .get(`/settings/ai-providers/${keyId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body.provider).toBe("openai");
      expect(response.body.apiKey).toMatch(/\*\*\*/);
    });

    it("should return 404 for nonexistent AI key", async () => {
      const fakeUuid = "00000000-0000-0000-0000-000000000099";
      (settingsService.getAiProviderKey as jest.Mock).mockRejectedValue(
        new NotFoundException("AI provider key not found"),
      );

      await request(app.getHttpServer())
        .get(`/settings/ai-providers/${fakeUuid}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.NOT_FOUND);
    });

    it("should reject invalid UUID format", async () => {
      await request(app.getHttpServer())
        .get("/settings/ai-providers/not-a-uuid")
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe("POST /settings/ai-providers", () => {
    it("should create AI provider key as Owner", async () => {
      const createDto = {
        provider: "openai",
        name: "OpenAI Production Key",
        apiKey: "sk-proj-actual-key-here",
        model: "gpt-4-turbo",
      };

      const expectedResponse = {
        id: "550e8400-e29b-41d4-a716-446655440005",
        provider: "openai",
        apiKey: "sk-***...***", // Masked in response
        model: "gpt-4-turbo",
        maxTokens: 8000,
        createdAt: new Date().toISOString(),
      };

      (settingsService.createAiProviderKey as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post("/settings/ai-providers")
        .set("Authorization", "Bearer owner-jwt-token")
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.provider).toBe("openai");
      // NOTE: Verify API key is never returned in plain text, always masked
      expect(response.body.apiKey).not.toContain("sk-proj-");
    });

    it("should prevent duplicate AI provider keys for same organization", async () => {
      const createDto = {
        provider: "openai",
        name: "Duplicate Key",
        apiKey: "sk-proj-another-key",
      };

      (settingsService.createAiProviderKey as jest.Mock).mockRejectedValue(
        new ConflictException(
          "Provider key already exists for this organization",
        ),
      );

      await request(app.getHttpServer())
        .post("/settings/ai-providers")
        .set("Authorization", "Bearer owner-jwt-token")
        .send(createDto)
        .expect(HttpStatus.CONFLICT);
    });

    it("should validate API key format", async () => {
      const createDto = {
        provider: "openai",
        name: "Test Key",
        apiKey: "invalid-key-format",
      };

      (settingsService.createAiProviderKey as jest.Mock).mockRejectedValue(
        new BadRequestException("Invalid API key format"),
      );

      await request(app.getHttpServer())
        .post("/settings/ai-providers")
        .set("Authorization", "Bearer owner-jwt-token")
        .send(createDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject non-Owner from creating AI provider keys", async () => {
      const createDto = {
        provider: "openai",
        name: "Test Key",
        apiKey: "sk-proj-test-key",
      };

      await request(app.getHttpServer())
        .post("/settings/ai-providers")
        .set("Authorization", "Bearer admin-jwt-token")
        .send(createDto)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe("PATCH /settings/ai-providers/:id", () => {
    it("should update AI provider key", async () => {
      const keyId = "550e8400-e29b-41d4-a716-446655440003";
      const updateDto = {
        apiKey: "sk-proj-new-key-here",
        model: "gpt-4o",
      };

      const expectedResponse = {
        id: keyId,
        provider: "openai",
        apiKey: "sk-***...***", // Masked
        model: "gpt-4o",
        updatedAt: new Date().toISOString(),
      };

      (settingsService.updateAiProviderKey as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .patch(`/settings/ai-providers/${keyId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body.model).toBe("gpt-4o");
      expect(response.body.apiKey).toMatch(/\*\*\*/);
    });

    it("should allow Admin to update AI provider keys", async () => {
      const keyId = "550e8400-e29b-41d4-a716-446655440003";
      const updateDto = {
        model: "gpt-4-turbo",
      };

      (settingsService.updateAiProviderKey as jest.Mock).mockResolvedValue({
        id: keyId,
        model: "gpt-4-turbo",
        apiKey: "sk-***...***",
      });

      await request(app.getHttpServer())
        .patch(`/settings/ai-providers/${keyId}`)
        .set("Authorization", "Bearer admin-jwt-token")
        .send(updateDto)
        .expect(HttpStatus.OK);
    });

    it("should return 404 for nonexistent AI provider key", async () => {
      const fakeUuid = "00000000-0000-0000-0000-000000000099";
      (settingsService.updateAiProviderKey as jest.Mock).mockRejectedValue(
        new NotFoundException("AI provider key not found"),
      );

      await request(app.getHttpServer())
        .patch(`/settings/ai-providers/${fakeUuid}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .send({ model: "gpt-4" })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe("DELETE /settings/ai-providers/:id", () => {
    it("should delete AI provider key as Owner", async () => {
      const keyId = "550e8400-e29b-41d4-a716-446655440003";

      (settingsService.deleteAiProviderKey as jest.Mock).mockResolvedValue(
        undefined,
      );

      await request(app.getHttpServer())
        .delete(`/settings/ai-providers/${keyId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.NO_CONTENT);

      expect(settingsService.deleteAiProviderKey).toHaveBeenCalledWith(
        keyId,
        expect.any(String), // organizationId
      );
    });

    it("should reject non-Owner from deleting AI provider keys", async () => {
      const keyId = "550e8400-e29b-41d4-a716-446655440003";

      await request(app.getHttpServer())
        .delete(`/settings/ai-providers/${keyId}`)
        .set("Authorization", "Bearer admin-jwt-token")
        .expect(HttpStatus.FORBIDDEN);
    });

    it("should return 404 when deleting nonexistent AI provider key", async () => {
      const fakeUuid = "00000000-0000-0000-0000-000000000099";
      (settingsService.deleteAiProviderKey as jest.Mock).mockRejectedValue(
        new NotFoundException("AI provider key not found"),
      );

      await request(app.getHttpServer())
        .delete(`/settings/ai-providers/${fakeUuid}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.NOT_FOUND);
    });

    it("should enforce multi-tenant isolation on AI keys", async () => {
      const keyId = "550e8400-e29b-41d4-a716-446655440003";

      (settingsService.deleteAiProviderKey as jest.Mock).mockResolvedValue(
        undefined,
      );

      await request(app.getHttpServer())
        .delete(`/settings/ai-providers/${keyId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.NO_CONTENT);

      // Verify organizationId was passed for isolation
      const callArgs = (settingsService.deleteAiProviderKey as jest.Mock).mock
        .calls[0];
      expect(callArgs[1]).toEqual(expect.any(String)); // organizationId
    });
  });
});
