/**
 * Department Sub-Service
 * Handles department CRUD operations
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Department } from "../entities/department.entity";
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  QueryDepartmentsDto,
  DepartmentDto,
  DepartmentListDto,
} from "../dto/department.dto";

@Injectable()
export class DepartmentService {
  private readonly logger = new Logger(DepartmentService.name);

  constructor(
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  /**
   * Create a department
   */
  async createDepartment(
    organizationId: string,
    dto: CreateDepartmentDto,
  ): Promise<DepartmentDto> {
    // Check code uniqueness within organization
    const existing = await this.departmentRepo.findOne({
      where: { code: dto.code, organizationId },
    });
    if (existing) {
      throw new ConflictException(
        `Department code "${dto.code}" already exists`,
      );
    }

    // Validate parent department if provided
    if (dto.parentDepartmentId) {
      const parent = await this.departmentRepo.findOne({
        where: { id: dto.parentDepartmentId, organizationId },
      });
      if (!parent) {
        throw new NotFoundException("Parent department not found");
      }
    }

    const department = this.departmentRepo.create({
      organizationId,
      name: dto.name,
      code: dto.code,
      description: dto.description || null,
      managerId: dto.managerId || null,
      parentDepartmentId: dto.parentDepartmentId || null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    await this.departmentRepo.save(department);

    this.logger.log(`Department ${dto.code} created`);

    return this.mapDepartmentToDto(department);
  }

  /**
   * Update a department
   */
  async updateDepartment(
    departmentId: string,
    organizationId: string,
    dto: UpdateDepartmentDto,
  ): Promise<DepartmentDto> {
    const department = await this.departmentRepo.findOne({
      where: { id: departmentId, organizationId },
    });
    if (!department) {
      throw new NotFoundException("Department not found");
    }

    // Check code uniqueness if code is being changed
    if (dto.code && dto.code !== department.code) {
      const existing = await this.departmentRepo.findOne({
        where: { code: dto.code, organizationId },
      });
      if (existing) {
        throw new ConflictException(
          `Department code "${dto.code}" already exists`,
        );
      }
    }

    // Prevent circular parent reference
    if (dto.parentDepartmentId === departmentId) {
      throw new BadRequestException("Department cannot be its own parent");
    }

    Object.assign(department, dto);
    await this.departmentRepo.save(department);

    return this.mapDepartmentToDto(department);
  }

  /**
   * Get departments with hierarchy support
   */
  async getDepartments(
    organizationId: string,
    query: QueryDepartmentsDto,
  ): Promise<DepartmentListDto> {
    const { page = 1, limit = 20, search, parentId, isActive } = query;

    const qb = this.departmentRepo
      .createQueryBuilder("d")
      .where("d.organizationId = :organizationId", { organizationId });

    if (search) {
      qb.andWhere("(d.name ILIKE :search OR d.code ILIKE :search)", {
        search: `%${search}%`,
      });
    }

    if (parentId) {
      qb.andWhere("d.parentDepartmentId = :parentId", { parentId });
    }

    if (isActive !== undefined) {
      qb.andWhere("d.isActive = :isActive", { isActive });
    }

    const [items, total] = await qb
      .leftJoinAndSelect("d.subDepartments", "sub")
      .orderBy("d.sortOrder", "ASC")
      .addOrderBy("d.name", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((d) => this.mapDepartmentToDto(d)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single department by ID
   */
  async getDepartment(
    departmentId: string,
    organizationId: string,
  ): Promise<DepartmentDto> {
    const department = await this.departmentRepo.findOne({
      where: { id: departmentId, organizationId },
      relations: ["subDepartments"],
    });
    if (!department) {
      throw new NotFoundException("Department not found");
    }
    return this.mapDepartmentToDto(department);
  }

  /**
   * Soft delete a department
   */
  async deleteDepartment(
    departmentId: string,
    organizationId: string,
  ): Promise<void> {
    const department = await this.departmentRepo.findOne({
      where: { id: departmentId, organizationId },
    });
    if (!department) {
      throw new NotFoundException("Department not found");
    }

    await this.departmentRepo.softRemove(department);
    this.logger.log(`Department ${department.code} deleted`);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  mapDepartmentToDto(department: Department): DepartmentDto {
    return {
      id: department.id,
      organizationId: department.organizationId,
      name: department.name,
      code: department.code,
      description: department.description,
      managerId: department.managerId,
      parentDepartmentId: department.parentDepartmentId,
      isActive: department.isActive,
      sortOrder: department.sortOrder,
      subDepartments: department.subDepartments
        ? department.subDepartments.map((d) => this.mapDepartmentToDto(d))
        : undefined,
      createdAt: department.created_at,
      updatedAt: department.updated_at,
    };
  }
}
