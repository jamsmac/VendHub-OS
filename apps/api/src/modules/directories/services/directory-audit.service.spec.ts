/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DirectoryAuditService } from "./directory-audit.service";
import {
  DirectoryEntryAudit,
  DirectoryAuditAction,
} from "../entities/directory-entry-audit.entity";

describe("DirectoryAuditService", () => {
  let service: DirectoryAuditService;
  let auditRepo: any;

  const entryId = "entry-uuid-1";
  const userId = "user-uuid-1";
  const directoryId = "dir-uuid-1";
  const orgId = "org-uuid-1";

  beforeEach(async () => {
    auditRepo = {
      create: jest.fn().mockImplementation((data) => ({
        id: "audit-1",
        changedAt: new Date(),
        ...data,
      })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectoryAuditService,
        {
          provide: getRepositoryToken(DirectoryEntryAudit),
          useValue: auditRepo,
        },
      ],
    }).compile();

    service = module.get<DirectoryAuditService>(DirectoryAuditService);
  });

  // --------------------------------------------------------------------------
  // createAuditEntry
  // --------------------------------------------------------------------------

  it("should create an audit log for CREATE action", async () => {
    const result = await service.createAuditEntry(
      entryId,
      DirectoryAuditAction.CREATE,
      userId,
      null,
      { name: "New Entry", code: "NE-001" },
    );

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entryId,
        action: DirectoryAuditAction.CREATE,
        changedBy: userId,
        oldValues: null,
        newValues: { name: "New Entry", code: "NE-001" },
        changeReason: null,
      }),
    );
    expect(auditRepo.save).toHaveBeenCalled();
    expect(result).toHaveProperty("id");
  });

  it("should create an audit log for UPDATE action with old and new values", async () => {
    await service.createAuditEntry(
      entryId,
      DirectoryAuditAction.UPDATE,
      userId,
      { name: "Old Name" },
      { name: "New Name" },
    );

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        oldValues: { name: "Old Name" },
        newValues: { name: "New Name" },
      }),
    );
  });

  it("should include changeReason when provided", async () => {
    await service.createAuditEntry(
      entryId,
      DirectoryAuditAction.UPDATE,
      userId,
      null,
      null,
      "Manual correction",
    );

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ changeReason: "Manual correction" }),
    );
  });

  it("should handle null changedBy (system actions)", async () => {
    await service.createAuditEntry(
      entryId,
      DirectoryAuditAction.SYNC,
      null,
      null,
      { name: "Synced" },
    );

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ changedBy: null }),
    );
  });

  // --------------------------------------------------------------------------
  // findAuditLogs
  // --------------------------------------------------------------------------

  it("should return paginated audit logs for a directory", async () => {
    const result = await service.findAuditLogs(directoryId, orgId);

    expect(result).toEqual(
      expect.objectContaining({
        data: [],
        total: 0,
        page: 1,
      }),
    );
  });

  it("should filter audit logs by entryId", async () => {
    const qb = auditRepo.createQueryBuilder();
    await service.findAuditLogs(directoryId, orgId, { entryId } as any);

    expect(qb.andWhere).toHaveBeenCalled();
  });

  it("should filter audit logs by action type", async () => {
    const qb = auditRepo.createQueryBuilder();
    await service.findAuditLogs(directoryId, orgId, {
      action: DirectoryAuditAction.CREATE,
    } as any);

    expect(qb.andWhere).toHaveBeenCalled();
  });

  it("should clamp limit to 200", async () => {
    const result = await service.findAuditLogs(directoryId, orgId, {
      limit: 500,
    } as any);

    expect(result.limit).toBe(200);
  });

  // --------------------------------------------------------------------------
  // findEntryAuditLogs
  // --------------------------------------------------------------------------

  it("should return paginated audit logs for a specific entry", async () => {
    const result = await service.findEntryAuditLogs(entryId);

    expect(result).toEqual(
      expect.objectContaining({
        data: [],
        total: 0,
        page: 1,
      }),
    );
  });

  it("should filter entry audit logs by action", async () => {
    const qb = auditRepo.createQueryBuilder();
    await service.findEntryAuditLogs(entryId, {
      action: DirectoryAuditAction.ARCHIVE,
    } as any);

    expect(qb.andWhere).toHaveBeenCalled();
  });
});
