/**
 * Spare Part Service
 * Business logic for spare parts inventory management
 */

import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { SparePart } from '../entities/equipment-component.entity';
import {
  CreateSparePartDto,
  UpdateSparePartDto,
  SparePartQueryDto,
} from '../dto/create-spare-part.dto';

@Injectable()
export class SparePartService {
  private readonly logger = new Logger(SparePartService.name);

  constructor(
    @InjectRepository(SparePart)
    private readonly sparePartRepository: Repository<SparePart>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateSparePartDto,
  ): Promise<SparePart> {
    const sparePart = this.sparePartRepository.create({
      organizationId,
      created_by_id: userId,
      ...dto,
    });

    const saved = await this.sparePartRepository.save(sparePart);
    this.logger.log(`Spare part created: ${saved.id} (${saved.partNumber} - ${saved.name})`);

    return saved;
  }

  async findAll(
    organizationId: string,
    query: SparePartQueryDto,
  ): Promise<{ data: SparePart[]; total: number; page: number; limit: number }> {
    const {
      search,
      compatibleWith,
      activeOnly = true,
      lowStockOnly,
      supplierId,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = query;

    const qb = this.sparePartRepository
      .createQueryBuilder('s')
      .where('s.organizationId = :organizationId', { organizationId })
      .andWhere('s.deleted_at IS NULL');

    if (activeOnly) {
      qb.andWhere('s.isActive = true');
    }
    if (search) {
      qb.andWhere('(s.name ILIKE :search OR s.partNumber ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (compatibleWith) {
      qb.andWhere("s.compatibleComponentTypes ::jsonb @> :compatibleWith", {
        compatibleWith: JSON.stringify([compatibleWith]),
      });
    }
    if (lowStockOnly) {
      qb.andWhere('s.quantity <= s.minQuantity');
    }
    if (supplierId) {
      qb.andWhere('s.supplierId = :supplierId', { supplierId });
    }

    qb.orderBy(`s.${sortBy}`, sortOrder);

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(organizationId: string, id: string): Promise<SparePart> {
    const sparePart = await this.sparePartRepository.findOne({
      where: { id, organizationId },
    });

    if (!sparePart) {
      throw new NotFoundException(`Spare part ${id} not found`);
    }

    return sparePart;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateSparePartDto,
  ): Promise<SparePart> {
    const sparePart = await this.findOne(organizationId, id);
    Object.assign(sparePart, dto);
    const saved = await this.sparePartRepository.save(sparePart);

    // Emit low stock event if needed
    if (saved.quantity <= saved.minQuantity) {
      this.eventEmitter.emit('equipment.spare_part.low_stock', { sparePart: saved });
    }

    return saved;
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.findOne(organizationId, id);
    await this.sparePartRepository.softDelete(id);
  }

  /**
   * Adjust quantity (used when parts are consumed during maintenance)
   */
  async adjustQuantity(
    organizationId: string,
    id: string,
    adjustment: number,
  ): Promise<SparePart> {
    const sparePart = await this.findOne(organizationId, id);

    sparePart.quantity = Math.max(0, sparePart.quantity + adjustment);
    const saved = await this.sparePartRepository.save(sparePart);

    if (saved.quantity <= saved.minQuantity) {
      this.eventEmitter.emit('equipment.spare_part.low_stock', { sparePart: saved });
    }

    return saved;
  }
}
