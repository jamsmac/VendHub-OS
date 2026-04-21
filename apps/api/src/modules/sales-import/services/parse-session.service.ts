import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Cron } from "@nestjs/schedule";
import { LessThan, Repository } from "typeorm";
import { ParseSession } from "../entities/parse-session.entity";

export interface CreateParseSessionInput {
  organizationId: string;
  userId: string;
  format: string;
  fileName: string;
  rows: string[][];
  headers: string[];
  reportDay?: string | null;
  storageKey?: string | null;
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * DB-backed parse sessions — survives restarts and works across multi-instance API.
 * Hourly cron sweeps expired rows.
 */
@Injectable()
export class ParseSessionService {
  private readonly logger = new Logger(ParseSessionService.name);

  constructor(
    @InjectRepository(ParseSession)
    private readonly repo: Repository<ParseSession>,
  ) {}

  async create(
    input: CreateParseSessionInput,
  ): Promise<{ sessionId: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const entity = this.repo.create({
      organizationId: input.organizationId,
      byUserId: input.userId,
      format: input.format,
      fileName: input.fileName,
      rows: input.rows,
      headers: input.headers,
      reportDay: input.reportDay ?? null,
      storageKey: input.storageKey ?? null,
      expiresAt,
      createdById: input.userId,
    });
    const saved = await this.repo.save(entity);
    return { sessionId: saved.id, expiresAt };
  }

  async get(sessionId: string, organizationId: string): Promise<ParseSession> {
    const session = await this.repo.findOne({
      where: { id: sessionId, organizationId },
    });
    if (!session) {
      throw new NotFoundException(`Parse session ${sessionId} not found`);
    }
    if (session.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException(`Parse session ${sessionId} has expired`);
    }
    return session;
  }

  async delete(sessionId: string, organizationId: string): Promise<void> {
    await this.repo.delete({ id: sessionId, organizationId });
  }

  /** Hourly cleanup of expired parse sessions. Tashkent timezone. */
  @Cron("0 * * * *", { timeZone: "Asia/Tashkent" })
  async cleanupExpired(): Promise<void> {
    const result = await this.repo.delete({
      expiresAt: LessThan(new Date()),
    });
    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired parse sessions`);
    }
  }
}
