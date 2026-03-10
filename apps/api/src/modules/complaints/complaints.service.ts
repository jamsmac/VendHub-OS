/**
 * Complaints Service — Facade
 * Delegates to ComplaintsCoreService, ComplaintsRefundService, ComplaintsAnalyticsService
 */

import { Injectable } from "@nestjs/common";
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
import { ComplaintsCoreService } from "./complaints-core.service";
import { ComplaintsRefundService } from "./complaints-refund.service";
import { ComplaintsAnalyticsService } from "./complaints-analytics.service";
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
  constructor(
    private readonly core: ComplaintsCoreService,
    private readonly refund: ComplaintsRefundService,
    private readonly analytics: ComplaintsAnalyticsService,
  ) {}

  // ── Core CRUD ──────────────────────────────────────────

  create(dto: CreateComplaintDto): Promise<Complaint> {
    return this.core.create(dto);
  }

  findById(id: string): Promise<Complaint> {
    return this.core.findById(id);
  }

  findByNumber(ticketNumber: string): Promise<Complaint> {
    return this.core.findByNumber(ticketNumber);
  }

  query(query: QueryComplaintsDto) {
    return this.core.query(query);
  }

  update(
    id: string,
    dto: UpdateComplaintDto,
    performedById: string,
  ): Promise<Complaint> {
    return this.core.update(id, dto, performedById);
  }

  assign(
    id: string,
    assignedToId: string,
    performedById: string,
  ): Promise<Complaint> {
    return this.core.assign(id, assignedToId, performedById);
  }

  resolve(
    id: string,
    resolution: string,
    performedById: string,
  ): Promise<Complaint> {
    return this.core.resolve(id, resolution, performedById);
  }

  escalate(
    id: string,
    reason: string,
    performedById: string,
  ): Promise<Complaint> {
    return this.core.escalate(id, reason, performedById);
  }

  reject(
    id: string,
    reason: string,
    performedById: string,
  ): Promise<Complaint> {
    return this.core.reject(id, reason, performedById);
  }

  getNewComplaints(organizationId: string): Promise<Complaint[]> {
    return this.core.getNewComplaints(organizationId);
  }

  findAll(organizationId: string, options?: { page?: number; limit?: number }) {
    return this.core.findAll(organizationId, options);
  }

  remove(id: string, userId: string): Promise<void> {
    return this.core.remove(id, userId);
  }

  bulkUpdate(
    ids: string[],
    data: {
      status?: ComplaintStatus;
      assignedToId?: string;
      priority?: ComplaintPriority;
    },
    userId: string,
  ): Promise<number> {
    return this.core.bulkUpdate(ids, data, userId);
  }

  findByAssignee(
    userId: string,
    includeResolved?: boolean,
  ): Promise<Complaint[]> {
    return this.core.findByAssignee(userId, includeResolved);
  }

  findByMachine(machineId: string, limit?: number): Promise<Complaint[]> {
    return this.core.findByMachine(machineId, limit);
  }

  // ── Comments & Feedback ────────────────────────────────

  addComment(dto: CreateCommentDto): Promise<ComplaintComment> {
    return this.core.addComment(dto);
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
  ): Promise<Complaint> {
    return this.core.submitFeedback(complaintId, rating, comment);
  }

  // ── Refunds ────────────────────────────────────────────

  createRefund(dto: CreateRefundDto): Promise<ComplaintRefund> {
    return this.refund.createRefund(dto);
  }

  approveRefund(
    refundId: string,
    approvedById: string,
  ): Promise<ComplaintRefund> {
    return this.refund.approveRefund(refundId, approvedById);
  }

  processRefund(
    refundId: string,
    processedById: string,
    referenceNumber?: string,
  ): Promise<ComplaintRefund> {
    return this.refund.processRefund(refundId, processedById, referenceNumber);
  }

  rejectRefund(
    refundId: string,
    rejectedById: string,
    reason: string,
  ): Promise<ComplaintRefund> {
    return this.refund.rejectRefund(refundId, rejectedById, reason);
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

  getQrCodesForMachine(machineId: string): Promise<ComplaintQrCode[]> {
    return this.analytics.getQrCodesForMachine(machineId);
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

  // ── Public Complaint ───────────────────────────────────

  createPublicComplaint(
    dto: CreateComplaintDto,
  ): Promise<PublicComplaintRecord> {
    return this.analytics.createPublicComplaint(dto);
  }
}
