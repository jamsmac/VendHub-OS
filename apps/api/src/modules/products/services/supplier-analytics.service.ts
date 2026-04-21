import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { Supplier } from "../entities/product.entity";
import {
  Purchase,
  PurchaseStatus,
} from "../../purchases/entities/purchase.entity";

interface AggregateRow {
  totalSpent: string | null;
  totalItems: string | null;
  purchaseCount: string | null;
  lastPurchaseAt: string | null;
}

/**
 * Supplier analytics (Sprint G5).
 *
 * Returns aggregate purchase metrics for a supplier within the caller's org.
 * Only counts purchases in RECEIVED status (completed, confirmed purchases).
 */
@Injectable()
export class SupplierAnalyticsService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(Purchase)
    private readonly purchaseRepo: Repository<Purchase>,
  ) {}

  async getAnalytics(organizationId: string, supplierId: string) {
    // Enforce tenant isolation + existence check
    const supplier = await this.supplierRepo.findOne({
      where: { id: supplierId, organizationId, deletedAt: IsNull() },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier ${supplierId} not found`);
    }

    const result = await this.purchaseRepo
      .createQueryBuilder("p")
      .select("COALESCE(SUM(p.totalAmount), 0)", "totalSpent")
      .addSelect("COALESCE(SUM(p.totalItems), 0)", "totalItems")
      .addSelect("COUNT(p.id)", "purchaseCount")
      .addSelect("MAX(p.purchaseDate)", "lastPurchaseAt")
      .where("p.organizationId = :org", { org: organizationId })
      .andWhere("p.supplierId = :sup", { sup: supplierId })
      .andWhere("p.status = :status", { status: PurchaseStatus.RECEIVED })
      .andWhere("p.deletedAt IS NULL")
      .getRawOne<AggregateRow>();

    return {
      supplierId,
      supplierCode: supplier.code,
      supplierName: supplier.name,
      totalSpent: Number(result?.totalSpent ?? 0),
      totalItems: Number(result?.totalItems ?? 0),
      purchaseCount: Number(result?.purchaseCount ?? 0),
      lastPurchaseAt: result?.lastPurchaseAt ?? null,
    };
  }
}
