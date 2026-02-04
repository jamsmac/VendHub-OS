import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { TasksService } from './tasks.service';
import {
  Task,
  TaskItem,
  TaskComment,
  TaskComponent,
  TaskPhoto,
  TaskStatus,
  VALID_TASK_TRANSITIONS,
} from './entities/task.entity';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let taskItemRepository: jest.Mocked<Repository<TaskItem>>;
  let taskCommentRepository: jest.Mocked<Repository<TaskComment>>;
  let taskComponentRepository: jest.Mocked<Repository<TaskComponent>>;
  let taskPhotoRepository: jest.Mocked<Repository<TaskPhoto>>;

  const orgId = 'org-uuid-1';

  const mockTask = {
    id: 'task-uuid-1',
    taskNumber: 'TASK-001',
    organizationId: orgId,
    machineId: 'machine-uuid-1',
    typeCode: 'refill',
    status: TaskStatus.PENDING,
    priority: 'normal',
    assignedToUserId: null,
    createdByUserId: 'user-uuid-1',
    description: 'Refill VM-001',
    dueDate: new Date('2025-06-01'),
    startedAt: null,
    completedAt: null,
    photoBeforeUrl: null,
    photoAfterUrl: null,
    hasPhotoBefore: false,
    hasPhotoAfter: false,
    requiresPhotoBefore: true,
    requiresPhotoAfter: true,
    postponeReason: null,
    rejectionReason: null,
    completionNotes: null,
    actualCashAmount: null,
    actualDuration: null,
    completedLatitude: null,
    completedLongitude: null,
    rejectedByUserId: null,
    rejectedAt: null,
    machine: null,
    assignedTo: null,
    createdBy: null,
    items: [],
    comments: [],
    components: [],
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Task;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockTask]),
    getCount: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(TaskItem),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TaskComment),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TaskComponent),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TaskPhoto),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepository = module.get(getRepositoryToken(Task));
    taskItemRepository = module.get(getRepositoryToken(TaskItem));
    taskCommentRepository = module.get(getRepositoryToken(TaskComment));
    taskComponentRepository = module.get(getRepositoryToken(TaskComponent));
    taskPhotoRepository = module.get(getRepositoryToken(TaskPhoto));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // VALIDATE TRANSITION
  // ============================================================================

  describe('validateTransition', () => {
    it('should allow valid status transitions', () => {
      expect(() =>
        service.validateTransition(TaskStatus.PENDING, TaskStatus.ASSIGNED),
      ).not.toThrow();

      expect(() =>
        service.validateTransition(TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS),
      ).not.toThrow();

      expect(() =>
        service.validateTransition(TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED),
      ).not.toThrow();
    });

    it('should throw BadRequestException for invalid status transition', () => {
      expect(() =>
        service.validateTransition(TaskStatus.PENDING, TaskStatus.COMPLETED),
      ).toThrow(BadRequestException);

      expect(() =>
        service.validateTransition(TaskStatus.CANCELLED, TaskStatus.ASSIGNED),
      ).toThrow(BadRequestException);

      expect(() =>
        service.validateTransition(TaskStatus.REJECTED, TaskStatus.IN_PROGRESS),
      ).toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // TASK CRUD
  // ============================================================================

  describe('create', () => {
    it('should create a new task', async () => {
      taskRepository.create.mockReturnValue(mockTask);
      taskRepository.save.mockResolvedValue(mockTask);

      const result = await service.create({
        organizationId: orgId,
        machineId: 'machine-uuid-1',
        typeCode: 'refill',
        description: 'Refill VM-001',
      } as any);

      expect(result).toEqual(mockTask);
      expect(taskRepository.create).toHaveBeenCalled();
      expect(taskRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated tasks for organization', async () => {
      const result = await service.findAll(orgId, { page: 1, limit: 20 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('totalPages', 1);
    });

    it('should filter by status', async () => {
      await service.findAll(orgId, {
        status: TaskStatus.IN_PROGRESS,
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.status = :status',
        { status: TaskStatus.IN_PROGRESS },
      );
    });

    it('should filter by assigneeId', async () => {
      await service.findAll(orgId, {
        assigneeId: 'user-uuid-1',
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.assignedToUserId = :assigneeId',
        { assigneeId: 'user-uuid-1' },
      );
    });

    it('should cap limit at 100', async () => {
      const result = await service.findAll(orgId, { limit: 500 });

      expect(result.limit).toBeLessThanOrEqual(100);
    });
  });

  describe('findByIdOrFail', () => {
    it('should return task when found', async () => {
      taskRepository.findOne.mockResolvedValue(mockTask);

      const result = await service.findByIdOrFail('task-uuid-1');

      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException when task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.findByIdOrFail('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================================
  // TASK STATUS OPERATIONS
  // ============================================================================

  describe('assignTask', () => {
    it('should assign a pending task to an operator', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING } as any;
      taskRepository.findOne.mockResolvedValue(pendingTask);
      taskRepository.save.mockResolvedValue({
        ...pendingTask,
        status: TaskStatus.ASSIGNED,
        assignedToUserId: 'operator-uuid-1',
      });

      const result = await service.assignTask('task-uuid-1', 'operator-uuid-1');

      expect(result.status).toBe(TaskStatus.ASSIGNED);
      expect(result.assignedToUserId).toBe('operator-uuid-1');
    });

    it('should throw BadRequestException for invalid transition on assign', async () => {
      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
      } as any;
      taskRepository.findOne.mockResolvedValue(completedTask);

      await expect(
        service.assignTask('task-uuid-1', 'operator-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('startTask', () => {
    it('should start an assigned task', async () => {
      const assignedTask = { ...mockTask, status: TaskStatus.ASSIGNED } as any;
      taskRepository.findOne.mockResolvedValue(assignedTask);
      taskRepository.save.mockImplementation((task) =>
        Promise.resolve(task as any),
      );

      const result = await service.startTask('task-uuid-1', 'user-uuid-1');

      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
      expect(result.startedAt).toBeInstanceOf(Date);
    });
  });

  describe('completeTask', () => {
    it('should complete a task with duration calculation', async () => {
      const startedAt = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        startedAt,
        requiresPhotoAfter: false,
      } as any;
      taskRepository.findOne.mockResolvedValue(inProgressTask);
      taskRepository.save.mockImplementation((task) =>
        Promise.resolve(task as any),
      );

      const result = await service.completeTask('task-uuid-1', {
        completionNotes: 'All slots refilled',
      });

      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.actualDuration).toBeGreaterThanOrEqual(29);
    });

    it('should throw BadRequestException when photo after is required but missing', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        requiresPhotoAfter: true,
        photoAfterUrl: null,
      } as any;
      taskRepository.findOne.mockResolvedValue(inProgressTask);

      await expect(
        service.completeTask('task-uuid-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelTask', () => {
    it('should cancel a pending task', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING } as any;
      taskRepository.findOne.mockResolvedValue(pendingTask);
      taskRepository.save.mockImplementation((task) =>
        Promise.resolve(task as any),
      );

      const result = await service.cancelTask('task-uuid-1');

      expect(result.status).toBe(TaskStatus.CANCELLED);
    });
  });

  // ============================================================================
  // MY TASKS
  // ============================================================================

  describe('getMyTasks', () => {
    it('should return active tasks assigned to user', async () => {
      taskRepository.findAndCount.mockResolvedValue([[mockTask], 1]);

      const result = await service.getMyTasks('user-uuid-1', orgId);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(taskRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToUserId: 'user-uuid-1',
            organizationId: orgId,
          }),
        }),
      );
    });
  });

  // ============================================================================
  // COMMENTS
  // ============================================================================

  describe('addComment', () => {
    it('should add a comment to a task', async () => {
      const mockComment = {
        id: 'comment-uuid-1',
        taskId: 'task-uuid-1',
        userId: 'user-uuid-1',
        comment: 'Test comment',
        isInternal: false,
      } as unknown as TaskComment;

      taskRepository.findOne.mockResolvedValue(mockTask);
      taskCommentRepository.create.mockReturnValue(mockComment);
      taskCommentRepository.save.mockResolvedValue(mockComment);

      const result = await service.addComment('task-uuid-1', 'user-uuid-1', {
        comment: 'Test comment',
      } as any);

      expect(result).toEqual(mockComment);
      expect(taskCommentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-uuid-1',
          userId: 'user-uuid-1',
          comment: 'Test comment',
        }),
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addComment('non-existent', 'user-uuid-1', {
          comment: 'Test',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // SOFT DELETE
  // ============================================================================

  describe('remove', () => {
    it('should soft delete task when found', async () => {
      taskRepository.findOne.mockResolvedValue(mockTask);
      taskRepository.softDelete.mockResolvedValue(undefined as any);

      await service.remove('task-uuid-1');

      expect(taskRepository.softDelete).toHaveBeenCalledWith('task-uuid-1');
    });

    it('should throw NotFoundException when task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
