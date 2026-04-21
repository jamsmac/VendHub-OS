import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsWhere, Between } from "typeorm";
import {
  StockMovement,
  MovementType,
  MovementReferenceType,
} from "../entities/stock-movement.entity";
import { InventoryBalance } from "../entities/inventory-balance.entity";

export interface RecordMovementInput {
  organizationId: string;
  productId: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  quantity: number;
  movementType: MovementType;
  unitCost?: number | null;
  unitPrice?: number | null;
  referenceType?: MovementReferenceType | null;
  referenceId?: string | null;
  note?: string | null;
  byUserId?: string | null;
  at?: Date;
}

@Injectable()
export class StockMovementsService {
  private readonly logger = new Logger(StockMovementsService.name);

  constructor(
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(InventoryBalance)
    private readonly balanceRepo: Repository<InventoryBalance>,
  ) {}

  /**
   * Record a stock movement. Always INSERT (never UPDATE).
   * inventory_balances updated automatically via Postgres trigger.
   */
  async record(input: RecordMovementInput): Promise<StockMovement> {
    if (input.quantity <= 0) {
      throw new Error("Stock movement quantity must be positive");
    }
    if (!input.fromLocationId && !input.toLocationId) {
      throw new Error(
        "Stock movement requires at least fromLocationId or toLocationId",
      );
    }

    const movement = this.movementRepo.create({
      organizationId: input.organizationId,
      productId: input.productId,
      fromLocationId: input.fromLocationId ?? null,
      toLocationId: input.toLocationId ?? null,
      quantity: Math.round(input.quantity),
      movementType: input.movementType,
      unitCost: input.unitCost ?? null,
      unitPrice: input.unitPrice ?? null,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      note: input.note ?? null,
      byUserId: input.byUserId ?? null,
      at: input.at ?? new Date(),
    });

    return this.movementRepo.save(movement);
  }

  /**
   * Record multiple movements in a single DB round-trip.
   * Useful for sales import batches.
   */
  async recordBatch(inputs: RecordMovementInput[]): Promise<StockMovement[]> {
    if (inputs.length === 0) return [];
    const entities = inputs.map((input) =>
      this.movementRepo.create({
        organizationId: input.organizationId,
        productId: input.productId,
        fromLocationId: input.fromLocationId ?? null,
        toLocationId: input.toLocationId ?? null,
        quantity: Math.round(input.quantity),
        movementType: input.movementType,
        unitCost: input.unitCost ?? null,
        unitPrice: input.unitPrice ?? null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        note: input.note ?? null,
        byUserId: input.byUserId ?? null,
        at: input.at ?? new Date(),
      }),
    );
    return this.movementRepo.save(entities);
  }

  async list(params: {
    organizationId: string;
    productId?: string;
    locationId?: string;
    movementType?: MovementType;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ data: StockMovement[]; total: number }> {
    const where: FindOptionsWhere<StockMovement> = {
      organizationId: params.organizationId,
    };
    if (params.productId) where.productId = params.productId;
    if (params.movementType) where.movementType = params.movementType;
    if (params.from && params.to) where.at = Between(params.from, params.to);

    const qb = this.movementRepo.createQueryBuilder("m").where(where);

    if (params.locationId) {
      qb.andWhere("(m.from_location_id = :loc OR m.to_location_id = :loc)", {
        loc: params.locationId,
      });
    }

    qb.orderBy("m.at", "DESC")
      .skip(params.offset ?? 0)
      .take(Math.min(params.limit ?? 50, 200));

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /**
   * Current balance at a specific location for a product.
   * Uses materialized inventory_balances.
   */
  async getBalance(
    organizationId: string,
    locationId: string,
    productId: string,
  ): Promise<number> {
    const balance = await this.balanceRepo.findOne({
      where: { organizationId, locationId, productId },
    });
    return balance?.quantity ?? 0;
  }

  /**
   * Org-wide balance for a product across all locations.
   */
  async getTotalBalance(
    organizationId: string,
    productId: string,
  ): Promise<number> {
    const result = await this.balanceRepo
      .createQueryBuilder("b")
      .select("COALESCE(SUM(b.quantity), 0)", "total")
      .where("b.organization_id = :org AND b.product_id = :product", {
        org: organizationId,
        product: productId,
      })
      .getRawOne<{ total: string }>();
    return Number(result?.total ?? 0);
  }
}
