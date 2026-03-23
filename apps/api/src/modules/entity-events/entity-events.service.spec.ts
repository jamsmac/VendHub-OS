import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EntityEventsService } from "./entity-events.service";
import { EntityEvent } from "./entities/entity-event.entity";
import { TrackedEntityType } from "@vendhub/shared";

describe("EntityEventsService", () => {
  let service: EntityEventsService;
  let repo: any;

  const orgId = "org-uuid-1";
  const entityId = "machine-uuid-1";
  const userId = "user-uuid-1";

  const mockEvent = {
    id: "event-uuid-1",
    entityId,
    entityType: TrackedEntityType.MACHINE,
    eventType: "status_change",
    description: "Machine went offline",
    performedBy: userId,
    organizationId: orgId,
    eventDate: new Date("2026-03-23T10:00:00Z"),
  };

  beforeEach(async () => {
    repo = {
      create: jest
        .fn()
        .mockImplementation((data) => ({ id: "new-uuid", ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findAndCount: jest.fn().mockResolvedValue([[mockEvent], 1]),
      find: jest.fn().mockResolvedValue([mockEvent]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntityEventsService,
        { provide: getRepositoryToken(EntityEvent), useValue: repo },
      ],
    }).compile();

    service = module.get<EntityEventsService>(EntityEventsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ======================================================================
  // createEvent
  // ======================================================================

  describe("createEvent", () => {
    it("should create event with organizationId and performedBy", async () => {
      const dto = {
        entityId,
        entityType: TrackedEntityType.MACHINE,
        eventType: "status_change",
        description: "Machine went offline",
      };

      const result = await service.createEvent(dto as any, userId, orgId);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId,
          entityType: TrackedEntityType.MACHINE,
          performedBy: userId,
          organizationId: orgId,
        }),
      );
      expect(repo.save).toHaveBeenCalled();
      expect(result.organizationId).toBe(orgId);
    });

    it("should use current date when eventDate not provided", async () => {
      const dto = {
        entityId,
        entityType: TrackedEntityType.MACHINE,
        eventType: "inspection",
      };

      await service.createEvent(dto as any, userId, orgId);

      const createCall = repo.create.mock.calls[0][0];
      expect(createCall.eventDate).toBeInstanceOf(Date);
    });

    it("should use provided eventDate when specified", async () => {
      const dto = {
        entityId,
        entityType: TrackedEntityType.MACHINE,
        eventType: "inspection",
        eventDate: "2026-01-15T09:00:00Z",
      };

      await service.createEvent(dto as any, userId, orgId);

      const createCall = repo.create.mock.calls[0][0];
      expect(createCall.eventDate).toEqual(new Date("2026-01-15T09:00:00Z"));
    });
  });

  // ======================================================================
  // getEntityTimeline
  // ======================================================================

  describe("getEntityTimeline", () => {
    it("should filter by entityId and organizationId", async () => {
      const result = await service.getEntityTimeline(entityId, orgId);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { entityId, organizationId: orgId },
        order: { eventDate: "DESC" },
        skip: 0,
        take: 50,
      });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should paginate correctly", async () => {
      await service.getEntityTimeline(entityId, orgId, 3, 10);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 10,
        }),
      );
    });
  });

  // ======================================================================
  // queryEvents
  // ======================================================================

  describe("queryEvents", () => {
    it("should always filter by organizationId", async () => {
      await service.queryEvents({}, orgId);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: orgId }),
        }),
      );
    });

    it("should apply entityType filter", async () => {
      await service.queryEvents(
        { entityType: TrackedEntityType.MACHINE },
        orgId,
      );

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: orgId,
            entityType: TrackedEntityType.MACHINE,
          }),
        }),
      );
    });

    it("should apply date range filter", async () => {
      await service.queryEvents(
        { dateFrom: "2026-01-01", dateTo: "2026-01-31" },
        orgId,
      );

      const call = repo.findAndCount.mock.calls[0][0];
      expect(call.where.eventDate).toBeDefined();
    });

    it("should apply dateFrom only filter", async () => {
      await service.queryEvents({ dateFrom: "2026-03-01" }, orgId);

      const call = repo.findAndCount.mock.calls[0][0];
      expect(call.where.eventDate).toBeDefined();
    });
  });

  // ======================================================================
  // getRecentEvents
  // ======================================================================

  describe("getRecentEvents", () => {
    it("should return limited events for entity", async () => {
      const result = await service.getRecentEvents(entityId, orgId, 5);

      expect(repo.find).toHaveBeenCalledWith({
        where: { entityId, organizationId: orgId },
        order: { eventDate: "DESC" },
        take: 5,
      });
      expect(result).toHaveLength(1);
    });

    it("should default to 10 events", async () => {
      await service.getRecentEvents(entityId, orgId);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });
});
