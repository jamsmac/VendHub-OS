import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async create(data: Partial<Organization>): Promise<Organization> {
    const organization = this.organizationRepository.create(data);
    return this.organizationRepository.save(organization);
  }

  async findAll(): Promise<Organization[]> {
    return this.organizationRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findById(id: string): Promise<Organization | null> {
    return this.organizationRepository.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.organizationRepository.findOne({ where: { slug } });
  }

  async update(id: string, data: Partial<Organization>): Promise<Organization> {
    const organization = await this.findById(id);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    Object.assign(organization, data);
    return this.organizationRepository.save(organization);
  }

  async remove(id: string): Promise<void> {
    const organization = await this.findById(id);
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    await this.organizationRepository.softDelete(id);
  }
}
