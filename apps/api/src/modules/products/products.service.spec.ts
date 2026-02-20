import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { ProductsService } from './products.service';
import {
  Product,
  Recipe,
  RecipeIngredient,
  RecipeSnapshot,
  IngredientBatch,
  IngredientBatchStatus,
  ProductPriceHistory,
  Supplier,
} from './entities/product.entity';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: jest.Mocked<Repository<Product>>;
  let recipeRepository: jest.Mocked<Repository<Recipe>>;
  let recipeIngredientRepository: jest.Mocked<Repository<RecipeIngredient>>;
  let recipeSnapshotRepository: jest.Mocked<Repository<RecipeSnapshot>>;
  let ingredientBatchRepository: jest.Mocked<Repository<IngredientBatch>>;
  let priceHistoryRepository: jest.Mocked<Repository<ProductPriceHistory>>;
  let supplierRepository: jest.Mocked<Repository<Supplier>>;

  const orgId = 'org-uuid-1';

  const mockProduct = {
    id: 'product-uuid-1',
    name: 'Americano',
    nameUz: 'Amerikano',
    sku: 'AMR-001',
    barcode: '4900000000001',
    type: 'beverage',
    category: 'coffee',
    isActive: true,
    sellingPrice: 12000,
    purchasePrice: 5000,
    imageUrl: null,
    unitOfMeasure: 'cup',
    organizationId: orgId,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Product;

  const mockRecipe = {
    id: 'recipe-uuid-1',
    productId: 'product-uuid-1',
    organizationId: orgId,
    name: 'Standard Americano',
    version: 1,
    totalCost: 3500,
    ingredients: [],
    created_at: new Date(),
  } as unknown as Recipe;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockProduct]),
    getCount: jest.fn().mockResolvedValue(1),
    getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Recipe),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RecipeIngredient),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RecipeSnapshot),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(IngredientBatch),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProductPriceHistory),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepository = module.get(getRepositoryToken(Product));
    recipeRepository = module.get(getRepositoryToken(Recipe));
    recipeIngredientRepository = module.get(getRepositoryToken(RecipeIngredient));
    recipeSnapshotRepository = module.get(getRepositoryToken(RecipeSnapshot));
    ingredientBatchRepository = module.get(getRepositoryToken(IngredientBatch));
    priceHistoryRepository = module.get(getRepositoryToken(ProductPriceHistory));
    supplierRepository = module.get(getRepositoryToken(Supplier));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // PRODUCT CRUD
  // ============================================================================

  describe('create', () => {
    it('should create a new product', async () => {
      productRepository.create.mockReturnValue(mockProduct);
      productRepository.save.mockResolvedValue(mockProduct);

      const result = await service.create({
        name: 'Americano',
        organizationId: orgId,
      });

      expect(result).toEqual(mockProduct);
      expect(productRepository.create).toHaveBeenCalled();
      expect(productRepository.save).toHaveBeenCalledWith(mockProduct);
    });
  });

  describe('findAll', () => {
    it('should return paginated products for organization', async () => {
      const result = await service.findAll(orgId, { page: 1, limit: 50 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('totalPages', 1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.organizationId = :organizationId',
        { organizationId: orgId },
      );
    });

    it('should filter by type', async () => {
      await service.findAll(orgId, { type: 'beverage' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.type = :type',
        { type: 'beverage' },
      );
    });

    it('should filter by search query', async () => {
      await service.findAll(orgId, { search: 'coffee' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(product.name ILIKE :search OR product.barcode ILIKE :search OR product.sku ILIKE :search)',
        { search: '%coffee%' },
      );
    });

    it('should cap limit at 100', async () => {
      const result = await service.findAll(orgId, { limit: 500 });

      expect(result.limit).toBeLessThanOrEqual(100);
    });
  });

  describe('findById', () => {
    it('should return product when found', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.findById('product-uuid-1');

      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should filter by organizationId when provided', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct);

      await service.findById('product-uuid-1', orgId);

      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'product-uuid-1', organizationId: orgId },
      });
    });
  });

  describe('update', () => {
    it('should update product when found', async () => {
      const updatedProduct = { ...mockProduct, name: 'Espresso' } as any;
      productRepository.findOne.mockResolvedValue(mockProduct);
      productRepository.save.mockResolvedValue(updatedProduct);

      const result = await service.update('product-uuid-1', { name: 'Espresso' });

      expect(result.name).toBe('Espresso');
    });

    it('should throw NotFoundException when product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'Espresso' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete product when found', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct);
      productRepository.softDelete.mockResolvedValue(undefined as any);

      await service.remove('product-uuid-1');

      expect(productRepository.softDelete).toHaveBeenCalledWith('product-uuid-1');
    });

    it('should throw NotFoundException when product not found', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================================
  // RECIPE COST CALCULATION
  // ============================================================================

  describe('calculateRecipeCost', () => {
    it('should calculate total recipe cost from ingredient prices', async () => {
      const ingredients = [
        { ingredientId: 'ing-1', quantity: 2 },
        { ingredientId: 'ing-2', quantity: 3 },
      ];
      recipeRepository.findOne.mockResolvedValue({
        ...mockRecipe,
        ingredients,
      } as any);
      productRepository.find.mockResolvedValue([
        { id: 'ing-1', purchasePrice: 1000 },
        { id: 'ing-2', purchasePrice: 500 },
      ] as any);

      const cost = await service.calculateRecipeCost('recipe-uuid-1');

      expect(cost).toBe(3500); // 2*1000 + 3*500
    });

    it('should return 0 for recipe with no ingredients', async () => {
      recipeRepository.findOne.mockResolvedValue({
        ...mockRecipe,
        ingredients: [],
      } as any);

      const cost = await service.calculateRecipeCost('recipe-uuid-1');

      expect(cost).toBe(0);
    });

    it('should throw NotFoundException for non-existent recipe', async () => {
      recipeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.calculateRecipeCost('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // BATCH TRACKING (FIFO)
  // ============================================================================

  describe('depleteFromBatch', () => {
    it('should deplete from oldest batch first (FIFO)', async () => {
      const batches = [
        { id: 'batch-1', remainingQuantity: 5, reservedQuantity: 0, status: IngredientBatchStatus.IN_STOCK } as any,
        { id: 'batch-2', remainingQuantity: 10, reservedQuantity: 0, status: IngredientBatchStatus.IN_STOCK } as any,
      ];
      ingredientBatchRepository.find.mockResolvedValue(batches);
      ingredientBatchRepository.save.mockImplementation((batch) =>
        Promise.resolve(batch as any),
      );

      const result = await service.depleteFromBatch('product-uuid-1', orgId, 7);

      expect(result.depletedFrom).toHaveLength(2);
      expect(result.depletedFrom[0].batchId).toBe('batch-1');
      expect(result.depletedFrom[0].quantity).toBe(5);
      expect(result.depletedFrom[1].batchId).toBe('batch-2');
      expect(result.depletedFrom[1].quantity).toBe(2);
      expect(result.remaining).toBe(0);
    });

    it('should throw BadRequestException for non-positive quantity', async () => {
      await expect(
        service.depleteFromBatch('product-uuid-1', orgId, 0),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.depleteFromBatch('product-uuid-1', orgId, -5),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // PRICE HISTORY
  // ============================================================================

  describe('updatePrice', () => {
    it('should update price and create history record', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct);
      priceHistoryRepository.update.mockResolvedValue(undefined as any);
      priceHistoryRepository.create.mockReturnValue({} as any);
      priceHistoryRepository.save.mockResolvedValue({ id: 'ph-1' } as any);
      productRepository.save.mockResolvedValue({
        ...mockProduct,
        sellingPrice: 15000,
      } as any);

      const result = await service.updatePrice(
        'product-uuid-1',
        orgId,
        { sellingPrice: 15000, changeReason: 'Market adjustment' },
        'user-uuid-1',
      );

      expect(result).toHaveProperty('product');
      expect(result).toHaveProperty('history');
    });

    it('should throw BadRequestException when no price fields provided', async () => {
      productRepository.findOne.mockResolvedValue(mockProduct);

      await expect(
        service.updatePrice(
          'product-uuid-1',
          orgId,
          {} as any,
          'user-uuid-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
