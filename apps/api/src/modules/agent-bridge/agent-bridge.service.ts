import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan, In } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  AgentSession,
  AgentSessionStatus,
  AgentType,
} from "./entities/agent-session.entity";
import { AgentProgress } from "./entities/agent-progress.entity";
import {
  RegisterSessionDto,
  UpdateSessionDto,
  ReportProgressDto,
} from "./dto/agent-bridge.dto";

@Injectable()
export class AgentBridgeService {
  private readonly logger = new Logger(AgentBridgeService.name);

  constructor(
    @InjectRepository(AgentSession)
    private readonly sessionRepo: Repository<AgentSession>,
    @InjectRepository(AgentProgress)
    private readonly progressRepo: Repository<AgentProgress>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async registerSession(dto: RegisterSessionDto): Promise<AgentSession> {
    // Upsert by external sessionId
    let session = await this.sessionRepo.findOne({
      where: { sessionId: dto.sessionId },
    });

    if (session) {
      session.name = dto.name;
      session.status = AgentSessionStatus.RUNNING;
      session.lastActivityAt = new Date();
      if (dto.agentType) session.agentType = dto.agentType;
      if (dto.currentTask !== undefined) session.currentTask = dto.currentTask;
      if (dto.workingDirectory !== undefined)
        session.workingDirectory = dto.workingDirectory;
      if (dto.profile !== undefined) session.profile = dto.profile;
      if (dto.attachedMcps) session.attachedMcps = dto.attachedMcps;
      if (dto.metadata) session.metadata = dto.metadata;
    } else {
      session = this.sessionRepo.create({
        sessionId: dto.sessionId,
        name: dto.name,
        agentType: dto.agentType || AgentType.CUSTOM,
        status: AgentSessionStatus.RUNNING,
        currentTask: dto.currentTask || null,
        workingDirectory: dto.workingDirectory || null,
        profile: dto.profile || null,
        attachedMcps: dto.attachedMcps || [],
        lastActivityAt: new Date(),
        metadata: dto.metadata || null,
      });
    }

    const saved = await this.sessionRepo.save(session);
    this.eventEmitter.emit("agent.session.registered", saved);
    return saved;
  }

  async updateSession(
    sessionId: string,
    dto: UpdateSessionDto,
  ): Promise<AgentSession> {
    const session = await this.findSessionByExternalId(sessionId);

    if (dto.status !== undefined) session.status = dto.status;
    if (dto.currentTask !== undefined) session.currentTask = dto.currentTask;
    if (dto.messagesCount !== undefined)
      session.messagesCount = dto.messagesCount;
    if (dto.proposalsCount !== undefined)
      session.proposalsCount = dto.proposalsCount;
    if (dto.filesChangedCount !== undefined)
      session.filesChangedCount = dto.filesChangedCount;
    if (dto.metadata)
      session.metadata = { ...session.metadata, ...dto.metadata };
    session.lastActivityAt = new Date();

    const saved = await this.sessionRepo.save(session);
    this.eventEmitter.emit("agent.session.updated", saved);
    return saved;
  }

  async getSession(sessionId: string): Promise<AgentSession> {
    const session = await this.sessionRepo.findOne({
      where: { sessionId },
      relations: ["progressUpdates"],
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    return session;
  }

  async getActiveSessions(): Promise<AgentSession[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    return this.sessionRepo.find({
      where: [
        {
          status: In([AgentSessionStatus.RUNNING, AgentSessionStatus.WAITING]),
        },
        { lastActivityAt: MoreThan(fiveMinutesAgo) },
      ],
      order: { lastActivityAt: "DESC" },
    });
  }

  async getAllSessions(
    page = 1,
    limit = 20,
    status?: AgentSessionStatus,
  ): Promise<{ items: AgentSession[]; total: number }> {
    const where = status ? { status } : {};

    const [items, total] = await this.sessionRepo.findAndCount({
      where,
      order: { lastActivityAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  async completeSession(sessionId: string): Promise<AgentSession> {
    const session = await this.findSessionByExternalId(sessionId);
    session.status = AgentSessionStatus.COMPLETED;
    session.lastActivityAt = new Date();

    const saved = await this.sessionRepo.save(session);
    this.eventEmitter.emit("agent.session.completed", saved);
    return saved;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.findSessionByExternalId(sessionId);
    await this.sessionRepo.softDelete(session.id);
  }

  async reportProgress(dto: ReportProgressDto): Promise<AgentProgress> {
    const session = await this.sessionRepo.findOne({
      where: { sessionId: dto.sessionId },
    });

    if (!session) {
      throw new NotFoundException(
        `Session ${dto.sessionId} not found. Register session first via POST /sessions.`,
      );
    }

    const progress = this.progressRepo.create({
      sessionId: session.id,
      taskId: dto.taskId || null,
      status: dto.status,
      category: dto.category,
      message: dto.message,
      filesChanged: dto.filesChanged || [],
      linesAdded: dto.linesAdded ?? null,
      linesRemoved: dto.linesRemoved ?? null,
      durationMs: dto.durationMs ?? null,
      proposalId: dto.proposalId || null,
      metadata: dto.metadata || null,
    });

    const saved = await this.progressRepo.save(progress);

    // Update session counters
    if (dto.filesChanged?.length) {
      session.filesChangedCount += dto.filesChanged.length;
    }
    session.lastActivityAt = new Date();
    await this.sessionRepo.save(session);

    this.eventEmitter.emit("agent.progress", { session, progress: saved });
    return saved;
  }

  async getSessionProgress(
    sessionId: string,
    limit = 50,
  ): Promise<AgentProgress[]> {
    const session = await this.findSessionByExternalId(sessionId);
    return this.progressRepo.find({
      where: { sessionId: session.id },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async getRecentProgress(limit = 20): Promise<AgentProgress[]> {
    return this.progressRepo.find({
      order: { createdAt: "DESC" },
      take: limit,
      relations: ["session"],
    });
  }

  async getStatistics(): Promise<{
    activeSessions: number;
    totalSessions: number;
    todaySessions: number;
    totalProgress: number;
  }> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activeSessions, totalSessions, todaySessions, totalProgress] =
      await Promise.all([
        this.sessionRepo.count({
          where: [
            {
              status: In([
                AgentSessionStatus.RUNNING,
                AgentSessionStatus.WAITING,
              ]),
            },
            { lastActivityAt: MoreThan(fiveMinutesAgo) },
          ],
        }),
        this.sessionRepo.count(),
        this.sessionRepo.count({
          where: { createdAt: MoreThan(todayStart) },
        }),
        this.progressRepo.count(),
      ]);

    return { activeSessions, totalSessions, todaySessions, totalProgress };
  }

  async heartbeat(sessionId: string): Promise<void> {
    const session = await this.findSessionByExternalId(sessionId);
    session.lastActivityAt = new Date();
    await this.sessionRepo.save(session);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async markInactiveSessions(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const result = await this.sessionRepo
      .createQueryBuilder()
      .update(AgentSession)
      .set({ status: AgentSessionStatus.IDLE })
      .where("status IN (:...statuses)", {
        statuses: [AgentSessionStatus.RUNNING, AgentSessionStatus.WAITING],
      })
      .andWhere("lastActivityAt < :fiveMinutesAgo", { fiveMinutesAgo })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(
        `Marked ${result.affected} sessions as idle (>5min inactive)`,
      );
    }
  }

  private async findSessionByExternalId(
    sessionId: string,
  ): Promise<AgentSession> {
    const session = await this.sessionRepo.findOne({
      where: { sessionId },
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    return session;
  }
}
