/**
 * Recommendations Service
 * Персонализированные рекомендации для пользователей
 */

import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Machine } from '../machines/entities/machine.entity';

// ============================================================================
// TYPES
// ============================================================================

export interface RecommendedProduct {
  product: Product;
  score: number;
  reason: RecommendationReason;
  reasonText: string;
}

export enum RecommendationReason {
  FREQUENTLY_BOUGHT = 'frequently_bought',
  BASED_ON_HISTORY = 'based_on_history',
  POPULAR_NOW = 'popular_now',
  SIMILAR_USERS = 'similar_users',
  SAME_CATEGORY = 'same_category',
  COMPLEMENTARY = 'complementary',
  NEW_ARRIVAL = 'new_arrival',
  ON_SALE = 'on_sale',
  TRENDING = 'trending',
  PERSONALIZED = 'personalized',
}

export interface RecommendationContext {
  userId?: string;
  machineId?: string;
  categoryId?: string;
  currentProductId?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  limit?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  // Кэш популярных продуктов (обновляется раз в час)
  private popularProductsCache: Map<string, Product[]> = new Map();
  private trendingProductsCache: Map<string, Product[]> = new Map();

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
  ) {}

  // ============================================================================
  // MAIN RECOMMENDATION METHODS
  // ============================================================================

  /**
   * Получить персонализированные рекомендации для пользователя
   */
  async getPersonalizedRecommendations(
    userId: string,
    organizationId: string,
    limit = 10,
  ): Promise<RecommendedProduct[]> {
    const recommendations: RecommendedProduct[] = [];

    // 1. На основе истории покупок
    const historyBased = await this.getHistoryBasedRecommendations(userId, organizationId, 5);
    recommendations.push(...historyBased);

    // 2. Похожие пользователи (collaborative filtering)
    const similarUsersBased = await this.getSimilarUsersRecommendations(userId, organizationId, 3);
    recommendations.push(...similarUsersBased);

    // 3. Популярные сейчас
    const popular = await this.getPopularProducts(organizationId, 3);
    recommendations.push(
      ...popular.map(p => ({
        product: p,
        score: 0.7,
        reason: RecommendationReason.POPULAR_NOW,
        reasonText: 'Популярно сейчас',
      })),
    );

    // Deduplicate and sort by score
    return this.deduplicateAndSort(recommendations, limit);
  }

  /**
   * Рекомендации для конкретного автомата
   */
  async getMachineRecommendations(
    machineId: string,
    organizationId: string,
    userId?: string,
    limit = 6,
  ): Promise<RecommendedProduct[]> {
    const recommendations: RecommendedProduct[] = [];

    // 1. Популярные на этом автомате
    const machinePopular = await this.getMachinePopularProducts(machineId, 5);
    recommendations.push(
      ...machinePopular.map(p => ({
        product: p,
        score: 0.9,
        reason: RecommendationReason.FREQUENTLY_BOUGHT,
        reasonText: 'Часто покупают здесь',
      })),
    );

    // 2. Если есть userId - персонализация
    if (userId) {
      const personal = await this.getHistoryBasedRecommendations(userId, organizationId, 3);
      // Filter to only products available on this machine
      // Would need inventory check here
      recommendations.push(...personal);
    }

    return this.deduplicateAndSort(recommendations, limit);
  }

  /**
   * Похожие продукты
   */
  async getSimilarProducts(
    productId: string,
    organizationId: string,
    limit = 5,
  ): Promise<RecommendedProduct[]> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });

    if (!product) {
      return [];
    }

    // Продукты из той же категории (category is an enum)
    const sameCategory = await this.productRepo.find({
      where: {
        organizationId,
        category: product.category,
        id: Not(productId),
        isActive: true,
      },
      take: limit,
      order: { sellingPrice: 'DESC' }, // Using sellingPrice as proxy for popularity
    });

    // Get category label for display
    const categoryLabel = product.category?.replace(/_/g, ' ') || 'эта категория';

    return sameCategory.map(p => ({
      product: p,
      score: 0.8,
      reason: RecommendationReason.SAME_CATEGORY,
      reasonText: `Из категории "${categoryLabel}"`,
    }));
  }

  /**
   * Дополняющие продукты (часто покупают вместе)
   */
  async getComplementaryProducts(
    productId: string,
    organizationId: string,
    limit = 3,
  ): Promise<RecommendedProduct[]> {
    // Найти заказы с этим продуктом и другими продуктами
    const orders = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.items', 'oi')
      .where('oi.productId = :productId', { productId })
      .andWhere('o.organizationId = :organizationId', { organizationId })
      .select('o.id')
      .limit(100)
      .getMany();

    if (orders.length === 0) {
      return [];
    }

    // Найти продукты, которые покупали вместе
    const orderIds = orders.map(o => o.id);

    const complementary = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.items', 'oi')
      .innerJoin('oi.product', 'p')
      .where('o.id IN (:...orderIds)', { orderIds })
      .andWhere('oi.productId != :productId', { productId })
      .andWhere('p.isActive = :isActive', { isActive: true })
      .select('p.id', 'productId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.id')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    const productIds = complementary.map(c => c.productId);

    if (productIds.length === 0) {
      return [];
    }

    const products = await this.productRepo.findBy({ id: In(productIds) });

    return products.map(p => ({
      product: p,
      score: 0.85,
      reason: RecommendationReason.COMPLEMENTARY,
      reasonText: 'Часто покупают вместе',
    }));
  }

  /**
   * Рекомендации по времени суток
   */
  async getTimeBasedRecommendations(
    organizationId: string,
    hour?: number,
    limit = 5,
  ): Promise<RecommendedProduct[]> {
    const currentHour = hour ?? new Date().getHours();

    let timeCategory: string;
    if (currentHour >= 6 && currentHour < 12) {
      timeCategory = 'morning';
    } else if (currentHour >= 12 && currentHour < 17) {
      timeCategory = 'afternoon';
    } else if (currentHour >= 17 && currentHour < 22) {
      timeCategory = 'evening';
    } else {
      timeCategory = 'night';
    }

    // Анализ заказов по времени
    const popularByTime = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.items', 'oi')
      .innerJoin('oi.product', 'p')
      .where('o.organizationId = :organizationId', { organizationId })
      .andWhere('EXTRACT(HOUR FROM o.createdAt) BETWEEN :startHour AND :endHour', {
        startHour: this.getTimeRange(timeCategory).start,
        endHour: this.getTimeRange(timeCategory).end,
      })
      .andWhere('o.createdAt >= :dateFrom', {
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      })
      .andWhere('p.isActive = :isActive', { isActive: true })
      .select('p.id', 'productId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.id')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    const productIds = popularByTime.map(p => p.productId);

    if (productIds.length === 0) {
      return [];
    }

    const products = await this.productRepo.findBy({ id: In(productIds) });

    const timeLabels: Record<string, string> = {
      morning: 'Популярно утром',
      afternoon: 'Популярно днем',
      evening: 'Популярно вечером',
      night: 'Популярно ночью',
    };

    return products.map(p => ({
      product: p,
      score: 0.75,
      reason: RecommendationReason.TRENDING,
      reasonText: timeLabels[timeCategory],
    }));
  }

  /**
   * Новинки
   */
  async getNewArrivals(organizationId: string, limit = 5): Promise<RecommendedProduct[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const newProducts = await this.productRepo.find({
      where: {
        organizationId,
        isActive: true,
        created_at: Not(IsNull()),
      },
      order: { created_at: 'DESC' },
      take: limit,
    });

    // Filter to only truly new products
    const filtered = newProducts.filter(p => p.created_at >= thirtyDaysAgo);

    return filtered.map(p => ({
      product: p,
      score: 0.7,
      reason: RecommendationReason.NEW_ARRIVAL,
      reasonText: 'Новинка',
    }));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Рекомендации на основе истории покупок
   */
  private async getHistoryBasedRecommendations(
    userId: string,
    organizationId: string,
    limit: number,
  ): Promise<RecommendedProduct[]> {
    // Получить категории, которые покупал пользователь (category is enum string)
    const userCategories = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.items', 'oi')
      .innerJoin('oi.product', 'p')
      .where('o.userId = :userId', { userId })
      .andWhere('o.organizationId = :organizationId', { organizationId })
      .select('p.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.category')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    if (userCategories.length === 0) {
      return [];
    }

    const categories = userCategories.map(c => c.category);

    // Получить продукты, которые пользователь НЕ покупал из этих категорий
    const userProductIds = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.items', 'oi')
      .where('o.userId = :userId', { userId })
      .select('DISTINCT oi.productId', 'productId')
      .getRawMany()
      .then(items => items.map(i => i.productId));

    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('p.organizationId = :organizationId', { organizationId })
      .andWhere('p.category IN (:...categories)', { categories })
      .andWhere('p.isActive = :isActive', { isActive: true })
      .orderBy('p.sellingPrice', 'DESC')  // Using sellingPrice as proxy for popularity
      .take(limit);

    if (userProductIds.length > 0) {
      qb.andWhere('p.id NOT IN (:...userProductIds)', { userProductIds });
    }

    const products = await qb.getMany();

    return products.map(p => ({
      product: p,
      score: 0.85,
      reason: RecommendationReason.BASED_ON_HISTORY,
      reasonText: 'На основе ваших покупок',
    }));
  }

  /**
   * Collaborative filtering - похожие пользователи
   */
  private async getSimilarUsersRecommendations(
    userId: string,
    organizationId: string,
    limit: number,
  ): Promise<RecommendedProduct[]> {
    // Найти пользователей, которые покупали те же продукты
    const userProducts = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.items', 'oi')
      .where('o.userId = :userId', { userId })
      .select('DISTINCT oi.productId', 'productId')
      .getRawMany()
      .then(items => items.map(i => i.productId));

    if (userProducts.length === 0) {
      return [];
    }

    // Найти похожих пользователей
    const similarUsers = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.items', 'oi')
      .where('o.userId != :userId', { userId })
      .andWhere('o.organizationId = :organizationId', { organizationId })
      .andWhere('oi.productId IN (:...userProducts)', { userProducts })
      .select('o.userId', 'similarUserId')
      .addSelect('COUNT(DISTINCT oi.productId)', 'commonProducts')
      .groupBy('o.userId')
      .orderBy('commonProducts', 'DESC')
      .limit(10)
      .getRawMany();

    if (similarUsers.length === 0) {
      return [];
    }

    const similarUserIds = similarUsers.map(u => u.similarUserId);

    // Найти продукты, которые покупали похожие пользователи, но не текущий
    const recommendations = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.items', 'oi')
      .innerJoin('oi.product', 'p')
      .where('o.userId IN (:...similarUserIds)', { similarUserIds })
      .andWhere('oi.productId NOT IN (:...userProducts)', { userProducts })
      .andWhere('p.isActive = :isActive', { isActive: true })
      .select('p.id', 'productId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.id')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    const productIds = recommendations.map(r => r.productId);

    if (productIds.length === 0) {
      return [];
    }

    const products = await this.productRepo.findBy({ id: In(productIds) });

    return products.map(p => ({
      product: p,
      score: 0.8,
      reason: RecommendationReason.SIMILAR_USERS,
      reasonText: 'Покупатели с похожими вкусами выбирают',
    }));
  }

  /**
   * Популярные продукты организации
   */
  private async getPopularProducts(organizationId: string, limit: number): Promise<Product[]> {
    // Проверить кэш
    const cached = this.popularProductsCache.get(organizationId);
    if (cached && cached.length >= limit) {
      return cached.slice(0, limit);
    }

    // Get popular products based on order count
    const popularProductIds = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.items', 'oi')
      .innerJoin('oi.product', 'p')
      .where('o.organizationId = :organizationId', { organizationId })
      .andWhere('p.isActive = :isActive', { isActive: true })
      .andWhere('o.createdAt >= :dateFrom', {
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      })
      .select('p.id', 'productId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.id')
      .orderBy('count', 'DESC')
      .limit(limit * 2)
      .getRawMany();

    const productIds = popularProductIds.map(p => p.productId);

    if (productIds.length === 0) {
      // Fallback to newest products if no orders
      const products = await this.productRepo.find({
        where: { organizationId, isActive: true },
        order: { created_at: 'DESC' },
        take: limit * 2,
      });
      this.popularProductsCache.set(organizationId, products);
      return products.slice(0, limit);
    }

    const products = await this.productRepo.findBy({ id: In(productIds) });

    this.popularProductsCache.set(organizationId, products);
    return products.slice(0, limit);
  }

  /**
   * Популярные на конкретном автомате
   */
  private async getMachinePopularProducts(machineId: string, limit: number): Promise<Product[]> {
    const popular = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.items', 'oi')
      .innerJoin('oi.product', 'p')
      .where('o.machineId = :machineId', { machineId })
      .andWhere('o.createdAt >= :dateFrom', {
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      })
      .andWhere('p.isActive = :isActive', { isActive: true })
      .select('p.id', 'productId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.id')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    const productIds = popular.map(p => p.productId);

    if (productIds.length === 0) {
      return [];
    }

    return this.productRepo.findBy({ id: In(productIds) });
  }

  /**
   * Дедупликация и сортировка
   */
  private deduplicateAndSort(
    recommendations: RecommendedProduct[],
    limit: number,
  ): RecommendedProduct[] {
    const seen = new Set<string>();
    const unique: RecommendedProduct[] = [];

    for (const rec of recommendations) {
      if (!seen.has(rec.product.id)) {
        seen.add(rec.product.id);
        unique.push(rec);
      }
    }

    return unique.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private getTimeRange(timeCategory: string): { start: number; end: number } {
    const ranges: Record<string, { start: number; end: number }> = {
      morning: { start: 6, end: 11 },
      afternoon: { start: 12, end: 16 },
      evening: { start: 17, end: 21 },
      night: { start: 22, end: 5 },
    };
    return ranges[timeCategory] || ranges.afternoon;
  }

  // ============================================================================
  // CRON JOBS
  // ============================================================================

  /**
   * Обновить кэш популярных продуктов (каждый час)
   */
  @Cron('0 * * * *')
  async updatePopularProductsCache(): Promise<void> {
    this.logger.log('Updating popular products cache');
    this.popularProductsCache.clear();
    this.trendingProductsCache.clear();
  }
}
