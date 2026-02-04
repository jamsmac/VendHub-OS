# 🚀 ФИНАЛЬНЫЙ ПРОМТ: Доработка VendHub OS до 100% готовности

## 📋 Обзор задачи

**Цель:** Реализовать 4 оставшиеся таблицы для достижения полного функционального паритета с VHM24-repo

**Оставшиеся компоненты:**
1. `dictionaries` + `dictionary_items` — Универсальные справочники (3-4ч)
2. `dashboard_widgets` — Кастомизируемые виджеты дашборда (4-5ч)
3. `custom_reports` — Конструктор отчётов (4-5ч)
4. `inventory_reservations` — Резервирование инвентаря (6-8ч)

**Общее время:** ~17-22 часа

---

# 📁 Часть 1: Справочники (Dictionaries)

## 1.1 Entity: Dictionary

**Файл:** `apps/api/src/modules/dictionaries/entities/dictionary.entity.ts`

```typescript
import {
  Entity,
  Column,
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DictionaryItem } from './dictionary-item.entity';

export enum DictionaryType {
  SYSTEM = 'system',
  CUSTOM = 'custom',
}

@Entity('dictionaries')
@Index(['code'], { unique: true })
@Index(['organizationId', 'type'])
@Index(['isActive'])
export class Dictionary extends BaseEntity {
  @ApiProperty({ description: 'Уникальный код справочника', example: 'machine_status' })
  @Column({ length: 100 })
  code: string;

  @ApiProperty({ description: 'Название справочника (RU)', example: 'Статусы автоматов' })
  @Column({ length: 255 })
  name: string;

  @ApiPropertyOptional({ description: 'Название справочника (UZ)' })
  @Column({ length: 255, nullable: true })
  nameUz: string;

  @ApiPropertyOptional({ description: 'Описание справочника' })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ description: 'Тип справочника', enum: DictionaryType })
  @Column({ type: 'enum', enum: DictionaryType, default: DictionaryType.CUSTOM })
  type: DictionaryType;

  @ApiProperty({ description: 'Системный справочник (нельзя удалить)', default: false })
  @Column({ default: false })
  isSystem: boolean;

  @ApiProperty({ description: 'Активен ли справочник', default: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'ID организации (null = глобальный)' })
  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null;

  @ApiPropertyOptional({ description: 'Дополнительные метаданные' })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ApiPropertyOptional({ description: 'Порядок сортировки' })
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  // Relations
  @OneToMany(() => DictionaryItem, (item) => item.dictionary, {
    cascade: true,
    eager: false,
  })
  items: DictionaryItem[];

  // Computed
  @ApiProperty({ description: 'Количество элементов' })
  itemsCount?: number;

  // Hooks
  @BeforeInsert()
  @BeforeUpdate()
  normalizeCode() {
    if (this.code) {
      this.code = this.code.toLowerCase().replace(/\s+/g, '_');
    }
  }
}
```

## 1.2 Entity: DictionaryItem

**Файл:** `apps/api/src/modules/dictionaries/entities/dictionary-item.entity.ts`

```typescript
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Dictionary } from './dictionary.entity';

@Entity('dictionary_items')
@Index(['dictionaryId', 'code'], { unique: true })
@Index(['dictionaryId', 'sortOrder'])
@Index(['isActive'])
@Index(['parentId'])
export class DictionaryItem extends BaseEntity {
  @ApiProperty({ description: 'ID справочника' })
  @Column({ type: 'uuid' })
  dictionaryId: string;

  @ApiProperty({ description: 'Уникальный код элемента', example: 'active' })
  @Column({ length: 100 })
  code: string;

  @ApiProperty({ description: 'Значение/Название (RU)', example: 'Активен' })
  @Column({ length: 255 })
  value: string;

  @ApiPropertyOptional({ description: 'Значение/Название (UZ)' })
  @Column({ length: 255, nullable: true })
  valueUz: string;

  @ApiPropertyOptional({ description: 'Краткое описание' })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiPropertyOptional({ description: 'Цвет для UI (hex)', example: '#4CAF50' })
  @Column({ length: 20, nullable: true })
  color: string;

  @ApiPropertyOptional({ description: 'Иконка (имя или URL)' })
  @Column({ length: 100, nullable: true })
  icon: string;

  @ApiProperty({ description: 'Активен ли элемент', default: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Элемент по умолчанию', default: false })
  @Column({ default: false })
  isDefault: boolean;

  @ApiPropertyOptional({ description: 'Порядок сортировки' })
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @ApiPropertyOptional({ description: 'ID родительского элемента (для иерархии)' })
  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ApiPropertyOptional({ description: 'Дополнительные данные (JSON)' })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => Dictionary, (dict) => dict.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dictionary_id' })
  dictionary: Dictionary;

  @ManyToOne(() => DictionaryItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: DictionaryItem;

  // Computed
  children?: DictionaryItem[];

  // Hooks
  @BeforeInsert()
  @BeforeUpdate()
  normalizeCode() {
    if (this.code) {
      this.code = this.code.toLowerCase().replace(/\s+/g, '_');
    }
  }
}
```

## 1.3 DTOs

**Файл:** `apps/api/src/modules/dictionaries/dto/dictionary.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsInt,
  IsObject,
  MaxLength,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DictionaryType } from '../entities/dictionary.entity';

// ============ DICTIONARY DTOs ============

export class CreateDictionaryDto {
  @ApiProperty({ description: 'Уникальный код справочника', example: 'payment_types' })
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.toLowerCase().replace(/\s+/g, '_'))
  code: string;

  @ApiProperty({ description: 'Название (RU)', example: 'Типы оплаты' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Название (UZ)' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nameUz?: string;

  @ApiPropertyOptional({ description: 'Описание' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: DictionaryType, default: DictionaryType.CUSTOM })
  @IsEnum(DictionaryType)
  @IsOptional()
  type?: DictionaryType;

  @ApiPropertyOptional({ description: 'Порядок сортировки' })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Метаданные' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Элементы справочника', type: () => [CreateDictionaryItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDictionaryItemDto)
  @IsOptional()
  items?: CreateDictionaryItemDto[];
}

export class UpdateDictionaryDto extends PartialType(
  OmitType(CreateDictionaryDto, ['code'] as const)
) {}

export class DictionaryFilterDto {
  @ApiPropertyOptional({ description: 'Поиск по коду или названию' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: DictionaryType })
  @IsEnum(DictionaryType)
  @IsOptional()
  type?: DictionaryType;

  @ApiPropertyOptional({ description: 'Только системные' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isSystem?: boolean;

  @ApiPropertyOptional({ description: 'Только активные' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Включить элементы' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeItems?: boolean;
}

// ============ DICTIONARY ITEM DTOs ============

export class CreateDictionaryItemDto {
  @ApiProperty({ description: 'Код элемента', example: 'cash' })
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.toLowerCase().replace(/\s+/g, '_'))
  code: string;

  @ApiProperty({ description: 'Значение (RU)', example: 'Наличные' })
  @IsString()
  @MaxLength(255)
  value: string;

  @ApiPropertyOptional({ description: 'Значение (UZ)' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  valueUz?: string;

  @ApiPropertyOptional({ description: 'Описание' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Цвет (hex)', example: '#4CAF50' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ description: 'Иконка' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional({ description: 'Активен' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'По умолчанию' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Порядок' })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'ID родителя' })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Метаданные' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateDictionaryItemDto extends PartialType(
  OmitType(CreateDictionaryItemDto, ['code'] as const)
) {}

export class ReorderItemsDto {
  @ApiProperty({ description: 'Массив ID в новом порядке', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds: string[];
}

// ============ RESPONSE DTOs ============

export class DictionaryItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() value: string;
  @ApiPropertyOptional() valueUz?: string;
  @ApiPropertyOptional() color?: string;
  @ApiPropertyOptional() icon?: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() isDefault: boolean;
  @ApiProperty() sortOrder: number;
  @ApiPropertyOptional() parentId?: string;
  @ApiPropertyOptional() metadata?: Record<string, any>;
  @ApiPropertyOptional({ type: () => [DictionaryItemResponseDto] })
  children?: DictionaryItemResponseDto[];
}

export class DictionaryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() nameUz?: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty({ enum: DictionaryType }) type: DictionaryType;
  @ApiProperty() isSystem: boolean;
  @ApiProperty() isActive: boolean;
  @ApiProperty() sortOrder: number;
  @ApiProperty() itemsCount: number;
  @ApiPropertyOptional({ type: [DictionaryItemResponseDto] })
  items?: DictionaryItemResponseDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
```

## 1.4 Service

**Файл:** `apps/api/src/modules/dictionaries/dictionaries.service.ts`

