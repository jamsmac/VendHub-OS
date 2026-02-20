/**
 * Containers Service
 * Full CRUD for managing hoppers/bunkers within vending machines
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Container, ContainerStatus } from "./entities/container.entity";
import { CreateContainerDto } from "./dto/create-container.dto";
import { UpdateContainerDto } from "./dto/update-container.dto";
import { RefillContainerDto } from "./dto/refill-container.dto";

@Injectable()
export class ContainersService {
  constructor(
    @InjectRepository(Container)
    private readonly containerRepository: Repository<Container>,
  ) {}

  // ============================================================================
  // CRUD
  // ============================================================================

  /**
   * Get all containers with optional filters and pagination
   */
  async findAll(
    organizationId: string,
    filters?: {
      machineId?: string;
      status?: ContainerStatus;
      page?: number;
      limit?: number;
    },
  ) {
    const { machineId, status, page = 1, limit: rawLimit = 20 } = filters || {};
    const limit = Math.min(rawLimit, 100);

    const query = this.containerRepository.createQueryBuilder("container");

    query.where("container.organizationId = :organizationId", {
      organizationId,
    });

    if (machineId) {
      query.andWhere("container.machineId = :machineId", { machineId });
    }

    if (status) {
      query.andWhere("container.status = :status", { status });
    }

    const total = await query.getCount();

    query.orderBy("container.slotNumber", "ASC");
    query.skip((page - 1) * limit);
    query.take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single container by ID (scoped to organization)
   */
  async findOne(id: string, organizationId: string): Promise<Container> {
    const container = await this.containerRepository.findOne({
      where: { id, organizationId },
      relations: ["machine", "nomenclature"],
    });

    if (!container) {
      throw new NotFoundException(`Container with ID ${id} not found`);
    }

    return container;
  }

  /**
   * Get all containers for a specific machine
   */
  async findByMachine(
    machineId: string,
    organizationId: string,
  ): Promise<Container[]> {
    return this.containerRepository.find({
      where: { machineId, organizationId },
      order: { slotNumber: "ASC" },
    });
  }

  /**
   * Create a new container
   * Validates unique slotNumber per machine
   */
  async create(
    dto: CreateContainerDto,
    organizationId: string,
    userId?: string,
  ): Promise<Container> {
    // Check for duplicate slot number on the same machine
    const existing = await this.containerRepository.findOne({
      where: {
        machineId: dto.machineId,
        slotNumber: dto.slotNumber,
        organizationId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Slot ${dto.slotNumber} already exists on machine ${dto.machineId}`,
      );
    }

    const container = this.containerRepository.create({
      ...dto,
      organizationId,
      nomenclatureId: dto.nomenclatureId ?? null,
      name: dto.name ?? null,
      currentQuantity: dto.currentQuantity ?? 0,
      unit: dto.unit ?? "g",
      minLevel: dto.minLevel ?? null,
      status: dto.status ?? ContainerStatus.ACTIVE,
      metadata: dto.metadata ?? null,
      notes: dto.notes ?? null,
      createdById: userId,
    });

    return this.containerRepository.save(container);
  }

  /**
   * Update a container
   * Auto-transitions to EMPTY when currentQuantity reaches 0
   */
  async update(
    id: string,
    dto: UpdateContainerDto,
    organizationId: string,
    userId?: string,
  ): Promise<Container> {
    const container = await this.findOne(id, organizationId);

    // If changing slotNumber, verify uniqueness
    if (
      dto.slotNumber !== undefined &&
      dto.slotNumber !== container.slotNumber
    ) {
      const machineId = dto.machineId ?? container.machineId;
      const existing = await this.containerRepository.findOne({
        where: {
          machineId,
          slotNumber: dto.slotNumber,
          organizationId,
        },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Slot ${dto.slotNumber} already exists on machine ${machineId}`,
        );
      }
    }

    Object.assign(container, dto);
    container.updatedById = userId ?? container.updatedById;

    // Auto-transition to EMPTY when currentQuantity = 0
    if (
      Number(container.currentQuantity) <= 0 &&
      container.status === ContainerStatus.ACTIVE
    ) {
      container.status = ContainerStatus.EMPTY;
    }

    return this.containerRepository.save(container);
  }

  /**
   * Refill a container with additional product
   * Validates capacity, stores refill history in metadata
   */
  async refill(
    id: string,
    dto: RefillContainerDto,
    organizationId: string,
    userId?: string,
  ): Promise<Container> {
    const container = await this.findOne(id, organizationId);

    const currentQty = Number(container.currentQuantity);
    const newQuantity = currentQty + dto.quantity;
    const capacity = Number(container.capacity);

    if (newQuantity > capacity) {
      throw new BadRequestException(
        `Refill would exceed container capacity. Current: ${currentQty}, Adding: ${dto.quantity}, Capacity: ${capacity}`,
      );
    }

    container.currentQuantity = newQuantity;
    container.lastRefillDate = new Date();
    container.updatedById = userId ?? container.updatedById;

    // If container was empty, set back to active
    if (container.status === ContainerStatus.EMPTY && newQuantity > 0) {
      container.status = ContainerStatus.ACTIVE;
    }

    // Store refill history in metadata
    const refillHistory = (container.metadata as Record<string, unknown>)
      ?.refillHistory as Array<Record<string, unknown>> | undefined;
    const history = refillHistory ?? [];

    history.push({
      quantity: dto.quantity,
      date: new Date().toISOString(),
      userId: userId ?? null,
      notes: dto.notes ?? null,
      batchNumber: dto.batchNumber ?? null,
      previousQuantity: currentQty,
      newQuantity,
    });

    // Keep last 50 refill records
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    container.metadata = {
      ...(container.metadata ?? {}),
      refillHistory: history,
    };

    return this.containerRepository.save(container);
  }

  /**
   * Deduct quantity from a container (for sale events)
   * Auto-transitions to EMPTY status when quantity reaches 0
   */
  async deductQuantity(
    id: string,
    quantity: number,
    organizationId: string,
  ): Promise<Container> {
    const container = await this.findOne(id, organizationId);

    const currentQty = Number(container.currentQuantity);

    if (quantity > currentQty) {
      throw new BadRequestException(
        `Insufficient quantity. Current: ${currentQty}, Requested: ${quantity}`,
      );
    }

    container.currentQuantity = currentQty - quantity;

    // Auto-transition to EMPTY
    if (Number(container.currentQuantity) <= 0) {
      container.status = ContainerStatus.EMPTY;
    }

    return this.containerRepository.save(container);
  }

  /**
   * Soft delete a container
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const container = await this.findOne(id, organizationId);
    await this.containerRepository.softDelete(container.id);
  }

  // ============================================================================
  // ANALYTICS / MONITORING
  // ============================================================================

  /**
   * Check containers with low levels for a machine
   * Returns containers that are below their minLevel threshold
   */
  async checkLowLevels(
    machineId: string,
    organizationId: string,
  ): Promise<
    Array<{
      container: Container;
      fillPercentage: number;
      deficit: number;
    }>
  > {
    const containers = await this.containerRepository.find({
      where: { machineId, organizationId, status: ContainerStatus.ACTIVE },
      order: { slotNumber: "ASC" },
    });

    return containers
      .filter((c) => {
        if (c.minLevel === null || c.minLevel === undefined) return false;
        return Number(c.currentQuantity) <= Number(c.minLevel);
      })
      .map((c) => ({
        container: c,
        fillPercentage:
          Number(c.capacity) > 0
            ? Math.round((Number(c.currentQuantity) / Number(c.capacity)) * 100)
            : 0,
        deficit: Math.max(0, Number(c.capacity) - Number(c.currentQuantity)),
      }));
  }

  /**
   * Get statistics for containers of a specific machine
   */
  async getStatsByMachine(
    machineId: string,
    organizationId: string,
  ): Promise<{
    total: number;
    active: number;
    empty: number;
    maintenance: number;
    avgFillPercentage: number;
  }> {
    const containers = await this.containerRepository.find({
      where: { machineId, organizationId },
    });

    const total = containers.length;
    const active = containers.filter(
      (c) => c.status === ContainerStatus.ACTIVE,
    ).length;
    const empty = containers.filter(
      (c) => c.status === ContainerStatus.EMPTY,
    ).length;
    const maintenance = containers.filter(
      (c) => c.status === ContainerStatus.MAINTENANCE,
    ).length;

    let avgFillPercentage = 0;
    if (total > 0) {
      const totalPercentage = containers.reduce((sum, c) => {
        const capacity = Number(c.capacity);
        if (capacity <= 0) return sum;
        return sum + Math.round((Number(c.currentQuantity) / capacity) * 100);
      }, 0);
      avgFillPercentage = Math.round(totalPercentage / total);
    }

    return {
      total,
      active,
      empty,
      maintenance,
      avgFillPercentage,
    };
  }
}
