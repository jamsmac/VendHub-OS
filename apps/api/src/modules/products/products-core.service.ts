/**
 * Products Core Service
 * CRUD, suppliers, pricing, price history
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import {
  Product,
  ProductPriceHistory,
  Supplier,
} from "./entities/product.entity";
import { UpdatePriceDto } from "./dto/create-recipe.dto";
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from "./dto/create-supplier.dto";
import { stripProtectedFields } from "../../common/utils";

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ProductFilters {
  category?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ProductsCoreService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductPriceHistory)
    private readonly priceHistoryRepository: Repository<ProductPriceHistory>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  // ── Product CRUD ───────────────────────────────────────

  async create(data: Partial<Product>): Promise<Product> {
    const product = this.productRepository.create(data);
    return this.productRepository.save(product);
  }

  async findAll(
    organizationId: string,
    filters?: ProductFilters,
  ): Promise<PaginatedResult<Product>> {
    const {
      page = 1,
      limit: rawLimit = 50,
      category,
      isActive,
      search,
    } = filters || {};
    const limit = Math.min(rawLimit, 100);

    const query = this.productRepository
      .createQueryBuilder("product")
      .select([
        "product.id",
        "product.name",
        "product.nameUz",
        "product.sku",
        "product.barcode",
        "product.category",
        "product.isActive",
        "product.sellingPrice",
        "product.purchasePrice",
        "product.imageUrl",
        "product.unitOfMeasure",
        "product.organizationId",
        "product.createdAt",
        "product.updatedAt",
      ])
      .where("product.organizationId = :organizationId", { organizationId });

    if (category) {
      query.andWhere("product.category = :category", { category });
    }

    if (isActive !== undefined) {
      query.andWhere("product.isActive = :isActive", { isActive });
    }

    if (search) {
      query.andWhere(
        "(product.name ILIKE :search OR product.barcode ILIKE :search OR product.sku ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    const total = await query.getCount();

    query.orderBy("product.name", "ASC");
    query.skip((page - 1) * limit);
    query.take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, organizationId?: string): Promise<Product> {
    const where: Record<string, unknown> = { id };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    const product = await this.productRepository.findOne({ where });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async findByBarcode(
    barcode: string,
    organizationId: string,
  ): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { barcode, organizationId },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: Partial<Product>,
  ): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, organizationId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    Object.assign(
      product,
      stripProtectedFields(data as Record<string, unknown>),
    );
    return this.productRepository.save(product);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id, organizationId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    await this.productRepository.softDelete(id);
  }

  // ── Price History ──────────────────────────────────────

  async updatePrice(
    productId: string,
    organizationId: string,
    dto: UpdatePriceDto,
    userId: string,
  ): Promise<{ product: Product; history: ProductPriceHistory }> {
    const product = await this.findById(productId, organizationId);

    if (dto.purchasePrice === undefined && dto.sellingPrice === undefined) {
      throw new BadRequestException(
        "At least one of purchasePrice or sellingPrice must be provided",
      );
    }

    await this.priceHistoryRepository.update(
      { productId, effectiveTo: IsNull() },
      { effectiveTo: new Date() },
    );

    const newPurchasePrice = dto.purchasePrice ?? Number(product.purchasePrice);
    const newSellingPrice = dto.sellingPrice ?? Number(product.sellingPrice);

    const history = this.priceHistoryRepository.create({
      productId,
      purchasePrice: newPurchasePrice,
      sellingPrice: newSellingPrice,
      changeReason: dto.changeReason,
      changedByUserId: userId,
      createdById: userId,
    });
    const savedHistory = await this.priceHistoryRepository.save(history);

    product.purchasePrice = newPurchasePrice;
    product.sellingPrice = newSellingPrice;
    product.updatedById = userId;
    const savedProduct = await this.productRepository.save(product);

    return { product: savedProduct, history: savedHistory };
  }

  async getPriceHistory(
    productId: string,
    organizationId: string,
  ): Promise<ProductPriceHistory[]> {
    await this.findById(productId, organizationId);

    return this.priceHistoryRepository.find({
      where: { productId },
      order: { effectiveFrom: "DESC" },
    });
  }

  // ── Suppliers ──────────────────────────────────────────

  async createSupplier(
    organizationId: string,
    dto: CreateSupplierDto,
    userId: string,
  ): Promise<Supplier> {
    const supplier = this.supplierRepository.create({
      ...dto,
      organizationId,
      createdById: userId,
    });
    return this.supplierRepository.save(supplier);
  }

  async findAllSuppliers(
    organizationId: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<Supplier>> {
    const [data, total] = await this.supplierRepository.findAndCount({
      where: { organizationId },
      order: { name: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findSupplierById(
    id: string,
    organizationId: string,
  ): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id, organizationId },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return supplier;
  }

  async updateSupplier(
    id: string,
    organizationId: string,
    dto: UpdateSupplierDto,
    userId: string,
  ): Promise<Supplier> {
    const supplier = await this.findSupplierById(id, organizationId);
    Object.assign(supplier, { ...dto, updatedById: userId });
    return this.supplierRepository.save(supplier);
  }
}
