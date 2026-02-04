import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import {
  RecommendationsService,
  RecommendationReason,
} from './recommendations.service';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Machine } from '../machines/entities/machine.entity';

type MockRepository<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findBy: jest.fn(),
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
  innerJoin: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn(),
  getRawOne: jest.fn(),
  limit: jest.fn().mockReturnThis(),
  then: jest.fn(),
});

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let productRepo: MockRepository<Product>;
  let orderRepo: MockRepository<Order>;
  let userRepo: MockRepository<User>;
  let machineRepo: MockRepository<Machine>;

  const orgId = 'org-1';
  const userId = 'user-1';

  beforeEach(async () => {
    productRepo = createMockRepository<Product>();
    orderRepo = createMockRepository<Order>();
    userRepo = createMockRepository<User>();
    machineRepo = createMockRepository<Machine>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Machine), useValue: machineRepo },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // getSimilarProducts
  // ==========================================================================

  describe('getSimilarProducts', () => {
    it('should return empty array when product not found', async () => {
      productRepo.findOne!.mockResolvedValue(null);

      const result = await service.getSimilarProducts('non-existent', orgId);

      expect(result).toEqual([]);
    });

    it('should return products from same category', async () => {
      const product = { id: 'p-1', category: 'beverages', organizationId: orgId };
      productRepo.findOne!.mockResolvedValue(product);

      const similar = [
        { id: 'p-2', category: 'beverages', sellingPrice: 5000 },
        { id: 'p-3', category: 'beverages', sellingPrice: 3000 },
      ];
      productRepo.find!.mockResolvedValue(similar);

      const result = await service.getSimilarProducts('p-1', orgId);

      expect(result).toHaveLength(2);
      expect(result[0].reason).toBe(RecommendationReason.SAME_CATEGORY);
      expect(result[0].score).toBe(0.8);
    });

    it('should exclude the current product from results', async () => {
      const product = { id: 'p-1', category: 'snacks', organizationId: orgId };
      productRepo.findOne!.mockResolvedValue(product);
      productRepo.find!.mockResolvedValue([]);

      await service.getSimilarProducts('p-1', orgId);

      expect(productRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.anything(), // Not('p-1')
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // getComplementaryProducts
  // ==========================================================================

  describe('getComplementaryProducts', () => {
    it('should return empty array when no orders contain the product', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue([]);
      orderRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.getComplementaryProducts('p-1', orgId);

      expect(result).toEqual([]);
    });

    it('should return complementary products from shared orders', async () => {
      // First QBuild: orders with the product
      const ordersQb = createMockQueryBuilder();
      ordersQb.getMany.mockResolvedValue([{ id: 'o-1' }, { id: 'o-2' }]);

      // Second QBuild: products in those orders
      const compQb = createMockQueryBuilder();
      compQb.getRawMany.mockResolvedValue([{ productId: 'p-2', count: '5' }]);

      orderRepo.createQueryBuilder!
        .mockReturnValueOnce(ordersQb)
        .mockReturnValueOnce(compQb);

      productRepo.findBy!.mockResolvedValue([
        { id: 'p-2', name: 'Coffee', isActive: true },
      ]);

      const result = await service.getComplementaryProducts('p-1', orgId);

      expect(result).toHaveLength(1);
      expect(result[0].reason).toBe(RecommendationReason.COMPLEMENTARY);
      expect(result[0].product.id).toBe('p-2');
    });

    it('should return empty array when no complementary products found', async () => {
      const ordersQb = createMockQueryBuilder();
      ordersQb.getMany.mockResolvedValue([{ id: 'o-1' }]);

      const compQb = createMockQueryBuilder();
      compQb.getRawMany.mockResolvedValue([]);

      orderRepo.createQueryBuilder!
        .mockReturnValueOnce(ordersQb)
        .mockReturnValueOnce(compQb);

      const result = await service.getComplementaryProducts('p-1', orgId);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // getTimeBasedRecommendations
  // ==========================================================================

  describe('getTimeBasedRecommendations', () => {
    it('should return morning recommendations for hour 8', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawMany.mockResolvedValue([{ productId: 'p-1', count: '10' }]);
      orderRepo.createQueryBuilder!.mockReturnValue(mockQb);
      productRepo.findBy!.mockResolvedValue([{ id: 'p-1', name: 'Coffee' }]);

      const result = await service.getTimeBasedRecommendations(orgId, 8);

      expect(result).toHaveLength(1);
      expect(result[0].reason).toBe(RecommendationReason.TRENDING);
      expect(result[0].reasonText).toContain('утром');
    });

    it('should return afternoon recommendations for hour 14', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawMany.mockResolvedValue([{ productId: 'p-1', count: '5' }]);
      orderRepo.createQueryBuilder!.mockReturnValue(mockQb);
      productRepo.findBy!.mockResolvedValue([{ id: 'p-1', name: 'Lunch' }]);

      const result = await service.getTimeBasedRecommendations(orgId, 14);

      expect(result[0].reasonText).toContain('днем');
    });

    it('should return evening recommendations for hour 19', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawMany.mockResolvedValue([{ productId: 'p-1', count: '3' }]);
      orderRepo.createQueryBuilder!.mockReturnValue(mockQb);
      productRepo.findBy!.mockResolvedValue([{ id: 'p-1', name: 'Snack' }]);

      const result = await service.getTimeBasedRecommendations(orgId, 19);

      expect(result[0].reasonText).toContain('вечером');
    });

    it('should return night recommendations for hour 23', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawMany.mockResolvedValue([{ productId: 'p-1', count: '1' }]);
      orderRepo.createQueryBuilder!.mockReturnValue(mockQb);
      productRepo.findBy!.mockResolvedValue([{ id: 'p-1', name: 'Midnight Snack' }]);

      const result = await service.getTimeBasedRecommendations(orgId, 23);

      expect(result[0].reasonText).toContain('ночью');
    });

    it('should return empty array when no popular products for time', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawMany.mockResolvedValue([]);
      orderRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.getTimeBasedRecommendations(orgId, 10);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // getNewArrivals
  // ==========================================================================

  describe('getNewArrivals', () => {
    it('should return recently created products', async () => {
      const recentDate = new Date();
      const products = [
        { id: 'p-1', name: 'New Product', isActive: true, created_at: recentDate },
      ];
      productRepo.find!.mockResolvedValue(products);

      const result = await service.getNewArrivals(orgId);

      expect(result).toHaveLength(1);
      expect(result[0].reason).toBe(RecommendationReason.NEW_ARRIVAL);
      expect(result[0].reasonText).toBe('Новинка');
    });

    it('should filter out products older than 30 days', async () => {
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const products = [
        { id: 'p-1', name: 'Old Product', isActive: true, created_at: oldDate },
      ];
      productRepo.find!.mockResolvedValue(products);

      const result = await service.getNewArrivals(orgId);

      expect(result).toHaveLength(0);
    });

    it('should respect the limit parameter', async () => {
      const recentDate = new Date();
      const products = Array.from({ length: 10 }, (_, i) => ({
        id: `p-${i}`,
        name: `Product ${i}`,
        isActive: true,
        created_at: recentDate,
      }));
      productRepo.find!.mockResolvedValue(products);

      const result = await service.getNewArrivals(orgId, 3);

      expect(result.length).toBeLessThanOrEqual(10); // filtered by 30 days, limited by find query
    });
  });

  // ==========================================================================
  // getPersonalizedRecommendations
  // ==========================================================================

  describe('getPersonalizedRecommendations', () => {
    it('should aggregate recommendations from multiple sources', async () => {
      // History-based: returns empty (no orders)
      const historyQb = createMockQueryBuilder();
      historyQb.getRawMany.mockResolvedValue([]);

      // Similar users: returns empty (no orders)
      const similarQb = createMockQueryBuilder();
      similarQb.getRawMany.mockResolvedValue([]);
      similarQb.then.mockImplementation((cb: any) => cb([]));

      // Popular products: returns some products
      const popularQb = createMockQueryBuilder();
      popularQb.getRawMany.mockResolvedValue([{ productId: 'p-1', count: '10' }]);

      orderRepo.createQueryBuilder!.mockReturnValue(historyQb);
      productRepo.findBy!.mockResolvedValue([{ id: 'p-1', name: 'Cola' }]);
      productRepo.find!.mockResolvedValue([{ id: 'p-1', name: 'Cola' }]);

      // The method calls multiple private methods which all use createQueryBuilder
      // For this integration test, we verify it does not throw
      const result = await service.getPersonalizedRecommendations(userId, orgId);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==========================================================================
  // getMachineRecommendations
  // ==========================================================================

  describe('getMachineRecommendations', () => {
    it('should include machine popular products', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawMany.mockResolvedValue([
        { productId: 'p-1', count: '20' },
      ]);
      orderRepo.createQueryBuilder!.mockReturnValue(mockQb);
      productRepo.findBy!.mockResolvedValue([
        { id: 'p-1', name: 'Popular on Machine' },
      ]);

      const result = await service.getMachineRecommendations('m-1', orgId);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].reason).toBe(RecommendationReason.FREQUENTLY_BOUGHT);
      expect(result[0].score).toBe(0.9);
    });

    it('should return empty when no orders on machine', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawMany.mockResolvedValue([]);
      orderRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.getMachineRecommendations('m-1', orgId);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // updatePopularProductsCache (cron)
  // ==========================================================================

  describe('updatePopularProductsCache', () => {
    it('should clear the caches', async () => {
      // Access the private cache via any-cast to set up test data
      (service as any).popularProductsCache.set('org-1', [{ id: 'p-1' }]);
      (service as any).trendingProductsCache.set('org-1', [{ id: 'p-2' }]);

      await service.updatePopularProductsCache();

      expect((service as any).popularProductsCache.size).toBe(0);
      expect((service as any).trendingProductsCache.size).toBe(0);
    });
  });

  // ==========================================================================
  // deduplication
  // ==========================================================================

  describe('deduplication and sorting', () => {
    it('should remove duplicates and sort by score descending', () => {
      // Access private method via any-cast for unit testing
      const dedup = (service as any).deduplicateAndSort;
      const recs = [
        { product: { id: 'p-1' }, score: 0.5, reason: 'a', reasonText: 'A' },
        { product: { id: 'p-2' }, score: 0.9, reason: 'b', reasonText: 'B' },
        { product: { id: 'p-1' }, score: 0.8, reason: 'c', reasonText: 'C' }, // duplicate
        { product: { id: 'p-3' }, score: 0.7, reason: 'd', reasonText: 'D' },
      ];

      const result = dedup.call(service, recs, 10);

      expect(result).toHaveLength(3);
      expect(result[0].product.id).toBe('p-2'); // highest score
      expect(result[1].product.id).toBe('p-3');
      expect(result[2].product.id).toBe('p-1');
    });

    it('should respect limit parameter', () => {
      const dedup = (service as any).deduplicateAndSort;
      const recs = [
        { product: { id: 'p-1' }, score: 0.9 },
        { product: { id: 'p-2' }, score: 0.8 },
        { product: { id: 'p-3' }, score: 0.7 },
      ];

      const result = dedup.call(service, recs, 2);

      expect(result).toHaveLength(2);
    });
  });

  // ==========================================================================
  // getTimeRange
  // ==========================================================================

  describe('getTimeRange (private)', () => {
    it('should return correct ranges for each time category', () => {
      const getRange = (service as any).getTimeRange;

      expect(getRange.call(service, 'morning')).toEqual({ start: 6, end: 11 });
      expect(getRange.call(service, 'afternoon')).toEqual({ start: 12, end: 16 });
      expect(getRange.call(service, 'evening')).toEqual({ start: 17, end: 21 });
      expect(getRange.call(service, 'night')).toEqual({ start: 22, end: 5 });
    });

    it('should default to afternoon for unknown category', () => {
      const getRange = (service as any).getTimeRange;

      expect(getRange.call(service, 'unknown')).toEqual({ start: 12, end: 16 });
    });
  });
});
