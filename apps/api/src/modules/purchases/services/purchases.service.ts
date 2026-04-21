import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  Purchase,
  PurchaseStatus,
  PaymentMethod,
} from "../entities/purchase.entity";
import { PurchaseItem } from "../entities/purchase-item.entity";
import {
  Product,
  ProductPriceHistory,
  PriceType,
  Supplier,
} from "../../products/entities/product.entity";
import { StockMovementsService } from "../../stock-movements/services/stock-movements.service";
import {
  MovementType,
  MovementReferenceType,
} from "../../stock-movements/entities/stock-movement.entity";

export interface CreateDraftInput {
  organizationId: string;
  supplierId?: string | null;
  warehouseLocationId: string;
  paymentMethod?: PaymentMethod | null;
  note?: string | null;
  byUserId: string;
}

export interface AddItemInput {
  purchaseId: string;
  organizationId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  note?: string | null;
}

export interface ListPurchasesInput {
  organizationId: string;
  status?: PurchaseStatus;
  supplierId?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    @InjectRepository(Purchase)
    private readonly purchaseRepo: Repository<Purchase>,
    @InjectRepository(PurchaseItem)
    private readonly itemRepo: Repository<PurchaseItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductPriceHistory)
    private readonly priceHistoryRepo: Repository<ProductPriceHistory>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    private readonly stockMovementsService: StockMovementsService,
    private readonly dataSource: DataSource,
  ) {}

  async createDraft(input: CreateDraftInput): Promise<Purchase> {
    let supplierNameSnapshot: string | null = null;
    if (input.supplierId) {
      const supplier = await this.supplierRepo.findOne({
        where: {
          id: input.supplierId,
          organizationId: input.organizationId,
        },
      });
      if (!supplier) throw new NotFoundException("Supplier not found");
      supplierNameSnapshot = supplier.name;
    }

    const purchase = this.purchaseRepo.create({
      organizationId: input.organizationId,
      supplierId: input.supplierId ?? null,
      supplierNameSnapshot,
      warehouseLocationId: input.warehouseLocationId,
      paymentMethod: input.paymentMethod ?? null,
      status: PurchaseStatus.DRAFT,
      purchaseDate: new Date(),
      totalAmount: 0,
      totalItems: 0,
      note: input.note ?? null,
      byUserId: input.byUserId,
    });

    return this.purchaseRepo.save(purchase);
  }

  async addItem(input: AddItemInput): Promise<PurchaseItem> {
    const purchase = await this.purchaseRepo.findOne({
      where: {
        id: input.purchaseId,
        organizationId: input.organizationId,
      },
    });
    if (!purchase) throw new NotFoundException("Purchase not found");
    if (purchase.status !== PurchaseStatus.DRAFT) {
      throw new BadRequestException("Can only add items to DRAFT purchases");
    }
    if (input.quantity <= 0) {
      throw new BadRequestException("Quantity must be positive");
    }
    if (input.unitCost < 0) {
      throw new BadRequestException("Unit cost cannot be negative");
    }

    const product = await this.productRepo.findOne({
      where: {
        id: input.productId,
        organizationId: input.organizationId,
      },
    });
    if (!product) throw new NotFoundException("Product not found");

    const lineTotal = Math.round(input.quantity * input.unitCost * 100) / 100;

    return this.dataSource.transaction(async (manager) => {
      const item = manager.create(PurchaseItem, {
        purchaseId: input.purchaseId,
        productId: input.productId,
        quantity: input.quantity,
        unitCost: input.unitCost,
        lineTotal,
        note: input.note ?? null,
      });
      const saved = await manager.save(item);

      // Update purchase totals
      purchase.totalItems += input.quantity;
      purchase.totalAmount = Number(purchase.totalAmount) + lineTotal;
      await manager.save(purchase);

      return saved;
    });
  }

  async submit(
    purchaseId: string,
    organizationId: string,
    userId: string,
  ): Promise<Purchase> {
    const purchase = await this.purchaseRepo.findOne({
      where: { id: purchaseId, organizationId },
      relations: ["items", "items.product"],
    });
    if (!purchase) throw new NotFoundException("Purchase not found");
    if (purchase.status !== PurchaseStatus.DRAFT) {
      throw new BadRequestException("Only DRAFT purchases can be submitted");
    }
    if (!purchase.items || purchase.items.length === 0) {
      throw new BadRequestException("Purchase has no items");
    }

    return this.dataSource.transaction(async (manager) => {
      for (const item of purchase.items) {
        // Stock movement: PURCHASE_IN → warehouse
        await this.stockMovementsService.record({
          organizationId,
          productId: item.productId,
          fromLocationId: null,
          toLocationId: purchase.warehouseLocationId,
          quantity: item.quantity,
          movementType: MovementType.PURCHASE_IN,
          unitCost: Number(item.unitCost),
          referenceType: MovementReferenceType.PURCHASE,
          referenceId: purchase.id,
          note: `Purchase ${purchase.number ?? purchase.id}`,
          byUserId: userId,
          at: purchase.purchaseDate,
        });

        // Price history: if new cost differs from current product.purchasePrice, record
        const product = item.product;
        const currentCost = Number(product?.purchasePrice ?? 0);
        const newCost = Number(item.unitCost);
        if (Math.abs(currentCost - newCost) > 0.005) {
          const history = manager.create(ProductPriceHistory, {
            organizationId,
            productId: item.productId,
            priceType: PriceType.COST,
            // keep legacy columns populated (non-null in original schema)
            purchasePrice: newCost,
            sellingPrice: Number(product?.sellingPrice ?? 0),
            oldPrice: currentCost,
            newPrice: newCost,
            reason: `Purchase ${purchase.number ?? purchase.id} from ${purchase.supplierNameSnapshot ?? "unknown supplier"}`,
            supplierId: purchase.supplierId,
            supplierNameSnapshot: purchase.supplierNameSnapshot,
            purchaseId: purchase.id,
            changedByUserId: userId,
            effectiveFrom: new Date(),
          });
          await manager.save(history);

          // Update product.purchasePrice to new cost
          if (product) {
            product.purchasePrice = newCost;
            await manager.save(product);
          }
        }
      }

      purchase.status = PurchaseStatus.RECEIVED;
      purchase.receivedAt = new Date();
      return manager.save(purchase);
    });
  }

  async cancel(purchaseId: string, organizationId: string): Promise<Purchase> {
    const purchase = await this.purchaseRepo.findOne({
      where: { id: purchaseId, organizationId },
    });
    if (!purchase) throw new NotFoundException("Purchase not found");
    if (purchase.status === PurchaseStatus.RECEIVED) {
      throw new BadRequestException("Cannot cancel received purchase");
    }
    purchase.status = PurchaseStatus.CANCELLED;
    return this.purchaseRepo.save(purchase);
  }

  async findById(id: string, organizationId: string): Promise<Purchase> {
    const purchase = await this.purchaseRepo.findOne({
      where: { id, organizationId },
      relations: ["items", "items.product", "supplier", "warehouseLocation"],
    });
    if (!purchase) throw new NotFoundException("Purchase not found");
    return purchase;
  }

  async list(
    params: ListPurchasesInput,
  ): Promise<{ data: Purchase[]; total: number }> {
    const qb = this.purchaseRepo
      .createQueryBuilder("p")
      .where("p.organization_id = :org", { org: params.organizationId })
      .leftJoinAndSelect("p.supplier", "supplier")
      .leftJoinAndSelect("p.warehouseLocation", "warehouse");

    if (params.status) {
      qb.andWhere("p.status = :status", { status: params.status });
    }
    if (params.supplierId) {
      qb.andWhere("p.supplier_id = :sup", { sup: params.supplierId });
    }

    qb.orderBy("p.purchase_date", "DESC")
      .skip(params.offset ?? 0)
      .take(Math.min(params.limit ?? 50, 200));

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}
