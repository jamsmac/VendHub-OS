import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

import { LocationsService } from './locations.service';
import { Location } from './entities/location.entity';

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
  addSelect: jest.fn().mockReturnThis(),
  setParameters: jest.fn().mockReturnThis(),
  having: jest.fn().mockReturnThis(),
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

// ============================================================================
// TESTS
// ============================================================================

describe('LocationsService', () => {
  let service: LocationsService;
  let locationRepo: MockRepository<Location>;
  let mockQb: ReturnType<typeof createMockQueryBuilder>;

  const mockLocation: Partial<Location> = {
    id: 'loc-uuid-1',
    name: 'Mega Planet',
    code: 'LOC-TAS-A1B2',
    description: 'Large shopping center',
    type: 'shopping_center' as any,
    status: 'active' as any,
    address: {
      country: 'Uzbekistan',
      region: 'Toshkent viloyati',
      city: 'Toshkent',
      street: 'Amir Temur ko\'chasi',
      building: '15A',
      fullAddress: 'Toshkent, Amir Temur ko\'chasi, 15A',
    } as any,
    city: 'Toshkent',
    latitude: 41.3111,
    longitude: 69.2797,
    organizationId: ORG_ID,
    isActive: true,
    machineCount: 3,
    totalRevenue: 15000000,
  };

  const mockLocation2: Partial<Location> = {
    ...mockLocation,
    id: 'loc-uuid-2',
    name: 'Samarkand Darvoza',
    code: 'LOC-TAS-C3D4',
  };

  beforeEach(async () => {
    locationRepo = createMockRepository<Location>();
    mockQb = createMockQueryBuilder();
    locationRepo.createQueryBuilder!.mockReturnValue(mockQb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: getRepositoryToken(Location), useValue: locationRepo },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // create
  // ==========================================================================

  describe('create', () => {
    it('should create and save a location', async () => {
      const data: Partial<Location> = {
        name: 'Mega Planet',
        organizationId: ORG_ID,
        city: 'Toshkent',
        latitude: 41.3111,
        longitude: 69.2797,
      };

      locationRepo.create!.mockReturnValue(mockLocation);
      locationRepo.save!.mockResolvedValue(mockLocation);

      const result = await service.create(data);

      expect(locationRepo.create).toHaveBeenCalledWith(data);
      expect(locationRepo.save).toHaveBeenCalledWith(mockLocation);
      expect(result).toEqual(mockLocation);
    });

    it('should pass through all provided fields', async () => {
      const data: Partial<Location> = {
        name: 'Test Location',
        organizationId: ORG_ID,
        city: 'Toshkent',
        latitude: 41.0,
        longitude: 69.0,
        isActive: false,
      };

      locationRepo.create!.mockReturnValue(data);
      locationRepo.save!.mockResolvedValue(data);

      await service.create(data);

      expect(locationRepo.create).toHaveBeenCalledWith(data);
    });
  });

  // ==========================================================================
  // findAll
  // ==========================================================================

  describe('findAll', () => {
    it('should return paginated results with defaults', async () => {
      mockQb.getCount.mockResolvedValue(2);
      mockQb.getMany.mockResolvedValue([mockLocation, mockLocation2]);

      const result = await service.findAll(ORG_ID);

      expect(mockQb.where).toHaveBeenCalledWith(
        'location.organizationId = :organizationId',
        { organizationId: ORG_ID },
      );
      expect(mockQb.skip).toHaveBeenCalledWith(0);
      expect(mockQb.take).toHaveBeenCalledWith(50);
      expect(mockQb.orderBy).toHaveBeenCalledWith('location.name', 'ASC');
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
    });

    it('should apply custom page and limit', async () => {
      mockQb.getCount.mockResolvedValue(100);
      mockQb.getMany.mockResolvedValue([mockLocation]);

      const result = await service.findAll(ORG_ID, { page: 3, limit: 10 });

      expect(mockQb.skip).toHaveBeenCalledWith(20);
      expect(mockQb.take).toHaveBeenCalledWith(10);
      expect(result.totalPages).toBe(10);
    });

    it('should apply search filter with ILIKE', async () => {
      mockQb.getCount.mockResolvedValue(1);
      mockQb.getMany.mockResolvedValue([mockLocation]);

      await service.findAll(ORG_ID, { search: 'Mega' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        '(location.name ILIKE :search OR location.address ILIKE :search)',
        { search: '%Mega%' },
      );
    });

    it('should not apply search filter when search is undefined', async () => {
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);

      await service.findAll(ORG_ID, { page: 1, limit: 50 });

      expect(mockQb.andWhere).not.toHaveBeenCalled();
    });

    it('should handle empty options parameter', async () => {
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);

      const result = await service.findAll(ORG_ID);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });
  });

  // ==========================================================================
  // findById
  // ==========================================================================

  describe('findById', () => {
    it('should return a location when found', async () => {
      locationRepo.findOne!.mockResolvedValue(mockLocation);

      const result = await service.findById('loc-uuid-1');

      expect(locationRepo.findOne).toHaveBeenCalledWith({ where: { id: 'loc-uuid-1' } });
      expect(result).toEqual(mockLocation);
    });

    it('should return null when location not found', async () => {
      locationRepo.findOne!.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // findNearby
  // ==========================================================================

  describe('findNearby', () => {
    it('should query nearby locations with distance calculation', async () => {
      mockQb.getMany.mockResolvedValue([mockLocation]);

      const result = await service.findNearby(41.3, 69.28, 5, ORG_ID);

      expect(locationRepo.createQueryBuilder).toHaveBeenCalledWith('location');
      expect(mockQb.addSelect).toHaveBeenCalled();
      expect(mockQb.where).toHaveBeenCalledWith('location.isActive = true');
      expect(mockQb.setParameters).toHaveBeenCalledWith({ lat: 41.3, lng: 69.28 });
      expect(mockQb.having).toHaveBeenCalledWith('distance < :radius', { radius: 5 });
      expect(mockQb.orderBy).toHaveBeenCalledWith('distance', 'ASC');
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'location.organizationId = :organizationId',
        { organizationId: ORG_ID },
      );
      expect(result).toHaveLength(1);
    });

    it('should cap limit to 100', async () => {
      mockQb.getMany.mockResolvedValue([]);

      await service.findNearby(41.3, 69.28, 10, undefined, 200);

      expect(mockQb.take).toHaveBeenCalledWith(100);
    });

    it('should not filter by organizationId when not provided', async () => {
      mockQb.getMany.mockResolvedValue([]);

      await service.findNearby(41.3, 69.28, 5);

      expect(mockQb.andWhere).not.toHaveBeenCalledWith(
        'location.organizationId = :organizationId',
        expect.anything(),
      );
    });

    it('should use default limit of 50', async () => {
      mockQb.getMany.mockResolvedValue([]);

      await service.findNearby(41.3, 69.28, 5);

      expect(mockQb.take).toHaveBeenCalledWith(50);
    });
  });

  // ==========================================================================
  // update
  // ==========================================================================

  describe('update', () => {
    it('should update and save a location', async () => {
      locationRepo.findOne!.mockResolvedValue({ ...mockLocation });
      locationRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.update('loc-uuid-1', { name: 'Updated Name' } as any);

      expect(result.name).toBe('Updated Name');
      expect(locationRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when location not found', async () => {
      locationRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { name: 'Test' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should merge multiple fields via Object.assign', async () => {
      locationRepo.findOne!.mockResolvedValue({ ...mockLocation });
      locationRepo.save!.mockImplementation((entity) => Promise.resolve(entity));

      const updateData = { name: 'New Name', machineCount: 10, isActive: false };
      const result = await service.update('loc-uuid-1', updateData as any);

      expect(result.name).toBe('New Name');
      expect(result.machineCount).toBe(10);
      expect(result.isActive).toBe(false);
    });
  });

  // ==========================================================================
  // remove
  // ==========================================================================

  describe('remove', () => {
    it('should soft delete an existing location', async () => {
      locationRepo.findOne!.mockResolvedValue(mockLocation);
      locationRepo.softDelete!.mockResolvedValue({ affected: 1 });

      await service.remove('loc-uuid-1');

      expect(locationRepo.softDelete).toHaveBeenCalledWith('loc-uuid-1');
    });

    it('should throw NotFoundException when location not found', async () => {
      locationRepo.findOne!.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
