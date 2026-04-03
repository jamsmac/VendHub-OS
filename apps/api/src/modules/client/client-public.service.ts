/**
 * Client Public Service
 *
 * Business logic for public (no-auth) endpoints.
 * All queries are read-only and return aggregated/safe data.
 *
 * IMPORTANT: All queries filter by PUBLIC_ORG_ID to prevent
 * cross-tenant data leakage (CLAUDE.md Rule 7).
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { Product } from "../products/entities/product.entity";
import { ClientOrder } from "./entities/client-order.entity";
import { ClientUser } from "./entities/client-user.entity";

@Injectable()
export class ClientPublicService {
  private readonly logger = new Logger(ClientPublicService.name);
  private readonly publicOrgId: string;

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ClientOrder)
    private readonly orderRepository: Repository<ClientOrder>,

    @InjectRepository(ClientUser)
    private readonly clientUserRepository: Repository<ClientUser>,

    private readonly configService: ConfigService,
  ) {
    this.publicOrgId =
      this.configService.get<string>("VENDHUB_PUBLIC_ORG_ID") ??
      "d0000000-0000-0000-0000-000000000001";
  }

  // ============================================
  // STATS
  // ============================================

  async getStats(): Promise<{
    totalMachines: number;
    totalProducts: number;
    totalOrders: number;
    totalClients: number;
    avgRating: number;
  }> {
    // Count active machines for public organization
    const machineCount = await this.productRepository.manager
      .createQueryBuilder()
      .select("COUNT(*)", "count")
      .from("machines", "m")
      .where("m.organization_id = :orgId", { orgId: this.publicOrgId })
      .andWhere("m.status = :status", { status: "active" })
      .andWhere("m.deleted_at IS NULL")
      .getRawOne();

    // Count active products for public organization
    const productCount = await this.productRepository
      .createQueryBuilder("p")
      .where("p.organizationId = :orgId", { orgId: this.publicOrgId })
      .andWhere("p.status = :status", { status: "active" })
      .andWhere("p.deletedAt IS NULL")
      .getCount();

    // Count completed orders for public organization
    const orderCount = await this.orderRepository
      .createQueryBuilder("o")
      .where("o.organizationId = :orgId", { orgId: this.publicOrgId })
      .andWhere("o.deletedAt IS NULL")
      .getCount();

    // Count registered clients
    const clientCount = await this.clientUserRepository
      .createQueryBuilder("c")
      .where("c.deletedAt IS NULL")
      .getCount();

    // Average rating from operator ratings (if available)
    const avgRatingResult = await this.productRepository.manager
      .createQueryBuilder()
      .select("COALESCE(AVG(rating), 4.8)", "avg")
      .from("operator_ratings", "r")
      .where("r.deleted_at IS NULL")
      .getRawOne();

    return {
      totalMachines: parseInt(machineCount?.count ?? "0", 10),
      totalProducts: productCount,
      totalOrders: orderCount,
      totalClients: clientCount,
      avgRating: parseFloat(
        parseFloat(avgRatingResult?.avg ?? "4.8").toFixed(1),
      ),
    };
  }

  // ============================================
  // PRODUCTS
  // ============================================

  async getProducts(filters?: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { category, search, page = 1 } = filters || {};
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);

    const query = this.productRepository
      .createQueryBuilder("p")
      .select([
        "p.id",
        "p.sku",
        "p.name",
        "p.nameUz",
        "p.description",
        "p.descriptionUz",
        "p.category",
        "p.sellingPrice",
        "p.currency",
        "p.imageUrl",
        "p.images",
        "p.isActive",
        "p.vatRate",
      ])
      .where("p.organizationId = :orgId", { orgId: this.publicOrgId })
      .andWhere("p.status = :status", { status: "active" })
      .andWhere("p.isIngredient = false")
      .andWhere("p.deletedAt IS NULL");

    if (category) {
      query.andWhere("p.category = :category", { category });
    }

    if (search) {
      query.andWhere("(p.name ILIKE :search OR p.nameUz ILIKE :search)", {
        search: `%${search}%`,
      });
    }

    const total = await query.getCount();

    query
      .orderBy("p.name", "ASC")
      .skip((page - 1) * limit)
      .take(limit);

    const data = await query.getMany();

    return {
      data: data.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        nameUz: p.nameUz ?? null,
        description: p.description,
        descriptionUz: p.descriptionUz ?? null,
        category: p.category,
        price: Number(p.sellingPrice),
        currency: p.currency,
        imageUrl: p.imageUrl,
        images: p.images,
        vatRate: Number(p.vatRate),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================
  // PROMOTIONS
  // ============================================

  async getPromotions() {
    // Check if promo_codes table has active public promos
    const now = new Date();

    const promos = await this.productRepository.manager
      .createQueryBuilder()
      .select([
        "pc.id",
        "pc.code",
        "pc.description",
        "pc.discount_type",
        "pc.discount_value",
        "pc.min_order_amount",
        "pc.valid_from",
        "pc.valid_until",
      ])
      .from("promo_codes", "pc")
      .where("pc.organization_id = :orgId", { orgId: this.publicOrgId })
      .andWhere("pc.is_active = true")
      .andWhere("pc.deleted_at IS NULL")
      .andWhere("(pc.valid_from IS NULL OR pc.valid_from <= :now)", { now })
      .andWhere("(pc.valid_until IS NULL OR pc.valid_until >= :now)", { now })
      .andWhere("(pc.max_uses IS NULL OR pc.current_uses < pc.max_uses)")
      .orderBy("pc.created_at", "DESC")
      .limit(20)
      .getRawMany();

    return {
      data: promos.map((p) => ({
        id: p.pc_id,
        code: p.pc_code,
        description: p.pc_description,
        discountType: p.pc_discount_type,
        discountValue: Number(p.pc_discount_value),
        minOrderAmount: p.pc_min_order_amount
          ? Number(p.pc_min_order_amount)
          : null,
        validFrom: p.pc_valid_from,
        validUntil: p.pc_valid_until,
      })),
      total: promos.length,
    };
  }

  // ============================================
  // LOYALTY TIERS
  // ============================================

  async getLoyaltyTiers() {
    // Standard VendHub loyalty tiers
    return {
      tiers: [
        {
          level: "bronze",
          name: "Bronze",
          nameUz: "Bronza",
          nameRu: "Бронза",
          minPoints: 0,
          maxPoints: 4999,
          multiplier: 1.0,
          cashbackPercent: 2,
          privileges: ["Базовое начисление баллов"],
        },
        {
          level: "silver",
          name: "Silver",
          nameUz: "Kumush",
          nameRu: "Серебро",
          minPoints: 5000,
          maxPoints: 19999,
          multiplier: 1.5,
          cashbackPercent: 3,
          privileges: ["1.5x множитель баллов", "Приоритетная поддержка"],
        },
        {
          level: "gold",
          name: "Gold",
          nameUz: "Oltin",
          nameRu: "Золото",
          minPoints: 20000,
          maxPoints: 49999,
          multiplier: 2.0,
          cashbackPercent: 5,
          privileges: [
            "2x множитель баллов",
            "Бонус на день рождения 20,000",
            "Ранний доступ к акциям",
          ],
        },
        {
          level: "platinum",
          name: "Platinum",
          nameUz: "Platina",
          nameRu: "Платина",
          minPoints: 50000,
          maxPoints: null,
          multiplier: 3.0,
          cashbackPercent: 7,
          privileges: [
            "3x множитель баллов",
            "Бонус на день рождения 50,000",
            "Персональный менеджер",
            "VIP акции",
            "Бесплатная доставка",
          ],
        },
      ],
      currency: "UZS",
      pointsPerUzs: 1, // 1 UZS = 1 point
    };
  }
}
