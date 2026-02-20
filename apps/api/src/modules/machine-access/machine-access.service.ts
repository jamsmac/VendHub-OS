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
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsWhere } from "typeorm";
import {
  MachineAccess,
  AccessTemplate,
  AccessTemplateRow,
} from "./entities/machine-access.entity";
import {
  CreateMachineAccessDto,
  RevokeMachineAccessDto,
} from "./dto/create-machine-access.dto";
import {
  CreateAccessTemplateDto,
  UpdateAccessTemplateDto,
} from "./dto/create-access-template.dto";

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
        organizationId,
        machineId: dto.machineId,
        userId: dto.userId,
        isActive: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        `User ${dto.userId} already has active access to machine ${dto.machineId}`,
      );
    }

    const access = this.accessRepo.create({
      organizationId,
      machineId: dto.machineId,
      userId: dto.userId,
      role: dto.role,
      grantedByUserId,
      isActive: true,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
      validTo: dto.validTo ? new Date(dto.validTo) : null,
      notes: dto.notes || null,
      metadata: dto.metadata || {},
    });

    const saved = await this.accessRepo.save(access);
    this.logger.log(
      `Access granted: user=${dto.userId} machine=${dto.machineId} role=${dto.role} by=${grantedByUserId}`,
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
        id: dto.accessId,
        organizationId,
      },
    });

    if (!access) {
      throw new NotFoundException(
        `Machine access record ${dto.accessId} not found`,
      );
    }

    if (!access.isActive) {
      throw new BadRequestException("Access is already revoked");
    }

    access.isActive = false;
    access.notes = dto.reason
      ? `${access.notes || ""}\nRevoked: ${dto.reason}`.trim()
      : access.notes;
    access.updatedById = revokedByUserId;

    const saved = await this.accessRepo.save(access);
    this.logger.log(`Access revoked: id=${dto.accessId} by=${revokedByUserId}`);

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
    const where: FindOptionsWhere<MachineAccess> = {
      machineId,
      organizationId,
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    return this.accessRepo.find({
      where,
      order: { createdAt: "DESC" },
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
    const where: FindOptionsWhere<MachineAccess> = {
      userId,
      organizationId,
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    return this.accessRepo.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Find a specific access record by ID
   */
  async findById(id: string, organizationId: string): Promise<MachineAccess> {
    const access = await this.accessRepo.findOne({
      where: { id, organizationId },
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
    options?: {
      page?: number;
      limit?: number;
      machineId?: string;
      userId?: string;
    },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const qb = this.accessRepo.createQueryBuilder("ma");
    qb.where("ma.organizationId = :organizationId", { organizationId });

    if (options?.machineId) {
      qb.andWhere("ma.machineId = :machineId", {
        machineId: options.machineId,
      });
    }

    if (options?.userId) {
      qb.andWhere("ma.userId = :userId", { userId: options.userId });
    }

    const total = await qb.getCount();

    qb.orderBy("ma.createdAt", "DESC");
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
      organizationId,
      name: dto.name,
      description: dto.description || null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      metadata: dto.metadata || {},
    });

    const savedTemplate = await this.templateRepo.save(template);

    // Create template rows
    if (dto.rows?.length) {
      const rows = dto.rows.map((row) =>
        this.templateRowRepo.create({
          templateId: savedTemplate.id,
          role: row.role,
          permissions: row.permissions || {},
        }),
      );
      await this.templateRowRepo.save(rows);
    }

    this.logger.log(
      `Access template created: ${savedTemplate.id} name=${dto.name}`,
    );

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
    if (dto.description !== undefined)
      template.description = dto.description || null;
    if (dto.isActive !== undefined) template.isActive = dto.isActive;
    if (dto.metadata !== undefined) template.metadata = dto.metadata || {};

    await this.templateRepo.save(template);

    // Replace rows if provided
    if (dto.rows !== undefined) {
      // Soft-delete existing rows
      const existingRows = await this.templateRowRepo.find({
        where: { templateId: id },
      });
      if (existingRows.length > 0) {
        await this.templateRowRepo.softRemove(existingRows);
      }

      // Create new rows
      const rows = dto.rows.map((row) =>
        this.templateRowRepo.create({
          templateId: id,
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
      where: { id, organizationId },
      relations: ["rows"],
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
    const where: FindOptionsWhere<MachineAccess> = { organizationId };
    if (!includeInactive) {
      where.isActive = true;
    }

    return this.templateRepo.find({
      where,
      relations: ["rows"],
      order: { name: "ASC" },
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

    if (!template.isActive) {
      throw new BadRequestException("Cannot apply an inactive template");
    }

    if (!template.rows?.length) {
      throw new BadRequestException("Template has no rows defined");
    }

    const results: MachineAccess[] = [];

    for (const userId of userIds) {
      for (const row of template.rows) {
        try {
          const access = await this.grantAccess(
            {
              machineId,
              userId,
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
