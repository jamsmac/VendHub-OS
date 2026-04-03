import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { SiteCmsItem } from "./entities/site-cms-item.entity";
import { CreateSiteCmsItemDto, UpdateSiteCmsItemDto } from "./dto/site-cms.dto";

const ALLOWED_COLLECTIONS = [
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
] as const;

type Collection = (typeof ALLOWED_COLLECTIONS)[number];

@Injectable()
export class SiteCmsService {
  private readonly logger = new Logger(SiteCmsService.name);

  constructor(
    @InjectRepository(SiteCmsItem)
    private readonly repo: Repository<SiteCmsItem>,
  ) {}

  private validateCollection(collection: string): Collection {
    if (!ALLOWED_COLLECTIONS.includes(collection as Collection)) {
      throw new NotFoundException(`Unknown collection: ${collection}`);
    }
    return collection as Collection;
  }

  /** List items in a collection, ordered by sortOrder */
  async findByCollection(
    organizationId: string,
    collection: string,
    opts?: { isActive?: boolean; search?: string },
  ) {
    const col = this.validateCollection(collection);

    const qb = this.repo
      .createQueryBuilder("item")
      .where("item.collection = :col", { col })
      .andWhere("item.organizationId = :organizationId", { organizationId })
      .andWhere("item.deletedAt IS NULL");

    if (opts?.isActive !== undefined) {
      qb.andWhere("item.isActive = :isActive", { isActive: opts.isActive });
    }

    if (opts?.search) {
      qb.andWhere("item.data::text ILIKE :search", {
        search: `%${opts.search}%`,
      });
    }

    qb.orderBy("item.sortOrder", "ASC").addOrderBy("item.createdAt", "ASC");

    const items = await qb.getMany();
    return items.map((item) => this.flatten(item));
  }

  /** Count items in a collection */
  async countByCollection(
    organizationId: string,
    collection: string,
    opts?: { isActive?: boolean },
  ): Promise<number> {
    const col = this.validateCollection(collection);

    const qb = this.repo
      .createQueryBuilder("item")
      .where("item.collection = :col", { col })
      .andWhere("item.organizationId = :organizationId", { organizationId })
      .andWhere("item.deletedAt IS NULL");

    if (opts?.isActive !== undefined) {
      qb.andWhere("item.isActive = :isActive", { isActive: opts.isActive });
    }

    return qb.getCount();
  }

  /** Get single item by ID */
  async findById(organizationId: string, id: string) {
    const item = await this.repo.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
    });
    if (!item) throw new NotFoundException(`Item ${id} not found`);
    return this.flatten(item);
  }

  /** Create item */
  async create(
    organizationId: string,
    collection: string,
    dto: CreateSiteCmsItemDto,
    userId?: string,
  ) {
    const col = this.validateCollection(collection);

    const item = this.repo.create({
      collection: col,
      organizationId,
      data: dto.data,
      sortOrder:
        dto.sortOrder ??
        ((dto.data as Record<string, unknown>).sort_order as number) ??
        0,
      isActive:
        dto.isActive ??
        ((dto.data as Record<string, unknown>).is_active as boolean) ??
        true,
      createdById: userId ?? null,
      updatedById: userId ?? null,
    });

    const saved = await this.repo.save(item);
    return this.flatten(saved);
  }

  /** Update item */
  async update(
    organizationId: string,
    id: string,
    dto: UpdateSiteCmsItemDto,
    userId?: string,
  ) {
    const item = await this.repo.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
    });
    if (!item) throw new NotFoundException(`Item ${id} not found`);

    if (dto.data !== undefined) {
      // Merge data: new fields overwrite, existing fields preserved
      item.data = { ...item.data, ...dto.data };
    }
    if (dto.sortOrder !== undefined) item.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) item.isActive = dto.isActive;
    item.updatedById = userId ?? null;

    const saved = await this.repo.save(item);
    return this.flatten(saved);
  }

  /** Soft delete item */
  async remove(organizationId: string, id: string) {
    const item = await this.repo.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
    });
    if (!item) throw new NotFoundException(`Item ${id} not found`);
    await this.repo.softRemove(item);
  }

  /** Flatten entity into a frontend-friendly shape: { id, ...data, sort_order, is_active, created_at, updated_at } */
  private flatten(item: SiteCmsItem): Record<string, unknown> {
    return {
      id: item.id,
      ...(item.data as Record<string, unknown>),
      sort_order: item.sortOrder,
      is_active: item.isActive,
      created_at: item.createdAt?.toISOString(),
      updated_at: item.updatedAt?.toISOString(),
    };
  }
}
