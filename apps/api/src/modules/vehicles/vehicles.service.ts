import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle, VehicleType, VehicleStatus } from './entities/vehicle.entity';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/create-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  async create(dto: CreateVehicleDto, organizationId: string, userId?: string): Promise<Vehicle> {
    const existing = await this.vehicleRepository.findOne({
      where: { plateNumber: dto.plateNumber, organizationId },
    });
    if (existing) {
      throw new BadRequestException(`Vehicle with plate ${dto.plateNumber} already exists in this organization`);
    }

    const vehicle = this.vehicleRepository.create({
      organizationId,
      ownerEmployeeId: dto.ownerEmployeeId ?? null,
      type: dto.type,
      brand: dto.brand,
      model: dto.model ?? null,
      plateNumber: dto.plateNumber,
      currentOdometer: dto.currentOdometer ?? 0,
      notes: dto.notes ?? null,
      created_by_id: userId,
    });

    return this.vehicleRepository.save(vehicle);
  }

  async findAll(
    organizationId: string,
    filters?: {
      type?: VehicleType;
      ownerId?: string;
      status?: VehicleStatus;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { type, ownerId, status, search, page = 1, limit = 20 } = filters || {};

    const query = this.vehicleRepository.createQueryBuilder('vehicle');
    query.where('vehicle.organizationId = :organizationId', { organizationId });

    if (type) {
      query.andWhere('vehicle.type = :type', { type });
    }
    if (ownerId) {
      query.andWhere('vehicle.ownerEmployeeId = :ownerId', { ownerId });
    }
    if (status) {
      query.andWhere('vehicle.status = :status', { status });
    }
    if (search) {
      query.andWhere(
        '(vehicle.brand ILIKE :search OR vehicle.model ILIKE :search OR vehicle.plateNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await query.getCount();
    query.orderBy('vehicle.brand', 'ASC').addOrderBy('vehicle.model', 'ASC');
    query.skip((page - 1) * limit).take(limit);

    const data = await query.getMany();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Vehicle | null> {
    return this.vehicleRepository.findOne({ where: { id } });
  }

  async update(id: string, dto: UpdateVehicleDto, userId?: string): Promise<Vehicle> {
    const vehicle = await this.findById(id);
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    if (dto.ownerEmployeeId !== undefined) vehicle.ownerEmployeeId = dto.ownerEmployeeId ?? null;
    if (dto.type !== undefined) vehicle.type = dto.type;
    if (dto.brand !== undefined) vehicle.brand = dto.brand;
    if (dto.model !== undefined) vehicle.model = dto.model ?? null;
    if (dto.plateNumber !== undefined && dto.plateNumber !== vehicle.plateNumber) {
      const existingWithPlate = await this.vehicleRepository.findOne({
        where: { plateNumber: dto.plateNumber, organizationId: vehicle.organizationId },
      });
      if (existingWithPlate && existingWithPlate.id !== id) {
        throw new BadRequestException(`Vehicle with plate ${dto.plateNumber} already exists in this organization`);
      }
      vehicle.plateNumber = dto.plateNumber;
    }
    if (dto.currentOdometer !== undefined) {
      vehicle.currentOdometer = dto.currentOdometer;
      vehicle.lastOdometerUpdate = new Date();
    }
    if (dto.status !== undefined) vehicle.status = dto.status;
    if (dto.notes !== undefined) vehicle.notes = dto.notes ?? null;
    vehicle.updated_by_id = userId ?? vehicle.updated_by_id;

    return this.vehicleRepository.save(vehicle);
  }

  async updateOdometer(id: string, odometer: number, userId?: string): Promise<Vehicle> {
    const vehicle = await this.findById(id);
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    vehicle.currentOdometer = odometer;
    vehicle.lastOdometerUpdate = new Date();
    vehicle.updated_by_id = userId ?? vehicle.updated_by_id;

    return this.vehicleRepository.save(vehicle);
  }

  async remove(id: string): Promise<void> {
    const vehicle = await this.findById(id);
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }
    await this.vehicleRepository.softDelete(id);
  }
}
