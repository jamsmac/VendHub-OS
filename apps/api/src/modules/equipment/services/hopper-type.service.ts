/**
 * Hopper Type Service
 * Business logic for hopper type dictionary management
 */

import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { HopperType } from '../entities/equipment-component.entity';
import {
  CreateHopperTypeDto,
  UpdateHopperTypeDto,
  HopperTypeQueryDto,
} from '../dto/create-hopper-type.dto';

@Injectable()
export class HopperTypeService {
  private readonly logger = new Logger(HopperTypeService.name);

  constructor(
    @InjectRepository(HopperType)
    private readonly hopperTypeRepository: Repository<HopperType>,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateHopperTypeDto,
  ): Promise<HopperType> {
    const hopperType = this.hopperTypeRepository.create({
      organizationId,
      created_by_id: userId,
      ...dto,
    });

    const saved = await this.hopperTypeRepository.save(hopperType);
    this.logger.log(`Hopper type created: ${saved.id} (${saved.name})`);

    return saved;
  }

  async findAll(
    organizationId: string,
    query: HopperTypeQueryDto,
  ): Promise<{ data: HopperType[]; total: number; page: number; limit: number }> {
    const {
      search,
      activeOnly = true,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.hopperTypeRepository
      .createQueryBuilder('h')
      .where('h.organizationId = :organizationId', { organizationId })
      .andWhere('h.deleted_at IS NULL');

    if (activeOnly) {
      qb.andWhere('h.isActive = true');
    }
    if (search) {
      qb.andWhere('h.name ILIKE :search', { search: `%${search}%` });
    }

    qb.orderBy('h.name', 'ASC');

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(organizationId: string, id: string): Promise<HopperType> {
    const hopperType = await this.hopperTypeRepository.findOne({
      where: { id, organizationId },
    });

    if (!hopperType) {
      throw new NotFoundException(`Hopper type ${id} not found`);
    }

    return hopperType;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateHopperTypeDto,
  ): Promise<HopperType> {
    const hopperType = await this.findOne(organizationId, id);
    Object.assign(hopperType, dto);
    return this.hopperTypeRepository.save(hopperType);
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.findOne(organizationId, id);
    await this.hopperTypeRepository.softDelete(id);
  }
}
