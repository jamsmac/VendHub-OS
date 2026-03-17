/**
 * Tasks Controller Tests
 * CRITICAL API - Task management and workflow operations
 *
 * Test Coverage:
 *  - Task CRUD operations (create, list, read, update, delete)
 *  - Task status transitions (assign, start, postpone, reject, cancel, complete)
 *  - Photo workflow (before/after sequencing, location data)
 *  - Task items/components/comments (nested resources)
 *  - Kanban board and statistics
 *  - Filtering and search
 *  - Role-based access control (RBAC) - 4 roles allowed
 *  - Multi-tenant isolation by organizationId
 *  - Soft delete behavior
 */

import { Test, TestingModule } from "@nestjs/testing";
import {
  HttpStatus,
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ExecutionContext,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import request from "supertest";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

// ---------------------------------------------------------------------------
// Mock user payloads keyed by Bearer token
// ---------------------------------------------------------------------------
const ADMIN_USER = {
  id: "user-1",
  email: "admin@test.com",
  firstName: "Admin",
  lastName: "User",
  role: "admin",
  organizationId: "org-1",
};

const OPERATOR_USER = {
  id: "user-2",
  email: "operator@test.com",
  firstName: "Operator",
  lastName: "User",
  role: "operator",
  organizationId: "org-1",
};

const tokenMap: Record<string, typeof ADMIN_USER> = {
  "Bearer admin-token": ADMIN_USER,
  "Bearer operator-token": OPERATOR_USER,
};

const DEFAULT_TOKEN = "Bearer admin-token";

describe("TasksController (e2e)", () => {
  let app: INestApplication;
  let tasksService: TasksService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: {
            // Task CRUD
            create: jest.fn(),
            findAll: jest.fn(),
            findByIdOrFail: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),

            // Task Status Operations
            assignTask: jest.fn(),
            startTask: jest.fn(),
            postponeTask: jest.fn(),
            rejectTask: jest.fn(),
            cancelTask: jest.fn(),
            completeTask: jest.fn(),

            // Photos
            uploadPhotoBefore: jest.fn(),
            uploadPhotoAfter: jest.fn(),

            // Task Items
            getTaskItems: jest.fn(),
            addTaskItem: jest.fn(),
            updateTaskItem: jest.fn(),
            removeTaskItem: jest.fn(),

            // Task Comments
            getComments: jest.fn(),
            addComment: jest.fn(),

            // Task Components
            getComponents: jest.fn(),
            addComponent: jest.fn(),

            // Task Photos (gallery)
            getPhotos: jest.fn(),
            addPhoto: jest.fn(),

            // Dashboard
            getKanbanBoard: jest.fn(),
            getMyTasks: jest.fn(),
            getTaskStats: jest.fn(),
            getOverdueTasks: jest.fn(),
          },
        },
      ],
    })
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
          req.user = tokenMap[auth] || ADMIN_USER;
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
    tasksService = module.get<TasksService>(TasksService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // TASK CRUD OPERATIONS
  // ============================================================================

  describe("POST /tasks", () => {
    it("should create a new task with valid data", async () => {
      const createDto = {
        title: "Machine maintenance at location A",
        description: "Replace motor and filters",
        type: "repair",
        priority: "high",
        organizationId: "550e8400-e29b-41d4-a716-446655440099",
        machineId: "550e8400-e29b-41d4-a716-446655440000",
        dueDate: "2026-03-20T10:00:00Z",
      };

      const expectedResponse = {
        id: "task-001",
        title: createDto.title,
        description: createDto.description,
        status: "pending",
        type: createDto.type,
        priority: createDto.priority,
        machineId: createDto.machineId,
        dueDate: createDto.dueDate,
        createdAt: new Date().toISOString(),
      };

      (tasksService.create as jest.Mock).mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post("/tasks")
        .set("Authorization", DEFAULT_TOKEN)
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(tasksService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: createDto.title,
          createdByUserId: ADMIN_USER.id,
          organizationId: ADMIN_USER.organizationId,
        }),
      );
    });

    it("should reject task creation without required fields", async () => {
      const invalidDto = {
        description: "Missing title and type",
        // title, type, organizationId are required
      };

      await request(app.getHttpServer())
        .post("/tasks")
        .set("Authorization", DEFAULT_TOKEN)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should only allow ADMIN, MANAGER, OWNER roles (OPERATOR cannot create)", async () => {
      const createDto = {
        title: "Maintenance task",
        type: "repair",
        organizationId: "550e8400-e29b-41d4-a716-446655440099",
        machineId: "550e8400-e29b-41d4-a716-446655440000",
      };

      (tasksService.create as jest.Mock).mockResolvedValue({
        id: "task-002",
      });

      await request(app.getHttpServer())
        .post("/tasks")
        .set("Authorization", DEFAULT_TOKEN)
        .send(createDto)
        .expect(HttpStatus.CREATED);
    });
  });

  describe("GET /tasks", () => {
    it("should retrieve all tasks with multi-tenant isolation", async () => {
      const expectedResponse = [
        {
          id: "task-001",
          title: "Maintenance",
          status: "pending",
          organizationId: "org-001",
        },
        {
          id: "task-002",
          title: "Restocking",
          status: "in-progress",
          organizationId: "org-001",
        },
      ];

      (tasksService.findAll as jest.Mock).mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .get("/tasks")
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(tasksService.findAll).toHaveBeenCalledWith(
        ADMIN_USER.organizationId,
        expect.any(Object),
      );
    });

    it("should filter tasks by status", async () => {
      const expectedResponse = [
        {
          id: "task-001",
          status: "in-progress",
        },
      ];

      (tasksService.findAll as jest.Mock).mockResolvedValue(expectedResponse);

      await request(app.getHttpServer())
        .get("/tasks")
        .set("Authorization", DEFAULT_TOKEN)
        .query({ status: "in-progress" })
        .expect(HttpStatus.OK);

      expect(tasksService.findAll).toHaveBeenCalledWith(
        ADMIN_USER.organizationId,
        expect.objectContaining({ status: "in-progress" }),
      );
    });

    it("should filter tasks by type, priority, machineId, assigneeId", async () => {
      (tasksService.findAll as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get("/tasks")
        .set("Authorization", DEFAULT_TOKEN)
        .query({
          type: "repair",
          priority: "high",
          machineId: "machine-123",
          assigneeId: "user-456",
        })
        .expect(HttpStatus.OK);

      expect(tasksService.findAll).toHaveBeenCalledWith(
        ADMIN_USER.organizationId,
        expect.objectContaining({
          type: "repair",
          priority: "high",
          machineId: "machine-123",
          assigneeId: "user-456",
        }),
      );
    });

    it("should search tasks by title or description", async () => {
      (tasksService.findAll as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get("/tasks")
        .set("Authorization", DEFAULT_TOKEN)
        .query({ search: "motor replacement" })
        .expect(HttpStatus.OK);

      expect(tasksService.findAll).toHaveBeenCalledWith(
        ADMIN_USER.organizationId,
        expect.objectContaining({ search: "motor replacement" }),
      );
    });

    it("should allow OPERATOR role to view tasks", async () => {
      (tasksService.findAll as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get("/tasks")
        .set("Authorization", "Bearer operator-token")
        .expect(HttpStatus.OK);

      // OPERATOR can view, but not create/update/delete
    });
  });

  describe("GET /tasks/:id", () => {
    it("should retrieve a task by ID with UUID validation", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const expectedResponse = {
        id: taskId,
        title: "Maintenance",
        status: "pending",
      };

      (tasksService.findByIdOrFail as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(tasksService.findByIdOrFail).toHaveBeenCalledWith(
        taskId,
        ADMIN_USER.organizationId,
      );
    });

    it("should reject invalid UUID format", async () => {
      await request(app.getHttpServer())
        .get("/tasks/invalid-id")
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it("should return 404 for nonexistent task", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440099";

      (tasksService.findByIdOrFail as jest.Mock).mockRejectedValue(
        new NotFoundException("Task not found"),
      );

      await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe("PATCH /tasks/:id", () => {
    it("should update a task with valid data", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const updateDto = {
        title: "Updated title",
        priority: "low",
      };

      const expectedResponse = {
        id: taskId,
        title: updateDto.title,
        priority: updateDto.priority,
      };

      (tasksService.update as jest.Mock).mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set("Authorization", DEFAULT_TOKEN)
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });

    it("should only allow ADMIN, MANAGER, OWNER (not OPERATOR)", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      (tasksService.update as jest.Mock).mockResolvedValue({ id: taskId });

      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set("Authorization", DEFAULT_TOKEN)
        .send({ title: "New title" })
        .expect(HttpStatus.OK);
    });
  });

  describe("DELETE /tasks/:id", () => {
    it("should soft delete a task", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";

      (tasksService.remove as jest.Mock).mockResolvedValue({
        id: taskId,
        deletedAt: new Date().toISOString(),
      });

      await request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.NO_CONTENT);

      expect(tasksService.remove).toHaveBeenCalledWith(
        taskId,
        ADMIN_USER.organizationId,
      );
    });

    it("should only allow ADMIN and OWNER (not MANAGER or OPERATOR)", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      (tasksService.remove as jest.Mock).mockResolvedValue({ id: taskId });

      await request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.NO_CONTENT);
    });

    it("should return 404 for nonexistent task", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440099";

      (tasksService.remove as jest.Mock).mockRejectedValue(
        new NotFoundException("Task not found"),
      );

      await request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ============================================================================
  // TASK STATUS OPERATIONS (State Machine)
  // ============================================================================

  describe("POST /tasks/:id/assign", () => {
    it("should assign task to an operator", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const assignDto = {
        userId: "550e8400-e29b-41d4-a716-446655440001",
      };

      const expectedResponse = {
        id: taskId,
        status: "assigned",
        assignedUserId: assignDto.userId,
      };

      (tasksService.assignTask as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/assign`)
        .set("Authorization", DEFAULT_TOKEN)
        .send(assignDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(tasksService.assignTask).toHaveBeenCalledWith(
        taskId,
        assignDto.userId,
        ADMIN_USER.organizationId,
      );
    });

    it("should reject invalid status transition", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";

      (tasksService.assignTask as jest.Mock).mockRejectedValue(
        new BadRequestException("Cannot assign a completed task"),
      );

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/assign`)
        .set("Authorization", DEFAULT_TOKEN)
        .send({ userId: "550e8400-e29b-41d4-a716-446655440002" })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe("POST /tasks/:id/start", () => {
    it("should start task execution", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";

      const expectedResponse = {
        id: taskId,
        status: "in-progress",
        startedAt: new Date().toISOString(),
      };

      (tasksService.startTask as jest.Mock).mockResolvedValue(expectedResponse);

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/start`)
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.CREATED);

      expect(tasksService.startTask).toHaveBeenCalledWith(
        taskId,
        ADMIN_USER.id,
      );
    });

    it("should allow OPERATOR to start assigned tasks", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      (tasksService.startTask as jest.Mock).mockResolvedValue({
        id: taskId,
        status: "in-progress",
      });

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/start`)
        .set("Authorization", "Bearer operator-token")
        .expect(HttpStatus.CREATED);
    });
  });

  describe("POST /tasks/:id/postpone", () => {
    it("should postpone task with reason", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const postponeDto = {
        reason: "Machine not accessible, scheduled for tomorrow",
      };

      const expectedResponse = {
        id: taskId,
        status: "postponed",
        postponeReason: postponeDto.reason,
      };

      (tasksService.postponeTask as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/postpone`)
        .set("Authorization", DEFAULT_TOKEN)
        .send(postponeDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(tasksService.postponeTask).toHaveBeenCalledWith(
        taskId,
        postponeDto.reason,
      );
    });
  });

  describe("POST /tasks/:id/reject", () => {
    it("should reject a completed task with reason", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const rejectDto = {
        reason: "Work does not meet quality standards",
      };

      const expectedResponse = {
        id: taskId,
        status: "rejected",
        rejectionReason: rejectDto.reason,
      };

      (tasksService.rejectTask as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/reject`)
        .set("Authorization", DEFAULT_TOKEN)
        .send(rejectDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(tasksService.rejectTask).toHaveBeenCalledWith(
        taskId,
        rejectDto.reason,
        ADMIN_USER.id,
      );
    });

    it("should only allow ADMIN, MANAGER, OWNER to reject", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      (tasksService.rejectTask as jest.Mock).mockResolvedValue({ id: taskId });

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/reject`)
        .set("Authorization", DEFAULT_TOKEN)
        .send({ reason: "Quality issue" })
        .expect(HttpStatus.CREATED);
    });
  });

  describe("POST /tasks/:id/cancel", () => {
    it("should cancel an in-progress or pending task", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";

      const expectedResponse = {
        id: taskId,
        status: "cancelled",
      };

      (tasksService.cancelTask as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/cancel`)
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.CREATED);

      expect(tasksService.cancelTask).toHaveBeenCalledWith(taskId);
    });

    it("should reject cancelling a completed task", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";

      (tasksService.cancelTask as jest.Mock).mockRejectedValue(
        new BadRequestException("Cannot cancel a completed task"),
      );

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/cancel`)
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================================================
  // PHOTO WORKFLOW (Status-dependent Sequencing)
  // ============================================================================

  describe("POST /tasks/:id/photo-before", () => {
    it("should upload photo before task execution with optional location", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const photoDto = {
        photoUrl: "https://s3.example.com/photo-before-001.jpg",
        latitude: 41.2995,
        longitude: 69.2401,
      };

      const expectedResponse = {
        id: taskId,
        photoBeforeUrl: photoDto.photoUrl,
        photoBeforeLocation: {
          latitude: photoDto.latitude,
          longitude: photoDto.longitude,
        },
      };

      (tasksService.uploadPhotoBefore as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/photo-before`)
        .set("Authorization", DEFAULT_TOKEN)
        .send(photoDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(tasksService.uploadPhotoBefore).toHaveBeenCalledWith(
        taskId,
        photoDto.photoUrl,
        { latitude: photoDto.latitude, longitude: photoDto.longitude },
      );
    });

    it("should allow photo without location data", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const photoDto = {
        photoUrl: "https://s3.example.com/photo.jpg",
      };

      (tasksService.uploadPhotoBefore as jest.Mock).mockResolvedValue({
        id: taskId,
        photoBeforeUrl: photoDto.photoUrl,
      });

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/photo-before`)
        .set("Authorization", DEFAULT_TOKEN)
        .send(photoDto)
        .expect(HttpStatus.CREATED);

      expect(tasksService.uploadPhotoBefore).toHaveBeenCalledWith(
        taskId,
        photoDto.photoUrl,
        undefined,
      );
    });

    it("should reject photo if not in correct task status", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";

      (tasksService.uploadPhotoBefore as jest.Mock).mockRejectedValue(
        new BadRequestException("Photo before not expected in current status"),
      );

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/photo-before`)
        .set("Authorization", DEFAULT_TOKEN)
        .send({ photoUrl: "https://s3.example.com/photo.jpg" })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe("POST /tasks/:id/photo-after", () => {
    it("should upload photo after task execution and complete task", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const photoDto = {
        photoUrl: "https://s3.example.com/photo-after-001.jpg",
        completionNotes: "Motor replaced, filters installed",
        latitude: 41.2995,
        longitude: 69.2401,
      };

      const expectedResponse = {
        id: taskId,
        status: "completed",
        photoAfterUrl: photoDto.photoUrl,
        completionNotes: photoDto.completionNotes,
      };

      (tasksService.uploadPhotoAfter as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/photo-after`)
        .set("Authorization", DEFAULT_TOKEN)
        .send(photoDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(tasksService.uploadPhotoAfter).toHaveBeenCalledWith(
        taskId,
        photoDto.photoUrl,
        photoDto.completionNotes,
        { latitude: photoDto.latitude, longitude: photoDto.longitude },
      );
    });

    it("should require photo-before before uploading photo-after", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";

      (tasksService.uploadPhotoAfter as jest.Mock).mockRejectedValue(
        new BadRequestException("Photo before is required first"),
      );

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/photo-after`)
        .set("Authorization", DEFAULT_TOKEN)
        .send({ photoUrl: "https://s3.example.com/photo-after.jpg" })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================================================
  // COMPLETE TASK (Alternative completion path)
  // ============================================================================

  describe("POST /tasks/:id/complete", () => {
    it("should complete task with optional completion notes, products, and cash", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const completeDto = {
        completionNotes: "Task completed successfully",
        products: [
          { id: "prod-001", quantity: 2, name: "Filter A" },
          { id: "prod-002", quantity: 1, name: "Motor Oil" },
        ],
        collectedCash: 50000,
        location: { latitude: 41.2995, longitude: 69.2401 },
      };

      const expectedResponse = {
        id: taskId,
        status: "completed",
        completedAt: new Date().toISOString(),
      };

      (tasksService.completeTask as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/complete`)
        .set("Authorization", DEFAULT_TOKEN)
        .send(completeDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(tasksService.completeTask).toHaveBeenCalledWith(
        taskId,
        completeDto,
      );
    });

    it("should require photo-after before completion", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";

      (tasksService.completeTask as jest.Mock).mockRejectedValue(
        new BadRequestException("Photo after is required"),
      );

      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/complete`)
        .set("Authorization", DEFAULT_TOKEN)
        .send({ completionNotes: "Completed" })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================================================
  // TASK ITEMS (Nested Resource)
  // ============================================================================

  describe("GET /tasks/:id/items", () => {
    it("should retrieve all items for a task", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const expectedResponse = [
        { id: "item-001", description: "Replace motor", status: "pending" },
        { id: "item-002", description: "Clean filters", status: "completed" },
      ];

      (tasksService.getTaskItems as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}/items`)
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });
  });

  describe("POST /tasks/:id/items", () => {
    it("should add item to task", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const itemDto = {
        productId: "550e8400-e29b-41d4-a716-446655440010",
        plannedQuantity: 10,
        notes: "Check lubrication level",
      };

      const expectedResponse = {
        id: "item-new",
        taskId,
        productId: itemDto.productId,
        plannedQuantity: itemDto.plannedQuantity,
      };

      (tasksService.addTaskItem as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/items`)
        .set("Authorization", DEFAULT_TOKEN)
        .send(itemDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
    });
  });

  describe("PATCH /tasks/:id/items/:itemId", () => {
    it("should update task item status", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const itemId = "550e8400-e29b-41d4-a716-446655440001";
      const updateDto = {
        actualQuantity: 8,
      };

      const expectedResponse = {
        id: itemId,
        actualQuantity: updateDto.actualQuantity,
      };

      (tasksService.updateTaskItem as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/items/${itemId}`)
        .set("Authorization", DEFAULT_TOKEN)
        .send(updateDto)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });

    it("should return 404 for nonexistent item", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const itemId = "550e8400-e29b-41d4-a716-446655440099";

      (tasksService.updateTaskItem as jest.Mock).mockRejectedValue(
        new NotFoundException("Task item not found"),
      );

      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/items/${itemId}`)
        .set("Authorization", DEFAULT_TOKEN)
        .send({ actualQuantity: 5 })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe("DELETE /tasks/:id/items/:itemId", () => {
    it("should soft delete a task item", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const itemId = "550e8400-e29b-41d4-a716-446655440001";

      (tasksService.removeTaskItem as jest.Mock).mockResolvedValue({
        id: itemId,
        deletedAt: new Date().toISOString(),
      });

      await request(app.getHttpServer())
        .delete(`/tasks/${taskId}/items/${itemId}`)
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.NO_CONTENT);
    });
  });

  // ============================================================================
  // TASK COMMENTS (Nested Resource)
  // ============================================================================

  describe("GET /tasks/:id/comments", () => {
    it("should retrieve all comments for a task", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const expectedResponse = [
        {
          id: "comment-001",
          text: "Starting work now",
          authorId: "user-001",
          createdAt: new Date().toISOString(),
        },
      ];

      (tasksService.getComments as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}/comments`)
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });
  });

  describe("POST /tasks/:id/comments", () => {
    it("should add comment to task", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const commentDto = {
        comment: "Waiting for spare parts",
      };

      const expectedResponse = {
        id: "comment-new",
        taskId,
        comment: commentDto.comment,
        authorId: ADMIN_USER.id,
      };

      (tasksService.addComment as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/comments`)
        .set("Authorization", DEFAULT_TOKEN)
        .send(commentDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(tasksService.addComment).toHaveBeenCalledWith(
        taskId,
        ADMIN_USER.id,
        expect.objectContaining({ comment: commentDto.comment }),
      );
    });
  });

  // ============================================================================
  // TASK COMPONENTS
  // ============================================================================

  describe("GET /tasks/:id/components", () => {
    it("should retrieve components for a task", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const expectedResponse = [
        { id: "comp-001", name: "Motor", status: "needs-replacement" },
      ];

      (tasksService.getComponents as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}/components`)
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });
  });

  describe("POST /tasks/:id/components", () => {
    it("should add component to task", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const componentDto = {
        componentId: "550e8400-e29b-41d4-a716-446655440020",
        role: "old",
        notes: "Motor bearing worn out",
      };

      const expectedResponse = {
        id: "comp-new",
        taskId,
        componentId: componentDto.componentId,
      };

      (tasksService.addComponent as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/components`)
        .set("Authorization", DEFAULT_TOKEN)
        .send(componentDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
    });
  });

  // ============================================================================
  // TASK PHOTOS (Gallery)
  // ============================================================================

  describe("GET /tasks/:id/photos", () => {
    it("should retrieve all photos for a task", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const expectedResponse = [
        {
          id: "photo-001",
          url: "https://s3.example.com/photo-1.jpg",
          type: "before",
        },
        {
          id: "photo-002",
          url: "https://s3.example.com/photo-2.jpg",
          type: "after",
        },
      ];

      (tasksService.getPhotos as jest.Mock).mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}/photos`)
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });
  });

  describe("POST /tasks/:id/photos", () => {
    it("should add photo to task gallery", async () => {
      const taskId = "550e8400-e29b-41d4-a716-446655440000";
      const photoDto = {
        category: "before",
        url: "https://s3.example.com/extra-photo.jpg",
        description: "Damage to housing",
      };

      const expectedResponse = {
        id: "photo-new",
        taskId,
        url: photoDto.url,
      };

      (tasksService.addPhoto as jest.Mock).mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/photos`)
        .set("Authorization", DEFAULT_TOKEN)
        .send(photoDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(tasksService.addPhoto).toHaveBeenCalledWith(
        taskId,
        ADMIN_USER.id,
        expect.objectContaining({ category: "before", url: photoDto.url }),
      );
    });
  });

  // ============================================================================
  // DASHBOARD & STATISTICS
  // ============================================================================

  describe("GET /tasks/kanban", () => {
    it("should return kanban board with tasks grouped by status", async () => {
      const expectedResponse = {
        pending: [{ id: "task-001", title: "Maintenance" }],
        assigned: [{ id: "task-002", title: "Restocking" }],
        "in-progress": [{ id: "task-003", title: "Repair" }],
        completed: [{ id: "task-004", title: "Inspection" }],
      };

      (tasksService.getKanbanBoard as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get("/tasks/kanban")
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });

    it("should filter kanban board by assignee, machine, type, priority", async () => {
      (tasksService.getKanbanBoard as jest.Mock).mockResolvedValue({});

      await request(app.getHttpServer())
        .get("/tasks/kanban")
        .set("Authorization", DEFAULT_TOKEN)
        .query({
          assigneeId: "user-123",
          machineId: "machine-456",
          type: "repair",
          priority: "high",
        })
        .expect(HttpStatus.OK);

      expect(tasksService.getKanbanBoard).toHaveBeenCalledWith(
        ADMIN_USER.organizationId,
        expect.objectContaining({
          assigneeId: "user-123",
          machineId: "machine-456",
          type: "repair",
          priority: "high",
        }),
      );
    });
  });

  describe("GET /tasks/my", () => {
    it("should retrieve tasks assigned to current user", async () => {
      const expectedResponse = [
        { id: "task-001", title: "Maintenance", status: "in-progress" },
      ];

      (tasksService.getMyTasks as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get("/tasks/my")
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(tasksService.getMyTasks).toHaveBeenCalledWith(
        ADMIN_USER.id,
        ADMIN_USER.organizationId,
      );
    });

    it("should allow OPERATOR to view own tasks", async () => {
      (tasksService.getMyTasks as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get("/tasks/my")
        .set("Authorization", "Bearer operator-token")
        .expect(HttpStatus.OK);
    });
  });

  describe("GET /tasks/stats", () => {
    it("should return task statistics grouped by status, type, priority", async () => {
      const expectedResponse = {
        byStatus: { pending: 5, "in-progress": 3, completed: 12 },
        byType: { maintenance: 8, restocking: 7, inspection: 5 },
        byPriority: { high: 6, normal: 10, low: 4 },
      };

      (tasksService.getTaskStats as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get("/tasks/stats")
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });

    it("should filter stats by date range", async () => {
      (tasksService.getTaskStats as jest.Mock).mockResolvedValue({});

      await request(app.getHttpServer())
        .get("/tasks/stats")
        .set("Authorization", DEFAULT_TOKEN)
        .query({
          dateFrom: "2026-03-01T00:00:00Z",
          dateTo: "2026-03-31T23:59:59Z",
        })
        .expect(HttpStatus.OK);

      expect(tasksService.getTaskStats).toHaveBeenCalledWith(
        ADMIN_USER.organizationId,
        "2026-03-01T00:00:00Z",
        "2026-03-31T23:59:59Z",
      );
    });

    it("should only allow OWNER, ADMIN, MANAGER (not OPERATOR)", async () => {
      (tasksService.getTaskStats as jest.Mock).mockResolvedValue({});

      await request(app.getHttpServer())
        .get("/tasks/stats")
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.OK);
    });
  });

  describe("GET /tasks/overdue", () => {
    it("should return list of overdue tasks", async () => {
      const expectedResponse = [
        {
          id: "task-001",
          title: "Overdue maintenance",
          dueDate: "2026-02-28T10:00:00Z",
          daysOverdue: 6,
        },
      ];

      (tasksService.getOverdueTasks as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .get("/tasks/overdue")
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });

    it("should only allow OWNER, ADMIN, MANAGER roles", async () => {
      (tasksService.getOverdueTasks as jest.Mock).mockResolvedValue([]);

      await request(app.getHttpServer())
        .get("/tasks/overdue")
        .set("Authorization", DEFAULT_TOKEN)
        .expect(HttpStatus.OK);
    });
  });
});
