import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { UsersService } from './users.service';
import { User, UserStatus } from './entities/user.entity';

const ORG_ID = 'org-uuid-00000000-0000-0000-0000-000000000001';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@vendhub.uz',
    firstName: 'Test',
    lastName: 'User',
    role: 'operator',
    status: UserStatus.ACTIVE,
    organizationId: ORG_ID,
    organization: null,
    lastLoginAt: null,
    lastLoginIp: null,
    approvedAt: null,
    approvedById: null,
    rejectedAt: null,
    rejectedById: null,
    rejectionReason: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as User;

  const mockPendingUser = {
    ...mockUser,
    id: 'user-uuid-2',
    email: 'pending@vendhub.uz',
    status: UserStatus.PENDING,
  } as unknown as User;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockUser]),
    getCount: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softRemove: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE
  // ============================================================================

  describe('create', () => {
    it('should create a new user', async () => {
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const dto = { email: 'test@vendhub.uz', password: 'pass123', firstName: 'Test', lastName: 'User' };
      const result = await service.create(dto as any);

      expect(result).toEqual(mockUser);
      expect(userRepository.create).toHaveBeenCalledWith(dto);
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('should pass dto fields through to create', async () => {
      const dto = { email: 'new@vendhub.uz', password: 'secret', firstName: 'New', lastName: 'Person' };
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      await service.create(dto as any);

      expect(userRepository.create).toHaveBeenCalledWith(dto);
    });
  });

  // ============================================================================
  // FIND ALL
  // ============================================================================

  describe('findAll', () => {
    it('should return paginated users for organization', async () => {
      const result = await service.findAll(ORG_ID, { page: 1, limit: 20 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('totalPages', 1);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    it('should filter by role', async () => {
      await service.findAll(ORG_ID, { role: 'operator' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.role = :role',
        { role: 'operator' },
      );
    });

    it('should filter by status', async () => {
      await service.findAll(ORG_ID, { status: 'active' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.status = :status',
        { status: 'active' },
      );
    });

    it('should filter by search term', async () => {
      await service.findAll(ORG_ID, { search: 'john' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.email ILIKE :search)',
        { search: '%john%' },
      );
    });

    it('should default to page 1 and limit 20', async () => {
      const result = await service.findAll(ORG_ID);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // ============================================================================
  // FIND BY ID
  // ============================================================================

  describe('findById', () => {
    it('should return user with organization relation', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('user-uuid-1');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        relations: ['organization'],
      });
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // FIND BY EMAIL
  // ============================================================================

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@vendhub.uz');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@vendhub.uz' },
        relations: ['organization'],
      });
    });

    it('should return null for non-existent email', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nobody@vendhub.uz');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // UPDATE
  // ============================================================================

  describe('update', () => {
    it('should update user when found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({ ...mockUser, firstName: 'Updated' } as any);

      const result = await service.update('user-uuid-1', { firstName: 'Updated' } as any);

      expect(result.firstName).toBe('Updated');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { firstName: 'Updated' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // REMOVE (SOFT DELETE)
  // ============================================================================

  describe('remove', () => {
    it('should soft remove user when found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.softRemove.mockResolvedValue(mockUser);

      await service.remove('user-uuid-1');

      expect(userRepository.softRemove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // APPROVE USER
  // ============================================================================

  describe('approveUser', () => {
    it('should approve a pending user', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockPendingUser } as any);
      userRepository.save.mockImplementation(async (user) => user as User);

      const result = await service.approveUser('user-uuid-2', 'admin-uuid');

      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(result.approvedById).toBe('admin-uuid');
      expect(result.approvedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.approveUser('non-existent', 'admin-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is not pending', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser, status: UserStatus.ACTIVE } as any);

      await expect(service.approveUser('user-uuid-1', 'admin-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // REJECT USER
  // ============================================================================

  describe('rejectUser', () => {
    it('should reject a pending user with reason', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockPendingUser } as any);
      userRepository.save.mockImplementation(async (user) => user as User);

      const result = await service.rejectUser('user-uuid-2', 'admin-uuid', 'Not eligible');

      expect(result.status).toBe(UserStatus.REJECTED);
      expect(result.rejectedById).toBe('admin-uuid');
      expect(result.rejectionReason).toBe('Not eligible');
    });

    it('should throw BadRequestException when user is not pending', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser, status: UserStatus.ACTIVE } as any);

      await expect(
        service.rejectUser('user-uuid-1', 'admin-uuid', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // UPDATE LAST LOGIN
  // ============================================================================

  describe('updateLastLogin', () => {
    it('should update last login timestamp and IP', async () => {
      userRepository.update.mockResolvedValue(undefined as any);

      await service.updateLastLogin('user-uuid-1', '192.168.1.1');

      expect(userRepository.update).toHaveBeenCalledWith('user-uuid-1', expect.objectContaining({
        lastLoginIp: '192.168.1.1',
      }));
    });
  });

  // ============================================================================
  // COUNT BY ORGANIZATION
  // ============================================================================

  describe('countByOrganization', () => {
    it('should return count of users in organization', async () => {
      userRepository.count.mockResolvedValue(5);

      const result = await service.countByOrganization(ORG_ID);

      expect(result).toBe(5);
      expect(userRepository.count).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
    });
  });
});
