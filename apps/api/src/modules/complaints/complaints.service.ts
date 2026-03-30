/**
 * Complaints Service — Facade
 * Delegates to ComplaintsCoreService, ComplaintsRefundService, ComplaintsAnalyticsService
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Complaint,
  ComplaintComment,
  ComplaintRefund,
  ComplaintTemplate,
  ComplaintQrCode,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from "./entities/complaint.entity";
import { Organization } from "../organizations/entities/organization.entity";
import { ComplaintsCoreService } from "./complaints-core.service";
import { ComplaintsRefundService } from "./complaints-refund.service";
import { ComplaintsAnalyticsService } from "./complaints-analytics.service";
import {
  ComplaintSettingsResponseDto,
  UpdateComplaintSettingsDto,
} from "./dto/complaint-settings.dto";
import {
  CreateComplaintDto,
  UpdateComplaintDto,
  CreateCommentDto,
  CreateRefundDto,
  QueryComplaintsDto,
  ComplaintStatistics,
  PublicComplaintRecord,
} from "./complaints.types";

// Re-export DTOs for backwards compatibility
export {
  CreateComplaintDto,
  UpdateComplaintDto,
  CreateCommentDto,
  CreateRefundDto,
  QueryComplaintsDto,
  ComplaintStatistics,
  PublicComplaintQrLookup,
  PublicComplaintRecord,
  RefundMethod,
} from "./complaints.types";

@Injectable()
export class ComplaintsService {
  private static readonly DEFAULT_COMPLAINT_SETTINGS: ComplaintSettingsResponseDto =
    {
      sla: { critical: 2, high: 8, medium: 24, low: 72 },
      autoAssign: true,
      autoEscalate: true,
      notifications: {
        emailOnNew: true,
        emailOnEscalation: true,
        telegramOnNew: true,
        telegramOnSlaWarning: true,
        slaWarningPercentage: 80,
      },
    };

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    private readonly core: ComplaintsCoreService,
    private readonly refund: ComplaintsRefundService,
    private readonly analytics: ComplaintsAnalyticsService,
  ) {}

  // ── Core CRUD ──────────────────────────────────────────

  create(dto: CreateComplaintDto): Promise<Complaint> {
    return this.core.create(dto);
  }

  findById(id: string, organizationId?: string): Promise<Complaint> {
    return this.core.findById(id, organizationId);
  }

  findByNumber(ticketNumber: string, organizationId?: string): Promise<Complaint> {
    return this.core.findByNumber(ticketNumber, organizationId);
  }

  query(query: QueryComplaintsDto) {
    return this.core.query(query);
  }

  update(
    id: string,
    dto: UpdateComplaintDto,
    performedById: string,
    organizationId?: string,
  ): Promise<Complaint> {
    return this.core.update(id, dto, performedById, organizationId);
  }

  assign(
    id: string,
    assignedToId: string,
    performedById: string,
    organizationId?: string,
  ): Promise<Complaint> {
    return this.core.assign(id, assignedToId, performedById, organizationId);
  }

  resolve(
    id: string,
    resolution: string,
    performedById: string,
    organizationId?: string,
  ): Promise<Complaint> {
    return this.core.resolve(id, resolution, performedById, organizationId);
  }

  escalate(
    id: string,
    reason: string,
    performedById: string,
    organizationId?: string,
  ): Promise<Complaint> {
    return this.core.escalate(id, reason, performedById, organizationId);
  }

  reject(
    id: string,
    reason: string,
    performedById: string,
    organizationId?: string,
  ): Promise<Complaint> {
    return this.core.reject(id, reason, performedById, organizationId);
  }

  getNewComplaints(organizationId: string): Promise<Complaint[]> {
    return this.core.getNewComplaints(organizationId);
  }

  findAll(organizationId: string, options?: { page?: number; limit?: number }) {
    return this.core.findAll(organizationId, options);
  }

  remove(id: string, userId: string, organizationId?: string): Promise<void> {
    return this.core.remove(id, userId, organizationId);
  }

  bulkUpdate(
    ids: string[],
    data: {
      status?: ComplaintStatus;
      assignedToId?: string;
      priority?: ComplaintPriority;
    },
    userId: string,
    organizationId?: string,
  ): Promise<number> {
    return this.core.bulkUpdate(ids, data, userId, organizationId);
  }

  findByAssignee(
    userId: string,
    includeResolved?: boolean,
    organizationId?: string,
  ): Promise<Complaint[]> {
    return this.core.findByAssignee(userId, includeResolved, organizationId);
  }

  findByMachine(
    machineId: string,
    limit?: number,
    organizationId?: string,
  ): Promise<Complaint[]> {
    return this.core.findByMachine(machineId, limit, organizationId);
  }

  // ── Comments & Feedback ────────────────────────────────

  addComment(dto: CreateCommentDto, organizationId?: string): Promise<ComplaintComment> {
    return this.core.addComment(dto, organizationId);
  }

  getComments(
    complaintId: string,
    includeInternal?: boolean,
  ): Promise<ComplaintComment[]> {
    return this.core.getComments(complaintId, includeInternal);
  }

  submitFeedback(
    complaintId: string,
    rating: number,
    comment?: string,
    organizationId?: string,
  ): Promise<Complaint> {
    return this.core.submitFeedback(complaintId, rating, comment, organizationId);
  }

  // ── Refunds ────────────────────────────────────────────

  createRefund(dto: CreateRefundDto): Promise<ComplaintRefund> {
    return this.refund.createRefund(dto);
  }

  approveRefund(
    refundId: string,
    approvedById: string,
    organizationId?: string,
  ): Promise<ComplaintRefund> {
    return this.refund.approveRefund(refundId, approvedById, organizationId);
  }

  processRefund(
    refundId: string,
    processedById: string,
    referenceNumber?: string,
    organizationId?: string,
  ): Promise<ComplaintRefund> {
    return this.refund.processRefund(
      refundId,
      processedById,
      referenceNumber,
      organizationId,
    );
  }

  rejectRefund(
    refundId: string,
    rejectedById: string,
    reason: string,
    organizationId?: string,
  ): Promise<ComplaintRefund> {
    return this.refund.rejectRefund(refundId, rejectedById, reason, organizationId);
  }

  // ── QR Codes ───────────────────────────────────────────

  generateQrCode(
    organizationId: string,
    machineId: string,
  ): Promise<ComplaintQrCode> {
    return this.analytics.generateQrCode(organizationId, machineId);
  }

  getQrCodeByCode(code: string): Promise<ComplaintQrCode> {
    return this.analytics.getQrCodeByCode(code);
  }

  getMachineContext(machineId: string) {
    return this.analytics.getMachineContext(machineId);
  }

  getQrCodesForMachine(
    machineId: string,
    organizationId?: string,
  ): Promise<ComplaintQrCode[]> {
    return this.analytics.getQrCodesForMachine(machineId, organizationId);
  }

  // ── Templates ──────────────────────────────────────────

  getTemplates(organizationId: string): Promise<ComplaintTemplate[]> {
    return this.analytics.getTemplates(organizationId);
  }

  getTemplateByCategory(
    organizationId: string,
    category: ComplaintCategory,
  ): Promise<ComplaintTemplate | null> {
    return this.analytics.getTemplateByCategory(organizationId, category);
  }

  // ── SLA & Statistics ───────────────────────────────────

  checkSlaBreaches(): Promise<number> {
    return this.analytics.checkSlaBreaches();
  }

  getStatistics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<ComplaintStatistics> {
    return this.analytics.getStatistics(organizationId, dateFrom, dateTo);
  }

  getOpenCountsByPriority(
    organizationId: string,
  ): Promise<Record<string, number>> {
    return this.analytics.getOpenCountsByPriority(organizationId);
  }

  getSlaAtRisk(organizationId: string): Promise<Complaint[]> {
    return this.analytics.getSlaAtRisk(organizationId);
  }

  // ── Complaint Settings ─────────────────────────────────

  async getComplaintSettings(
    organizationId: string,
  ): Promise<ComplaintSettingsResponseDto> {
    const org = await this.organizationRepo.findOne({
      where: { id: organizationId },
      select: ["id", "settings"],
    });
    if (!org) throw new NotFoundException("Organization not found");

    const stored = (org.settings as Record<string, unknown>)
      ?.complaintSettings as Partial<ComplaintSettingsResponseDto> | undefined;

    return {
      ...ComplaintsService.DEFAULT_COMPLAINT_SETTINGS,
      ...stored,
      sla: {
        ...ComplaintsService.DEFAULT_COMPLAINT_SETTINGS.sla,
        ...(stored?.sla ?? {}),
      },
      notifications: {
        ...ComplaintsService.DEFAULT_COMPLAINT_SETTINGS.notifications,
        ...(stored?.notifications ?? {}),
      },
    };
  }

  async updateComplaintSettings(
    organizationId: string,
    dto: UpdateComplaintSettingsDto,
  ): Promise<ComplaintSettingsResponseDto> {
    const org = await this.organizationRepo.findOne({
      where: { id: organizationId },
    });
    if (!org) throw new NotFoundException("Organization not found");

    const currentSettings = (org.settings ?? {}) as Record<string, unknown>;
    const current = (currentSettings.complaintSettings ?? {}) as Record<
      string,
      unknown
    >;

    const merged = {
      ...current,
      ...(dto.sla !== undefined ? { sla: dto.sla } : {}),
      ...(dto.autoAssign !== undefined
        ? { autoAssign: dto.autoAssign }
        : {}),
      ...(dto.autoEscalate !== undefined
        ? { autoEscalate: dto.autoEscalate }
        : {}),
      ...(dto.notifications !== undefined
        ? {
            notifications: {
              ...(current.notifications ?? {}),
              ...dto.notifications,
            },
          }
        : {}),
    };

    // Use query builder for JSONB partial update to avoid TypeORM type conflicts
    await this.organizationRepo
      .createQueryBuilder()
      .update()
      .set({
        settings: () =>
          `settings || '${JSON.stringify({ complaintSettings: merged }).replace(/'/g, "''")}'::jsonb`,
      })
      .where("id = :id", { id: org.id })
      .execute();

    return this.getComplaintSettings(organizationId);
  }

  // ── Public Complaint ───────────────────────────────────

  createPublicComplaint(
    dto: CreateComplaintDto,
  ): Promise<PublicComplaintRecord> {
    return this.analytics.createPublicComplaint(dto);
  }
}
