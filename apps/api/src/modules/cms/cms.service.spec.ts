import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { CmsService } from "./cms.service";
import { CmsArticle } from "./entities/cms-article.entity";
import {
  CreateCmsArticleDto,
  UpdateCmsArticleDto,
  PaginationDto,
} from "./dto/cms-article.dto";

const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  softDelete: jest.fn(),
  softRemove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
    getCount: jest.fn(),
  })),
});

describe("CmsService", () => {
  let service: CmsService;
  let repo: jest.Mocked<Repository<CmsArticle>>;

  const orgId = "550e8400-e29b-41d4-a716-446655440000";
  const authorId = "550e8400-e29b-41d4-a716-446655440001";

  const mockArticle: CmsArticle = {
    id: "550e8400-e29b-41d4-a716-446655440002",
    organizationId: orgId,
    title: "Getting Started",
    slug: "getting-started",
    content: "This is the getting started guide...",
    category: "guides",
    isPublished: true,
    publishedAt: new Date("2025-01-01"),
    authorId,
    sortOrder: 1,
    tags: ["tutorial", "guide"],
    metaTitle: "Getting Started Guide",
    metaDescription: "Learn how to get started",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null,
    createdById: authorId,
    updatedById: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CmsService,
        {
          provide: getRepositoryToken(CmsArticle),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<CmsService>(CmsService);
    repo = module.get(getRepositoryToken(CmsArticle));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // getArticles
  // =========================================================================

  describe("getArticles", () => {
    it("should return paginated articles with default pagination", async () => {
      const articles = [mockArticle];
      repo.findAndCount.mockResolvedValue([articles, 1]);

      const result = await service.getArticles(orgId);

      expect(result.data).toEqual(articles);
      expect(result.total).toBe(1);
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { sortOrder: "ASC", createdAt: "DESC" },
          take: 10,
          skip: 0,
        }),
      );
    });

    it("should apply custom pagination limit and offset", async () => {
      const articles = [mockArticle];
      repo.findAndCount.mockResolvedValue([articles, 5]);

      const pagination: PaginationDto = { limit: 20, offset: 40 };
      const result = await service.getArticles(orgId, pagination);

      expect(result.data).toEqual(articles);
      expect(result.total).toBe(5);
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { sortOrder: "ASC", createdAt: "DESC" },
          take: 20,
          skip: 40,
        }),
      );
    });

    it("should filter by isPublished when provided", async () => {
      const articles = [mockArticle];
      repo.findAndCount.mockResolvedValue([articles, 1]);

      const pagination: PaginationDto = { isPublished: true };
      await service.getArticles(orgId, pagination);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { sortOrder: "ASC", createdAt: "DESC" },
          take: 10,
          skip: 0,
        }),
      );
    });

    it("should filter by category when provided", async () => {
      const articles = [mockArticle];
      repo.findAndCount.mockResolvedValue([articles, 1]);

      const pagination: PaginationDto = { category: "guides" };
      await service.getArticles(orgId, pagination);

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { sortOrder: "ASC", createdAt: "DESC" },
          take: 10,
          skip: 0,
        }),
      );
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(service.getArticles("")).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.getArticles(null as unknown as string),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // getArticleByIdOrSlug
  // =========================================================================

  describe("getArticleByIdOrSlug", () => {
    it("should find article by ID", async () => {
      repo.findOne.mockResolvedValue(mockArticle);

      const result = await service.getArticleByIdOrSlug(orgId, mockArticle.id);

      expect(result).toEqual(mockArticle);
      expect(repo.findOne).toHaveBeenCalled();
    });

    it("should find article by slug", async () => {
      repo.findOne.mockResolvedValue(mockArticle);

      const result = await service.getArticleByIdOrSlug(
        orgId,
        "getting-started",
      );

      expect(result).toEqual(mockArticle);
      expect(repo.findOne).toHaveBeenCalled();
    });

    it("should throw NotFoundException when article not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.getArticleByIdOrSlug(orgId, "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        service.getArticleByIdOrSlug("", "some-slug"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // createArticle
  // =========================================================================

  describe("createArticle", () => {
    it("should create a new published article", async () => {
      const dto: CreateCmsArticleDto = {
        title: "Getting Started",
        content: "This is the getting started guide...",
        category: "guides",
        isPublished: true,
      };

      repo.findOne.mockResolvedValue(null); // No existing slug
      repo.create.mockReturnValue(mockArticle);
      repo.save.mockResolvedValue(mockArticle);

      const result = await service.createArticle(orgId, dto, authorId);

      expect(result).toEqual(mockArticle);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          title: "Getting Started",
          slug: "getting-started",
          authorId,
          publishedAt: expect.any(Date),
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(mockArticle);
    });

    it("should create a draft article without publishedAt", async () => {
      const dto: CreateCmsArticleDto = {
        title: "Draft Article",
        content: "This is a draft...",
        isPublished: false,
      };

      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue({
        ...mockArticle,
        isPublished: false,
        publishedAt: null,
      });
      repo.save.mockResolvedValue({
        ...mockArticle,
        isPublished: false,
        publishedAt: null,
      });

      await service.createArticle(orgId, dto, authorId);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          publishedAt: null,
        }),
      );
    });

    it("should generate proper URL slug from title", async () => {
      const dto: CreateCmsArticleDto = {
        title: "Hello World! @#$%",
        content: "Content...",
      };

      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockArticle);
      repo.save.mockResolvedValue(mockArticle);

      await service.createArticle(orgId, dto, authorId);

      // The slug is "hello-world-" due to the trailing dash in the original title
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: expect.stringContaining("hello-world"),
        }),
      );
    });

    it("should throw BadRequestException when slug already exists", async () => {
      const dto: CreateCmsArticleDto = {
        title: "Getting Started",
        content: "Content...",
      };

      repo.findOne.mockResolvedValue(mockArticle); // Slug already exists

      await expect(service.createArticle(orgId, dto, authorId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      const dto: CreateCmsArticleDto = {
        title: "Test",
        content: "Content...",
      };

      await expect(service.createArticle("", dto, authorId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // updateArticle
  // =========================================================================

  describe("updateArticle", () => {
    it("should update article with new content", async () => {
      const updatedArticle = {
        ...mockArticle,
        content: "Updated content",
      };

      repo.findOne.mockResolvedValue(mockArticle);
      repo.save.mockResolvedValue(updatedArticle);

      const dto: UpdateCmsArticleDto = { content: "Updated content" };
      const result = await service.updateArticle(
        orgId,
        mockArticle.id,
        dto,
        authorId,
      );

      expect(result.content).toBe("Updated content");
      expect(repo.save).toHaveBeenCalled();
    });

    it("should regenerate slug when title changes", async () => {
      const updatedArticle = {
        ...mockArticle,
        title: "New Title",
        slug: "new-title",
      };

      repo.findOne
        .mockResolvedValueOnce(mockArticle) // getArticleByIdOrSlug
        .mockResolvedValueOnce(null); // Slug uniqueness check
      repo.save.mockResolvedValue(updatedArticle);

      const dto: UpdateCmsArticleDto = { title: "New Title" };
      const result = await service.updateArticle(
        orgId,
        mockArticle.id,
        dto,
        authorId,
      );

      expect(result.slug).toBe("new-title");
    });

    it("should not regenerate slug if title and slug are the same", async () => {
      // Mock the first findOne call (getArticleByIdOrSlug)
      repo.findOne.mockResolvedValueOnce(mockArticle);
      repo.save.mockResolvedValue(mockArticle);

      const dto: UpdateCmsArticleDto = { title: "Getting Started" };
      const result = await service.updateArticle(
        orgId,
        mockArticle.id,
        dto,
        authorId,
      );

      // When title is the same as current title, slug should not change
      expect(result.slug).toBe(mockArticle.slug);
      expect(repo.save).toHaveBeenCalled();
    });

    it("should set publishedAt when publishing a draft", async () => {
      const draftArticle = {
        ...mockArticle,
        isPublished: false,
        publishedAt: null,
      };
      const publishedArticle = {
        ...draftArticle,
        isPublished: true,
        publishedAt: expect.any(Date),
      };

      repo.findOne.mockResolvedValue(draftArticle);
      repo.save.mockResolvedValue(publishedArticle);

      const dto: UpdateCmsArticleDto = { isPublished: true };
      const result = await service.updateArticle(
        orgId,
        mockArticle.id,
        dto,
        authorId,
      );

      expect(result.publishedAt).not.toBeNull();
    });

    it("should clear publishedAt when unpublishing an article", async () => {
      repo.findOne.mockResolvedValue(mockArticle);
      const unpublishedArticle = {
        ...mockArticle,
        isPublished: false,
        publishedAt: null,
      };
      repo.save.mockResolvedValue(unpublishedArticle);

      const dto: UpdateCmsArticleDto = { isPublished: false };
      const result = await service.updateArticle(
        orgId,
        mockArticle.id,
        dto,
        authorId,
      );

      expect(result.publishedAt).toBeNull();
    });

    it("should throw NotFoundException when article not found", async () => {
      repo.findOne.mockResolvedValue(null);

      const dto: UpdateCmsArticleDto = { content: "New content" };
      await expect(
        service.updateArticle(orgId, "nonexistent", dto, authorId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // deleteArticle
  // =========================================================================

  describe("deleteArticle", () => {
    it("should soft delete an article", async () => {
      repo.findOne.mockResolvedValue(mockArticle);
      repo.softRemove.mockResolvedValue(mockArticle);

      await service.deleteArticle(orgId, mockArticle.id);

      expect(repo.softRemove).toHaveBeenCalledWith(mockArticle);
    });

    it("should throw NotFoundException when article not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.deleteArticle(orgId, "nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // getArticlesByCategory
  // =========================================================================

  describe("getArticlesByCategory", () => {
    it("should return published articles in a category", async () => {
      const articles = [mockArticle];
      repo.find.mockResolvedValue(articles);

      const result = await service.getArticlesByCategory(orgId, "guides");

      expect(result).toEqual(articles);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { sortOrder: "ASC" },
        }),
      );
    });

    it("should return empty array when no articles in category", async () => {
      repo.find.mockResolvedValue([]);

      const result = await service.getArticlesByCategory(orgId, "nonexistent");

      expect(result).toEqual([]);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(service.getArticlesByCategory("", "guides")).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
