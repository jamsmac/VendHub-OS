import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AgentBridgeService } from "./agent-bridge.service";
import {
  AgentSession,
  AgentSessionStatus,
  AgentType,
} from "./entities/agent-session.entity";
import {
  AgentProgress,
  ProgressStatus,
  ProgressCategory,
} from "./entities/agent-progress.entity";

describe("AgentBridgeService", () => {
  let service: AgentBridgeService;
  let sessionRepo: jest.Mocked<Repository<AgentSession>>;
  let progressRepo: jest.Mocked<Repository<AgentProgress>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockSession = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    sessionId: "session-123",
    name: "Test Session",
    agentType: AgentType.CLAUDE_CODE,
    status: AgentSessionStatus.RUNNING,
    currentTask: "Build feature X",
    workingDirectory: "/home/user/project",
    profile: "default",
    attachedMcps: ["mcp1", "mcp2"],
    lastActivityAt: new Date(),
    messagesCount: 10,
    proposalsCount: 2,
    filesChangedCount: 5,
    metadata: { key: "value" },
    progressUpdates: [],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null,
    createdById: null,
    updatedById: null,
  } as unknown as AgentSession;

  const mockProgress = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    sessionId: mockSession.id,
    taskId: "task-1",
    status: ProgressStatus.IN_PROGRESS,
    category: ProgressCategory.ANALYSIS,
    message: "Creating new file",
    filesChanged: ["src/app.ts"],
    linesAdded: 10,
    linesRemoved: 2,
    durationMs: 1000,
    proposalId: null,
    metadata: null,
    session: mockSession,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdById: null,
    updatedById: null,
  } as unknown as AgentProgress;

  const _createMockQueryBuilder = (result: unknown[] = [], count = 0) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: count }),
    find: jest.fn().mockResolvedValue(result),
    getMany: jest.fn().mockResolvedValue(result),
    getOne: jest.fn().mockResolvedValue(result[0] || null),
    getCount: jest.fn().mockResolvedValue(count),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentBridgeService,
        {
          provide: getRepositoryToken(AgentSession),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AgentProgress),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AgentBridgeService>(AgentBridgeService);
    sessionRepo = module.get(getRepositoryToken(AgentSession));
    progressRepo = module.get(getRepositoryToken(AgentProgress));
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // registerSession
  // ==========================================================================

  describe("registerSession", () => {
    it("should create a new session", async () => {
      const dto = {
        sessionId: "session-123",
        name: "New Session",
        agentType: AgentType.CLAUDE_CODE,
      };

      sessionRepo.findOne.mockResolvedValue(null);
      sessionRepo.create.mockReturnValue(mockSession);
      sessionRepo.save.mockResolvedValue(mockSession);

      const result = await service.registerSession(dto);

      expect(result).toEqual(mockSession);
      expect(sessionRepo.findOne).toHaveBeenCalledWith({
        where: { sessionId: "session-123" },
      });
      expect(sessionRepo.create).toHaveBeenCalled();
      expect(sessionRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "agent.session.registered",
        mockSession,
      );
    });

    it("should update existing session by sessionId", async () => {
      const dto = {
        sessionId: "session-123",
        name: "Updated Session",
        agentType: AgentType.GEMINI_CLI,
      };

      const existingSession = { ...mockSession };
      const updatedSession = {
        ...existingSession,
        name: "Updated Session",
        agentType: AgentType.GEMINI_CLI,
        lastActivityAt: expect.any(Date),
      };

      sessionRepo.findOne.mockResolvedValue(existingSession);
      sessionRepo.save.mockResolvedValue(updatedSession);

      const result = await service.registerSession(dto);

      expect(result.name).toBe("Updated Session");
      expect(result.agentType).toBe(AgentType.GEMINI_CLI);
      expect(sessionRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "agent.session.registered",
        updatedSession,
      );
    });
  });

  // ==========================================================================
  // updateSession
  // ==========================================================================

  describe("updateSession", () => {
    it("should update session status and metadata", async () => {
      const dto = {
        status: AgentSessionStatus.IDLE,
        currentTask: "New task",
        metadata: { newKey: "newValue" },
      };

      const updatedSession = {
        ...mockSession,
        status: AgentSessionStatus.IDLE,
        currentTask: "New task",
        metadata: { ...mockSession.metadata, newKey: "newValue" },
      };

      sessionRepo.findOne.mockResolvedValue(mockSession);
      sessionRepo.save.mockResolvedValue(updatedSession);

      const result = await service.updateSession("session-123", dto);

      expect(result.status).toBe(AgentSessionStatus.IDLE);
      expect(result.currentTask).toBe("New task");
      expect(sessionRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "agent.session.updated",
        updatedSession,
      );
    });

    it("should throw NotFoundException when session does not exist", async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateSession("nonexistent-session", {
          status: AgentSessionStatus.IDLE,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should increment counters", async () => {
      const dto = {
        messagesCount: 15,
        proposalsCount: 3,
        filesChangedCount: 8,
      };

      const updatedSession = {
        ...mockSession,
        messagesCount: 15,
        proposalsCount: 3,
        filesChangedCount: 8,
      };

      sessionRepo.findOne.mockResolvedValue(mockSession);
      sessionRepo.save.mockResolvedValue(updatedSession);

      const result = await service.updateSession("session-123", dto);

      expect(result.messagesCount).toBe(15);
      expect(result.proposalsCount).toBe(3);
      expect(result.filesChangedCount).toBe(8);
    });
  });

  // ==========================================================================
  // getSession
  // ==========================================================================

  describe("getSession", () => {
    it("should return session with progress updates", async () => {
      const sessionWithProgress = {
        ...mockSession,
        progressUpdates: [mockProgress],
      };

      sessionRepo.findOne.mockResolvedValue(sessionWithProgress);

      const result = await service.getSession("session-123");

      expect(result).toEqual(sessionWithProgress);
      expect(sessionRepo.findOne).toHaveBeenCalledWith({
        where: { sessionId: "session-123" },
        relations: ["progressUpdates"],
      });
    });

    it("should throw NotFoundException when session does not exist", async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(service.getSession("nonexistent-session")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // getActiveSessions
  // ==========================================================================

  describe("getActiveSessions", () => {
    it("should return sessions with RUNNING or WAITING status", async () => {
      const activeSessions = [mockSession];

      sessionRepo.find.mockResolvedValue(activeSessions);

      const result = await service.getActiveSessions();

      expect(result).toEqual(activeSessions);
      expect(sessionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({
              status: In([
                AgentSessionStatus.RUNNING,
                AgentSessionStatus.WAITING,
              ]),
            }),
            expect.objectContaining({
              lastActivityAt: expect.any(Object),
            }),
          ]),
          order: { lastActivityAt: "DESC" },
        }),
      );
    });
  });

  // ==========================================================================
  // getAllSessions
  // ==========================================================================

  describe("getAllSessions", () => {
    it("should return paginated sessions", async () => {
      const sessions = [mockSession];
      sessionRepo.findAndCount.mockResolvedValue([sessions, 1]);

      const result = await service.getAllSessions(1, 20);

      expect(result.items).toEqual(sessions);
      expect(result.total).toBe(1);
      expect(sessionRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { lastActivityAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("should filter by status", async () => {
      const sessions = [mockSession];
      sessionRepo.findAndCount.mockResolvedValue([sessions, 1]);

      await service.getAllSessions(1, 20, AgentSessionStatus.RUNNING);

      expect(sessionRepo.findAndCount).toHaveBeenCalledWith({
        where: { status: AgentSessionStatus.RUNNING },
        order: { lastActivityAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });
  });

  // ==========================================================================
  // completeSession
  // ==========================================================================

  describe("completeSession", () => {
    it("should mark session as completed", async () => {
      const completedSession = {
        ...mockSession,
        status: AgentSessionStatus.COMPLETED,
      };

      sessionRepo.findOne.mockResolvedValue(mockSession);
      sessionRepo.save.mockResolvedValue(completedSession);

      const result = await service.completeSession("session-123");

      expect(result.status).toBe(AgentSessionStatus.COMPLETED);
      expect(sessionRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "agent.session.completed",
        completedSession,
      );
    });

    it("should throw NotFoundException when session does not exist", async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.completeSession("nonexistent-session"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // deleteSession
  // ==========================================================================

  describe("deleteSession", () => {
    it("should soft delete session", async () => {
      sessionRepo.findOne.mockResolvedValue(mockSession);
      sessionRepo.softDelete.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });

      await expect(
        service.deleteSession("session-123"),
      ).resolves.toBeUndefined();

      expect(sessionRepo.softDelete).toHaveBeenCalledWith(mockSession.id);
    });

    it("should throw NotFoundException when session does not exist", async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteSession("nonexistent-session"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // reportProgress
  // ==========================================================================

  describe("reportProgress", () => {
    it("should create progress report and update session", async () => {
      const dto = {
        sessionId: "session-123",
        taskId: "task-1",
        status: ProgressStatus.IN_PROGRESS,
        category: ProgressCategory.ANALYSIS,
        message: "Creating new file",
        filesChanged: ["src/app.ts"],
        linesAdded: 10,
        linesRemoved: 2,
      };

      sessionRepo.findOne.mockResolvedValue(mockSession);
      progressRepo.create.mockReturnValue(mockProgress);
      progressRepo.save.mockResolvedValue(mockProgress);
      sessionRepo.save.mockResolvedValue(mockSession);

      const result = await service.reportProgress(dto);

      expect(result).toEqual(mockProgress);
      expect(progressRepo.create).toHaveBeenCalled();
      expect(progressRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "agent.progress",
        expect.objectContaining({
          session: mockSession,
          progress: mockProgress,
        }),
      );
    });

    it("should auto-create session if not found", async () => {
      const dto = {
        sessionId: "new-session-123",
        taskId: "task-1",
        status: ProgressStatus.IN_PROGRESS,
        category: ProgressCategory.CODE_GENERATION,
        message: "Starting task",
      };

      const newSession = {
        ...mockSession,
        sessionId: "new-session-123",
      };

      sessionRepo.findOne.mockResolvedValue(null);
      sessionRepo.create.mockReturnValue(newSession);
      sessionRepo.save.mockResolvedValue(newSession);
      progressRepo.create.mockReturnValue(mockProgress);
      progressRepo.save.mockResolvedValue(mockProgress);

      await service.reportProgress(dto);

      expect(sessionRepo.create).toHaveBeenCalled();
      expect(progressRepo.save).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getSessionProgress
  // ==========================================================================

  describe("getSessionProgress", () => {
    it("should return progress updates for session", async () => {
      const progressUpdates = [mockProgress];

      sessionRepo.findOne.mockResolvedValue(mockSession);
      progressRepo.find.mockResolvedValue(progressUpdates);

      const result = await service.getSessionProgress("session-123", 50);

      expect(result).toEqual(progressUpdates);
      expect(progressRepo.find).toHaveBeenCalledWith({
        where: { sessionId: mockSession.id },
        order: { createdAt: "DESC" },
        take: 50,
      });
    });

    it("should throw NotFoundException when session does not exist", async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getSessionProgress("nonexistent-session"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // getRecentProgress
  // ==========================================================================

  describe("getRecentProgress", () => {
    it("should return recent progress updates across all sessions", async () => {
      const progressUpdates = [mockProgress];

      progressRepo.find.mockResolvedValue(progressUpdates);

      const result = await service.getRecentProgress(20);

      expect(result).toEqual(progressUpdates);
      expect(progressRepo.find).toHaveBeenCalledWith({
        order: { createdAt: "DESC" },
        take: 20,
        relations: ["session"],
      });
    });
  });

  // ==========================================================================
  // getStatistics
  // ==========================================================================

  describe("getStatistics", () => {
    it("should return session and progress statistics", async () => {
      sessionRepo.count
        .mockResolvedValueOnce(5) // activeSessions
        .mockResolvedValueOnce(20) // totalSessions
        .mockResolvedValueOnce(3); // todaySessions

      progressRepo.count.mockResolvedValue(150); // totalProgress

      const result = await service.getStatistics();

      expect(result.activeSessions).toBe(5);
      expect(result.totalSessions).toBe(20);
      expect(result.todaySessions).toBe(3);
      expect(result.totalProgress).toBe(150);
      expect(sessionRepo.count).toHaveBeenCalledTimes(3);
      expect(progressRepo.count).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // heartbeat
  // ==========================================================================

  describe("heartbeat", () => {
    it("should update session last activity timestamp", async () => {
      const sessionWithUpdatedActivity = {
        ...mockSession,
        lastActivityAt: new Date(),
      };

      sessionRepo.findOne.mockResolvedValue(mockSession);
      sessionRepo.save.mockResolvedValue(sessionWithUpdatedActivity);

      await expect(service.heartbeat("session-123")).resolves.toBeUndefined();

      expect(sessionRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when session does not exist", async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(service.heartbeat("nonexistent-session")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
