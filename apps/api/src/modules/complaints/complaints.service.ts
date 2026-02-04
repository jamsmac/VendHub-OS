/**
 * Complaints Service for VendHub OS
 * QR-code based complaint handling with SLA tracking
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, LessThan, IsNull, Not } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Complaint,
  ComplaintComment,
  ComplaintAction,
  ComplaintRefund,
  ComplaintTemplate,
  ComplaintQrCode,
  ComplaintAutomationRule,
  ComplaintStatus,
  ComplaintPriority,
  ComplaintCategory,
  ComplaintSource,
  ComplaintActionType,
  RefundStatus,
  DEFAULT_SLA_CONFIG,
} from './entities/complaint.entity';

// SLA hours helper based on priority
const DEFAULT_SLA_HOURS: Record<ComplaintPriority, number> = {
  [ComplaintPriority.CRITICAL]: DEFAULT_SLA_CONFIG[ComplaintPriority.CRITICAL].resolutionTimeHours,
  [ComplaintPriority.HIGH]: DEFAULT_SLA_CONFIG[ComplaintPriority.HIGH].resolutionTimeHours,
  [ComplaintPriority.MEDIUM]: DEFAULT_SLA_CONFIG[ComplaintPriority.MEDIUM].resolutionTimeHours,
  [ComplaintPriority.LOW]: DEFAULT_SLA_CONFIG[ComplaintPriority.LOW].resolutionTimeHours,
};

// Refund method type
type RefundMethod = 'original_payment' | 'bank_transfer' | 'cash' | 'credit';

// ============================================================================
// DTOs
// ============================================================================

export interface CreateComplaintDto {
  organizationId: string;
  machineId?: string;
  locationId?: string;
  transactionId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerTelegramId?: string;
  category: ComplaintCategory;
  source: ComplaintSource;
  subject: string;
  description: string;
  attachments?: string[];
  priority?: ComplaintPriority;
  qrCodeId?: string;
}

export interface UpdateComplaintDto {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  category?: ComplaintCategory;
  assignedToId?: string | null;
  subject?: string;
  description?: string;
  resolution?: string;
  tags?: string[];
}

export interface CreateCommentDto {
  complaintId: string;
  userId?: string;
  isInternal: boolean;
  content: string;
  attachments?: string[];
}

export interface CreateRefundDto {
  complaintId: string;
  transactionId?: string;
  amount: number;
  currency?: string;
  method: RefundMethod;
  reason: string;
  bankDetails?: Record<string, any>;
  requestedById?: string;
}

export interface QueryComplaintsDto {
  organizationId: string;
  status?: ComplaintStatus[];
  priority?: ComplaintPriority[];
  category?: ComplaintCategory[];
  source?: ComplaintSource[];
  assignedToId?: string;
  machineId?: string;
  locationId?: string;
  slaBreached?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ComplaintStatistics {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  slaBreached: number;
  averageResolutionTime: number;
  satisfactionAverage: number;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);

  constructor(
    @InjectRepository(Complaint)
    private complaintRepo: Repository<Complaint>,
    @InjectRepository(ComplaintComment)
    private commentRepo: Repository<ComplaintComment>,
    @InjectRepository(ComplaintAction)
    private actionRepo: Repository<ComplaintAction>,
    @InjectRepository(ComplaintRefund)
    private refundRepo: Repository<ComplaintRefund>,
    @InjectRepository(ComplaintTemplate)
    private templateRepo: Repository<ComplaintTemplate>,
    @InjectRepository(ComplaintQrCode)
    private qrCodeRepo: Repository<ComplaintQrCode>,
    @InjectRepository(ComplaintAutomationRule)
    private automationRepo: Repository<ComplaintAutomationRule>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ============================================================================
  // COMPLAINT CRUD
  // ============================================================================

  async create(dto: CreateComplaintDto): Promise<Complaint> {
    // Generate complaint number
    const ticketNumber = await this.generateComplaintNumber(dto.organizationId);

    // Calculate SLA deadline
    const priority = dto.priority || ComplaintPriority.MEDIUM;
    const slaHours = DEFAULT_SLA_HOURS[priority];
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    // Apply automation rules
    const automationResult = await this.applyAutomationRules(dto);

    const complaint = this.complaintRepo.create({
      organizationId: dto.organizationId,
      machineId: dto.machineId,
      locationId: dto.locationId,
      category: dto.category,
      source: dto.source,
      subject: dto.subject,
      description: dto.description,
      attachments: dto.attachments ? dto.attachments.map(url => ({ id: '', type: 'image' as const, url, filename: '', size: 0, mimeType: '', uploadedAt: new Date() })) : [],
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

    // Update QR code scan count if applicable
    if (dto.qrCodeId) {
      await this.qrCodeRepo.update(dto.qrCodeId, {
        scanCount: () => 'scan_count + 1',
        lastScannedAt: new Date(),
      });
    }

    // Log action
    await this.logAction(saved.id, null, 'create', null, ComplaintStatus.NEW, 'Жалоба создана');

    // Emit event
    this.eventEmitter.emit('complaint.created', saved);

    return saved;
  }

  async findById(id: string): Promise<Complaint> {
    const complaint = await this.complaintRepo.findOne({
      where: { id },
      relations: ['comments', 'actions', 'refunds'],
    });

    if (!complaint) {
      throw new NotFoundException(`Жалоба ${id} не найдена`);
    }

    return complaint;
  }

  async findByNumber(ticketNumber: string): Promise<Complaint> {
    const complaint = await this.complaintRepo.findOne({
      where: { ticketNumber },
      relations: ['comments', 'actions', 'refunds'],
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
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const qb = this.complaintRepo.createQueryBuilder('c');
    qb.where('c.organizationId = :organizationId', { organizationId });

    if (status?.length) {
      qb.andWhere('c.status IN (:...status)', { status });
    }

    if (priority?.length) {
      qb.andWhere('c.priority IN (:...priority)', { priority });
    }

    if (category?.length) {
      qb.andWhere('c.category IN (:...category)', { category });
    }

    if (source?.length) {
      qb.andWhere('c.source IN (:...source)', { source });
    }

    if (assignedToId) {
      qb.andWhere('c.assignedToId = :assignedToId', { assignedToId });
    }

    if (machineId) {
      qb.andWhere('c.machineId = :machineId', { machineId });
    }

    if (locationId) {
      qb.andWhere('c.locationId = :locationId', { locationId });
    }

    if (slaBreached !== undefined) {
      qb.andWhere('c.isSlaBreached = :slaBreached', { slaBreached });
    }

    if (dateFrom) {
      qb.andWhere('c.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('c.createdAt <= :dateTo', { dateTo });
    }

    if (search) {
      qb.andWhere(
        "(c.ticketNumber ILIKE :search OR c.subject ILIKE :search OR c.customer->>'name' ILIKE :search OR c.customer->>'phone' ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();

    qb.orderBy(`c.${sortBy}`, sortOrder);
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, dto: UpdateComplaintDto, performedById: string): Promise<Complaint> {
    const complaint = await this.findById(id);
    const oldStatus = complaint.status;

    // Update fields
    Object.assign(complaint, dto);

    // Handle status changes
    if (dto.status && dto.status !== oldStatus) {
      if (dto.status === ComplaintStatus.RESOLVED) {
        complaint.resolvedAt = new Date();
        complaint.resolvedById = performedById;
      }

      // Note: No separate closedAt field - resolvedAt is used for closure tracking
    }

    complaint.updated_at = new Date();
    const saved = await this.complaintRepo.save(complaint);

    // Log action
    if (dto.status && dto.status !== oldStatus) {
      await this.logAction(id, performedById, 'status_change', oldStatus, dto.status);
    }

    // Emit event
    this.eventEmitter.emit('complaint.updated', { complaint: saved, changes: dto });

    return saved;
  }

  async assign(id: string, assignedToId: string, performedById: string): Promise<Complaint> {
    const complaint = await this.findById(id);
    const oldAssignee = complaint.assignedToId;

    complaint.assignedToId = assignedToId;
    complaint.status = complaint.status === ComplaintStatus.NEW ? ComplaintStatus.IN_PROGRESS : complaint.status;
    complaint.updated_at = new Date();

    const saved = await this.complaintRepo.save(complaint);

    await this.logAction(id, performedById, 'assign', null, null, `Назначено на ${assignedToId}`);

    this.eventEmitter.emit('complaint.assigned', { complaint: saved, assignedToId, oldAssignee });

    return saved;
  }

  async resolve(id: string, resolution: string, performedById: string): Promise<Complaint> {
    return this.update(id, {
      status: ComplaintStatus.RESOLVED,
      resolution,
    }, performedById);
  }

  async escalate(id: string, reason: string, performedById: string): Promise<Complaint> {
    const complaint = await this.findById(id);

    complaint.status = ComplaintStatus.ESCALATED;
    complaint.priority = ComplaintPriority.CRITICAL;
    complaint.isEscalated = true;
    complaint.escalatedAt = new Date();
    complaint.escalationReason = reason;

    const saved = await this.complaintRepo.save(complaint);

    await this.logAction(id, performedById, 'escalate', complaint.status, ComplaintStatus.ESCALATED, reason);

    this.eventEmitter.emit('complaint.escalated', { complaint: saved, reason });

    return saved;
  }

  // ============================================================================
  // COMMENTS
  // ============================================================================

  async addComment(dto: CreateCommentDto): Promise<ComplaintComment> {
    const complaint = await this.findById(dto.complaintId);

    const comment = this.commentRepo.create({
      complaintId: dto.complaintId,
      organizationId: complaint.organizationId,
      authorId: dto.userId,
      authorName: '',
      authorType: dto.userId ? 'staff' : 'customer',
      content: dto.content,
      attachments: dto.attachments ? dto.attachments.map(url => ({ id: '', type: 'document' as const, url, filename: '', size: 0, mimeType: '', uploadedAt: new Date() })) : [],
      isInternal: dto.isInternal,
    });

    const saved = await this.commentRepo.save(comment);

    // Update complaint comment count
    complaint.commentCount = (complaint.commentCount || 0) + 1;
    await this.complaintRepo.save(complaint);

    // If external comment, may need to notify customer
    if (!dto.isInternal) {
      this.eventEmitter.emit('complaint.comment.added', { complaint, comment: saved });
    }

    return saved;
  }

  async getComments(complaintId: string, includeInternal: boolean = true): Promise<ComplaintComment[]> {
    const where: any = { complaintId };
    if (!includeInternal) {
      where.isInternal = false;
    }

    return this.commentRepo.find({
      where,
      order: { created_at: 'ASC' },
    });
  }

  // ============================================================================
  // REFUNDS
  // ============================================================================

  async createRefund(dto: CreateRefundDto): Promise<ComplaintRefund> {
    const complaint = await this.findById(dto.complaintId);

    const refund = this.refundRepo.create({
      complaintId: dto.complaintId,
      organizationId: complaint.organizationId,
      originalTransactionId: dto.transactionId,
      amount: dto.amount,
      currency: dto.currency || 'UZS',
      refundMethod: dto.method,
      reason: dto.reason,
      refundDetails: dto.bankDetails,
      status: RefundStatus.PENDING,
      created_by_id: dto.requestedById,
    } as Partial<ComplaintRefund>);

    const saved = await this.refundRepo.save(refund);

    await this.logAction(
      dto.complaintId,
      dto.requestedById || null,
      'refund_requested',
      null,
      null,
      `Запрошен возврат ${dto.amount} ${saved.currency}`,
    );

    this.eventEmitter.emit('complaint.refund.requested', { complaint, refund: saved });

    return saved;
  }

  async approveRefund(refundId: string, approvedById: string): Promise<ComplaintRefund> {
    const refund = await this.refundRepo.findOne({ where: { id: refundId } });
    if (!refund) {
      throw new NotFoundException(`Возврат ${refundId} не найден`);
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Возврат уже обработан');
    }

    refund.status = RefundStatus.APPROVED;
    refund.approvedById = approvedById;

    const saved = await this.refundRepo.save(refund);

    this.eventEmitter.emit('complaint.refund.approved', { refund: saved });

    return saved;
  }

  async processRefund(refundId: string, processedById: string, referenceNumber?: string): Promise<ComplaintRefund> {
    const refund = await this.refundRepo.findOne({ where: { id: refundId } });
    if (!refund) {
      throw new NotFoundException(`Возврат ${refundId} не найден`);
    }

    if (refund.status !== RefundStatus.APPROVED) {
      throw new BadRequestException('Возврат должен быть сначала одобрен');
    }

    refund.status = RefundStatus.COMPLETED;
    refund.processedAt = new Date();
    refund.completedAt = new Date();
    if (referenceNumber) {
      refund.externalRefundId = referenceNumber;
    }

    const saved = await this.refundRepo.save(refund);

    // Log on complaint
    await this.logAction(
      refund.complaintId,
      processedById,
      'refund_completed',
      null,
      null,
      `Возврат выполнен: ${refund.amount} ${refund.currency}`,
    );

    this.eventEmitter.emit('complaint.refund.completed', { refund: saved });

    return saved;
  }

  async rejectRefund(refundId: string, rejectedById: string, reason: string): Promise<ComplaintRefund> {
    const refund = await this.refundRepo.findOne({ where: { id: refundId } });
    if (!refund) {
      throw new NotFoundException(`Возврат ${refundId} не найден`);
    }

    refund.status = RefundStatus.REJECTED;
    refund.rejectionReason = reason;

    return this.refundRepo.save(refund);
  }

  // ============================================================================
  // QR CODES
  // ============================================================================

  async generateQrCode(organizationId: string, machineId: string): Promise<ComplaintQrCode> {
    const code = this.generateRandomCode(8);
    const baseUrl = process.env.CLIENT_URL || 'https://vendhub.uz';
    const url = `${baseUrl}/complaint/${code}`;

    const qrCode = this.qrCodeRepo.create({
      organizationId,
      machineId,
      code,
      url,
      isActive: true,
      scanCount: 0,
    } as Partial<ComplaintQrCode>);

    return this.qrCodeRepo.save(qrCode) as Promise<ComplaintQrCode>;
  }

  async getQrCodeByCode(code: string): Promise<ComplaintQrCode> {
    const qrCode = await this.qrCodeRepo.findOne({
      where: { code, isActive: true },
    });

    if (!qrCode) {
      throw new NotFoundException('QR-код не найден или неактивен');
    }

    return qrCode;
  }

  async getQrCodesForMachine(machineId: string): Promise<ComplaintQrCode[]> {
    return this.qrCodeRepo.find({
      where: { machineId },
      order: { created_at: 'DESC' },
    });
  }

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  async getTemplates(organizationId: string): Promise<ComplaintTemplate[]> {
    return this.templateRepo.find({
      where: [
        { organizationId, isActive: true },
        { organizationId: IsNull(), isActive: true }, // System templates
      ],
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async getTemplateByCategory(organizationId: string, category: ComplaintCategory): Promise<ComplaintTemplate | null> {
    return this.templateRepo.findOne({
      where: [
        { organizationId, category, isActive: true },
        { organizationId: IsNull(), category, isActive: true },
      ],
    });
  }

  // ============================================================================
  // SLA & STATISTICS
  // ============================================================================

  async checkSlaBreaches(): Promise<number> {
    const result = await this.complaintRepo.update(
      {
        status: In([ComplaintStatus.NEW, ComplaintStatus.IN_PROGRESS, ComplaintStatus.AWAITING_CUSTOMER]),
        isSlaBreached: false,
        resolutionDeadline: LessThan(new Date()),
      },
      { isSlaBreached: true },
    );

    if (result.affected && result.affected > 0) {
      this.logger.warn(`${result.affected} жалоб превысили SLA`);

      // Get breached complaints for notifications
      const breached = await this.complaintRepo.find({
        where: {
          isSlaBreached: true,
          status: In([ComplaintStatus.NEW, ComplaintStatus.IN_PROGRESS]),
        },
      });

      for (const complaint of breached) {
        this.eventEmitter.emit('complaint.sla.breached', complaint);
      }
    }

    return result.affected || 0;
  }

  async getStatistics(organizationId: string, dateFrom: Date, dateTo: Date): Promise<ComplaintStatistics> {
    const complaints = await this.complaintRepo.find({
      where: {
        organizationId,
        created_at: Between(dateFrom, dateTo),
      },
    });

    const total = complaints.length;

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let slaBreached = 0;
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let totalSatisfaction = 0;
    let ratedCount = 0;

    for (const c of complaints) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;

      if (c.isSlaBreached) slaBreached++;

      if (c.resolvedAt) {
        resolvedCount++;
        totalResolutionTime += c.resolvedAt.getTime() - c.created_at.getTime();
      }

      if (c.satisfactionRating) {
        ratedCount++;
        totalSatisfaction += c.satisfactionRating;
      }
    }

    return {
      total,
      byStatus,
      byPriority,
      byCategory,
      slaBreached,
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount / (1000 * 60 * 60) : 0, // hours
      satisfactionAverage: ratedCount > 0 ? totalSatisfaction / ratedCount : 0,
    };
  }

  // ============================================================================
  // CUSTOMER FEEDBACK
  // ============================================================================

  async submitFeedback(complaintId: string, rating: number, comment?: string): Promise<Complaint> {
    const complaint = await this.findById(complaintId);

    if (![ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED].includes(complaint.status)) {
      throw new BadRequestException('Можно оценить только закрытую жалобу');
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Оценка должна быть от 1 до 5');
    }

    complaint.satisfactionRating = rating as any;
    if (comment) {
      complaint.satisfactionFeedback = comment;
    }
    complaint.feedbackReceivedAt = new Date();

    return this.complaintRepo.save(complaint);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async generateComplaintNumber(organizationId: string): Promise<string> {
    const date = new Date();
    const prefix = `CMP-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const lastComplaint = await this.complaintRepo.findOne({
      where: {
        organizationId,
        ticketNumber: Not(IsNull()),
      },
      order: { created_at: 'DESC' },
    });

    let sequence = 1;
    if (lastComplaint?.ticketNumber) {
      const match = lastComplaint.ticketNumber.match(/(\d+)$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}-${String(sequence).padStart(5, '0')}`;
  }

  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async logAction(
    complaintId: string,
    performedById: string | null,
    actionType: string,
    oldStatus: ComplaintStatus | null,
    newStatus: ComplaintStatus | null,
    description?: string,
  ): Promise<void> {
    // Map string action types to enum values
    const actionTypeMap: Record<string, ComplaintActionType> = {
      'create': ComplaintActionType.CREATED,
      'status_change': ComplaintActionType.STATUS_CHANGED,
      'assign': ComplaintActionType.ASSIGNED,
      'escalate': ComplaintActionType.ESCALATED,
      'refund_requested': ComplaintActionType.REFUND_INITIATED,
      'refund_completed': ComplaintActionType.REFUND_COMPLETED,
      'deleted': ComplaintActionType.STATUS_CHANGED,
    };

    const action = this.actionRepo.create({
      complaintId,
      organizationId: '', // Will be filled from complaint
      performedById: performedById || undefined,
      performedByName: '',
      actionType: actionTypeMap[actionType] || ComplaintActionType.STATUS_CHANGED,
      description: description || `${actionType}: ${oldStatus || ''} -> ${newStatus || ''}`,
      changes: oldStatus && newStatus ? [{ field: 'status', oldValue: oldStatus, newValue: newStatus }] : undefined,
    });

    await this.actionRepo.save(action);
  }

  private async applyAutomationRules(dto: CreateComplaintDto): Promise<{
    priority?: ComplaintPriority;
    assignedToId?: string;
  }> {
    const rules = await this.automationRepo.find({
      where: {
        organizationId: dto.organizationId,
        isActive: true,
      },
      order: { priority: 'DESC' },
    });

    for (const rule of rules) {
      // Check conditions from JSONB
      let matches = true;
      for (const condition of rule.conditions || []) {
        const value = (dto as any)[condition.field];
        switch (condition.operator) {
          case 'equals':
            matches = value === condition.value;
            break;
          case 'not_equals':
            matches = value !== condition.value;
            break;
          case 'in':
            matches = Array.isArray(condition.value) && condition.value.includes(value);
            break;
          case 'not_in':
            matches = Array.isArray(condition.value) && !condition.value.includes(value);
            break;
          default:
            matches = true;
        }
        if (!matches) break;
      }

      if (!matches) continue;

      // Apply actions from JSONB
      let result: { priority?: ComplaintPriority; assignedToId?: string } = {};
      for (const action of rule.actions || []) {
        if (action.type === 'set_priority' && action.params?.priority) {
          result.priority = action.params.priority as ComplaintPriority;
        }
        if (action.type === 'assign' && action.params?.userId) {
          result.assignedToId = action.params.userId;
        }
      }

      if (rule.stopOnMatch) {
        return result;
      }
    }

    return {};
  }

  // ============================================================================
  // ADDITIONAL CRUD METHODS
  // ============================================================================

  /**
   * Find all complaints for organization (simplified alias for query)
   */
  async findAll(organizationId: string, options?: { page?: number; limit?: number }) {
    return this.query({
      organizationId,
      page: options?.page || 1,
      limit: options?.limit || 50,
    });
  }

  /**
   * Soft delete complaint (only for rejected/duplicate complaints)
   */
  async remove(id: string, userId: string): Promise<void> {
    const complaint = await this.findById(id);

    if (![ComplaintStatus.REJECTED, ComplaintStatus.DUPLICATE, ComplaintStatus.CLOSED].includes(complaint.status)) {
      throw new BadRequestException('Можно удалить только отклонённые, дублирующиеся или закрытые жалобы');
    }

    await this.logAction(
      id,
      userId,
      'deleted',
      complaint.status,
      null,
      'Жалоба удалена',
    );

    await this.complaintRepo.softDelete(id);
    this.logger.log(`Complaint ${id} soft deleted by user ${userId}`);
  }

  /**
   * Bulk update complaints
   */
  async bulkUpdate(
    ids: string[],
    data: { status?: ComplaintStatus; assignedToId?: string; priority?: ComplaintPriority },
    userId: string,
  ): Promise<number> {
    let updated = 0;

    for (const id of ids) {
      try {
        await this.update(id, data, userId);
        updated++;
      } catch (error: any) {
        this.logger.warn(`Failed to update complaint ${id}: ${(error as Error).message}`);
      }
    }

    return updated;
  }

  /**
   * Get complaints assigned to user
   */
  async findByAssignee(userId: string, includeResolved = false): Promise<Complaint[]> {
    const statuses = includeResolved
      ? Object.values(ComplaintStatus)
      : [ComplaintStatus.NEW, ComplaintStatus.IN_PROGRESS, ComplaintStatus.AWAITING_CUSTOMER, ComplaintStatus.AWAITING_PARTS];

    return this.complaintRepo.find({
      where: {
        assignedToId: userId,
        status: In(statuses),
      },
      relations: ['comments', 'actions'],
      order: { priority: 'DESC', created_at: 'ASC' },
    });
  }

  /**
   * Get complaints for machine
   */
  async findByMachine(machineId: string, limit = 20): Promise<Complaint[]> {
    return this.complaintRepo.find({
      where: { machineId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get open complaints count by priority
   */
  async getOpenCountsByPriority(organizationId: string): Promise<Record<string, number>> {
    const result = await this.complaintRepo
      .createQueryBuilder('c')
      .select('c.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .where('c.organizationId = :organizationId', { organizationId })
      .andWhere('c.status IN (:...statuses)', {
        statuses: [ComplaintStatus.NEW, ComplaintStatus.IN_PROGRESS, ComplaintStatus.AWAITING_CUSTOMER],
      })
      .groupBy('c.priority')
      .getRawMany();

    const counts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const row of result) {
      counts[row.priority] = parseInt(row.count);
    }

    return counts;
  }

  /**
   * Get SLA breach risk complaints (deadline within 2 hours)
   */
  async getSlaAtRisk(organizationId: string): Promise<Complaint[]> {
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);

    return this.complaintRepo.find({
      where: {
        organizationId,
        status: In([ComplaintStatus.NEW, ComplaintStatus.IN_PROGRESS]),
        isSlaBreached: false,
        resolutionDeadline: LessThan(twoHoursFromNow),
      },
      order: { resolutionDeadline: 'ASC' },
    });
  }
}
