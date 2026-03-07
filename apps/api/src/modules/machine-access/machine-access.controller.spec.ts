/**
 * Machine Access Controller Tests
 * OPERATIONS API - Machine access control and template management
 *
 * Test Coverage:
 *  - Access CRUD (grant, revoke, list, get by machine/user, delete)
 *  - Access template management (create, list, get, update, delete, apply)
 *  - Role-based access control (owner/admin/manager allowed, operator/viewer restricted)
 *  - Multi-tenant isolation by organizationId
 *  - Soft delete with includeInactive filtering
 *  - Pagination and filtering (page, limit, machineId, userId)
 *  - Bulk operations (apply template to multiple users)
 *  - Invalid UUID validation via ParseUUIDPipe
 */

import { Test, TestingModule } from "@nestjs/testing";
import {
  HttpStatus,
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import request from "supertest";
import { MachineAccessController } from "./machine-access.controller";
import { MachineAccessService } from "./machine-access.service";
import {
  ROLES_KEY,
  ROLE_HIERARCHY,
  UserRole,
} from "../../common/decorators/roles.decorator";
import { MachineAccessRole } from "./entities/machine-access.entity";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ORG_ID = "550e8400-e29b-41d4-a716-446655440001";
const ADMIN_USER_ID = "550e8400-e29b-41d4-a716-446655440099";
const OPERATOR_USER_ID = "550e8400-e29b-41d4-a716-446655440088";
const VIEWER_USER_ID = "550e8400-e29b-41d4-a716-446655440077";
const MANAGER_USER_ID = "550e8400-e29b-41d4-a716-446655440066";

const MACHINE_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID = "550e8400-e29b-41d4-a716-446655440010";
const ACCESS_ID = "550e8400-e29b-41d4-a716-446655440020";
const TEMPLATE_ID = "550e8400-e29b-41d4-a716-446655440030";

// ---------------------------------------------------------------------------
// Token -> User map
// ---------------------------------------------------------------------------

interface TestUser {
  id: string;
  role: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
}

const tokenMap: Record<string, TestUser> = {
  "Bearer admin-token": {
    id: ADMIN_USER_ID,
    role: "admin",
    organizationId: ORG_ID,
    email: "admin@test.com",
    firstName: "Admin",
    lastName: "User",
  },
  "Bearer operator-token": {
    id: OPERATOR_USER_ID,
    role: "operator",
    organizationId: ORG_ID,
    email: "operator@test.com",
    firstName: "Operator",
    lastName: "User",
  },
  "Bearer viewer-token": {
    id: VIEWER_USER_ID,
    role: "viewer",
    organizationId: ORG_ID,
    email: "viewer@test.com",
    firstName: "Viewer",
    lastName: "User",
  },
  "Bearer manager-token": {
    id: MANAGER_USER_ID,
    role: "manager",
    organizationId: ORG_ID,
    email: "manager@test.com",
    firstName: "Manager",
    lastName: "User",
  },
};

const defaultUser = tokenMap["Bearer admin-token"];

// ---------------------------------------------------------------------------
// Mock Guards (registered as APP_GUARD since controller has no @UseGuards)
// ---------------------------------------------------------------------------

@Injectable()
class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth: string | undefined = req.headers?.authorization;
    if (
      !auth ||
      !auth.startsWith("Bearer ") ||
      auth === "Bearer invalid-token"
    ) {
      throw new UnauthorizedException();
    }
    req.user = tokenMap[auth] || defaultUser;
    return true;
  }
}

