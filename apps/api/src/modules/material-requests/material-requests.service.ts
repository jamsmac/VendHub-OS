/**
 * Material Requests Service
 * Полный workflow заявок на материалы
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MaterialRequest,
  MaterialRequestItem,
  MaterialRequestHistory,
  MaterialRequestStatus,
  RequestPriority,
} from './entities/material-request.entity';
import {
  CreateMaterialRequestDto,
  UpdateMaterialRequestDto,
  MaterialRequestFilterDto,
  ApproveRequestDto,
  RejectRequestDto,
  RecordPaymentDto,
  ConfirmDeliveryDto,
  CancelRequestDto,
  MaterialRequestDto,
  MaterialRequestListDto,
  MaterialRequestStatsDto,
  MaterialRequestItemDto,
} from './dto/material-request.dto';

// ============================================================================
// WORKFLOW TRANSITIONS
// ============================================================================

const WORKFLOW_TRANSITIONS: Record<MaterialRequestStatus, MaterialRequestStatus[]> = {
  [MaterialRequestStatus.DRAFT]: [MaterialRequestStatus.NEW, MaterialRequestStatus.CANCELLED],
  [MaterialRequestStatus.NEW]: [
    MaterialRequestStatus.APPROVED,
    MaterialRequestStatus.REJECTED,
    MaterialRequestStatus.CANCELLED,
  ],
  [MaterialRequestStatus.APPROVED]: [
    MaterialRequestStatus.SENT,
    MaterialRequestStatus.CANCELLED,
  ],
  [MaterialRequestStatus.REJECTED]: [MaterialRequestStatus.DRAFT],
  [MaterialRequestStatus.SENT]: [
    MaterialRequestStatus.PENDING_PAYMENT,
    MaterialRequestStatus.CANCELLED,
  ],
  [MaterialRequestStatus.PENDING_PAYMENT]: [
    MaterialRequestStatus.PAID,
    MaterialRequestStatus.PARTIALLY_PAID,
    MaterialRequestStatus.CANCELLED,
  ],
  [MaterialRequestStatus.PARTIALLY_PAID]: [
    MaterialRequestStatus.PAID,
    MaterialRequestStatus.CANCELLED,
  ],
  [MaterialRequestStatus.PAID]: [MaterialRequestStatus.DELIVERED],
  [MaterialRequestStatus.DELIVERED]: [MaterialRequestStatus.COMPLETED],
  [MaterialRequestStatus.COMPLETED]: [],
  [MaterialRequestStatus.CANCELLED]: [],
};

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class MaterialRequestsService {
  private readonly logger = new Logger(MaterialRequestsService.name);

  constructor(
    @InjectRepository(MaterialRequest)
    private readonly requestRepo: Repository<MaterialRequest>,
    @InjectRepository(MaterialRequestItem)
    private readonly itemRepo: Repository<MaterialRequestItem>,
    @InjectRepository(MaterialRequestHistory)
    private readonly historyRepo: Repository<MaterialRequestHistory>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================================================
  // CREATE & UPDATE
  // ============================================================================

  /**
   * Создать заявку на материалы
   */
  async createRequest(
    userId: string,
    organizationId: string,
    dto: CreateMaterialRequestDto,
  ): Promise<MaterialRequestDto> {
    // Generate request number
    const requestNumber = await this.generateRequestNumber(organizationId);

    // Calculate total amount
    const items = dto.items.map(item => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice,
    }));
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Create request
    const request = this.requestRepo.create({
      organizationId,
      requestNumber,
      requesterId: userId,
      status: MaterialRequestStatus.DRAFT,
      priority: dto.priority || RequestPriority.NORMAL,
      supplierId: dto.supplierId,
      notes: dto.notes,
      totalAmount,
      items: items.map(item => this.itemRepo.create(item)),
    });

    await this.requestRepo.save(request);

    this.logger.log(`Material request ${requestNumber} created by user ${userId}`);

    return this.mapToDto(request);
  }

  /**
   * Обновить заявку (только в статусе DRAFT)
   */
  async updateRequest(
    requestId: string,
    userId: string,
    organizationId: string,
    dto: UpdateMaterialRequestDto,
  ): Promise<MaterialRequestDto> {
    const request = await this.findRequest(requestId, organizationId);

    if (request.status !== MaterialRequestStatus.DRAFT) {
      throw new BadRequestException('Can only update requests in draft status');
    }

    // Update basic fields
    if (dto.supplierId !== undefined) request.supplierId = dto.supplierId;
    if (dto.priority !== undefined) request.priority = dto.priority;
    if (dto.notes !== undefined) request.notes = dto.notes;

    // Add new items
    if (dto.addItems?.length) {
      const newItems = dto.addItems.map(item =>
        this.itemRepo.create({
          ...item,
          requestId: request.id,
          totalPrice: item.quantity * item.unitPrice,
        }),
      );
      await this.itemRepo.save(newItems);
    }

    // Update existing items
    if (dto.updateItems?.length) {
      for (const update of dto.updateItems) {
        const item = await this.itemRepo.findOne({
          where: { id: update.id, requestId: request.id },
        });
        if (item) {
          if (update.quantity !== undefined) item.quantity = update.quantity;
          if (update.unitPrice !== undefined) item.unitPrice = update.unitPrice;
          if (update.notes !== undefined) item.notes = update.notes;
          item.totalPrice = item.quantity * item.unitPrice;
          await this.itemRepo.save(item);
        }
      }
    }

    // Remove items
    if (dto.removeItemIds?.length) {
      await this.itemRepo.delete({
        id: In(dto.removeItemIds),
        requestId: request.id,
      });
    }

    // Recalculate total
    const items = await this.itemRepo.find({ where: { requestId: request.id } });
    request.totalAmount = items.reduce((sum, item) => sum + Number(item.totalPrice), 0);

    await this.requestRepo.save(request);

    return this.getRequest(requestId, organizationId);
  }

  // ============================================================================
  // WORKFLOW ACTIONS
  // ============================================================================

  /**
   * Отправить заявку на утверждение
   */
  async submitRequest(
    requestId: string,
    userId: string,
    organizationId: string,
    comment?: string,
  ): Promise<MaterialRequestDto> {
    const request = await this.findRequest(requestId, organizationId);

    this.validateTransition(request.status, MaterialRequestStatus.NEW);

    // Check if has items
    if (!request.items?.length) {
      throw new BadRequestException('Cannot submit request without items');
    }

    const fromStatus = request.status;
    request.status = MaterialRequestStatus.NEW;
    request.submittedAt = new Date();

    await this.requestRepo.save(request);
    await this.recordHistory(request.id, userId, fromStatus, request.status, comment);

    this.eventEmitter.emit('material-request.submitted', {
      requestId: request.id,
      requestNumber: request.requestNumber,
      requesterId: request.requesterId,
      organizationId,
    });

    return this.mapToDto(request);
  }

  /**
   * Утвердить заявку
   */
  async approveRequest(
    requestId: string,
    userId: string,
    organizationId: string,
    dto?: ApproveRequestDto,
  ): Promise<MaterialRequestDto> {
    const request = await this.findRequest(requestId, organizationId);

    this.validateTransition(request.status, MaterialRequestStatus.APPROVED);

    const fromStatus = request.status;
    request.status = MaterialRequestStatus.APPROVED;
    request.approvedBy = userId;
    request.approvedAt = new Date();

    await this.requestRepo.save(request);
    await this.recordHistory(request.id, userId, fromStatus, request.status, dto?.comment);

    this.eventEmitter.emit('material-request.approved', {
      requestId: request.id,
      requestNumber: request.requestNumber,
      requesterId: request.requesterId,
      approverId: userId,
      organizationId,
    });

    return this.mapToDto(request);
  }

  /**
   * Отклонить заявку
   */
  async rejectRequest(
    requestId: string,
    userId: string,
    organizationId: string,
    dto: RejectRequestDto,
  ): Promise<MaterialRequestDto> {
    const request = await this.findRequest(requestId, organizationId);

    this.validateTransition(request.status, MaterialRequestStatus.REJECTED);

    const fromStatus = request.status;
    request.status = MaterialRequestStatus.REJECTED;
    request.rejectedBy = userId;
    request.rejectedAt = new Date();
    request.rejectionReason = dto.reason;

    await this.requestRepo.save(request);
    await this.recordHistory(request.id, userId, fromStatus, request.status, dto.reason);

    this.eventEmitter.emit('material-request.rejected', {
      requestId: request.id,
      requestNumber: request.requestNumber,
      requesterId: request.requesterId,
      reason: dto.reason,
      organizationId,
    });

    return this.mapToDto(request);
  }

  /**
   * Отправить поставщику
   */
  async sendToSupplier(
    requestId: string,
    userId: string,
    organizationId: string,
    comment?: string,
  ): Promise<MaterialRequestDto> {
    const request = await this.findRequest(requestId, organizationId);

    this.validateTransition(request.status, MaterialRequestStatus.SENT);

    const fromStatus = request.status;
    request.status = MaterialRequestStatus.SENT;
    request.sentAt = new Date();

    await this.requestRepo.save(request);
    await this.recordHistory(request.id, userId, fromStatus, request.status, comment);

    this.eventEmitter.emit('material-request.sent', {
      requestId: request.id,
      requestNumber: request.requestNumber,
      supplierId: request.supplierId,
      organizationId,
    });

    return this.mapToDto(request);
  }

  /**
   * Записать оплату
   */
  async recordPayment(
    requestId: string,
    userId: string,
    organizationId: string,
    dto: RecordPaymentDto,
  ): Promise<MaterialRequestDto> {
    const request = await this.findRequest(requestId, organizationId);

    if (
      request.status !== MaterialRequestStatus.SENT &&
      request.status !== MaterialRequestStatus.PENDING_PAYMENT &&
      request.status !== MaterialRequestStatus.PARTIALLY_PAID
    ) {
      throw new BadRequestException('Invalid status for payment recording');
    }

    const fromStatus = request.status;
    request.paidAmount = Number(request.paidAmount) + dto.amount;

    if (request.paidAmount >= request.totalAmount) {
      request.status = MaterialRequestStatus.PAID;
    } else {
      request.status = MaterialRequestStatus.PARTIALLY_PAID;
    }

    await this.requestRepo.save(request);
    await this.recordHistory(request.id, userId, fromStatus, request.status, dto.notes);

    this.eventEmitter.emit('material-request.payment-recorded', {
      requestId: request.id,
      amount: dto.amount,
      totalPaid: request.paidAmount,
      organizationId,
    });

    return this.mapToDto(request);
  }

  /**
   * Подтвердить доставку
   */
  async confirmDelivery(
    requestId: string,
    userId: string,
    organizationId: string,
    dto: ConfirmDeliveryDto,
  ): Promise<MaterialRequestDto> {
    const request = await this.findRequest(requestId, organizationId);

    this.validateTransition(request.status, MaterialRequestStatus.DELIVERED);

    // Update delivered quantities
    for (const deliveredItem of dto.items) {
      const item = request.items.find(i => i.id === deliveredItem.itemId);
      if (item) {
        item.deliveredQuantity = deliveredItem.deliveredQuantity;
        await this.itemRepo.save(item);
      }
    }

    const fromStatus = request.status;
    request.status = MaterialRequestStatus.DELIVERED;
    request.deliveredAt = new Date();

    await this.requestRepo.save(request);
    await this.recordHistory(request.id, userId, fromStatus, request.status, dto.notes);

    this.eventEmitter.emit('material-request.delivered', {
      requestId: request.id,
      requestNumber: request.requestNumber,
      organizationId,
    });

    return this.mapToDto(request);
  }

  /**
   * Завершить заявку
   */
  async completeRequest(
    requestId: string,
    userId: string,
    organizationId: string,
    comment?: string,
  ): Promise<MaterialRequestDto> {
    const request = await this.findRequest(requestId, organizationId);

    this.validateTransition(request.status, MaterialRequestStatus.COMPLETED);

    const fromStatus = request.status;
    request.status = MaterialRequestStatus.COMPLETED;
    request.completedAt = new Date();

    await this.requestRepo.save(request);
    await this.recordHistory(request.id, userId, fromStatus, request.status, comment);

    this.eventEmitter.emit('material-request.completed', {
      requestId: request.id,
      requestNumber: request.requestNumber,
      organizationId,
    });

    return this.mapToDto(request);
  }

  /**
   * Отменить заявку
   */
  async cancelRequest(
    requestId: string,
    userId: string,
    organizationId: string,
    dto: CancelRequestDto,
  ): Promise<MaterialRequestDto> {
    const request = await this.findRequest(requestId, organizationId);

    this.validateTransition(request.status, MaterialRequestStatus.CANCELLED);

    const fromStatus = request.status;
    request.status = MaterialRequestStatus.CANCELLED;
    request.cancelledAt = new Date();
    request.cancellationReason = dto.reason;

    await this.requestRepo.save(request);
    await this.recordHistory(request.id, userId, fromStatus, request.status, dto.reason);

    this.eventEmitter.emit('material-request.cancelled', {
      requestId: request.id,
      requestNumber: request.requestNumber,
      reason: dto.reason,
      organizationId,
    });

    return this.mapToDto(request);
  }

  /**
   * Вернуть в черновик (после отклонения)
   */
  async returnToDraft(
    requestId: string,
    userId: string,
    organizationId: string,
    comment?: string,
  ): Promise<MaterialRequestDto> {
    const request = await this.findRequest(requestId, organizationId);

    this.validateTransition(request.status, MaterialRequestStatus.DRAFT);

    const fromStatus = request.status;
    request.status = MaterialRequestStatus.DRAFT;
    request.rejectedBy = undefined as any;
    request.rejectedAt = undefined as any;
    request.rejectionReason = undefined as any;

    await this.requestRepo.save(request);
    await this.recordHistory(request.id, userId, fromStatus, request.status, comment);

    return this.mapToDto(request);
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Получить заявку по ID
   */
  async getRequest(requestId: string, organizationId: string): Promise<MaterialRequestDto> {
    const request = await this.findRequest(requestId, organizationId);
    return this.mapToDto(request);
  }

  /**
   * Получить список заявок
   */
  async getRequests(
    organizationId: string,
    filter: MaterialRequestFilterDto,
  ): Promise<MaterialRequestListDto> {
    const { status, priority, requesterId, supplierId, fromDate, toDate, search, page = 1, limit = 20 } = filter;

    const qb = this.requestRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.items', 'items')
      .leftJoinAndSelect('r.requester', 'requester')
      .leftJoinAndSelect('r.approver', 'approver')
      .where('r.organizationId = :organizationId', { organizationId });

    if (status) {
      qb.andWhere('r.status = :status', { status });
    }

    if (priority) {
      qb.andWhere('r.priority = :priority', { priority });
    }

    if (requesterId) {
      qb.andWhere('r.requesterId = :requesterId', { requesterId });
    }

    if (supplierId) {
      qb.andWhere('r.supplierId = :supplierId', { supplierId });
    }

    if (fromDate) {
      qb.andWhere('r.createdAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      qb.andWhere('r.createdAt <= :toDate', { toDate });
    }

    if (search) {
      qb.andWhere('(r.requestNumber ILIKE :search OR r.notes ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await qb
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(r => this.mapToDto(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получить заявки, ожидающие утверждения
   */
  async getPendingApprovals(organizationId: string): Promise<MaterialRequestDto[]> {
    const requests = await this.requestRepo.find({
      where: { organizationId, status: MaterialRequestStatus.NEW },
      relations: ['items', 'requester'],
      order: { created_at: 'ASC' },
    });

    return requests.map(r => this.mapToDto(r));
  }

  /**
   * Получить историю заявки
   */
  async getRequestHistory(
    requestId: string,
    organizationId: string,
  ): Promise<MaterialRequestHistory[]> {
    await this.findRequest(requestId, organizationId); // Validate access

    return this.historyRepo.find({
      where: { requestId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Получить статистику
   */
  async getStats(organizationId: string): Promise<MaterialRequestStatsDto> {
    const requests = await this.requestRepo.find({ where: { organizationId } });

    const stats: MaterialRequestStatsDto = {
      totalRequests: requests.length,
      draftCount: 0,
      pendingApprovalCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      completedCount: 0,
      totalAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
    };

    for (const request of requests) {
      switch (request.status) {
        case MaterialRequestStatus.DRAFT:
          stats.draftCount++;
          break;
        case MaterialRequestStatus.NEW:
          stats.pendingApprovalCount++;
          break;
        case MaterialRequestStatus.APPROVED:
        case MaterialRequestStatus.SENT:
        case MaterialRequestStatus.PENDING_PAYMENT:
        case MaterialRequestStatus.PARTIALLY_PAID:
        case MaterialRequestStatus.PAID:
        case MaterialRequestStatus.DELIVERED:
          stats.approvedCount++;
          break;
        case MaterialRequestStatus.REJECTED:
          stats.rejectedCount++;
          break;
        case MaterialRequestStatus.COMPLETED:
          stats.completedCount++;
          break;
      }

      stats.totalAmount += Number(request.totalAmount);
      stats.paidAmount += Number(request.paidAmount);
    }

    stats.unpaidAmount = stats.totalAmount - stats.paidAmount;

    return stats;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async findRequest(
    requestId: string,
    organizationId: string,
  ): Promise<MaterialRequest> {
    const request = await this.requestRepo.findOne({
      where: { id: requestId, organizationId },
      relations: ['items', 'requester', 'approver'],
    });

    if (!request) {
      throw new NotFoundException('Material request not found');
    }

    return request;
  }

  private validateTransition(
    currentStatus: MaterialRequestStatus,
    targetStatus: MaterialRequestStatus,
  ): void {
    const allowedTransitions = WORKFLOW_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${targetStatus}`,
      );
    }
  }

  private async recordHistory(
    requestId: string,
    userId: string,
    fromStatus: MaterialRequestStatus,
    toStatus: MaterialRequestStatus,
    comment?: string,
  ): Promise<void> {
    const history = this.historyRepo.create({
      requestId,
      userId,
      fromStatus,
      toStatus,
      comment,
    });
    await this.historyRepo.save(history);
  }

  private async generateRequestNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.requestRepo.count({
      where: { organizationId },
    });
    return `MR-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private mapToDto(request: MaterialRequest): MaterialRequestDto {
    return {
      id: request.id,
      organizationId: request.organizationId,
      requestNumber: request.requestNumber,
      requesterId: request.requesterId,
      requesterName: request.requester
        ? `${request.requester.firstName} ${request.requester.lastName}`
        : undefined,
      status: request.status,
      priority: request.priority,
      supplierId: request.supplierId,
      notes: request.notes,
      totalAmount: Number(request.totalAmount),
      paidAmount: Number(request.paidAmount),
      approvedBy: request.approvedBy,
      approverName: request.approver
        ? `${request.approver.firstName} ${request.approver.lastName}`
        : undefined,
      approvedAt: request.approvedAt,
      rejectionReason: request.rejectionReason,
      rejectedBy: request.rejectedBy,
      cancellationReason: request.cancellationReason,
      submittedAt: request.submittedAt,
      sentAt: request.sentAt,
      deliveredAt: request.deliveredAt,
      completedAt: request.completedAt,
      cancelledAt: request.cancelledAt,
      items: (request.items || []).map(item => this.mapItemToDto(item)),
      createdAt: request.created_at,
      updatedAt: request.updated_at,
    };
  }

  private mapItemToDto(item: MaterialRequestItem): MaterialRequestItemDto {
    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      deliveredQuantity: item.deliveredQuantity,
      notes: item.notes,
      createdAt: item.created_at,
    };
  }
}
