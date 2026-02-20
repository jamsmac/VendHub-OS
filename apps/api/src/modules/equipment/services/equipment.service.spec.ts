import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import {
  EquipmentComponent,
  ComponentMaintenance,
  ComponentMovement,
  EquipmentComponentStatus,
  EquipmentComponentType,
} from '../entities/equipment-component.entity';

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
});

describe('EquipmentService', () => {
  let service: EquipmentService;
  let componentRepo: MockRepository<EquipmentComponent>;
  let maintenanceRepo: MockRepository<ComponentMaintenance>;
  let movementRepo: MockRepository<ComponentMovement>;
  let eventEmitter: { emit: jest.Mock };

  const orgId = 'org-uuid-1';
  const userId = 'user-uuid-1';
  const componentId = 'comp-uuid-1';

  const mockComponent: Partial<EquipmentComponent> = {
    id: componentId,
    organizationId: orgId,
    name: 'Water Pump',
    componentType: EquipmentComponentType.PUMP,
    componentStatus: EquipmentComponentStatus.INSTALLED,
    machineId: 'machine-1',
    serialNumber: 'SN-PUMP-001',
    created_at: new Date(),
  };

  beforeEach(async () => {
    componentRepo = createMockRepository<EquipmentComponent>();
    maintenanceRepo = createMockRepository<ComponentMaintenance>();
    movementRepo = createMockRepository<ComponentMovement>();
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        { provide: getRepositoryToken(EquipmentComponent), useValue: componentRepo },
        { provide: getRepositoryToken(ComponentMaintenance), useValue: maintenanceRepo },
        { provide: getRepositoryToken(ComponentMovement), useValue: movementRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<EquipmentService>(EquipmentService);
  });

  // ================================================================
  // Equipment Component CRUD
  // ================================================================

  describe('createComponent', () => {
    it('should create a component and emit event', async () => {
      const dto = { name: 'Water Pump', componentType: 'pump', serialNumber: 'SN-001' };
      const created = { id: 'new-comp', ...dto, organizationId: orgId };
      componentRepo.create!.mockReturnValue(created);
      componentRepo.save!.mockResolvedValue(created);

      const result = await service.createComponent(orgId, userId, dto as any);

      expect(componentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          created_by_id: userId,
          name: 'Water Pump',
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'equipment.component.created',
        { component: created },
      );
      expect(result).toEqual(created);
    });
  });

  describe('findAllComponents', () => {
    it('should return paginated results with default options', async () => {
      const qb = createMockQueryBuilder();
      componentRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[mockComponent], 1]);

      const result = await service.findAllComponents(orgId, {});

      expect(qb.where).toHaveBeenCalledWith(
        'c.organizationId = :organizationId',
        { organizationId: orgId },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('c.deleted_at IS NULL');
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should apply machineId filter', async () => {
      const qb = createMockQueryBuilder();
      componentRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllComponents(orgId, { machineId: 'm1' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'c.machineId = :machineId',
        { machineId: 'm1' },
      );
    });

    it('should apply componentType filter', async () => {
      const qb = createMockQueryBuilder();
      componentRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllComponents(orgId, { componentType: 'pump' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'c.componentType = :componentType',
        { componentType: 'pump' },
      );
    });

    it('should apply search filter across name and serialNumber', async () => {
      const qb = createMockQueryBuilder();
      componentRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllComponents(orgId, { search: 'pump' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(c.name ILIKE :search OR c.serialNumber ILIKE :search)',
        { search: '%pump%' },
      );
    });

    it('should respect custom pagination parameters', async () => {
      const qb = createMockQueryBuilder();
      componentRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllComponents(orgId, { page: 3, limit: 10 } as any);

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });
  });

  describe('findOneComponent', () => {
    it('should return component when found', async () => {
      componentRepo.findOne!.mockResolvedValue(mockComponent);
      const result = await service.findOneComponent(orgId, componentId);
      expect(result).toEqual(mockComponent);
    });

    it('should throw NotFoundException when component does not exist', async () => {
      componentRepo.findOne!.mockResolvedValue(null);
      await expect(service.findOneComponent(orgId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateComponent', () => {
    it('should update component fields and emit event', async () => {
      const existing = { ...mockComponent };
      componentRepo.findOne!.mockResolvedValue(existing);
      componentRepo.save!.mockImplementation(async (d) => d);

      const dto = { name: 'Updated Pump' };
      const result = await service.updateComponent(orgId, componentId, dto as any);

      expect(result.name).toBe('Updated Pump');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'equipment.component.updated',
        expect.objectContaining({ component: expect.any(Object) }),
      );
    });

    it('should throw NotFoundException for non-existent component', async () => {
      componentRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.updateComponent(orgId, 'missing', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteComponent', () => {
    it('should soft-delete the component and emit event', async () => {
      componentRepo.findOne!.mockResolvedValue(mockComponent);
      componentRepo.softDelete!.mockResolvedValue({ affected: 1 });

      await service.deleteComponent(orgId, componentId);

      expect(componentRepo.softDelete).toHaveBeenCalledWith(componentId);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'equipment.component.deleted',
        { componentId },
      );
    });

    it('should throw NotFoundException when component does not exist', async () => {
      componentRepo.findOne!.mockResolvedValue(null);
      await expect(service.deleteComponent(orgId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ================================================================
  // Component Maintenance
  // ================================================================

  describe('createMaintenance', () => {
    it('should create maintenance record and update component', async () => {
      componentRepo.findOne!.mockResolvedValue(mockComponent);
      const maint = {
        id: 'maint-1',
        componentId,
        performedAt: new Date(),
        maintenanceType: 'preventive',
      };
      maintenanceRepo.create!.mockReturnValue(maint);
      maintenanceRepo.save!.mockResolvedValue(maint);
      componentRepo.update!.mockResolvedValue({ affected: 1 });

      const result = await service.createMaintenance(orgId, userId, {
        componentId,
        maintenanceType: 'preventive',
      } as any);

      expect(result).toEqual(maint);
      expect(componentRepo.update).toHaveBeenCalledWith(
        componentId,
        { lastMaintenanceDate: maint.performedAt },
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'equipment.maintenance.created',
        { maintenance: maint },
      );
    });

    it('should throw NotFoundException for invalid component', async () => {
      componentRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.createMaintenance(orgId, userId, { componentId: 'bad' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMaintenanceHistory', () => {
    it('should return paginated maintenance history', async () => {
      const qb = createMockQueryBuilder();
      maintenanceRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findMaintenanceHistory(orgId, {});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should apply componentId and date filters', async () => {
      const qb = createMockQueryBuilder();
      maintenanceRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findMaintenanceHistory(orgId, {
        componentId: 'c1',
        maintenanceType: 'corrective',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'm.componentId = :componentId',
        { componentId: 'c1' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'm.maintenanceType = :maintenanceType',
        { maintenanceType: 'corrective' },
      );
    });
  });

  // ================================================================
  // Component Movements
  // ================================================================

  describe('createMovement', () => {
    it('should create movement and update component machineId', async () => {
      const comp = { ...mockComponent, machineId: 'machine-1' };
      componentRepo.findOne!.mockResolvedValue(comp);
      componentRepo.save!.mockImplementation(async (d) => d);

      const movementData = {
        componentId,
        fromMachineId: 'machine-1',
        toMachineId: 'machine-2',
      };
      movementRepo.create!.mockReturnValue({ id: 'mv-1', ...movementData });
      movementRepo.save!.mockResolvedValue({ id: 'mv-1', ...movementData });

      const result = await service.createMovement(orgId, userId, movementData as any);

      expect(result).toBeDefined();
      expect(comp.machineId).toBe('machine-2');
      expect(comp.componentStatus).toBe(EquipmentComponentStatus.INSTALLED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'equipment.movement.created',
        expect.any(Object),
      );
    });

    it('should set machineId to null when toMachineId is not provided', async () => {
      const comp = { ...mockComponent, machineId: 'machine-1' };
      componentRepo.findOne!.mockResolvedValue(comp);
      componentRepo.save!.mockImplementation(async (d) => d);

      const movementData = { componentId, fromMachineId: 'machine-1' };
      movementRepo.create!.mockReturnValue({ id: 'mv-2', ...movementData });
      movementRepo.save!.mockResolvedValue({ id: 'mv-2', ...movementData });

      await service.createMovement(orgId, userId, movementData as any);

      expect(comp.machineId).toBeNull();
    });

    it('should throw BadRequestException when neither from nor to machine is provided', async () => {
      componentRepo.findOne!.mockResolvedValue(mockComponent);

      await expect(
        service.createMovement(orgId, userId, { componentId } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findMovementHistory', () => {
    it('should return paginated movement history', async () => {
      const qb = createMockQueryBuilder();
      movementRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[{ id: 'mv-1' }], 1]);

      const result = await service.findMovementHistory(orgId, {});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply machineId filter matching both from and to', async () => {
      const qb = createMockQueryBuilder();
      movementRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findMovementHistory(orgId, { machineId: 'mx' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(m.fromMachineId = :machineId OR m.toMachineId = :machineId)',
        { machineId: 'mx' },
      );
    });
  });
});
