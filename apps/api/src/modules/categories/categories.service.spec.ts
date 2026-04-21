import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { Category } from "./entities/category.entity";

describe("CategoriesService", () => {
  let service: CategoriesService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    softRemove: jest.Mock;
  };

  const ORG_ID = "a0000000-0000-0000-0000-000000000001";
  const OTHER_ORG = "b0000000-0000-0000-0000-000000000002";
  const USER_ID = "u0000000-0000-0000-0000-000000000001";
  const CAT_ID = "c0000000-0000-0000-0000-000000000001";

  const makeCategory = (overrides?: Partial<Category>): Category =>
    ({
      id: CAT_ID,
      organizationId: ORG_ID,
      code: "snacks",
      name: "Snacks",
      icon: null,
      color: null,
      sortOrder: 0,
      defaultMarkup: null,
      createdAt: new Date("2026-04-20T00:00:00Z"),
      updatedAt: new Date("2026-04-20T00:00:00Z"),
      deletedAt: null,
      createdById: USER_ID,
      updatedById: USER_ID,
      ...overrides,
    }) as Category;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: repo },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("list", () => {
    it("filters by organizationId and excludes soft-deleted", async () => {
      repo.find.mockResolvedValue([makeCategory()]);

      const result = await service.list(ORG_ID);

      expect(repo.find).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID, deletedAt: expect.anything() },
        order: { sortOrder: "ASC", name: "ASC" },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("findById", () => {
    it("returns category when found in correct org", async () => {
      const cat = makeCategory();
      repo.findOne.mockResolvedValue(cat);

      const result = await service.findById(CAT_ID, ORG_ID);
      expect(result).toBe(cat);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          id: CAT_ID,
          organizationId: ORG_ID,
          deletedAt: expect.anything(),
        },
      });
    });

    it("throws NotFoundException if belongs to different org (tenant isolation)", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById(CAT_ID, OTHER_ORG)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws NotFoundException when missing", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById(CAT_ID, ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("creates a new category with defaults", async () => {
      repo.findOne.mockResolvedValue(null); // no conflict
      const saved = makeCategory();
      repo.create.mockReturnValue(saved);
      repo.save.mockResolvedValue(saved);

      const result = await service.create(
        ORG_ID,
        { code: "snacks", name: "Snacks" },
        USER_ID,
      );

      expect(repo.create).toHaveBeenCalledWith({
        organizationId: ORG_ID,
        code: "snacks",
        name: "Snacks",
        icon: null,
        color: null,
        sortOrder: 0,
        defaultMarkup: null,
        createdById: USER_ID,
        updatedById: USER_ID,
      });
      expect(result).toBe(saved);
    });

    it("throws ConflictException when code already exists in org", async () => {
      repo.findOne.mockResolvedValue(makeCategory());

      await expect(
        service.create(ORG_ID, { code: "snacks", name: "Snacks" }, USER_ID),
      ).rejects.toThrow(ConflictException);
    });

    it("accepts icon, color, sortOrder, defaultMarkup", async () => {
      repo.findOne.mockResolvedValue(null);
      const saved = makeCategory({
        icon: "cookie",
        color: "#FF6B35",
        sortOrder: 10,
        defaultMarkup: 30,
      });
      repo.create.mockReturnValue(saved);
      repo.save.mockResolvedValue(saved);

      await service.create(
        ORG_ID,
        {
          code: "drinks",
          name: "Drinks",
          icon: "cookie",
          color: "#FF6B35",
          sortOrder: 10,
          defaultMarkup: 30,
        },
        USER_ID,
      );

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: "cookie",
          color: "#FF6B35",
          sortOrder: 10,
          defaultMarkup: 30,
        }),
      );
    });
  });

  describe("update", () => {
    it("updates only provided fields", async () => {
      const existing = makeCategory({ name: "Old" });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (v) => v);

      await service.update(CAT_ID, ORG_ID, { name: "New" }, USER_ID);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New",
          updatedById: USER_ID,
        }),
      );
    });

    it("throws NotFoundException when category in different org", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.update(CAT_ID, OTHER_ORG, { name: "X" }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("soft-deletes the category", async () => {
      const existing = makeCategory();
      repo.findOne.mockResolvedValue(existing);

      await service.remove(CAT_ID, ORG_ID);

      expect(repo.softRemove).toHaveBeenCalledWith(existing);
    });

    it("throws NotFoundException when not found", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(CAT_ID, ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
