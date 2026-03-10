/**
 * Shared types for Complaints module sub-services
 */

import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintSource,
  ComplaintStatus,
} from "./entities/complaint.entity";

// Refund method type
export type RefundMethod =
  | "original_payment"
  | "bank_transfer"
  | "cash"
  | "credit";

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
  bankDetails?: Record<string, unknown>;
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
  sortOrder?: "ASC" | "DESC";
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

export interface PublicComplaintQrLookup {
  id: string;
  organizationId: string;
  machineId: string;
  code: string;
  url: string | null;
  isActive: boolean;
  scanCount: number;
  lastScannedAt: Date | null;
}

export interface PublicComplaintRecord {
  id: string;
  ticketNumber: string;
  organizationId: string;
  machineId: string | null;
  source: ComplaintSource;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  subject: string;
  description: string;
  customer: Record<string, unknown> | null;
  machineInfo: Record<string, unknown> | null;
  attachments: Array<{
    id: string;
    type: "image" | "video" | "audio" | "document";
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    thumbnailUrl?: string;
    uploadedAt: Date;
    uploadedBy?: string;
  }>;
  resolutionDeadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
