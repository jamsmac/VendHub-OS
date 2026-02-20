import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  async create(data: Partial<Location>): Promise<Location> {
    const location = this.locationRepository.create(data);
    return this.locationRepository.save(location);
  }

  async findAll(
    organizationId: string,
    options?: { page?: number; limit?: number; search?: string },
  ): Promise<{ data: Location[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 50, search } = options || {};

    const query = this.locationRepository
      .createQueryBuilder('location')
      .where('location.organizationId = :organizationId', { organizationId });

    if (search) {
      query.andWhere(
        '(location.name ILIKE :search OR location.address ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await query.getCount();

    query.orderBy('location.name', 'ASC');
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

  async findById(id: string): Promise<Location | null> {
    return this.locationRepository.findOne({ where: { id } });
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    organizationId?: string,
    limit = 50,
  ): Promise<Location[]> {
    const safeLimit = Math.min(limit, 100);
    const query = this.locationRepository
      .createQueryBuilder('location')
      .addSelect(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(location.latitude)) * cos(radians(location.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(location.latitude))))`,
        'distance',
      )
      .where('location.isActive = true')
      .setParameters({ lat, lng })
      .having('distance < :radius', { radius: radiusKm })
      .orderBy('distance', 'ASC')
      .take(safeLimit);

    if (organizationId) {
      query.andWhere('location.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  async update(id: string, data: Partial<Location>): Promise<Location> {
    const location = await this.findById(id);
    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }
    Object.assign(location, data);
    return this.locationRepository.save(location);
  }

  async remove(id: string): Promise<void> {
    const location = await this.findById(id);
    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }
    await this.locationRepository.softDelete(id);
  }
}
