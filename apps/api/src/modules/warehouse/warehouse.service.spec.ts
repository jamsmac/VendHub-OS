import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { WarehouseService } from './warehouse.service';
import {
  Warehouse,
  WarehouseType,
  StockMovement,
  StockMovementType,
  StockMovementStatus,
  InventoryBatch,
} from './entities/warehouse.entity';

describe('WarehouseService', () => {
  let service: WarehouseService;
  let warehouseRepository: jest.Mocked<Repository<Warehouse>>;
  let stockMovementRepository: jest.Mocked<Repository<StockMovement>>;
  let inventoryBatchRepository: jest.Mocked<Repository<InventoryBatch>>;

  const orgId = 'org-uuid-1';

  const mockWarehouse: Warehouse = {
    id: 'warehouse-uuid-1',
    organizationId: orgId,
    name: 'Main Warehouse Tashkent',
    code: 'WH-TAS-001',
    type: WarehouseType.MAIN,
    address: 'Tashkent, Amir Timur 12',
    latitude: 41.311081,
    longitude: 69.240562,
    managerId: 'user-uuid-1',
    phone: '+998901234567',
    isActive: true,
    capacity: 10000,
    currentOccupancy: 3500,
    notes: null,
    metadata: {},
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    deleted_at: null,
    created_by_id: 'user-uuid-1',
    updated_by_id: null,
  } as Warehouse;

  const mockWarehouse2: Warehouse = {
    id: 'warehouse-uuid-2',
    organizationId: orgId,
    name: 'Regional Warehouse Samarkand',
    code: 'WH-SAM-001',
    type: WarehouseType.REGIONAL,
    address: 'Samarkand, Registan 5',
    latitude: 39.654,
    longitude: 66.959,
    managerId: 'user-uuid-2',
    phone: '+998901234568',
    isActive: true,
    capacity: 5000,
    currentOccupancy: 1200,
    notes: null,
    metadata: {},
    created_at: new Date('2025-01-02'),
    updated_at: new Date('2025-01-02'),
    deleted_at: null,
    created_by_id: 'user-uuid-2',
    updated_by_id: null,
  } as Warehouse;

  const mockStockMovement: StockMovement = {
    id: 'movement-uuid-1',
    organizationId: orgId,
    fromWarehouseId: 'warehouse-uuid-1',
    toWarehouseId: 'warehouse-uuid-2',
    productId: 'product-uuid-1',
    quantity: 50,
    unitOfMeasure: 'pcs',
    type: StockMovementType.TRANSFER,
    status: StockMovementStatus.IN_TRANSIT,
    referenceNumber: 'TRF-2025-001',
    requestedByUserId: 'user-uuid-1',
    approvedByUserId: null,
    completedByUserId: null,
    requestedAt: new Date('2025-01-10'),
    completedAt: null,
    cost: 500000,
    notes: 'Urgent transfer',
    metadata: {},
    created_at: new Date('2025-01-10'),
    updated_at: new Date('2025-01-10'),
    deleted_at: null,
    created_by_id: 'user-uuid-1',
    updated_by_id: null,
  } as StockMovement;

  const mockWarehouseQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockWarehouse]),
    getCount: jest.fn().mockResolvedValue(1),
    getManyAndCount: jest.fn().mockResolvedValue([[mockWarehouse], 1]),
    getRawMany: jest.fn().mockResolvedValue([]),
    groupBy: jest.fn().mockReturnThis(),
  };

  const mockInventoryQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
    getRawMany: jest.fn().mockResolvedValue([]),
    groupBy: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    // Reset all query builder mocks before each test
    Object.values(mockWarehouseQueryBuilder).forEach((fn) => {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        (fn as jest.Mock).mockClear();
      }
    });
    Object.values(mockInventoryQueryBuilder).forEach((fn) => {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        (fn as jest.Mock).mockClear();
      }
    });

    // Re-set default return values after clearing
    mockWarehouseQueryBuilder.where.mockReturnThis();
    mockWarehouseQueryBuilder.andWhere.mockReturnThis();
    mockWarehouseQueryBuilder.orderBy.mockReturnThis();
    mockWarehouseQueryBuilder.skip.mockReturnThis();
    mockWarehouseQueryBuilder.take.mockReturnThis();
    mockWarehouseQueryBuilder.select.mockReturnThis();
    mockWarehouseQueryBuilder.addSelect.mockReturnThis();
    mockWarehouseQueryBuilder.groupBy.mockReturnThis();
    mockWarehouseQueryBuilder.getMany.mockResolvedValue([mockWarehouse]);
    mockWarehouseQueryBuilder.getCount.mockResolvedValue(1);

    mockInventoryQueryBuilder.where.mockReturnThis();
    mockInventoryQueryBuilder.andWhere.mockReturnThis();
    mockInventoryQueryBuilder.orderBy.mockReturnThis();
    mockInventoryQueryBuilder.skip.mockReturnThis();
    mockInventoryQueryBuilder.take.mockReturnThis();
    mockInventoryQueryBuilder.select.mockReturnThis();
    mockInventoryQueryBuilder.addSelect.mockReturnThis();
    mockInventoryQueryBuilder.groupBy.mockReturnThis();
    mockInventoryQueryBuilder.getRawMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseService,
        {
          provide: getRepositoryToken(Warehouse),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockWarehouseQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(StockMovement),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InventoryBatch),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockInventoryQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<WarehouseService>(WarehouseService);
    warehouseRepository = module.get(getRepositoryToken(Warehouse));
    stockMovementRepository = module.get(getRepositoryToken(StockMovement));
    inventoryBatchRepository = module.get(getRepositoryToken(InventoryBatch));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // WAREHOUSE CRUD
  // ============================================================================

  describe('create', () => {
    it('should create a new warehouse and assign organizationId', async () => {
      const dto = {
        organizationId: orgId,
        name: 'Main Warehouse Tashkent',
        code: 'WH-TAS-001',
        type: WarehouseType.MAIN,
        address: 'Tashkent, Amir Timur 12',
      };
      const userId = 'user-uuid-1';

      warehouseRepository.create.mockReturnValue(mockWarehouse);
      warehouseRepository.save.mockResolvedValue(mockWarehouse);

      const result = await service.create(dto, userId);

      expect(result).toEqual(mockWarehouse);
      expect(warehouseRepository.create).toHaveBeenCalledWith({
        ...dto,
        created_by_id: userId,
      });
      expect(warehouseRepository.save).toHaveBeenCalledWith(mockWarehouse);
    });

    it('should create a warehouse without userId when not provided', async () => {
      const dto = {
        organizationId: orgId,
        name: 'Transit Warehouse',
        code: 'WH-TRN-001',
      };

      warehouseRepository.create.mockReturnValue(mockWarehouse);
      warehouseRepository.save.mockResolvedValue(mockWarehouse);

      const result = await service.create(dto);

      expect(result).toEqual(mockWarehouse);
      expect(warehouseRepository.create).toHaveBeenCalledWith({
        ...dto,
        created_by_id: undefined,
      });
    });
  });

  // ============================================================================
  // FIND ALL (PAGINATED WITH FILTERS)
  // ============================================================================

  describe('findAll', () => {
    it('should return paginated warehouses for organization', async () => {
      const result = await service.findAll(orgId, { page: 1, limit: 20 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 20);
      expect(result).toHaveProperty('totalPages', 1);
      expect(mockWarehouseQueryBuilder.where).toHaveBeenCalledWith(
        'warehouse.organizationId = :organizationId',
        { organizationId: orgId },
      );
      expect(mockWarehouseQueryBuilder.orderBy).toHaveBeenCalledWith('warehouse.name', 'ASC');
      expect(mockWarehouseQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockWarehouseQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should filter by warehouse type', async () => {
      await service.findAll(orgId, { type: WarehouseType.REGIONAL });

      expect(mockWarehouseQueryBuilder.andWhere).toHaveBeenCalledWith(
        'warehouse.type = :type',
        { type: WarehouseType.REGIONAL },
      );
    });

    it('should filter by isActive', async () => {
      await service.findAll(orgId, { isActive: true });

      expect(mockWarehouseQueryBuilder.andWhere).toHaveBeenCalledWith(
        'warehouse.isActive = :isActive',
        { isActive: true },
      );
    });

    it('should filter by search query across name, code, and address', async () => {
      await service.findAll(orgId, { search: 'Tashkent' });

      expect(mockWarehouseQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(warehouse.name ILIKE :search OR warehouse.code ILIKE :search OR warehouse.address ILIKE :search)',
        { search: '%Tashkent%' },
      );
    });

    it('should use default page=1 and limit=20 when filters are not provided', async () => {
      const result = await service.findAll(orgId);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(mockWarehouseQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockWarehouseQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should calculate correct totalPages', async () => {
      mockWarehouseQueryBuilder.getCount.mockResolvedValueOnce(45);

      const result = await service.findAll(orgId, { page: 1, limit: 20 });

      expect(result.totalPages).toBe(3); // Math.ceil(45 / 20) = 3
    });
  });

  // ============================================================================
  // FIND BY ID
  // ============================================================================

  describe('findById', () => {
    it('should return warehouse when found', async () => {
      warehouseRepository.findOne.mockResolvedValue(mockWarehouse);

      const result = await service.findById('warehouse-uuid-1');

      expect(result).toEqual(mockWarehouse);
      expect(warehouseRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'warehouse-uuid-1' },
      });
    });

    it('should return null when warehouse not found', async () => {
      warehouseRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // UPDATE
  // ============================================================================

  describe('update', () => {
    it('should update warehouse when found', async () => {
      const updatedWarehouse = {
        ...mockWarehouse,
        name: 'Updated Warehouse Name',
        updated_by_id: 'user-uuid-3',
      } as Warehouse;

      warehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      warehouseRepository.save.mockResolvedValue(updatedWarehouse);

      const result = await service.update(
        'warehouse-uuid-1',
        { name: 'Updated Warehouse Name' },
        'user-uuid-3',
      );

      expect(result.name).toBe('Updated Warehouse Name');
      expect(warehouseRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      warehouseRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set updated_by_id from userId parameter', async () => {
      warehouseRepository.findOne.mockResolvedValue({ ...mockWarehouse } as Warehouse);
      warehouseRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as Warehouse),
      );

      const result = await service.update(
        'warehouse-uuid-1',
        { name: 'Changed' },
        'user-uuid-5',
      );

      expect(result.updated_by_id).toBe('user-uuid-5');
    });
  });

  // ============================================================================
  // REMOVE (SOFT DELETE)
  // ============================================================================

  describe('remove', () => {
    it('should soft delete warehouse when found', async () => {
      warehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      warehouseRepository.softDelete.mockResolvedValue(undefined as any);

      await service.remove('warehouse-uuid-1');

      expect(warehouseRepository.softDelete).toHaveBeenCalledWith('warehouse-uuid-1');
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      warehouseRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================================
  // STOCK TRANSFER
  // ============================================================================

  describe('transferStock', () => {
    it('should create a stock movement between two warehouses', async () => {
      warehouseRepository.findOne
        .mockResolvedValueOnce(mockWarehouse)   // source warehouse
        .mockResolvedValueOnce(mockWarehouse2);  // destination warehouse

      stockMovementRepository.create.mockReturnValue(mockStockMovement);
      stockMovementRepository.save.mockResolvedValue(mockStockMovement);

      const result = await service.transferStock(
        orgId,
        'warehouse-uuid-1',
        'warehouse-uuid-2',
        'product-uuid-1',
        50,
        'user-uuid-1',
        { referenceNumber: 'TRF-2025-001', cost: 500000, notes: 'Urgent transfer' },
      );

      expect(result).toEqual(mockStockMovement);
      expect(stockMovementRepository.create).toHaveBeenCalledWith({
        organizationId: orgId,
        fromWarehouseId: 'warehouse-uuid-1',
        toWarehouseId: 'warehouse-uuid-2',
        productId: 'product-uuid-1',
        quantity: 50,
        type: StockMovementType.TRANSFER,
        status: StockMovementStatus.IN_TRANSIT,
        requestedByUserId: 'user-uuid-1',
        referenceNumber: 'TRF-2025-001',
        cost: 500000,
        notes: 'Urgent transfer',
        created_by_id: 'user-uuid-1',
      });
      expect(stockMovementRepository.save).toHaveBeenCalledWith(mockStockMovement);
    });

    it('should throw NotFoundException when source warehouse not found', async () => {
      warehouseRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.transferStock(
          orgId,
          'non-existent-from',
          'warehouse-uuid-2',
          'product-uuid-1',
          10,
          'user-uuid-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when destination warehouse not found', async () => {
      warehouseRepository.findOne
        .mockResolvedValueOnce(mockWarehouse)   // source found
        .mockResolvedValueOnce(null);            // destination not found

      await expect(
        service.transferStock(
          orgId,
          'warehouse-uuid-1',
          'non-existent-to',
          'product-uuid-1',
          10,
          'user-uuid-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when source and destination are the same', async () => {
      warehouseRepository.findOne
        .mockResolvedValueOnce(mockWarehouse)
        .mockResolvedValueOnce(mockWarehouse);

      await expect(
        service.transferStock(
          orgId,
          'warehouse-uuid-1',
          'warehouse-uuid-1',
          'product-uuid-1',
          10,
          'user-uuid-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create movement without optional fields when options are omitted', async () => {
      warehouseRepository.findOne
        .mockResolvedValueOnce(mockWarehouse)
        .mockResolvedValueOnce(mockWarehouse2);

      const movementWithoutOptions = {
        ...mockStockMovement,
        referenceNumber: undefined,
        cost: undefined,
        notes: undefined,
      } as unknown as StockMovement;

      stockMovementRepository.create.mockReturnValue(movementWithoutOptions);
      stockMovementRepository.save.mockResolvedValue(movementWithoutOptions);

      const result = await service.transferStock(
        orgId,
        'warehouse-uuid-1',
        'warehouse-uuid-2',
        'product-uuid-1',
        25,
        'user-uuid-1',
      );

      expect(result).toEqual(movementWithoutOptions);
      expect(stockMovementRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceNumber: undefined,
          cost: undefined,
          notes: undefined,
        }),
      );
    });
  });

  // ============================================================================
  // WAREHOUSE INVENTORY
  // ============================================================================

  describe('getWarehouseInventory', () => {
    it('should return warehouse with aggregated inventory data', async () => {
      const mockInventoryRows = [
        {
          productId: 'product-uuid-1',
          totalQuantity: '150',
          batchCount: '3',
          nearestExpiry: '2025-06-30',
        },
        {
          productId: 'product-uuid-2',
          totalQuantity: '80',
          batchCount: '1',
          nearestExpiry: null,
        },
      ];

      warehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockInventoryQueryBuilder.getRawMany.mockResolvedValueOnce(mockInventoryRows);

      const result = await service.getWarehouseInventory('warehouse-uuid-1', orgId);

      expect(result).toHaveProperty('warehouse');
      expect(result).toHaveProperty('inventory');
      expect(result.warehouse).toEqual(mockWarehouse);
      expect(result.inventory).toEqual(mockInventoryRows);

      expect(warehouseRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'warehouse-uuid-1', organizationId: orgId },
      });
      expect(inventoryBatchRepository.createQueryBuilder).toHaveBeenCalledWith('batch');
      expect(mockInventoryQueryBuilder.where).toHaveBeenCalledWith(
        'batch.warehouseId = :warehouseId',
        { warehouseId: 'warehouse-uuid-1' },
      );
      expect(mockInventoryQueryBuilder.andWhere).toHaveBeenCalledWith(
        'batch.organizationId = :organizationId',
        { organizationId: orgId },
      );
      expect(mockInventoryQueryBuilder.groupBy).toHaveBeenCalledWith('batch.productId');
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      warehouseRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getWarehouseInventory('non-existent-id', orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty inventory array when warehouse has no batches', async () => {
      warehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockInventoryQueryBuilder.getRawMany.mockResolvedValueOnce([]);

      const result = await service.getWarehouseInventory('warehouse-uuid-1', orgId);

      expect(result.warehouse).toEqual(mockWarehouse);
      expect(result.inventory).toEqual([]);
    });
  });
});
