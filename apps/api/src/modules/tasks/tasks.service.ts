import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  Task,
  TaskItem,
  TaskComment,
  TaskComponent,
  TaskPhoto,
  TaskStatus,
  VALID_TASK_TRANSITIONS,
} from "./entities/task.entity";
import { CreateTaskItemDto, UpdateTaskItemDto } from "./dto/task-item.dto";
import { CreateTaskCommentDto } from "./dto/task-comment.dto";
import {
  CreateTaskComponentDto,
  CreateTaskPhotoDto,
} from "./dto/task-component.dto";
import { TaskAnalyticsService } from "./services/task-analytics.service";

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,

    @InjectRepository(TaskItem)
    private readonly taskItemRepository: Repository<TaskItem>,

    @InjectRepository(TaskComment)
    private readonly taskCommentRepository: Repository<TaskComment>,

    @InjectRepository(TaskComponent)
    private readonly taskComponentRepository: Repository<TaskComponent>,

    @InjectRepository(TaskPhoto)
    private readonly taskPhotoRepository: Repository<TaskPhoto>,

    private readonly dataSource: DataSource,

    private readonly taskAnalyticsService: TaskAnalyticsService,
  ) {}

  // ============================================================================
  // STATUS TRANSITION VALIDATION
  // ============================================================================

  /**
   * Validate if a status transition is allowed
   * @throws BadRequestException if transition is invalid
   */
  validateTransition(current: TaskStatus, target: TaskStatus): void {
    const allowed = VALID_TASK_TRANSITIONS[current];
    if (!allowed || !allowed.includes(target)) {
      throw new BadRequestException(
        `Invalid status transition: ${current} -> ${target}. ` +
          `Allowed transitions from ${current}: [${(allowed || []).join(", ")}]`,
      );
    }
  }

  // ============================================================================
  // TASK CRUD
  // ============================================================================

  /**
   * Create a new task (transactional — saves task + items + components atomically)
   * Ported from VHM24-repo with conflict check for active tasks on same machine
   */
  async create(
    data: Partial<Task> & {
      items?: Partial<TaskItem>[];
      components?: Partial<TaskComponent>[];
    },
  ): Promise<Task> {
    const { items, components, ...taskData } = data;

    // Check for conflicting active tasks on same machine
    if (taskData.machineId) {
      const activeStatuses = [
        TaskStatus.PENDING,
        TaskStatus.ASSIGNED,
        TaskStatus.IN_PROGRESS,
      ];
      const existing = await this.taskRepository.findOne({
        where: {
          machineId: taskData.machineId,
          status: In(activeStatuses),
        },
      });
      if (existing) {
        throw new BadRequestException(
          `Cannot create task: machine already has an active task (ID: ${existing.id})`,
        );
      }
    }

    // Generate task number
    if (!taskData.taskNumber) {
      taskData.taskNumber = await this.generateTaskNumber();
    }

    const savedTaskId = await this.dataSource.transaction(async (manager) => {
      const task = manager.create(Task, {
        ...taskData,
        status: taskData.status ?? TaskStatus.PENDING,
      });
      const savedTask = await manager.save(Task, task);

      // Save task items (for REFILL tasks)
      if (items?.length) {
        const taskItems = items.map((item) =>
          manager.create(TaskItem, {
            ...item,
            taskId: savedTask.id,
          }),
        );
        await manager.save(TaskItem, taskItems);
      }

      // Save task components (for replacement tasks)
      if (components?.length) {
        const taskComponents = components.map((comp) =>
          manager.create(TaskComponent, {
            ...comp,
            taskId: savedTask.id,
          }),
        );
        await manager.save(TaskComponent, taskComponents);
      }

      return savedTask.id;
    });

    return this.findByIdOrFail(savedTaskId);
  }

  /**
   * Get all tasks with filters (multi-tenant, paginated)
   */
  async findAll(
    organizationId: string,
    filters?: {
      page?: number;
      limit?: number;
      status?: string;
      assigneeId?: string;
      machineId?: string;
      type?: string;
      priority?: string;
      dueDateFrom?: string;
      dueDateTo?: string;
      search?: string;
    },
  ): Promise<{
    data: Task[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, 100);

    const query = this.taskRepository
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.machine", "machine")
      .leftJoinAndSelect("task.assignedTo", "assignedTo")
      .leftJoinAndSelect("task.createdBy", "createdBy")
      .where("task.organizationId = :organizationId", { organizationId });

    if (filters?.status) {
      query.andWhere("task.status = :status", { status: filters.status });
    }

    if (filters?.assigneeId) {
      query.andWhere("task.assignedToUserId = :assigneeId", {
        assigneeId: filters.assigneeId,
      });
    }

    if (filters?.machineId) {
      query.andWhere("task.machineId = :machineId", {
        machineId: filters.machineId,
      });
    }

    if (filters?.type) {
      query.andWhere("task.typeCode = :type", { type: filters.type });
    }

    if (filters?.priority) {
      query.andWhere("task.priority = :priority", {
        priority: filters.priority,
      });
    }

    if (filters?.dueDateFrom) {
      query.andWhere("task.dueDate >= :dueDateFrom", {
        dueDateFrom: filters.dueDateFrom,
      });
    }

    if (filters?.dueDateTo) {
      query.andWhere("task.dueDate <= :dueDateTo", {
        dueDateTo: filters.dueDateTo,
      });
    }

    if (filters?.search) {
      query.andWhere(
        "(task.taskNumber ILIKE :search OR task.description ILIKE :search)",
        { search: `%${filters.search}%` },
      );
    }

    const total = await query.getCount();

    query.orderBy("task.dueDate", "ASC");
    query.skip((page - 1) * limit);
    query.take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find task by ID with all relations
   */
  async findById(id: string, organizationId?: string): Promise<Task | null> {
    const where: Record<string, string> = { id };
    if (organizationId) where.organizationId = organizationId;
    return this.taskRepository.findOne({
      where,
      relations: [
        "machine",
        "assignedTo",
        "createdBy",
        "items",
        "comments",
        "components",
      ],
    });
  }

  /**
   * Find task by ID or throw NotFoundException
   */
  async findByIdOrFail(id: string, organizationId?: string): Promise<Task> {
    const task = await this.findById(id, organizationId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  /**
   * Update task
   */
  async update(
    id: string,
    data: Partial<Task>,
    organizationId?: string,
  ): Promise<Task> {
    const task = await this.findByIdOrFail(id, organizationId);

    // If status is being changed, validate the transition
    if (data.status && data.status !== task.status) {
      this.validateTransition(task.status, data.status);
    }

    Object.assign(task, data);
    return this.taskRepository.save(task);
  }

  /**
   * Soft delete a task
   */
  async remove(id: string, organizationId?: string): Promise<void> {
    const task = await this.findByIdOrFail(id, organizationId);
    await this.taskRepository.softDelete(task.id);
  }

  // ============================================================================
  // TASK STATUS OPERATIONS
  // ============================================================================

  /**
   * Assign task to an operator
   * Transitions: PENDING -> ASSIGNED, or POSTPONED -> ASSIGNED
   */
  async assignTask(
    id: string,
    userId: string,
    organizationId?: string,
  ): Promise<Task> {
    const task = await this.findByIdOrFail(id, organizationId);
    this.validateTransition(task.status, TaskStatus.ASSIGNED);

    task.status = TaskStatus.ASSIGNED;
    task.assignedToUserId = userId;

    return this.taskRepository.save(task);
  }

  /**
   * Start task - requires photo before
   * Transitions: ASSIGNED -> IN_PROGRESS
   */
  async startTask(id: string, _userId: string): Promise<Task> {
    const task = await this.findByIdOrFail(id);
    this.validateTransition(task.status, TaskStatus.IN_PROGRESS);

    task.status = TaskStatus.IN_PROGRESS;
    task.startedAt = new Date();

    return this.taskRepository.save(task);
  }

  /**
   * Postpone task with reason
   * Transitions: ASSIGNED -> POSTPONED, IN_PROGRESS -> POSTPONED
   */
  async postponeTask(id: string, reason: string): Promise<Task> {
    const task = await this.findByIdOrFail(id);
    this.validateTransition(task.status, TaskStatus.POSTPONED);

    task.status = TaskStatus.POSTPONED;
    task.postponeReason = reason;

    return this.taskRepository.save(task);
  }

  /**
   * Reject a completed task
   * Transitions: COMPLETED -> REJECTED
   */
  async rejectTask(id: string, reason: string, userId: string): Promise<Task> {
    const task = await this.findByIdOrFail(id);
    this.validateTransition(task.status, TaskStatus.REJECTED);

    task.status = TaskStatus.REJECTED;
    task.rejectionReason = reason;
    task.rejectedByUserId = userId;
    task.rejectedAt = new Date();

    return this.taskRepository.save(task);
  }

  /**
   * Cancel a task
   * Transitions: PENDING/ASSIGNED/IN_PROGRESS/POSTPONED -> CANCELLED
   */
  async cancelTask(id: string): Promise<Task> {
    const task = await this.findByIdOrFail(id);
    this.validateTransition(task.status, TaskStatus.CANCELLED);

    task.status = TaskStatus.CANCELLED;

    return this.taskRepository.save(task);
  }

  /**
   * Upload photo before
   */
  async uploadPhotoBefore(
    id: string,
    photoUrl: string,
    _location?: { latitude: number; longitude: number },
  ): Promise<Task> {
    const task = await this.findByIdOrFail(id);

    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException(
        "Photo before not expected in current status",
      );
    }

    task.photoBeforeUrl = photoUrl;
    task.hasPhotoBefore = true;

    return this.taskRepository.save(task);
  }

  /**
   * Upload photo after and complete
   */
  async uploadPhotoAfter(
    id: string,
    photoUrl: string,
    completionNotes?: string,
    location?: { latitude: number; longitude: number },
  ): Promise<Task> {
    const task = await this.findByIdOrFail(id);

    if (task.requiresPhotoBefore && !task.photoBeforeUrl) {
      throw new BadRequestException("Photo before is required first");
    }

    task.photoAfterUrl = photoUrl;
    task.hasPhotoAfter = true;
    task.completionNotes = completionNotes;
    task.status = TaskStatus.COMPLETED;
    task.completedAt = new Date();

    if (location) {
      task.completedLatitude = location.latitude;
      task.completedLongitude = location.longitude;
    }

    // Calculate actual duration
    if (task.startedAt) {
      task.actualDuration = Math.round(
        (task.completedAt.getTime() - task.startedAt.getTime()) / 60000,
      );
    }

    return this.taskRepository.save(task);
  }

  /**
   * Complete task (without photo after)
   */
  async completeTask(
    id: string,
    completionData: {
      completionNotes?: string;
      products?: { id: string; quantity?: number; name?: string }[];
      collectedCash?: number;
      location?: { latitude: number; longitude: number };
    },
  ): Promise<Task> {
    const task = await this.findByIdOrFail(id);

    if (task.requiresPhotoAfter && !task.photoAfterUrl) {
      throw new BadRequestException("Photo after is required");
    }

    task.status = TaskStatus.COMPLETED;
    task.completedAt = new Date();
    task.completionNotes = completionData.completionNotes;

    if (completionData.collectedCash !== undefined) {
      task.actualCashAmount = completionData.collectedCash;
    }

    if (completionData.location) {
      task.completedLatitude = completionData.location.latitude;
      task.completedLongitude = completionData.location.longitude;
    }

    if (task.startedAt) {
      task.actualDuration = Math.round(
        (task.completedAt.getTime() - task.startedAt.getTime()) / 60000,
      );
    }

    return this.taskRepository.save(task);
  }

  // ============================================================================
  // ANALYTICS — delegated to TaskAnalyticsService
  // ============================================================================

  /**
   * Get tasks assigned to a specific user (paginated)
   */
  async getMyTasks(
    userId: string,
    organizationId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Task[]; total: number }> {
    return this.taskAnalyticsService.getMyTasks(
      userId,
      organizationId,
      page,
      limit,
    );
  }

  /**
   * Get tasks grouped by status for kanban board view
   */
  async getKanbanBoard(
    organizationId: string,
    filters?: {
      assigneeId?: string;
      machineId?: string;
      type?: string;
      priority?: string;
    },
  ): Promise<{
    pending: Task[];
    assigned: Task[];
    in_progress: Task[];
    completed: Task[];
    postponed: Task[];
  }> {
    return this.taskAnalyticsService.getKanbanBoard(organizationId, filters);
  }

  async getTaskStats(
    organizationId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    avgCompletionMinutes: number;
    overdueCount: number;
  }> {
    return this.taskAnalyticsService.getTaskStats(
      organizationId,
      dateFrom,
      dateTo,
    );
  }

  async getOverdueTasks(organizationId: string): Promise<Task[]> {
    return this.taskAnalyticsService.getOverdueTasks(organizationId);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueTasks(): Promise<void> {
    return this.taskAnalyticsService.checkOverdueTasks();
  }

  // ============================================================================
  // TASK NUMBER GENERATION (ported from VHM24-repo)
  // ============================================================================

  private async generateTaskNumber(): Promise<string> {
    const now = new Date();
    const dateStr =
      String(now.getFullYear()) +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");

    // Count tasks created today
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const count = await this.taskRepository
      .createQueryBuilder("task")
      .where("task.createdAt >= :startOfDay", { startOfDay })
      .getCount();

    const seq = String(count + 1).padStart(4, "0");
    return `TASK-${dateStr}-${seq}`;
  }

  // ============================================================================
  // TASK ITEMS CRUD
  // ============================================================================

  /**
   * Add an item to a task (for REFILL tasks)
   */
  async addTaskItem(
    taskId: string,
    data: CreateTaskItemDto,
  ): Promise<TaskItem> {
    // Verify task exists
    await this.findByIdOrFail(taskId);

    const item = this.taskItemRepository.create({
      taskId,
      ...data,
    });

    return this.taskItemRepository.save(item);
  }

  /**
   * Update a task item
   */
  async updateTaskItem(
    itemId: string,
    data: UpdateTaskItemDto,
  ): Promise<TaskItem> {
    const item = await this.taskItemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Task item with ID ${itemId} not found`);
    }

    Object.assign(item, data);
    return this.taskItemRepository.save(item);
  }

  /**
   * Remove a task item (soft delete)
   */
  async removeTaskItem(itemId: string): Promise<void> {
    const item = await this.taskItemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Task item with ID ${itemId} not found`);
    }

    await this.taskItemRepository.softDelete(itemId);
  }

  /**
   * Get all items for a task
   */
  async getTaskItems(taskId: string): Promise<TaskItem[]> {
    // Verify task exists
    await this.findByIdOrFail(taskId);

    return this.taskItemRepository.find({
      where: { taskId },
      order: { createdAt: "ASC" },
    });
  }

  // ============================================================================
  // TASK COMMENTS
  // ============================================================================

  /**
   * Add a comment to a task
   */
  async addComment(
    taskId: string,
    userId: string,
    data: CreateTaskCommentDto,
  ): Promise<TaskComment> {
    // Verify task exists
    await this.findByIdOrFail(taskId);

    const comment = this.taskCommentRepository.create({
      taskId,
      userId,
      comment: data.comment,
      isInternal: data.isInternal ?? false,
      attachments: data.attachments,
    });

    return this.taskCommentRepository.save(comment);
  }

  /**
   * Get all comments for a task
   */
  async getComments(taskId: string): Promise<TaskComment[]> {
    // Verify task exists
    await this.findByIdOrFail(taskId);

    return this.taskCommentRepository.find({
      where: { taskId },
      relations: ["user"],
      order: { createdAt: "ASC" },
    });
  }

  // ============================================================================
  // TASK COMPONENTS
  // ============================================================================

  /**
   * Add a component to a task (for replacement tasks)
   */
  async addComponent(
    taskId: string,
    data: CreateTaskComponentDto,
  ): Promise<TaskComponent> {
    // Verify task exists
    await this.findByIdOrFail(taskId);

    const component = this.taskComponentRepository.create({
      taskId,
      ...data,
    });

    return this.taskComponentRepository.save(component);
  }

  /**
   * Get all components for a task
   */
  async getComponents(taskId: string): Promise<TaskComponent[]> {
    // Verify task exists
    await this.findByIdOrFail(taskId);

    return this.taskComponentRepository.find({
      where: { taskId },
      order: { createdAt: "ASC" },
    });
  }

  // ============================================================================
  // TASK PHOTOS
  // ============================================================================

  /**
   * Add a photo to a task
   */
  async addPhoto(
    taskId: string,
    userId: string,
    data: CreateTaskPhotoDto,
  ): Promise<TaskPhoto> {
    // Verify task exists
    await this.findByIdOrFail(taskId);

    const photo = this.taskPhotoRepository.create({
      taskId,
      uploadedByUserId: userId,
      category: data.category,
      url: data.url,
      thumbnailUrl: data.thumbnailUrl,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      latitude: data.latitude,
      longitude: data.longitude,
      description: data.description,
    });

    return this.taskPhotoRepository.save(photo);
  }

  /**
   * Get all photos for a task
   */
  async getPhotos(taskId: string): Promise<TaskPhoto[]> {
    // Verify task exists
    await this.findByIdOrFail(taskId);

    return this.taskPhotoRepository.find({
      where: { taskId },
      relations: ["uploadedBy"],
      order: { createdAt: "ASC" },
    });
  }
}
