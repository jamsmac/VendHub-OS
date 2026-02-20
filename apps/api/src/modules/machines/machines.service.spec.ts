import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { MachinesService } from './machines.service';
import {
  Machine,
  MachineSlot,
  MachineLocationHistory,
  MachineComponent,
  MachineErrorLog,
  MachineMaintenanceSchedule,
  MachineStatus,
  ComponentStatus,
  MaintenanceStatus,
} from './entities/machine.entity';

describe('MachinesService', () => {
  let service: MachinesService;
  let machineRepository: jest.Mocked<Repository<Machine>>;
  let slotRepository: jest.Mocked<Repository<MachineSlot>>;
  let locationHistoryRepository: jest.Mocked<Repository<MachineLocationHistory>>;
  let componentRepository: jest.Mocked<Repository<MachineComponent>>;
  let errorLogRepository: jest.Mocked<Repository<MachineErrorLog>>;
  let maintenanceRepository: jest.Mocked<Repository<MachineMaintenanceSchedule>>;

  const mockMachine = {
    id: 'machine-uuid-1',
    name: 'VM-001',
    machineNumber: 'M001',
    serialNumber: 'SN-001',
    type: 'coffee',
    status: MachineStatus.ACTIVE,
    organizationId: 'org-uuid-1',
    locationId: 'loc-uuid-1',
    address: '123 Main St',
    latitude: 41.311,
    longitude: 69.279,
    telemetry: {},
    slots: [],
    lastRefillDate: null,
    lastMaintenanceDate: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Machine;

  const mockSlot = {
    id: 'slot-uuid-1',
    machineId: 'machine-uuid-1',
    slotNumber: 1,
    productId: 'product-uuid-1',
    capacity: 20,
    currentQuantity: 10,
    price: 5000,
    costPrice: 3000,
    minQuantity: 2,
    lastRefilledAt: null,
  } as unknown as MachineSlot;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockMachine]),
    getCount: jest.fn().mockResolvedValue(1),
    getManyAndCount: jest.fn().mockResolvedValue([[mockMachine], 1]),
    getRawMany: jest.fn().mockResolvedValue([]),
    groupBy: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachinesService,
        {
          provide: getRepositoryToken(Machine),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(MachineSlot),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MachineLocationHistory),
          useValue: {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MachineComponent),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MachineErrorLog),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MachineMaintenanceSchedule),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MachinesService>(MachinesService);
    machineRepository = module.get(getRepositoryToken(Machine));
    slotRepository = module.get(getRepositoryToken(MachineSlot));
    locationHistoryRepository = module.get(getRepositoryToken(MachineLocationHistory));
    componentRepository = module.get(getRepositoryToken(MachineComponent));
    errorLogRepository = module.get(getRepositoryToken(MachineErrorLog));
    maintenanceRepository = module.get(getRepositoryToken(MachineMaintenanceSchedule));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // MACHINE CRUD
  // ============================================================================

  describe('create', () => {
    it('should create a new machine', async () => {
      machineRepository.create.mockReturnValue(mockMachine);
      machineRepository.save.mockResolvedValue(mockMachine);

      const result = await service.create({
        name: 'VM-001',
        serialNumber: 'SN-001',
        organizationId: 'org-uuid-1',
      });

      expect(result).toEqual(mockMachine);
      expect(machineRepository.create).toHaveBeenCalled();
      expect(machineRepository.save).toHaveBeenCalledWith(mockMachine);
    });
  });

  describe('findAll', () => {
    it('should return paginated machines for organization', async () => {
      const result = await service.findAll('org-uuid-1', { page: 1, limit: 20 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('totalPages', 1);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      await service.findAll('org-uuid-1', {
        status: MachineStatus.ACTIVE,
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'machine.status = :status',
        { status: MachineStatus.ACTIVE },
      );
    });

    it('should cap limit at 100', async () => {
      const result = await service.findAll('org-uuid-1', { page: 1, limit: 200 });

      expect(result.limit).toBeLessThanOrEqual(100);
    });
  });

  describe('findById', () => {
    it('should return machine with slots when found', async () => {
      machineRepository.findOne.mockResolvedValue(mockMachine);

      const result = await service.findById('machine-uuid-1');

      expect(result).toEqual(mockMachine);
      expect(machineRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'machine-uuid-1' },
        relations: ['slots', 'slots.product'],
      });
    });

    it('should return null when machine not found', async () => {
      machineRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update machine when found', async () => {
      machineRepository.findOne.mockResolvedValue(mockMachine);
      machineRepository.save.mockResolvedValue({ ...mockMachine, name: 'VM-002' } as any);

      const result = await service.update('machine-uuid-1', { name: 'VM-002' });

      expect(result.name).toBe('VM-002');
    });

    it('should throw NotFoundException when machine not found', async () => {
      machineRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'VM-002' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update machine status', async () => {
      machineRepository.findOne.mockResolvedValue(mockMachine);
      machineRepository.save.mockResolvedValue({
        ...mockMachine,
        status: MachineStatus.MAINTENANCE,
      } as any);

      const result = await service.updateStatus(
        'machine-uuid-1',
        MachineStatus.MAINTENANCE,
      );

      expect(result.status).toBe(MachineStatus.MAINTENANCE);
    });
  });

  describe('remove', () => {
    it('should soft delete machine when found', async () => {
      machineRepository.findOne.mockResolvedValue(mockMachine);
      machineRepository.softDelete.mockResolvedValue(undefined as any);

      await service.remove('machine-uuid-1');

      expect(machineRepository.softDelete).toHaveBeenCalledWith('machine-uuid-1');
    });

    it('should throw NotFoundException when machine not found', async () => {
      machineRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================================
  // SLOT MANAGEMENT
  // ============================================================================

  describe('createSlot', () => {
    it('should create a new slot on machine', async () => {
      machineRepository.findOne.mockResolvedValue(mockMachine);
      slotRepository.findOne.mockResolvedValue(null);
      slotRepository.create.mockReturnValue(mockSlot);
      slotRepository.save.mockResolvedValue(mockSlot);

      const result = await service.createSlot('machine-uuid-1', {
        slotNumber: 1,
        productId: 'product-uuid-1',
        capacity: 20,
        price: 5000,
      } as any);

      expect(result).toEqual(mockSlot);
    });

    it('should throw BadRequestException for duplicate slot number', async () => {
      machineRepository.findOne.mockResolvedValue(mockMachine);
      slotRepository.findOne.mockResolvedValue(mockSlot);

      await expect(
        service.createSlot('machine-uuid-1', {
          slotNumber: 1,
          productId: 'product-uuid-1',
          capacity: 20,
          price: 5000,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refillSlot', () => {
    it('should refill slot successfully', async () => {
      const refilledSlot = { ...mockSlot, currentQuantity: 15 } as any;
      slotRepository.findOne.mockResolvedValue(mockSlot);
      slotRepository.save.mockResolvedValue(refilledSlot);
      machineRepository.update.mockResolvedValue(undefined as any);

      const result = await service.refillSlot('slot-uuid-1', { quantity: 5 } as any);

      expect(result.currentQuantity).toBe(15);
    });

    it('should throw BadRequestException when refill exceeds capacity', async () => {
      slotRepository.findOne.mockResolvedValue(mockSlot);

      await expect(
        service.refillSlot('slot-uuid-1', { quantity: 15 } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // MAINTENANCE
  // ============================================================================

  describe('completeMaintenance', () => {
    it('should throw NotFoundException for non-existent schedule', async () => {
      maintenanceRepository.findOne.mockResolvedValue(null);

      await expect(
        service.completeMaintenance('non-existent', {} as any, 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already completed maintenance', async () => {
      maintenanceRepository.findOne.mockResolvedValue({
        id: 'maint-uuid-1',
        status: MaintenanceStatus.COMPLETED,
      } as any);

      await expect(
        service.completeMaintenance('maint-uuid-1', {} as any, 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
