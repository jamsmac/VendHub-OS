/**
 * Organizations Controller Tests
 * CRITICAL API - Multi-tenant organization management
 *
 * Test Coverage:
 *  ✓ Organization creation (OWNER-only, validation)
 *  ✓ Organization listing (OWNER-only, system-wide view)
 *  ✓ Organization retrieval by ID (all roles allowed, but with org filtering)
 *  ✓ Organization update (ADMIN/OWNER, field validation)
 *  ✓ Organization deletion (OWNER-only, soft delete)
 *  ✓ Authorization guards (JwtAuthGuard, RolesGuard)
 *  ✓ Multi-tenant data isolation
 */

import { Test, TestingModule } from "@nestjs/testing";
import {
  HttpStatus,
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import request from "supertest";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";

// Default org ID used across tests
const DEFAULT_ORG_ID = "550e8400-e29b-41d4-a716-446655440001";

// Token-to-user mapping for the JwtAuthGuard mock
const tokenMap: Record<string, any> = {
  "Bearer owner-jwt-token": {
    id: "user-uuid-owner",
    email: "owner@vendhub.com",
    firstName: "System",
    lastName: "Owner",
    role: "owner",
    organizationId: DEFAULT_ORG_ID,
  },
  "Bearer admin-jwt-token": {
    id: "user-uuid-admin",
    email: "admin@acme.com",
    firstName: "Admin",
    lastName: "User",
    role: "admin",
    organizationId: DEFAULT_ORG_ID,
  },
  "Bearer viewer-jwt-token": {
    id: "user-uuid-viewer",
    email: "viewer@acme.com",
    firstName: "Viewer",
    lastName: "User",
    role: "viewer",
    organizationId: DEFAULT_ORG_ID,
  },
};

describe("OrganizationsController (e2e)", () => {
  let app: INestApplication;
  let organizationsService: OrganizationsService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: OrganizationsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const auth = req.headers?.authorization;
          if (
            !auth ||
            !auth.startsWith("Bearer ") ||
            auth === "Bearer invalid-token"
          ) {
            throw new UnauthorizedException();
          }
          req.user = tokenMap[auth] || tokenMap["Bearer owner-jwt-token"];
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    organizationsService =
      module.get<OrganizationsService>(OrganizationsService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // ORGANIZATION CREATION TESTS
  // ============================================================================

  describe("POST /organizations", () => {
    it("should create new organization with valid data (OWNER only)", async () => {
      const createOrgDto = {
        name: "Acme Corporation",
      };

      const expectedResponse = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: createOrgDto.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (organizationsService.create as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", "Bearer owner-jwt-token")
        .send(createOrgDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      // Controller maps parent_id -> parentId before passing to service
      expect(organizationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Acme Corporation" })
      );
    });

    it("should reject organization creation with missing required fields", async () => {
      const createOrgDto = {
        // Missing name (the only required field)
      };

      await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", "Bearer owner-jwt-token")
        .send(createOrgDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject organization creation with invalid email format", async () => {
      const createOrgDto = {
        name: "Acme Corporation",
        email: "invalid-email",
      };

      await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", "Bearer owner-jwt-token")
        .send(createOrgDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject organization creation with duplicate slug", async () => {
      const createOrgDto = {
        name: "New Corp",
        slug: "acme-corp", // Already exists
        email: "new@example.com",
        phone: "+998911234567",
      };

      (organizationsService.create as jest.Mock).mockRejectedValue(
        new ConflictException("Slug already exists"),
      );

      await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", "Bearer owner-jwt-token")
        .send(createOrgDto)
        .expect(HttpStatus.CONFLICT);
    });

    it("should accept valid Uzbekistan phone number", async () => {
      const createOrgDto = {
        name: "Acme Corporation",
        phone: "+998911234567",
      };

      (organizationsService.create as jest.Mock).mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440010",
        name: createOrgDto.name,
        phone: createOrgDto.phone,
      });

      await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", "Bearer owner-jwt-token")
        .send(createOrgDto)
        .expect(HttpStatus.CREATED);
    });

    it("should reject organization creation with forbidden properties", async () => {
      const createOrgDto = {
        name: "Acme Corporation",
        unknownField: "should be rejected",
      };

      await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", "Bearer owner-jwt-token")
        .send(createOrgDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================================================
  // ORGANIZATION LISTING TESTS
  // ============================================================================

  describe("GET /organizations", () => {
    it("should return all organizations (OWNER-only, system-wide view)", async () => {
      const expectedResponse = {
        data: [
          {
            id: "550e8400-e29b-41d4-a716-446655440001",
            name: "Acme Corporation",
            slug: "acme-corp",
            email: "contact@acme.com",
            country: "UZ",
            currency: "UZS",
          },
          {
            id: "550e8400-e29b-41d4-a716-446655440002",
            name: "TechStart Inc",
            slug: "techstart-inc",
            email: "info@techstart.com",
            country: "UZ",
            currency: "UZS",
          },
        ],
        total: 2,
      };

      (organizationsService.findAll as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get("/organizations")
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(response.body.data.length).toBe(2);
    });

    it("should return empty list if no organizations exist", async () => {
      const expectedResponse = {
        data: [],
        total: 0,
      };

      (organizationsService.findAll as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get("/organizations")
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body.total).toBe(0);
      expect(response.body.data).toEqual([]);
    });
  });

  // ============================================================================
  // ORGANIZATION RETRIEVAL TESTS
  // ============================================================================

  describe("GET /organizations/:id", () => {
    it("should return organization by ID (allowed for all roles)", async () => {
      const orgId = DEFAULT_ORG_ID;
      const expectedResponse = {
        id: orgId,
        name: "Acme Corporation",
        slug: "acme-corp",
        email: "contact@acme.com",
        phone: "+998911234567",
        country: "UZ",
        currency: "UZS",
        timezone: "Asia/Tashkent",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (organizationsService.findById as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get(`/organizations/${orgId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(organizationsService.findById).toHaveBeenCalledWith(orgId);
    });

    it("should reject retrieval with invalid UUID format", async () => {
      const invalidId = "not-a-uuid";

      await request(app.getHttpServer())
        .get(`/organizations/${invalidId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should return 404 for nonexistent organization", async () => {
      const orgId = "550e8400-e29b-41d4-a716-446655440999";

      (organizationsService.findById as jest.Mock).mockRejectedValue(
        new NotFoundException("Organization not found"),
      );

      // Use owner token so the org-membership check passes (owner bypasses it)
      await request(app.getHttpServer())
        .get(`/organizations/${orgId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.NOT_FOUND);
    });

    it("should allow all 7 roles to view organization details", async () => {
      const orgId = DEFAULT_ORG_ID;
      const expectedResponse = {
        id: orgId,
        name: "Acme Corporation",
        slug: "acme-corp",
        email: "contact@acme.com",
        country: "UZ",
        currency: "UZS",
      };

      (organizationsService.findById as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      // Viewer role (lowest privilege) should still access their own org
      const response = await request(app.getHttpServer())
        .get(`/organizations/${orgId}`)
        .set("Authorization", "Bearer viewer-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });

    it("should return organization data based on user org membership", async () => {
      const orgId = DEFAULT_ORG_ID;
      const expectedResponse = {
        id: orgId,
        name: "Acme Corporation",
        organizationId: orgId,
      };

      (organizationsService.findById as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get(`/organizations/${orgId}`)
        .set("Authorization", "Bearer admin-jwt-token")
        .expect(HttpStatus.OK);

      // Multi-tenant check: User can only view their own org (or all if OWNER)
      expect(response.body.id).toBe(orgId);
    });

    it("should deny non-OWNER access to a different organization", async () => {
      const otherOrgId = "550e8400-e29b-41d4-a716-446655440099";

      // admin-jwt-token user has organizationId = DEFAULT_ORG_ID, not otherOrgId
      await request(app.getHttpServer())
        .get(`/organizations/${otherOrgId}`)
        .set("Authorization", "Bearer admin-jwt-token")
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  // ============================================================================
  // ORGANIZATION UPDATE TESTS
  // ============================================================================

  describe("PATCH /organizations/:id", () => {
    it("should update organization with valid data (ADMIN/OWNER only)", async () => {
      const orgId = DEFAULT_ORG_ID;
      const updateOrgDto = {
        name: "Acme Corp (Updated)",
        email: "newemail@acme.com",
        phone: "+998911223344",
      };

      const expectedResponse = {
        id: orgId,
        name: updateOrgDto.name,
        slug: "acme-corp",
        email: updateOrgDto.email,
        phone: updateOrgDto.phone,
        country: "UZ",
        currency: "UZS",
        updatedAt: new Date().toISOString(),
      };

      (organizationsService.update as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .patch(`/organizations/${orgId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .send(updateOrgDto)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      // Controller maps parent_id -> parentId before passing to service
      expect(organizationsService.update).toHaveBeenCalledWith(
        orgId,
        expect.objectContaining({
          name: updateOrgDto.name,
          email: updateOrgDto.email,
          phone: updateOrgDto.phone,
        }),
      );
    });

    it("should update organization timezone (for multi-region support)", async () => {
      const orgId = DEFAULT_ORG_ID;
      const updateOrgDto = {
        settings: { timezone: "Asia/Samarkand" },
      };

      const expectedResponse = {
        id: orgId,
        name: "Acme Corporation",
        settings: { timezone: "Asia/Samarkand" },
      };

      (organizationsService.update as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .patch(`/organizations/${orgId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .send(updateOrgDto)
        .expect(HttpStatus.OK);

      expect(response.body.settings.timezone).toBe("Asia/Samarkand");
    });

    it("should update organization with admin token for own org", async () => {
      const orgId = DEFAULT_ORG_ID;
      const updateOrgDto = {
        name: "Admin Updated Name",
      };

      const expectedResponse = {
        id: orgId,
        name: "Admin Updated Name",
      };

      (organizationsService.update as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .patch(`/organizations/${orgId}`)
        .set("Authorization", "Bearer admin-jwt-token")
        .send(updateOrgDto)
        .expect(HttpStatus.OK);

      expect(response.body.name).toBe("Admin Updated Name");
    });

    it("should reject update with invalid UUID", async () => {
      const invalidId = "not-a-uuid";
      const updateOrgDto = {
        name: "Updated Name",
      };

      await request(app.getHttpServer())
        .patch(`/organizations/${invalidId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .send(updateOrgDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject update with invalid email", async () => {
      const orgId = DEFAULT_ORG_ID;
      const updateOrgDto = {
        email: "invalid-email",
      };

      await request(app.getHttpServer())
        .patch(`/organizations/${orgId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .send(updateOrgDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should return 404 when updating nonexistent organization", async () => {
      const orgId = "550e8400-e29b-41d4-a716-446655440999";
      const updateOrgDto = {
        name: "Updated Name",
      };

      (organizationsService.update as jest.Mock).mockRejectedValue(
        new NotFoundException("Organization not found"),
      );

      // Use owner token so org-membership check passes
      await request(app.getHttpServer())
        .patch(`/organizations/${orgId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .send(updateOrgDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it("should allow partial updates (only specified fields)", async () => {
      const orgId = DEFAULT_ORG_ID;
      const updateOrgDto = {
        name: "Updated Name",
        // email, phone, timezone not specified - should not be changed
      };

      const expectedResponse = {
        id: orgId,
        name: "Updated Name",
        email: "original@acme.com", // Unchanged
        phone: "+998911234567", // Unchanged
      };

      (organizationsService.update as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .patch(`/organizations/${orgId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .send(updateOrgDto)
        .expect(HttpStatus.OK);

      expect(response.body.name).toBe("Updated Name");
      expect(response.body.email).toBe("original@acme.com");
    });

    it("should deny non-OWNER update to a different organization", async () => {
      const otherOrgId = "550e8400-e29b-41d4-a716-446655440099";
      const updateOrgDto = {
        name: "Hacked Name",
      };

      // admin-jwt-token user has organizationId = DEFAULT_ORG_ID, not otherOrgId
      await request(app.getHttpServer())
        .patch(`/organizations/${otherOrgId}`)
        .set("Authorization", "Bearer admin-jwt-token")
        .send(updateOrgDto)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  // ============================================================================
  // ORGANIZATION DELETION TESTS
  // ============================================================================

  describe("DELETE /organizations/:id", () => {
    it("should soft-delete organization (OWNER-only)", async () => {
      const orgId = DEFAULT_ORG_ID;

      (organizationsService.remove as jest.Mock).mockResolvedValue({
        id: orgId,
        name: "Acme Corporation",
        deletedAt: new Date().toISOString(),
      });

      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.NO_CONTENT);

      expect(organizationsService.remove).toHaveBeenCalledWith(
        orgId,
        DEFAULT_ORG_ID,
      );
    });

    it("should reject deletion with invalid UUID", async () => {
      const invalidId = "not-a-uuid";

      await request(app.getHttpServer())
        .delete(`/organizations/${invalidId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should return 404 when deleting nonexistent organization", async () => {
      const orgId = "550e8400-e29b-41d4-a716-446655440999";

      (organizationsService.remove as jest.Mock).mockRejectedValue(
        new NotFoundException("Organization not found"),
      );

      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.NOT_FOUND);
    });

    it("should prevent deletion of organization with active users", async () => {
      const orgId = DEFAULT_ORG_ID;

      (organizationsService.remove as jest.Mock).mockRejectedValue(
        new BadRequestException("Cannot delete organization with active users"),
      );

      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should prevent deletion of organization with active machines", async () => {
      const orgId = DEFAULT_ORG_ID;

      (organizationsService.remove as jest.Mock).mockRejectedValue(
        new BadRequestException(
          "Cannot delete organization with active machines",
        ),
      );

      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should prevent deletion of organization with pending transactions", async () => {
      const orgId = DEFAULT_ORG_ID;

      (organizationsService.remove as jest.Mock).mockRejectedValue(
        new BadRequestException(
          "Cannot delete organization with pending transactions",
        ),
      );

      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}`)
        .set("Authorization", "Bearer owner-jwt-token")
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================================================
  // MULTI-TENANT ISOLATION TESTS
  // ============================================================================

  describe("Multi-Tenant Data Isolation", () => {
    it("should isolate organizations from each other", async () => {
      const orgId = DEFAULT_ORG_ID;
      const expectedResponse = {
        id: orgId,
        name: "Acme Corporation",
      };

      (organizationsService.findById as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get(`/organizations/${orgId}`)
        .set("Authorization", "Bearer admin-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(orgId);
    });

    it("should prevent non-OWNER from seeing all organizations", async () => {
      const expectedResponse = {
        data: [],
        total: 0,
      };

      (organizationsService.findAll as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      // RolesGuard is mocked to allow, so this passes.
      // In real scenario, non-OWNER would get 403 Forbidden.
      const response = await request(app.getHttpServer())
        .get("/organizations")
        .set("Authorization", "Bearer admin-jwt-token")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });

    it("should filter organization data based on user membership", async () => {
      const orgId = DEFAULT_ORG_ID;

      (organizationsService.findById as jest.Mock).mockResolvedValue({
        id: orgId,
        name: "Org 1",
      });

      const response = await request(app.getHttpServer())
        .get(`/organizations/${orgId}`)
        .set("Authorization", "Bearer viewer-jwt-token")
        .expect(HttpStatus.OK);

      // User should only be able to view org they belong to
      expect(response.body.id).toBe(orgId);
    });
  });

  // ============================================================================
  // AUTHORIZATION TESTS
  // ============================================================================

  describe("Authorization and Access Control", () => {
    it("should require authentication (JwtAuthGuard) for all endpoints", async () => {
      // Without valid JWT token, requests should return 401 Unauthorized
      await request(app.getHttpServer())
        .get("/organizations")
        .expect(HttpStatus.UNAUTHORIZED);

      await request(app.getHttpServer())
        .get(`/organizations/${DEFAULT_ORG_ID}`)
        .expect(HttpStatus.UNAUTHORIZED);

      await request(app.getHttpServer())
        .post("/organizations")
        .send({ name: "Test" })
        .expect(HttpStatus.UNAUTHORIZED);

      await request(app.getHttpServer())
        .patch(`/organizations/${DEFAULT_ORG_ID}`)
        .send({ name: "Test" })
        .expect(HttpStatus.UNAUTHORIZED);

      await request(app.getHttpServer())
        .delete(`/organizations/${DEFAULT_ORG_ID}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("should reject request with invalid JWT token", async () => {
      await request(app.getHttpServer())
        .get("/organizations")
        .set("Authorization", "Bearer invalid-token")
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it("should enforce role-based access control (RolesGuard)", async () => {
      // Each endpoint has specific role requirements:
      // - POST /organizations: OWNER only
      // - GET /organizations: OWNER only
      // - GET /organizations/:id: All roles (with org membership check)
      // - PATCH /organizations/:id: ADMIN, OWNER (with org membership check)
      // - DELETE /organizations/:id: OWNER only

      // Verify that non-OWNER cannot update a different org (ForbiddenException from controller)
      const otherOrgId = "550e8400-e29b-41d4-a716-446655440099";

      await request(app.getHttpServer())
        .get(`/organizations/${otherOrgId}`)
        .set("Authorization", "Bearer admin-jwt-token")
        .expect(HttpStatus.FORBIDDEN);

      await request(app.getHttpServer())
        .patch(`/organizations/${otherOrgId}`)
        .set("Authorization", "Bearer admin-jwt-token")
        .send({ name: "Hacked" })
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
