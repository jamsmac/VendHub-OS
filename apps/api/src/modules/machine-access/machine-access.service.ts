/**
 * Machine Access Service for VendHub OS
 * Управление доступом к автоматам с шаблонами
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MachineAccess,
  AccessTemplate,
  AccessTemplateRow,
  MachineAccessRole,
} from './entities/machine-access.entity';
import { CreateMachineAccessDto, RevokeMachineAccessDto } from './dto/create-machine-access.dto';
import { CreateAccessTemplateDto, UpdateAccessTemplateDto } from './dto/create-access-template.dto';

@Injectable()
export class MachineAccessService {
  private readonly logger = new Logger(MachineAccessService.name);

  constructor(
    @InjectRepository(MachineAccess)
    private readonly accessRepo: Repository<MachineAccess>,
    @InjectRepository(AccessTemplate)
    private readonly templateRepo: Repository<AccessTemplate>,
    @InjectRepository(AccessTemplateRow)
    private readonly templateRowRepo: Repository<AccessTemplateRow>,
  ) {}

  // ============================================================================
  // ACCESS CRUD
  // ============================================================================

  /**
   * Grant access to a machine for a user
   */
  async grantAccess(
    dto: CreateMachineAccessDto,
    grantedByUserId: string,
    organizationId: string,
  ): Promise<MachineAccess> {
    // Check for existing active access
    const existing = await this.accessRepo.findOne({
      where: {
        organization_id: organizationId,
        machine_id: dto.machine_id,
        user_id: dto.user_id,
        is_active: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        `User ${dto.user_id} already has active access to machine ${dto.machine_id}`,
      );
    }

    const access = this.accessRepo.create({
      organization_id: organizationId,
      machine_id: dto.machine_id,
      user_id: dto.user_id,
      role: dto.role,
      granted_by_user_id: grantedByUserId,
      is_active: true,
      valid_from: dto.valid_from ? new Date(dto.valid_from) : null,
      valid_to: dto.valid_to ? new Date(dto.valid_to) : null,
      notes: dto.notes || null,
      metadata: dto.metadata || {},
    });

    const saved = await this.accessRepo.save(access);
    this.logger.log(
      `Access granted: user=${dto.user_id} machine=${dto.machine_id} role=${dto.role} by=${grantedByUserId}`,
    );

    return saved;
  }

  /**
   * Revoke access from a machine for a user
   */
  async revokeAccess(
    dto: RevokeMachineAccessDto,
    revokedByUserId: string,
    organizationId: string,
  ): Promise<MachineAccess> {
    const access = await this.accessRepo.findOne({
      where: {
        id: dto.access_id,
        organization_id: organizationId,
      },
    });

    if (!access) {
      throw new NotFoundException(`Machine access record ${dto.access_id} not found`);
    }

    if (!access.is_active) {
      throw new BadRequestException('Access is already revoked');
    }

    access.is_active = false;
    access.notes = dto.reason
      ? `${access.notes || ''}\nRevoked: ${dto.reason}`.trim()
      : access.notes;
    access.updated_by_id = revokedByUserId;

    const saved = await this.accessRepo.save(access);
    this.logger.log(
      `Access revoked: id=${dto.access_id} by=${revokedByUserId}`,
    );

    return saved;
  }

  /**
   * Get all access records for a specific machine
   */
  async getAccessByMachine(
    machineId: string,
    organizationId: string,
    includeInactive = false,
  ): Promise<MachineAccess[]> {
    const where: any = {
      machine_id: machineId,
      organization_id: organizationId,
    };

    if (!includeInactive) {
      where.is_active = true;
    }

    return this.accessRepo.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get all access records for a specific user
   */
  async getAccessByUser(
    userId: string,
    organizationId: string,
    includeInactive = false,
  ): Promise<MachineAccess[]> {
    const where: any = {
      user_id: userId,
      organization_id: organizationId,
    };

    if (!includeInactive) {
      where.is_active = true;
    }

    return this.accessRepo.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Find a specific access record by ID
   */
  async findById(id: string, organizationId: string): Promise<MachineAccess> {
    const access = await this.accessRepo.findOne({
      where: { id, organization_id: organizationId },
    });

    if (!access) {
      throw new NotFoundException(`Machine access record ${id} not found`);
    }

    return access;
  }

  /**
   * Find all access records for an organization (paginated)
   */
  async findAll(
    organizationId: string,
    options?: { page?: number; limit?: number; machineId?: string; userId?: string },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const qb = this.accessRepo.createQueryBuilder('ma');
    qb.where('ma.organization_id = :organizationId', { organizationId });

    if (options?.machineId) {
      qb.andWhere('ma.machine_id = :machineId', { machineId: options.machineId });
    }

    if (options?.userId) {
      qb.andWhere('ma.user_id = :userId', { userId: options.userId });
    }

    const total = await qb.getCount();

    qb.orderBy('ma.created_at', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Soft delete a machine access record
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const access = await this.findById(id, organizationId);
    await this.accessRepo.softDelete(access.id);
    this.logger.log(`Machine access ${id} soft deleted`);
  }

  // ============================================================================
  // TEMPLATE CRUD
  // ============================================================================

  /**
   * Create a new access template
   */
  async createTemplate(
    dto: CreateAccessTemplateDto,
    organizationId: string,
  ): Promise<AccessTemplate> {
    const template = this.templateRepo.create({
      organization_id: organizationId,
      name: dto.name,
      description: dto.description || null,
      is_active: dto.is_active !== undefined ? dto.is_active : true,
      metadata: dto.metadata || {},
    });

    const savedTemplate = await this.templateRepo.save(template);

    // Create template rows
    if (dto.rows?.length) {
      const rows = dto.rows.map((row) =>
        this.templateRowRepo.create({
          template_id: savedTemplate.id,
          role: row.role,
          permissions: row.permissions || {},
        }),
      );
      await this.templateRowRepo.save(rows);
    }

    this.logger.log(`Access template created: ${savedTemplate.id} name=${dto.name}`);

    return this.findTemplateById(savedTemplate.id, organizationId);
  }

  /**
   * Update an existing access template
   */
  async updateTemplate(
    id: string,
    dto: UpdateAccessTemplateDto,
    organizationId: string,
  ): Promise<AccessTemplate> {
    const template = await this.findTemplateById(id, organizationId);

    if (dto.name !== undefined) template.name = dto.name;
    if (dto.description !== undefined) template.description = dto.description || null;
    if (dto.is_active !== undefined) template.is_active = dto.is_active;
    if (dto.metadata !== undefined) template.metadata = dto.metadata || {};

    await this.templateRepo.save(template);

    // Replace rows if provided
    if (dto.rows !== undefined) {
      // Soft-delete existing rows
      const existingRows = await this.templateRowRepo.find({
        where: { template_id: id },
      });
      if (existingRows.length > 0) {
        await this.templateRowRepo.softRemove(existingRows);
      }

      // Create new rows
      const rows = dto.rows.map((row) =>
        this.templateRowRepo.create({
          template_id: id,
          role: row.role,
          permissions: row.permissions || {},
        }),
      );
      await this.templateRowRepo.save(rows);
    }

    this.logger.log(`Access template updated: ${id}`);

    return this.findTemplateById(id, organizationId);
  }

  /**
   * Find a template by ID
   */
  async findTemplateById(
    id: string,
    organizationId: string,
  ): Promise<AccessTemplate> {
    const template = await this.templateRepo.findOne({
      where: { id, organization_id: organizationId },
      relations: ['rows'],
    });

    if (!template) {
      throw new NotFoundException(`Access template ${id} not found`);
    }

    return template;
  }

  /**
   * List all templates for an organization
   */
  async findAllTemplates(
    organizationId: string,
    includeInactive = false,
  ): Promise<AccessTemplate[]> {
    const where: any = { organization_id: organizationId };
    if (!includeInactive) {
      where.is_active = true;
    }

    return this.templateRepo.find({
      where,
      relations: ['rows'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Soft delete a template
   */
  async removeTemplate(id: string, organizationId: string): Promise<void> {
    const template = await this.findTemplateById(id, organizationId);
    await this.templateRepo.softDelete(template.id);
    this.logger.log(`Access template ${id} soft deleted`);
  }

  // ============================================================================
  // APPLY TEMPLATE
  // ============================================================================

  /**
   * Apply a template to grant access for multiple users to a machine
   */
  async applyTemplate(
    templateId: string,
    machineId: string,
    userIds: string[],
    grantedByUserId: string,
    organizationId: string,
  ): Promise<MachineAccess[]> {
    const template = await this.findTemplateById(templateId, organizationId);

    if (!template.is_active) {
      throw new BadRequestException('Cannot apply an inactive template');
    }

    if (!template.rows?.length) {
      throw new BadRequestException('Template has no rows defined');
    }

    const results: MachineAccess[] = [];

    for (const userId of userIds) {
      for (const row of template.rows) {
        try {
          const access = await this.grantAccess(
            {
              machine_id: machineId,
              user_id: userId,
              role: row.role,
              metadata: {
                applied_from_template: templateId,
                template_name: template.name,
                permissions: row.permissions,
              },
            },
            grantedByUserId,
            organizationId,
          );
          results.push(access);
        } catch (error) {
          // Skip conflicts (user already has access) and continue
          if (error instanceof ConflictException) {
            this.logger.warn(
              `Skipped duplicate: user=${userId} machine=${machineId} role=${row.role}`,
            );
            continue;
          }
          throw error;
        }
      }
    }

    this.logger.log(
      `Template ${templateId} applied: ${results.length} access records created for machine ${machineId}`,
    );

    return results;
  }
}
