/**
 * Position Sub-Service
 * Handles position CRUD operations
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Position } from "../entities/position.entity";

@Injectable()
export class PositionService {
  private readonly logger = new Logger(PositionService.name);

  constructor(
    @InjectRepository(Position)
    private readonly positionRepo: Repository<Position>,
  ) {}

  /**
   * Create a position
   */
  async createPosition(
    organizationId: string,
    dto: {
      title: string;
      code: string;
      description?: string;
      departmentId?: string;
      level: string;
      minSalary?: number;
      maxSalary?: number;
      isActive?: boolean;
    },
  ): Promise<Position> {
    // Check code uniqueness
    const existing = await this.positionRepo.findOne({
      where: { code: dto.code, organizationId },
    });
    if (existing) {
      throw new ConflictException(`Position code "${dto.code}" already exists`);
    }

    const position = this.positionRepo.create({
      organizationId,
      title: dto.title,
      code: dto.code,
      description: dto.description || null,
      departmentId: dto.departmentId || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      level: dto.level as any,
      minSalary: dto.minSalary || null,
      maxSalary: dto.maxSalary || null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    await this.positionRepo.save(position);
    this.logger.log(`Position ${dto.code} created`);

    return position;
  }

  /**
   * Update a position
   */
  async updatePosition(
    positionId: string,
    organizationId: string,
    dto: {
      title?: string;
      code?: string;
      description?: string;
      departmentId?: string;
      level?: string;
      minSalary?: number;
      maxSalary?: number;
      isActive?: boolean;
    },
  ): Promise<Position> {
    const position = await this.positionRepo.findOne({
      where: { id: positionId, organizationId },
    });
    if (!position) {
      throw new NotFoundException("Position not found");
    }

    if (dto.code && dto.code !== position.code) {
      const existing = await this.positionRepo.findOne({
        where: { code: dto.code, organizationId },
      });
      if (existing) {
        throw new ConflictException(
          `Position code "${dto.code}" already exists`,
        );
      }
    }

    Object.assign(position, dto);
    await this.positionRepo.save(position);

    return position;
  }

  /**
   * Get positions list
   */
  async getPositions(
    organizationId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      departmentId?: string;
      isActive?: boolean;
    },
  ): Promise<{
    items: Position[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, search, departmentId, isActive } = query;

    const qb = this.positionRepo
      .createQueryBuilder("p")
      .where("p.organizationId = :organizationId", { organizationId });

    if (search) {
      qb.andWhere("(p.title ILIKE :search OR p.code ILIKE :search)", {
        search: `%${search}%`,
      });
    }

    if (departmentId) {
      qb.andWhere("p.departmentId = :departmentId", { departmentId });
    }

    if (isActive !== undefined) {
      qb.andWhere("p.isActive = :isActive", { isActive });
    }

    const [items, total] = await qb
      .orderBy("p.title", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single position by ID
   */
  async getPosition(
    positionId: string,
    organizationId: string,
  ): Promise<Position> {
    const position = await this.positionRepo.findOne({
      where: { id: positionId, organizationId },
    });
    if (!position) {
      throw new NotFoundException("Position not found");
    }
    return position;
  }
}