```typescript
import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Dictionary, DictionaryType } from './entities/dictionary.entity';
import { DictionaryItem } from './entities/dictionary-item.entity';
import {
  CreateDictionaryDto,
  UpdateDictionaryDto,
  DictionaryFilterDto,
  CreateDictionaryItemDto,
  UpdateDictionaryItemDto,
  ReorderItemsDto,
} from './dto/dictionary.dto';

@Injectable()
export class DictionariesService {
  private readonly logger = new Logger(DictionariesService.name);

  constructor(
    @InjectRepository(Dictionary)
    private readonly dictionaryRepo: Repository<Dictionary>,
    @InjectRepository(DictionaryItem)
    private readonly itemRepo: Repository<DictionaryItem>,
  ) {}

  // ============ DICTIONARY METHODS ============

  async findAll(organizationId: string | null, filter: DictionaryFilterDto): Promise<Dictionary[]> {
    const qb = this.dictionaryRepo.createQueryBuilder('d')
      .where('(d.organization_id = :orgId OR d.organization_id IS NULL)', { orgId: organizationId })
      .andWhere('d.deleted_at IS NULL');

    if (filter.search) {
      qb.andWhere('(d.code ILIKE :search OR d.name ILIKE :search)', {
        search: `%${filter.search}%`,
      });
    }

    if (filter.type) {
      qb.andWhere('d.type = :type', { type: filter.type });
    }

    if (filter.isSystem !== undefined) {
      qb.andWhere('d.is_system = :isSystem', { isSystem: filter.isSystem });
    }

    if (filter.isActive !== undefined) {
      qb.andWhere('d.is_active = :isActive', { isActive: filter.isActive });
    }

    if (filter.includeItems) {
      qb.leftJoinAndSelect('d.items', 'items', 'items.deleted_at IS NULL')
        .addOrderBy('items.sort_order', 'ASC');
    }

    qb.orderBy('d.sort_order', 'ASC').addOrderBy('d.name', 'ASC');

    const dictionaries = await qb.getMany();

    // Add items count
    const counts = await this.dictionaryRepo
      .createQueryBuilder('d')
      .select('d.id', 'id')
      .addSelect('COUNT(items.id)', 'count')
      .leftJoin('d.items', 'items', 'items.deleted_at IS NULL')
      .where('d.id IN (:...ids)', { ids: dictionaries.map(d => d.id) })
      .groupBy('d.id')
      .getRawMany();

    const countMap = new Map(counts.map(c => [c.id, parseInt(c.count)]));
    dictionaries.forEach(d => {
      d.itemsCount = countMap.get(d.id) || 0;
    });

    return dictionaries;
  }

  async findOne(id: string, organizationId: string | null, includeItems = true): Promise<Dictionary> {
    const qb = this.dictionaryRepo.createQueryBuilder('d')
      .where('d.id = :id', { id })
      .andWhere('(d.organization_id = :orgId OR d.organization_id IS NULL)', { orgId: organizationId })
      .andWhere('d.deleted_at IS NULL');

    if (includeItems) {
      qb.leftJoinAndSelect('d.items', 'items', 'items.deleted_at IS NULL')
        .addOrderBy('items.sort_order', 'ASC');
    }

    const dictionary = await qb.getOne();
    if (!dictionary) {
      throw new NotFoundException(`Справочник с ID ${id} не найден`);
    }

    return dictionary;
  }

  async findByCode(code: string, organizationId: string | null): Promise<Dictionary> {
    const dictionary = await this.dictionaryRepo.findOne({
      where: [
        { code, organizationId, deletedAt: IsNull() },
        { code, organizationId: IsNull(), deletedAt: IsNull() },
      ],
      relations: ['items'],
      order: { items: { sortOrder: 'ASC' } },
    });

    if (!dictionary) {
      throw new NotFoundException(`Справочник с кодом "${code}" не найден`);
    }

    return dictionary;
  }

  async create(organizationId: string | null, dto: CreateDictionaryDto): Promise<Dictionary> {
    // Check code uniqueness
    const existing = await this.dictionaryRepo.findOne({
      where: { code: dto.code, deletedAt: IsNull() },
    });

    if (existing) {
      throw new ConflictException(`Справочник с кодом "${dto.code}" уже существует`);
    }

    const dictionary = this.dictionaryRepo.create({
      ...dto,
      organizationId,
      type: dto.type || DictionaryType.CUSTOM,
    });

    await this.dictionaryRepo.save(dictionary);

    // Create items if provided
    if (dto.items?.length) {
      const items = dto.items.map((itemDto, index) =>
        this.itemRepo.create({
          ...itemDto,
          dictionaryId: dictionary.id,
          sortOrder: itemDto.sortOrder ?? index,
        })
      );
      await this.itemRepo.save(items);
      dictionary.items = items;
    }

    this.logger.log(`Created dictionary: ${dictionary.code} (${dictionary.id})`);
    return dictionary;
  }

  async update(id: string, organizationId: string | null, dto: UpdateDictionaryDto): Promise<Dictionary> {
    const dictionary = await this.findOne(id, organizationId, false);

    if (dictionary.isSystem && dto.isActive === false) {
      throw new BadRequestException('Нельзя деактивировать системный справочник');
    }

    Object.assign(dictionary, dto);
    await this.dictionaryRepo.save(dictionary);

    this.logger.log(`Updated dictionary: ${dictionary.code} (${dictionary.id})`);
    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string | null): Promise<void> {
    const dictionary = await this.findOne(id, organizationId, false);

    if (dictionary.isSystem) {
      throw new BadRequestException('Нельзя удалить системный справочник');
    }

    // Soft delete
    await this.dictionaryRepo.softDelete(id);
    await this.itemRepo.softDelete({ dictionaryId: id });

    this.logger.log(`Deleted dictionary: ${dictionary.code} (${id})`);
  }

  // ============ DICTIONARY ITEM METHODS ============

  async findItems(dictionaryId: string, organizationId: string | null): Promise<DictionaryItem[]> {
    await this.findOne(dictionaryId, organizationId, false); // Verify access

    return this.itemRepo.find({
      where: { dictionaryId, deletedAt: IsNull() },
      order: { sortOrder: 'ASC' },
    });
  }

  async createItem(
    dictionaryId: string,
    organizationId: string | null,
    dto: CreateDictionaryItemDto,
  ): Promise<DictionaryItem> {
    const dictionary = await this.findOne(dictionaryId, organizationId, false);

    // Check code uniqueness within dictionary
    const existing = await this.itemRepo.findOne({
      where: { dictionaryId, code: dto.code, deletedAt: IsNull() },
    });

    if (existing) {
      throw new ConflictException(`Элемент с кодом "${dto.code}" уже существует в справочнике`);
    }

    // Get max sort order
    const maxOrder = await this.itemRepo
      .createQueryBuilder('i')
      .select('MAX(i.sort_order)', 'max')
      .where('i.dictionary_id = :dictionaryId', { dictionaryId })
      .getRawOne();

    const item = this.itemRepo.create({
      ...dto,
      dictionaryId,
      sortOrder: dto.sortOrder ?? (maxOrder?.max ?? 0) + 1,
    });

    // Handle isDefault - unset others
    if (dto.isDefault) {
      await this.itemRepo.update(
        { dictionaryId, isDefault: true },
        { isDefault: false },
      );
    }

    await this.itemRepo.save(item);

    this.logger.log(`Created dictionary item: ${item.code} in ${dictionary.code}`);
    return item;
  }

  async updateItem(
    dictionaryId: string,
    itemId: string,
    organizationId: string | null,
    dto: UpdateDictionaryItemDto,
  ): Promise<DictionaryItem> {
    await this.findOne(dictionaryId, organizationId, false); // Verify access

    const item = await this.itemRepo.findOne({
      where: { id: itemId, dictionaryId, deletedAt: IsNull() },
    });

    if (!item) {
      throw new NotFoundException(`Элемент с ID ${itemId} не найден`);
    }

    // Handle isDefault
    if (dto.isDefault && !item.isDefault) {
      await this.itemRepo.update(
        { dictionaryId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(item, dto);
    await this.itemRepo.save(item);

    return item;
  }

  async removeItem(dictionaryId: string, itemId: string, organizationId: string | null): Promise<void> {
    await this.findOne(dictionaryId, organizationId, false); // Verify access

    const item = await this.itemRepo.findOne({
      where: { id: itemId, dictionaryId, deletedAt: IsNull() },
    });

    if (!item) {
      throw new NotFoundException(`Элемент с ID ${itemId} не найден`);
    }

    await this.itemRepo.softDelete(itemId);
    this.logger.log(`Deleted dictionary item: ${item.code} (${itemId})`);
  }

  async reorderItems(
    dictionaryId: string,
    organizationId: string | null,
    dto: ReorderItemsDto,
  ): Promise<DictionaryItem[]> {
    await this.findOne(dictionaryId, organizationId, false); // Verify access

    const updates = dto.itemIds.map((id, index) =>
      this.itemRepo.update({ id, dictionaryId }, { sortOrder: index })
    );

    await Promise.all(updates);
    return this.findItems(dictionaryId, organizationId);
  }

  // ============ SEED SYSTEM DICTIONARIES ============

  async seedSystemDictionaries(): Promise<void> {
    const systemDictionaries = [
      {
        code: 'machine_status',
        name: 'Статусы автоматов',
        nameUz: 'Avtomat holatlari',
        type: DictionaryType.SYSTEM,
        isSystem: true,
        items: [
          { code: 'active', value: 'Активен', valueUz: 'Faol', color: '#4CAF50', icon: 'check-circle' },
          { code: 'inactive', value: 'Неактивен', valueUz: 'Nofaol', color: '#9E9E9E', icon: 'pause-circle' },
          { code: 'maintenance', value: 'На обслуживании', valueUz: 'Xizmatda', color: '#FF9800', icon: 'wrench' },
          { code: 'error', value: 'Ошибка', valueUz: 'Xato', color: '#F44336', icon: 'alert-circle' },
          { code: 'offline', value: 'Оффлайн', valueUz: 'Oflayn', color: '#607D8B', icon: 'wifi-off' },
        ],
      },
      {
        code: 'payment_type',
        name: 'Типы оплаты',
        nameUz: "To'lov turlari",
        type: DictionaryType.SYSTEM,
        isSystem: true,
        items: [
          { code: 'cash', value: 'Наличные', valueUz: 'Naqd', color: '#4CAF50', icon: 'banknote' },
          { code: 'card', value: 'Банковская карта', valueUz: 'Bank kartasi', color: '#2196F3', icon: 'credit-card' },
          { code: 'payme', value: 'Payme', valueUz: 'Payme', color: '#00BCD4', icon: 'smartphone' },
          { code: 'click', value: 'Click', valueUz: 'Click', color: '#00BCD4', icon: 'smartphone' },
          { code: 'uzum', value: 'Uzum', valueUz: 'Uzum', color: '#7C4DFF', icon: 'smartphone' },
        ],
      },
      {
        code: 'task_priority',
        name: 'Приоритеты задач',
        nameUz: 'Vazifa ustuvorliklari',
        type: DictionaryType.SYSTEM,
        isSystem: true,
        items: [
          { code: 'low', value: 'Низкий', valueUz: 'Past', color: '#4CAF50', sortOrder: 1 },
          { code: 'medium', value: 'Средний', valueUz: "O'rta", color: '#FF9800', sortOrder: 2, isDefault: true },
          { code: 'high', value: 'Высокий', valueUz: 'Yuqori', color: '#F44336', sortOrder: 3 },
          { code: 'critical', value: 'Критический', valueUz: 'Kritik', color: '#9C27B0', sortOrder: 4 },
        ],
      },
      {
        code: 'alert_type',
        name: 'Типы алертов',
        nameUz: 'Ogohlantirish turlari',
        type: DictionaryType.SYSTEM,
        isSystem: true,
        items: [
          { code: 'low_stock', value: 'Низкий остаток', valueUz: 'Kam qoldiq', color: '#FF9800', icon: 'package' },
          { code: 'out_of_stock', value: 'Нет в наличии', valueUz: 'Mavjud emas', color: '#F44336', icon: 'package-x' },
          { code: 'device_error', value: 'Ошибка устройства', valueUz: 'Qurilma xatosi', color: '#F44336', icon: 'alert-triangle' },
          { code: 'connection_lost', value: 'Потеря связи', valueUz: "Aloqa yo'qoldi", color: '#607D8B', icon: 'wifi-off' },
          { code: 'cash_full', value: 'Касса заполнена', valueUz: "Kassa to'ldi", color: '#FF9800', icon: 'inbox' },
          { code: 'maintenance_due', value: 'Требуется ТО', valueUz: 'Xizmat kerak', color: '#2196F3', icon: 'calendar' },
        ],
      },
      {
        code: 'unit_type',
        name: 'Единицы измерения',
        nameUz: "O'lchov birliklari",
        type: DictionaryType.SYSTEM,
        isSystem: true,
        items: [
          { code: 'piece', value: 'Штука', valueUz: 'Dona', isDefault: true },
          { code: 'gram', value: 'Грамм', valueUz: 'Gramm' },
          { code: 'kg', value: 'Килограмм', valueUz: 'Kilogramm' },
          { code: 'liter', value: 'Литр', valueUz: 'Litr' },
          { code: 'ml', value: 'Миллилитр', valueUz: 'Millilitr' },
          { code: 'pack', value: 'Упаковка', valueUz: 'Qadoq' },
          { code: 'box', value: 'Коробка', valueUz: 'Quti' },
        ],
      },
    ];

    for (const dictData of systemDictionaries) {
      const existing = await this.dictionaryRepo.findOne({
        where: { code: dictData.code },
      });

      if (!existing) {
        const { items, ...dictionaryData } = dictData;
        const dictionary = await this.create(null, {
          ...dictionaryData,
          items: items.map((item, index) => ({
            ...item,
            sortOrder: item.sortOrder ?? index,
          })),
        });
        this.logger.log(`Seeded system dictionary: ${dictionary.code}`);
      }
    }
  }
}
```

## 1.5 Controller

**Файл:** `apps/api/src/modules/dictionaries/dictionaries.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { DictionariesService } from './dictionaries.service';
import {
  CreateDictionaryDto,
  UpdateDictionaryDto,
  DictionaryFilterDto,
  CreateDictionaryItemDto,
  UpdateDictionaryItemDto,
  ReorderItemsDto,
  DictionaryResponseDto,
  DictionaryItemResponseDto,
} from './dto/dictionary.dto';

@ApiTags('Dictionaries')
@ApiBearerAuth()
@Controller('dictionaries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DictionariesController {
  constructor(private readonly dictionariesService: DictionariesService) {}

  // ============ DICTIONARY ENDPOINTS ============

  @Get()
  @ApiOperation({ summary: 'Получить список справочников' })
  @ApiResponse({ status: 200, type: [DictionaryResponseDto] })
  async findAll(
    @CurrentUser() user: User,
    @Query() filter: DictionaryFilterDto,
  ) {
    return this.dictionariesService.findAll(user.organizationId, filter);
  }

  @Get('by-code/:code')
  @ApiOperation({ summary: 'Получить справочник по коду' })
  @ApiParam({ name: 'code', description: 'Код справочника', example: 'machine_status' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  async findByCode(
    @CurrentUser() user: User,
    @Param('code') code: string,
  ) {
    return this.dictionariesService.findByCode(code, user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить справочник по ID' })
  @ApiParam({ name: 'id', description: 'UUID справочника' })
  @ApiQuery({ name: 'includeItems', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  async findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeItems') includeItems?: boolean,
  ) {
    return this.dictionariesService.findOne(id, user.organizationId, includeItems !== false);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Создать справочник' })
  @ApiResponse({ status: 201, type: DictionaryResponseDto })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateDictionaryDto,
  ) {
    return this.dictionariesService.create(user.organizationId, dto);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Обновить справочник' })
  @ApiResponse({ status: 200, type: DictionaryResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDictionaryDto,
  ) {
    return this.dictionariesService.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить справочник' })
  @ApiResponse({ status: 204 })
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.dictionariesService.remove(id, user.organizationId);
  }

  // ============ DICTIONARY ITEM ENDPOINTS ============

  @Get(':dictionaryId/items')
  @ApiOperation({ summary: 'Получить элементы справочника' })
  @ApiParam({ name: 'dictionaryId', description: 'UUID справочника' })
  @ApiResponse({ status: 200, type: [DictionaryItemResponseDto] })
  async findItems(
    @CurrentUser() user: User,
    @Param('dictionaryId', ParseUUIDPipe) dictionaryId: string,
  ) {
    return this.dictionariesService.findItems(dictionaryId, user.organizationId);
  }

  @Post(':dictionaryId/items')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Добавить элемент в справочник' })
  @ApiResponse({ status: 201, type: DictionaryItemResponseDto })
  async createItem(
    @CurrentUser() user: User,
    @Param('dictionaryId', ParseUUIDPipe) dictionaryId: string,
    @Body() dto: CreateDictionaryItemDto,
  ) {
    return this.dictionariesService.createItem(dictionaryId, user.organizationId, dto);
  }

  @Put(':dictionaryId/items/:itemId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Обновить элемент справочника' })
  @ApiResponse({ status: 200, type: DictionaryItemResponseDto })
  async updateItem(
    @CurrentUser() user: User,
    @Param('dictionaryId', ParseUUIDPipe) dictionaryId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateDictionaryItemDto,
  ) {
    return this.dictionariesService.updateItem(dictionaryId, itemId, user.organizationId, dto);
  }

  @Delete(':dictionaryId/items/:itemId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить элемент справочника' })
  @ApiResponse({ status: 204 })
  async removeItem(
    @CurrentUser() user: User,
    @Param('dictionaryId', ParseUUIDPipe) dictionaryId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    await this.dictionariesService.removeItem(dictionaryId, itemId, user.organizationId);
  }

  @Post(':dictionaryId/items/reorder')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Изменить порядок элементов' })
  @ApiResponse({ status: 200, type: [DictionaryItemResponseDto] })
  async reorderItems(
    @CurrentUser() user: User,
    @Param('dictionaryId', ParseUUIDPipe) dictionaryId: string,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.dictionariesService.reorderItems(dictionaryId, user.organizationId, dto);
  }
}
```

## 1.6 Module

**Файл:** `apps/api/src/modules/dictionaries/dictionaries.module.ts`

```typescript
import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dictionary } from './entities/dictionary.entity';
import { DictionaryItem } from './entities/dictionary-item.entity';
import { DictionariesService } from './dictionaries.service';
import { DictionariesController } from './dictionaries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Dictionary, DictionaryItem])],
  controllers: [DictionariesController],
  providers: [DictionariesService],
  exports: [DictionariesService],
})
export class DictionariesModule implements OnModuleInit {
  constructor(private readonly dictionariesService: DictionariesService) {}

  async onModuleInit() {
    // Seed system dictionaries on startup
    await this.dictionariesService.seedSystemDictionaries();
  }
}
```

## 1.7 Migration

**Файл:** `apps/api/src/database/migrations/XXXXXX-CreateDictionaries.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDictionaries1706900000000 implements MigrationInterface {
  name = 'CreateDictionaries1706900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum
    await queryRunner.query(`
      CREATE TYPE "dictionary_type_enum" AS ENUM ('system', 'custom')
    `);

    // Create dictionaries table
    await queryRunner.query(`
      CREATE TABLE "dictionaries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(100) NOT NULL,
        "name" varchar(255) NOT NULL,
        "name_uz" varchar(255),
        "description" text,
        "type" "dictionary_type_enum" NOT NULL DEFAULT 'custom',
        "is_system" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "organization_id" uuid,
        "metadata" jsonb,
        "sort_order" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_dictionaries" PRIMARY KEY ("id")
      )
    `);

    // Create dictionary_items table
    await queryRunner.query(`
      CREATE TABLE "dictionary_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "dictionary_id" uuid NOT NULL,
        "code" varchar(100) NOT NULL,
        "value" varchar(255) NOT NULL,
        "value_uz" varchar(255),
        "description" text,
        "color" varchar(20),
        "icon" varchar(100),
        "is_active" boolean NOT NULL DEFAULT true,
        "is_default" boolean NOT NULL DEFAULT false,
        "sort_order" int NOT NULL DEFAULT 0,
        "parent_id" uuid,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_dictionary_items" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dictionaries_code" ON "dictionaries" ("code") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_dictionaries_org_type" ON "dictionaries" ("organization_id", "type")`);
    await queryRunner.query(`CREATE INDEX "IDX_dictionaries_active" ON "dictionaries" ("is_active")`);
    
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dictionary_items_dict_code" ON "dictionary_items" ("dictionary_id", "code") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_dictionary_items_sort" ON "dictionary_items" ("dictionary_id", "sort_order")`);
    await queryRunner.query(`CREATE INDEX "IDX_dictionary_items_active" ON "dictionary_items" ("is_active")`);
    await queryRunner.query(`CREATE INDEX "IDX_dictionary_items_parent" ON "dictionary_items" ("parent_id")`);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "dictionary_items" 
      ADD CONSTRAINT "FK_dictionary_items_dictionary" 
      FOREIGN KEY ("dictionary_id") REFERENCES "dictionaries"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "dictionary_items" 
      ADD CONSTRAINT "FK_dictionary_items_parent" 
      FOREIGN KEY ("parent_id") REFERENCES "dictionary_items"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dictionary_items" DROP CONSTRAINT "FK_dictionary_items_parent"`);
    await queryRunner.query(`ALTER TABLE "dictionary_items" DROP CONSTRAINT "FK_dictionary_items_dictionary"`);
    await queryRunner.query(`DROP TABLE "dictionary_items"`);
    await queryRunner.query(`DROP TABLE "dictionaries"`);
    await queryRunner.query(`DROP TYPE "dictionary_type_enum"`);
  }
}
```

---

# 📁 Часть 2: Dashboard Widgets (Виджеты дашборда)

## 2.1 Entity: DashboardWidget

**Файл:** `apps/api/src/modules/dashboard/entities/dashboard-widget.entity.ts`

```typescript
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum WidgetType {
  KPI_CARD = 'kpi_card',           // Карточка с одним KPI
  CHART_LINE = 'chart_line',       // Линейный график
  CHART_BAR = 'chart_bar',         // Столбчатая диаграмма
  CHART_PIE = 'chart_pie',         // Круговая диаграмма
  CHART_AREA = 'chart_area',       // Area chart
  TABLE = 'table',                 // Таблица данных
  MAP = 'map',                     // Карта с автоматами
  ALERTS_LIST = 'alerts_list',     // Список алертов
  TASKS_LIST = 'tasks_list',       // Список задач
  LEADERBOARD = 'leaderboard',     // Рейтинг операторов
  HEATMAP = 'heatmap',             // Тепловая карта
  GAUGE = 'gauge',                 // Спидометр/Gauge
  PROGRESS = 'progress',           // Progress bar
  STAT_COMPARISON = 'stat_comparison', // Сравнение периодов
}

