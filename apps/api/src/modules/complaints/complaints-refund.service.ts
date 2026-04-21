/**
 * Complaints Refund Service
 * Refund workflow: create, approve, process, reject
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsWhere } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Complaint,
  ComplaintRefund,
  ComplaintAction,
  ComplaintActionType,
  ComplaintRefundStatus,
} from "./entities/complaint.entity";
import { CreateRefundDto } from "./complaints.types";

@Injectable()
export class ComplaintsRefundService {
  constructor(
    @InjectRepository(Complaint)
    private complaintRepo: Repository<Complaint>,
    @InjectRepository(ComplaintRefund)
    private refundRepo: Repository<ComplaintRefund>,
    @InjectRepository(ComplaintAction)
    private actionRepo: Repository<ComplaintAction>,
    private eventEmitter: EventEmitter2,
  ) {}

  async createRefund(dto: CreateRefundDto): Promise<ComplaintRefund> {
    const complaint = await this.findComplaint(dto.complaintId);

    const refund = this.refundRepo.create({
      complaintId: dto.complaintId,
      organizationId: complaint.organizationId,
      originalTransactionId: dto.transactionId,
      amount: dto.amount,
      currency: dto.currency || "UZS",
      refundMethod: dto.method,
      reason: dto.reason,
      refundDetails: dto.bankDetails,
      status: ComplaintRefundStatus.PENDING,
      createdById: dto.requestedById,
    } as Partial<ComplaintRefund>);

    const saved = await this.refundRepo.save(refund);

    await this.logAction(
      dto.complaintId,
      dto.requestedById || null,
      "refund_requested",
      `Запрошен возврат ${dto.amount} ${saved.currency}`,
    );

    this.eventEmitter.emit("complaint.refund.requested", {
      complaint,
      refund: saved,
    });

    return saved;
  }

  async approveRefund(
    refundId: string,
    approvedById: string,
    organizationId?: string,
  ): Promise<ComplaintRefund> {
    const where: FindOptionsWhere<ComplaintRefund> = { id: refundId };
    if (organizationId) where.organizationId = organizationId;
    const refund = await this.refundRepo.findOne({ where });
    if (!refund) {
      throw new NotFoundException(`Возврат ${refundId} не найден`);
    }

    if (refund.status !== ComplaintRefundStatus.PENDING) {
      throw new BadRequestException("Возврат уже обработан");
    }

    refund.status = ComplaintRefundStatus.APPROVED;
    refund.approvedById = approvedById;

    const saved = await this.refundRepo.save(refund);
    this.eventEmitter.emit("complaint.refund.approved", { refund: saved });
    return saved;
  }

  async processRefund(
    refundId: string,
    processedById: string,
    referenceNumber?: string,
    organizationId?: string,
  ): Promise<ComplaintRefund> {
    const where: FindOptionsWhere<ComplaintRefund> = { id: refundId };
    if (organizationId) where.organizationId = organizationId;
    const refund = await this.refundRepo.findOne({ where });
    if (!refund) {
      throw new NotFoundException(`Возврат ${refundId} не найден`);
    }

    if (refund.status !== ComplaintRefundStatus.APPROVED) {
      throw new BadRequestException("Возврат должен быть сначала одобрен");
    }

    refund.status = ComplaintRefundStatus.COMPLETED;
    refund.processedAt = new Date();
    refund.completedAt = new Date();
    if (referenceNumber) {
      refund.externalRefundId = referenceNumber;
    }

    const saved = await this.refundRepo.save(refund);

    await this.logAction(
      refund.complaintId,
      processedById,
      "refund_completed",
      `Возврат выполнен: ${refund.amount} ${refund.currency}`,
    );

    this.eventEmitter.emit("complaint.refund.completed", { refund: saved });
    return saved;
  }

  async rejectRefund(
    refundId: string,
    _rejectedById: string,
    reason: string,
    organizationId?: string,
  ): Promise<ComplaintRefund> {
    const where: FindOptionsWhere<ComplaintRefund> = { id: refundId };
    if (organizationId) where.organizationId = organizationId;
    const refund = await this.refundRepo.findOne({ where });
    if (!refund) {
      throw new NotFoundException(`Возврат ${refundId} не найден`);
    }

    refund.status = ComplaintRefundStatus.REJECTED;
    refund.rejectionReason = reason;

    return this.refundRepo.save(refund);
  }

  // ── Private helpers ──────────────────────────────────────────

  private async findComplaint(id: string): Promise<Complaint> {
    const complaint = await this.complaintRepo.findOne({
      where: { id },
      relations: ["refunds"],
    });
    if (!complaint) {
      throw new NotFoundException(`Жалоба ${id} не найдена`);
    }
    return complaint;
  }

  private async logAction(
    complaintId: string,
    performedById: string | null,
    actionType: string,
    description: string,
  ): Promise<void> {
    const actionTypeMap: Record<string, ComplaintActionType> = {
      refund_requested: ComplaintActionType.REFUND_INITIATED,
      refund_completed: ComplaintActionType.REFUND_COMPLETED,
    };

    const action = this.actionRepo.create({
      complaintId,
      organizationId: "",
      ...(performedById !== undefined &&
        performedById !== null && { performedById }),
      performedByName: "",
      actionType:
        actionTypeMap[actionType] ?? ComplaintActionType.STATUS_CHANGED,
      description,
    });

    await this.actionRepo.save(action);
  }
}
