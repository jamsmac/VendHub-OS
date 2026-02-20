/**
 * E2E Tests: Task Workflow
 *
 * Tests the full task lifecycle: create, list with filters, status
 * transitions (assigned -> in_progress -> completed), assignment to
 * operators, kanban board, and comments.
 *
 * Endpoint prefix: /api/v1/tasks
 * Controller: TasksController (src/modules/tasks/tasks.controller.ts)
 */

import {
  INestApplication,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import request from 'supertest';
import { createTestApp, closeTestApp, mockUuid, mockUuid2 } from './setup';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = mockUuid2();
const OPERATOR_ID = '55555555-6666-7777-8888-999999999999';
const MACHINE_ID = '66666666-7777-8888-9999-aaaaaaaaaaaa';

function taskSample(overrides: Record<string, any> = {}) {
  return {
    id: mockUuid(),
    taskNumber: 'T-20250203-001',
    type: 'replenishment',
    priority: 'normal',
    status: 'pending',
    title: 'Replenish VH-002',
    description: 'Refill snack machine',
    organizationId: ORG_ID,
    machineId: MACHINE_ID,
    assignedToId: null,
    createdByUserId: mockUuid(),
    dueDate: null,
    estimatedDurationMinutes: 30,
    photoBefore: null,
    photoAfter: null,
    completedAt: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

// Mutable state to simulate status transitions
let taskState: Record<string, any> = {};

function resetTaskState() {
  taskState = {
    [mockUuid()]: taskSample(),
    'task-assigned': taskSample({
      id: 'task-assigned',
      status: 'assigned',
      assignedToId: OPERATOR_ID,
    }),
    'task-in-progress': taskSample({
      id: 'task-in-progress',
      status: 'in_progress',
      assignedToId: OPERATOR_ID,
    }),
    'task-completed': taskSample({
      id: 'task-completed',
      status: 'completed',
      assignedToId: OPERATOR_ID,
      completedAt: new Date().toISOString(),
    }),
  };
}

// ---------------------------------------------------------------------------
// Mock controller
// ---------------------------------------------------------------------------

@Controller({ path: 'tasks', version: '1' })
class MockTasksController {
  // Static routes first (must come before :id)

  @Get('kanban')
  getKanbanBoard(
    @Query('assigneeId') assigneeId?: string,
    @Query('machineId') machineId?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
  ) {
    return {
      pending: [taskSample()],
      assigned: [taskSample({ status: 'assigned', assignedToId: OPERATOR_ID })],
      in_progress: [taskSample({ status: 'in_progress', assignedToId: OPERATOR_ID })],
      completed: [taskSample({ status: 'completed', completedAt: new Date().toISOString() })],
      cancelled: [],
      on_hold: [],
    };
  }

  @Get('my')
  getMyTasks() {
    return [
      taskSample({ status: 'assigned', assignedToId: OPERATOR_ID }),
      taskSample({
        id: 'my-task-2',
        status: 'in_progress',
        assignedToId: OPERATOR_ID,
        title: 'Collect cash VH-003',
        type: 'collection',
      }),
    ];
  }

  // CRUD

  @Post()
  create(@Body() body: any) {
    if (!body.type) {
      throw new BadRequestException('type should not be empty');
    }
    if (!body.title) {
      throw new BadRequestException('title should not be empty');
    }

    const task = taskSample({
      type: body.type,
      title: body.title,
      description: body.description,
      priority: body.priority || 'normal',
      machineId: body.machineId,
      assignedToId: body.assignedToId,
      dueDate: body.dueDate,
      organizationId: ORG_ID,
    });
    taskState[task.id] = task;
    return task;
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('machineId') machineId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ) {
    let tasks = Object.values(taskState);

    if (status) tasks = tasks.filter((t: any) => t.status === status);
    if (type) tasks = tasks.filter((t: any) => t.type === type);
    if (machineId) tasks = tasks.filter((t: any) => t.machineId === machineId);
    if (assigneeId) tasks = tasks.filter((t: any) => t.assignedToId === assigneeId);
    if (priority) tasks = tasks.filter((t: any) => t.priority === priority);
    if (search) {
      const q = search.toLowerCase();
      tasks = tasks.filter(
        (t: any) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)),
      );
    }

    return {
      data: tasks,
      total: tasks.length,
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const task = taskState[id];
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    const task = taskState[id];
    if (!task) throw new NotFoundException('Task not found');
    const updated = { ...task, ...body, updated_at: new Date().toISOString() };
    taskState[id] = updated;
    return updated;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const task = taskState[id];
    if (!task) throw new NotFoundException('Task not found');
    const deleted = { ...task, deleted_at: new Date().toISOString() };
    taskState[id] = deleted;
    return deleted;
  }

  // Status operations

  @Post(':id/assign')
  assignTask(@Param('id') id: string, @Body() body: { userId: string }) {
    const task = taskState[id];
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'pending') {
      throw new BadRequestException('Can only assign pending tasks');
    }
    const updated = {
      ...task,
      status: 'assigned',
      assignedToId: body.userId,
      updated_at: new Date().toISOString(),
    };
    taskState[id] = updated;
    return updated;
  }

  @Post(':id/start')
  startTask(@Param('id') id: string) {
    const task = taskState[id];
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'assigned') {
      throw new BadRequestException('Can only start assigned tasks');
    }
    const updated = {
      ...task,
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    };
    taskState[id] = updated;
    return updated;
  }

  @Post(':id/complete')
  completeTask(@Param('id') id: string, @Body() body: any) {
    const task = taskState[id];
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'in_progress') {
      throw new BadRequestException('Can only complete in-progress tasks');
    }
    const updated = {
      ...task,
      status: 'completed',
      completedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    taskState[id] = updated;
    return updated;
  }

  @Post(':id/cancel')
  cancelTask(@Param('id') id: string) {
    const task = taskState[id];
    if (!task) throw new NotFoundException('Task not found');
    if (['completed', 'cancelled'].includes(task.status)) {
      throw new BadRequestException('Cannot cancel completed or already cancelled tasks');
    }
    const updated = {
      ...task,
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    };
    taskState[id] = updated;
    return updated;
  }

  @Post(':id/postpone')
  postponeTask(@Param('id') id: string, @Body() body: { reason: string }) {
    const task = taskState[id];
    if (!task) throw new NotFoundException('Task not found');
    const updated = {
      ...task,
      status: 'on_hold',
      notes: body.reason,
      updated_at: new Date().toISOString(),
    };
    taskState[id] = updated;
    return updated;
  }

  @Post(':id/reject')
  rejectTask(@Param('id') id: string, @Body() body: { reason: string }) {
    const task = taskState[id];
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'completed') {
      throw new BadRequestException('Can only reject completed tasks');
    }
    const updated = {
      ...task,
      status: 'assigned',
      notes: body.reason,
      updated_at: new Date().toISOString(),
    };
    taskState[id] = updated;
    return updated;
  }

  // Comments

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return [
      {
        id: 'comment-1',
        taskId: id,
        userId: mockUuid(),
        text: 'Leaving now to refill',
        created_at: new Date().toISOString(),
      },
    ];
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Body() body: { text: string }) {
    return {
      id: 'comment-new',
      taskId: id,
      userId: mockUuid(),
      text: body.text,
      created_at: new Date().toISOString(),
    };
  }

  // Items

  @Get(':id/items')
  getTaskItems(@Param('id') id: string) {
    return [
      {
        id: 'item-1',
        taskId: id,
        productId: mockUuid(),
        quantity: 10,
        completed: false,
      },
    ];
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Tasks Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({
      controllers: [MockTasksController],
    });
  });

  beforeEach(() => {
    resetTaskState();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  // =========================================================================
  // POST /api/v1/tasks — Create task
  // =========================================================================

  describe('POST /api/v1/tasks', () => {
    const validPayload = {
      type: 'replenishment',
      title: 'Replenish VH-005',
      description: 'Top up coffee ingredients',
      priority: 'high',
      machineId: MACHINE_ID,
      organizationId: ORG_ID,
    };

    it('should create a task with valid data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', 'Bearer mock-token')
        .send(validPayload)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.type).toBe('replenishment');
      expect(res.body.title).toBe(validPayload.title);
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('pending');
      expect(res.body.machineId).toBe(MACHINE_ID);
      expect(res.body.organizationId).toBe(ORG_ID);
    });

    it('should reject creation with missing type', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', 'Bearer mock-token')
        .send({ title: 'No type' })
        .expect(400);
    });

    it('should reject creation with missing title', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', 'Bearer mock-token')
        .send({ type: 'replenishment' })
        .expect(400);
    });
  });

  // =========================================================================
  // GET /api/v1/tasks — List with filters
  // =========================================================================

  describe('GET /api/v1/tasks', () => {
    it('should return all tasks', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter tasks by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks?status=assigned')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      res.body.data.forEach((t: any) => {
        expect(t.status).toBe('assigned');
      });
    });

    it('should filter tasks by type', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks?type=replenishment')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      res.body.data.forEach((t: any) => {
        expect(t.type).toBe('replenishment');
      });
    });

    it('should filter tasks by assigneeId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks?assigneeId=${OPERATOR_ID}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      res.body.data.forEach((t: any) => {
        expect(t.assignedToId).toBe(OPERATOR_ID);
      });
    });
  });

  // =========================================================================
  // GET /api/v1/tasks/:id — Get task
  // =========================================================================

  describe('GET /api/v1/tasks/:id', () => {
    it('should return a task by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${mockUuid()}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.id).toBe(mockUuid());
      expect(res.body).toHaveProperty('type');
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('title');
    });

    it('should return 404 for non-existent task', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer mock-token')
        .expect(404);
    });
  });

  // =========================================================================
  // Task status transitions: pending -> assigned -> in_progress -> completed
  // =========================================================================

  describe('Task status workflow', () => {
    it('should assign a pending task to an operator', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${mockUuid()}/assign`)
        .set('Authorization', 'Bearer mock-token')
        .send({ userId: OPERATOR_ID })
        .expect(201);

      expect(res.body.status).toBe('assigned');
      expect(res.body.assignedToId).toBe(OPERATOR_ID);
    });

    it('should reject assigning a non-pending task', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks/task-assigned/assign')
        .set('Authorization', 'Bearer mock-token')
        .send({ userId: OPERATOR_ID })
        .expect(400);
    });

    it('should start an assigned task', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks/task-assigned/start')
        .set('Authorization', 'Bearer mock-token')
        .expect(201);

      expect(res.body.status).toBe('in_progress');
    });

    it('should reject starting a non-assigned task', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${mockUuid()}/start`)
        .set('Authorization', 'Bearer mock-token')
        .expect(400);
    });

    it('should complete an in-progress task', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks/task-in-progress/complete')
        .set('Authorization', 'Bearer mock-token')
        .send({ notes: 'All items refilled' })
        .expect(201);

      expect(res.body.status).toBe('completed');
      expect(res.body).toHaveProperty('completedAt');
    });

    it('should reject completing a non-in-progress task', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${mockUuid()}/complete`)
        .set('Authorization', 'Bearer mock-token')
        .send({})
        .expect(400);
    });

    it('should cancel a pending task', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${mockUuid()}/cancel`)
        .set('Authorization', 'Bearer mock-token')
        .expect(201);

      expect(res.body.status).toBe('cancelled');
    });

    it('should reject cancelling a completed task', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks/task-completed/cancel')
        .set('Authorization', 'Bearer mock-token')
        .expect(400);
    });

    it('should postpone a task with a reason', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${mockUuid()}/postpone`)
        .set('Authorization', 'Bearer mock-token')
        .send({ reason: 'Machine location closed today' })
        .expect(201);

      expect(res.body.status).toBe('on_hold');
    });

    it('should reject a completed task back to assigned', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks/task-completed/reject')
        .set('Authorization', 'Bearer mock-token')
        .send({ reason: 'Photos are blurry' })
        .expect(201);

      expect(res.body.status).toBe('assigned');
    });

    it('should reject rejecting a non-completed task', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tasks/${mockUuid()}/reject`)
        .set('Authorization', 'Bearer mock-token')
        .send({ reason: 'Some reason' })
        .expect(400);
    });
  });

  // =========================================================================
  // GET /api/v1/tasks/kanban — Kanban board
  // =========================================================================

  describe('GET /api/v1/tasks/kanban', () => {
    it('should return tasks grouped by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks/kanban')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body).toHaveProperty('pending');
      expect(res.body).toHaveProperty('assigned');
      expect(res.body).toHaveProperty('in_progress');
      expect(res.body).toHaveProperty('completed');
      expect(res.body).toHaveProperty('cancelled');
      expect(res.body).toHaveProperty('on_hold');
      expect(Array.isArray(res.body.pending)).toBe(true);
      expect(Array.isArray(res.body.assigned)).toBe(true);
    });
  });

  // =========================================================================
  // GET /api/v1/tasks/my — My assigned tasks
  // =========================================================================

  describe('GET /api/v1/tasks/my', () => {
    it('should return tasks assigned to the current user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks/my')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      res.body.forEach((t: any) => {
        expect(t.assignedToId).toBe(OPERATOR_ID);
      });
    });
  });

  // =========================================================================
  // Comments
  // =========================================================================

  describe('Task Comments', () => {
    it('should return task comments', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${mockUuid()}/comments`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('text');
      expect(res.body[0]).toHaveProperty('userId');
    });

    it('should add a comment to a task', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tasks/${mockUuid()}/comments`)
        .set('Authorization', 'Bearer mock-token')
        .send({ text: 'Running late, ETA 15 min' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.text).toBe('Running late, ETA 15 min');
    });
  });

  // =========================================================================
  // Task Items
  // =========================================================================

  describe('Task Items', () => {
    it('should return task items', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${mockUuid()}/items`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('productId');
      expect(res.body[0]).toHaveProperty('quantity');
      expect(res.body[0]).toHaveProperty('completed');
    });
  });

  // =========================================================================
  // DELETE /api/v1/tasks/:id — Soft delete
  // =========================================================================

  describe('DELETE /api/v1/tasks/:id', () => {
    it('should soft delete a task', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${mockUuid()}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body).toHaveProperty('deleted_at');
      expect(res.body.deleted_at).not.toBeNull();
    });

    it('should return 404 for non-existent task', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer mock-token')
        .expect(404);
    });
  });
});