export enum WidgetSize {
  SMALL = 'small',     // 1x1
  MEDIUM = 'medium',   // 2x1
  LARGE = 'large',     // 2x2
  WIDE = 'wide',       // 3x1
  TALL = 'tall',       // 1x2
  FULL = 'full',       // 3x2
}

export enum WidgetDataSource {
  SALES = 'sales',
  REVENUE = 'revenue',
  MACHINES = 'machines',
  PRODUCTS = 'products',
  INVENTORY = 'inventory',
  TASKS = 'tasks',
  ALERTS = 'alerts',
  OPERATORS = 'operators',
  CUSTOMERS = 'customers',
  CUSTOM_QUERY = 'custom_query',
}

export interface WidgetConfig {
  // Data configuration
  dataSource: WidgetDataSource;
  metrics?: string[];              // ['total_sales', 'avg_revenue']
  dimensions?: string[];           // ['date', 'machine_id']
  filters?: Record<string, any>;   // { status: 'active', period: '7d' }
  
  // Display configuration
  title?: string;
  titleUz?: string;
  subtitle?: string;
  icon?: string;
  color?: string;
  showLegend?: boolean;
  showLabels?: boolean;
  
  // Chart specific
  chartType?: string;
  xAxis?: string;
  yAxis?: string;
  seriesField?: string;
  
  // Refresh
  refreshInterval?: number;        // seconds, 0 = manual
  
  // Thresholds for KPI
  thresholds?: {
    warning?: number;
    critical?: number;
    target?: number;
  };
  
  // Custom query (for advanced users)
  customQuery?: string;
  
  // Any additional config
  [key: string]: any;
}

@Entity('dashboard_widgets')
@Index(['userId', 'isActive'])
@Index(['organizationId', 'isShared'])
@Index(['gridPosition'])
export class DashboardWidget extends BaseEntity {
  @ApiProperty({ description: 'ID пользователя-владельца' })
  @Column({ type: 'uuid' })
  userId: string;

  @ApiPropertyOptional({ description: 'ID организации' })
  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null;

  @ApiProperty({ description: 'Название виджета', example: 'Продажи за неделю' })
  @Column({ length: 255 })
  name: string;

  @ApiPropertyOptional({ description: 'Название (UZ)' })
  @Column({ length: 255, nullable: true })
  nameUz: string;

  @ApiPropertyOptional({ description: 'Описание виджета' })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ description: 'Тип виджета', enum: WidgetType })
  @Column({ type: 'enum', enum: WidgetType })
  widgetType: WidgetType;

  @ApiProperty({ description: 'Размер виджета', enum: WidgetSize })
  @Column({ type: 'enum', enum: WidgetSize, default: WidgetSize.MEDIUM })
  size: WidgetSize;

  @ApiProperty({ description: 'Конфигурация виджета' })
  @Column({ type: 'jsonb' })
  config: WidgetConfig;

  @ApiProperty({ description: 'Позиция на сетке (x,y,w,h)' })
  @Column({ type: 'jsonb', default: { x: 0, y: 0, w: 2, h: 1 } })
  gridPosition: { x: number; y: number; w: number; h: number };

  @ApiProperty({ description: 'Порядок сортировки' })
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @ApiProperty({ description: 'Виджет активен', default: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Общий виджет (виден всем в организации)', default: false })
  @Column({ default: false })
  isShared: boolean;

  @ApiProperty({ description: 'Виджет по умолчанию (для новых пользователей)', default: false })
  @Column({ default: false })
  isDefault: boolean;

  @ApiPropertyOptional({ description: 'Кэшированные данные' })
  @Column({ type: 'jsonb', nullable: true })
  cachedData: any;

  @ApiPropertyOptional({ description: 'Время последнего обновления данных' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  lastRefreshedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

## 2.2 DTOs

**Файл:** `apps/api/src/modules/dashboard/dto/dashboard-widget.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { WidgetType, WidgetSize, WidgetConfig } from '../entities/dashboard-widget.entity';

// ============ REQUEST DTOs ============

export class GridPositionDto {
  @ApiProperty({ description: 'X позиция', example: 0 })
  @IsInt()
  @Min(0)
  x: number;

  @ApiProperty({ description: 'Y позиция', example: 0 })
  @IsInt()
  @Min(0)
  y: number;

  @ApiProperty({ description: 'Ширина', example: 2 })
  @IsInt()
  @Min(1)
  w: number;

  @ApiProperty({ description: 'Высота', example: 1 })
  @IsInt()
  @Min(1)
  h: number;
}

export class CreateDashboardWidgetDto {
  @ApiProperty({ description: 'Название виджета', example: 'Продажи за неделю' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Название (UZ)' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nameUz?: string;

  @ApiPropertyOptional({ description: 'Описание' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Тип виджета', enum: WidgetType })
  @IsEnum(WidgetType)
  widgetType: WidgetType;

  @ApiPropertyOptional({ description: 'Размер', enum: WidgetSize })
  @IsEnum(WidgetSize)
  @IsOptional()
  size?: WidgetSize;

  @ApiProperty({ description: 'Конфигурация виджета' })
  @IsObject()
  config: WidgetConfig;

  @ApiPropertyOptional({ description: 'Позиция на сетке' })
  @ValidateNested()
  @Type(() => GridPositionDto)
  @IsOptional()
  gridPosition?: GridPositionDto;

  @ApiPropertyOptional({ description: 'Порядок' })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Общий виджет' })
  @IsBoolean()
  @IsOptional()
  isShared?: boolean;
}

export class UpdateDashboardWidgetDto extends PartialType(CreateDashboardWidgetDto) {
  @ApiPropertyOptional({ description: 'Активен' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateWidgetPositionDto {
  @ApiProperty({ description: 'ID виджета' })
  @IsString()
  widgetId: string;

  @ApiProperty({ description: 'Новая позиция' })
  @ValidateNested()
  @Type(() => GridPositionDto)
  gridPosition: GridPositionDto;
}

export class BatchUpdatePositionsDto {
  @ApiProperty({ description: 'Массив обновлений позиций', type: [UpdateWidgetPositionDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateWidgetPositionDto)
  positions: UpdateWidgetPositionDto[];
}

export class WidgetFilterDto {
  @ApiPropertyOptional({ enum: WidgetType })
  @IsEnum(WidgetType)
  @IsOptional()
  widgetType?: WidgetType;

  @ApiPropertyOptional({ description: 'Только активные' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Включая общие' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeShared?: boolean;
}

// ============ RESPONSE DTOs ============

export class DashboardWidgetResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() nameUz?: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty({ enum: WidgetType }) widgetType: WidgetType;
  @ApiProperty({ enum: WidgetSize }) size: WidgetSize;
  @ApiProperty() config: WidgetConfig;
  @ApiProperty() gridPosition: GridPositionDto;
  @ApiProperty() sortOrder: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty() isShared: boolean;
  @ApiPropertyOptional() cachedData?: any;
  @ApiPropertyOptional() lastRefreshedAt?: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class WidgetDataResponseDto {
  @ApiProperty() widgetId: string;
  @ApiProperty() data: any;
  @ApiProperty() generatedAt: Date;
  @ApiPropertyOptional() nextRefreshAt?: Date;
}
```

## 2.3 Service

**Файл:** `apps/api/src/modules/dashboard/services/dashboard-widgets.service.ts`

```typescript
import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DashboardWidget, WidgetType, WidgetDataSource } from '../entities/dashboard-widget.entity';
import {
  CreateDashboardWidgetDto,
  UpdateDashboardWidgetDto,
  BatchUpdatePositionsDto,
  WidgetFilterDto,
} from '../dto/dashboard-widget.dto';

@Injectable()
export class DashboardWidgetsService {
  private readonly logger = new Logger(DashboardWidgetsService.name);

  constructor(
    @InjectRepository(DashboardWidget)
    private readonly widgetRepo: Repository<DashboardWidget>,
  ) {}

  // ============ CRUD ============

  async findAll(userId: string, organizationId: string | null, filter: WidgetFilterDto): Promise<DashboardWidget[]> {
    const qb = this.widgetRepo.createQueryBuilder('w')
      .where('w.deleted_at IS NULL')
      .andWhere('(w.user_id = :userId OR (w.is_shared = true AND w.organization_id = :orgId))', {
        userId,
        orgId: organizationId,
      });

    if (filter.widgetType) {
      qb.andWhere('w.widget_type = :type', { type: filter.widgetType });
    }

    if (filter.isActive !== undefined) {
      qb.andWhere('w.is_active = :isActive', { isActive: filter.isActive });
    }

    qb.orderBy('w.sort_order', 'ASC').addOrderBy('w.created_at', 'ASC');

    return qb.getMany();
  }

  async findOne(id: string, userId: string, organizationId: string | null): Promise<DashboardWidget> {
    const widget = await this.widgetRepo.findOne({
      where: { id, deletedAt: null },
    });

    if (!widget) {
      throw new NotFoundException(`Виджет с ID ${id} не найден`);
    }

    // Check access
    if (widget.userId !== userId && !(widget.isShared && widget.organizationId === organizationId)) {
      throw new ForbiddenException('Нет доступа к этому виджету');
    }

    return widget;
  }

  async create(userId: string, organizationId: string | null, dto: CreateDashboardWidgetDto): Promise<DashboardWidget> {
    const widget = this.widgetRepo.create({
      ...dto,
      userId,
      organizationId,
    });

    await this.widgetRepo.save(widget);
    this.logger.log(`Created widget: ${widget.name} (${widget.id}) for user ${userId}`);

    return widget;
  }

  async update(id: string, userId: string, organizationId: string | null, dto: UpdateDashboardWidgetDto): Promise<DashboardWidget> {
    const widget = await this.findOne(id, userId, organizationId);

    // Only owner can update
    if (widget.userId !== userId) {
      throw new ForbiddenException('Только владелец может редактировать виджет');
    }

    Object.assign(widget, dto);
    await this.widgetRepo.save(widget);

    return widget;
  }

  async remove(id: string, userId: string, organizationId: string | null): Promise<void> {
    const widget = await this.findOne(id, userId, organizationId);

    if (widget.userId !== userId) {
      throw new ForbiddenException('Только владелец может удалить виджет');
    }

    await this.widgetRepo.softDelete(id);
    this.logger.log(`Deleted widget: ${widget.name} (${id})`);
  }

  async batchUpdatePositions(userId: string, dto: BatchUpdatePositionsDto): Promise<DashboardWidget[]> {
    const widgetIds = dto.positions.map(p => p.widgetId);
    
    const widgets = await this.widgetRepo.find({
      where: { id: In(widgetIds), userId, deletedAt: null },
    });

    if (widgets.length !== widgetIds.length) {
      throw new ForbiddenException('Некоторые виджеты не найдены или недоступны');
    }

    for (const pos of dto.positions) {
      const widget = widgets.find(w => w.id === pos.widgetId);
      if (widget) {
        widget.gridPosition = pos.gridPosition;
      }
    }

    await this.widgetRepo.save(widgets);
    return widgets;
  }

  async duplicate(id: string, userId: string, organizationId: string | null): Promise<DashboardWidget> {
    const original = await this.findOne(id, userId, organizationId);

    const duplicate = this.widgetRepo.create({
      ...original,
      id: undefined,
      name: `${original.name} (копия)`,
      nameUz: original.nameUz ? `${original.nameUz} (nusxa)` : undefined,
      userId,
      organizationId,
      isShared: false,
      isDefault: false,
      cachedData: null,
      lastRefreshedAt: null,
      createdAt: undefined,
      updatedAt: undefined,
    });

    await this.widgetRepo.save(duplicate);
    return duplicate;
  }

  // ============ DATA FETCHING ============

  async getWidgetData(id: string, userId: string, organizationId: string | null): Promise<any> {
    const widget = await this.findOne(id, userId, organizationId);
    
    // Check if cache is fresh
    const cacheAge = widget.lastRefreshedAt 
      ? Date.now() - widget.lastRefreshedAt.getTime() 
      : Infinity;
    
    const refreshInterval = (widget.config.refreshInterval || 300) * 1000; // default 5 min
    
    if (widget.cachedData && cacheAge < refreshInterval) {
      return {
        widgetId: widget.id,
        data: widget.cachedData,
        generatedAt: widget.lastRefreshedAt,
        fromCache: true,
      };
    }

    // Fetch fresh data
    const data = await this.fetchDataForWidget(widget, organizationId);
    
    // Update cache
    widget.cachedData = data;
    widget.lastRefreshedAt = new Date();
    await this.widgetRepo.save(widget);

    return {
      widgetId: widget.id,
      data,
      generatedAt: widget.lastRefreshedAt,
      fromCache: false,
    };
  }

  private async fetchDataForWidget(widget: DashboardWidget, organizationId: string | null): Promise<any> {
    const { dataSource, metrics, filters } = widget.config;

    // This is a placeholder - implement actual data fetching based on dataSource
    switch (dataSource) {
      case WidgetDataSource.SALES:
        return this.fetchSalesData(organizationId, metrics, filters);
      case WidgetDataSource.REVENUE:
        return this.fetchRevenueData(organizationId, metrics, filters);
      case WidgetDataSource.MACHINES:
        return this.fetchMachinesData(organizationId, metrics, filters);
      case WidgetDataSource.ALERTS:
        return this.fetchAlertsData(organizationId, metrics, filters);
      case WidgetDataSource.TASKS:
        return this.fetchTasksData(organizationId, metrics, filters);
      case WidgetDataSource.OPERATORS:
        return this.fetchOperatorsData(organizationId, metrics, filters);
      default:
        return { message: 'Data source not implemented' };
    }
  }

  // Placeholder data fetchers - implement with actual queries
  private async fetchSalesData(orgId: string | null, metrics: string[], filters: any): Promise<any> {
    // TODO: Implement actual sales data fetching
    return {
      total: 1250000,
      change: 12.5,
      period: filters?.period || '7d',
      chartData: [],
    };
  }

  private async fetchRevenueData(orgId: string | null, metrics: string[], filters: any): Promise<any> {
    return { total: 8500000, change: 8.3 };
  }

  private async fetchMachinesData(orgId: string | null, metrics: string[], filters: any): Promise<any> {
    return { total: 45, active: 42, offline: 3 };
  }

  private async fetchAlertsData(orgId: string | null, metrics: string[], filters: any): Promise<any> {
    return { total: 12, critical: 2, warning: 10 };
  }

  private async fetchTasksData(orgId: string | null, metrics: string[], filters: any): Promise<any> {
    return { total: 28, pending: 15, completed: 13 };
  }

  private async fetchOperatorsData(orgId: string | null, metrics: string[], filters: any): Promise<any> {
    return { total: 8, topPerformer: 'Иван Петров', avgRating: 4.5 };
  }

  // ============ DEFAULT WIDGETS ============

  async createDefaultWidgets(userId: string, organizationId: string | null): Promise<DashboardWidget[]> {
    const defaultWidgets: Partial<DashboardWidget>[] = [
      {
        name: 'Продажи сегодня',
        nameUz: 'Bugungi sotuvlar',
        widgetType: WidgetType.KPI_CARD,
        size: 'small' as any,
        config: {
          dataSource: WidgetDataSource.SALES,
          metrics: ['total_sales'],
          filters: { period: 'today' },
          icon: 'shopping-cart',
          color: '#4CAF50',
        },
        gridPosition: { x: 0, y: 0, w: 1, h: 1 },
        sortOrder: 0,
      },
      {
        name: 'Выручка за неделю',
        nameUz: 'Haftalik daromad',
        widgetType: WidgetType.CHART_LINE,
        size: 'large' as any,
        config: {
          dataSource: WidgetDataSource.REVENUE,
          metrics: ['daily_revenue'],
          filters: { period: '7d' },
          showLegend: true,
        },
        gridPosition: { x: 1, y: 0, w: 2, h: 2 },
        sortOrder: 1,
      },
      {
        name: 'Статус автоматов',
        nameUz: 'Avtomatlar holati',
        widgetType: WidgetType.CHART_PIE,
        size: 'medium' as any,
        config: {
          dataSource: WidgetDataSource.MACHINES,
          metrics: ['status_distribution'],
        },
        gridPosition: { x: 0, y: 1, w: 1, h: 1 },
        sortOrder: 2,
      },
      {
        name: 'Активные алерты',
        nameUz: 'Faol ogohlantirishlar',
        widgetType: WidgetType.ALERTS_LIST,
        size: 'medium' as any,
        config: {
          dataSource: WidgetDataSource.ALERTS,
          filters: { status: 'active' },
        },
        gridPosition: { x: 0, y: 2, w: 2, h: 1 },
        sortOrder: 3,
      },
    ];

    const widgets = defaultWidgets.map(w => this.widgetRepo.create({
      ...w,
      userId,
      organizationId,
      isDefault: true,
    }));

    await this.widgetRepo.save(widgets);
    this.logger.log(`Created ${widgets.length} default widgets for user ${userId}`);

    return widgets;
  }

  // ============ CRON ============

  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshActiveWidgets(): Promise<void> {
    // Find widgets that need refresh
    const widgets = await this.widgetRepo
      .createQueryBuilder('w')
      .where('w.is_active = true')
      .andWhere('w.deleted_at IS NULL')
      .andWhere("w.config->>'refreshInterval' IS NOT NULL")
      .andWhere("(w.config->>'refreshInterval')::int > 0")
      .andWhere(`
        w.last_refreshed_at IS NULL 
        OR w.last_refreshed_at < NOW() - ((w.config->>'refreshInterval')::int || ' seconds')::interval
      `)
      .limit(100)
      .getMany();

    for (const widget of widgets) {
      try {
        const data = await this.fetchDataForWidget(widget, widget.organizationId);
        widget.cachedData = data;
        widget.lastRefreshedAt = new Date();
        await this.widgetRepo.save(widget);
      } catch (error) {
        this.logger.error(`Failed to refresh widget ${widget.id}: ${error.message}`);
      }
    }

    if (widgets.length > 0) {
      this.logger.log(`Refreshed ${widgets.length} widgets`);
    }
  }
}
```

## 2.4 Controller

**Файл:** `apps/api/src/modules/dashboard/controllers/dashboard-widgets.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { DashboardWidgetsService } from '../services/dashboard-widgets.service';
import {
  CreateDashboardWidgetDto,
  UpdateDashboardWidgetDto,
  BatchUpdatePositionsDto,
  WidgetFilterDto,
  DashboardWidgetResponseDto,
  WidgetDataResponseDto,
} from '../dto/dashboard-widget.dto';

@ApiTags('Dashboard Widgets')
@ApiBearerAuth()
@Controller('dashboard/widgets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardWidgetsController {
  constructor(private readonly widgetsService: DashboardWidgetsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить виджеты пользователя' })
  @ApiResponse({ status: 200, type: [DashboardWidgetResponseDto] })
  async findAll(
    @CurrentUser() user: User,
    @Query() filter: WidgetFilterDto,
  ) {
    return this.widgetsService.findAll(user.id, user.organizationId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить виджет по ID' })
  @ApiResponse({ status: 200, type: DashboardWidgetResponseDto })
  async findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.widgetsService.findOne(id, user.id, user.organizationId);
  }

  @Get(':id/data')
  @ApiOperation({ summary: 'Получить данные виджета' })
  @ApiResponse({ status: 200, type: WidgetDataResponseDto })
  async getWidgetData(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.widgetsService.getWidgetData(id, user.id, user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать виджет' })
  @ApiResponse({ status: 201, type: DashboardWidgetResponseDto })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateDashboardWidgetDto,
  ) {
    return this.widgetsService.create(user.id, user.organizationId, dto);
  }

  @Post('defaults')
  @ApiOperation({ summary: 'Создать виджеты по умолчанию' })
  @ApiResponse({ status: 201, type: [DashboardWidgetResponseDto] })
  async createDefaults(@CurrentUser() user: User) {
    return this.widgetsService.createDefaultWidgets(user.id, user.organizationId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Дублировать виджет' })
  @ApiResponse({ status: 201, type: DashboardWidgetResponseDto })
  async duplicate(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.widgetsService.duplicate(id, user.id, user.organizationId);
  }

  @Put('positions')
  @ApiOperation({ summary: 'Массовое обновление позиций виджетов' })
  @ApiResponse({ status: 200, type: [DashboardWidgetResponseDto] })
  async batchUpdatePositions(
    @CurrentUser() user: User,
    @Body() dto: BatchUpdatePositionsDto,
  ) {
    return this.widgetsService.batchUpdatePositions(user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить виджет' })
  @ApiResponse({ status: 200, type: DashboardWidgetResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDashboardWidgetDto,
  ) {
    return this.widgetsService.update(id, user.id, user.organizationId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить виджет' })
  @ApiResponse({ status: 204 })
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.widgetsService.remove(id, user.id, user.organizationId);
  }
}
```

## 2.5 Migration

**Файл:** `apps/api/src/database/migrations/XXXXXX-CreateDashboardWidgets.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDashboardWidgets1706900100000 implements MigrationInterface {
  name = 'CreateDashboardWidgets1706900100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "widget_type_enum" AS ENUM (
        'kpi_card', 'chart_line', 'chart_bar', 'chart_pie', 'chart_area',
        'table', 'map', 'alerts_list', 'tasks_list', 'leaderboard',
        'heatmap', 'gauge', 'progress', 'stat_comparison'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "widget_size_enum" AS ENUM ('small', 'medium', 'large', 'wide', 'tall', 'full')
    `);

    // Create table
    await queryRunner.query(`
      CREATE TABLE "dashboard_widgets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid,
        "name" varchar(255) NOT NULL,
        "name_uz" varchar(255),
        "description" text,
        "widget_type" "widget_type_enum" NOT NULL,
        "size" "widget_size_enum" NOT NULL DEFAULT 'medium',
        "config" jsonb NOT NULL,
        "grid_position" jsonb NOT NULL DEFAULT '{"x": 0, "y": 0, "w": 2, "h": 1}',
        "sort_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_shared" boolean NOT NULL DEFAULT false,
        "is_default" boolean NOT NULL DEFAULT false,
        "cached_data" jsonb,
        "last_refreshed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_dashboard_widgets" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_dashboard_widgets_user_active" ON "dashboard_widgets" ("user_id", "is_active")`);
    await queryRunner.query(`CREATE INDEX "IDX_dashboard_widgets_org_shared" ON "dashboard_widgets" ("organization_id", "is_shared")`);
    await queryRunner.query(`CREATE INDEX "IDX_dashboard_widgets_grid" ON "dashboard_widgets" USING GIN ("grid_position")`);

    // Add foreign key
    await queryRunner.query(`
      ALTER TABLE "dashboard_widgets" 
      ADD CONSTRAINT "FK_dashboard_widgets_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dashboard_widgets" DROP CONSTRAINT "FK_dashboard_widgets_user"`);
    await queryRunner.query(`DROP TABLE "dashboard_widgets"`);
    await queryRunner.query(`DROP TYPE "widget_size_enum"`);
    await queryRunner.query(`DROP TYPE "widget_type_enum"`);
  }
}
```

---

# 📁 Часть 3: Custom Reports (Конструктор отчётов)

## 3.1 Entity: CustomReport

**Файл:** `apps/api/src/modules/reports/entities/custom-report.entity.ts`

```typescript
import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { ReportExecution } from './report-execution.entity';

export enum ReportType {
  SALES = 'sales',
  REVENUE = 'revenue',
  INVENTORY = 'inventory',
  MACHINES = 'machines',
  OPERATORS = 'operators',
  PRODUCTS = 'products',
  TASKS = 'tasks',
  ALERTS = 'alerts',
  FINANCIAL = 'financial',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  TABLE = 'table',
  CHART = 'chart',
  PIVOT = 'pivot',
  SUMMARY = 'summary',
}

export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
}

