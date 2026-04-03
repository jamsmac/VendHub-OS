import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import {
  CmsBanner,
  BannerStatus,
  BannerPosition,
} from "./entities/cms-banner.entity";
import { CmsArticle } from "./entities/cms-article.entity";
import { CreateCmsBannerDto, UpdateCmsBannerDto } from "./dto/cms-banner.dto";

@Injectable()
export class CmsBannerService {
  private readonly logger = new Logger(CmsBannerService.name);
  private readonly publicOrgId: string;

  constructor(
    @InjectRepository(CmsBanner)
    private readonly bannerRepository: Repository<CmsBanner>,

    @InjectRepository(CmsArticle)
    private readonly articleRepository: Repository<CmsArticle>,

    private readonly configService: ConfigService,
  ) {
    this.publicOrgId =
      this.configService.get<string>("VENDHUB_PUBLIC_ORG_ID") ??
      "a0000000-0000-0000-0000-000000000001";
  }

  // ============================================
  // PUBLIC: Active banners for site
  // ============================================

  async getActiveBanners(position?: BannerPosition) {
    const now = new Date();

    const query = this.bannerRepository
      .createQueryBuilder("b")
      .select([
        "b.id",
        "b.titleRu",
        "b.descriptionRu",
        "b.titleUz",
        "b.descriptionUz",
        "b.imageUrl",
        "b.imageUrlMobile",
        "b.linkUrl",
        "b.buttonTextRu",
        "b.buttonTextUz",
        "b.position",
        "b.sortOrder",
        "b.backgroundColor",
        "b.textColor",
      ])
      .where("b.organizationId = :orgId", { orgId: this.publicOrgId })
      .andWhere("b.status = :status", { status: BannerStatus.ACTIVE })
      .andWhere("b.deletedAt IS NULL")
      .andWhere("(b.validFrom IS NULL OR b.validFrom <= :now)", { now })
      .andWhere("(b.validUntil IS NULL OR b.validUntil >= :now)", { now });

    if (position) {
      query.andWhere("b.position = :position", { position });
    }

    query.orderBy("b.position", "ASC").addOrderBy("b.sortOrder", "ASC");

    const banners = await query.getMany();

    // Track impressions (fire-and-forget)
    if (banners.length > 0) {
      const ids = banners.map((b) => b.id);
      this.bannerRepository
        .createQueryBuilder()
        .update(CmsBanner)
        .set({ impressions: () => "impressions + 1" })
        .where("id IN (:...ids)", { ids })
        .execute()
        .catch((e) =>
          this.logger.warn(`Failed to track impressions: ${e.message}`),
        );
    }

    return { data: banners, total: banners.length };
  }

  // ============================================
  // PUBLIC: Site content sections
  // ============================================

  async getPublicSiteContent(category?: string) {
    const query = this.articleRepository
      .createQueryBuilder("a")
      .select([
        "a.id",
        "a.slug",
        "a.title",
        "a.content",
        "a.category",
        "a.sortOrder",
        "a.tags",
      ])
      .where("a.organizationId = :orgId", { orgId: this.publicOrgId })
      .andWhere("a.isPublished = true")
      .andWhere("a.deletedAt IS NULL");

    if (category) {
      query.andWhere("a.category = :category", { category });
    }

    query.orderBy("a.category", "ASC").addOrderBy("a.sortOrder", "ASC");

    const articles = await query.getMany();

    // Group by category for convenience
    const grouped: Record<
      string,
      Array<{
        id: string;
        slug: string;
        title: string;
        content: string;
        sortOrder: number;
        tags: string[] | null;
      }>
    > = {};

    for (const a of articles) {
      const cat = a.category || "general";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({
        id: a.id,
        slug: a.slug,
        title: a.title,
        content: a.content,
        sortOrder: a.sortOrder,
        tags: a.tags,
      });
    }

    return { data: grouped, total: articles.length };
  }

  // ============================================
  // ADMIN: CRUD
  // ============================================

  async getAllBanners(organizationId: string, position?: BannerPosition) {
    const where: Record<string, unknown> = { organizationId };
    if (position) where.position = position;

    return this.bannerRepository.find({
      where,
      order: { position: "ASC", sortOrder: "ASC" },
    });
  }

  async getBannerById(organizationId: string, id: string): Promise<CmsBanner> {
    const banner = await this.bannerRepository.findOne({
      where: { id, organizationId },
    });
    if (!banner) throw new NotFoundException("Banner not found");
    return banner;
  }

  async createBanner(
    organizationId: string,
    dto: CreateCmsBannerDto,
    userId: string,
  ): Promise<CmsBanner> {
    const banner = this.bannerRepository.create({
      organizationId,
      titleRu: dto.titleRu,
      descriptionRu: dto.descriptionRu ?? null,
      titleUz: dto.titleUz ?? null,
      descriptionUz: dto.descriptionUz ?? null,
      imageUrl: dto.imageUrl ?? null,
      imageUrlMobile: dto.imageUrlMobile ?? null,
      linkUrl: dto.linkUrl ?? null,
      buttonTextRu: dto.buttonTextRu ?? null,
      buttonTextUz: dto.buttonTextUz ?? null,
      position: dto.position ?? BannerPosition.HERO,
      status: dto.status ?? BannerStatus.DRAFT,
      sortOrder: dto.sortOrder ?? 0,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      backgroundColor: dto.backgroundColor ?? null,
      textColor: dto.textColor ?? null,
      createdById: userId,
    });

    return this.bannerRepository.save(banner);
  }

  async updateBanner(
    organizationId: string,
    id: string,
    dto: UpdateCmsBannerDto,
    userId: string,
  ): Promise<CmsBanner> {
    const banner = await this.getBannerById(organizationId, id);

    if (dto.titleRu !== undefined) banner.titleRu = dto.titleRu;
    if (dto.descriptionRu !== undefined)
      banner.descriptionRu = dto.descriptionRu ?? null;
    if (dto.titleUz !== undefined) banner.titleUz = dto.titleUz ?? null;
    if (dto.descriptionUz !== undefined)
      banner.descriptionUz = dto.descriptionUz ?? null;
    if (dto.imageUrl !== undefined) banner.imageUrl = dto.imageUrl ?? null;
    if (dto.imageUrlMobile !== undefined)
      banner.imageUrlMobile = dto.imageUrlMobile ?? null;
    if (dto.linkUrl !== undefined) banner.linkUrl = dto.linkUrl ?? null;
    if (dto.buttonTextRu !== undefined)
      banner.buttonTextRu = dto.buttonTextRu ?? null;
    if (dto.buttonTextUz !== undefined)
      banner.buttonTextUz = dto.buttonTextUz ?? null;
    if (dto.position !== undefined) banner.position = dto.position;
    if (dto.status !== undefined) banner.status = dto.status;
    if (dto.sortOrder !== undefined) banner.sortOrder = dto.sortOrder;
    if (dto.validFrom !== undefined)
      banner.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    if (dto.validUntil !== undefined)
      banner.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (dto.backgroundColor !== undefined)
      banner.backgroundColor = dto.backgroundColor ?? null;
    if (dto.textColor !== undefined) banner.textColor = dto.textColor ?? null;

    banner.updatedById = userId;

    return this.bannerRepository.save(banner);
  }

  async deleteBanner(organizationId: string, id: string): Promise<void> {
    const banner = await this.getBannerById(organizationId, id);
    await this.bannerRepository.softDelete(banner.id);
  }
}
