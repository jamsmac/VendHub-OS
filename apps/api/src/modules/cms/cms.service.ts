/**
 * CMS Service
 *
 * Manages CMS articles with full CRUD operations.
 * Handles slug generation, pagination, and filtering.
 */

import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { CmsArticle } from "./entities/cms-article.entity";
import {
  CreateCmsArticleDto,
  UpdateCmsArticleDto,
  PaginationDto,
} from "./dto/cms-article.dto";

@Injectable()
export class CmsService {
  private readonly logger = new Logger(CmsService.name);

  constructor(
    @InjectRepository(CmsArticle)
    private readonly articleRepository: Repository<CmsArticle>,
  ) {}

  /**
   * Generate URL-friendly slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  /**
   * Get paginated articles with optional filtering
   */
  async getArticles(
    organizationId: string,
    pagination?: PaginationDto,
  ): Promise<{ data: CmsArticle[]; total: number }> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { organizationId, deletedAt: IsNull() };

    if (pagination?.isPublished !== undefined) {
      where.isPublished = pagination.isPublished;
    }

    if (pagination?.category) {
      where.category = pagination.category;
    }

    const [data, total] = await this.articleRepository.findAndCount({
      where,
      order: { sortOrder: "ASC", createdAt: "DESC" },
      take: limit,
      skip: offset,
    });

    return { data, total };
  }

  /**
   * Get a single article by ID or slug
   */
  async getArticleByIdOrSlug(
    organizationId: string,
    idOrSlug: string,
  ): Promise<CmsArticle> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    const article = await this.articleRepository.findOne({
      where: [
        { organizationId, id: idOrSlug, deletedAt: IsNull() },
        { organizationId, slug: idOrSlug, deletedAt: IsNull() },
      ],
    });

    if (!article) {
      throw new NotFoundException(
        `Article with ID or slug "${idOrSlug}" not found`,
      );
    }

    return article;
  }

  /**
   * Create a new article
   */
  async createArticle(
    organizationId: string,
    dto: CreateCmsArticleDto,
    authorId: string,
  ): Promise<CmsArticle> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    const slug = this.generateSlug(dto.title);

    // Check if slug already exists
    const existing = await this.articleRepository.findOne({
      where: { slug, deletedAt: IsNull() },
    });

    if (existing) {
      throw new BadRequestException(`Article slug "${slug}" already exists`);
    }

    const article = this.articleRepository.create({
      organizationId,
      ...dto,
      slug,
      authorId,
      publishedAt: dto.isPublished ? new Date() : null,
    });

    return this.articleRepository.save(article);
  }

  /**
   * Update an article
   */
  async updateArticle(
    organizationId: string,
    id: string,
    dto: UpdateCmsArticleDto,
    updatedBy: string,
  ): Promise<CmsArticle> {
    const article = await this.getArticleByIdOrSlug(organizationId, id);

    // If title changes, regenerate slug (if not already taken)
    if (dto.title && dto.title !== article.title) {
      const newSlug = this.generateSlug(dto.title);

      if (newSlug !== article.slug) {
        const existing = await this.articleRepository.findOne({
          where: { slug: newSlug, deletedAt: IsNull() },
        });

        if (existing) {
          throw new BadRequestException(
            `Article slug "${newSlug}" already exists`,
          );
        }

        article.slug = newSlug;
      }
    }

    // Handle publish state change
    if (
      dto.isPublished !== undefined &&
      dto.isPublished !== article.isPublished
    ) {
      if (dto.isPublished && !article.publishedAt) {
        article.publishedAt = new Date();
      } else if (!dto.isPublished) {
        article.publishedAt = null;
      }
    }

    Object.assign(article, {
      ...dto,
      updatedById: updatedBy,
    });

    return this.articleRepository.save(article);
  }

  /**
   * Delete an article (soft delete)
   */
  async deleteArticle(organizationId: string, id: string): Promise<void> {
    const article = await this.getArticleByIdOrSlug(organizationId, id);
    await this.articleRepository.softRemove(article);
    this.logger.log(`Article "${article.title}" soft deleted (ID: ${id})`);
  }

  /**
   * Get articles by category
   */
  async getArticlesByCategory(
    organizationId: string,
    category: string,
  ): Promise<CmsArticle[]> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    return this.articleRepository.find({
      where: {
        organizationId,
        category,
        isPublished: true,
        deletedAt: IsNull(),
      },
      order: { sortOrder: "ASC" },
    });
  }
}
