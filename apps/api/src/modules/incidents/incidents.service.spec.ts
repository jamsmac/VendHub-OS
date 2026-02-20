import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { IncidentsService } from './incidents.service';
import {
  Incident,
  IncidentStatus,
  IncidentType,
  IncidentPriority,
} from './entities/incident.entity';

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
  createQueryBuilder: jest.fn(),
});

const mockQueryBuilder = {
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
};

// ============================================================================
// CONSTANTS
// ============================================================================

const ORG_ID = 'org-uuid-00000000-0000-0000-0000-000000000001';
const USER_ID = 'user-uuid-00000000-0000-0000-0000-000000000001';
const MACHINE_ID = 'machine-uuid-00000000-0000-0000-0000-000000000001';

// ============================================================================
// TESTS
// ============================================================================

describe('IncidentsService', () => {
  let service: IncidentsService;
  let incidentRepo: MockRepository<Incident>;

  const mockIncident: Partial<Incident> = {
    id: 'incident-uuid-1',
    organization_id: ORG_ID,
    machine_id: MACHINE_ID,
    type: IncidentType.MECHANICAL_FAILURE,
    status: IncidentStatus.REPORTED,
    priority: IncidentPriority.MEDIUM,
    title: 'Machine jammed',
    description: 'Product stuck in slot B3',
    reported_by_user_id: USER_ID,
    assigned_to_user_id: null,
    reported_at: new Date('2025-01-15T10:00:00Z'),
    resolved_at: null,
    repair_cost: null,
    insurance_claim: false,
    insurance_claim_number: null,
    photos: [],
    resolution: null,
    metadata: {},
  };

  const mockResolvedIncident: Partial<Incident> = {
    ...mockIncident,
    id: 'incident-uuid-2',
    status: IncidentStatus.RESOLVED,
    resolved_at: new Date('2025-01-15T14:00:00Z'),
    resolution: 'Cleared the jam and tested',
    repair_cost: 50000,
  };

  const mockClosedIncident: Partial<Incident> = {
    ...mockIncident,
    id: 'incident-uuid-3',
    status: IncidentStatus.CLOSED,
    resolved_at: new Date('2025-01-15T14:00:00Z'),
    resolution: 'Fixed',
  };

  beforeEach(async () => {
    incidentRepo = createMockRepository<Incident>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: getRepositoryToken(Incident), useValue: incidentRepo },
      ],
    }).compile();

    service = module.get<IncidentsService>(IncidentsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // create
  // ==========================================================================

  describe('create', () => {
    it('should create an incident with default priority MEDIUM', async () => {
      const dto = {
        machine_id: MACHINE_ID,
        type: IncidentType.MECHANICAL_FAILURE,
        title: 'Machine jammed',
        description: 'Product stuck in slot B3',
      };

      incidentRepo.create!.mockReturnValue(mockIncident);
      incidentRepo.save!.mockResolvedValue(mockIncident);

      const result = await service.create(dto as any, USER_ID, ORG_ID);

      expect(incidentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: ORG_ID,
          machine_id: MACHINE_ID,
          type: IncidentType.MECHANICAL_FAILURE,
          status: IncidentStatus.REPORTED,
          priority: IncidentPriority.MEDIUM,
          title: 'Machine jammed',
          reported_by_user_id: USER_ID,
        }),
      );
      expect(incidentRepo.save).toHaveBeenCalledWith(mockIncident);
      expect(result).toEqual(mockIncident);
    });

    it('should create an incident with explicit HIGH priority', async () => {
      const dto = {
        machine_id: MACHINE_ID,
        type: IncidentType.VANDALISM,
        title: 'Vandalized machine',
        priority: IncidentPriority.HIGH,
      };

      incidentRepo.create!.mockReturnValue({ ...mockIncident, priority: IncidentPriority.HIGH });
      incidentRepo.save!.mockResolvedValue({ ...mockIncident, priority: IncidentPriority.HIGH });

      const result = await service.create(dto as any, USER_ID, ORG_ID);

      expect(incidentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: IncidentPriority.HIGH }),
      );
      expect(result.priority).toBe(IncidentPriority.HIGH);
    });

    it('should set insurance_claim fields when provided', async () => {
      const dto = {
        machine_id: MACHINE_ID,
        type: IncidentType.THEFT,
        title: 'Cash box stolen',
        insurance_claim: true,
        insurance_claim_number: 'INS-2025-001',
        repair_cost: 5000000,
      };

      incidentRepo.create!.mockReturnValue({
        ...mockIncident,
        insurance_claim: true,
        insurance_claim_number: 'INS-2025-001',
      });
      incidentRepo.save!.mockResolvedValue({
        ...mockIncident,
        insurance_claim: true,
        insurance_claim_number: 'INS-2025-001',
      });

      await service.create(dto as any, USER_ID, ORG_ID);

      expect(incidentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          insurance_claim: true,
          insurance_claim_number: 'INS-2025-001',
        }),
      );
    });
  });

  // ==========================================================================
  // findById
  // ==========================================================================

  describe('findById', () => {
    it('should return an incident when found', async () => {
      incidentRepo.findOne!.mockResolvedValue(mockIncident);

      const result = await service.findById('incident-uuid-1', ORG_ID);

      expect(incidentRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'incident-uuid-1', organization_id: ORG_ID },
      });
      expect(result).toEqual(mockIncident);
    });

    it('should throw NotFoundException when incident not found', async () => {
      incidentRepo.findOne!.mockResolvedValue(null);

      await expect(service.findById('nonexistent', ORG_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // query
  // ==========================================================================

  describe('query', () => {
    beforeEach(() => {
      incidentRepo.createQueryBuilder!.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getCount.mockResolvedValue(2);
      mockQueryBuilder.getMany.mockResolvedValue([mockIncident, mockResolvedIncident]);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return paginated results with defaults', async () => {
      const result = await service.query({} as any, ORG_ID);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'i.organization_id = :organizationId',
        { organizationId: ORG_ID },
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should apply machine_id filter', async () => {
      await service.query({ machine_id: MACHINE_ID } as any, ORG_ID);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'i.machine_id = :machine_id',
        { machine_id: MACHINE_ID },
      );
    });

    it('should apply status filter', async () => {
      await service.query({ status: IncidentStatus.REPORTED } as any, ORG_ID);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'i.status = :status',
        { status: IncidentStatus.REPORTED },
      );
    });

    it('should apply search filter with ILIKE', async () => {
      await service.query({ search: 'jammed' } as any, ORG_ID);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(i.title ILIKE :search OR i.description ILIKE :search)',
        { search: '%jammed%' },
      );
    });

    it('should apply date range filters', async () => {
      const dto = { date_from: '2025-01-01', date_to: '2025-01-31' };
      await service.query(dto as any, ORG_ID);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'i.reported_at >= :date_from',
        expect.objectContaining({ date_from: expect.any(Date) }),
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'i.reported_at <= :date_to',
        expect.objectContaining({ date_to: expect.any(Date) }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(55);

      const result = await service.query({ page: 1, limit: 20 } as any, ORG_ID);

      expect(result.totalPages).toBe(3);
    });
  });

  // ==========================================================================
  // update
  // ==========================================================================

  describe('update', () => {
    it('should update incident fields', async () => {
      incidentRepo.findOne!.mockResolvedValue({ ...mockIncident });
      incidentRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const dto = { title: 'Updated title', priority: IncidentPriority.HIGH };
      const result = await service.update('incident-uuid-1', dto as any, USER_ID, ORG_ID);

      expect(result.title).toBe('Updated title');
      expect(result.priority).toBe(IncidentPriority.HIGH);
      expect(result.updated_by_id).toBe(USER_ID);
    });

    it('should set resolved_at when status transitions to RESOLVED', async () => {
      incidentRepo.findOne!.mockResolvedValue({ ...mockIncident });
      incidentRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const dto = { status: IncidentStatus.RESOLVED, resolution: 'Fixed the jam' };
      const result = await service.update('incident-uuid-1', dto as any, USER_ID, ORG_ID);

      expect(result.status).toBe(IncidentStatus.RESOLVED);
      expect(result.resolved_at).toBeInstanceOf(Date);
      expect(result.resolved_by_user_id).toBe(USER_ID);
    });

    it('should throw NotFoundException for missing incident', async () => {
      incidentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', {} as any, USER_ID, ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // resolve
  // ==========================================================================

  describe('resolve', () => {
    it('should resolve an incident with resolution text', async () => {
      incidentRepo.findOne!.mockResolvedValue({ ...mockIncident });
      incidentRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.resolve(
        'incident-uuid-1',
        'Cleared the jam',
        USER_ID,
        ORG_ID,
      );

      expect(result.status).toBe(IncidentStatus.RESOLVED);
      expect(result.resolved_at).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // close
  // ==========================================================================

  describe('close', () => {
    it('should close a resolved incident', async () => {
      incidentRepo.findOne!.mockResolvedValueOnce({ ...mockResolvedIncident });
      incidentRepo.findOne!.mockResolvedValueOnce({ ...mockResolvedIncident });
      incidentRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.close('incident-uuid-2', USER_ID, ORG_ID);

      expect(result.status).toBe(IncidentStatus.CLOSED);
    });

    it('should throw BadRequestException when closing a non-resolved incident', async () => {
      incidentRepo.findOne!.mockResolvedValue({ ...mockIncident });

      await expect(
        service.close('incident-uuid-1', USER_ID, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // assign
  // ==========================================================================

  describe('assign', () => {
    it('should assign a user and transition REPORTED -> INVESTIGATING', async () => {
      incidentRepo.findOne!.mockResolvedValue({ ...mockIncident });
      incidentRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const techId = 'tech-uuid-1';
      const result = await service.assign('incident-uuid-1', techId, USER_ID, ORG_ID);

      expect(result.assigned_to_user_id).toBe(techId);
      expect(result.status).toBe(IncidentStatus.INVESTIGATING);
      expect(result.updated_by_id).toBe(USER_ID);
    });

    it('should assign user without changing status if not REPORTED', async () => {
      const investigatingIncident = {
        ...mockIncident,
        status: IncidentStatus.INVESTIGATING,
      };
      incidentRepo.findOne!.mockResolvedValue({ ...investigatingIncident });
      incidentRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const techId = 'tech-uuid-2';
      const result = await service.assign('incident-uuid-1', techId, USER_ID, ORG_ID);

      expect(result.assigned_to_user_id).toBe(techId);
      expect(result.status).toBe(IncidentStatus.INVESTIGATING);
    });
  });

  // ==========================================================================
  // findByMachine
  // ==========================================================================

  describe('findByMachine', () => {
    it('should find incidents for a machine ordered by reported_at DESC', async () => {
      incidentRepo.find!.mockResolvedValue([mockIncident]);

      const result = await service.findByMachine(MACHINE_ID, ORG_ID);

      expect(incidentRepo.find).toHaveBeenCalledWith({
        where: { machine_id: MACHINE_ID, organization_id: ORG_ID },
        order: { reported_at: 'DESC' },
        take: 20,
      });
      expect(result).toHaveLength(1);
    });

    it('should respect custom limit', async () => {
      incidentRepo.find!.mockResolvedValue([]);

      await service.findByMachine(MACHINE_ID, ORG_ID, 5);

      expect(incidentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  // ==========================================================================
  // getStatistics
  // ==========================================================================

  describe('getStatistics', () => {
    beforeEach(() => {
      incidentRepo.createQueryBuilder!.mockReturnValue(mockQueryBuilder);
    });

    afterEach(() => jest.clearAllMocks());

    it('should calculate statistics from incidents', async () => {
      const reportedAt = new Date('2025-01-15T10:00:00Z');
      const resolvedAt = new Date('2025-01-15T14:00:00Z');

      const incidents = [
        {
          type: IncidentType.MECHANICAL_FAILURE,
          status: IncidentStatus.RESOLVED,
          priority: IncidentPriority.MEDIUM,
          repair_cost: 50000,
          insurance_claim: false,
          reported_at: reportedAt,
          resolved_at: resolvedAt,
        },
        {
          type: IncidentType.VANDALISM,
          status: IncidentStatus.REPORTED,
          priority: IncidentPriority.HIGH,
          repair_cost: null,
          insurance_claim: true,
          reported_at: new Date('2025-01-16T08:00:00Z'),
          resolved_at: null,
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(incidents);

      const result = await service.getStatistics(
        ORG_ID,
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      expect(result.total).toBe(2);
      expect(result.byType[IncidentType.MECHANICAL_FAILURE]).toBe(1);
      expect(result.byType[IncidentType.VANDALISM]).toBe(1);
      expect(result.byStatus[IncidentStatus.RESOLVED]).toBe(1);
      expect(result.byStatus[IncidentStatus.REPORTED]).toBe(1);
      expect(result.totalRepairCost).toBe(50000);
      expect(result.insuranceClaims).toBe(1);
      expect(result.averageResolutionTimeHours).toBeGreaterThan(0);
    });

    it('should return zero averageResolutionTimeHours when no resolved incidents', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.getStatistics(
        ORG_ID,
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      expect(result.total).toBe(0);
      expect(result.averageResolutionTimeHours).toBe(0);
    });
  });

  // ==========================================================================
  // remove
  // ==========================================================================

  describe('remove', () => {
    it('should soft delete a closed incident', async () => {
      incidentRepo.findOne!.mockResolvedValue({ ...mockClosedIncident });
      incidentRepo.softDelete!.mockResolvedValue({ affected: 1 });

      await service.remove('incident-uuid-3', USER_ID, ORG_ID);

      expect(incidentRepo.softDelete).toHaveBeenCalledWith('incident-uuid-3');
    });

    it('should throw BadRequestException when deleting a non-closed incident', async () => {
      incidentRepo.findOne!.mockResolvedValue({ ...mockIncident });

      await expect(
        service.remove('incident-uuid-1', USER_ID, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when incident does not exist', async () => {
      incidentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.remove('nonexistent', USER_ID, ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
