import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { User } from '../users/entities/user.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ==================== Roles ====================

  async createRole(dto: CreateRoleDto, organizationId?: string): Promise<Role> {
    const existing = await this.roleRepository.findOne({
      where: { name: dto.name, organizationId: organizationId || undefined as any },
    });
    if (existing) {
      throw new BadRequestException(`Role "${dto.name}" already exists`);
    }

    const role = this.roleRepository.create({
      name: dto.name,
      description: dto.description,
      level: dto.level || 0,
      organizationId: organizationId || dto.organizationId,
    });

    const saved = await this.roleRepository.save(role);

    if (dto.permissionIds?.length) {
      await this.syncRolePermissions(saved.id, dto.permissionIds);
    }

    return this.findRoleById(saved.id);
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem && dto.name && dto.name !== role.name) {
      throw new BadRequestException('Cannot rename a system role');
    }

    Object.assign(role, dto);
    await this.roleRepository.save(role);

    return this.findRoleById(id);
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) {
      throw new BadRequestException('Cannot delete a system role');
    }
    await this.roleRepository.softRemove(role);
  }

  async findAllRoles(options?: {
    organizationId?: string;
    includeGlobal?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { organizationId, includeGlobal = true, page = 1, limit = 50 } = options || {};

    const query = this.roleRepository.createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('role.deleted_at IS NULL');

    if (organizationId) {
      if (includeGlobal) {
        query.andWhere('(role.organization_id = :organizationId OR role.organization_id IS NULL)', { organizationId });
      } else {
        query.andWhere('role.organization_id = :organizationId', { organizationId });
      }
    }

    const total = await query.getCount();
    query.orderBy('role.level', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    const data = await query.getMany();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findRoleById(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  // ==================== Permissions ====================

  async createPermission(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.permissionRepository.findOne({
      where: { resource: dto.resource, action: dto.action },
    });
    if (existing) {
      throw new BadRequestException(`Permission "${dto.resource}:${dto.action}" already exists`);
    }

    const permission = this.permissionRepository.create({
      name: `${dto.resource}:${dto.action}`,
      resource: dto.resource,
      action: dto.action,
      description: dto.description,
    });

    return this.permissionRepository.save(permission);
  }

  async findAllPermissions(options?: { resource?: string; page?: number; limit?: number }) {
    const { resource, page = 1, limit = 200 } = options || {};

    const where: any = { isActive: true };
    if (resource) {
      where.resource = resource;
    }

    const [data, total] = await this.permissionRepository.findAndCount({
      where,
      order: { resource: 'ASC', action: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ==================== Role-Permission Assignment ====================

  async syncRolePermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const permissions = await this.permissionRepository.findBy({ id: In(permissionIds) });
    role.permissions = permissions;
    await this.roleRepository.save(role);

    return this.findRoleById(roleId);
  }

  // ==================== User-Role Assignment ====================

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');

    const role = await this.roleRepository.findOneBy({ id: roleId });
    if (!role) throw new NotFoundException('Role not found');

    const alreadyAssigned = user.roles?.some((r: any) => r.id === roleId);
    if (alreadyAssigned) {
      throw new BadRequestException('Role already assigned to user');
    }

    user.roles = [...(user.roles || []), role];
    await this.userRepository.save(user);
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');

    user.roles = (user.roles || []).filter((r: any) => r.id !== roleId);
    await this.userRepository.save(user);
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user.roles || [];
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const roles = await this.getUserRoles(userId);
    const permissionMap = new Map<string, Permission>();

    for (const role of roles) {
      if (role.permissions) {
        for (const perm of role.permissions) {
          permissionMap.set(perm.id, perm);
        }
      }
    }

    return Array.from(permissionMap.values());
  }

  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.some(
      (p) =>
        (p.resource === resource && (p.action === action || p.action === 'manage')) ||
        (p.resource === '*' && p.action === 'manage'),
    );
  }
}
