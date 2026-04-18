/**
 * Complaints Core Service
 * CRUD operations, workflow, comments, and feedback
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Repository,
  In,
  Not,
  IsNull,
  FindOptionsWhere,
  DataSource,
} from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import {
  Complaint,
  ComplaintComment,
  ComplaintAction,
  ComplaintAutomationRule,
  ComplaintStatus,
  ComplaintPriority,
  ComplaintActionType,
  SatisfactionRating,
  DEFAULT_SLA_CONFIG,
} from "./entities/complaint.entity";
import {
  CreateComplaintDto,
  UpdateComplaintDto,
  CreateCommentDto,
  QueryComplaintsDto,
} from "./complaints.types";
import { safeOrderBy, stripProtectedFields } from "../../common/utils";

const DEFAULT_SLA_HOURS: Partial<Record<ComplaintPriority, number>> = {
  [ComplaintPriority.CRITICAL]:
    DEFAULT_SLA_CONFIG[ComplaintPriority.CRITICAL]?.resolutionTimeHours ?? 4,
  [ComplaintPriority.URGENT]:
    DEFAULT_SLA_CONFIG[ComplaintPriority.CRITICAL]?.resolutionTimeHours ?? 2,
  [ComplaintPriority.HIGH]:
    DEFAULT_SLA_CONFIG[ComplaintPriority.HIGH]?.resolutionTimeHours ?? 8,
  [ComplaintPriority.MEDIUM]:
    DEFAULT_SLA_CONFIG[ComplaintPriority.MEDIUM]?.resolutionTimeHours ?? 24,
  [ComplaintPriority.LOW]:
    DEFAULT_SLA_CONFIG[ComplaintPriority.LOW]?.resolutionTimeHours ?? 72,
};

@Injectable()
export class ComplaintsCoreService {
  private readonly logger = new Logger(ComplaintsCoreService.name);

  constructor(
    @InjectRepository(Complaint)
    private complaintRepo: Repository<Complaint>,
    @InjectRepository(ComplaintComment)
    private commentRepo: Repository<ComplaintComment>,
    @InjectRepository(ComplaintAction)
    private actionRepo: Repository<ComplaintAction>,
    @InjectRepository(ComplaintAutomationRule)
    private automationRepo: Repository<ComplaintAutomationRule>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ============================================================================
  // COMPLAINT CRUD
  // ============================================================================

  async create(dto: CreateComplaintDto): Promise<Complaint> {
    const ticketNumber = await this.generateComplaintNumber(dto.organizationId);
    const priority = dto.priority || ComplaintPriority.MEDIUM;
    const slaHours = DEFAULT_SLA_HOURS[priority] ?? 24;
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);
    const automationResult = await this.applyAutomationRules(dto);

    const complaint = this.complaintRepo.create({
      organizationId: dto.organizationId,
      machineId: dto.machineId,
      locationId: dto.locationId,
      category: dto.category,
      source: dto.source,
      subject: dto.subject,
      description: dto.description,
      attachments: dto.attachments
        ? dto.attachments.map((url) => ({
            id: "",
            type: "image" as const,
            url,
            filename: "",
            size: 0,
            mimeType: "",
            uploadedAt: new Date(),
          }))
        : [],
      customer: {
        name: dto.customerName,
        phone: dto.customerPhone,
        email: dto.customerEmail,
        telegramId: dto.customerTelegramId,
      },
      ticketNumber,
      status: ComplaintStatus.NEW,
      priority: automationResult.priority || priority,
      assignedToId: automationResult.assignedToId,
      resolutionDeadline: slaDeadline,
      isSlaBreached: false,
    });

    const saved = await this.complaintRepo.save(complaint);

    if (dto.qrCodeId) {
      await this.complaintRepo.manager
        .createQueryBuilder()
        .update("complaint_qr_codes")
        .set({
          scanCount: () => "scan_count + 1",
          lastScannedAt: new Date(),
        })
        .where("id = :id", { id: dto.qrCodeId })
        .execute();
    }

    await this.logAction(
      saved.id,
      null,
      "create",
      null,
      ComplaintStatus.NEW,
      "Жалоба создана",
    );

    this.eventEmitter.emit("complaint.created", saved);
    return saved;
  }

  async findById(id: string, organizationId?: string): Promise<Complaint> {
    const where: FindOptionsWhere<Complaint> = { id };
    if (organizationId) where.organizationId = organizationId;

    const complaint = await this.complaintRepo.findOne({
      where,
      relations: ["comments", "actions", "refunds"],
    });

    if (!complaint) {
      throw new NotFoundException(`Жалоба ${id} не найдена`);
    }

    return complaint;
  }

  async findByNumber(
    ticketNumber: string,
    organizationId?: string,
  ): Promise<Complaint> {
    const where: FindOptionsWhere<Complaint> = { ticketNumber };
    if (organizationId) where.organizationId = organizationId;

    const complaint = await this.complaintRepo.findOne({
      where,
      relations: ["comments", "actions", "refunds"],
    });

    if (!complaint) {
      throw new NotFoundException(`Жалоба ${ticketNumber} не найдена`);
    }

    return complaint;
  }

  async query(query: QueryComplaintsDto) {
    const {
      organizationId,
      status,
      priority,
      category,
      source,
      assignedToId,
      machineId,
      locationId,
      slaBreached,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = query;

    const qb = this.complaintRepo.createQueryBuilder("c");
    qb.where("c.organizationId = :organizationId", { organizationId });

    if (status?.length) qb.andWhere("c.status IN (:...status)", { status });
    if (priority?.length)
      qb.andWhere("c.priority IN (:...priority)", { priority });
    if (category?.length)
      qb.andWhere("c.category IN (:...category)", { category });
    if (source?.length) qb.andWhere("c.source IN (:...source)", { source });
    if (assignedToId)
      qb.andWhere("c.assignedToId = :assignedToId", { assignedToId });
    if (machineId) qb.andWhere("c.machineId = :machineId", { machineId });
    if (locationId) qb.andWhere("c.locationId = :locationId", { locationId });
    if (slaBreached !== undefined)
      qb.andWhere("c.isSlaBreached = :slaBreached", { slaBreached });
    if (dateFrom) qb.andWhere("c.createdAt >= :dateFrom", { dateFrom });
    if (dateTo) qb.andWhere("c.createdAt <= :dateTo", { dateTo });
    if (search) {
      qb.andWhere(
        "(c.ticketNumber ILIKE :search OR c.subject ILIKE :search OR c.customer->>'name' ILIKE :search OR c.customer->>'phone' ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();
    safeOrderBy(qb, "c", sortBy, sortOrder, [
      "createdAt",
      "updatedAt",
      "status",
      "priority",
      "category",
      "ticketNumber",
    ] as const);
    qb.skip((page - 1) * limit);
    qb.take(limit);
    const data = await qb.getMany();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async update(
    id: string,
    dto: UpdateComplaintDto,
    performedById: string,
    organizationId?: string,
  ): Promise<Complaint> {
    const complaint = await this.findById(id, organizationId);
    const oldStatus = complaint.status;

    Object.assign(
      complaint,
      stripProtectedFields(dto as Record<string, unknown>),
    );

    if (dto.status && dto.status !== oldStatus) {
      if (dto.status === ComplaintStatus.RESOLVED) {
        complaint.resolvedAt = new Date();
        complaint.resolvedById = performedById;
      }
    }

    complaint.updatedAt = new Date();
    const saved = await this.complaintRepo.save(complaint);

    if (dto.status && dto.status !== oldStatus) {
      await this.logAction(
        id,
        performedById,
        "status_change",
        oldStatus,
        dto.status,
      );
    }

    this.eventEmitter.emit("complaint.updated", {
      complaint: saved,
      changes: dto,
    });
    return saved;
  }

  async assign(
    id: string,
    assignedToId: string,
    performedById: string,
    organizationId?: string,
  ): Promise<Complaint> {
    const complaint = await this.findById(id, organizationId);
    const oldAssignee = complaint.assignedToId;

    complaint.assignedToId = assignedToId;
    complaint.status =
      complaint.status === ComplaintStatus.NEW
        ? ComplaintStatus.IN_PROGRESS
        : complaint.status;
    complaint.updatedAt = new Date();

    const saved = await this.complaintRepo.save(complaint);

    await this.logAction(
      id,
      performedById,
      "assign",
      null,
      null,
      `Назначено на ${assignedToId}`,
    );

    this.eventEmitter.emit("complaint.assigned", {
      complaint: saved,
      assignedToId,
      oldAssignee,
    });

    return saved;
  }

  async resolve(
    id: string,
    resolution: string,
    performedById: string,
    organizationId?: string,
  ): Promise<Complaint> {
    return this.update(
      id,
      { status: ComplaintStatus.RESOLVED, resolution },
      performedById,
      organizationId,
    );
  }

  async escalate(
    id: string,
    reason: string,
    performedById: string,
    organizationId?: string,
  ): Promise<Complaint> {
    const complaint = await this.findById(id, organizationId);

    complaint.status = ComplaintStatus.ESCALATED;
    complaint.priority = ComplaintPriority.CRITICAL;
    complaint.isEscalated = true;
    complaint.escalatedAt = new Date();
    complaint.escalationReason = reason;

    const saved = await this.complaintRepo.save(complaint);

    await this.logAction(
      id,
      performedById,
      "escalate",
      complaint.status,
      ComplaintStatus.ESCALATED,
      reason,
    );

    this.eventEmitter.emit("complaint.escalated", { complaint: saved, reason });
    return saved;
  }

  async reject(
    id: string,
    reason: string,
    performedById: string,
    organizationId?: string,
  ): Promise<Complaint> {
    const complaint = await this.findById(id, organizationId);
    const oldStatus = complaint.status;

    complaint.status = ComplaintStatus.REJECTED;
    complaint.resolution = reason;
    complaint.resolvedAt = new Date();

    const saved = await this.complaintRepo.save(complaint);

    await this.logAction(
      id,
      performedById,
      "reject",
      oldStatus,
      ComplaintStatus.REJECTED,
      reason,
    );
    this.eventEmitter.emit("complaint.rejected", { complaint: saved, reason });
    return saved;
  }

  async getNewComplaints(organizationId: string): Promise<Complaint[]> {
    return this.complaintRepo.find({
      where: { organizationId, status: ComplaintStatus.NEW },
      order: { createdAt: "ASC" },
      take: 1000,
    });
  }

  // ============================================================================
  // COMMENTS
  // ============================================================================

  async addComment(
    dto: CreateCommentDto,
    organizationId?: string,
  ): Promise<ComplaintComment> {
    const complaint = await this.findById(dto.complaintId, organizationId);

    const comment = this.commentRepo.create({
      complaintId: dto.complaintId,
      organizationId: complaint.organizationId,
      authorId: dto.userId,
      authorName: "",
      authorType: dto.userId ? "staff" : "customer",
      content: dto.content,
      attachments: dto.attachments
        ? dto.attachments.map((url) => ({
            id: "",
            type: "document" as const,
            url,
            filename: "",
            size: 0,
            mimeType: "",
            uploadedAt: new Date(),
          }))
        : [],
      isInternal: dto.isInternal,
    });

    // Atomic: save comment + increment count in one transaction
    const saved = await this.dataSource.transaction(async (manager) => {
      const savedComment = await manager.save(comment);
      await manager
        .createQueryBuilder()
        .update(Complaint)
        .set({ commentCount: () => "COALESCE(comment_count, 0) + 1" })
        .where("id = :id", { id: dto.complaintId })
        .execute();
      return savedComment;
    });

    if (!dto.isInternal) {
      this.eventEmitter.emit("complaint.comment.added", {
        complaint,
        comment: saved,
      });
    }

    return saved;
  }

  async getComments(
    complaintId: string,
    includeInternal: boolean = true,
  ): Promise<ComplaintComment[]> {
    const where: FindOptionsWhere<ComplaintComment> = { complaintId };
    if (!includeInternal) {
      where.isInternal = false;
    }

    return this.commentRepo.find({
      where,
      order: { createdAt: "ASC" },
      take: 1000,
    });
  }

  // ============================================================================
  // CUSTOMER FEEDBACK
  // ============================================================================

  async generateFeedbackToken(
    complaintId: string,
    organizationId: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        cid: complaintId,
        oid: organizationId,
        scope: "complaint.feedback",
      },
      {
        secret: this.configService.get<string>("JWT_SECRET"),
        expiresIn: "14d",
      },
    );
  }

  async submitFeedbackByToken(
    token: string,
    rating: number,
    comment?: string,
  ): Promise<Complaint> {
    let decoded: { cid: string; oid: string; scope: string };
    try {
      decoded = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("JWT_SECRET"),
      });
    } catch {
      throw new UnauthorizedException(
        "Ссылка для оценки недействительна или истекла",
      );
    }

    if (decoded.scope !== "complaint.feedback") {
      throw new UnauthorizedException("Неверный тип ссылки");
    }

    const complaint = await this.complaintRepo.findOne({
      where: { id: decoded.cid, organizationId: decoded.oid },
    });
    if (!complaint) {
      throw new NotFoundException("Жалоба не найдена");
    }

    if (
      ![ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED].includes(
        complaint.status,
      )
    ) {
      throw new BadRequestException("Можно оценить только закрытую жалобу");
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException("Оценка должна быть от 1 до 5");
    }

    complaint.satisfactionRating = rating as SatisfactionRating;
    if (comment) {
      complaint.satisfactionFeedback = comment;
    }
    complaint.feedbackReceivedAt = new Date();

    return this.complaintRepo.save(complaint);
  }

  // ============================================================================
  // ADDITIONAL CRUD
  // ============================================================================

  async findAll(
    organizationId: string,
    options?: { page?: number; limit?: number },
  ) {
    return this.query({
      organizationId,
      page: options?.page || 1,
      limit: options?.limit || 50,
    });
  }

  async remove(
    id: string,
    userId: string,
    organizationId?: string,
  ): Promise<void> {
    const complaint = await this.findById(id, organizationId);

    if (
      ![
        ComplaintStatus.REJECTED,
        ComplaintStatus.DUPLICATE,
        ComplaintStatus.CLOSED,
      ].includes(complaint.status)
    ) {
      throw new BadRequestException(
        "Можно удалить только отклонённые, дублирующиеся или закрытые жалобы",
      );
    }

    await this.logAction(
      id,
      userId,
      "deleted",
      complaint.status,
      null,
      "Жалоба удалена",
    );
    await this.complaintRepo.softDelete(id);
    this.logger.log(`Complaint ${id} soft deleted by user ${userId}`);
  }

  async bulkUpdate(
    ids: string[],
    data: {
      status?: ComplaintStatus;
      assignedToId?: string;
      priority?: ComplaintPriority;
    },
    userId: string,
    organizationId?: string,
  ): Promise<number> {
    let updated = 0;

    for (const id of ids) {
      try {
        await this.update(id, data, userId, organizationId);
        updated++;
      } catch (error: unknown) {
        this.logger.warn(
          `Failed to update complaint ${id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return updated;
  }

  async findByAssignee(
    userId: string,
    includeResolved = false,
    organizationId?: string,
  ): Promise<Complaint[]> {
    const statuses = includeResolved
      ? Object.values(ComplaintStatus)
      : [
          ComplaintStatus.NEW,
          ComplaintStatus.IN_PROGRESS,
          ComplaintStatus.AWAITING_CUSTOMER,
          ComplaintStatus.AWAITING_PARTS,
        ];

    const where: FindOptionsWhere<Complaint> = {
      assignedToId: userId,
      status: In(statuses),
    };
    if (organizationId) where.organizationId = organizationId;

    return this.complaintRepo.find({
      where,
      relations: ["comments", "actions"],
      order: { priority: "DESC", createdAt: "ASC" },
      take: 1000,
    });
  }

  async findByMachine(
    machineId: string,
    limit = 20,
    organizationId?: string,
  ): Promise<Complaint[]> {
    const where: FindOptionsWhere<Complaint> = { machineId };
    if (organizationId) where.organizationId = organizationId;

    return this.complaintRepo.find({
      where,
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  async logAction(
    complaintId: string,
    performedById: string | null,
    actionType: string,
    oldStatus: ComplaintStatus | null,
    newStatus: ComplaintStatus | null,
    description?: string,
  ): Promise<void> {
    const actionTypeMap: Record<string, ComplaintActionType> = {
      create: ComplaintActionType.CREATED,
      status_change: ComplaintActionType.STATUS_CHANGED,
      assign: ComplaintActionType.ASSIGNED,
      escalate: ComplaintActionType.ESCALATED,
      refund_requested: ComplaintActionType.REFUND_INITIATED,
      refund_completed: ComplaintActionType.REFUND_COMPLETED,
      deleted: ComplaintActionType.STATUS_CHANGED,
    };

    const action = this.actionRepo.create({
      complaintId,
      organizationId: "",
      performedById: performedById || undefined,
      performedByName: "",
      actionType:
        actionTypeMap[actionType] || ComplaintActionType.STATUS_CHANGED,
      description:
        description ||
        `${actionType}: ${oldStatus || ""} -> ${newStatus || ""}`,
      changes:
        oldStatus && newStatus
          ? [{ field: "status", oldValue: oldStatus, newValue: newStatus }]
          : undefined,
    });

    await this.actionRepo.save(action);
  }

  private async generateComplaintNumber(
    organizationId: string,
  ): Promise<string> {
    const date = new Date();
    const prefix = `CMP-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;

    const lastComplaint = await this.complaintRepo.findOne({
      where: { organizationId, ticketNumber: Not(IsNull()) },
      order: { createdAt: "DESC" },
    });

    let sequence = 1;
    if (lastComplaint?.ticketNumber) {
      const match = lastComplaint.ticketNumber.match(/(\d+)$/);
      if (match) {
        sequence = parseInt(match[1]!, 10) + 1;
      }
    }

    return `${prefix}-${String(sequence).padStart(5, "0")}`;
  }

  private async applyAutomationRules(dto: CreateComplaintDto): Promise<{
    priority?: ComplaintPriority;
    assignedToId?: string;
  }> {
    const rules = await this.automationRepo.find({
      where: { organizationId: dto.organizationId, isActive: true },
      order: { priority: "DESC" },
      take: 500,
    });

    for (const rule of rules) {
      let matches = true;
      for (const condition of rule.conditions || []) {
        const value = (dto as unknown as Record<string, unknown>)[
          condition.field
        ];
        switch (condition.operator) {
          case "equals":
            matches = value === condition.value;
            break;
          case "not_equals":
            matches = value !== condition.value;
            break;
          case "in":
            matches =
              Array.isArray(condition.value) &&
              condition.value.includes(String(value));
            break;
          case "not_in":
            matches =
              Array.isArray(condition.value) &&
              !condition.value.includes(String(value));
            break;
          default:
            matches = true;
        }
        if (!matches) break;
      }

      if (!matches) continue;

      let result: { priority?: ComplaintPriority; assignedToId?: string } = {};
      for (const action of rule.actions || []) {
        if (action.type === "set_priority" && action.params?.priority) {
          result.priority = action.params.priority as ComplaintPriority;
        }
        if (action.type === "assign" && action.params?.userId) {
          result.assignedToId = action.params.userId as string;
        }
      }

      if (rule.stopOnMatch) {
        return result;
      }
    }

    return {};
  }
}
