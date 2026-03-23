/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaymentReportRow } from "../entities/payment-report-row.entity";
import {
  PaymentReportUpload,
  ReportType,
  UploadStatus,
} from "../entities/payment-report-upload.entity";

export interface AnalyticsQueryDto {
  organizationId: string;
  dateFrom?: Date;
  dateTo?: Date;
  reportTypes?: ReportType[];
  groupBy?: "day" | "week" | "month";
}

@Injectable()
export class PaymentReportAnalyticsService {
  constructor(
    @InjectRepository(PaymentReportUpload)
    private readonly uploadRepo: Repository<PaymentReportUpload>,
    @InjectRepository(PaymentReportRow)
    private readonly rowRepo: Repository<PaymentReportRow>,
  ) {}

  // ─────────────────────────────────────────────
  // Динамика оборота по типам (для линейного графика)
  // ─────────────────────────────────────────────
  async getRevenueDynamics(dto: AnalyticsQueryDto) {
    const { dateFrom, dateTo, groupBy = "day" } = dto;

    const dateFormat = {
      day: "%Y-%m-%d",
      week: "%Y-%u",
      month: "%Y-%m",
    }[groupBy];

    const qb = this.rowRepo
      .createQueryBuilder("r")
      .innerJoin("r.upload", "u")
      .select(`DATE_FORMAT(r.payment_time, '${dateFormat}')`, "period")
      .addSelect("r.report_type", "reportType")
      .addSelect("SUM(r.amount)", "totalAmount")
      .addSelect("COUNT(*)", "count")
      .where("r.organization_id = :organizationId", {
        organizationId: dto.organizationId,
      })
      .andWhere("r.payment_time IS NOT NULL")
      .andWhere("r.is_duplicate = 0")
      .andWhere("u.status = :status", { status: UploadStatus.COMPLETED });

    if (dateFrom) qb.andWhere("r.payment_time >= :dateFrom", { dateFrom });
    if (dateTo) qb.andWhere("r.payment_time <= :dateTo", { dateTo });
    if (dto.reportTypes?.length) {
      qb.andWhere("r.report_type IN (:...types)", { types: dto.reportTypes });
    }

    qb.groupBy("period, r.report_type").orderBy("period", "ASC");

    const rows = await qb.getRawMany<{
      period: string;
      reportType: string;
      totalAmount: string;
      count: string;
    }>();

    // Pivot — превращаем в формат [{period, PAYME, CLICK, VENDHUB_ORDERS, ...}]
    const periodMap = new Map<string, Record<string, number>>();
    for (const r of rows) {
      if (!periodMap.has(r.period))
        periodMap.set(r.period, { period: r.period as any });
      periodMap.get(r.period)![r.reportType] = Number(r.totalAmount) || 0;
      periodMap.get(r.period)![r.reportType + "_count"] = Number(r.count) || 0;
    }

    return Array.from(periodMap.values()).sort((a, b) =>
      String(a.period).localeCompare(String(b.period)),
    );
  }

  // ─────────────────────────────────────────────
  // ТОП машин по обороту
  // ─────────────────────────────────────────────
  async getTopMachines(dto: AnalyticsQueryDto & { limit?: number }) {
    const { dateFrom, dateTo, limit = 20 } = dto;

    const qb = this.rowRepo
      .createQueryBuilder("r")
      .innerJoin("r.upload", "u")
      .select("r.machine_code", "machineCode")
      .addSelect("r.location", "location")
      .addSelect("SUM(r.amount)", "totalAmount")
      .addSelect("COUNT(*)", "count")
      .addSelect("AVG(r.amount)", "avgAmount")
      .where("r.organization_id = :organizationId", {
        organizationId: dto.organizationId,
      })
      .andWhere('r.machine_code IS NOT NULL AND r.machine_code != ""')
      .andWhere("r.is_duplicate = 0")
      .andWhere("u.status = :status", { status: UploadStatus.COMPLETED });

    if (dateFrom) qb.andWhere("r.payment_time >= :dateFrom", { dateFrom });
    if (dateTo) qb.andWhere("r.payment_time <= :dateTo", { dateTo });
    if (dto.reportTypes?.length) {
      qb.andWhere("r.report_type IN (:...types)", { types: dto.reportTypes });
    }

    qb.groupBy("r.machine_code, r.location")
      .orderBy("totalAmount", "DESC")
      .limit(limit);

    return qb.getRawMany<{
      machineCode: string;
      location: string;
      totalAmount: string;
      count: string;
      avgAmount: string;
    }>();
  }

