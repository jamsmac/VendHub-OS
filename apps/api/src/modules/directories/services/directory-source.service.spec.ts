/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { DirectorySourceService } from "./directory-source.service";
import { DirectoryAuditService } from "./directory-audit.service";
import { DirectoryEntry } from "../entities/directory.entity";
import { DirectorySource } from "../entities/directory-source.entity";
import { DirectorySyncLog } from "../entities/directory-sync-log.entity";

describe("DirectorySourceService", () => {
  let service: DirectorySourceService;
  let sourceRepo: any;
  let entryRepo: any;
  let syncLogRepo: any;
  let auditService: any;

  const directoryId = "dir-uuid-1";
  const sourceId = "src-uuid-1";

  const mockSource: Partial<DirectorySource> = {
    id: sourceId,
    directoryId,
    name: "Government Registry",
    sourceType: "API" as any,
    url: "https://api.example.com/data",
    isActive: true,
    consecutiveFailures: 0,
    columnMapping: {},
    uniqueKeyField: "code",
  };

  beforeEach(async () => {
    sourceRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ id: sourceId, ...entity }),
        ),
      findOne: jest.fn(),
      softRemove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue([mockSource]),
      }),
    };

    entryRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ id: "entry-1", ...entity }),
        ),
    };

    syncLogRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ id: "log-1", ...entity }),
        ),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    auditService = {
      createAuditEntry: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectorySourceService,
        { provide: getRepositoryToken(DirectoryEntry), useValue: entryRepo },
        { provide: getRepositoryToken(DirectorySource), useValue: sourceRepo },
        {
          provide: getRepositoryToken(DirectorySyncLog),
          useValue: syncLogRepo,
        },
        { provide: DirectoryAuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<DirectorySourceService>(DirectorySourceService);
  });

  // --------------------------------------------------------------------------
  // createSource
  // --------------------------------------------------------------------------

  it("should create a directory source", async () => {
    const dto = { name: "Tax API", sourceType: "API", url: "https://tax.uz" };

    const result = await service.createSource(directoryId, dto as any);

    expect(sourceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ directoryId, name: "Tax API" }),
    );
    expect(result).toHaveProperty("id");
  });

  // --------------------------------------------------------------------------
  // findAllSources
  // --------------------------------------------------------------------------

  it("should return paginated sources for a directory", async () => {
    const result = await service.findAllSources(directoryId);

    expect(result).toEqual(
      expect.objectContaining({
        data: expect.any(Array),
        total: 1,
        page: 1,
      }),
    );
  });

  it("should clamp limit to 200", async () => {
    const result = await service.findAllSources(directoryId, {
      limit: 500,
    } as any);

    expect(result.limit).toBe(200);
  });

  // --------------------------------------------------------------------------
  // findOneSource
  // --------------------------------------------------------------------------

  it("should return a single source by id", async () => {
    sourceRepo.findOne.mockResolvedValue(mockSource);

    const result = await service.findOneSource(directoryId, sourceId);
    expect(result).toEqual(mockSource);
  });

  it("should throw NotFoundException for missing source", async () => {
    sourceRepo.findOne.mockResolvedValue(null);

    await expect(
      service.findOneSource(directoryId, "nonexistent"),
    ).rejects.toThrow(NotFoundException);
  });

  // --------------------------------------------------------------------------
  // updateSource
  // --------------------------------------------------------------------------

  it("should update source configuration", async () => {
    sourceRepo.findOne.mockResolvedValue({ ...mockSource });

    const result = await service.updateSource(directoryId, sourceId, {
      name: "Updated Source",
    } as any);

    expect(result.name).toBe("Updated Source");
    expect(sourceRepo.save).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // removeSource
  // --------------------------------------------------------------------------

  it("should soft-delete a source", async () => {
    sourceRepo.findOne.mockResolvedValue(mockSource);

    await service.removeSource(directoryId, sourceId);

    expect(sourceRepo.softRemove).toHaveBeenCalledWith(mockSource);
  });

  // --------------------------------------------------------------------------
  // triggerSync
  // --------------------------------------------------------------------------

  it("should reject sync from inactive source", async () => {
    sourceRepo.findOne.mockResolvedValue({ ...mockSource, isActive: false });

    await expect(
      service.triggerSync(directoryId, sourceId, "org-1"),
    ).rejects.toThrow(BadRequestException);
  });

  // --------------------------------------------------------------------------
  // findSyncLogs
  // --------------------------------------------------------------------------

  it("should return paginated sync logs", async () => {
    const result = await service.findSyncLogs(directoryId);

    expect(result).toEqual(
      expect.objectContaining({
        data: [],
        total: 0,
        page: 1,
      }),
    );
  });
});
