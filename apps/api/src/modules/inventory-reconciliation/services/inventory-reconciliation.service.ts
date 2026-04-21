import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  InventoryReconciliation,
  InventoryReconciliationStatus,
} from "../entities/inventory-reconciliation.entity";
import { InventoryReconciliationItem } from "../entities/inventory-reconciliation-item.entity";
import { InventoryBalance } from "../../stock-movements/entities/inventory-balance.entity";
import { Product } from "../../products/entities/product.entity";
import { StockMovementsService } from "../../stock-movements/services/stock-movements.service";
import {
  MovementType,
  MovementReferenceType,
} from "../../stock-movements/entities/stock-movement.entity";

export interface SubmitItemInput {
  productId: string;
  actualQty: number;
  note?: string | null;
}

@Injectable()
export class InventoryReconciliationService {
  private readonly logger = new Logger(InventoryReconciliationService.name);

  constructor(
    @InjectRepository(InventoryReconciliation)
    private readonly recRepo: Repository<InventoryReconciliation>,
    @InjectRepository(InventoryReconciliationItem)
    private readonly itemRepo: Repository<InventoryReconciliationItem>,
    @InjectRepository(InventoryBalance)
    private readonly balanceRepo: Repository<InventoryBalance>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly stockMovementsService: StockMovementsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Start a new reconciliation: creates DRAFT with expected balances
   * snapshotted from inventory_balances. Items are NOT pre-created —
   * operator fills them at submit time.
   */
  async start(
    organizationId: string,
    locationId: string,
    userId: string,
  ): Promise<InventoryReconciliation> {
    const reconciliation = this.recRepo.create({
      organizationId,
      locationId,
      status: InventoryReconciliationStatus.DRAFT,
      countedAt: new Date(),
      totalDifferenceQty: 0,
      totalDifferenceAmount: 0,
      nedostacha: 0,
      byUserId: userId,
    });
    return this.recRepo.save(reconciliation);
  }

  /**
   * Get expected balances at this location for the reconciliation form.
   */
  async getExpectedBalances(
    organizationId: string,
    locationId: string,
  ): Promise<
    Array<{
      productId: string;
      productName: string;
      expectedQty: number;
      unitCost: number;
    }>
  > {
    const balances = await this.balanceRepo
      .createQueryBuilder("b")
      .innerJoin("b.product", "p")
      .select([
        "b.productId as productId",
        "b.quantity as qty",
        "p.name as name",
        "p.purchasePrice as cost",
      ])
      .where("b.organization_id = :org AND b.location_id = :loc", {
        org: organizationId,
        loc: locationId,
      })
      .getRawMany();

    return balances.map(
      (r: {
        productId: string;
        qty: number;
        name: string;
        cost: string | null;
      }) => ({
        productId: r.productId,
        productName: r.name,
        expectedQty: Number(r.qty),
        unitCost: Number(r.cost ?? 0),
      }),
    );
  }

  async submit(
    organizationId: string,
    reconciliationId: string,
    items: SubmitItemInput[],
    userId: string,
  ): Promise<InventoryReconciliation> {
    const reconciliation = await this.recRepo.findOne({
      where: { id: reconciliationId, organizationId },
    });
    if (!reconciliation)
      throw new NotFoundException("Reconciliation not found");
    if (reconciliation.status !== InventoryReconciliationStatus.DRAFT) {
      throw new BadRequestException(
        "Only DRAFT reconciliations can be submitted",
      );
    }
    if (items.length === 0) throw new BadRequestException("No items provided");

    const productIds = items.map((i) => i.productId);

    return this.dataSource.transaction(async (manager) => {
      // Load current balances + product costs in batch
      const balances = await manager.find(InventoryBalance, {
        where: {
          organizationId,
          locationId: reconciliation.locationId,
        },
      });
      const balanceMap = new Map(
        balances
          .filter((b) => productIds.includes(b.productId))
          .map((b) => [b.productId, b.quantity]),
      );

      const products = await manager
        .createQueryBuilder(Product, "p")
        .where("p.id IN (:...ids) AND p.organization_id = :org", {
          ids: productIds,
          org: organizationId,
        })
        .getMany();
      const productMap = new Map(products.map((p) => [p.id, p]));

      let totalDifferenceQty = 0;
      let totalDifferenceAmount = 0;
      let nedostacha = 0;
      const itemRecords: InventoryReconciliationItem[] = [];

      for (const input of items) {
        const product = productMap.get(input.productId);
        if (!product) {
          throw new NotFoundException(
            `Product ${input.productId} not found in org`,
          );
        }
        const expectedQty = balanceMap.get(input.productId) ?? 0;
        const actualQty = Math.max(0, Math.round(input.actualQty));
        const diffQty = actualQty - expectedQty;
        const unitCost = Number(product.purchasePrice ?? 0);
        const diffAmount = diffQty * unitCost;

        totalDifferenceQty += diffQty;
        totalDifferenceAmount += diffAmount;
        if (diffQty < 0) nedostacha += Math.abs(diffAmount);

        let adjustmentMovementId: string | null = null;
        if (diffQty !== 0) {
          // Create ADJUSTMENT movement
          const movementType =
            diffQty > 0
              ? MovementType.ADJUSTMENT_PLUS
              : MovementType.ADJUSTMENT_MINUS;
          const movement = await this.stockMovementsService.record({
            organizationId,
            productId: input.productId,
            fromLocationId: diffQty < 0 ? reconciliation.locationId : null,
            toLocationId: diffQty > 0 ? reconciliation.locationId : null,
            quantity: Math.abs(diffQty),
            movementType,
            unitCost,
            referenceType: MovementReferenceType.RECONCILIATION,
            referenceId: reconciliation.id,
            note: `Inventory reconciliation ${reconciliation.id}${
              input.note ? `: ${input.note}` : ""
            }`,
            byUserId: userId,
            at: new Date(),
          });
          adjustmentMovementId = movement.id;
        }

        itemRecords.push(
          manager.create(InventoryReconciliationItem, {
            reconciliationId: reconciliation.id,
            productId: input.productId,
            expectedQty,
            actualQty,
            diffQty,
            unitCost,
            adjustmentMovementId,
            note: input.note ?? null,
          }),
        );
      }

      await manager.save(itemRecords);

      reconciliation.status = InventoryReconciliationStatus.SUBMITTED;
      reconciliation.totalDifferenceQty = totalDifferenceQty;
      reconciliation.totalDifferenceAmount =
        Math.round(totalDifferenceAmount * 100) / 100;
      reconciliation.nedostacha = Math.round(nedostacha * 100) / 100;

      return manager.save(reconciliation);
    });
  }

  async cancel(
    organizationId: string,
    reconciliationId: string,
  ): Promise<InventoryReconciliation> {
    const reconciliation = await this.recRepo.findOne({
      where: { id: reconciliationId, organizationId },
    });
    if (!reconciliation)
      throw new NotFoundException("Reconciliation not found");
    if (reconciliation.status === InventoryReconciliationStatus.SUBMITTED) {
      throw new BadRequestException("Cannot cancel submitted reconciliation");
    }
    reconciliation.status = InventoryReconciliationStatus.CANCELLED;
    return this.recRepo.save(reconciliation);
  }

  async findById(
    organizationId: string,
    id: string,
  ): Promise<InventoryReconciliation> {
    const reconciliation = await this.recRepo.findOne({
      where: { id, organizationId },
      relations: ["items", "items.product", "location", "byUser"],
    });
    if (!reconciliation)
      throw new NotFoundException("Reconciliation not found");
    return reconciliation;
  }

  async list(params: {
    organizationId: string;
    locationId?: string;
    status?: InventoryReconciliationStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ data: InventoryReconciliation[]; total: number }> {
    const qb = this.recRepo
      .createQueryBuilder("r")
      .where("r.organization_id = :org", { org: params.organizationId })
      .leftJoinAndSelect("r.location", "location")
      .leftJoinAndSelect("r.byUser", "byUser");

    if (params.locationId)
      qb.andWhere("r.location_id = :loc", { loc: params.locationId });
    if (params.status)
      qb.andWhere("r.status = :status", { status: params.status });

    qb.orderBy("r.counted_at", "DESC")
      .skip(params.offset ?? 0)
      .take(Math.min(params.limit ?? 50, 200));

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}
