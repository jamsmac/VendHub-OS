/**
 * Equipment Service
 * Business logic for equipment components, maintenance records, and movements
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  EquipmentComponent,
  ComponentMaintenance,
  ComponentMovement,
  EquipmentComponentStatus,
} from '../entities/equipment-component.entity';
import {
  CreateEquipmentComponentDto,
  UpdateEquipmentComponentDto,
  CreateComponentMaintenanceDto,
  CreateComponentMovementDto,
  EquipmentQueryDto,
  MaintenanceHistoryQueryDto,
  MovementQueryDto,
} from '../dto/create-equipment.dto';

@Injectable()
export class EquipmentService {
  private readonly logger = new Logger(EquipmentService.name);

  constructor(
    @InjectRepository(EquipmentComponent)
    private readonly componentRepository: Repository<EquipmentComponent>,
    @InjectRepository(ComponentMaintenance)
    private readonly maintenanceRepository: Repository<ComponentMaintenance>,
    @InjectRepository(ComponentMovement)
    private readonly movementRepository: Repository<ComponentMovement>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ========================================================================
  // EQUIPMENT COMPONENT CRUD
  // ========================================================================

  async createComponent(
    organizationId: string,
    userId: string,
    dto: CreateEquipmentComponentDto,
  ): Promise<EquipmentComponent> {
    const component = this.componentRepository.create({
      organizationId,
      created_by_id: userId,
      ...dto,
    });

    const saved = await this.componentRepository.save(component);

    this.eventEmitter.emit('equipment.component.created', { component: saved });
    this.logger.log(`Equipment component created: ${saved.id} (${saved.name})`);

    return saved;
  }

  async findAllComponents(
    organizationId: string,
    query: EquipmentQueryDto,
  ): Promise<{ data: EquipmentComponent[]; total: number; page: number; limit: number }> {
    const {
      machineId,
      componentType,
      componentStatus,
      search,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = query;

    const qb = this.componentRepository
      .createQueryBuilder('c')
      .where('c.organizationId = :organizationId', { organizationId })
      .andWhere('c.deleted_at IS NULL');

    if (machineId) {
      qb.andWhere('c.machineId = :machineId', { machineId });
    }
    if (componentType) {
      qb.andWhere('c.componentType = :componentType', { componentType });
    }
    if (componentStatus) {
      qb.andWhere('c.componentStatus = :componentStatus', { componentStatus });
    }
    if (search) {
      qb.andWhere('(c.name ILIKE :search OR c.serialNumber ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.orderBy(`c.${sortBy}`, sortOrder);

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOneComponent(organizationId: string, id: string): Promise<EquipmentComponent> {
    const component = await this.componentRepository.findOne({
      where: { id, organizationId },
    });

    if (!component) {
      throw new NotFoundException(`Equipment component ${id} not found`);
    }

    return component;
  }

  async updateComponent(
    organizationId: string,
    id: string,
    dto: UpdateEquipmentComponentDto,
  ): Promise<EquipmentComponent> {
    const component = await this.findOneComponent(organizationId, id);
    Object.assign(component, dto);
    const saved = await this.componentRepository.save(component);

    this.eventEmitter.emit('equipment.component.updated', { component: saved });
    return saved;
  }

  async deleteComponent(organizationId: string, id: string): Promise<void> {
    await this.findOneComponent(organizationId, id);
    await this.componentRepository.softDelete(id);
    this.eventEmitter.emit('equipment.component.deleted', { componentId: id });
  }

  // ========================================================================
  // COMPONENT MAINTENANCE
  // ========================================================================

  async createMaintenance(
    organizationId: string,
    userId: string,
    dto: CreateComponentMaintenanceDto,
  ): Promise<ComponentMaintenance> {
    // Verify component belongs to org
    await this.findOneComponent(organizationId, dto.componentId);

    const maintenance = this.maintenanceRepository.create({
      organizationId,
      performedByUserId: userId,
      created_by_id: userId,
      ...dto,
    });

    const saved = await this.maintenanceRepository.save(maintenance);

    // Update component maintenance dates
    await this.componentRepository.update(dto.componentId, {
      lastMaintenanceDate: saved.performedAt,
    });

    this.eventEmitter.emit('equipment.maintenance.created', { maintenance: saved });
    this.logger.log(`Component maintenance recorded: ${saved.id} for component ${dto.componentId}`);

    return saved;
  }

  async findMaintenanceHistory(
    organizationId: string,
    query: MaintenanceHistoryQueryDto,
  ): Promise<{ data: ComponentMaintenance[]; total: number; page: number; limit: number }> {
    const {
      componentId,
      maintenanceType,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.maintenanceRepository
      .createQueryBuilder('m')
      .where('m.organizationId = :organizationId', { organizationId })
      .andWhere('m.deleted_at IS NULL');

    if (componentId) {
      qb.andWhere('m.componentId = :componentId', { componentId });
    }
    if (maintenanceType) {
      qb.andWhere('m.maintenanceType = :maintenanceType', { maintenanceType });
    }
    if (startDate && endDate) {
      qb.andWhere('m.performedAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    qb.orderBy('m.performedAt', 'DESC');

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  // ========================================================================
  // COMPONENT MOVEMENTS
  // ========================================================================

  async createMovement(
    organizationId: string,
    userId: string,
    dto: CreateComponentMovementDto,
  ): Promise<ComponentMovement> {
    // Verify component belongs to org
    const component = await this.findOneComponent(organizationId, dto.componentId);

    if (!dto.fromMachineId && !dto.toMachineId) {
      throw new BadRequestException('At least one of fromMachineId or toMachineId must be provided');
    }

    const movement = this.movementRepository.create({
      organizationId,
      movedByUserId: userId,
      created_by_id: userId,
      ...dto,
    });

    const saved = await this.movementRepository.save(movement);

    // Update component's machineId to the destination
    if (dto.toMachineId) {
      component.machineId = dto.toMachineId;
      component.componentStatus = EquipmentComponentStatus.INSTALLED;
    } else {
      // Removed from machine
      component.machineId = null;
    }
    await this.componentRepository.save(component);

    this.eventEmitter.emit('equipment.movement.created', { movement: saved });
    this.logger.log(
      `Component ${dto.componentId} moved from ${dto.fromMachineId || 'storage'} to ${dto.toMachineId || 'storage'}`,
    );

    return saved;
  }

  async findMovementHistory(
    organizationId: string,
    query: MovementQueryDto,
  ): Promise<{ data: ComponentMovement[]; total: number; page: number; limit: number }> {
    const {
      componentId,
      machineId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.movementRepository
      .createQueryBuilder('m')
      .where('m.organizationId = :organizationId', { organizationId })
      .andWhere('m.deleted_at IS NULL');

    if (componentId) {
      qb.andWhere('m.componentId = :componentId', { componentId });
    }
    if (machineId) {
      qb.andWhere('(m.fromMachineId = :machineId OR m.toMachineId = :machineId)', { machineId });
    }
    if (startDate && endDate) {
      qb.andWhere('m.movedAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    qb.orderBy('m.movedAt', 'DESC');

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }
}