export interface ReportColumn {
  field: string;
  label: string;
  labelUz?: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percent';
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  format?: string;       // Date format, number format
  visible?: boolean;
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between' | 'isNull' | 'isNotNull';
  value: any;
  label?: string;
}

export interface ReportConfig {
  // Data source
  dataSource: string;              // Table or view name
  baseQuery?: string;              // Custom SQL (for advanced)
  
  // Columns
  columns: ReportColumn[];
  
  // Filters (default)
  defaultFilters?: ReportFilter[];
  
  // Grouping
  groupBy?: string[];
  
  // Sorting
  orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
  
  // Pagination
  pageSize?: number;
  
  // Chart config (if format = chart)
  chartConfig?: {
    type: 'line' | 'bar' | 'pie' | 'area';
    xAxis: string;
    yAxis: string[];
    seriesField?: string;
  };
  
  // Pivot config (if format = pivot)
  pivotConfig?: {
    rows: string[];
    columns: string[];
    values: { field: string; aggregation: string }[];
  };
}

export interface ScheduleConfig {
  enabled: boolean;
  cron: string;                    // Cron expression
  timezone: string;                // e.g., 'Asia/Tashkent'
  exportFormat: ExportFormat;
  recipients: string[];            // Email addresses
  lastRunAt?: Date;
  nextRunAt?: Date;
}

@Entity('custom_reports')
@Index(['organizationId', 'isActive'])
@Index(['userId'])
@Index(['reportType'])
@Index(['isShared'])
export class CustomReport extends BaseEntity {
  @ApiProperty({ description: 'ID владельца' })
  @Column({ type: 'uuid' })
  userId: string;

  @ApiPropertyOptional({ description: 'ID организации' })
  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null;

  @ApiProperty({ description: 'Название отчёта', example: 'Продажи по автоматам' })
  @Column({ length: 255 })
  name: string;

  @ApiPropertyOptional({ description: 'Название (UZ)' })
  @Column({ length: 255, nullable: true })
  nameUz: string;

