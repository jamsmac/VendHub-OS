import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { RbacService } from './rbac.service';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { User } from '../users/entities/user.entity';

describe('RbacService', () => {
  let service: RbacService;
  let roleRepository: jest.Mocked<Repository<Role>>;
  let permissionRepository: jest.Mocked<Repository<Permission>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const orgId = 'org-uuid-1';

  const mockPermission: Permission = {
    id: 'perm-uuid-1',
    name: 'machines:read',
    resource: 'machines',
    action: 'read',
    description: 'Read machines',
    isActive: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  } as unknown as Permission;

  const mockPermission2: Permission = {
    id: 'perm-uuid-2',
    name: 'machines:create',
    resource: 'machines',
    action: 'create',
    description: 'Create machines',
    isActive: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  } as unknown as Permission;

  const mockManagePermission: Permission = {
    id: 'perm-uuid-3',
    name: 'machines:manage',
    resource: 'machines',
    action: 'manage',
    description: 'Full manage machines',
    isActive: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  } as unknown as Permission;

  const mockWildcardPermission: Permission = {
    id: 'perm-uuid-4',
    name: '*:manage',
    resource: '*',
    action: 'manage',
    description: 'Superadmin wildcard',
    isActive: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  } as unknown as Permission;

  const mockRole: Role = {
    id: 'role-uuid-1',
    name: 'manager',
    description: 'Organization manager',
    isActive: true,
    isSystem: false,
    organizationId: orgId,
    level: 50,
    permissions: [mockPermission],
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  } as unknown as Role;

  const mockSystemRole: Role = {
    id: 'role-uuid-sys',
    name: 'admin',
    description: 'System administrator',
    isActive: true,
    isSystem: true,
    organizationId: null,
    level: 90,
    permissions: [mockPermission, mockPermission2],
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  } as unknown as Role;

  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'test@vendhub.uz',
    firstName: 'Test',
    lastName: 'User',
    organizationId: orgId,
    roles: [mockRole],
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  } as unknown as User;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockRole]),
    getCount: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    // Reset mockQueryBuilder spies between tests
    Object.values(mockQueryBuilder).forEach((fn) => (fn as jest.Mock).mockClear());
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.skip.mockReturnThis();
    mockQueryBuilder.take.mockReturnThis();
    mockQueryBuilder.leftJoinAndSelect.mockReturnThis();
    mockQueryBuilder.getMany.mockResolvedValue([mockRole]);
    mockQueryBuilder.getCount.mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            find: jest.fn(),
            findBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softRemove: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findBy: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
    roleRepository = module.get(getRepositoryToken(Role));
    permissionRepository = module.get(getRepositoryToken(Permission));
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // ROLE CRUD
  // ============================================================================

  describe('createRole', () => {
    it('should create a new role successfully', async () => {
      roleRepository.findOne
        // First call: duplicate check returns null (no duplicate)
        .mockResolvedValueOnce(null)
        // Second call: findRoleById after save
        .mockResolvedValueOnce(mockRole);
      roleRepository.create.mockReturnValue(mockRole);
      roleRepository.save.mockResolvedValue(mockRole);

      const result = await service.createRole(
        { name: 'manager', description: 'Organization manager', level: 50 },
        orgId,
      );

      expect(result).toEqual(mockRole);
      expect(roleRepository.create).toHaveBeenCalledWith({
        name: 'manager',
        description: 'Organization manager',
        level: 50,
        organizationId: orgId,
      });
      expect(roleRepository.save).toHaveBeenCalledWith(mockRole);
    });

    it('should throw BadRequestException when role name already exists within same org', async () => {
      roleRepository.findOne.mockResolvedValueOnce(mockRole);

      await expect(
        service.createRole({ name: 'manager', description: 'Duplicate' }, orgId),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createRole({ name: 'manager', description: 'Duplicate' }, orgId),
      ).rejects.toThrow('Role "manager" already exists');
    });

    it('should sync permissions when permissionIds are provided', async () => {
      const roleWithPerms = { ...mockRole, permissions: [mockPermission, mockPermission2] } as unknown as Role;
      roleRepository.findOne
        // duplicate check
        .mockResolvedValueOnce(null)
        // syncRolePermissions -> findOne for the role
        .mockResolvedValueOnce({ ...mockRole, permissions: [] } as unknown as Role)
        // findRoleById after sync
        .mockResolvedValueOnce(roleWithPerms)
        // findRoleById at end of createRole
        .mockResolvedValueOnce(roleWithPerms);
      roleRepository.create.mockReturnValue(mockRole);
      roleRepository.save.mockResolvedValue(mockRole);
      permissionRepository.findBy.mockResolvedValue([mockPermission, mockPermission2]);

      const result = await service.createRole(
        {
          name: 'manager',
          description: 'Manager',
          permissionIds: ['perm-uuid-1', 'perm-uuid-2'],
        },
        orgId,
      );

      expect(permissionRepository.findBy).toHaveBeenCalled();
      expect(result.permissions).toHaveLength(2);
    });
  });

  // ============================================================================
  // UPDATE ROLE
  // ============================================================================

  describe('updateRole', () => {
    it('should update role when found', async () => {
      const updatedRole = { ...mockRole, description: 'Updated description' } as unknown as Role;
      roleRepository.findOne
        // First call: find role by id
        .mockResolvedValueOnce(mockRole)
        // Second call: findRoleById after save
        .mockResolvedValueOnce(updatedRole);
      roleRepository.save.mockResolvedValue(updatedRole);

      const result = await service.updateRole('role-uuid-1', {
        description: 'Updated description',
      });

      expect(result.description).toBe('Updated description');
      expect(roleRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when role not found', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateRole('non-existent', { description: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to rename a system role', async () => {
      roleRepository.findOne.mockResolvedValueOnce(mockSystemRole);

      await expect(
        service.updateRole('role-uuid-sys', { name: 'renamed-admin' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateRole('role-uuid-sys', { name: 'renamed-admin' }),
      ).rejects.toThrow('Cannot rename a system role');
    });

    it('should allow updating description of a system role', async () => {
      const updatedSystemRole = { ...mockSystemRole, description: 'New desc' } as unknown as Role;
      roleRepository.findOne
        .mockResolvedValueOnce(mockSystemRole)
        .mockResolvedValueOnce(updatedSystemRole);
      roleRepository.save.mockResolvedValue(updatedSystemRole);

      const result = await service.updateRole('role-uuid-sys', {
        description: 'New desc',
      });

      expect(result.description).toBe('New desc');
    });
  });

  // ============================================================================
  // DELETE ROLE
  // ============================================================================

  describe('deleteRole', () => {
    it('should soft delete role when found', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole);
      roleRepository.softRemove.mockResolvedValue(mockRole);

      await service.deleteRole('role-uuid-1');

      expect(roleRepository.softRemove).toHaveBeenCalledWith(mockRole);
    });

    it('should throw NotFoundException when role not found', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteRole('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when trying to delete a system role', async () => {
      roleRepository.findOne.mockResolvedValue(mockSystemRole);

      await expect(service.deleteRole('role-uuid-sys')).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.deleteRole('role-uuid-sys')).rejects.toThrow(
        'Cannot delete a system role',
      );
    });
  });

  // ============================================================================
  // FIND ALL ROLES (paginated)
  // ============================================================================

  describe('findAllRoles', () => {
    it('should return paginated roles with defaults', async () => {
      const result = await service.findAllRoles();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 50);
      expect(result).toHaveProperty('totalPages', 1);
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'role.permissions',
        'permission',
      );
    });

    it('should filter by organizationId and include global roles by default', async () => {
      await service.findAllRoles({ organizationId: orgId });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(role.organization_id = :organizationId OR role.organization_id IS NULL)',
        { organizationId: orgId },
      );
    });

    it('should filter by organizationId without global roles when includeGlobal is false', async () => {
      await service.findAllRoles({ organizationId: orgId, includeGlobal: false });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'role.organization_id = :organizationId',
        { organizationId: orgId },
      );
    });

    it('should apply pagination correctly', async () => {
      await service.findAllRoles({ page: 2, limit: 10 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); // (2 - 1) * 10
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should order by role level descending', async () => {
      await service.findAllRoles();

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('role.level', 'DESC');
    });
  });

  // ============================================================================
  // FIND ROLE BY ID
  // ============================================================================

  describe('findRoleById', () => {
    it('should return role with permissions when found', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole);

      const result = await service.findRoleById('role-uuid-1');

      expect(result).toEqual(mockRole);
      expect(roleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'role-uuid-1' },
        relations: ['permissions'],
      });
    });

    it('should throw NotFoundException when role not found', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(service.findRoleById('non-existent')).rejects.toThrow(
        NotFoundException,
      );

      await expect(service.findRoleById('non-existent')).rejects.toThrow(
        'Role not found',
      );
    });
  });

  // ============================================================================
  // PERMISSION CRUD
  // ============================================================================

  describe('createPermission', () => {
    it('should create a new permission', async () => {
      permissionRepository.findOne.mockResolvedValue(null);
      permissionRepository.create.mockReturnValue(mockPermission);
      permissionRepository.save.mockResolvedValue(mockPermission);

      const result = await service.createPermission({
        name: 'machines:read',
        resource: 'machines',
        action: 'read',
        description: 'Read machines',
      });

      expect(result).toEqual(mockPermission);
      expect(permissionRepository.create).toHaveBeenCalledWith({
        name: 'machines:read',
        resource: 'machines',
        action: 'read',
        description: 'Read machines',
      });
      expect(permissionRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when permission already exists', async () => {
      permissionRepository.findOne.mockResolvedValue(mockPermission);

      await expect(
        service.createPermission({
          name: 'machines:read',
          resource: 'machines',
          action: 'read',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createPermission({
          name: 'machines:read',
          resource: 'machines',
          action: 'read',
        }),
      ).rejects.toThrow('Permission "machines:read" already exists');
    });
  });

  // ============================================================================
  // FIND ALL PERMISSIONS (paginated)
  // ============================================================================

  describe('findAllPermissions', () => {
    it('should return paginated permissions with defaults', async () => {
      permissionRepository.findAndCount.mockResolvedValue([
        [mockPermission, mockPermission2],
        2,
      ]);

      const result = await service.findAllPermissions();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 2);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 200);
      expect(result).toHaveProperty('totalPages', 1);
      expect(result.data).toHaveLength(2);
    });

    it('should filter by resource', async () => {
      permissionRepository.findAndCount.mockResolvedValue([[mockPermission], 1]);

      await service.findAllPermissions({ resource: 'machines' });

      expect(permissionRepository.findAndCount).toHaveBeenCalledWith({
        where: { isActive: true, resource: 'machines' },
        order: { resource: 'ASC', action: 'ASC' },
        skip: 0,
        take: 200,
      });
    });

    it('should apply pagination correctly', async () => {
      permissionRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllPermissions({ page: 3, limit: 10 });

      expect(permissionRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3 - 1) * 10
          take: 10,
        }),
      );
    });
  });

  // ============================================================================
  // SYNC ROLE PERMISSIONS
  // ============================================================================

  describe('syncRolePermissions', () => {
    it('should set permissions on role', async () => {
      const roleWithPerms = { ...mockRole, permissions: [mockPermission, mockPermission2] } as unknown as Role;
      roleRepository.findOne
        // First call: find role with existing permissions
        .mockResolvedValueOnce({ ...mockRole, permissions: [] } as unknown as Role)
        // Second call: findRoleById at end
        .mockResolvedValueOnce(roleWithPerms);
      permissionRepository.findBy.mockResolvedValue([mockPermission, mockPermission2]);
      roleRepository.save.mockResolvedValue(roleWithPerms);

      const result = await service.syncRolePermissions('role-uuid-1', [
        'perm-uuid-1',
        'perm-uuid-2',
      ]);

      expect(result.permissions).toHaveLength(2);
      expect(permissionRepository.findBy).toHaveBeenCalledWith({
        id: expect.anything(),
      });
      expect(roleRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when role not found', async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.syncRolePermissions('non-existent', ['perm-uuid-1']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // ASSIGN ROLE TO USER
  // ============================================================================

  describe('assignRoleToUser', () => {
    it('should assign role to user successfully', async () => {
      const userWithNoRoles = { ...mockUser, roles: [] } as unknown as User;
      userRepository.findOne.mockResolvedValue(userWithNoRoles);
      roleRepository.findOneBy.mockResolvedValue(mockRole);
      userRepository.save.mockResolvedValue({
        ...userWithNoRoles,
        roles: [mockRole],
      } as unknown as User);

      await service.assignRoleToUser('user-uuid-1', 'role-uuid-1');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: expect.arrayContaining([mockRole]),
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignRoleToUser('non-existent', 'role-uuid-1'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.assignRoleToUser('non-existent', 'role-uuid-1'),
      ).rejects.toThrow('User not found');
    });

    it('should throw NotFoundException when role not found', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser, roles: [] } as unknown as User);
      roleRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.assignRoleToUser('user-uuid-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.assignRoleToUser('user-uuid-1', 'non-existent'),
      ).rejects.toThrow('Role not found');
    });

    it('should throw BadRequestException when role is already assigned to user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser); // mockUser already has mockRole
      roleRepository.findOneBy.mockResolvedValue(mockRole);

      await expect(
        service.assignRoleToUser('user-uuid-1', 'role-uuid-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.assignRoleToUser('user-uuid-1', 'role-uuid-1'),
      ).rejects.toThrow('Role already assigned to user');
    });
  });

  // ============================================================================
  // REMOVE ROLE FROM USER
  // ============================================================================

  describe('removeRoleFromUser', () => {
    it('should remove role from user successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({
        ...mockUser,
        roles: [],
      } as unknown as User);

      await service.removeRoleFromUser('user-uuid-1', 'role-uuid-1');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: [],
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeRoleFromUser('non-existent', 'role-uuid-1'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.removeRoleFromUser('non-existent', 'role-uuid-1'),
      ).rejects.toThrow('User not found');
    });
  });

  // ============================================================================
  // GET USER ROLES
  // ============================================================================

  describe('getUserRoles', () => {
    it('should return user roles with permissions', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserRoles('user-uuid-1');

      expect(result).toEqual([mockRole]);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        relations: ['roles', 'roles.permissions'],
      });
    });

    it('should return empty array when user has no roles', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: undefined,
      } as unknown as User);

      const result = await service.getUserRoles('user-uuid-1');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserRoles('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================================
  // GET USER PERMISSIONS (flattened, deduplicated)
  // ============================================================================

  describe('getUserPermissions', () => {
    it('should return flattened and deduplicated permissions from all roles', async () => {
      const roleA = {
        ...mockRole,
        id: 'role-a',
        permissions: [mockPermission, mockPermission2],
      } as unknown as Role;
      const roleB = {
        ...mockRole,
        id: 'role-b',
        permissions: [mockPermission, mockManagePermission], // mockPermission is duplicated
      } as unknown as Role;

      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [roleA, roleB],
      } as unknown as User);

      const result = await service.getUserPermissions('user-uuid-1');

      // Should have 3 unique permissions, not 4 (deduplicated by id)
      expect(result).toHaveLength(3);
      const ids = result.map((p) => p.id);
      expect(ids).toContain('perm-uuid-1');
      expect(ids).toContain('perm-uuid-2');
      expect(ids).toContain('perm-uuid-3');
    });

    it('should return empty array when user has no roles', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [],
      } as unknown as User);

      const result = await service.getUserPermissions('user-uuid-1');

      expect(result).toEqual([]);
    });

    it('should handle roles with no permissions gracefully', async () => {
      const roleNoPerms = {
        ...mockRole,
        permissions: undefined,
      } as unknown as Role;

      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [roleNoPerms],
      } as unknown as User);

      const result = await service.getUserPermissions('user-uuid-1');

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // HAS PERMISSION
  // ============================================================================

  describe('hasPermission', () => {
    it('should return true when user has exact resource:action permission', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [{ ...mockRole, permissions: [mockPermission] }],
      } as unknown as User);

      const result = await service.hasPermission('user-uuid-1', 'machines', 'read');

      expect(result).toBe(true);
    });

    it('should return false when user does not have the permission', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [{ ...mockRole, permissions: [mockPermission] }],
      } as unknown as User);

      const result = await service.hasPermission('user-uuid-1', 'users', 'delete');

      expect(result).toBe(false);
    });

    it('should return true when user has manage action on the same resource', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [{ ...mockRole, permissions: [mockManagePermission] }],
      } as unknown as User);

      // "machines:manage" should grant any action on "machines"
      const result = await service.hasPermission('user-uuid-1', 'machines', 'delete');

      expect(result).toBe(true);
    });

    it('should return true when user has wildcard *:manage permission', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [{ ...mockRole, permissions: [mockWildcardPermission] }],
      } as unknown as User);

      // "*:manage" should grant any action on any resource
      const result = await service.hasPermission('user-uuid-1', 'reports', 'export');

      expect(result).toBe(true);
    });

    it('should return false for user with empty roles', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        roles: [],
      } as unknown as User);

      const result = await service.hasPermission('user-uuid-1', 'machines', 'read');

      expect(result).toBe(false);
    });
  });
});