@Injectable()
class MockRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
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
    const userRole = user.role as UserRole;
    const hasRole = requiredRoles.some((role: string) => {
      if (role === userRole) return true;
      const userLevel = ROLE_HIERARCHY[userRole] || 0;
      const requiredLevel = ROLE_HIERARCHY[role as UserRole] || 100;
      return userLevel >= requiredLevel;
    });
    if (!hasRole) {
      throw new ForbiddenException("Insufficient permissions");
    }
    return true;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MachineAccessController (e2e)", () => {
  let app: INestApplication;
  let machineAccessService: MachineAccessService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MachineAccessController],
      providers: [
        {
          provide: MachineAccessService,
          useValue: {
            grantAccess: jest.fn(),
            revokeAccess: jest.fn(),
            findAll: jest.fn(),
            getAccessByMachine: jest.fn(),
            getAccessByUser: jest.fn(),
            findById: jest.fn(),
            remove: jest.fn(),
            createTemplate: jest.fn(),
            findAllTemplates: jest.fn(),
            findTemplateById: jest.fn(),
            updateTemplate: jest.fn(),
            removeTemplate: jest.fn(),
            applyTemplate: jest.fn(),
          },
        },
        // Register guards as APP_GUARD (matching app.module.ts pattern)
        {
          provide: APP_GUARD,
          useClass: MockJwtAuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: MockRolesGuard,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    machineAccessService =
      module.get<MachineAccessService>(MachineAccessService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ============================================================================
  // ACCESS CRUD - Grant and Revoke
  // ============================================================================

  describe("POST /machine-access (Grant Access)", () => {
    it("should grant access to machine for a user", async () => {
      const grantDto = {
        machineId: MACHINE_ID,
        userId: USER_ID,
        role: MachineAccessRole.VIEW,
      };

      const expectedResponse = {
        id: ACCESS_ID,
        organizationId: ORG_ID,
        machineId: grantDto.machineId,
        userId: grantDto.userId,
        role: grantDto.role,
        isActive: true,
        createdAt: "2026-03-06T00:00:00Z",
        updatedAt: "2026-03-06T00:00:00Z",
      };

      (machineAccessService.grantAccess as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post("/machine-access")
        .set("Authorization", "Bearer admin-token")
        .send(grantDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(machineAccessService.grantAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          machineId: MACHINE_ID,
          userId: USER_ID,
          role: MachineAccessRole.VIEW,
        }),
        ADMIN_USER_ID,
        ORG_ID,
      );
    });

    it("should reject duplicate active access (409 Conflict)", async () => {
      const grantDto = {
        machineId: MACHINE_ID,
        userId: USER_ID,
        role: MachineAccessRole.VIEW,
      };

      (machineAccessService.grantAccess as jest.Mock).mockRejectedValue(
        new ConflictException("User already has active access to this machine"),
      );

      await request(app.getHttpServer())
        .post("/machine-access")
        .set("Authorization", "Bearer admin-token")
        .send(grantDto)
        .expect(HttpStatus.CONFLICT);
    });

    it("should reject invalid role enum value", async () => {
      const invalidDto = {
        machineId: MACHINE_ID,
        userId: USER_ID,
        role: "INVALID_ROLE",
      };

      await request(app.getHttpServer())
        .post("/machine-access")
        .set("Authorization", "Bearer admin-token")
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject access for non-admin roles", async () => {
      const grantDto = {
        machineId: MACHINE_ID,
        userId: USER_ID,
        role: MachineAccessRole.VIEW,
      };

      await request(app.getHttpServer())
        .post("/machine-access")
        .set("Authorization", "Bearer viewer-token")
        .send(grantDto)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe("POST /machine-access/revoke", () => {
    it("should revoke access and return 200", async () => {
      const revokeDto = {
        accessId: ACCESS_ID,
      };

      const expectedResponse = {
        id: ACCESS_ID,
        isActive: false,
        updatedAt: "2026-03-06T12:00:00Z",
      };

      (machineAccessService.revokeAccess as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post("/machine-access/revoke")
        .set("Authorization", "Bearer admin-token")
        .send(revokeDto)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(machineAccessService.revokeAccess).toHaveBeenCalledWith(
        expect.objectContaining({ accessId: ACCESS_ID }),
        ADMIN_USER_ID,
        ORG_ID,
      );
    });

    it("should return 404 for nonexistent access record", async () => {
      const revokeDto = {
        accessId: "550e8400-e29b-41d4-a716-446655440999",
      };

      (machineAccessService.revokeAccess as jest.Mock).mockRejectedValue(
        new NotFoundException("Access record not found"),
      );

      await request(app.getHttpServer())
        .post("/machine-access/revoke")
        .set("Authorization", "Bearer admin-token")
        .send(revokeDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it("should reject access for non-admin roles", async () => {
      const revokeDto = {
        accessId: ACCESS_ID,
      };

      await request(app.getHttpServer())
        .post("/machine-access/revoke")
        .set("Authorization", "Bearer operator-token")
        .send(revokeDto)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  // ============================================================================
  // ACCESS CRUD - Query and List
  // ============================================================================

  describe("GET /machine-access", () => {
    it("should list all access records with pagination", async () => {
      const mockAccessRecords = [
        {
          id: ACCESS_ID,
          machineId: MACHINE_ID,
          userId: USER_ID,
          isActive: true,
        },
      ];

      (machineAccessService.findAll as jest.Mock).mockResolvedValue({
        data: mockAccessRecords,
        page: 1,
        limit: 10,
        total: 1,
      });

      const response = await request(app.getHttpServer())
        .get("/machine-access?page=1&limit=10")
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.OK);

      expect(response.body.data).toEqual(mockAccessRecords);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });

    it("should filter by machineId", async () => {
      (machineAccessService.findAll as jest.Mock).mockResolvedValue({
        data: [],
        page: 1,
        limit: 10,
        total: 0,
      });

      await request(app.getHttpServer())
        .get(`/machine-access?machineId=${MACHINE_ID}`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.OK);

      expect(machineAccessService.findAll).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({
          machineId: MACHINE_ID,
        }),
      );
    });

    it("should filter by userId", async () => {
      (machineAccessService.findAll as jest.Mock).mockResolvedValue({
        data: [],
        page: 1,
        limit: 10,
        total: 0,
      });

      await request(app.getHttpServer())
        .get(`/machine-access?userId=${USER_ID}`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.OK);

      expect(machineAccessService.findAll).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({
          userId: USER_ID,
        }),
      );
    });

    it("should reject access for non-admin roles", async () => {
      await request(app.getHttpServer())
        .get("/machine-access")
        .set("Authorization", "Bearer operator-token")
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe("GET /machine-access/machine/:machineId", () => {
    it("should return all access records for a machine", async () => {
      const mockAccess = [
        {
          id: ACCESS_ID,
          userId: USER_ID,
          role: MachineAccessRole.VIEW,
          isActive: true,
        },
      ];

      (machineAccessService.getAccessByMachine as jest.Mock).mockResolvedValue(
        mockAccess,
      );

      const response = await request(app.getHttpServer())
        .get(`/machine-access/machine/${MACHINE_ID}`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockAccess);
      expect(machineAccessService.getAccessByMachine).toHaveBeenCalledWith(
        MACHINE_ID,
        ORG_ID,
        undefined,
      );
    });

    it("should include inactive access with includeInactive flag", async () => {
      (machineAccessService.getAccessByMachine as jest.Mock).mockResolvedValue(
        [],
      );

      await request(app.getHttpServer())
        .get(`/machine-access/machine/${MACHINE_ID}?includeInactive=true`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.OK);

      expect(machineAccessService.getAccessByMachine).toHaveBeenCalledWith(
        MACHINE_ID,
        ORG_ID,
        expect.anything(), // includeInactive passed as query string value
      );
    });

    it("should reject invalid UUID format", async () => {
      await request(app.getHttpServer())
        .get("/machine-access/machine/not-a-uuid")
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should allow OPERATOR role to view machine access", async () => {
      (machineAccessService.getAccessByMachine as jest.Mock).mockResolvedValue(
        [],
      );

      await request(app.getHttpServer())
        .get(`/machine-access/machine/${MACHINE_ID}`)
        .set("Authorization", "Bearer operator-token")
        .expect(HttpStatus.OK);
    });
  });

  describe("GET /machine-access/user/:userId", () => {
    it("should return all access records for a user", async () => {
      const mockAccess = [
        {
          id: ACCESS_ID,
          machineId: MACHINE_ID,
          role: MachineAccessRole.VIEW,
          isActive: true,
        },
      ];

      (machineAccessService.getAccessByUser as jest.Mock).mockResolvedValue(
        mockAccess,
      );

      const response = await request(app.getHttpServer())
        .get(`/machine-access/user/${USER_ID}`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockAccess);
      expect(machineAccessService.getAccessByUser).toHaveBeenCalledWith(
        USER_ID,
        ORG_ID,
        undefined,
      );
    });

    it("should include inactive access with includeInactive flag", async () => {
      (machineAccessService.getAccessByUser as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get(`/machine-access/user/${USER_ID}?includeInactive=true`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.OK);

      expect(machineAccessService.getAccessByUser).toHaveBeenCalledWith(
        USER_ID,
        ORG_ID,
        expect.anything(), // includeInactive passed as query string value
      );
    });

    it("should reject invalid UUID format", async () => {
      await request(app.getHttpServer())
        .get("/machine-access/user/invalid-uuid")
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject access for non-admin roles", async () => {
      await request(app.getHttpServer())
        .get(`/machine-access/user/${USER_ID}`)
        .set("Authorization", "Bearer operator-token")
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe("GET /machine-access/:id", () => {
    it("should return specific access record", async () => {
      const expectedResponse = {
        id: ACCESS_ID,
        machineId: MACHINE_ID,
        userId: USER_ID,
        role: MachineAccessRole.VIEW,
        isActive: true,
        createdAt: "2026-03-01T00:00:00Z",
      };

      (machineAccessService.findById as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get(`/machine-access/${ACCESS_ID}`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });

    it("should reject invalid UUID format", async () => {
      await request(app.getHttpServer())
        .get("/machine-access/not-a-uuid")
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should return 404 for nonexistent record", async () => {
      const nonexistentId = "550e8400-e29b-41d4-a716-446655440999";

      (machineAccessService.findById as jest.Mock).mockRejectedValue(
        new NotFoundException("Access record not found"),
      );

      await request(app.getHttpServer())
        .get(`/machine-access/${nonexistentId}`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe("DELETE /machine-access/:id", () => {
    it("should soft delete access record and return 204", async () => {
      (machineAccessService.remove as jest.Mock).mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/machine-access/${ACCESS_ID}`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.NO_CONTENT);

      expect(machineAccessService.remove).toHaveBeenCalledWith(
        ACCESS_ID,
        ORG_ID,
      );
    });

    it("should reject invalid UUID format", async () => {
      await request(app.getHttpServer())
        .delete("/machine-access/not-a-uuid")
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject access for non-admin roles (owner/admin only)", async () => {
      await request(app.getHttpServer())
        .delete(`/machine-access/${ACCESS_ID}`)
        .set("Authorization", "Bearer manager-token")
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  // ============================================================================
  // TEMPLATES - Management
  // ============================================================================

  describe("POST /machine-access/templates", () => {
    it("should create access template", async () => {
      const createDto = {
        name: "Operator Access",
        description: "Standard operator permissions",
        rows: [
          { role: MachineAccessRole.REFILL, permissions: { can_view: true } },
        ],
      };

      const expectedResponse = {
        id: TEMPLATE_ID,
        organizationId: ORG_ID,
        name: createDto.name,
        description: createDto.description,
        rows: createDto.rows,
        createdAt: "2026-03-06T00:00:00Z",
      };

      (machineAccessService.createTemplate as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post("/machine-access/templates")
        .set("Authorization", "Bearer admin-token")
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(machineAccessService.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Operator Access" }),
        ORG_ID,
      );
    });

    it("should reject missing required fields (no rows)", async () => {
      const incompleteDto = {
        name: "Incomplete Template",
        // missing rows
      };

      await request(app.getHttpServer())
        .post("/machine-access/templates")
        .set("Authorization", "Bearer admin-token")
        .send(incompleteDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject invalid role in template rows", async () => {
      const invalidDto = {
        name: "Bad Template",
        rows: [{ role: "INVALID_ROLE" }],
      };

      await request(app.getHttpServer())
        .post("/machine-access/templates")
        .set("Authorization", "Bearer admin-token")
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject access for non-admin roles", async () => {
      const createDto = {
        name: "Operator Access",
        rows: [{ role: MachineAccessRole.VIEW }],
      };

      await request(app.getHttpServer())
        .post("/machine-access/templates")
        .set("Authorization", "Bearer viewer-token")
        .send(createDto)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe("GET /machine-access/templates/list", () => {
    it("should list all templates", async () => {
      const mockTemplates = [
        {
          id: TEMPLATE_ID,
          name: "Operator Access",
          isActive: true,
          rows: [{ role: MachineAccessRole.VIEW }],
        },
      ];

      (machineAccessService.findAllTemplates as jest.Mock).mockResolvedValue(
        mockTemplates,
      );

      const response = await request(app.getHttpServer())
        .get("/machine-access/templates/list")
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockTemplates);
    });

    it("should include inactive templates with flag", async () => {
      (machineAccessService.findAllTemplates as jest.Mock).mockResolvedValue(
        [],
      );

      await request(app.getHttpServer())
        .get("/machine-access/templates/list?includeInactive=true")
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.OK);

      expect(machineAccessService.findAllTemplates).toHaveBeenCalledWith(
        ORG_ID,
        expect.anything(), // includeInactive
      );
    });

    it("should reject access for non-admin roles", async () => {
      await request(app.getHttpServer())
        .get("/machine-access/templates/list")
        .set("Authorization", "Bearer operator-token")
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe("GET /machine-access/templates/:id", () => {
    it("should return specific template", async () => {
      const expectedResponse = {
        id: TEMPLATE_ID,
        name: "Operator Access",
        description: "Standard operator permissions",
        rows: [{ role: MachineAccessRole.REFILL }],
        createdAt: "2026-03-01T00:00:00Z",
      };

      (machineAccessService.findTemplateById as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get(`/machine-access/templates/${TEMPLATE_ID}`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });

    it("should reject invalid UUID format", async () => {
      await request(app.getHttpServer())
        .get("/machine-access/templates/not-a-uuid")
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should return 404 for nonexistent template", async () => {
      const nonexistentId = "550e8400-e29b-41d4-a716-446655440999";

      (machineAccessService.findTemplateById as jest.Mock).mockRejectedValue(
        new NotFoundException("Template not found"),
      );

      await request(app.getHttpServer())
        .get(`/machine-access/templates/${nonexistentId}`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe("PATCH /machine-access/templates/:id", () => {
    it("should update template", async () => {
      const updateDto = {
        name: "Updated Operator Access",
      };

      const expectedResponse = {
        id: TEMPLATE_ID,
        name: "Updated Operator Access",
        updatedAt: "2026-03-06T12:00:00Z",
      };

      (machineAccessService.updateTemplate as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .patch(`/machine-access/templates/${TEMPLATE_ID}`)
        .set("Authorization", "Bearer admin-token")
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(machineAccessService.updateTemplate).toHaveBeenCalledWith(
        TEMPLATE_ID,
        expect.objectContaining({ name: "Updated Operator Access" }),
        ORG_ID,
      );
    });

    it("should reject invalid UUID format", async () => {
      await request(app.getHttpServer())
        .patch("/machine-access/templates/not-a-uuid")
        .set("Authorization", "Bearer admin-token")
        .send({ name: "Updated" })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject access for non-admin roles", async () => {
      await request(app.getHttpServer())
        .patch(`/machine-access/templates/${TEMPLATE_ID}`)
        .set("Authorization", "Bearer operator-token")
        .send({ name: "Updated" })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe("DELETE /machine-access/templates/:id", () => {
    it("should soft delete template and return 204", async () => {
      (machineAccessService.removeTemplate as jest.Mock).mockResolvedValue(
        undefined,
      );

      await request(app.getHttpServer())
        .delete(`/machine-access/templates/${TEMPLATE_ID}`)
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.NO_CONTENT);

      expect(machineAccessService.removeTemplate).toHaveBeenCalledWith(
        TEMPLATE_ID,
        ORG_ID,
      );
    });

    it("should reject invalid UUID format", async () => {
      await request(app.getHttpServer())
        .delete("/machine-access/templates/not-a-uuid")
        .set("Authorization", "Bearer admin-token")
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject access for non-admin roles (owner/admin only)", async () => {
      await request(app.getHttpServer())
        .delete(`/machine-access/templates/${TEMPLATE_ID}`)
        .set("Authorization", "Bearer manager-token")
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  // ============================================================================
  // TEMPLATES - Apply (Bulk Grant)
  // ============================================================================

  describe("POST /machine-access/templates/apply", () => {
    const USER_ID_2 = "550e8400-e29b-41d4-a716-446655440011";
    const USER_ID_3 = "550e8400-e29b-41d4-a716-446655440012";

    it("should apply template to grant bulk access", async () => {
      const applyDto = {
        templateId: TEMPLATE_ID,
        machineId: MACHINE_ID,
        userIds: [USER_ID, USER_ID_2, USER_ID_3],
      };

      const expectedResponse = [
        { id: ACCESS_ID, machineId: MACHINE_ID, userId: USER_ID },
        {
          id: "550e8400-e29b-41d4-a716-446655440021",
          machineId: MACHINE_ID,
          userId: USER_ID_2,
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440022",
          machineId: MACHINE_ID,
          userId: USER_ID_3,
        },
      ];

      (machineAccessService.applyTemplate as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post("/machine-access/templates/apply")
        .set("Authorization", "Bearer admin-token")
        .send(applyDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(machineAccessService.applyTemplate).toHaveBeenCalledWith(
        TEMPLATE_ID,
        MACHINE_ID,
        [USER_ID, USER_ID_2, USER_ID_3],
        ADMIN_USER_ID,
        ORG_ID,
      );
    });

    it("should reject invalid template ID (not found)", async () => {
      const applyDto = {
        templateId: "550e8400-e29b-41d4-a716-446655440999",
        machineId: MACHINE_ID,
        userIds: [USER_ID],
      };

      (machineAccessService.applyTemplate as jest.Mock).mockRejectedValue(
        new NotFoundException("Template not found"),
      );

      await request(app.getHttpServer())
        .post("/machine-access/templates/apply")
        .set("Authorization", "Bearer admin-token")
        .send(applyDto)
        .expect(HttpStatus.NOT_FOUND);
    });

    it("should reject empty userIds array", async () => {
      const invalidDto = {
        templateId: TEMPLATE_ID,
        machineId: MACHINE_ID,
        userIds: [],
      };

      await request(app.getHttpServer())
        .post("/machine-access/templates/apply")
        .set("Authorization", "Bearer admin-token")
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should reject access for non-admin roles", async () => {
      const applyDto = {
        templateId: TEMPLATE_ID,
        machineId: MACHINE_ID,
        userIds: [USER_ID],
      };

      await request(app.getHttpServer())
        .post("/machine-access/templates/apply")
        .set("Authorization", "Bearer viewer-token")
        .send(applyDto)
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
