import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { MachineAccessService } from './machine-access.service';
import {
  MachineAccess,
  AccessTemplate,
  AccessTemplateRow,
  MachineAccessRole,
} from './entities/machine-access.entity';

// ============================================================================
// MOCK HELPERS
// ============================================================================

type MockRepository<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  softDelete: jest.fn(),
  softRemove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
});

// ============================================================================
// CONSTANTS
// ============================================================================

const ORG_ID = 'org-uuid-00000000-0000-0000-0000-000000000001';
const USER_ID = 'user-uuid-00000000-0000-0000-0000-000000000001';
const MACHINE_ID = 'machine-uuid-00000000-0000-0000-0000-000000000001';
const GRANTER_ID = 'granter-uuid-00000000-0000-0000-0000-000000000001';

// ============================================================================
// TESTS
// ============================================================================

describe('MachineAccessService', () => {
  let service: MachineAccessService;
  let accessRepo: MockRepository<MachineAccess>;
  let templateRepo: MockRepository<AccessTemplate>;
  let templateRowRepo: MockRepository<AccessTemplateRow>;
  let mockQb: ReturnType<typeof createMockQueryBuilder>;

  const mockAccess: Partial<MachineAccess> = {
    id: 'access-uuid-1',
    organization_id: ORG_ID,
    machine_id: MACHINE_ID,
    user_id: USER_ID,
    role: MachineAccessRole.REFILL,
    granted_by_user_id: GRANTER_ID,
    is_active: true,
    valid_from: null,
    valid_to: null,
    notes: null,
    metadata: {},
    created_at: new Date('2025-01-15T10:00:00Z'),
  };

  const mockRevokedAccess: Partial<MachineAccess> = {
    ...mockAccess,
    id: 'access-uuid-2',
    is_active: false,
    notes: 'Revoked: Employee left',
  };

  const mockTemplate: Partial<AccessTemplate> = {
    id: 'template-uuid-1',
    organization_id: ORG_ID,
    name: 'Operator Standard',
    description: 'Default operator access',
    is_active: true,
    metadata: {},
    rows: [
      {
        id: 'row-uuid-1',
        template_id: 'template-uuid-1',
        role: MachineAccessRole.REFILL,
        permissions: { canRefill: true },
        template: null as any,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        created_by_id: null,
        updated_by_id: null,
      } as AccessTemplateRow,
    ],
  };

  const mockInactiveTemplate: Partial<AccessTemplate> = {
    ...mockTemplate,
    id: 'template-uuid-2',
    name: 'Inactive Template',
    is_active: false,
  };

  beforeEach(async () => {
    accessRepo = createMockRepository<MachineAccess>();
    templateRepo = createMockRepository<AccessTemplate>();
    templateRowRepo = createMockRepository<AccessTemplateRow>();
    mockQb = createMockQueryBuilder();
    accessRepo.createQueryBuilder!.mockReturnValue(mockQb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachineAccessService,
        { provide: getRepositoryToken(MachineAccess), useValue: accessRepo },
        { provide: getRepositoryToken(AccessTemplate), useValue: templateRepo },
        { provide: getRepositoryToken(AccessTemplateRow), useValue: templateRowRepo },
      ],
    }).compile();

    service = module.get<MachineAccessService>(MachineAccessService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // grantAccess
  // ==========================================================================

  describe('grantAccess', () => {
    it('should grant access when no existing active access', async () => {
      accessRepo.findOne!.mockResolvedValue(null);
      accessRepo.create!.mockReturnValue(mockAccess);
      accessRepo.save!.mockResolvedValue(mockAccess);

      const dto = {
        machine_id: MACHINE_ID,
        user_id: USER_ID,
        role: MachineAccessRole.REFILL,
      };

      const result = await service.grantAccess(dto as any, GRANTER_ID, ORG_ID);

      expect(accessRepo.findOne).toHaveBeenCalledWith({
        where: {
          organization_id: ORG_ID,
          machine_id: MACHINE_ID,
          user_id: USER_ID,
          is_active: true,
        },
      });
      expect(accessRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: ORG_ID,
          machine_id: MACHINE_ID,
          user_id: USER_ID,
          role: MachineAccessRole.REFILL,
          granted_by_user_id: GRANTER_ID,
          is_active: true,
        }),
      );
      expect(result).toEqual(mockAccess);
    });

    it('should throw ConflictException when user already has active access', async () => {
      accessRepo.findOne!.mockResolvedValue(mockAccess);

      const dto = {
        machine_id: MACHINE_ID,
        user_id: USER_ID,
        role: MachineAccessRole.REFILL,
      };

      await expect(
        service.grantAccess(dto as any, GRANTER_ID, ORG_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('should set valid_from and valid_to when provided', async () => {
      accessRepo.findOne!.mockResolvedValue(null);
      accessRepo.create!.mockReturnValue(mockAccess);
      accessRepo.save!.mockResolvedValue(mockAccess);

      const dto = {
        machine_id: MACHINE_ID,
        user_id: USER_ID,
        role: MachineAccessRole.VIEW,
        valid_from: '2025-02-01T00:00:00Z',
        valid_to: '2025-12-31T23:59:59Z',
      };

      await service.grantAccess(dto as any, GRANTER_ID, ORG_ID);

      expect(accessRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          valid_from: expect.any(Date),
          valid_to: expect.any(Date),
        }),
      );
    });
  });

  // ==========================================================================
  // revokeAccess
  // ==========================================================================

  describe('revokeAccess', () => {
    it('should revoke active access', async () => {
      accessRepo.findOne!.mockResolvedValue({ ...mockAccess });
      accessRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const dto = { access_id: 'access-uuid-1', reason: 'No longer needed' };
      const result = await service.revokeAccess(dto as any, USER_ID, ORG_ID);

      expect(result.is_active).toBe(false);
      expect(result.notes).toContain('Revoked: No longer needed');
      expect(result.updated_by_id).toBe(USER_ID);
    });

    it('should throw NotFoundException when access record not found', async () => {
      accessRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.revokeAccess({ access_id: 'nonexistent' } as any, USER_ID, ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when access is already revoked', async () => {
      accessRepo.findOne!.mockResolvedValue({ ...mockRevokedAccess });

      await expect(
        service.revokeAccess({ access_id: 'access-uuid-2' } as any, USER_ID, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // getAccessByMachine
  // ==========================================================================

  describe('getAccessByMachine', () => {
    it('should return only active access by default', async () => {
      accessRepo.find!.mockResolvedValue([mockAccess]);

      const result = await service.getAccessByMachine(MACHINE_ID, ORG_ID);

      expect(accessRepo.find).toHaveBeenCalledWith({
        where: {
          machine_id: MACHINE_ID,
          organization_id: ORG_ID,
          is_active: true,
        },
        order: { created_at: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });

    it('should include inactive access when requested', async () => {
      accessRepo.find!.mockResolvedValue([mockAccess, mockRevokedAccess]);

      const result = await service.getAccessByMachine(MACHINE_ID, ORG_ID, true);

      expect(accessRepo.find).toHaveBeenCalledWith({
        where: {
          machine_id: MACHINE_ID,
          organization_id: ORG_ID,
        },
        order: { created_at: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });
  });

  // ==========================================================================
  // getAccessByUser
  // ==========================================================================

  describe('getAccessByUser', () => {
    it('should return active access for a user', async () => {
      accessRepo.find!.mockResolvedValue([mockAccess]);

      const result = await service.getAccessByUser(USER_ID, ORG_ID);

      expect(accessRepo.find).toHaveBeenCalledWith({
        where: { user_id: USER_ID, organization_id: ORG_ID, is_active: true },
        order: { created_at: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  // ==========================================================================
  // findById
  // ==========================================================================

  describe('findById', () => {
    it('should return access record when found', async () => {
      accessRepo.findOne!.mockResolvedValue(mockAccess);

      const result = await service.findById('access-uuid-1', ORG_ID);

      expect(result).toEqual(mockAccess);
    });

    it('should throw NotFoundException when not found', async () => {
      accessRepo.findOne!.mockResolvedValue(null);

      await expect(service.findById('nonexistent', ORG_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // findAll
  // ==========================================================================

  describe('findAll', () => {
    it('should return paginated access records', async () => {
      mockQb.getCount.mockResolvedValue(25);
      mockQb.getMany.mockResolvedValue([mockAccess]);

      const result = await service.findAll(ORG_ID, { page: 2, limit: 10 });

      expect(mockQb.skip).toHaveBeenCalledWith(10);
      expect(mockQb.take).toHaveBeenCalledWith(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
    });

    it('should apply machineId filter when provided', async () => {
      mockQb.getCount.mockResolvedValue(1);
      mockQb.getMany.mockResolvedValue([mockAccess]);

      await service.findAll(ORG_ID, { machineId: MACHINE_ID });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'ma.machine_id = :machineId',
        { machineId: MACHINE_ID },
      );
    });

    it('should apply userId filter when provided', async () => {
      mockQb.getCount.mockResolvedValue(1);
      mockQb.getMany.mockResolvedValue([mockAccess]);

      await service.findAll(ORG_ID, { userId: USER_ID });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'ma.user_id = :userId',
        { userId: USER_ID },
      );
    });
  });

  // ==========================================================================
  // remove
  // ==========================================================================

  describe('remove', () => {
    it('should soft delete an access record', async () => {
      accessRepo.findOne!.mockResolvedValue(mockAccess);
      accessRepo.softDelete!.mockResolvedValue({ affected: 1 });

      await service.remove('access-uuid-1', ORG_ID);

      expect(accessRepo.softDelete).toHaveBeenCalledWith('access-uuid-1');
    });

    it('should throw NotFoundException if not found', async () => {
      accessRepo.findOne!.mockResolvedValue(null);

      await expect(service.remove('nonexistent', ORG_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // createTemplate
  // ==========================================================================

  describe('createTemplate', () => {
    it('should create a template with rows', async () => {
      templateRepo.create!.mockReturnValue(mockTemplate);
      templateRepo.save!.mockResolvedValue(mockTemplate);
      templateRepo.findOne!.mockResolvedValue(mockTemplate);
      templateRowRepo.create!.mockReturnValue(mockTemplate.rows![0]);
      templateRowRepo.save!.mockResolvedValue(mockTemplate.rows);

      const dto = {
        name: 'Operator Standard',
        description: 'Default operator access',
        rows: [{ role: MachineAccessRole.REFILL, permissions: { canRefill: true } }],
      };

      const result = await service.createTemplate(dto as any, ORG_ID);

      expect(templateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: ORG_ID,
          name: 'Operator Standard',
        }),
      );
      expect(templateRowRepo.create).toHaveBeenCalled();
      expect(result).toEqual(mockTemplate);
    });

    it('should create a template without rows', async () => {
      const templateNoRows = { ...mockTemplate, rows: [] };
      templateRepo.create!.mockReturnValue(templateNoRows);
      templateRepo.save!.mockResolvedValue(templateNoRows);
      templateRepo.findOne!.mockResolvedValue(templateNoRows);

      const dto = { name: 'Empty Template' };

      await service.createTemplate(dto as any, ORG_ID);

      expect(templateRowRepo.create).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // findTemplateById
  // ==========================================================================

  describe('findTemplateById', () => {
    it('should return template with rows', async () => {
      templateRepo.findOne!.mockResolvedValue(mockTemplate);

      const result = await service.findTemplateById('template-uuid-1', ORG_ID);

      expect(templateRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'template-uuid-1', organization_id: ORG_ID },
        relations: ['rows'],
      });
      expect(result).toEqual(mockTemplate);
    });

    it('should throw NotFoundException when template not found', async () => {
      templateRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.findTemplateById('nonexistent', ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // findAllTemplates
  // ==========================================================================

  describe('findAllTemplates', () => {
    it('should return only active templates by default', async () => {
      templateRepo.find!.mockResolvedValue([mockTemplate]);

      const result = await service.findAllTemplates(ORG_ID);

      expect(templateRepo.find).toHaveBeenCalledWith({
        where: { organization_id: ORG_ID, is_active: true },
        relations: ['rows'],
        order: { name: 'ASC' },
      });
      expect(result).toHaveLength(1);
    });

    it('should include inactive templates when flag is set', async () => {
      templateRepo.find!.mockResolvedValue([mockTemplate, mockInactiveTemplate]);

      const result = await service.findAllTemplates(ORG_ID, true);

      expect(templateRepo.find).toHaveBeenCalledWith({
        where: { organization_id: ORG_ID },
        relations: ['rows'],
        order: { name: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });
  });

  // ==========================================================================
  // applyTemplate
  // ==========================================================================

  describe('applyTemplate', () => {
    it('should apply template to create access for users', async () => {
      templateRepo.findOne!.mockResolvedValue(mockTemplate);
      accessRepo.findOne!.mockResolvedValue(null);
      accessRepo.create!.mockReturnValue(mockAccess);
      accessRepo.save!.mockResolvedValue(mockAccess);

      const result = await service.applyTemplate(
        'template-uuid-1',
        MACHINE_ID,
        [USER_ID],
        GRANTER_ID,
        ORG_ID,
      );

      expect(result).toHaveLength(1);
      expect(accessRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          machine_id: MACHINE_ID,
          user_id: USER_ID,
          metadata: expect.objectContaining({
            applied_from_template: 'template-uuid-1',
          }),
        }),
      );
    });

    it('should throw BadRequestException for inactive template', async () => {
      templateRepo.findOne!.mockResolvedValue(mockInactiveTemplate);

      await expect(
        service.applyTemplate('template-uuid-2', MACHINE_ID, [USER_ID], GRANTER_ID, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for template with no rows', async () => {
      const emptyTemplate = { ...mockTemplate, rows: [] };
      templateRepo.findOne!.mockResolvedValue(emptyTemplate);

      await expect(
        service.applyTemplate('template-uuid-1', MACHINE_ID, [USER_ID], GRANTER_ID, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should skip conflicts and continue for other users', async () => {
      templateRepo.findOne!.mockResolvedValue(mockTemplate);
      // First user already has access, second does not
      accessRepo.findOne!
        .mockResolvedValueOnce(mockAccess) // existing check for user1 -> conflict
        .mockResolvedValueOnce(null); // existing check for user2 -> ok
      accessRepo.create!.mockReturnValue(mockAccess);
      accessRepo.save!.mockResolvedValue(mockAccess);

      const result = await service.applyTemplate(
        'template-uuid-1',
        MACHINE_ID,
        ['user1', 'user2'],
        GRANTER_ID,
        ORG_ID,
      );

      expect(result).toHaveLength(1);
    });
  });

  // ==========================================================================
  // removeTemplate
  // ==========================================================================

  describe('removeTemplate', () => {
    it('should soft delete a template', async () => {
      templateRepo.findOne!.mockResolvedValue(mockTemplate);
      templateRepo.softDelete!.mockResolvedValue({ affected: 1 });

      await service.removeTemplate('template-uuid-1', ORG_ID);

      expect(templateRepo.softDelete).toHaveBeenCalledWith('template-uuid-1');
    });
  });
});
