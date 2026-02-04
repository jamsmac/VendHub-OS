import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MaintenanceService } from './maintenance.service';
import {
  MaintenanceRequest,
  MaintenancePart,
  MaintenanceWorkLog,
  MaintenanceSchedule,
  MaintenanceStatus,
  MaintenanceType,
  MaintenancePriority,
} from './entities/maintenance.entity';

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
const TECH_ID = 'tech-uuid-00000000-0000-0000-0000-000000000001';

// ============================================================================
// TESTS
// ============================================================================

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let maintenanceRepo: MockRepository<MaintenanceRequest>;
  let partRepo: MockRepository<MaintenancePart>;
  let workLogRepo: MockRepository<MaintenanceWorkLog>;
  let scheduleRepo: MockRepository<MaintenanceSchedule>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let mockQb: ReturnType<typeof createMockQueryBuilder>;

  const mockRequest: Partial<MaintenanceRequest> = {
    id: 'mnt-uuid-1',
    organizationId: ORG_ID,
    requestNumber: 'MNT-2025-000001',
    maintenanceType: MaintenanceType.CORRECTIVE,
    status: MaintenanceStatus.DRAFT,
    priority: MaintenancePriority.NORMAL,
    machineId: MACHINE_ID,
    title: 'Machine coin acceptor broken',
    description: 'The coin acceptor does not accept coins',
    createdByUserId: USER_ID,
    slaDueDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
    slaBreached: false,
    laborCost: 0,
    partsCost: 0,
    totalCost: 0,
    parts: [],
    workLogs: [],
  };

  const mockSubmittedRequest: Partial<MaintenanceRequest> = {
    ...mockRequest,
    id: 'mnt-uuid-2',
    status: MaintenanceStatus.SUBMITTED,
  };

  const mockApprovedRequest: Partial<MaintenanceRequest> = {
    ...mockRequest,
    id: 'mnt-uuid-3',
    status: MaintenanceStatus.APPROVED,
  };

  const mockInProgressRequest: Partial<MaintenanceRequest> = {
    ...mockRequest,
    id: 'mnt-uuid-4',
    status: MaintenanceStatus.IN_PROGRESS,
    startedAt: new Date('2025-01-15T10:00:00Z'),
  };

  const mockCompletedRequest: Partial<MaintenanceRequest> = {
    ...mockRequest,
    id: 'mnt-uuid-5',
    status: MaintenanceStatus.COMPLETED,
    startedAt: new Date('2025-01-15T10:00:00Z'),
    completedAt: new Date('2025-01-15T14:00:00Z'),
    actualDuration: 240,
  };

  beforeEach(async () => {
    maintenanceRepo = createMockRepository<MaintenanceRequest>();
    partRepo = createMockRepository<MaintenancePart>();
    workLogRepo = createMockRepository<MaintenanceWorkLog>();
    scheduleRepo = createMockRepository<MaintenanceSchedule>();
    mockQb = createMockQueryBuilder();
    maintenanceRepo.createQueryBuilder!.mockReturnValue(mockQb);
    scheduleRepo.createQueryBuilder!.mockReturnValue(mockQb);

    eventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        { provide: getRepositoryToken(MaintenanceRequest), useValue: maintenanceRepo },
        { provide: getRepositoryToken(MaintenancePart), useValue: partRepo },
        { provide: getRepositoryToken(MaintenanceWorkLog), useValue: workLogRepo },
        { provide: getRepositoryToken(MaintenanceSchedule), useValue: scheduleRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // create
  // ==========================================================================

  describe('create', () => {
    it('should create a maintenance request in DRAFT status', async () => {
      maintenanceRepo.create!.mockReturnValue(mockRequest);
      maintenanceRepo.save!.mockResolvedValue(mockRequest);

      const dto = {
        maintenanceType: MaintenanceType.CORRECTIVE,
        priority: MaintenancePriority.NORMAL,
        machineId: MACHINE_ID,
        title: 'Machine coin acceptor broken',
      };

      const result = await service.create(ORG_ID, USER_ID, dto as any);

      expect(maintenanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: ORG_ID,
          createdByUserId: USER_ID,
          status: MaintenanceStatus.DRAFT,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'maintenance.created',
        expect.objectContaining({ request: mockRequest }),
      );
      expect(result).toEqual(mockRequest);
    });

    it('should calculate SLA due date based on CRITICAL priority', async () => {
      maintenanceRepo.create!.mockImplementation((data) => data);
      maintenanceRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const dto = {
        maintenanceType: MaintenanceType.EMERGENCY,
        priority: MaintenancePriority.CRITICAL,
        machineId: MACHINE_ID,
        title: 'Machine on fire',
      };

      const result = await service.create(ORG_ID, USER_ID, dto as any);

      expect(result.slaDueDate).toBeInstanceOf(Date);
      // CRITICAL = 4 hours, check it is within ~4 hours from now
      const diffMs = result.slaDueDate!.getTime() - Date.now();
      expect(diffMs).toBeLessThanOrEqual(4 * 60 * 60 * 1000 + 1000);
      expect(diffMs).toBeGreaterThan(3 * 60 * 60 * 1000);
    });
  });

  // ==========================================================================
  // findOne
  // ==========================================================================

  describe('findOne', () => {
    it('should return a request with parts and workLogs', async () => {
      maintenanceRepo.findOne!.mockResolvedValue(mockRequest);

      const result = await service.findOne(ORG_ID, 'mnt-uuid-1');

      expect(maintenanceRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'mnt-uuid-1', organizationId: ORG_ID },
        relations: ['parts', 'workLogs'],
      });
      expect(result).toEqual(mockRequest);
    });

    it('should throw NotFoundException when not found', async () => {
      maintenanceRepo.findOne!.mockResolvedValue(null);

      await expect(service.findOne(ORG_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // update
  // ==========================================================================

  describe('update', () => {
    it('should update a draft request', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockRequest });
      maintenanceRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const dto = { title: 'Updated title' };
      const result = await service.update(ORG_ID, 'mnt-uuid-1', dto as any);

      expect(result.title).toBe('Updated title');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'maintenance.updated',
        expect.any(Object),
      );
    });

    it('should throw BadRequestException when updating non-draft request', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockSubmittedRequest });

      await expect(
        service.update(ORG_ID, 'mnt-uuid-2', { title: 'X' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // delete
  // ==========================================================================

  describe('delete', () => {
    it('should soft delete a draft request', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockRequest });
      maintenanceRepo.softDelete!.mockResolvedValue({ affected: 1 });

      await service.delete(ORG_ID, 'mnt-uuid-1');

      expect(maintenanceRepo.softDelete).toHaveBeenCalledWith('mnt-uuid-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'maintenance.deleted',
        { requestId: 'mnt-uuid-1' },
      );
    });

    it('should throw BadRequestException when deleting non-draft', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockSubmittedRequest });

      await expect(service.delete(ORG_ID, 'mnt-uuid-2')).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // submit
  // ==========================================================================

  describe('submit', () => {
    it('should transition DRAFT -> SUBMITTED', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockRequest });
      maintenanceRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.submit(ORG_ID, 'mnt-uuid-1', USER_ID);

      expect(result.status).toBe(MaintenanceStatus.SUBMITTED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'maintenance.submitted',
        expect.any(Object),
      );
    });

    it('should throw BadRequestException for invalid transition', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockCompletedRequest });

      await expect(
        service.submit(ORG_ID, 'mnt-uuid-5', USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // approve
  // ==========================================================================

  describe('approve', () => {
    it('should approve a submitted request', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockSubmittedRequest });
      maintenanceRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.approve(ORG_ID, 'mnt-uuid-2', USER_ID, {} as any);

      expect(result.status).toBe(MaintenanceStatus.APPROVED);
      expect(result.approvedByUserId).toBe(USER_ID);
      expect(result.approvedAt).toBeInstanceOf(Date);
    });

    it('should set estimatedCost when provided', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockSubmittedRequest });
      maintenanceRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.approve(
        ORG_ID, 'mnt-uuid-2', USER_ID,
        { estimatedCost: 500000 } as any,
      );

      expect(result.estimatedCost).toBe(500000);
    });
  });

  // ==========================================================================
  // reject
  // ==========================================================================

  describe('reject', () => {
    it('should reject a submitted request with reason', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockSubmittedRequest });
      maintenanceRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.reject(
        ORG_ID, 'mnt-uuid-2', USER_ID,
        { reason: 'Budget exceeded' } as any,
      );

      expect(result.status).toBe(MaintenanceStatus.REJECTED);
      expect(result.rejectionReason).toBe('Budget exceeded');
    });
  });

  // ==========================================================================
  // assignTechnician
  // ==========================================================================

  describe('assignTechnician', () => {
    it('should assign technician and transition APPROVED -> SCHEDULED', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockApprovedRequest });
      maintenanceRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.assignTechnician(
        ORG_ID, 'mnt-uuid-3', USER_ID,
        { technicianId: TECH_ID, scheduledDate: new Date('2025-02-01') } as any,
      );

      expect(result.assignedTechnicianId).toBe(TECH_ID);
      expect(result.status).toBe(MaintenanceStatus.SCHEDULED);
      expect(result.scheduledDate).toEqual(new Date('2025-02-01'));
    });

    it('should not change status if not APPROVED', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({
        ...mockRequest,
        status: MaintenanceStatus.SCHEDULED,
      });
      maintenanceRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.assignTechnician(
        ORG_ID, 'mnt-uuid-1', USER_ID,
        { technicianId: TECH_ID } as any,
      );

      expect(result.status).toBe(MaintenanceStatus.SCHEDULED);
    });
  });

  // ==========================================================================
  // start
  // ==========================================================================

  describe('start', () => {
    it('should start maintenance and set startedAt', async () => {
      const scheduledReq = { ...mockRequest, status: MaintenanceStatus.SCHEDULED };
      maintenanceRepo.findOne!.mockResolvedValue({ ...scheduledReq });
      maintenanceRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.start(ORG_ID, 'mnt-uuid-1', USER_ID, {} as any);

      expect(result.status).toBe(MaintenanceStatus.IN_PROGRESS);
      expect(result.startedAt).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // complete
  // ==========================================================================

  describe('complete', () => {
    it('should complete maintenance and calculate duration', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockInProgressRequest });
      maintenanceRepo.save!.mockImplementation((entity) => Promise.resolve(entity));
      partRepo.find!.mockResolvedValue([]);
      workLogRepo.find!.mockResolvedValue([]);

      const dto = {
        completionNotes: 'Replaced coin acceptor',
        rootCause: 'Worn out mechanism',
        actionsTaken: ['Replaced part', 'Tested'],
        recommendations: 'Schedule preventive maintenance',
      };

      const result = await service.complete(ORG_ID, 'mnt-uuid-4', USER_ID, dto as any);

      expect(result.status).toBe(MaintenanceStatus.COMPLETED);
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.completionNotes).toBe('Replaced coin acceptor');
      expect(result.actualDuration).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // verify
  // ==========================================================================

  describe('verify', () => {
    it('should verify completed maintenance (passed)', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockCompletedRequest });
      maintenanceRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.verify(
        ORG_ID, 'mnt-uuid-5', USER_ID,
        { passed: true } as any,
      );

      expect(result.status).toBe(MaintenanceStatus.VERIFIED);
      expect(result.verifiedByUserId).toBe(USER_ID);
      expect(result.verifiedAt).toBeInstanceOf(Date);
    });

    it('should send back to IN_PROGRESS when verification fails', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockCompletedRequest });
      maintenanceRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.verify(
        ORG_ID, 'mnt-uuid-5', USER_ID,
        { passed: false } as any,
      );

      expect(result.status).toBe(MaintenanceStatus.IN_PROGRESS);
    });
  });

  // ==========================================================================
  // cancel
  // ==========================================================================

  describe('cancel', () => {
    it('should cancel a draft request', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockRequest });
      maintenanceRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.cancel(ORG_ID, 'mnt-uuid-1', USER_ID, 'No longer needed');

      expect(result.status).toBe(MaintenanceStatus.CANCELLED);
      expect(result.rejectionReason).toBe('No longer needed');
    });
  });

  // ==========================================================================
  // addPart
  // ==========================================================================

  describe('addPart', () => {
    it('should add a part and calculate total price', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockRequest, id: 'mnt-uuid-1' });
      const mockPart = {
        id: 'part-uuid-1',
        maintenanceRequestId: 'mnt-uuid-1',
        partName: 'Coin acceptor',
        quantityNeeded: 2,
        unitPrice: 100000,
        totalPrice: 200000,
      };
      partRepo.create!.mockReturnValue(mockPart);
      partRepo.save!.mockResolvedValue(mockPart);
      partRepo.find!.mockResolvedValue([mockPart]);
      workLogRepo.find!.mockResolvedValue([]);
      maintenanceRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const dto = {
        partName: 'Coin acceptor',
        productId: 'prod-uuid-1',
        quantityNeeded: 2,
        unitPrice: 100000,
      };

      const result = await service.addPart(ORG_ID, 'mnt-uuid-1', dto as any);

      expect(partRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          maintenanceRequestId: 'mnt-uuid-1',
          totalPrice: 200000,
        }),
      );
      expect(result).toEqual(mockPart);
    });
  });

  // ==========================================================================
  // addWorkLog
  // ==========================================================================

  describe('addWorkLog', () => {
    it('should add a work log with calculated duration', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockRequest });
      const mockLog = {
        id: 'log-uuid-1',
        maintenanceRequestId: 'mnt-uuid-1',
        technicianId: TECH_ID,
        startTime: '09:00',
        endTime: '11:30',
        durationMinutes: 150,
      };
      workLogRepo.create!.mockReturnValue(mockLog);
      workLogRepo.save!.mockResolvedValue(mockLog);

      const dto = {
        workType: 'repair',
        workDate: '2025-01-20',
        startTime: '09:00',
        endTime: '11:30',
        description: 'Replaced coin acceptor',
      };

      const result = await service.addWorkLog(ORG_ID, 'mnt-uuid-1', TECH_ID, dto as any);

      expect(result.durationMinutes).toBe(150);
    });

    it('should throw BadRequestException when end time is before start time', async () => {
      maintenanceRepo.findOne!.mockResolvedValue({ ...mockRequest });

      const dto = {
        workType: 'repair',
        workDate: '2025-01-20',
        startTime: '14:00',
        endTime: '09:00',
        description: 'Invalid times',
      };

      await expect(
        service.addWorkLog(ORG_ID, 'mnt-uuid-1', TECH_ID, dto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // getStats
  // ==========================================================================

  describe('getStats', () => {
    it('should calculate statistics', async () => {
      const requests = [
        {
          status: MaintenanceStatus.COMPLETED,
          maintenanceType: MaintenanceType.CORRECTIVE,
          priority: MaintenancePriority.NORMAL,
          totalCost: 500000,
          downtimeMinutes: 120,
          actualDuration: 240,
          isOverdue: false,
          slaBreached: false,
        },
        {
          status: MaintenanceStatus.IN_PROGRESS,
          maintenanceType: MaintenanceType.PREVENTIVE,
          priority: MaintenancePriority.HIGH,
          totalCost: 0,
          downtimeMinutes: 0,
          actualDuration: null,
          isOverdue: true,
          slaBreached: true,
        },
      ];

      mockQb.getMany.mockResolvedValue(requests);

      const result = await service.getStats(ORG_ID);

      expect(result.total).toBe(2);
      expect(result.totalCost).toBe(500000);
      expect(result.totalDowntimeMinutes).toBe(120);
      expect(result.overdue).toBe(1);
      expect(result.slaBreached).toBe(1);
      expect(result.avgCompletionTime).toBe(240);
    });

    it('should return zero avgCompletionTime when no completed requests', async () => {
      mockQb.getMany.mockResolvedValue([]);

      const result = await service.getStats(ORG_ID);

      expect(result.avgCompletionTime).toBe(0);
    });
  });

  // ==========================================================================
  // createSchedule
  // ==========================================================================

  describe('createSchedule', () => {
    it('should create a schedule and calculate nextDueDate', async () => {
      const mockSchedule = {
        id: 'sched-uuid-1',
        organizationId: ORG_ID,
        name: 'Monthly cleaning',
        maintenanceType: MaintenanceType.CLEANING,
        frequencyType: 'monthly',
        frequencyValue: 1,
        isActive: true,
        nextDueDate: null,
        lastExecutedDate: null,
      };

      scheduleRepo.create!.mockImplementation((data) => ({ ...mockSchedule, ...data }));
      scheduleRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const dto = {
        name: 'Monthly cleaning',
        maintenanceType: MaintenanceType.CLEANING,
        frequencyType: 'monthly',
        frequencyValue: 1,
      };

      const result = await service.createSchedule(ORG_ID, USER_ID, dto as any);

      expect(result.nextDueDate).toBeInstanceOf(Date);
      expect(scheduleRepo.save).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // findAll
  // ==========================================================================

  describe('findAll', () => {
    it('should return paginated maintenance requests', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[mockRequest], 1]);

      const query = { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'DESC' };
      const result = await service.findAll(ORG_ID, query as any);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply search filter', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(ORG_ID, { search: 'coin' } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        '(m.title ILIKE :search OR m.requestNumber ILIKE :search OR m.description ILIKE :search)',
        { search: '%coin%' },
      );
    });
  });
});
