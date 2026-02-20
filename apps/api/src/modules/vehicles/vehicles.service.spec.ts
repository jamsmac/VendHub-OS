import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { VehiclesService } from './vehicles.service';
import { Vehicle, VehicleType, VehicleStatus } from './entities/vehicle.entity';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let vehicleRepository: jest.Mocked<Repository<Vehicle>>;

  const mockVehicle = {
    id: 'vehicle-uuid-1',
    organizationId: 'org-uuid-1',
    ownerEmployeeId: null,
    type: VehicleType.COMPANY,
    brand: 'Toyota',
    model: 'Dyna',
    plateNumber: '01A123BC',
    currentOdometer: 50000,
    lastOdometerUpdate: new Date(),
    status: VehicleStatus.ACTIVE,
    notes: null,
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Vehicle;

  const createMockQueryBuilder = (result: any = []) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(1),
    getMany: jest.fn().mockResolvedValue(Array.isArray(result) ? result : [result]),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        {
          provide: getRepositoryToken(Vehicle),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
    vehicleRepository = module.get(getRepositoryToken(Vehicle));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE
  // ============================================================================

  describe('create', () => {
    const createDto = {
      type: VehicleType.COMPANY,
      brand: 'Toyota',
      model: 'Dyna',
      plateNumber: '01A123BC',
    };

    it('should create a new vehicle', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);
      vehicleRepository.create.mockReturnValue(mockVehicle);
      vehicleRepository.save.mockResolvedValue(mockVehicle);

      const result = await service.create(createDto as any, 'org-uuid-1', 'user-1');

      expect(result).toEqual(mockVehicle);
      expect(vehicleRepository.findOne).toHaveBeenCalledWith({
        where: { plateNumber: '01A123BC', organizationId: 'org-uuid-1' },
      });
      expect(vehicleRepository.create).toHaveBeenCalled();
      expect(vehicleRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for duplicate plate in same org', async () => {
      vehicleRepository.findOne.mockResolvedValue(mockVehicle);

      await expect(
        service.create(createDto as any, 'org-uuid-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set default odometer to 0 when not provided', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);
      vehicleRepository.create.mockReturnValue(mockVehicle);
      vehicleRepository.save.mockResolvedValue(mockVehicle);

      await service.create(createDto as any, 'org-uuid-1');

      expect(vehicleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ currentOdometer: 0 }),
      );
    });
  });

  // ============================================================================
  // FIND ALL
  // ============================================================================

  describe('findAll', () => {
    it('should return paginated vehicles for organization', async () => {
      const qb = createMockQueryBuilder(mockVehicle);
      vehicleRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findAll('org-uuid-1');

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('totalPages');
      expect(qb.where).toHaveBeenCalledWith(
        'vehicle.organizationId = :organizationId',
        { organizationId: 'org-uuid-1' },
      );
    });

    it('should apply search filter when provided', async () => {
      const qb = createMockQueryBuilder(mockVehicle);
      vehicleRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAll('org-uuid-1', { search: 'Toyota' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%Toyota%' },
      );
    });

    it('should apply type filter when provided', async () => {
      const qb = createMockQueryBuilder(mockVehicle);
      vehicleRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAll('org-uuid-1', { type: VehicleType.PERSONAL });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'vehicle.type = :type',
        { type: VehicleType.PERSONAL },
      );
    });
  });

  // ============================================================================
  // FIND BY ID
  // ============================================================================

  describe('findById', () => {
    it('should return vehicle when found', async () => {
      vehicleRepository.findOne.mockResolvedValue(mockVehicle);

      const result = await service.findById('vehicle-uuid-1');

      expect(result).toEqual(mockVehicle);
      expect(vehicleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'vehicle-uuid-1' },
      });
    });

    it('should return null when vehicle not found', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // UPDATE
  // ============================================================================

  describe('update', () => {
    it('should update vehicle when found', async () => {
      const existingVehicle = { ...mockVehicle } as any;
      vehicleRepository.findOne.mockResolvedValue(existingVehicle);
      vehicleRepository.save.mockImplementation(async (v) => v as Vehicle);

      const result = await service.update('vehicle-uuid-1', { brand: 'Honda' }, 'user-1');

      expect(result.brand).toBe('Honda');
      expect(result.updated_by_id).toBe('user-1');
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { brand: 'Honda' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update lastOdometerUpdate when odometer changes', async () => {
      const existingVehicle = { ...mockVehicle, lastOdometerUpdate: null } as any;
      vehicleRepository.findOne.mockResolvedValue(existingVehicle);
      vehicleRepository.save.mockImplementation(async (v) => v as Vehicle);

      const result = await service.update('vehicle-uuid-1', { currentOdometer: 60000 });

      expect(result.currentOdometer).toBe(60000);
      expect(result.lastOdometerUpdate).toBeInstanceOf(Date);
    });
  });

  // ============================================================================
  // UPDATE ODOMETER
  // ============================================================================

  describe('updateOdometer', () => {
    it('should update odometer and timestamp', async () => {
      const existingVehicle = { ...mockVehicle } as any;
      vehicleRepository.findOne.mockResolvedValue(existingVehicle);
      vehicleRepository.save.mockImplementation(async (v) => v as Vehicle);

      const result = await service.updateOdometer('vehicle-uuid-1', 75000, 'user-1');

      expect(result.currentOdometer).toBe(75000);
      expect(result.lastOdometerUpdate).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateOdometer('non-existent', 75000),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // REMOVE
  // ============================================================================

  describe('remove', () => {
    it('should soft delete vehicle when found', async () => {
      vehicleRepository.findOne.mockResolvedValue(mockVehicle);
      vehicleRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove('vehicle-uuid-1');

      expect(vehicleRepository.softDelete).toHaveBeenCalledWith('vehicle-uuid-1');
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