  // ─────────────────────────────────────────────
  // Разбивка по методам оплаты (pie chart)
  // ─────────────────────────────────────────────
  async getPaymentMethodBreakdown(dto: AnalyticsQueryDto) {
    const { dateFrom, dateTo } = dto;

    const qb = this.rowRepo
      .createQueryBuilder("r")
      .innerJoin("r.upload", "u")
      .select("r.payment_method", "method")
      .addSelect("r.report_type", "reportType")
      .addSelect("SUM(r.amount)", "totalAmount")
      .addSelect("COUNT(*)", "count")
      .where("r.organization_id = :organizationId", {
        organizationId: dto.organizationId,
      })
      .andWhere('r.payment_method IS NOT NULL AND r.payment_method != ""')
      .andWhere("r.is_duplicate = 0")
      .andWhere("u.status = :status", { status: UploadStatus.COMPLETED });

    if (dateFrom) qb.andWhere("r.payment_time >= :dateFrom", { dateFrom });
    if (dateTo) qb.andWhere("r.payment_time <= :dateTo", { dateTo });
    if (dto.reportTypes?.length) {
      qb.andWhere("r.report_type IN (:...types)", { types: dto.reportTypes });
    }

    qb.groupBy("r.payment_method, r.report_type").orderBy(
      "totalAmount",
      "DESC",
    );

    return qb.getRawMany();
  }

  // ─────────────────────────────────────────────
  // Сравнение провайдеров за период (summary)
  // ─────────────────────────────────────────────
  async getProviderComparison(dto: AnalyticsQueryDto) {
    const { dateFrom, dateTo } = dto;

    const qb = this.rowRepo
      .createQueryBuilder("r")
      .innerJoin("r.upload", "u")
      .select("r.report_type", "reportType")
      .addSelect("SUM(r.amount)", "totalAmount")
      .addSelect("COUNT(*)", "count")
      .addSelect("AVG(r.amount)", "avgAmount")
      .addSelect("MIN(r.amount)", "minAmount")
      .addSelect("MAX(r.amount)", "maxAmount")
      .where("r.organization_id = :organizationId", {
        organizationId: dto.organizationId,
      })
      .andWhere("r.amount IS NOT NULL")
      .andWhere("r.is_duplicate = 0")
      .andWhere("u.status = :status", { status: UploadStatus.COMPLETED });

    if (dateFrom) qb.andWhere("r.payment_time >= :dateFrom", { dateFrom });
    if (dateTo) qb.andWhere("r.payment_time <= :dateTo", { dateTo });

    qb.groupBy("r.report_type").orderBy("totalAmount", "DESC");

    return qb.getRawMany();
  }

  // ─────────────────────────────────────────────
  // Тепловая карта: день недели × час
  // ─────────────────────────────────────────────
  async getHeatmap(dto: AnalyticsQueryDto) {
    const { dateFrom, dateTo } = dto;

    const qb = this.rowRepo
      .createQueryBuilder("r")
      .innerJoin("r.upload", "u")
      .select("DAYOFWEEK(r.payment_time)", "dow")
      .addSelect("HOUR(r.payment_time)", "hour")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(r.amount)", "totalAmount")
      .where("r.organization_id = :organizationId", {
        organizationId: dto.organizationId,
      })
      .andWhere("r.payment_time IS NOT NULL")
      .andWhere("r.is_duplicate = 0")
      .andWhere("u.status = :status", { status: UploadStatus.COMPLETED });

    if (dateFrom) qb.andWhere("r.payment_time >= :dateFrom", { dateFrom });
    if (dateTo) qb.andWhere("r.payment_time <= :dateTo", { dateTo });
    if (dto.reportTypes?.length) {
      qb.andWhere("r.report_type IN (:...types)", { types: dto.reportTypes });
    }

    qb.groupBy("dow, hour").orderBy("dow", "ASC").addOrderBy("hour", "ASC");

    return qb.getRawMany<{
      dow: string;
      hour: string;
      count: string;
      totalAmount: string;
    }>();
  }
}
