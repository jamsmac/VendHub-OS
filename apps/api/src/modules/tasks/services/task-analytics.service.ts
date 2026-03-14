/**
 * Task Analytics Service — extracted from TasksService
 * Handles task statistics, overdue detection, kanban board, and my-tasks queries
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, LessThan } from "typeorm";
import { Task, TaskStatus, TaskPriority } from "../entities/task.entity";
import {
  Incident,
  IncidentType,
  IncidentStatus,
  IncidentPriority,
} from "../../incidents/entities/incident.entity";

@Injectable()
export class TaskAnalyticsService {
  private readonly logger = new Logger(TaskAnalyticsService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,

    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
  ) {}

  // ============================================================================
  // STATISTICS & OVERDUE
  // ============================================================================

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
    const query = this.taskRepository
      .createQueryBuilder("task")
      .where("task.organizationId = :organizationId", { organizationId });

    if (dateFrom) {
      query.andWhere("task.createdAt >= :dateFrom", { dateFrom });
    }
    if (dateTo) {
      query.andWhere("task.createdAt <= :dateTo", { dateTo });
    }

    const total = await query.getCount();

    // By status
    const statusRows = await query
      .clone()
      .select("task.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("task.status")
      .getRawMany();

    const byStatus = statusRows.reduce(
      (acc: Record<string, number>, row: { status: string; count: string }) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      },
      {},
    );

    // By type
    const typeRows = await query
      .clone()
      .select("task.typeCode", "type")
      .addSelect("COUNT(*)", "count")
      .groupBy("task.typeCode")
      .getRawMany();

    const byType = typeRows.reduce(
      (acc: Record<string, number>, row: { type: string; count: string }) => {
        acc[row.type] = parseInt(row.count);
        return acc;
      },
      {},
    );

    // By priority
    const priorityRows = await query
      .clone()
      .select("task.priority", "priority")
      .addSelect("COUNT(*)", "count")
      .groupBy("task.priority")
      .getRawMany();

    const byPriority = priorityRows.reduce(
      (
        acc: Record<string, number>,
        row: { priority: string; count: string },
      ) => {
        acc[row.priority] = parseInt(row.count);
        return acc;
      },
      {},
    );

    // Average completion time
    const avgResult = await this.taskRepository
      .createQueryBuilder("task")
      .select("AVG(task.actualDuration)", "avg")
      .where("task.organizationId = :organizationId", { organizationId })
      .andWhere("task.status = :status", { status: TaskStatus.COMPLETED })
      .andWhere("task.actualDuration IS NOT NULL")
      .getRawOne();

    const avgCompletionMinutes = avgResult?.avg
      ? Math.round(parseFloat(avgResult.avg))
      : 0;

    // Overdue count
    const overdueCount = await this.taskRepository.count({
      where: {
        organizationId,
        dueDate: LessThan(new Date()),
        status: In([
          TaskStatus.PENDING,
          TaskStatus.ASSIGNED,
          TaskStatus.IN_PROGRESS,
          TaskStatus.POSTPONED,
        ]),
      },
    });

    return {
      total,
      byStatus,
      byType,
      byPriority,
      avgCompletionMinutes,
      overdueCount,
    };
  }

  async getOverdueTasks(organizationId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: {
        organizationId,
        dueDate: LessThan(new Date()),
        status: In([
          TaskStatus.PENDING,
          TaskStatus.ASSIGNED,
          TaskStatus.IN_PROGRESS,
          TaskStatus.POSTPONED,
        ]),
      },
      relations: ["machine", "assignedTo"],
      order: { dueDate: "ASC" },
    });
  }

  /**
   * Check for overdue tasks, escalate priority, and auto-create incidents.
   * Called by @Cron in the main TasksService.
   */
  async checkOverdueTasks(): Promise<void> {
    let overdue: Task[];
    try {
      overdue = await this.taskRepository.find({
        where: {
          dueDate: LessThan(new Date()),
          status: In([
            TaskStatus.PENDING,
            TaskStatus.ASSIGNED,
            TaskStatus.IN_PROGRESS,
            TaskStatus.POSTPONED,
          ]),
        },
        relations: ["machine"],
      });
    } catch (error) {
      this.logger.error(
        `checkOverdueTasks query failed (run migrations if column missing): ${error instanceof Error ? error.message : error}`,
      );
      return;
    }

    if (overdue.length > 0) {
      this.logger.warn(
        `Found ${overdue.length} overdue task(s): ${overdue.map((t) => t.taskNumber).join(", ")}`,
      );

      // Escalate overdue tasks
      for (const task of overdue) {
        const overdueMs = task.dueDate
          ? new Date().getTime() - new Date(task.dueDate).getTime()
          : 0;

        // Escalate to URGENT after 24h
        if (
          task.priority !== TaskPriority.URGENT &&
          overdueMs > 24 * 60 * 60 * 1000
        ) {
          task.priority = TaskPriority.URGENT;
          await this.taskRepository.save(task);
          this.logger.warn(
            `Escalated task ${task.taskNumber} to URGENT (overdue > 24h)`,
          );
        }

        // Auto-create incident after 48h (if machine linked and not already created)
        const meta = (task.metadata || {}) as Record<string, unknown>;
        if (
          overdueMs > 48 * 60 * 60 * 1000 &&
          task.machineId &&
          !meta.incidentCreated
        ) {
          const incident = this.incidentRepository.create({
            organizationId: task.organizationId,
            machineId: task.machineId,
            type: IncidentType.MECHANICAL_FAILURE,
            status: IncidentStatus.REPORTED,
            priority: IncidentPriority.HIGH,
            title: `Auto-escalated: Task ${task.taskNumber} overdue >48h`,
            description: `Automatically created from overdue task ${task.taskNumber}. Original due date: ${task.dueDate}`,
            reportedByUserId:
              task.createdById || task.assignedToUserId || task.organizationId,
            reportedAt: new Date(),
          });
          const saved = await this.incidentRepository.save(incident);
          task.metadata = {
            ...meta,
            incidentCreated: true,
            incidentId: saved.id,
          };
          await this.taskRepository.save(task);
          this.logger.warn(
            `Created incident ${saved.id} for task ${task.taskNumber} (overdue > 48h)`,
          );
        }
      }
    }
  }

  // ============================================================================
  // MY TASKS (for operators/technicians)
  // ============================================================================

  async getMyTasks(
    userId: string,
    organizationId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Task[]; total: number }> {
    const safeLimit = Math.min(limit, 100);
    const [data, total] = await this.taskRepository.findAndCount({
      where: {
        assignedToUserId: userId,
        organizationId,
        status: In([
          TaskStatus.PENDING,
          TaskStatus.ASSIGNED,
          TaskStatus.IN_PROGRESS,
          TaskStatus.POSTPONED,
        ]),
      },
      relations: ["machine"],
      order: {
        dueDate: "ASC",
      },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });

    return { data, total };
  }

  // ============================================================================
  // KANBAN BOARD
  // ============================================================================

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
    const kanbanStatuses = [
      TaskStatus.PENDING,
      TaskStatus.ASSIGNED,
      TaskStatus.IN_PROGRESS,
      TaskStatus.COMPLETED,
      TaskStatus.POSTPONED,
    ];

    const query = this.taskRepository
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.machine", "machine")
      .leftJoinAndSelect("task.assignedTo", "assignedTo")
      .where("task.organizationId = :organizationId", { organizationId })
      .andWhere("task.status IN (:...statuses)", { statuses: kanbanStatuses });

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

    const tasks = await query
      .orderBy("task.priority", "DESC")
      .addOrderBy("task.dueDate", "ASC")
      .getMany();

    // Group by status
    const board = {
      pending: [] as Task[],
      assigned: [] as Task[],
      in_progress: [] as Task[],
      completed: [] as Task[],
      postponed: [] as Task[],
    };

    for (const task of tasks) {
      switch (task.status) {
        case TaskStatus.PENDING:
          board.pending.push(task);
          break;
        case TaskStatus.ASSIGNED:
          board.assigned.push(task);
          break;
        case TaskStatus.IN_PROGRESS:
          board.in_progress.push(task);
          break;
        case TaskStatus.COMPLETED:
          board.completed.push(task);
          break;
        case TaskStatus.POSTPONED:
          board.postponed.push(task);
          break;
      }
    }

    return board;
  }
}
