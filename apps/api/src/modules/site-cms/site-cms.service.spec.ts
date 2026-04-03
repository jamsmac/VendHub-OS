import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { SiteCmsService } from "./site-cms.service";
import { SiteCmsItem } from "./entities/site-cms-item.entity";

describe("SiteCmsService", () => {
  let service: SiteCmsService;
  let repo: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    softRemove: jest.Mock;
  };

  const ORG_ID = "a0000000-0000-0000-0000-000000000001";
  const USER_ID = "u0000000-0000-0000-0000-000000000001";
  const ITEM_ID = "i0000000-0000-0000-0000-000000000001";

  const now = new Date("2026-04-01T12:00:00.000Z");

  const makeCmsItem = (overrides?: Partial<SiteCmsItem>): SiteCmsItem =>
    ({
      id: ITEM_ID,
      collection: "products",
      organizationId: ORG_ID,
      data: { name: "Espresso", price: 20000 },
      sortOrder: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdById: USER_ID,
      updatedById: USER_ID,
      ...overrides,
    }) as SiteCmsItem;

  const mockQb = () => {
    const qb: Record<string, jest.Mock> = {};
    qb.where = jest.fn().mockReturnValue(qb);
    qb.andWhere = jest.fn().mockReturnValue(qb);
    qb.orderBy = jest.fn().mockReturnValue(qb);
    qb.addOrderBy = jest.fn().mockReturnValue(qb);
    qb.getMany = jest.fn().mockResolvedValue([]);
    qb.getCount = jest.fn().mockResolvedValue(0);
    return qb;
  };

  beforeEach(async () => {
    repo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteCmsService,
        { provide: getRepositoryToken(SiteCmsItem), useValue: repo },
      ],
    }).compile();

    service = module.get<SiteCmsService>(SiteCmsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ─── findByCollection ──────────────────────────────────────────

  describe("findByCollection", () => {
    it("should return flattened items for a valid collection", async () => {
      const item = makeCmsItem();
      const qb = mockQb();
      qb.getMany.mockResolvedValue([item]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByCollection(ORG_ID, "products");

      expect(repo.createQueryBuilder).toHaveBeenCalledWith("item");
      expect(qb.where).toHaveBeenCalledWith("item.collection = :col", {
        col: "products",
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        "item.organizationId = :organizationId",
        { organizationId: ORG_ID },
      );
      expect(qb.orderBy).toHaveBeenCalledWith("item.sortOrder", "ASC");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: ITEM_ID,
        name: "Espresso",
        price: 20000,
        sort_order: 1,
        is_active: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
    });

    it("should throw NotFoundException for unknown collection", async () => {
      await expect(
        service.findByCollection(ORG_ID, "unknown_collection"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should filter by isActive when provided", async () => {
      const qb = mockQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findByCollection(ORG_ID, "partners", { isActive: true });

      expect(qb.andWhere).toHaveBeenCalledWith("item.isActive = :isActive", {
        isActive: true,
      });
    });

    it("should not add isActive filter when not provided", async () => {
      const qb = mockQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findByCollection(ORG_ID, "partners");

      const isActiveCalls = qb.andWhere.mock.calls.filter(
        (call: unknown[]) =>
          typeof call[0] === "string" && call[0].includes("isActive"),
      );
      expect(isActiveCalls).toHaveLength(0);
    });

    it("should filter by search with ILIKE when provided", async () => {
      const qb = mockQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findByCollection(ORG_ID, "products", {
        search: "espresso",
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        "item.data::text ILIKE :search",
        { search: "%espresso%" },
      );
    });

    it("should return empty array when no items found", async () => {
      const qb = mockQb();
      qb.getMany.mockResolvedValue([]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByCollection(ORG_ID, "machines");

      expect(result).toEqual([]);
    });

    it("should accept all allowed collections", async () => {
      const allowedCollections = [
        "products",
        "machines",
        "machine_types",
        "promotions",
        "partners",
        "partnership_models",
        "cooperation_requests",
        "loyalty_tiers",
        "loyalty_privileges",
        "bonus_actions",
        "site_content",
      ];

      for (const collection of allowedCollections) {
        const qb = mockQb();
        repo.createQueryBuilder.mockReturnValue(qb);

        await expect(
          service.findByCollection(ORG_ID, collection),
        ).resolves.not.toThrow();
      }
    });
  });

  // ─── countByCollection ─────────────────────────────────────────

  describe("countByCollection", () => {
    it("should return count for a valid collection", async () => {
      const qb = mockQb();
      qb.getCount.mockResolvedValue(5);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.countByCollection(ORG_ID, "products");

      expect(result).toBe(5);
      expect(qb.where).toHaveBeenCalledWith("item.collection = :col", {
        col: "products",
      });
    });

    it("should throw NotFoundException for unknown collection", async () => {
      await expect(
        service.countByCollection(ORG_ID, "invalid"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should filter by isActive when provided", async () => {
      const qb = mockQb();
      qb.getCount.mockResolvedValue(3);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.countByCollection(ORG_ID, "products", {
        isActive: true,
      });

      expect(result).toBe(3);
      expect(qb.andWhere).toHaveBeenCalledWith("item.isActive = :isActive", {
        isActive: true,
      });
    });
  });

  // ─── findById ──────────────────────────────────────────────────

  describe("findById", () => {
    it("should return a flattened item", async () => {
      const item = makeCmsItem();
      repo.findOne.mockResolvedValue(item);

      const result = await service.findById(ORG_ID, ITEM_ID);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          id: ITEM_ID,
          organizationId: ORG_ID,
          deletedAt: expect.anything(),
        },
      });
      expect(result).toEqual({
        id: ITEM_ID,
        name: "Espresso",
        price: 20000,
        sort_order: 1,
        is_active: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
    });

    it("should throw NotFoundException when item not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findById(ORG_ID, ITEM_ID)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById(ORG_ID, ITEM_ID)).rejects.toThrow(
        `Item ${ITEM_ID} not found`,
      );
    });
  });

  // ─── create ────────────────────────────────────────────────────

  describe("create", () => {
    it("should create an item with correct collection, data, sortOrder, isActive", async () => {
      const created = makeCmsItem();
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const dto = {
        data: { name: "Espresso", price: 20000 },
        sortOrder: 5,
        isActive: false,
      };

      const result = await service.create(ORG_ID, "products", dto, USER_ID);

      expect(repo.create).toHaveBeenCalledWith({
        collection: "products",
        organizationId: ORG_ID,
        data: { name: "Espresso", price: 20000 },
        sortOrder: 5,
        isActive: false,
        createdById: USER_ID,
        updatedById: USER_ID,
      });
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toHaveProperty("id", ITEM_ID);
    });

    it("should extract sortOrder from data when not provided in dto", async () => {
      const created = makeCmsItem({ sortOrder: 10 });
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const dto = {
        data: { name: "Latte", sort_order: 10 },
      };

      await service.create(ORG_ID, "products", dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 10 }),
      );
    });

    it("should default sortOrder to 0 when not in dto or data", async () => {
      const created = makeCmsItem({ sortOrder: 0 });
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const dto = { data: { name: "Water" } };

      await service.create(ORG_ID, "products", dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 0 }),
      );
    });

    it("should extract isActive from data when not provided in dto", async () => {
      const created = makeCmsItem({ isActive: false });
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const dto = {
        data: { name: "Draft Partner", is_active: false },
      };

      await service.create(ORG_ID, "partners", dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it("should default isActive to true when not in dto or data", async () => {
      const created = makeCmsItem({ isActive: true });
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const dto = { data: { name: "Active Item" } };

      await service.create(ORG_ID, "machines", dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });

    it("should set createdById and updatedById to null when no userId", async () => {
      const created = makeCmsItem({ createdById: null, updatedById: null });
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const dto = { data: { name: "Anon Item" } };

      await service.create(ORG_ID, "site_content", dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdById: null,
          updatedById: null,
        }),
      );
    });

    it("should throw NotFoundException for unknown collection on create", async () => {
      const dto = { data: { name: "Bad" } };

      await expect(service.create(ORG_ID, "nonexistent", dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ────────────────────────────────────────────────────

  describe("update", () => {
    it("should merge data (not replace) on update", async () => {
      const existing = makeCmsItem({
        data: { name: "Espresso", price: 20000, description: "Strong coffee" },
      });
      const saved = makeCmsItem({
        data: {
          name: "Espresso Updated",
          price: 20000,
          description: "Strong coffee",
        },
      });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue(saved);

      await service.update(ORG_ID, ITEM_ID, {
        data: { name: "Espresso Updated" },
      });

      // The item passed to save should have merged data
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: "Espresso Updated",
            price: 20000,
            description: "Strong coffee",
          },
        }),
      );
    });

    it("should update sortOrder when provided", async () => {
      const existing = makeCmsItem({ sortOrder: 1 });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue({ ...existing, sortOrder: 99 });

      await service.update(ORG_ID, ITEM_ID, { sortOrder: 99 });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 99 }),
      );
    });

    it("should update isActive when provided", async () => {
      const existing = makeCmsItem({ isActive: true });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue({ ...existing, isActive: false });

      await service.update(ORG_ID, ITEM_ID, { isActive: false });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it("should set updatedById to userId", async () => {
      const existing = makeCmsItem();
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue(existing);

      await service.update(ORG_ID, ITEM_ID, { data: { note: "hi" } }, USER_ID);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ updatedById: USER_ID }),
      );
    });

    it("should set updatedById to null when no userId", async () => {
      const existing = makeCmsItem();
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue(existing);

      await service.update(ORG_ID, ITEM_ID, { data: { note: "hi" } });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ updatedById: null }),
      );
    });

    it("should throw NotFoundException when item not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update(ORG_ID, ITEM_ID, { data: { name: "X" } }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should not modify data when dto.data is undefined", async () => {
      const existing = makeCmsItem({
        data: { name: "Original", price: 10000 },
      });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue(existing);

      await service.update(ORG_ID, ITEM_ID, { sortOrder: 5 });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: "Original", price: 10000 },
        }),
      );
    });
  });

  // ─── remove ────────────────────────────────────────────────────

  describe("remove", () => {
    it("should soft delete an existing item", async () => {
      const item = makeCmsItem();
      repo.findOne.mockResolvedValue(item);
      repo.softRemove.mockResolvedValue(item);

      await service.remove(ORG_ID, ITEM_ID);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          id: ITEM_ID,
          organizationId: ORG_ID,
          deletedAt: expect.anything(),
        },
      });
      expect(repo.softRemove).toHaveBeenCalledWith(item);
    });

    it("should throw NotFoundException when item not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(ORG_ID, ITEM_ID)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove(ORG_ID, ITEM_ID)).rejects.toThrow(
        `Item ${ITEM_ID} not found`,
      );
    });
  });

  // ─── flatten (tested through public methods) ──────────────────

  describe("flatten (via findById)", () => {
    it("should spread data fields into the top level", async () => {
      const item = makeCmsItem({
        data: { title: "Banner", imageUrl: "/img.png", priority: 1 },
      });
      repo.findOne.mockResolvedValue(item);

      const result = await service.findById(ORG_ID, ITEM_ID);

      expect(result).toHaveProperty("title", "Banner");
      expect(result).toHaveProperty("imageUrl", "/img.png");
      expect(result).toHaveProperty("priority", 1);
    });

    it("should include sort_order and is_active as snake_case keys", async () => {
      const item = makeCmsItem({ sortOrder: 7, isActive: false });
      repo.findOne.mockResolvedValue(item);

      const result = await service.findById(ORG_ID, ITEM_ID);

      expect(result).toHaveProperty("sort_order", 7);
      expect(result).toHaveProperty("is_active", false);
    });

    it("should include created_at and updated_at as ISO strings", async () => {
      const item = makeCmsItem();
      repo.findOne.mockResolvedValue(item);

      const result = await service.findById(ORG_ID, ITEM_ID);

      expect(result.created_at).toBe(now.toISOString());
      expect(result.updated_at).toBe(now.toISOString());
    });

    it("should handle undefined createdAt/updatedAt gracefully", async () => {
      const item = makeCmsItem({
        createdAt: undefined as unknown as Date,
        updatedAt: undefined as unknown as Date,
      });
      repo.findOne.mockResolvedValue(item);

      const result = await service.findById(ORG_ID, ITEM_ID);

      expect(result.created_at).toBeUndefined();
      expect(result.updated_at).toBeUndefined();
    });
  });
});
