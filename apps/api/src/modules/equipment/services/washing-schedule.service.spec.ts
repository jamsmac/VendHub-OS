import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { WashingScheduleService } from './washing-schedule.service';
import { WashingSchedule } from '../entities/equipment-component.entity';

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
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
});

describe('WashingScheduleService', () => {
  let service: WashingScheduleService;
  let repo: MockRepository<WashingSchedule>;
  let eventEmitter: { emit: jest.Mock };

  const orgId = 'org-uuid-1';
  const userId = 'user-uuid-1';
  const scheduleId = 'ws-uuid-1';

  const mockSchedule: Partial<WashingSchedule> = {
    id: scheduleId,
    organizationId: orgId,
    machineId: 'machine-1',
    frequencyDays: 7,
    lastWashDate: new Date('2025-01-01'),
    nextWashDate: new Date('2025-01-08'),
    isActive: true,
    created_at: new Date(),
  };

  beforeEach(async () => {
    repo = createMockRepository<WashingSchedule>();
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WashingScheduleService,
        { provide: getRepositoryToken(WashingSchedule), useValue: repo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<WashingScheduleService>(WashingScheduleService);
  });

  // ================================================================
  // CRUD
  // ================================================================

  describe('create', () => {
    it('should create a washing schedule', async () => {
      const dto = { machineId: 'machine-1', frequencyDays: 7 };
      const created = { id: 'ws-new', ...dto, organizationId: orgId };
      repo.create!.mockReturnValue(created);
      repo.save!.mockResolvedValue(created);

      const result = await service.create(orgId, userId, dto as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          created_by_id: userId,
          machineId: 'machine-1',
        }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('should return paginated results with defaults', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[mockSchedule], 1]);

      const result = await service.findAll(orgId, {});

      expect(qb.where).toHaveBeenCalledWith(
        'w.organizationId = :organizationId',
        { organizationId: orgId },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('w.nextWashDate', 'ASC');
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by activeOnly by default', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(orgId, {});

      expect(qb.andWhere).toHaveBeenCalledWith('w.isActive = true');
    });

    it('should filter by machineId', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { machineId: 'm1' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'w.machineId = :machineId',
        { machineId: 'm1' },
      );
    });

    it('should filter by dueWithinDays', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { dueWithinDays: 3 } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'w.nextWashDate <= :futureDate',
        expect.objectContaining({ futureDate: expect.any(Date) }),
      );
    });

    it('should filter overdueOnly', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { overdueOnly: true } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'w.nextWashDate < :today',
        expect.objectContaining({ today: expect.any(Date) }),
      );
    });

    it('should use custom pagination', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { page: 2, limit: 5 } as any);

      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
    });
  });

  describe('findOne', () => {
    it('should return schedule when found', async () => {
      repo.findOne!.mockResolvedValue(mockSchedule);
      const result = await service.findOne(orgId, scheduleId);
      expect(result).toEqual(mockSchedule);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.findOne(orgId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update schedule fields', async () => {
      const existing = { ...mockSchedule };
      repo.findOne!.mockResolvedValue(existing);
      repo.save!.mockImplementation(async (d) => d);

      const result = await service.update(orgId, scheduleId, { frequencyDays: 14 } as any);

      expect(result.frequencyDays).toBe(14);
    });

    it('should throw NotFoundException for non-existent schedule', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(
        service.update(orgId, 'missing', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should soft-delete the schedule', async () => {
      repo.findOne!.mockResolvedValue(mockSchedule);
      repo.softDelete!.mockResolvedValue({ affected: 1 });

      await service.delete(orgId, scheduleId);

      expect(repo.softDelete).toHaveBeenCalledWith(scheduleId);
    });

    it('should throw NotFoundException for non-existent schedule', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.delete(orgId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ================================================================
  // Complete Wash
  // ================================================================

  describe('completeWash', () => {
    it('should set lastWashDate to today and advance nextWashDate', async () => {
      const existing = { ...mockSchedule, frequencyDays: 7 };
      repo.findOne!.mockResolvedValue(existing);
      repo.save!.mockImplementation(async (d) => d);

      const result = await service.completeWash(orgId, scheduleId);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(result.lastWashDate).toEqual(today);

      const expectedNext = new Date(today);
      expectedNext.setDate(expectedNext.getDate() + 7);
      expect(result.nextWashDate).toEqual(expectedNext);
    });

    it('should emit washing.completed event', async () => {
      const existing = { ...mockSchedule, frequencyDays: 7 };
      repo.findOne!.mockResolvedValue(existing);
      repo.save!.mockImplementation(async (d) => d);

      await service.completeWash(orgId, scheduleId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'equipment.washing.completed',
        expect.objectContaining({ schedule: expect.any(Object) }),
      );
    });

    it('should throw NotFoundException when schedule not found', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.completeWash(orgId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ================================================================
  // Cron Job
  // ================================================================

  describe('checkOverdueWashes', () => {
    it('should emit event for each overdue schedule', async () => {
      const overdueSchedules = [
        { id: 'ws-1', nextWashDate: new Date('2024-01-01') },
        { id: 'ws-2', nextWashDate: new Date('2024-06-01') },
      ];
      repo.find!.mockResolvedValue(overdueSchedules);

      await service.checkOverdueWashes();

      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'equipment.washing.overdue',
        { schedule: overdueSchedules[0] },
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'equipment.washing.overdue',
        { schedule: overdueSchedules[1] },
      );
    });

    it('should not emit events when no overdue schedules exist', async () => {
      repo.find!.mockResolvedValue([]);

      await service.checkOverdueWashes();

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should query only active schedules with nextWashDate before today', async () => {
      repo.find!.mockResolvedValue([]);

      await service.checkOverdueWashes();

      expect(repo.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: true,
          nextWashDate: expect.any(Object),
        }),
      });
    });
  });
});