  @ApiPropertyOptional({ description: 'Описание отчёта' })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ description: 'Тип отчёта', enum: ReportType })
  @Column({ type: 'enum', enum: ReportType })
  reportType: ReportType;

  @ApiProperty({ description: 'Формат отчёта', enum: ReportFormat })
  @Column({ type: 'enum', enum: ReportFormat, default: ReportFormat.TABLE })
  format: ReportFormat;

  @ApiProperty({ description: 'Конфигурация отчёта' })
  @Column({ type: 'jsonb' })
  config: ReportConfig;

  @ApiPropertyOptional({ description: 'Конфигурация расписания' })
  @Column({ type: 'jsonb', nullable: true })
  schedule: ScheduleConfig | null;

  @ApiProperty({ description: 'Активен', default: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Общий отчёт', default: false })
  @Column({ default: false })
  isShared: boolean;

  @ApiProperty({ description: 'Избранный', default: false })
  @Column({ default: false })
  isFavorite: boolean;

  @ApiPropertyOptional({ description: 'Теги для группировки' })
  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @ApiPropertyOptional({ description: 'Последние использованные фильтры' })
  @Column({ type: 'jsonb', nullable: true })
  lastFilters: ReportFilter[];

  @ApiProperty({ description: 'Количество выполнений' })
  @Column({ type: 'int', default: 0 })
  executionCount: number;

  @ApiPropertyOptional({ description: 'Последнее выполнение' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  lastExecutedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => ReportExecution, (exec) => exec.report)
  executions: ReportExecution[];
}
```

## 3.2 Entity: ReportExecution

**Файл:** `apps/api/src/modules/reports/entities/report-execution.entity.ts`

```typescript
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomReport, ExportFormat, ReportFilter } from './custom-report.entity';
import { User } from '../../users/entities/user.entity';

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('report_executions')
@Index(['reportId', 'status'])
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
export class ReportExecution extends BaseEntity {
  @ApiProperty({ description: 'ID отчёта' })
  @Column({ type: 'uuid' })
  reportId: string;

  @ApiProperty({ description: 'ID пользователя' })
  @Column({ type: 'uuid' })
  userId: string;

  @ApiProperty({ description: 'Статус выполнения', enum: ExecutionStatus })
  @Column({ type: 'enum', enum: ExecutionStatus, default: ExecutionStatus.PENDING })
  status: ExecutionStatus;

  @ApiPropertyOptional({ description: 'Применённые фильтры' })
  @Column({ type: 'jsonb', nullable: true })
  filters: ReportFilter[];

  @ApiPropertyOptional({ description: 'Параметры выполнения' })
  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, any>;

  @ApiPropertyOptional({ description: 'Формат экспорта' })
  @Column({ type: 'enum', enum: ExportFormat, nullable: true })
  exportFormat: ExportFormat;

  @ApiPropertyOptional({ description: 'Время начала' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Время завершения' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date;

  @ApiPropertyOptional({ description: 'Длительность (мс)' })
  @Column({ type: 'int', nullable: true })
  durationMs: number;

  @ApiPropertyOptional({ description: 'Количество строк' })
  @Column({ type: 'int', nullable: true })
  rowCount: number;

  @ApiPropertyOptional({ description: 'Путь к файлу результата' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  resultFilePath: string;

  @ApiPropertyOptional({ description: 'URL для скачивания' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  downloadUrl: string;

  @ApiPropertyOptional({ description: 'Сообщение об ошибке' })
  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @ApiPropertyOptional({ description: 'Результат (для небольших отчётов)' })
  @Column({ type: 'jsonb', nullable: true })
  resultData: any;

  @ApiProperty({ description: 'Запланированное выполнение', default: false })
  @Column({ default: false })
  isScheduled: boolean;

  // Relations
  @ManyToOne(() => CustomReport, (report) => report.executions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report: CustomReport;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Computed
  get isCompleted(): boolean {
    return this.status === ExecutionStatus.COMPLETED;
  }

  get isFailed(): boolean {
    return this.status === ExecutionStatus.FAILED;
  }
}
```

## 3.3 DTOs

**Файл:** `apps/api/src/modules/reports/dto/custom-report.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  IsArray,
  MaxLength,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  ReportType,
  ReportFormat,
  ExportFormat,
  ReportConfig,
  ScheduleConfig,
  ReportFilter,
} from '../entities/custom-report.entity';

// ============ REPORT DTOs ============

export class CreateCustomReportDto {
  @ApiProperty({ description: 'Название', example: 'Ежедневные продажи' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Название (UZ)' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nameUz?: string;

  @ApiPropertyOptional({ description: 'Описание' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Тип отчёта', enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiPropertyOptional({ description: 'Формат', enum: ReportFormat })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;

  @ApiProperty({ description: 'Конфигурация отчёта' })
  @IsObject()
  config: ReportConfig;

  @ApiPropertyOptional({ description: 'Расписание' })
  @IsObject()
  @IsOptional()
  schedule?: ScheduleConfig;

  @ApiPropertyOptional({ description: 'Теги' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Общий отчёт' })
  @IsBoolean()
  @IsOptional()
  isShared?: boolean;
}

export class UpdateCustomReportDto extends PartialType(CreateCustomReportDto) {
  @ApiPropertyOptional({ description: 'Активен' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Избранный' })
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;
}

export class ReportFilterDto {
  @ApiPropertyOptional({ description: 'Поиск по названию' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ReportType })
  @IsEnum(ReportType)
  @IsOptional()
  reportType?: ReportType;

  @ApiPropertyOptional({ description: 'Только избранные' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isFavorite?: boolean;

  @ApiPropertyOptional({ description: 'Тег' })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiPropertyOptional({ description: 'Включая общие' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeShared?: boolean;
}

// ============ EXECUTION DTOs ============

export class ExecuteReportDto {
  @ApiPropertyOptional({ description: 'Фильтры', type: 'array' })
  @IsArray()
  @IsOptional()
  filters?: ReportFilter[];

  @ApiPropertyOptional({ description: 'Параметры' })
  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Формат экспорта', enum: ExportFormat })
  @IsEnum(ExportFormat)
  @IsOptional()
  exportFormat?: ExportFormat;

  @ApiPropertyOptional({ description: 'Асинхронное выполнение' })
  @IsBoolean()
  @IsOptional()
  async?: boolean;
}

export class ReportExecutionFilterDto {
  @ApiPropertyOptional({ description: 'ID отчёта' })
  @IsUUID()
  @IsOptional()
  reportId?: string;

  @ApiPropertyOptional({ description: 'Статус' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Лимит' })
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  limit?: number;
}

// ============ RESPONSE DTOs ============

export class CustomReportResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() nameUz?: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty({ enum: ReportType }) reportType: ReportType;
  @ApiProperty({ enum: ReportFormat }) format: ReportFormat;
  @ApiProperty() config: ReportConfig;
  @ApiPropertyOptional() schedule?: ScheduleConfig;
  @ApiProperty() isActive: boolean;
  @ApiProperty() isShared: boolean;
  @ApiProperty() isFavorite: boolean;
  @ApiProperty() tags: string[];
  @ApiProperty() executionCount: number;
  @ApiPropertyOptional() lastExecutedAt?: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ReportExecutionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() reportId: string;
  @ApiProperty() status: string;
  @ApiPropertyOptional() filters?: ReportFilter[];
  @ApiPropertyOptional() exportFormat?: ExportFormat;
  @ApiPropertyOptional() startedAt?: Date;
  @ApiPropertyOptional() completedAt?: Date;
  @ApiPropertyOptional() durationMs?: number;
  @ApiPropertyOptional() rowCount?: number;
  @ApiPropertyOptional() downloadUrl?: string;
  @ApiPropertyOptional() errorMessage?: string;
  @ApiProperty() createdAt: Date;
}

export class ReportDataResponseDto {
  @ApiProperty() columns: any[];
  @ApiProperty() data: any[];
  @ApiProperty() totalCount: number;
  @ApiPropertyOptional() summary?: Record<string, any>;
  @ApiProperty() generatedAt: Date;
}
```

## 3.4 Service

**Файл:** `apps/api/src/modules/reports/services/custom-reports.service.ts`

```typescript
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CustomReport, ReportType, ExportFormat, ReportFilter } from '../entities/custom-report.entity';
import { ReportExecution, ExecutionStatus } from '../entities/report-execution.entity';
import {
  CreateCustomReportDto,
  UpdateCustomReportDto,
  ReportFilterDto,
  ExecuteReportDto,
} from '../dto/custom-report.dto';

@Injectable()
export class CustomReportsService {
  private readonly logger = new Logger(CustomReportsService.name);

  constructor(
    @InjectRepository(CustomReport)
    private readonly reportRepo: Repository<CustomReport>,
    @InjectRepository(ReportExecution)
    private readonly executionRepo: Repository<ReportExecution>,
    private readonly dataSource: DataSource,
    @InjectQueue('reports')
    private readonly reportsQueue: Queue,
  ) {}

  // ============ CRUD ============

  async findAll(userId: string, organizationId: string | null, filter: ReportFilterDto): Promise<CustomReport[]> {
    const qb = this.reportRepo.createQueryBuilder('r')
      .where('r.deleted_at IS NULL')
      .andWhere('(r.user_id = :userId OR (r.is_shared = true AND r.organization_id = :orgId))', {
        userId,
        orgId: organizationId,
      });

    if (filter.search) {
      qb.andWhere('(r.name ILIKE :search OR r.description ILIKE :search)', {
        search: `%${filter.search}%`,
      });
    }

    if (filter.reportType) {
      qb.andWhere('r.report_type = :type', { type: filter.reportType });
    }

    if (filter.isFavorite) {
      qb.andWhere('r.is_favorite = true');
    }

    if (filter.tag) {
      qb.andWhere(':tag = ANY(r.tags)', { tag: filter.tag });
    }

    qb.orderBy('r.is_favorite', 'DESC')
      .addOrderBy('r.last_executed_at', 'DESC', 'NULLS LAST')
      .addOrderBy('r.name', 'ASC');

    return qb.getMany();
  }

  async findOne(id: string, userId: string, organizationId: string | null): Promise<CustomReport> {
    const report = await this.reportRepo.findOne({
      where: { id, deletedAt: null },
    });

    if (!report) {
      throw new NotFoundException(`Отчёт с ID ${id} не найден`);
    }

    if (report.userId !== userId && !(report.isShared && report.organizationId === organizationId)) {
      throw new ForbiddenException('Нет доступа к этому отчёту');
    }

    return report;
  }

  async create(userId: string, organizationId: string | null, dto: CreateCustomReportDto): Promise<CustomReport> {
    const report = this.reportRepo.create({
      ...dto,
      userId,
      organizationId,
    });

    await this.reportRepo.save(report);
    this.logger.log(`Created report: ${report.name} (${report.id})`);

    return report;
  }

  async update(id: string, userId: string, organizationId: string | null, dto: UpdateCustomReportDto): Promise<CustomReport> {
    const report = await this.findOne(id, userId, organizationId);

    if (report.userId !== userId) {
      throw new ForbiddenException('Только владелец может редактировать отчёт');
    }

    Object.assign(report, dto);
    await this.reportRepo.save(report);

    return report;
  }

  async remove(id: string, userId: string, organizationId: string | null): Promise<void> {
    const report = await this.findOne(id, userId, organizationId);

    if (report.userId !== userId) {
      throw new ForbiddenException('Только владелец может удалить отчёт');
    }

    await this.reportRepo.softDelete(id);
    this.logger.log(`Deleted report: ${report.name} (${id})`);
  }

  async duplicate(id: string, userId: string, organizationId: string | null): Promise<CustomReport> {
    const original = await this.findOne(id, userId, organizationId);

    const duplicate = this.reportRepo.create({
      ...original,
      id: undefined,
      name: `${original.name} (копия)`,
      nameUz: original.nameUz ? `${original.nameUz} (nusxa)` : undefined,
      userId,
      organizationId,
      isShared: false,
      isFavorite: false,
      schedule: null,
      executionCount: 0,
      lastExecutedAt: null,
      lastFilters: null,
      createdAt: undefined,
      updatedAt: undefined,
    });

    await this.reportRepo.save(duplicate);
    return duplicate;
  }

  // ============ EXECUTION ============

  async execute(
    reportId: string,
    userId: string,
    organizationId: string | null,
    dto: ExecuteReportDto,
  ): Promise<ReportExecution | any> {
    const report = await this.findOne(reportId, userId, organizationId);

    // Create execution record
    const execution = this.executionRepo.create({
      reportId,
      userId,
      filters: dto.filters || report.lastFilters,
      parameters: dto.parameters,
      exportFormat: dto.exportFormat,
      status: ExecutionStatus.PENDING,
    });

    await this.executionRepo.save(execution);

    // Update report stats
    report.executionCount += 1;
    report.lastExecutedAt = new Date();
    if (dto.filters) {
      report.lastFilters = dto.filters;
    }
    await this.reportRepo.save(report);

    // Async execution via queue
    if (dto.async || dto.exportFormat) {
      await this.reportsQueue.add('execute', {
        executionId: execution.id,
        reportId,
        organizationId,
      });

      return execution;
    }

    // Sync execution for small reports
    try {
      const result = await this.executeReport(report, execution);
      return result;
    } catch (error) {
      execution.status = ExecutionStatus.FAILED;
      execution.errorMessage = error.message;
      execution.completedAt = new Date();
      await this.executionRepo.save(execution);
      throw error;
    }
  }

  async executeReport(report: CustomReport, execution: ReportExecution): Promise<any> {
    execution.status = ExecutionStatus.RUNNING;
    execution.startedAt = new Date();
    await this.executionRepo.save(execution);

    const startTime = Date.now();

    try {
      // Build and execute query
      const data = await this.buildAndExecuteQuery(report, execution.filters);

      execution.status = ExecutionStatus.COMPLETED;
      execution.completedAt = new Date();
      execution.durationMs = Date.now() - startTime;
      execution.rowCount = data.length;
      execution.resultData = data.slice(0, 1000); // Store first 1000 rows

      await this.executionRepo.save(execution);

      return {
        executionId: execution.id,
        columns: report.config.columns,
        data,
        totalCount: data.length,
        generatedAt: execution.completedAt,
      };
    } catch (error) {
      execution.status = ExecutionStatus.FAILED;
      execution.errorMessage = error.message;
      execution.completedAt = new Date();
      execution.durationMs = Date.now() - startTime;
      await this.executionRepo.save(execution);
      throw error;
    }
  }

  private async buildAndExecuteQuery(report: CustomReport, filters?: ReportFilter[]): Promise<any[]> {
    const { config } = report;
    
    // Get data source table/view
    const dataSourceMap: Record<string, string> = {
      sales: 'sales',
      revenue: 'sales',
      inventory: 'inventory_items',
      machines: 'machines',
      operators: 'users',
      products: 'products',
      tasks: 'tasks',
      alerts: 'alerts',
    };

    const tableName = dataSourceMap[config.dataSource] || config.dataSource;
    
    // Build query
    const columns = config.columns
      .filter(c => c.visible !== false)
      .map(c => `"${c.field}"`)
      .join(', ');

    let query = `SELECT ${columns} FROM "${tableName}" WHERE deleted_at IS NULL`;

    // Apply filters
    const allFilters = [...(config.defaultFilters || []), ...(filters || [])];
    const params: any[] = [];

    for (const filter of allFilters) {
      const paramIndex = params.length + 1;
      
      switch (filter.operator) {
        case 'eq':
          query += ` AND "${filter.field}" = $${paramIndex}`;
          params.push(filter.value);
          break;
        case 'neq':
          query += ` AND "${filter.field}" != $${paramIndex}`;
          params.push(filter.value);
          break;
        case 'gt':
          query += ` AND "${filter.field}" > $${paramIndex}`;
          params.push(filter.value);
          break;
        case 'gte':
          query += ` AND "${filter.field}" >= $${paramIndex}`;
          params.push(filter.value);
          break;
        case 'lt':
          query += ` AND "${filter.field}" < $${paramIndex}`;
          params.push(filter.value);
          break;
        case 'lte':
          query += ` AND "${filter.field}" <= $${paramIndex}`;
          params.push(filter.value);
          break;
        case 'like':
          query += ` AND "${filter.field}" ILIKE $${paramIndex}`;
          params.push(`%${filter.value}%`);
          break;
        case 'in':
          query += ` AND "${filter.field}" = ANY($${paramIndex})`;
          params.push(filter.value);
          break;
        case 'isNull':
          query += ` AND "${filter.field}" IS NULL`;
          break;
        case 'isNotNull':
          query += ` AND "${filter.field}" IS NOT NULL`;
          break;
      }
    }

    // Apply grouping
    if (config.groupBy?.length) {
      query += ` GROUP BY ${config.groupBy.map(g => `"${g}"`).join(', ')}`;
    }

    // Apply ordering
    if (config.orderBy?.length) {
      const orderClauses = config.orderBy.map(o => `"${o.field}" ${o.direction}`);
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // Apply limit
    if (config.pageSize) {
      query += ` LIMIT ${config.pageSize}`;
    }

    const result = await this.dataSource.query(query, params);
    return result;
  }

  // ============ EXECUTIONS HISTORY ============

  async getExecutions(userId: string, filter: any): Promise<ReportExecution[]> {
    const qb = this.executionRepo.createQueryBuilder('e')
      .leftJoinAndSelect('e.report', 'report')
      .where('e.user_id = :userId', { userId })
      .andWhere('e.deleted_at IS NULL');

    if (filter.reportId) {
      qb.andWhere('e.report_id = :reportId', { reportId: filter.reportId });
    }

    if (filter.status) {
      qb.andWhere('e.status = :status', { status: filter.status });
    }

    qb.orderBy('e.created_at', 'DESC')
      .limit(filter.limit || 50);

    return qb.getMany();
  }

  async getExecution(executionId: string, userId: string): Promise<ReportExecution> {
    const execution = await this.executionRepo.findOne({
      where: { id: executionId },
      relations: ['report'],
    });

    if (!execution) {
      throw new NotFoundException(`Выполнение отчёта с ID ${executionId} не найдено`);
    }

    if (execution.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому выполнению');
    }

    return execution;
  }

  // ============ SCHEDULED REPORTS ============

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledReports(): Promise<void> {
    const reports = await this.reportRepo
      .createQueryBuilder('r')
      .where('r.deleted_at IS NULL')
      .andWhere('r.is_active = true')
      .andWhere("r.schedule->>'enabled' = 'true'")
      .andWhere(`
        r.schedule->>'nextRunAt' IS NULL 
        OR (r.schedule->>'nextRunAt')::timestamp <= NOW()
      `)
      .limit(10)
      .getMany();

    for (const report of reports) {
      try {
        // Create scheduled execution
        const execution = this.executionRepo.create({
          reportId: report.id,
          userId: report.userId,
          exportFormat: report.schedule?.exportFormat || ExportFormat.EXCEL,
          isScheduled: true,
          status: ExecutionStatus.PENDING,
        });

        await this.executionRepo.save(execution);

        // Add to queue
        await this.reportsQueue.add('execute-scheduled', {
          executionId: execution.id,
          reportId: report.id,
          recipients: report.schedule?.recipients,
        });

        // Update next run time
        report.schedule.lastRunAt = new Date();
        report.schedule.nextRunAt = this.calculateNextRun(report.schedule.cron);
        await this.reportRepo.save(report);

        this.logger.log(`Scheduled report ${report.name} for execution`);
      } catch (error) {
        this.logger.error(`Failed to schedule report ${report.id}: ${error.message}`);
      }
    }
  }

  private calculateNextRun(cron: string): Date {
    // Simple implementation - in production use a cron parser library
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now;
  }

  // ============ TEMPLATES ============

  async getReportTemplates(): Promise<Partial<CustomReport>[]> {
    return [
      {
        name: 'Ежедневный отчёт по продажам',
        nameUz: 'Kunlik sotuvlar hisoboti',
        reportType: ReportType.SALES,
        format: 'table' as any,
        config: {
          dataSource: 'sales',
          columns: [
            { field: 'date', label: 'Дата', labelUz: 'Sana', type: 'date', sortable: true },
            { field: 'machine_name', label: 'Автомат', labelUz: 'Avtomat', type: 'string', sortable: true },
            { field: 'product_name', label: 'Продукт', labelUz: 'Mahsulot', type: 'string' },
            { field: 'quantity', label: 'Количество', labelUz: 'Miqdor', type: 'number', aggregation: 'sum' },
            { field: 'amount', label: 'Сумма', labelUz: 'Summa', type: 'currency', aggregation: 'sum' },
          ],
          defaultFilters: [
            { field: 'date', operator: 'gte', value: 'today' },
          ],
          orderBy: [{ field: 'date', direction: 'DESC' }],
        },
      },
      {
        name: 'Остатки на складе',
        nameUz: 'Ombor qoldiqlari',
        reportType: ReportType.INVENTORY,
        format: 'table' as any,
        config: {
          dataSource: 'inventory_items',
          columns: [
            { field: 'product_name', label: 'Продукт', labelUz: 'Mahsulot', type: 'string', sortable: true },
            { field: 'sku', label: 'Артикул', labelUz: 'Artikul', type: 'string' },
            { field: 'quantity', label: 'Остаток', labelUz: 'Qoldiq', type: 'number', sortable: true },
            { field: 'min_quantity', label: 'Минимум', labelUz: 'Minimum', type: 'number' },
            { field: 'warehouse_name', label: 'Склад', labelUz: 'Ombor', type: 'string' },
          ],
          orderBy: [{ field: 'quantity', direction: 'ASC' }],
        },
      },
      {
        name: 'Рейтинг операторов',
        nameUz: 'Operatorlar reytingi',
        reportType: ReportType.OPERATORS,
        format: 'table' as any,
        config: {
          dataSource: 'operator_ratings',
          columns: [
            { field: 'operator_name', label: 'Оператор', labelUz: 'Operator', type: 'string', sortable: true },
            { field: 'overall_score', label: 'Общий рейтинг', labelUz: 'Umumiy reyting', type: 'number', sortable: true },
            { field: 'tasks_completed', label: 'Задач выполнено', labelUz: 'Vazifalar bajarildi', type: 'number' },
            { field: 'avg_completion_time', label: 'Среднее время', labelUz: "O'rtacha vaqt", type: 'number' },
            { field: 'grade', label: 'Грейд', labelUz: 'Daraja', type: 'string' },
          ],
          orderBy: [{ field: 'overall_score', direction: 'DESC' }],
        },
      },
    ];
  }
}
```

## 3.5 Controller

**Файл:** `apps/api/src/modules/reports/controllers/custom-reports.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { CustomReportsService } from '../services/custom-reports.service';
import {
  CreateCustomReportDto,
  UpdateCustomReportDto,
  ReportFilterDto,
  ExecuteReportDto,
  ReportExecutionFilterDto,
  CustomReportResponseDto,
  ReportExecutionResponseDto,
  ReportDataResponseDto,
} from '../dto/custom-report.dto';

@ApiTags('Custom Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomReportsController {
  constructor(private readonly reportsService: CustomReportsService) {}

  // ============ REPORTS ============

  @Get()
  @ApiOperation({ summary: 'Получить список отчётов' })
  @ApiResponse({ status: 200, type: [CustomReportResponseDto] })
  async findAll(
    @CurrentUser() user: User,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.findAll(user.id, user.organizationId, filter);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Получить шаблоны отчётов' })
  async getTemplates() {
    return this.reportsService.getReportTemplates();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить отчёт по ID' })
  @ApiResponse({ status: 200, type: CustomReportResponseDto })
  async findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportsService.findOne(id, user.id, user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать отчёт' })
  @ApiResponse({ status: 201, type: CustomReportResponseDto })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateCustomReportDto,
  ) {
    return this.reportsService.create(user.id, user.organizationId, dto);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Дублировать отчёт' })
  @ApiResponse({ status: 201, type: CustomReportResponseDto })
  async duplicate(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportsService.duplicate(id, user.id, user.organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить отчёт' })
  @ApiResponse({ status: 200, type: CustomReportResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomReportDto,
  ) {
    return this.reportsService.update(id, user.id, user.organizationId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить отчёт' })
  @ApiResponse({ status: 204 })
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.reportsService.remove(id, user.id, user.organizationId);
  }

  // ============ EXECUTIONS ============

  @Post(':id/execute')
  @ApiOperation({ summary: 'Выполнить отчёт' })
  @ApiResponse({ status: 200, type: ReportDataResponseDto })
  async execute(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExecuteReportDto,
  ) {
    return this.reportsService.execute(id, user.id, user.organizationId, dto);
  }

  @Get('executions/history')
  @ApiOperation({ summary: 'История выполнений' })
  @ApiResponse({ status: 200, type: [ReportExecutionResponseDto] })
  async getExecutions(
    @CurrentUser() user: User,
    @Query() filter: ReportExecutionFilterDto,
  ) {
    return this.reportsService.getExecutions(user.id, filter);
  }

  @Get('executions/:executionId')
  @ApiOperation({ summary: 'Получить результат выполнения' })
  @ApiResponse({ status: 200, type: ReportExecutionResponseDto })
  async getExecution(
    @CurrentUser() user: User,
    @Param('executionId', ParseUUIDPipe) executionId: string,
  ) {
    return this.reportsService.getExecution(executionId, user.id);
  }
}
```

## 3.6 Migration

**Файл:** `apps/api/src/database/migrations/XXXXXX-CreateCustomReports.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomReports1706900200000 implements MigrationInterface {
  name = 'CreateCustomReports1706900200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "report_type_enum" AS ENUM (
        'sales', 'revenue', 'inventory', 'machines', 'operators',
        'products', 'tasks', 'alerts', 'financial', 'custom'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "report_format_enum" AS ENUM ('table', 'chart', 'pivot', 'summary')
    `);

    await queryRunner.query(`
      CREATE TYPE "export_format_enum" AS ENUM ('pdf', 'excel', 'csv', 'json')
    `);

    await queryRunner.query(`
      CREATE TYPE "execution_status_enum" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled')
    `);

    // Create custom_reports table
    await queryRunner.query(`
      CREATE TABLE "custom_reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid,
        "name" varchar(255) NOT NULL,
        "name_uz" varchar(255),
        "description" text,
        "report_type" "report_type_enum" NOT NULL,
        "format" "report_format_enum" NOT NULL DEFAULT 'table',
        "config" jsonb NOT NULL,
        "schedule" jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_shared" boolean NOT NULL DEFAULT false,
        "is_favorite" boolean NOT NULL DEFAULT false,
        "tags" text[] DEFAULT '{}',
        "last_filters" jsonb,
        "execution_count" int NOT NULL DEFAULT 0,
        "last_executed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_custom_reports" PRIMARY KEY ("id")
      )
    `);

    // Create report_executions table
    await queryRunner.query(`
      CREATE TABLE "report_executions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "report_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "status" "execution_status_enum" NOT NULL DEFAULT 'pending',
        "filters" jsonb,
        "parameters" jsonb,
        "export_format" "export_format_enum",
        "started_at" TIMESTAMP WITH TIME ZONE,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "duration_ms" int,
        "row_count" int,
        "result_file_path" varchar(500),
        "download_url" varchar(500),
        "error_message" text,
        "result_data" jsonb,
        "is_scheduled" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_report_executions" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_custom_reports_org_active" ON "custom_reports" ("organization_id", "is_active")`);
    await queryRunner.query(`CREATE INDEX "IDX_custom_reports_user" ON "custom_reports" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_custom_reports_type" ON "custom_reports" ("report_type")`);
    await queryRunner.query(`CREATE INDEX "IDX_custom_reports_shared" ON "custom_reports" ("is_shared")`);
    await queryRunner.query(`CREATE INDEX "IDX_custom_reports_tags" ON "custom_reports" USING GIN ("tags")`);

    await queryRunner.query(`CREATE INDEX "IDX_report_executions_report_status" ON "report_executions" ("report_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_report_executions_user_created" ON "report_executions" ("user_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_report_executions_status_created" ON "report_executions" ("status", "created_at")`);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "custom_reports" 
      ADD CONSTRAINT "FK_custom_reports_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "report_executions" 
      ADD CONSTRAINT "FK_report_executions_report" 
      FOREIGN KEY ("report_id") REFERENCES "custom_reports"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "report_executions" 
      ADD CONSTRAINT "FK_report_executions_user" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "report_executions" DROP CONSTRAINT "FK_report_executions_user"`);
    await queryRunner.query(`ALTER TABLE "report_executions" DROP CONSTRAINT "FK_report_executions_report"`);
    await queryRunner.query(`ALTER TABLE "custom_reports" DROP CONSTRAINT "FK_custom_reports_user"`);
    await queryRunner.query(`DROP TABLE "report_executions"`);
    await queryRunner.query(`DROP TABLE "custom_reports"`);
    await queryRunner.query(`DROP TYPE "execution_status_enum"`);
    await queryRunner.query(`DROP TYPE "export_format_enum"`);
    await queryRunner.query(`DROP TYPE "report_format_enum"`);
    await queryRunner.query(`DROP TYPE "report_type_enum"`);
  }
}
```

---

# 📁 Часть 4: Inventory Reservations (Резервирование инвентаря)

## 4.1 Entity: InventoryReservation

**Файл:** `apps/api/src/modules/inventory/entities/inventory-reservation.entity.ts`

```typescript
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Product } from '../../products/entities/product.entity';
import { InventoryItem } from './inventory-item.entity';
import { User } from '../../users/entities/user.entity';

export enum ReservationStatus {
  PENDING = 'pending',       // Ожидает подтверждения
  CONFIRMED = 'confirmed',   // Подтверждено, товар зарезервирован
  RELEASED = 'released',     // Освобождено (задача отменена)
  CONSUMED = 'consumed',     // Использовано (задача выполнена)
  EXPIRED = 'expired',       // Истекло по времени
}

export enum ReservationType {
  TASK = 'task',             // Резерв под задачу
  ORDER = 'order',           // Резерв под заказ
  TRANSFER = 'transfer',     // Резерв под перемещение
  MANUAL = 'manual',         // Ручной резерв
}

@Entity('inventory_reservations')
@Index(['taskId', 'status'])
@Index(['productId', 'status'])
@Index(['inventoryItemId'])
@Index(['status', 'expiresAt'])
@Index(['organizationId', 'status'])
export class InventoryReservation extends BaseEntity {
  @ApiPropertyOptional({ description: 'ID организации' })
  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null;

  @ApiPropertyOptional({ description: 'ID задачи' })
  @Column({ type: 'uuid', nullable: true })
  taskId: string | null;

  @ApiProperty({ description: 'ID продукта' })
  @Column({ type: 'uuid' })
  productId: string;

  @ApiProperty({ description: 'ID позиции инвентаря' })
  @Column({ type: 'uuid' })
  inventoryItemId: string;

  @ApiProperty({ description: 'ID склада/источника' })
  @Column({ type: 'uuid' })
  warehouseId: string;

  @ApiProperty({ description: 'Зарезервированное количество' })
  @Column({ type: 'decimal', precision: 12, scale: 3 })
  quantity: number;

  @ApiProperty({ description: 'Фактически использованное количество' })
  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  usedQuantity: number;

  @ApiProperty({ description: 'Статус резервации', enum: ReservationStatus })
  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  @ApiProperty({ description: 'Тип резервации', enum: ReservationType })
  @Column({ type: 'enum', enum: ReservationType, default: ReservationType.TASK })
  type: ReservationType;

  @ApiPropertyOptional({ description: 'Приоритет (для конфликтов)' })
  @Column({ type: 'int', default: 0 })
  priority: number;

  @ApiPropertyOptional({ description: 'Время истечения резерва' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  expiresAt: Date | null;

  @ApiPropertyOptional({ description: 'Время подтверждения' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  confirmedAt: Date | null;

  @ApiPropertyOptional({ description: 'Время использования' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  consumedAt: Date | null;

  @ApiPropertyOptional({ description: 'Время освобождения' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  releasedAt: Date | null;

  @ApiPropertyOptional({ description: 'Причина освобождения' })
  @Column({ type: 'text', nullable: true })
  releaseReason: string;

  @ApiPropertyOptional({ description: 'Комментарий' })
  @Column({ type: 'text', nullable: true })
  notes: string;

  @ApiPropertyOptional({ description: 'Метаданные' })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => Task, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => InventoryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventory_item_id' })
  inventoryItem: InventoryItem;

  // Computed
  get remainingQuantity(): number {
    return Number(this.quantity) - Number(this.usedQuantity);
  }

  get isExpired(): boolean {
    return this.expiresAt && new Date() > this.expiresAt;
  }

  get isActive(): boolean {
    return [ReservationStatus.PENDING, ReservationStatus.CONFIRMED].includes(this.status);
  }

  // Hooks
  @BeforeInsert()
  setDefaultExpiration() {
    if (!this.expiresAt) {
      // Default: 24 hours
      this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  }
}
```

## 4.2 DTOs

**Файл:** `apps/api/src/modules/inventory/dto/inventory-reservation.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  IsDateString,
  IsObject,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ReservationStatus, ReservationType } from '../entities/inventory-reservation.entity';

// ============ REQUEST DTOs ============

export class CreateReservationDto {
  @ApiPropertyOptional({ description: 'ID задачи' })
  @IsUUID()
  @IsOptional()
  taskId?: string;

  @ApiProperty({ description: 'ID продукта' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'ID позиции инвентаря' })
  @IsUUID()
  inventoryItemId: string;

  @ApiProperty({ description: 'ID склада' })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ description: 'Количество', example: 10 })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: 'Тип резервации', enum: ReservationType })
  @IsEnum(ReservationType)
  @IsOptional()
  type?: ReservationType;

  @ApiPropertyOptional({ description: 'Приоритет' })
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Время истечения' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Комментарий' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Метаданные' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateBulkReservationDto {
  @ApiPropertyOptional({ description: 'ID задачи' })
  @IsUUID()
  @IsOptional()
  taskId?: string;

  @ApiProperty({ description: 'Элементы резервации', type: [CreateReservationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReservationItemDto)
  items: CreateReservationItemDto[];

  @ApiPropertyOptional({ description: 'Время истечения (общее)' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class CreateReservationItemDto {
  @ApiProperty({ description: 'ID продукта' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Количество' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: 'Предпочтительный склад' })
  @IsUUID()
  @IsOptional()
  preferredWarehouseId?: string;
}

export class UpdateReservationDto {
  @ApiPropertyOptional({ description: 'Количество' })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Приоритет' })
  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Время истечения' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Комментарий' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ConfirmReservationDto {
  @ApiPropertyOptional({ description: 'Скорректированное количество' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  adjustedQuantity?: number;
}

export class ConsumeReservationDto {
  @ApiProperty({ description: 'Использованное количество' })
  @IsNumber()
  @Min(0.001)
  usedQuantity: number;

  @ApiPropertyOptional({ description: 'Частичное использование' })
  @IsOptional()
  partial?: boolean;
}

export class ReleaseReservationDto {
  @ApiProperty({ description: 'Причина освобождения' })
  @IsString()
  reason: string;
}

export class ReservationFilterDto {
  @ApiPropertyOptional({ description: 'ID задачи' })
  @IsUUID()
  @IsOptional()
  taskId?: string;

  @ApiPropertyOptional({ description: 'ID продукта' })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: 'ID склада' })
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'Статус', enum: ReservationStatus })
  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @ApiPropertyOptional({ description: 'Тип', enum: ReservationType })
  @IsEnum(ReservationType)
  @IsOptional()
  type?: ReservationType;

  @ApiPropertyOptional({ description: 'Только активные' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  activeOnly?: boolean;

  @ApiPropertyOptional({ description: 'Включая просроченные' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  includeExpired?: boolean;
}

// ============ RESPONSE DTOs ============

export class ReservationResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() taskId?: string;
  @ApiProperty() productId: string;
  @ApiProperty() inventoryItemId: string;
  @ApiProperty() warehouseId: string;
  @ApiProperty() quantity: number;
  @ApiProperty() usedQuantity: number;
  @ApiProperty() remainingQuantity: number;
  @ApiProperty({ enum: ReservationStatus }) status: ReservationStatus;
  @ApiProperty({ enum: ReservationType }) type: ReservationType;
  @ApiProperty() priority: number;
  @ApiPropertyOptional() expiresAt?: Date;
  @ApiPropertyOptional() confirmedAt?: Date;
  @ApiPropertyOptional() consumedAt?: Date;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() isExpired: boolean;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
}

export class ReservationSummaryDto {
  @ApiProperty() totalReservations: number;
  @ApiProperty() pendingCount: number;
  @ApiProperty() confirmedCount: number;
  @ApiProperty() totalQuantityReserved: number;
  @ApiProperty() expiringWithin24h: number;
}

export class AvailabilityCheckResultDto {
  @ApiProperty() productId: string;
  @ApiProperty() requestedQuantity: number;
  @ApiProperty() availableQuantity: number;
  @ApiProperty() reservedQuantity: number;
  @ApiProperty() isAvailable: boolean;
  @ApiPropertyOptional() suggestedWarehouses?: { warehouseId: string; available: number }[];
}
```

## 4.3 Service

**Файл:** `apps/api/src/modules/inventory/services/inventory-reservations.service.ts`

```typescript
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, LessThan, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InventoryReservation, ReservationStatus, ReservationType } from '../entities/inventory-reservation.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import {
  CreateReservationDto,
  CreateBulkReservationDto,
  UpdateReservationDto,
  ConfirmReservationDto,
  ConsumeReservationDto,
  ReleaseReservationDto,
  ReservationFilterDto,
  AvailabilityCheckResultDto,
} from '../dto/inventory-reservation.dto';

@Injectable()
export class InventoryReservationsService {
  private readonly logger = new Logger(InventoryReservationsService.name);

  constructor(
    @InjectRepository(InventoryReservation)
    private readonly reservationRepo: Repository<InventoryReservation>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============ CRUD ============

  async findAll(organizationId: string | null, filter: ReservationFilterDto): Promise<InventoryReservation[]> {
    const qb = this.reservationRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.product', 'product')
      .leftJoinAndSelect('r.task', 'task')
      .where('r.deleted_at IS NULL')
      .andWhere('r.organization_id = :orgId', { orgId: organizationId });

    if (filter.taskId) {
      qb.andWhere('r.task_id = :taskId', { taskId: filter.taskId });
    }

    if (filter.productId) {
      qb.andWhere('r.product_id = :productId', { productId: filter.productId });
    }

    if (filter.warehouseId) {
      qb.andWhere('r.warehouse_id = :warehouseId', { warehouseId: filter.warehouseId });
    }

    if (filter.status) {
      qb.andWhere('r.status = :status', { status: filter.status });
    }

    if (filter.type) {
      qb.andWhere('r.type = :type', { type: filter.type });
    }

    if (filter.activeOnly) {
      qb.andWhere('r.status IN (:...statuses)', {
        statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
      });
    }

    if (!filter.includeExpired) {
      qb.andWhere('(r.expires_at IS NULL OR r.expires_at > NOW())');
    }

    qb.orderBy('r.priority', 'DESC')
      .addOrderBy('r.created_at', 'ASC');

    return qb.getMany();
  }

  async findOne(id: string, organizationId: string | null): Promise<InventoryReservation> {
    const reservation = await this.reservationRepo.findOne({
      where: { id, organizationId, deletedAt: null },
      relations: ['product', 'task', 'inventoryItem'],
    });

    if (!reservation) {
      throw new NotFoundException(`Резервация с ID ${id} не найдена`);
    }

    return reservation;
  }

  async create(organizationId: string | null, dto: CreateReservationDto): Promise<InventoryReservation> {
    // Check availability
    const availability = await this.checkAvailability(
      dto.productId,
      dto.inventoryItemId,
      dto.quantity,
      organizationId,
    );

    if (!availability.isAvailable) {
      throw new BadRequestException(
        `Недостаточно товара. Доступно: ${availability.availableQuantity}, запрошено: ${dto.quantity}`,
      );
    }

    const reservation = this.reservationRepo.create({
      ...dto,
      organizationId,
      status: ReservationStatus.PENDING,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await this.reservationRepo.save(reservation);

    // Emit event
    this.eventEmitter.emit('inventory.reserved', {
      reservationId: reservation.id,
      productId: dto.productId,
      quantity: dto.quantity,
    });

    this.logger.log(`Created reservation: ${reservation.id} for ${dto.quantity} of product ${dto.productId}`);
    return reservation;
  }

  async createBulk(
    organizationId: string | null,
    dto: CreateBulkReservationDto,
  ): Promise<InventoryReservation[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const reservations: InventoryReservation[] = [];

      for (const item of dto.items) {
        // Find best inventory item
        const inventoryItem = await this.findBestInventoryItem(
          item.productId,
          item.quantity,
          item.preferredWarehouseId,
          organizationId,
          queryRunner.manager,
        );

        if (!inventoryItem) {
          throw new BadRequestException(
            `Недостаточно товара ${item.productId} на складах`,
          );
        }

        const reservation = queryRunner.manager.create(InventoryReservation, {
          organizationId,
          taskId: dto.taskId,
          productId: item.productId,
          inventoryItemId: inventoryItem.id,
          warehouseId: inventoryItem.warehouseId,
          quantity: item.quantity,
          type: dto.taskId ? ReservationType.TASK : ReservationType.MANUAL,
          status: ReservationStatus.PENDING,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        await queryRunner.manager.save(reservation);
        reservations.push(reservation);
      }

      await queryRunner.commitTransaction();

      // Emit events
      for (const r of reservations) {
        this.eventEmitter.emit('inventory.reserved', {
          reservationId: r.id,
          productId: r.productId,
          quantity: r.quantity,
        });
      }

      this.logger.log(`Created ${reservations.length} bulk reservations for task ${dto.taskId}`);
      return reservations;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(
    id: string,
    organizationId: string | null,
    dto: UpdateReservationDto,
  ): Promise<InventoryReservation> {
    const reservation = await this.findOne(id, organizationId);

    if (!reservation.isActive) {
      throw new BadRequestException('Нельзя изменить неактивную резервацию');
    }

    // If quantity increased, check availability
    if (dto.quantity && dto.quantity > reservation.quantity) {
      const additionalNeeded = dto.quantity - Number(reservation.quantity);
      const availability = await this.checkAvailability(
        reservation.productId,
        reservation.inventoryItemId,
        additionalNeeded,
        organizationId,
        reservation.id,
      );

      if (!availability.isAvailable) {
        throw new BadRequestException(
          `Недостаточно товара для увеличения резерва. Дополнительно доступно: ${availability.availableQuantity}`,
        );
      }
    }

    Object.assign(reservation, {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : reservation.expiresAt,
    });

    await this.reservationRepo.save(reservation);
    return reservation;
  }

  // ============ STATUS TRANSITIONS ============

  async confirm(
    id: string,
    organizationId: string | null,
    dto?: ConfirmReservationDto,
  ): Promise<InventoryReservation> {
    const reservation = await this.findOne(id, organizationId);

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException('Можно подтвердить только ожидающую резервацию');
    }

    if (dto?.adjustedQuantity !== undefined) {
      reservation.quantity = dto.adjustedQuantity;
    }

    reservation.status = ReservationStatus.CONFIRMED;
    reservation.confirmedAt = new Date();

    await this.reservationRepo.save(reservation);

    this.eventEmitter.emit('inventory.reservation.confirmed', {
      reservationId: reservation.id,
      productId: reservation.productId,
      quantity: reservation.quantity,
    });

    this.logger.log(`Confirmed reservation: ${id}`);
    return reservation;
  }

  async consume(
    id: string,
    organizationId: string | null,
    dto: ConsumeReservationDto,
  ): Promise<InventoryReservation> {
    const reservation = await this.findOne(id, organizationId);

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException('Можно использовать только подтверждённую резервацию');
    }

    if (dto.usedQuantity > reservation.remainingQuantity) {
      throw new BadRequestException(
        `Запрошено больше, чем зарезервировано. Осталось: ${reservation.remainingQuantity}`,
      );
    }

    reservation.usedQuantity = Number(reservation.usedQuantity) + dto.usedQuantity;

    // Full consumption or partial
    if (reservation.usedQuantity >= Number(reservation.quantity) || !dto.partial) {
      reservation.status = ReservationStatus.CONSUMED;
      reservation.consumedAt = new Date();
    }

    await this.reservationRepo.save(reservation);

    // Update actual inventory
    await this.deductFromInventory(
      reservation.inventoryItemId,
      dto.usedQuantity,
    );

    this.eventEmitter.emit('inventory.reservation.consumed', {
      reservationId: reservation.id,
      productId: reservation.productId,
      usedQuantity: dto.usedQuantity,
      fullyConsumed: reservation.status === ReservationStatus.CONSUMED,
    });

    this.logger.log(`Consumed ${dto.usedQuantity} from reservation: ${id}`);
    return reservation;
  }

  async release(
    id: string,
    organizationId: string | null,
    dto: ReleaseReservationDto,
  ): Promise<InventoryReservation> {
    const reservation = await this.findOne(id, organizationId);

    if (!reservation.isActive) {
      throw new BadRequestException('Резервация уже завершена');
    }

    reservation.status = ReservationStatus.RELEASED;
    reservation.releasedAt = new Date();
    reservation.releaseReason = dto.reason;

    await this.reservationRepo.save(reservation);

    this.eventEmitter.emit('inventory.reservation.released', {
      reservationId: reservation.id,
      productId: reservation.productId,
      quantity: reservation.remainingQuantity,
      reason: dto.reason,
    });

    this.logger.log(`Released reservation: ${id}, reason: ${dto.reason}`);
    return reservation;
  }

  // ============ AVAILABILITY & HELPERS ============

  async checkAvailability(
    productId: string,
    inventoryItemId: string,
    requestedQuantity: number,
    organizationId: string | null,
    excludeReservationId?: string,
  ): Promise<AvailabilityCheckResultDto> {
    // Get inventory item
    const inventoryItem = await this.inventoryRepo.findOne({
      where: { id: inventoryItemId, productId },
    });

    if (!inventoryItem) {
      return {
        productId,
        requestedQuantity,
        availableQuantity: 0,
        reservedQuantity: 0,
        isAvailable: false,
      };
    }

    // Get total reserved quantity
    const qb = this.reservationRepo.createQueryBuilder('r')
      .select('COALESCE(SUM(r.quantity - r.used_quantity), 0)', 'reserved')
      .where('r.inventory_item_id = :itemId', { itemId: inventoryItemId })
      .andWhere('r.status IN (:...statuses)', {
        statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
      })
      .andWhere('r.deleted_at IS NULL')
      .andWhere('(r.expires_at IS NULL OR r.expires_at > NOW())');

    if (excludeReservationId) {
      qb.andWhere('r.id != :excludeId', { excludeId: excludeReservationId });
    }

    const result = await qb.getRawOne();
    const reservedQuantity = parseFloat(result.reserved) || 0;

    const totalQuantity = Number(inventoryItem.quantity);
    const availableQuantity = Math.max(0, totalQuantity - reservedQuantity);

    return {
      productId,
      requestedQuantity,
      availableQuantity,
      reservedQuantity,
      isAvailable: availableQuantity >= requestedQuantity,
    };
  }

  async checkBulkAvailability(
    items: { productId: string; quantity: number }[],
    organizationId: string | null,
  ): Promise<AvailabilityCheckResultDto[]> {
    const results: AvailabilityCheckResultDto[] = [];

    for (const item of items) {
      // Find inventory items for product
      const inventoryItems = await this.inventoryRepo.find({
        where: { productId: item.productId, deletedAt: null },
        order: { quantity: 'DESC' },
      });

      let totalAvailable = 0;
      const suggestedWarehouses: { warehouseId: string; available: number }[] = [];

      for (const inv of inventoryItems) {
        const availability = await this.checkAvailability(
          item.productId,
          inv.id,
          0,
          organizationId,
        );
        totalAvailable += availability.availableQuantity;
        
        if (availability.availableQuantity > 0) {
          suggestedWarehouses.push({
            warehouseId: inv.warehouseId,
            available: availability.availableQuantity,
          });
        }
      }

      results.push({
        productId: item.productId,
        requestedQuantity: item.quantity,
        availableQuantity: totalAvailable,
        reservedQuantity: 0, // Sum would need additional query
        isAvailable: totalAvailable >= item.quantity,
        suggestedWarehouses,
      });
    }

    return results;
  }

  private async findBestInventoryItem(
    productId: string,
    quantity: number,
    preferredWarehouseId: string | null,
    organizationId: string | null,
    manager?: any,
  ): Promise<InventoryItem | null> {
    const repo = manager?.getRepository(InventoryItem) || this.inventoryRepo;

    const items = await repo.find({
      where: { productId, deletedAt: null },
      order: { quantity: 'DESC' },
    });

    // Prefer specified warehouse
    if (preferredWarehouseId) {
      const preferred = items.find(i => i.warehouseId === preferredWarehouseId);
      if (preferred) {
        const availability = await this.checkAvailability(
          productId,
          preferred.id,
          quantity,
          organizationId,
        );
        if (availability.isAvailable) {
          return preferred;
        }
      }
    }

    // Find first with enough quantity
    for (const item of items) {
      const availability = await this.checkAvailability(
        productId,
        item.id,
        quantity,
        organizationId,
      );
      if (availability.isAvailable) {
        return item;
      }
    }

    return null;
  }

  private async deductFromInventory(inventoryItemId: string, quantity: number): Promise<void> {
    await this.inventoryRepo.decrement(
      { id: inventoryItemId },
      'quantity',
      quantity,
    );

    this.eventEmitter.emit('inventory.deducted', {
      inventoryItemId,
      quantity,
    });
  }

  // ============ SUMMARY ============

  async getSummary(organizationId: string | null): Promise<any> {
    const stats = await this.reservationRepo
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(r.quantity - r.used_quantity), 0)', 'totalQuantity')
      .where('r.organization_id = :orgId', { orgId: organizationId })
      .andWhere('r.deleted_at IS NULL')
      .groupBy('r.status')
      .getRawMany();

    const expiringCount = await this.reservationRepo.count({
      where: {
        organizationId,
        status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
        expiresAt: LessThan(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        deletedAt: null,
      },
    });

    const statusMap = new Map(stats.map(s => [s.status, s]));

    return {
      totalReservations: stats.reduce((sum, s) => sum + parseInt(s.count), 0),
      pendingCount: parseInt(statusMap.get(ReservationStatus.PENDING)?.count || '0'),
      confirmedCount: parseInt(statusMap.get(ReservationStatus.CONFIRMED)?.count || '0'),
      totalQuantityReserved: stats
        .filter(s => [ReservationStatus.PENDING, ReservationStatus.CONFIRMED].includes(s.status))
        .reduce((sum, s) => sum + parseFloat(s.totalQuantity), 0),
      expiringWithin24h: expiringCount,
    };
  }

  // ============ CRON & EVENTS ============

  @Cron(CronExpression.EVERY_10_MINUTES)
  async expireOldReservations(): Promise<void> {
    const expired = await this.reservationRepo.find({
      where: {
        status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
        expiresAt: LessThan(new Date()),
        deletedAt: null,
      },
    });

    for (const reservation of expired) {
      reservation.status = ReservationStatus.EXPIRED;
      await this.reservationRepo.save(reservation);

      this.eventEmitter.emit('inventory.reservation.expired', {
        reservationId: reservation.id,
        productId: reservation.productId,
        quantity: reservation.remainingQuantity,
      });
    }

    if (expired.length > 0) {
      this.logger.log(`Expired ${expired.length} reservations`);
    }
  }

  @OnEvent('task.completed')
  async handleTaskCompleted(payload: { taskId: string }): Promise<void> {
    const reservations = await this.reservationRepo.find({
      where: {
        taskId: payload.taskId,
        status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
        deletedAt: null,
      },
    });

    for (const reservation of reservations) {
      // Auto-consume confirmed reservations
      if (reservation.status === ReservationStatus.CONFIRMED) {
        reservation.status = ReservationStatus.CONSUMED;
        reservation.usedQuantity = reservation.quantity;
        reservation.consumedAt = new Date();
      } else {
        // Release pending ones
        reservation.status = ReservationStatus.RELEASED;
        reservation.releasedAt = new Date();
        reservation.releaseReason = 'Task completed';
      }
      await this.reservationRepo.save(reservation);
    }

    this.logger.log(`Processed ${reservations.length} reservations for completed task ${payload.taskId}`);
  }

  @OnEvent('task.cancelled')
  async handleTaskCancelled(payload: { taskId: string; reason: string }): Promise<void> {
    const reservations = await this.reservationRepo.find({
      where: {
        taskId: payload.taskId,
        status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
        deletedAt: null,
      },
    });

    for (const reservation of reservations) {
      reservation.status = ReservationStatus.RELEASED;
      reservation.releasedAt = new Date();
      reservation.releaseReason = `Task cancelled: ${payload.reason}`;
      await this.reservationRepo.save(reservation);

      this.eventEmitter.emit('inventory.reservation.released', {
        reservationId: reservation.id,
        productId: reservation.productId,
        quantity: reservation.remainingQuantity,
        reason: reservation.releaseReason,
      });
    }

    this.logger.log(`Released ${reservations.length} reservations for cancelled task ${payload.taskId}`);
  }
}
```

## 4.4 Controller

**Файл:** `apps/api/src/modules/inventory/controllers/inventory-reservations.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../users/entities/user.entity';
import { InventoryReservationsService } from '../services/inventory-reservations.service';
import {
  CreateReservationDto,
  CreateBulkReservationDto,
  UpdateReservationDto,
  ConfirmReservationDto,
  ConsumeReservationDto,
  ReleaseReservationDto,
  ReservationFilterDto,
  ReservationResponseDto,
  ReservationSummaryDto,
  AvailabilityCheckResultDto,
  CreateReservationItemDto,
} from '../dto/inventory-reservation.dto';

@ApiTags('Inventory Reservations')
@ApiBearerAuth()
@Controller('inventory/reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryReservationsController {
  constructor(private readonly reservationsService: InventoryReservationsService) {}

  // ============ CRUD ============

  @Get()
  @ApiOperation({ summary: 'Получить список резерваций' })
  @ApiResponse({ status: 200, type: [ReservationResponseDto] })
  async findAll(
    @CurrentUser() user: User,
    @Query() filter: ReservationFilterDto,
  ) {
    return this.reservationsService.findAll(user.organizationId, filter);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Сводка по резервациям' })
  @ApiResponse({ status: 200, type: ReservationSummaryDto })
  async getSummary(@CurrentUser() user: User) {
    return this.reservationsService.getSummary(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить резервацию по ID' })
  @ApiResponse({ status: 200, type: ReservationResponseDto })
  async findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reservationsService.findOne(id, user.organizationId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: 'Создать резервацию' })
  @ApiResponse({ status: 201, type: ReservationResponseDto })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservationsService.create(user.organizationId, dto);
  }

  @Post('bulk')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: 'Массовое создание резерваций' })
  @ApiResponse({ status: 201, type: [ReservationResponseDto] })
  async createBulk(
    @CurrentUser() user: User,
    @Body() dto: CreateBulkReservationDto,
  ) {
    return this.reservationsService.createBulk(user.organizationId, dto);
  }

  @Post('check-availability')
  @ApiOperation({ summary: 'Проверить доступность товаров' })
  @ApiResponse({ status: 200, type: [AvailabilityCheckResultDto] })
  async checkAvailability(
    @CurrentUser() user: User,
    @Body() items: CreateReservationItemDto[],
  ) {
    return this.reservationsService.checkBulkAvailability(items, user.organizationId);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: 'Обновить резервацию' })
  @ApiResponse({ status: 200, type: ReservationResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(id, user.organizationId, dto);
  }

  // ============ STATUS TRANSITIONS ============

  @Post(':id/confirm')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: 'Подтвердить резервацию' })
  @ApiResponse({ status: 200, type: ReservationResponseDto })
  async confirm(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmReservationDto,
  ) {
    return this.reservationsService.confirm(id, user.organizationId, dto);
  }

  @Post(':id/consume')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Использовать резерв (списать товар)' })
  @ApiResponse({ status: 200, type: ReservationResponseDto })
  async consume(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConsumeReservationDto,
  ) {
    return this.reservationsService.consume(id, user.organizationId, dto);
  }

  @Post(':id/release')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: 'Освободить резервацию' })
  @ApiResponse({ status: 200, type: ReservationResponseDto })
  async release(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReleaseReservationDto,
  ) {
    return this.reservationsService.release(id, user.organizationId, dto);
  }
}
```

## 4.5 Migration

**Файл:** `apps/api/src/database/migrations/XXXXXX-CreateInventoryReservations.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryReservations1706900300000 implements MigrationInterface {
  name = 'CreateInventoryReservations1706900300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "reservation_status_enum" AS ENUM ('pending', 'confirmed', 'released', 'consumed', 'expired')
    `);

    await queryRunner.query(`
      CREATE TYPE "reservation_type_enum" AS ENUM ('task', 'order', 'transfer', 'manual')
    `);

    // Create table
    await queryRunner.query(`
      CREATE TABLE "inventory_reservations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid,
        "task_id" uuid,
        "product_id" uuid NOT NULL,
        "inventory_item_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "quantity" decimal(12,3) NOT NULL,
        "used_quantity" decimal(12,3) NOT NULL DEFAULT 0,
        "status" "reservation_status_enum" NOT NULL DEFAULT 'pending',
        "type" "reservation_type_enum" NOT NULL DEFAULT 'task',
        "priority" int NOT NULL DEFAULT 0,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "confirmed_at" TIMESTAMP WITH TIME ZONE,
        "consumed_at" TIMESTAMP WITH TIME ZONE,
        "released_at" TIMESTAMP WITH TIME ZONE,
        "release_reason" text,
        "notes" text,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_inventory_reservations" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_inventory_reservations_task_status" ON "inventory_reservations" ("task_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_inventory_reservations_product_status" ON "inventory_reservations" ("product_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_inventory_reservations_item" ON "inventory_reservations" ("inventory_item_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_inventory_reservations_status_expires" ON "inventory_reservations" ("status", "expires_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_inventory_reservations_org_status" ON "inventory_reservations" ("organization_id", "status")`);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "inventory_reservations" 
      ADD CONSTRAINT "FK_inventory_reservations_task" 
      FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "inventory_reservations" 
      ADD CONSTRAINT "FK_inventory_reservations_product" 
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "inventory_reservations" 
      ADD CONSTRAINT "FK_inventory_reservations_inventory_item" 
      FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inventory_reservations" DROP CONSTRAINT "FK_inventory_reservations_inventory_item"`);
    await queryRunner.query(`ALTER TABLE "inventory_reservations" DROP CONSTRAINT "FK_inventory_reservations_product"`);
    await queryRunner.query(`ALTER TABLE "inventory_reservations" DROP CONSTRAINT "FK_inventory_reservations_task"`);
    await queryRunner.query(`DROP TABLE "inventory_reservations"`);
    await queryRunner.query(`DROP TYPE "reservation_type_enum"`);
    await queryRunner.query(`DROP TYPE "reservation_status_enum"`);
  }
}
```

---

# 📋 Часть 5: Инструкции по выполнению

## 5.1 Порядок реализации

```bash
# 1. Создать файлы сущностей
mkdir -p apps/api/src/modules/dictionaries/entities
mkdir -p apps/api/src/modules/dictionaries/dto
mkdir -p apps/api/src/modules/dashboard/entities
mkdir -p apps/api/src/modules/dashboard/dto
mkdir -p apps/api/src/modules/dashboard/services
mkdir -p apps/api/src/modules/dashboard/controllers
mkdir -p apps/api/src/modules/reports/entities
mkdir -p apps/api/src/modules/reports/dto
mkdir -p apps/api/src/modules/reports/services
mkdir -p apps/api/src/modules/reports/controllers

# 2. Генерация миграций
npm run migration:generate -- -n CreateDictionaries
npm run migration:generate -- -n CreateDashboardWidgets
npm run migration:generate -- -n CreateCustomReports
npm run migration:generate -- -n CreateInventoryReservations

# 3. Запуск миграций
npm run migration:run

# 4. Регистрация модулей в app.module.ts
# Добавить импорты: DictionariesModule, DashboardModule, ReportsModule
```

## 5.2 Регистрация в App Module

```typescript
// apps/api/src/app.module.ts
import { DictionariesModule } from './modules/dictionaries/dictionaries.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';  // Добавить виджеты
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    // ... existing imports
    DictionariesModule,
    DashboardModule,
    ReportsModule,
    // InventoryModule уже существует - добавить ReservationsService
  ],
})
export class AppModule {}
```

## 5.3 Чеклист готовности

```markdown
### Dictionaries ✅
- [ ] Entity: Dictionary
- [ ] Entity: DictionaryItem
- [ ] DTOs
- [ ] Service
- [ ] Controller
- [ ] Module
- [ ] Migration
- [ ] Seed system dictionaries

### Dashboard Widgets ✅
- [ ] Entity: DashboardWidget
- [ ] DTOs
- [ ] Service
- [ ] Controller
- [ ] Migration
- [ ] Default widgets template

### Custom Reports ✅
- [ ] Entity: CustomReport
- [ ] Entity: ReportExecution
- [ ] DTOs
- [ ] Service
- [ ] Controller
- [ ] Migration
- [ ] Report templates
- [ ] Bull queue for async execution

### Inventory Reservations ✅
- [ ] Entity: InventoryReservation
- [ ] DTOs
- [ ] Service
- [ ] Controller
- [ ] Migration
- [ ] Event handlers (task.completed, task.cancelled)
- [ ] Cron job for expiration
```

## 5.4 Оценка времени

| Компонент | Время | Сложность |
|-----------|-------|-----------|
| Dictionaries | 3-4ч | Низкая |
| Dashboard Widgets | 4-5ч | Средняя |
| Custom Reports | 4-5ч | Средняя |
| Inventory Reservations | 6-8ч | Высокая |
| Тестирование | 2-3ч | - |
| **ИТОГО** | **19-25ч** | - |

## 5.5 Ожидаемый результат

После выполнения:

```
VendHub OS: 91/100 (+6)
├── Сущностей: 87 (+4)
├── Миграций: 52 (+4)
├── Функциональный паритет: 100%
└── Статус: PRODUCTION READY ✅
```

---

*Промт сгенерирован автоматически на основе анализа VHM24-repo и VendHub OS*
*Дата: 3 февраля 2026*
