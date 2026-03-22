/**
 * Complaints Analytics Service
 * QR codes, templates, SLA monitoring, statistics, and public complaint creation
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, Between, LessThan, IsNull } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Complaint,
  ComplaintTemplate,
  ComplaintQrCode,
  ComplaintStatus,
  ComplaintPriority,
  ComplaintCategory,
  DEFAULT_SLA_CONFIG,
} from "./entities/complaint.entity";
import {
  CreateComplaintDto,
  ComplaintStatistics,
  PublicComplaintQrLookup,
  PublicComplaintRecord,
} from "./complaints.types";

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
export class ComplaintsAnalyticsService {
  private readonly logger = new Logger(ComplaintsAnalyticsService.name);

  constructor(
    @InjectRepository(Complaint)
    private complaintRepo: Repository<Complaint>,
    @InjectRepository(ComplaintQrCode)
    private qrCodeRepo: Repository<ComplaintQrCode>,
    @InjectRepository(ComplaintTemplate)
    private templateRepo: Repository<ComplaintTemplate>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ============================================================================
  // QR CODES
  // ============================================================================

  async generateQrCode(
    organizationId: string,
    machineId: string,
  ): Promise<ComplaintQrCode> {
    const code = this.generateRandomCode(8);
    const baseUrl = process.env.CLIENT_URL || "https://vendhub.uz";
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
    const qrCodeRows = (await this.complaintRepo.manager
      .query(
        `
          SELECT
            id,
            organization_id AS "organizationId",
            machine_id AS "machineId",
            code,
            url,
            is_active AS "isActive",
            scan_count AS "scanCount",
            last_scanned_at AS "lastScannedAt"
          FROM complaint_qr_codes
          WHERE code = $1
            AND is_active = true
          LIMIT 1
        `,
        [code],
      )
      .catch((error: unknown) => {
        if (this.isMissingRelationError(error)) {
          return [];
        }
        throw error;
      })) as PublicComplaintQrLookup[];

    if (qrCodeRows[0]) {
      return qrCodeRows[0] as ComplaintQrCode;
    }

    const machineRows = (await this.complaintRepo.manager.query(
      `
        SELECT
          id,
          organization_id AS "organizationId",
          id AS "machineId",
          COALESCE(NULLIF(split_part(qr_code_complaint, '/c/', 2), ''), code, $1) AS code,
          qr_code_complaint AS url,
          true AS "isActive",
          0 AS "scanCount",
          NULL::timestamp AS "lastScannedAt"
        FROM machines
        WHERE deleted_at IS NULL
          AND (
            code = $1
            OR qr_code_complaint = $1
            OR split_part(qr_code_complaint, '/c/', 2) = $1
          )
        LIMIT 1
      `,
      [code],
    )) as PublicComplaintQrLookup[];

    const machineQr = machineRows[0];
    if (!machineQr) {
      throw new NotFoundException("QR-код не найден или неактивен");
    }

    return machineQr as ComplaintQrCode;
  }

  async getMachineContext(machineId: string): Promise<{
    id: string;
    organizationId: string;
    name: string | null;
    machineNumber: string | null;
    address: string | null;
  }> {
    const rows = (await this.complaintRepo.manager.query(
      `
        SELECT
          id,
          organization_id AS "organizationId",
          name,
          code AS "machineNumber",
          NULL::text AS address
        FROM machines
        WHERE id = $1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [machineId],
    )) as Array<{
      id: string;
      organizationId: string;
      name: string | null;
      machineNumber: string | null;
      address: string | null;
    }>;

    const machine = rows[0];
    if (!machine) {
      throw new NotFoundException("Machine not found");
    }

    return machine;
  }

  async getQrCodesForMachine(machineId: string): Promise<ComplaintQrCode[]> {
    return this.qrCodeRepo.find({
      where: { machineId },
      order: { createdAt: "DESC" },
    });
  }

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  async getTemplates(organizationId: string): Promise<ComplaintTemplate[]> {
    return this.templateRepo.find({
      where: [
        { organizationId, isActive: true },
        { organizationId: IsNull(), isActive: true },
      ],
      order: { category: "ASC", name: "ASC" },
    });
  }

  async getTemplateByCategory(
    organizationId: string,
    category: ComplaintCategory,
  ): Promise<ComplaintTemplate | null> {
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
        status: In([
          ComplaintStatus.NEW,
          ComplaintStatus.IN_PROGRESS,
          ComplaintStatus.AWAITING_CUSTOMER,
        ]),
        isSlaBreached: false,
        resolutionDeadline: LessThan(new Date()),
      },
      { isSlaBreached: true },
    );

    if (result.affected && result.affected > 0) {
      this.logger.warn(`${result.affected} жалоб превысили SLA`);

      const breached = await this.complaintRepo.find({
        where: {
          isSlaBreached: true,
          status: In([ComplaintStatus.NEW, ComplaintStatus.IN_PROGRESS]),
        },
      });

      for (const complaint of breached) {
        this.eventEmitter.emit("complaint.sla.breached", complaint);
      }
    }

    return result.affected || 0;
  }

  async getStatistics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<ComplaintStatistics> {
    const complaints = await this.complaintRepo.find({
      where: { organizationId, createdAt: Between(dateFrom, dateTo) },
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
        totalResolutionTime += c.resolvedAt.getTime() - c.createdAt.getTime();
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
      averageResolutionTime:
        resolvedCount > 0
          ? totalResolutionTime / resolvedCount / (1000 * 60 * 60)
          : 0,
      satisfactionAverage: ratedCount > 0 ? totalSatisfaction / ratedCount : 0,
    };
  }

  async getOpenCountsByPriority(
    organizationId: string,
  ): Promise<Record<string, number>> {
    const result = await this.complaintRepo
      .createQueryBuilder("c")
      .select("c.priority", "priority")
      .addSelect("COUNT(*)", "count")
      .where("c.organizationId = :organizationId", { organizationId })
      .andWhere("c.status IN (:...statuses)", {
        statuses: [
          ComplaintStatus.NEW,
          ComplaintStatus.IN_PROGRESS,
          ComplaintStatus.AWAITING_CUSTOMER,
        ],
      })
      .groupBy("c.priority")
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

  async getSlaAtRisk(organizationId: string): Promise<Complaint[]> {
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);

    return this.complaintRepo.find({
      where: {
        organizationId,
        status: In([ComplaintStatus.NEW, ComplaintStatus.IN_PROGRESS]),
        isSlaBreached: false,
        resolutionDeadline: LessThan(twoHoursFromNow),
      },
      order: { resolutionDeadline: "ASC" },
    });
  }

  // ============================================================================
  // PUBLIC COMPLAINT CREATION
  // ============================================================================

  async createPublicComplaint(
    dto: CreateComplaintDto,
  ): Promise<PublicComplaintRecord> {
    const priority = dto.priority || ComplaintPriority.MEDIUM;
    const resolutionDeadline = new Date(
      Date.now() + (DEFAULT_SLA_HOURS[priority] ?? 24) * 60 * 60 * 1000,
    );
    const customer = this.buildCustomerPayload(dto);
    const machineContext = dto.machineId
      ? await this.getMachineContext(dto.machineId).catch((err) => {
          this.logger.warn(
            `Failed to load machine context for complaint (machineId=${dto.machineId}): ${err instanceof Error ? err.message : err}`,
          );
          return null;
        })
      : null;
    const machineInfo = machineContext
      ? {
          machineId: machineContext.id,
          machineCode: machineContext.machineNumber,
          machineName: machineContext.name,
          locationAddress: machineContext.address,
        }
      : null;
    const attachments = (dto.attachments || []).map((url) => ({
      id: "",
      type: "image" as const,
      url,
      filename: "",
      size: 0,
      mimeType: "",
      uploadedAt: new Date(),
    }));

    let complaint: PublicComplaintRecord | undefined;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const ticketNumber = await this.generatePublicComplaintNumber(
        dto.organizationId,
      );

      try {
        const rows = (await this.complaintRepo.manager.query(
          `
            INSERT INTO complaints (
              organization_id,
              ticket_number,
              source,
              category,
              priority,
              status,
              subject,
              description,
              customer,
              machine_id,
              machine_info,
              attachments,
              resolution_deadline,
              is_sla_breached,
              metadata
            )
            VALUES (
              $1::uuid,
              $2,
              $3,
              $4::complaint_category_enum,
              $5::complaint_priority_enum,
              $6::complaint_status_enum,
              $7,
              $8,
              $9::jsonb,
              $10::uuid,
              $11::jsonb,
              $12::jsonb,
              $13::timestamp,
              false,
              $14::jsonb
            )
            RETURNING
              id,
              ticket_number AS "ticketNumber",
              organization_id AS "organizationId",
              machine_id AS "machineId",
              source,
              category,
              priority,
              status,
              subject,
              description,
              customer,
              machine_info AS "machineInfo",
              attachments,
              resolution_deadline AS "resolutionDeadline",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
          `,
          [
            dto.organizationId,
            ticketNumber,
            dto.source,
            dto.category,
            priority,
            ComplaintStatus.NEW,
            dto.subject,
            dto.description,
            customer ? JSON.stringify(customer) : null,
            dto.machineId || null,
            machineInfo ? JSON.stringify(machineInfo) : null,
            JSON.stringify(attachments),
            resolutionDeadline,
            JSON.stringify({
              publicSubmission: true,
              qrCodeId: dto.qrCodeId || null,
            }),
          ],
        )) as PublicComplaintRecord[];

        complaint = rows[0];
        if (complaint) break;
      } catch (error) {
        if (this.isUniqueViolationError(error)) continue;
        throw error;
      }
    }

    if (!complaint) {
      throw new BadRequestException("Failed to create complaint");
    }

    try {
      this.eventEmitter.emit("complaint.created", complaint);
    } catch (error) {
      this.logger.warn(
        `Public complaint created without event delivery: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }

    return complaint;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private buildCustomerPayload(dto: CreateComplaintDto) {
    const customer = {
      name: dto.customerName,
      phone: dto.customerPhone,
      email: dto.customerEmail,
      telegramId: dto.customerTelegramId,
    };
    return Object.values(customer).some((value) => value) ? customer : null;
  }

  private async generatePublicComplaintNumber(
    organizationId: string,
  ): Promise<string> {
    const date = new Date();
    const prefix = `CMP-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
    const rows = (await this.complaintRepo.manager.query(
      `
        SELECT ticket_number AS "ticketNumber"
        FROM complaints
        WHERE organization_id = $1::uuid
          AND ticket_number IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [organizationId],
    )) as Array<{ ticketNumber: string | null }>;

    let sequence = 1;
    const lastTicketNumber = rows[0]?.ticketNumber;
    if (lastTicketNumber) {
      const match = lastTicketNumber.match(/(\d+)$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}-${String(sequence).padStart(5, "0")}`;
  }

  private generateRandomCode(length: number): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private isMissingRelationError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      ("code" in error ? (error as { code?: string }).code === "42P01" : false)
    );
  }

  private isUniqueViolationError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      ("code" in error ? (error as { code?: string }).code === "23505" : false)
    );
  }
}
