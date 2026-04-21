import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { Category } from "./entities/category.entity";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  async list(organizationId: string): Promise<Category[]> {
    return this.repo.find({
      where: { organizationId, deletedAt: IsNull() },
      order: { sortOrder: "ASC", name: "ASC" },
    });
  }

  async findById(id: string, organizationId: string): Promise<Category> {
    const entity = await this.repo.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
    });
    if (!entity) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return entity;
  }

  async create(
    organizationId: string,
    dto: CreateCategoryDto,
    userId?: string,
  ): Promise<Category> {
    const existing = await this.repo.findOne({
      where: { organizationId, code: dto.code, deletedAt: IsNull() },
    });
    if (existing) {
      throw new ConflictException(
        `Category with code "${dto.code}" already exists`,
      );
    }

    const entity = this.repo.create({
      organizationId,
      code: dto.code,
      name: dto.name,
      icon: dto.icon ?? null,
      color: dto.color ?? null,
      sortOrder: dto.sortOrder ?? 0,
      defaultMarkup: dto.defaultMarkup ?? null,
      createdById: userId ?? null,
      updatedById: userId ?? null,
    });
    return this.repo.save(entity);
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateCategoryDto,
    userId?: string,
  ): Promise<Category> {
    const entity = await this.findById(id, organizationId);

    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.icon !== undefined) entity.icon = dto.icon;
    if (dto.color !== undefined) entity.color = dto.color;
    if (dto.sortOrder !== undefined) entity.sortOrder = dto.sortOrder;
    if (dto.defaultMarkup !== undefined)
      entity.defaultMarkup = dto.defaultMarkup;
    entity.updatedById = userId ?? null;

    return this.repo.save(entity);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const entity = await this.findById(id, organizationId);
    await this.repo.softRemove(entity);
  }
}
