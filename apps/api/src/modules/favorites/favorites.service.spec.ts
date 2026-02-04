import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { FavoritesService } from './favorites.service';
import { Favorite, FavoriteType } from './entities/favorite.entity';
import { Product } from '../products/entities/product.entity';
import { Machine } from '../machines/entities/machine.entity';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let favoriteRepo: jest.Mocked<Repository<Favorite>>;
  let productRepo: jest.Mocked<Repository<Product>>;
  let machineRepo: jest.Mocked<Repository<Machine>>;

  const userId = 'user-uuid-1';
  const favoriteId = 'favorite-uuid-1';
  const productId = 'product-uuid-1';
  const machineId = 'machine-uuid-1';

  const mockProduct: Product = {
    id: productId,
    name: 'Americano',
    nameUz: 'Amerikano',
    sellingPrice: 12000,
    imageUrl: null,
    isActive: true,
    category: { id: 'cat-1', name: 'Coffee' },
  } as unknown as Product;

  const mockMachine: Machine = {
    id: machineId,
    name: 'VM-001',
    serialNumber: 'SN001',
    address: 'Tashkent',
    latitude: 41.2995,
    longitude: 69.2401,
    isOnline: true,
  } as unknown as Machine;

  const mockFavorite: Favorite = {
    id: favoriteId,
    userId,
    type: FavoriteType.PRODUCT,
    productId,
    machineId: null,
    notes: 'My favorite coffee',
    sortOrder: 1,
    product: mockProduct,
    machine: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Favorite;

  const mockMachineFavorite: Favorite = {
    id: 'favorite-uuid-2',
    userId,
    type: FavoriteType.MACHINE,
    productId: null,
    machineId,
    notes: null,
    sortOrder: 1,
    product: null,
    machine: mockMachine,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Favorite;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockFavorite]),
    getRawOne: jest.fn().mockResolvedValue({ max: 0 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: getRepositoryToken(Favorite),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
    favoriteRepo = module.get(getRepositoryToken(Favorite));
    productRepo = module.get(getRepositoryToken(Product));
    machineRepo = module.get(getRepositoryToken(Machine));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  describe('addFavorite', () => {
    it('should add a product to favorites', async () => {
      const dto = {
        type: FavoriteType.PRODUCT,
        productId,
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      favoriteRepo.findOne.mockResolvedValue(null); // not already favorited
      favoriteRepo.create.mockReturnValue(mockFavorite);
      favoriteRepo.save.mockResolvedValue(mockFavorite);

      const result = await service.addFavorite(userId, dto as any);

      expect(result.success).toBe(true);
      expect(result.alreadyExists).toBe(false);
      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: { id: productId },
      });
    });

    it('should add a machine to favorites', async () => {
      const dto = {
        type: FavoriteType.MACHINE,
        machineId,
      };

      machineRepo.findOne.mockResolvedValue(mockMachine);
      favoriteRepo.findOne.mockResolvedValue(null);
      favoriteRepo.create.mockReturnValue(mockMachineFavorite);
      favoriteRepo.save.mockResolvedValue(mockMachineFavorite);

      const result = await service.addFavorite(userId, dto as any);

      expect(result.success).toBe(true);
      expect(machineRepo.findOne).toHaveBeenCalledWith({
        where: { id: machineId },
      });
    });

    it('should return existing favorite when already in favorites', async () => {
      const dto = {
        type: FavoriteType.PRODUCT,
        productId,
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      favoriteRepo.findOne.mockResolvedValue(mockFavorite);

      const result = await service.addFavorite(userId, dto as any);

      expect(result.success).toBe(true);
      expect(result.alreadyExists).toBe(true);
      expect(result.id).toEqual(favoriteId);
    });

    it('should throw BadRequestException when productId missing for product type', async () => {
      const dto = {
        type: FavoriteType.PRODUCT,
        // productId missing
      };

      await expect(
        service.addFavorite(userId, dto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when machineId missing for machine type', async () => {
      const dto = {
        type: FavoriteType.MACHINE,
        // machineId missing
      };

      await expect(
        service.addFavorite(userId, dto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      const dto = {
        type: FavoriteType.PRODUCT,
        productId: 'non-existent',
      };

      productRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addFavorite(userId, dto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when machine does not exist', async () => {
      const dto = {
        type: FavoriteType.MACHINE,
        machineId: 'non-existent',
      };

      machineRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addFavorite(userId, dto as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeFavorite', () => {
    it('should remove a favorite by id', async () => {
      favoriteRepo.delete.mockResolvedValue({ affected: 1 } as any);

      await service.removeFavorite(userId, favoriteId);

      expect(favoriteRepo.delete).toHaveBeenCalledWith({
        id: favoriteId,
        userId,
      });
    });

    it('should throw NotFoundException when favorite not found', async () => {
      favoriteRepo.delete.mockResolvedValue({ affected: 0 } as any);

      await expect(
        service.removeFavorite(userId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeFavoriteByItem', () => {
    it('should remove favorite by product id', async () => {
      favoriteRepo.delete.mockResolvedValue({ affected: 1 } as any);

      await service.removeFavoriteByItem(
        userId,
        FavoriteType.PRODUCT,
        productId,
      );

      expect(favoriteRepo.delete).toHaveBeenCalledWith({
        userId,
        type: FavoriteType.PRODUCT,
        productId,
      });
    });

    it('should remove favorite by machine id', async () => {
      favoriteRepo.delete.mockResolvedValue({ affected: 1 } as any);

      await service.removeFavoriteByItem(
        userId,
        FavoriteType.MACHINE,
        machineId,
      );

      expect(favoriteRepo.delete).toHaveBeenCalledWith({
        userId,
        type: FavoriteType.MACHINE,
        machineId,
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      favoriteRepo.delete.mockResolvedValue({ affected: 0 } as any);

      await expect(
        service.removeFavoriteByItem(userId, FavoriteType.PRODUCT, 'none'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateFavorite', () => {
    it('should update favorite notes', async () => {
      const dto = { notes: 'Updated notes' };
      const updated = { ...mockFavorite, notes: 'Updated notes' };

      favoriteRepo.findOne.mockResolvedValue(mockFavorite);
      favoriteRepo.save.mockResolvedValue(updated as Favorite);

      const result = await service.updateFavorite(userId, favoriteId, dto as any);

      expect(result.notes).toEqual('Updated notes');
    });

    it('should throw NotFoundException when favorite not found', async () => {
      favoriteRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateFavorite(userId, 'non-existent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleFavorite', () => {
    it('should add favorite when not exists', async () => {
      favoriteRepo.findOne.mockResolvedValueOnce(null); // toggle check
      productRepo.findOne.mockResolvedValue(mockProduct);
      favoriteRepo.findOne.mockResolvedValueOnce(null); // addFavorite duplicate check
      favoriteRepo.create.mockReturnValue(mockFavorite);
      favoriteRepo.save.mockResolvedValue(mockFavorite);

      const result = await service.toggleFavorite(
        userId,
        FavoriteType.PRODUCT,
        productId,
      );

      expect(result.isFavorite).toBe(true);
    });

    it('should remove favorite when exists', async () => {
      favoriteRepo.findOne.mockResolvedValue(mockFavorite);
      favoriteRepo.delete.mockResolvedValue({ affected: 1 } as any);

      const result = await service.toggleFavorite(
        userId,
        FavoriteType.PRODUCT,
        productId,
      );

      expect(result.isFavorite).toBe(false);
      expect(result.favoriteId).toBeNull();
    });
  });

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  describe('addFavoritesBulk', () => {
    it('should add multiple favorites', async () => {
      const dto = {
        items: [
          { type: FavoriteType.PRODUCT, productId },
          { type: FavoriteType.MACHINE, machineId },
        ],
      };

      productRepo.findOne.mockResolvedValue(mockProduct);
      machineRepo.findOne.mockResolvedValue(mockMachine);
      favoriteRepo.findOne.mockResolvedValue(null);
      favoriteRepo.create.mockReturnValue(mockFavorite);
      favoriteRepo.save.mockResolvedValue(mockFavorite);

      const results = await service.addFavoritesBulk(userId, dto as any);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should handle errors gracefully in bulk add', async () => {
      const dto = {
        items: [
          { type: FavoriteType.PRODUCT, productId: 'non-existent' },
        ],
      };

      productRepo.findOne.mockResolvedValue(null);

      const results = await service.addFavoritesBulk(userId, dto as any);

      expect(results[0].success).toBe(false);
    });
  });

  describe('removeFavoritesBulk', () => {
    it('should remove multiple favorites', async () => {
      favoriteRepo.delete.mockResolvedValue({ affected: 3 } as any);

      const result = await service.removeFavoritesBulk(userId, {
        ids: ['id1', 'id2', 'id3'],
      } as any);

      expect(result).toEqual(3);
    });
  });

  describe('reorderFavorites', () => {
    it('should update sort order for favorites', async () => {
      favoriteRepo.update.mockResolvedValue({ affected: 1 } as any);

      await service.reorderFavorites(userId, {
        orderedIds: ['id1', 'id2', 'id3'],
      } as any);

      expect(favoriteRepo.update).toHaveBeenCalledTimes(3);
      expect(favoriteRepo.update).toHaveBeenCalledWith(
        { id: 'id1', userId },
        { sortOrder: 0 },
      );
      expect(favoriteRepo.update).toHaveBeenCalledWith(
        { id: 'id2', userId },
        { sortOrder: 1 },
      );
      expect(favoriteRepo.update).toHaveBeenCalledWith(
        { id: 'id3', userId },
        { sortOrder: 2 },
      );
    });
  });

  // ============================================================================
  // QUERY OPERATIONS
  // ============================================================================

  describe('isFavorite', () => {
    it('should return true when product is in favorites', async () => {
      favoriteRepo.findOne.mockResolvedValue(mockFavorite);

      const result = await service.isFavorite(
        userId,
        FavoriteType.PRODUCT,
        productId,
      );

      expect(result.isFavorite).toBe(true);
      expect(result.favoriteId).toEqual(favoriteId);
    });

    it('should return false when product is not in favorites', async () => {
      favoriteRepo.findOne.mockResolvedValue(null);

      const result = await service.isFavorite(
        userId,
        FavoriteType.PRODUCT,
        'non-existent',
      );

      expect(result.isFavorite).toBe(false);
    });
  });

  describe('isFavoriteBulk', () => {
    it('should check multiple items at once', async () => {
      favoriteRepo.find.mockResolvedValue([mockFavorite]);

      const result = await service.isFavoriteBulk(
        userId,
        FavoriteType.PRODUCT,
        [productId, 'other-product'],
      );

      expect(result.items[productId]).toBe(true);
      expect(result.items['other-product']).toBe(false);
    });
  });

  describe('getFavoritesCount', () => {
    it('should return counts by type', async () => {
      favoriteRepo.count
        .mockResolvedValueOnce(5)   // products
        .mockResolvedValueOnce(3);  // machines

      const result = await service.getFavoritesCount(userId);

      expect(result).toEqual({ products: 5, machines: 3 });
    });
  });

  describe('getFavorites', () => {
    it('should return favorites list with products and machines', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([
        mockFavorite,
        mockMachineFavorite,
      ]);
      favoriteRepo.count
        .mockResolvedValueOnce(1)  // products
        .mockResolvedValueOnce(1); // machines

      const result = await service.getFavorites(userId, {} as any);

      expect(result.totalProducts).toEqual(1);
      expect(result.totalMachines).toEqual(1);
    });

    it('should filter by type when specified', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockFavorite]);
      favoriteRepo.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);

      await service.getFavorites(userId, {
        type: FavoriteType.PRODUCT,
      } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'f.type = :type',
        { type: FavoriteType.PRODUCT },
      );
    });
  });
});
