/**
 * References Service
 * Manages Uzbekistan tax system reference data backed by PostgreSQL via TypeORM.
 * Provides CRUD and search for MXIK, IKPU, VAT rates, package types, and payment providers.
 */

import { Injectable, Logger, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';

import { GoodsClassifier } from './entities/goods-classifier.entity';
import { IkpuCode } from './entities/ikpu-code.entity';
import { VatRate } from './entities/vat-rate.entity';
import { PackageType } from './entities/package-type.entity';
import { PaymentProvider } from './entities/payment-provider.entity';

import { CreateGoodsClassifierDto, UpdateGoodsClassifierDto } from './dto/create-goods-classifier.dto';
import { CreateIkpuCodeDto, UpdateIkpuCodeDto } from './dto/create-ikpu-code.dto';
import { CreateVatRateDto, UpdateVatRateDto } from './dto/create-vat-rate.dto';
import { CreatePackageTypeDto, UpdatePackageTypeDto } from './dto/create-package-type.dto';
import { CreatePaymentProviderDto, UpdatePaymentProviderDto } from './dto/create-payment-provider.dto';
import { QueryGoodsClassifiersDto } from './dto/query-goods-classifiers.dto';
import { QueryIkpuCodesDto } from './dto/query-ikpu-codes.dto';
import { QueryReferencesDto, PaginatedResponseDto } from './dto/query-references.dto';

@Injectable()
export class ReferencesService {
  private readonly logger = new Logger(ReferencesService.name);

  /** Cache TTL for reference data: 10 minutes (reference data rarely changes) */
  private readonly CACHE_TTL = 600_000;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    @InjectRepository(GoodsClassifier)
    private readonly goodsClassifierRepo: Repository<GoodsClassifier>,

    @InjectRepository(IkpuCode)
    private readonly ikpuCodeRepo: Repository<IkpuCode>,

    @InjectRepository(VatRate)
    private readonly vatRateRepo: Repository<VatRate>,

    @InjectRepository(PackageType)
    private readonly packageTypeRepo: Repository<PackageType>,

    @InjectRepository(PaymentProvider)
    private readonly paymentProviderRepo: Repository<PaymentProvider>,
  ) {}

  // ========================================================================
  // GOODS CLASSIFIERS (MXIK)
  // ========================================================================

  async findAllGoodsClassifiers(
    query: QueryGoodsClassifiersDto,
  ): Promise<PaginatedResponseDto<GoodsClassifier>> {
    const { search, is_active, group_code, parent_code, level, page = 1, limit = 50 } = query;

    const qb = this.goodsClassifierRepo
      .createQueryBuilder('gc')
      .orderBy('gc.code', 'ASC');

    if (search) {
      qb.andWhere(
        '(gc.code ILIKE :search OR gc.name_ru ILIKE :search OR gc.name_uz ILIKE :search OR gc.name_en ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (is_active !== undefined) {
      qb.andWhere('gc.is_active = :is_active', { is_active });
    }

    if (group_code) {
      qb.andWhere('gc.group_code = :group_code', { group_code });
    }

    if (parent_code) {
      qb.andWhere('gc.parent_code = :parent_code', { parent_code });
    }

    if (level !== undefined) {
      qb.andWhere('gc.level = :level', { level });
    }

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findGoodsClassifierByCode(code: string): Promise<GoodsClassifier> {
    const classifier = await this.goodsClassifierRepo.findOne({ where: { code } });
    if (!classifier) {
      throw new NotFoundException(`Goods classifier with code "${code}" not found`);
    }
    return classifier;
  }

  async createGoodsClassifier(dto: CreateGoodsClassifierDto): Promise<GoodsClassifier> {
    const existing = await this.goodsClassifierRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Goods classifier with code "${dto.code}" already exists`);
    }

    const entity = this.goodsClassifierRepo.create(dto);
    const saved = await this.goodsClassifierRepo.save(entity);
    this.logger.log(`Created goods classifier: ${saved.code}`);
    return saved;
  }

  async updateGoodsClassifier(id: string, dto: UpdateGoodsClassifierDto): Promise<GoodsClassifier> {
    const entity = await this.goodsClassifierRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Goods classifier with id "${id}" not found`);
    }

    Object.assign(entity, dto);
    const saved = await this.goodsClassifierRepo.save(entity);
    this.logger.log(`Updated goods classifier: ${saved.code}`);
    return saved;
  }

  // ========================================================================
  // IKPU CODES
  // ========================================================================

  async findAllIkpuCodes(
    query: QueryIkpuCodesDto,
  ): Promise<PaginatedResponseDto<IkpuCode>> {
    const { search, is_active, mxik_code, is_marked, page = 1, limit = 50 } = query;

    const qb = this.ikpuCodeRepo
      .createQueryBuilder('ic')
      .orderBy('ic.code', 'ASC');

    if (search) {
      qb.andWhere(
        '(ic.code ILIKE :search OR ic.name_ru ILIKE :search OR ic.name_uz ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (is_active !== undefined) {
      qb.andWhere('ic.is_active = :is_active', { is_active });
    }

    if (mxik_code) {
      qb.andWhere('ic.mxik_code = :mxik_code', { mxik_code });
    }

    if (is_marked !== undefined) {
      qb.andWhere('ic.is_marked = :is_marked', { is_marked });
    }

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findIkpuCodeByCode(code: string): Promise<IkpuCode> {
    const ikpu = await this.ikpuCodeRepo.findOne({ where: { code } });
    if (!ikpu) {
      throw new NotFoundException(`IKPU code "${code}" not found`);
    }
    return ikpu;
  }

  async createIkpuCode(dto: CreateIkpuCodeDto): Promise<IkpuCode> {
    const existing = await this.ikpuCodeRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`IKPU code "${dto.code}" already exists`);
    }

    const entity = this.ikpuCodeRepo.create(dto);
    const saved = await this.ikpuCodeRepo.save(entity);
    this.logger.log(`Created IKPU code: ${saved.code}`);
    return saved;
  }

  async updateIkpuCode(id: string, dto: UpdateIkpuCodeDto): Promise<IkpuCode> {
    const entity = await this.ikpuCodeRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`IKPU code with id "${id}" not found`);
    }

    Object.assign(entity, dto);
    const saved = await this.ikpuCodeRepo.save(entity);
    this.logger.log(`Updated IKPU code: ${saved.code}`);
    return saved;
  }

  // ========================================================================
  // VAT RATES
  // ========================================================================

  async findAllVatRates(
    query: QueryReferencesDto,
  ): Promise<PaginatedResponseDto<VatRate>> {
    const { search, is_active, page = 1, limit = 50 } = query;

    const qb = this.vatRateRepo
      .createQueryBuilder('vr')
      .orderBy('vr.sort_order', 'ASC')
      .addOrderBy('vr.code', 'ASC');

    if (search) {
      qb.andWhere(
        '(vr.code ILIKE :search OR vr.name_ru ILIKE :search OR vr.name_uz ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (is_active !== undefined) {
      qb.andWhere('vr.is_active = :is_active', { is_active });
    }

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findVatRateByCode(code: string): Promise<VatRate> {
    const rate = await this.vatRateRepo.findOne({ where: { code } });
    if (!rate) {
      throw new NotFoundException(`VAT rate with code "${code}" not found`);
    }
    return rate;
  }

  async createVatRate(dto: CreateVatRateDto): Promise<VatRate> {
    const existing = await this.vatRateRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`VAT rate with code "${dto.code}" already exists`);
    }

    const entity = this.vatRateRepo.create(dto);
    const saved = await this.vatRateRepo.save(entity);
    this.logger.log(`Created VAT rate: ${saved.code} (${saved.rate}%)`);
    await this.cacheManager.del('ref:default_vat_rate');
    return saved;
  }

  async updateVatRate(id: string, dto: UpdateVatRateDto): Promise<VatRate> {
    const entity = await this.vatRateRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`VAT rate with id "${id}" not found`);
    }

    Object.assign(entity, dto);
    const saved = await this.vatRateRepo.save(entity);
    this.logger.log(`Updated VAT rate: ${saved.code} (${saved.rate}%)`);
    await this.cacheManager.del('ref:default_vat_rate');
    return saved;
  }

  /**
   * Get the default VAT rate value (cached for 10 minutes).
   * Returns 12 (standard Uzbekistan rate) if no default is configured.
   */
  async getDefaultVatRate(): Promise<number> {
    const cacheKey = 'ref:default_vat_rate';
    const cached = await this.cacheManager.get<number>(cacheKey);
    if (cached !== undefined && cached !== null) return cached;

    const defaultRate = await this.vatRateRepo.findOne({
      where: { is_default: true, is_active: true },
    });
    const rate = defaultRate ? Number(defaultRate.rate) : 12;
    await this.cacheManager.set(cacheKey, rate, this.CACHE_TTL);
    return rate;
  }

  // ========================================================================
  // PACKAGE TYPES
  // ========================================================================

  async findAllPackageTypes(
    query: QueryReferencesDto,
  ): Promise<PaginatedResponseDto<PackageType>> {
    const { search, is_active, page = 1, limit = 50 } = query;

    const qb = this.packageTypeRepo
      .createQueryBuilder('pt')
      .orderBy('pt.sort_order', 'ASC')
      .addOrderBy('pt.code', 'ASC');

    if (search) {
      qb.andWhere(
        '(pt.code ILIKE :search OR pt.name_ru ILIKE :search OR pt.name_uz ILIKE :search OR pt.name_en ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (is_active !== undefined) {
      qb.andWhere('pt.is_active = :is_active', { is_active });
    }

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findPackageTypeByCode(code: string): Promise<PackageType> {
    const pt = await this.packageTypeRepo.findOne({ where: { code } });
    if (!pt) {
      throw new NotFoundException(`Package type with code "${code}" not found`);
    }
    return pt;
  }

  async createPackageType(dto: CreatePackageTypeDto): Promise<PackageType> {
    const existing = await this.packageTypeRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Package type with code "${dto.code}" already exists`);
    }

    const entity = this.packageTypeRepo.create(dto);
    const saved = await this.packageTypeRepo.save(entity);
    this.logger.log(`Created package type: ${saved.code}`);
    return saved;
  }

  async updatePackageType(id: string, dto: UpdatePackageTypeDto): Promise<PackageType> {
    const entity = await this.packageTypeRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Package type with id "${id}" not found`);
    }

    Object.assign(entity, dto);
    const saved = await this.packageTypeRepo.save(entity);
    this.logger.log(`Updated package type: ${saved.code}`);
    return saved;
  }

  // ========================================================================
  // PAYMENT PROVIDERS
  // ========================================================================

  async findAllPaymentProviders(
    query: QueryReferencesDto,
  ): Promise<PaginatedResponseDto<PaymentProvider>> {
    const { search, is_active, page = 1, limit = 50 } = query;

    const qb = this.paymentProviderRepo
      .createQueryBuilder('pp')
      .orderBy('pp.sort_order', 'ASC')
      .addOrderBy('pp.name', 'ASC');

    if (search) {
      qb.andWhere(
        '(pp.code ILIKE :search OR pp.name ILIKE :search OR pp.name_ru ILIKE :search OR pp.name_uz ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (is_active !== undefined) {
      qb.andWhere('pp.is_active = :is_active', { is_active });
    }

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);
    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findPaymentProviderByCode(code: string): Promise<PaymentProvider> {
    const provider = await this.paymentProviderRepo.findOne({ where: { code } });
    if (!provider) {
      throw new NotFoundException(`Payment provider with code "${code}" not found`);
    }
    return provider;
  }

  async createPaymentProvider(dto: CreatePaymentProviderDto): Promise<PaymentProvider> {
    const existing = await this.paymentProviderRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Payment provider with code "${dto.code}" already exists`);
    }

    const entity = this.paymentProviderRepo.create(dto);
    const saved = await this.paymentProviderRepo.save(entity);
    this.logger.log(`Created payment provider: ${saved.code} (${saved.type})`);
    return saved;
  }

  async updatePaymentProvider(id: string, dto: UpdatePaymentProviderDto): Promise<PaymentProvider> {
    const entity = await this.paymentProviderRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Payment provider with id "${id}" not found`);
    }

    Object.assign(entity, dto);
    const saved = await this.paymentProviderRepo.save(entity);
    this.logger.log(`Updated payment provider: ${saved.code} (${saved.type})`);
    return saved;
  }

  // ========================================================================
  // UTILITY
  // ========================================================================

  /**
   * Marking requirements (static reference, not DB-backed yet).
   * Products that require mandatory marking in Uzbekistan.
   */
  getMarkingRequirements(): Array<{
    category: string;
    name_ru: string;
    required: boolean;
    start_date?: string;
    planned_date?: string;
  }> {
    return [
      {
        category: 'tobacco',
        name_ru: 'Табачные изделия',
        required: true,
        start_date: '2020-01-01',
      },
      {
        category: 'alcohol',
        name_ru: 'Алкогольная продукция',
        required: true,
        start_date: '2021-01-01',
      },
      {
        category: 'water',
        name_ru: 'Питьевая вода (более 0.5л)',
        required: true,
        start_date: '2022-01-01',
      },
      {
        category: 'soft_drinks',
        name_ru: 'Безалкогольные напитки',
        required: false,
        planned_date: '2025-01-01',
      },
    ];
  }

  /**
   * Check if a product category requires mandatory marking.
   */
  isMarkingRequired(category: string): boolean {
    const requirement = this.getMarkingRequirements().find(
      (r) => r.category === category,
    );
    return requirement?.required || false;
  }

  /**
   * Supported currencies (static reference).
   */
  getCurrencies(): Array<{
    code: string;
    name: string;
    symbol: string;
    is_default: boolean;
  }> {
    return [
      { code: 'UZS', name: 'Узбекский сум', symbol: "so'm", is_default: true },
      { code: 'USD', name: 'Доллар США', symbol: '$', is_default: false },
    ];
  }

  /**
   * Get the default currency code.
   */
  getDefaultCurrency(): string {
    return 'UZS';
  }

  /**
   * Uzbekistan regions (static reference).
   */
  getRegions(): Array<{ code: string; name_ru: string; name_uz: string }> {
    return [
      { code: 'TAS', name_ru: 'Ташкент', name_uz: 'Toshkent' },
      { code: 'TAS_REG', name_ru: 'Ташкентская область', name_uz: 'Toshkent viloyati' },
      { code: 'SAM', name_ru: 'Самарканд', name_uz: 'Samarqand' },
      { code: 'BUK', name_ru: 'Бухара', name_uz: 'Buxoro' },
      { code: 'AND', name_ru: 'Андижан', name_uz: 'Andijon' },
      { code: 'FER', name_ru: 'Фергана', name_uz: "Farg'ona" },
      { code: 'NAM', name_ru: 'Наманган', name_uz: 'Namangan' },
      { code: 'KAR', name_ru: 'Каракалпакстан', name_uz: "Qoraqalpog'iston" },
      { code: 'XOR', name_ru: 'Хорезм', name_uz: 'Xorazm' },
      { code: 'NAV', name_ru: 'Навои', name_uz: 'Navoiy' },
      { code: 'KAS', name_ru: 'Кашкадарья', name_uz: 'Qashqadaryo' },
      { code: 'SUR', name_ru: 'Сурхандарья', name_uz: 'Surxondaryo' },
      { code: 'JIZ', name_ru: 'Джизак', name_uz: 'Jizzax' },
      { code: 'SIR', name_ru: 'Сырдарья', name_uz: 'Sirdaryo' },
    ];
  }
}
