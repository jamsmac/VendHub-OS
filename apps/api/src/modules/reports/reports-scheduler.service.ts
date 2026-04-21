/**
 * Reports Scheduler Service
 * Scheduled reports CRUD and cron processing
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  ScheduledReport,
  ExportFormat,
  ReportFrequency,
} from "./entities/report.entity";
import { ReportsGeneratorService } from "./reports-generator.service";

type ReportFormat = ExportFormat;
type ScheduleFrequency = ReportFrequency;

export interface CreateScheduledReportDto {
  organizationId: string;
  reportDefinitionId: string;
  name: string;
  frequency: ScheduleFrequency;
  scheduleConfig: {
    time?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    timezone?: string;
  };
  parameters: Record<string, unknown>;
  format: ReportFormat;
  deliveryMethod: "email" | "telegram" | "webhook";
  deliveryConfig: {
    emails?: string[];
    telegramChatIds?: string[];
    webhookUrl?: string;
  };
}

@Injectable()
export class ReportsSchedulerService {
  private readonly logger = new Logger(ReportsSchedulerService.name);

  constructor(
    @InjectRepository(ScheduledReport)
    private scheduledRepo: Repository<ScheduledReport>,
    private readonly generator: ReportsGeneratorService,
  ) {}

  async createScheduledReport(
    dto: CreateScheduledReportDto,
    createdById: string,
  ): Promise<ScheduledReport> {
    const nextRunAt = this.calculateNextRun(dto.frequency, dto.scheduleConfig);

    const scheduled = this.scheduledRepo.create({
      organizationId: dto.organizationId,
      definitionId: dto.reportDefinitionId,
      name: dto.name,
      schedule: {
        frequency: dto.frequency,
        ...(dto.scheduleConfig.dayOfWeek !== undefined && {
          dayOfWeek: dto.scheduleConfig.dayOfWeek,
        }),
        ...(dto.scheduleConfig.dayOfMonth !== undefined && {
          dayOfMonth: dto.scheduleConfig.dayOfMonth,
        }),
        ...(dto.scheduleConfig.time !== undefined && {
          time: dto.scheduleConfig.time,
        }),
        ...(dto.scheduleConfig.timezone !== undefined && {
          timezone: dto.scheduleConfig.timezone,
        }),
        deliveryChannels: [dto.deliveryMethod] as (
          | "email"
          | "telegram"
          | "webhook"
        )[],
        recipients:
          dto.deliveryConfig.emails?.map((email) => ({ email })) || [],
        format: dto.format,
      },
      ...(dto.parameters !== undefined && {
        filters: dto.parameters as Record<string, unknown>,
      }),
      format: dto.format,
      recipients: dto.deliveryConfig.emails?.map((email) => ({ email })) || [],
      isActive: true,
      runCount: 0,
      failCount: 0,
      nextRunAt,
      createdById: createdById,
    } as Parameters<typeof this.scheduledRepo.create>[0]);

    return this.scheduledRepo.save(scheduled) as unknown as ScheduledReport;
  }

  async getScheduledReports(
    organizationId: string,
  ): Promise<ScheduledReport[]> {
    return this.scheduledRepo.find({
      where: { organizationId },
      order: { createdAt: "DESC" },
    });
  }

  async updateScheduledReport(
    id: string,
    organizationId: string,
    updates: Partial<ScheduledReport>,
  ): Promise<ScheduledReport> {
    const scheduled = await this.scheduledRepo.findOne({
      where: { id, organizationId },
    });
    if (!scheduled) {
      throw new NotFoundException(`Расписание ${id} не найдено`);
    }

    Object.assign(scheduled, updates);

    if (updates.schedule) {
      scheduled.nextRunAt = this.calculateNextRun(
        scheduled.schedule.frequency,
        {
          ...(scheduled.schedule.time !== undefined && {
            time: scheduled.schedule.time,
          }),
          ...(scheduled.schedule.dayOfWeek !== undefined && {
            dayOfWeek: scheduled.schedule.dayOfWeek,
          }),
          ...(scheduled.schedule.dayOfMonth !== undefined && {
            dayOfMonth: scheduled.schedule.dayOfMonth,
          }),
          ...(scheduled.schedule.timezone !== undefined && {
            timezone: scheduled.schedule.timezone,
          }),
        },
      );
    }

    return this.scheduledRepo.save(scheduled);
  }

  async deleteScheduledReport(
    id: string,
    organizationId: string,
  ): Promise<void> {
    const scheduled = await this.scheduledRepo.findOne({
      where: { id, organizationId },
    });
    if (!scheduled) {
      throw new NotFoundException(`Расписание ${id} не найдено`);
    }
    await this.scheduledRepo.softDelete(id);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledReports(): Promise<void> {
    let due: ScheduledReport[];
    try {
      due = await this.scheduledRepo.find({
        where: {
          isActive: true,
          nextRunAt: LessThan(new Date()),
        },
        take: 10,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.includes("does not exist") ||
        msg.includes("relation") ||
        msg.includes("Max client") ||
        msg.includes("MaxClients")
      ) {
        return;
      }
      this.logger.error(`Failed to query scheduled reports: ${msg}`);
      return;
    }

    for (const scheduled of due) {
      try {
        const emails =
          scheduled.recipients
            ?.filter((r) => r.email)
            .map((r) => r.email as string) || [];

        await this.generator.generate({
          organizationId: scheduled.organizationId,
          reportDefinitionId: scheduled.definitionId,
          format: scheduled.format,
          parameters: scheduled.filters as Record<string, unknown>,
          delivery: {
            method: "email",
            emails,
          },
        });

        scheduled.lastRunAt = new Date();
        scheduled.lastSuccessAt = new Date();
        scheduled.runCount++;
        scheduled.nextRunAt = this.calculateNextRun(
          scheduled.schedule.frequency,
          {
            ...(scheduled.schedule.time !== undefined && {
              time: scheduled.schedule.time,
            }),
            ...(scheduled.schedule.dayOfWeek !== undefined && {
              dayOfWeek: scheduled.schedule.dayOfWeek,
            }),
            ...(scheduled.schedule.dayOfMonth !== undefined && {
              dayOfMonth: scheduled.schedule.dayOfMonth,
            }),
            ...(scheduled.schedule.timezone !== undefined && {
              timezone: scheduled.schedule.timezone,
            }),
          },
        );
        scheduled.lastError = "";
      } catch (error: unknown) {
        scheduled.failCount++;
        const msg = error instanceof Error ? error.message : String(error);
        scheduled.lastError = msg;
        this.logger.error(
          `Failed to run scheduled report ${scheduled.id}: ${msg}`,
        );
      }

      await this.scheduledRepo.save(scheduled);
    }
  }

  calculateNextRun(
    frequency: ScheduleFrequency,
    config: {
      time?: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
      timezone?: string;
    },
  ): Date {
    const now = new Date();
    const time = config.time?.split(":") || ["09", "00"];
    const hour = parseInt(time[0] ?? "09", 10);
    const minute = parseInt(time[1] ?? "00", 10);

    switch (frequency) {
      case ReportFrequency.DAILY:
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(hour, minute, 0, 0);
        return tomorrow;

      case ReportFrequency.WEEKLY:
        const nextWeek = new Date(now);
        const daysUntilTarget =
          ((config.dayOfWeek || 1) - now.getDay() + 7) % 7 || 7;
        nextWeek.setDate(nextWeek.getDate() + daysUntilTarget);
        nextWeek.setHours(hour, minute, 0, 0);
        return nextWeek;

      case ReportFrequency.MONTHLY:
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(config.dayOfMonth || 1);
        nextMonth.setHours(hour, minute, 0, 0);
        return nextMonth;

      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}
