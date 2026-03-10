import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { RbacController } from "./rbac.controller";
import { RbacService } from "./rbac.service";

describe("RbacController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      RbacController,
      RbacService,
      [
        "findAllRoles",
        "createRole",
        "findRoleById",
        "updateRole",
        "deleteRole",
        "syncRolePermissions",
        "findAllPermissions",
        "createPermission",
        "assignRoleToUser",
        "removeRoleFromUser",
        "getUserRoles",
        "getUserPermissions",
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Auth required
  // =========================================================================

  it("GET /rbac/roles returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/rbac/roles")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // Role rejection
  // =========================================================================

  it("GET /rbac/roles rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/rbac/roles")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /rbac/roles rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/rbac/roles")
      .set("Authorization", "Bearer viewer-token")
      .send({ name: "custom_role" })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /rbac/permissions rejects admin role (owner-only)", async () => {
    await request(app.getHttpServer())
      .post("/rbac/permissions")
      .set("Authorization", "Bearer admin-token")
      .send({
        name: "users:create",
        resource: "users",
        action: "create",
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // Roles CRUD
  // =========================================================================

  it("GET /rbac/roles returns 200 for admin", async () => {
    mockService.findAllRoles.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/rbac/roles")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /rbac/roles returns 201 for admin", async () => {
    mockService.createRole.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/rbac/roles")
      .set("Authorization", "Bearer admin-token")
      .send({ name: "custom_manager" })
      .expect(HttpStatus.CREATED);
  });

  it("GET /rbac/roles/:id returns 200 for admin", async () => {
    mockService.findRoleById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/rbac/roles/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("PATCH /rbac/roles/:id returns 200 for admin", async () => {
    mockService.updateRole.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/rbac/roles/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ description: "Updated role" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /rbac/roles/:id returns 200 for admin", async () => {
    mockService.deleteRole.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/rbac/roles/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("PUT /rbac/roles/:id/permissions returns 200 for admin", async () => {
    mockService.syncRolePermissions.mockResolvedValue({});
    await request(app.getHttpServer())
      .put(`/rbac/roles/${TEST_UUID}/permissions`)
      .set("Authorization", "Bearer admin-token")
      .send({ permissionIds: [TEST_UUID] })
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // Permissions
  // =========================================================================

  it("GET /rbac/permissions returns 200 for admin", async () => {
    mockService.findAllPermissions.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/rbac/permissions")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /rbac/permissions returns 201 for owner", async () => {
    mockService.createPermission.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/rbac/permissions")
      .set("Authorization", "Bearer owner-token")
      .send({
        name: "users:create",
        resource: "users",
        action: "create",
      })
      .expect(HttpStatus.CREATED);
  });

  // =========================================================================
  // User-Role assignment
  // =========================================================================

  it("POST /rbac/users/:userId/roles returns 200 for admin", async () => {
    mockService.assignRoleToUser.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .post(`/rbac/users/${TEST_UUID}/roles`)
      .set("Authorization", "Bearer admin-token")
      .send({ roleId: TEST_UUID })
      .expect(HttpStatus.CREATED);
  });

  it("DELETE /rbac/users/:userId/roles/:roleId returns 200 for admin", async () => {
    mockService.removeRoleFromUser.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/rbac/users/${TEST_UUID}/roles/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /rbac/users/:userId/roles returns 200 for admin", async () => {
    mockService.getUserRoles.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/rbac/users/${TEST_UUID}/roles`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /rbac/users/:userId/permissions returns 200 for admin", async () => {
    mockService.getUserPermissions.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/rbac/users/${TEST_UUID}/permissions`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });
});
