# План миграции VHM24-repo → VendHub OS (v3.0)

> **Версия:** 3.0 (Исправленный план)
> **Дата:** 03 февраля 2026
> **Базовая архитектура:** VendHub OS (Turborepo + TypeORM + PostgreSQL)
> **Бизнес-логика:** VHM24-repo (56 модулей, 120 entities)
> **UI/UX:** Спецификация VendHub OS
> **Оценка времени:** 6-8 недель

---

## 📋 Оглавление

1. [Принципы миграции](#1-принципы-миграции)
2. [Технологический стек (ИСПРАВЛЕННЫЙ)](#2-технологический-стек-исправленный)
3. [Фаза 0: Справочники Узбекистана](#3-фаза-0-справочники-узбекистана)
4. [Фаза 1: Core модули](#4-фаза-1-core-модули)
5. [Фаза 2: Операционные модули](#5-фаза-2-операционные-модули)
6. [Фаза 3: Финансы и аналитика](#6-фаза-3-финансы-и-аналитика)
7. [Фаза 4: Интеграции и AI](#7-фаза-4-интеграции-и-ai)
8. [UI/UX и дизайн-система](#8-uiux-и-дизайн-система)
9. [Чеклист готовности](#9-чеклист-готовности)

---

## 1. Принципы миграции

### 1.1 Что сохраняем из VendHub OS

```
✅ Turborepo monorepo структура
✅ pnpm workspace
✅ TypeORM (PostgreSQL) - РЕАЛЬНЫЙ СТЕК
✅ NestJS REST API - РЕАЛЬНЫЙ СТЕК
✅ Shared packages (types, utils, constants)
✅ K8s + Helm + Terraform инфраструктура
✅ Apps структура (api, web, client, bot, mobile)
```

### 1.2 Что переносим из VHM24-repo

```
✅ Бизнес-логика 56 модулей
✅ 120 TypeORM entity определений
✅ Валидация и DTO (class-validator)
✅ Сервисная логика
✅ Frontend компоненты
✅ Документация и CLAUDE.md
```

### 1.3 Что берём из спецификаций

```
✅ Справочники Узбекистана (ИКПУ, MXIK, НДС, маркировка)
✅ Структура товаров (Напитки vs Снеки)
✅ Платёжные провайдеры (Payme, Click, Uzum)
✅ UI/UX спецификация навигации
✅ Дизайн-система "Warm Brew"
✅ AI Import иерархия
```

---

## 2. Технологический стек (ИСПРАВЛЕННЫЙ)

### 2.1 Финальный стек

| Слой | Технология | Источник |
|------|------------|----------|
| **Monorepo** | Turborepo + pnpm | VendHub OS ✅ |
| **Backend** | NestJS 10 | VHM24-repo ✅ |
| **ORM** | TypeORM | VHM24-repo + VendHub OS ✅ |
| **Database** | PostgreSQL 16 | VendHub OS ✅ |
| **Validation** | class-validator + class-transformer | NestJS ✅ |
| **API** | REST endpoints | NestJS ✅ |
| **Frontend** | Next.js 15 + React 19 | VHM24-repo ✅ |
| **State** | Zustand 5 | vhm24v2 ✅ |
| **UI** | shadcn/ui + Radix | Оба ✅ |
| **Styling** | TailwindCSS 4 | vhm24v2 ✅ |
| **Charts** | Recharts 2 | VHM24-repo ✅ |
| **Forms** | React Hook Form + Zod | Оба ✅ |
| **Maps** | Yandex Maps | VHM24-repo ✅ |
| **Real-time** | Socket.IO | VHM24-repo ✅ |
| **Queue** | Bull 5 | VHM24-repo ✅ |
| **Cache** | Redis 7 | VHM24-repo ✅ |
| **Bot** | aiogram 3.4 | vendhub-bot2 ✅ |
| **TWA** | @twa-dev/sdk | vhm24v2 ✅ |

### 2.2 Структура monorepo

```
VendHub OS/vendhub-unified/
├── apps/
│   ├── api/                    # Backend (NestJS + TypeORM)
│   │   └── src/
│   │       ├── modules/        # 56+ модулей из VHM24-repo
│   │       │   ├── auth/
│   │       │   ├── users/
│   │       │   ├── machines/
│   │       │   ├── products/
│   │       │   ├── inventory/
│   │       │   └── ...
│   │       ├── database/
│   │       │   ├── entities/   # TypeORM entities
│   │       │   ├── migrations/ # TypeORM migrations
│   │       │   └── seeds/      # Seed data
│   │       ├── common/
│   │       │   ├── decorators/
│   │       │   ├── guards/
│   │       │   ├── interceptors/
│   │       │   └── filters/
│   │       └── config/
│   ├── web/                    # Admin Dashboard (Next.js)
│   ├── client/                 # Client TWA (React + Vite)
│   ├── bot/                    # Telegram Bot (aiogram)
│   └── mobile/                 # React Native (Expo)
├── packages/
│   ├── shared-types/           # TypeScript типы
│   ├── shared-utils/           # Утилиты
│   ├── shared-constants/       # Константы, enums
│   └── ui/                     # Shared UI компоненты
└── infrastructure/
    ├── k8s/
    ├── helm/
    └── terraform/
```

---

## 3. Фаза 0: Справочники Узбекистана

> **Длительность:** 3-4 дня
> **Цель:** Создать фундамент для всех данных

### 3.1 Иерархия заполнения БД

```
┌─────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 0: СИСТЕМНЫЕ (seed автоматически)                  │
├─────────────────────────────────────────────────────────────┤
│  • languages (ru, uz, en)                                   │
│  • currencies (UZS, USD)                                    │
│  • timezones (Asia/Tashkent)                               │
│  • system_roles (super_admin, admin, manager...)           │
│  • measurement_units (шт, кг, л, мл, г)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 1: СПРАВОЧНИКИ УЗБЕКИСТАНА                        │
├─────────────────────────────────────────────────────────────┤
│  • goods_classifiers (MXIK коды - иерархия)                │
│  • ikpu_codes (налоговые коды 10 цифр)                     │
│  • vat_rates (0%, 5%, 12%, 15%)                            │
│  • package_types (CAN, BOT, PKG, CUP - UN/CEFACT)          │
│  • marking_types (Честный знак, Data Matrix)               │
│  • payment_providers (Payme, Click, Uzum, cash)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 2: ОРГАНИЗАЦИОННЫЕ                                 │
├─────────────────────────────────────────────────────────────┤
│  • organizations (tenants)                                  │
│  • users + user_sessions                                    │
│  • roles + permissions (RBAC)                               │
│  • locations (регионы, адреса)                             │
│  • suppliers (поставщики)                                   │
│  • categories (категории товаров)                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 3: ОСНОВНЫЕ СУЩНОСТИ                              │
├─────────────────────────────────────────────────────────────┤
│  • products (напитки + снеки)                              │
│  • ingredients (ингредиенты для напитков)                  │
│  • recipes (рецептуры)                                     │
│  • machines (автоматы)                                     │
│  • warehouses + warehouse_zones                            │
│  • equipment (оборудование)                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  УРОВЕНЬ 4: ОПЕРАЦИОННЫЕ                                   │
├─────────────────────────────────────────────────────────────┤
│  • tasks + task_items                                      │
│  • inventory + stock_movements                             │
│  • transactions (продажи)                                  │
│  • orders (заказы клиентов)                               │
│  • incidents + complaints                                  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 TypeORM Entities для справочников

```typescript
// apps/api/src/database/entities/references/goods-classifier.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';

@Entity('goods_classifiers')
export class GoodsClassifier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  code: string; // "10810001001000000" - MXIK код

  @Column({ name: 'name_uz', length: 500 })
  nameUz: string;

  @Column({ name: 'name_ru', length: 500 })
  nameRu: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId: number;

  @ManyToOne(() => GoodsClassifier, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: GoodsClassifier;

  @OneToMany(() => GoodsClassifier, (child) => child.parent)
  children: GoodsClassifier[];

  @Column({ default: 1 })
  level: number; // 1-5

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'allowed_units', type: 'jsonb', nullable: true })
  allowedUnits: string[]; // ["шт", "кг", "л"]

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

```typescript
// apps/api/src/database/entities/references/ikpu-code.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { GoodsClassifier } from './goods-classifier.entity';

@Entity('ikpu_codes')
export class IkpuCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 10, unique: true })
  code: string; // 10-значный налоговый код

  @Column({ length: 500 })
  name: string;

  @Column({ name: 'mxik_code', length: 20, nullable: true })
  mxikCode: string;

  @ManyToOne(() => GoodsClassifier, { nullable: true })
  @JoinColumn({ name: 'goods_classifier_id' })
  goodsClassifier: GoodsClassifier;

  @Column({ name: 'vat_percent', type: 'decimal', precision: 5, scale: 2 })
  vatPercent: number;

  @Column({ name: 'excise_rate', type: 'decimal', precision: 10, scale: 2, nullable: true })
  exciseRate: number;

  @Column({ name: 'is_marked', default: false })
  isMarked: boolean; // требует маркировки

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

```typescript
// apps/api/src/database/entities/references/vat-rate.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('vat_rates')
export class VatRate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, unique: true })
  percent: number;

  @Column({ length: 50 })
  name: string; // "НДС 12%"

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;
}
```

```typescript
// apps/api/src/database/entities/references/package-type.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('package_types')
export class PackageType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 10, unique: true })
  code: string; // CAN, BOT, PKG, CUP (UN/CEFACT)

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1 })
  coefficient: number;
}
```

```typescript
// apps/api/src/database/entities/references/payment-provider.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('payment_providers')
export class PaymentProvider {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  code: string; // payme, click, uzum, cash

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>; // API keys, endpoints (зашифровано)

  @Column({ name: 'commission_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionPercent: number;
}
```

### 3.3 NestJS Module для справочников

```typescript
// apps/api/src/modules/references/references.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoodsClassifier } from '../../database/entities/references/goods-classifier.entity';
import { IkpuCode } from '../../database/entities/references/ikpu-code.entity';
import { VatRate } from '../../database/entities/references/vat-rate.entity';
import { PackageType } from '../../database/entities/references/package-type.entity';
import { PaymentProvider } from '../../database/entities/references/payment-provider.entity';
import { ReferencesController } from './references.controller';
import { ReferencesService } from './references.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GoodsClassifier,
      IkpuCode,
      VatRate,
      PackageType,
      PaymentProvider,
    ]),
  ],
  controllers: [ReferencesController],
  providers: [ReferencesService],
  exports: [ReferencesService],
})
export class ReferencesModule {}
```

```typescript
// apps/api/src/modules/references/references.controller.ts

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReferencesService } from './references.service';
import { CreateIkpuCodeDto, UpdateIkpuCodeDto } from './dto/ikpu-code.dto';

@ApiTags('References')
@Controller('references')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReferencesController {
  constructor(private readonly referencesService: ReferencesService) {}

  // ========== GOODS CLASSIFIERS (MXIK) ==========

  @Get('goods-classifiers')
  @ApiOperation({ summary: 'Получить все классификаторы товаров' })
  async getGoodsClassifiers(@Query('parentId') parentId?: number) {
    return this.referencesService.getGoodsClassifiers(parentId);
  }

  @Get('goods-classifiers/tree')
  @ApiOperation({ summary: 'Получить дерево классификаторов' })
  async getGoodsClassifiersTree() {
    return this.referencesService.getGoodsClassifiersTree();
  }

  @Get('goods-classifiers/:id')
  @ApiOperation({ summary: 'Получить классификатор по ID' })
  async getGoodsClassifier(@Param('id') id: number) {
    return this.referencesService.getGoodsClassifierById(id);
  }

  // ========== IKPU CODES ==========

  @Get('ikpu-codes')
  @ApiOperation({ summary: 'Получить коды ИКПУ' })
  async getIkpuCodes(
    @Query('search') search?: string,
    @Query('isMarked') isMarked?: boolean,
  ) {
    return this.referencesService.getIkpuCodes({ search, isMarked });
  }

  @Get('ikpu-codes/:code')
  @ApiOperation({ summary: 'Получить ИКПУ по коду' })
  async getIkpuCode(@Param('code') code: string) {
    return this.referencesService.getIkpuCodeByCode(code);
  }

  @Post('ikpu-codes')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Создать код ИКПУ' })
  async createIkpuCode(@Body() dto: CreateIkpuCodeDto) {
    return this.referencesService.createIkpuCode(dto);
  }

  // ========== VAT RATES ==========

  @Get('vat-rates')
  @ApiOperation({ summary: 'Получить ставки НДС' })
  async getVatRates() {
    return this.referencesService.getVatRates();
  }

  // ========== PACKAGE TYPES ==========

  @Get('package-types')
  @ApiOperation({ summary: 'Получить типы упаковки' })
  async getPackageTypes() {
    return this.referencesService.getPackageTypes();
  }

  // ========== PAYMENT PROVIDERS ==========

  @Get('payment-providers')
  @ApiOperation({ summary: 'Получить платёжных провайдеров' })
  async getPaymentProviders() {
    return this.referencesService.getPaymentProviders();
  }
}
```

```typescript
// apps/api/src/modules/references/references.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull } from 'typeorm';
import { GoodsClassifier } from '../../database/entities/references/goods-classifier.entity';
import { IkpuCode } from '../../database/entities/references/ikpu-code.entity';
import { VatRate } from '../../database/entities/references/vat-rate.entity';
import { PackageType } from '../../database/entities/references/package-type.entity';
import { PaymentProvider } from '../../database/entities/references/payment-provider.entity';
import { CreateIkpuCodeDto } from './dto/ikpu-code.dto';

@Injectable()
export class ReferencesService {
  constructor(
    @InjectRepository(GoodsClassifier)
    private goodsClassifierRepo: Repository<GoodsClassifier>,
    @InjectRepository(IkpuCode)
    private ikpuCodeRepo: Repository<IkpuCode>,
    @InjectRepository(VatRate)
    private vatRateRepo: Repository<VatRate>,
    @InjectRepository(PackageType)
    private packageTypeRepo: Repository<PackageType>,
    @InjectRepository(PaymentProvider)
    private paymentProviderRepo: Repository<PaymentProvider>,
  ) {}

  // ========== GOODS CLASSIFIERS ==========

  async getGoodsClassifiers(parentId?: number) {
    const where = parentId ? { parentId } : { parentId: IsNull() };
    return this.goodsClassifierRepo.find({
      where,
      order: { code: 'ASC' },
    });
  }

  async getGoodsClassifiersTree() {
    const roots = await this.goodsClassifierRepo.find({
      where: { parentId: IsNull() },
      relations: ['children', 'children.children'],
      order: { code: 'ASC' },
    });
    return roots;
  }

  async getGoodsClassifierById(id: number) {
    const classifier = await this.goodsClassifierRepo.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
    if (!classifier) {
      throw new NotFoundException(`Classifier ${id} not found`);
    }
    return classifier;
  }

  // ========== IKPU CODES ==========

  async getIkpuCodes(filters: { search?: string; isMarked?: boolean }) {
    const qb = this.ikpuCodeRepo.createQueryBuilder('ikpu');

    if (filters.search) {
      qb.where('ikpu.code LIKE :search OR ikpu.name ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    if (filters.isMarked !== undefined) {
      qb.andWhere('ikpu.isMarked = :isMarked', { isMarked: filters.isMarked });
    }

    return qb.orderBy('ikpu.code', 'ASC').getMany();
  }

  async getIkpuCodeByCode(code: string) {
    const ikpu = await this.ikpuCodeRepo.findOne({ where: { code } });
    if (!ikpu) {
      throw new NotFoundException(`IKPU code ${code} not found`);
    }
    return ikpu;
  }

  async createIkpuCode(dto: CreateIkpuCodeDto) {
    const ikpu = this.ikpuCodeRepo.create(dto);
    return this.ikpuCodeRepo.save(ikpu);
  }

  // ========== VAT RATES ==========

  async getVatRates() {
    return this.vatRateRepo.find({ order: { percent: 'ASC' } });
  }

  async getDefaultVatRate() {
    return this.vatRateRepo.findOne({ where: { isDefault: true } });
  }

  // ========== PACKAGE TYPES ==========

  async getPackageTypes() {
    return this.packageTypeRepo.find({ order: { code: 'ASC' } });
  }

  // ========== PAYMENT PROVIDERS ==========

  async getPaymentProviders() {
    return this.paymentProviderRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }
}
```

### 3.4 Seed данные

```typescript
// apps/api/src/database/seeds/references.seed.ts

import { DataSource } from 'typeorm';
import { VatRate } from '../entities/references/vat-rate.entity';
import { PackageType } from '../entities/references/package-type.entity';
import { PaymentProvider } from '../entities/references/payment-provider.entity';

export const seedReferences = async (dataSource: DataSource) => {
  // VAT Rates
  const vatRateRepo = dataSource.getRepository(VatRate);
  const vatRates = [
    { percent: 0, name: 'Без НДС', isDefault: false },
    { percent: 5, name: 'НДС 5%', isDefault: false },
    { percent: 12, name: 'НДС 12%', isDefault: true },
    { percent: 15, name: 'НДС 15%', isDefault: false },
  ];

  for (const rate of vatRates) {
    const exists = await vatRateRepo.findOne({ where: { percent: rate.percent } });
    if (!exists) {
      await vatRateRepo.save(vatRateRepo.create(rate));
    }
  }

  // Package Types (UN/CEFACT)
  const packageTypeRepo = dataSource.getRepository(PackageType);
  const packageTypes = [
    { code: 'CAN', name: 'Банка', description: 'Жестяная банка' },
    { code: 'BOT', name: 'Бутылка', description: 'Пластиковая/стеклянная бутылка' },
    { code: 'PKG', name: 'Упаковка', description: 'Упаковка/пакет' },
    { code: 'CUP', name: 'Стакан', description: 'Одноразовый стакан' },
    { code: 'PCE', name: 'Штука', description: 'Поштучно' },
  ];

  for (const pkg of packageTypes) {
    const exists = await packageTypeRepo.findOne({ where: { code: pkg.code } });
    if (!exists) {
      await packageTypeRepo.save(packageTypeRepo.create(pkg));
    }
  }

  // Payment Providers
  const paymentProviderRepo = dataSource.getRepository(PaymentProvider);
  const providers = [
    { code: 'cash', name: 'Наличные', commissionPercent: 0 },
    { code: 'payme', name: 'Payme', commissionPercent: 1.5 },
    { code: 'click', name: 'Click', commissionPercent: 1.5 },
    { code: 'uzum', name: 'Uzum Bank', commissionPercent: 1.0 },
    { code: 'humo', name: 'HUMO', commissionPercent: 0.5 },
    { code: 'uzcard', name: 'UZCARD', commissionPercent: 0.5 },
    { code: 'telegram_stars', name: 'Telegram Stars', commissionPercent: 0 },
  ];

  for (const provider of providers) {
    const exists = await paymentProviderRepo.findOne({ where: { code: provider.code } });
    if (!exists) {
      await paymentProviderRepo.save(paymentProviderRepo.create(provider));
    }
  }

  console.log('✅ References seeded successfully');
};
```

---

## 4. Фаза 1: Core модули

> **Длительность:** 5-7 дней
> **Модули:** auth, users, organizations, rbac, locations

### 4.1 RBAC система (8 ролей)

| Роль | Код | Уровень | Описание |
|------|-----|---------|----------|
| Super Admin | `super_admin` | 0 | Полный доступ ко всему |
| Owner | `owner` | 1 | Владелец организации |
| Admin | `admin` | 2 | Администратор |
| Manager | `manager` | 3 | Менеджер операций |
| Accountant | `accountant` | 4 | Бухгалтер |
| Warehouse | `warehouse` | 5 | Кладовщик |
| Operator | `operator` | 6 | Оператор (обслуживание) |
| Technician | `technician` | 7 | Техник (ремонт) |
| Viewer | `viewer` | 8 | Только просмотр |

### 4.2 TypeORM Entities для RBAC

```typescript
// apps/api/src/database/entities/rbac/role.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../organization/organization.entity';
import { Permission } from './permission.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ default: 100 })
  level: number; // меньше = больше прав

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @Column({ name: 'organization_id', nullable: true })
  organizationId: number;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToMany(() => Permission)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

```typescript
// apps/api/src/database/entities/rbac/permission.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  code: string; // "machines.create", "users.delete"

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50 })
  module: string; // "machines", "users"

  @Column({ length: 50 })
  action: string; // "create", "read", "update", "delete"

  @Column({ length: 255, nullable: true })
  description: string;
}
```

```typescript
// apps/api/src/database/entities/rbac/user-role.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Role } from './role.entity';
import { Organization } from '../organization/organization.entity';

@Entity('user_roles')
export class UserRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'role_id' })
  roleId: number;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'organization_id', nullable: true })
  organizationId: number;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'assigned_by', nullable: true })
  assignedBy: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assignedByUser: User;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
```

### 4.3 NestJS RBAC Guard

```typescript
// apps/api/src/modules/auth/guards/roles.guard.ts

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RbacService } from '../../rbac/rbac.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Super Admin имеет все права
    if (user.roles?.some((r: any) => r.code === 'super_admin')) {
      return true;
    }

    // Проверяем наличие требуемых ролей
    return user.roles?.some((role: any) => requiredRoles.includes(role.code));
  }
}
```

```typescript
// apps/api/src/modules/auth/guards/permissions.guard.ts

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RbacService } from '../../rbac/rbac.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Проверяем наличие требуемых permissions
    const userPermissions = await this.rbacService.getUserPermissions(user.id);
    return requiredPermissions.every((perm) =>
      userPermissions.some((up) => up.code === perm),
    );
  }
}
```

### 4.4 Задачи Фазы 1

| # | Задача | Источник | Время |
|---|--------|----------|-------|
| 1.1 | TypeORM entities: users, organizations, sessions | VHM24-repo | 4ч |
| 1.2 | TypeORM entities: roles, permissions, user_roles | VHM24-repo | 3ч |
| 1.3 | TypeORM entities: locations | VHM24-repo | 2ч |
| 1.4 | NestJS module: auth (login, logout, refresh) | VHM24-repo | 4ч |
| 1.5 | NestJS module: users CRUD | VHM24-repo | 3ч |
| 1.6 | NestJS module: rbac (roles, permissions) | VHM24-repo | 3ч |
| 1.7 | NestJS module: locations CRUD | VHM24-repo | 2ч |
| 1.8 | Guards: auth, rbac, permissions | VHM24-repo | 3ч |
| 1.9 | Frontend: Login, Profile pages | VHM24-repo | 4ч |
| 1.10 | Frontend: Users list, User detail | VHM24-repo | 4ч |

---

## 5. Фаза 2: Операционные модули

> **Длительность:** 10-12 дней
> **Модули:** products, machines, inventory, tasks, warehouse

### 5.1 Система товаров (Напитки vs Снеки)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ДВА ТИПА ТОВАРОВ                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🍵 НАПИТКИ (drinks)              🍫 СНЕКИ (snacks)            │
│  ─────────────────────            ─────────────────────        │
│                                                                 │
│  • ЕСТЬ рецептура                 • НЕТ рецептуры              │
│  • Себестоимость =                • Себестоимость =            │
│    СУММА ингредиентов               закупочная цена            │
│                                                                 │
│  • costPrice рассчитывается       • costPrice вводится         │
│    автоматически                    вручную                    │
│                                                                 │
│  • Маржа = sellPrice - costPrice  • Наценка в %                │
│                                   • sellPrice = cost * (1+%)   │
│                                                                 │
│  Пример:                          Пример:                      │
│  Americano                        Snickers 50g                 │
│  Ингредиенты: 1,011 сум          Закупка: 8,000 сум           │
│  Продажа: 20,000 сум             Наценка: 50%                  │
│  Маржа: 94.9%                    Продажа: 12,000 сум           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 TypeORM Entity для товаров

```typescript
// apps/api/src/database/entities/product/product.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Category } from '../category/category.entity';
import { IkpuCode } from '../references/ikpu-code.entity';
import { PackageType } from '../references/package-type.entity';
import { VatRate } from '../references/vat-rate.entity';
import { Supplier } from '../supplier/supplier.entity';
import { Organization } from '../organization/organization.entity';
import { Recipe } from './recipe.entity';

export enum ProductType {
  DRINK = 'drink',
  SNACK = 'snack',
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  // Основное
  @Column({ length: 255 })
  name: string;

  @Column({ name: 'taste_name', length: 255, nullable: true })
  tasteName: string; // вкусовое название для напитков

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ProductType })
  type: ProductType; // drink или snack

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE })
  status: ProductStatus;

  // Категоризация
  @Column({ name: 'category_id', nullable: true })
  categoryId: number;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  // Справочники Узбекистана
  @Column({ name: 'ikpu_code_id', nullable: true })
  ikpuCodeId: number;

  @ManyToOne(() => IkpuCode, { nullable: true })
  @JoinColumn({ name: 'ikpu_code_id' })
  ikpuCode: IkpuCode;

  @Column({ name: 'package_type_id', nullable: true })
  packageTypeId: number;

  @ManyToOne(() => PackageType, { nullable: true })
  @JoinColumn({ name: 'package_type_id' })
  packageType: PackageType;

  @Column({ name: 'vat_rate_id', nullable: true })
  vatRateId: number;

  @ManyToOne(() => VatRate, { nullable: true })
  @JoinColumn({ name: 'vat_rate_id' })
  vatRate: VatRate;

  @Column({ length: 50, nullable: true })
  barcode: string;

  @Column({ name: 'requires_marking', default: false })
  requiresMarking: boolean;

  // Ценообразование
  @Column({ name: 'cost_price', type: 'decimal', precision: 12, scale: 2 })
  costPrice: number; // себестоимость

  @Column({ name: 'sell_price', type: 'decimal', precision: 12, scale: 2 })
  sellPrice: number; // розничная цена

  @Column({ name: 'markup_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  markupPercent: number; // наценка % (для снеков)

  // Для снеков
  @Column({ name: 'supplier_id', nullable: true })
  supplierId: number;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'min_order_qty', nullable: true })
  minOrderQty: number;

  @Column({ name: 'shelf_life_days', nullable: true })
  shelfLifeDays: number;

  // Изображение
  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl: string;

  // Рецептура (для напитков)
  @OneToMany(() => Recipe, (recipe) => recipe.product)
  recipes: Recipe[];

  // Мета
  @Column({ name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

```typescript
// apps/api/src/database/entities/product/ingredient.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Supplier } from '../supplier/supplier.entity';
import { Organization } from '../organization/organization.entity';

@Entity('ingredients')
export class Ingredient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 20 })
  unit: string; // г, мл, шт

  @Column({ name: 'price_per_unit', type: 'decimal', precision: 12, scale: 4 })
  pricePerUnit: number; // цена за единицу

  @Column({ name: 'current_stock', type: 'decimal', precision: 12, scale: 4, default: 0 })
  currentStock: number;

  @Column({ name: 'min_stock', type: 'decimal', precision: 12, scale: 4, nullable: true })
  minStock: number;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: number;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

```typescript
// apps/api/src/database/entities/product/recipe.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Ingredient } from './ingredient.entity';

@Entity('recipes')
export class Recipe {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => Product, (product) => product.recipes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'ingredient_id' })
  ingredientId: number;

  @ManyToOne(() => Ingredient)
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Ingredient;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  quantity: number; // количество ингредиента

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

### 5.3 Product Service с расчётом себестоимости

```typescript
// apps/api/src/modules/products/products.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductType } from '../../database/entities/product/product.entity';
import { Recipe } from '../../database/entities/product/recipe.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(Recipe)
    private recipeRepo: Repository<Recipe>,
  ) {}

  /**
   * Расчёт себестоимости напитка на основе рецептуры
   */
  async calculateDrinkCostPrice(productId: number): Promise<number> {
    const recipes = await this.recipeRepo.find({
      where: { productId },
      relations: ['ingredient'],
    });

    let totalCost = 0;
    for (const recipe of recipes) {
      // quantity * pricePerUnit
      totalCost += Number(recipe.quantity) * Number(recipe.ingredient.pricePerUnit);
    }

    return totalCost;
  }

  /**
   * Обновить себестоимость напитка при изменении рецептуры
   */
  async updateDrinkCostPrice(productId: number): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id: productId } });

    if (!product || product.type !== ProductType.DRINK) {
      throw new NotFoundException(`Drink product ${productId} not found`);
    }

    const costPrice = await this.calculateDrinkCostPrice(productId);

    product.costPrice = costPrice;
    return this.productRepo.save(product);
  }

  /**
   * Создать товар
   */
  async create(dto: CreateProductDto, organizationId: number): Promise<Product> {
    const product = this.productRepo.create({
      ...dto,
      organizationId,
    });

    // Для снеков автоматически рассчитываем sellPrice если указана наценка
    if (dto.type === ProductType.SNACK && dto.markupPercent && dto.costPrice) {
      product.sellPrice = dto.costPrice * (1 + dto.markupPercent / 100);
    }

    return this.productRepo.save(product);
  }

  /**
   * Получить товары с фильтрацией
   */
  async findAll(filters: {
    organizationId: number;
    type?: ProductType;
    categoryId?: number;
    search?: string;
  }) {
    const qb = this.productRepo.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.ikpuCode', 'ikpuCode')
      .leftJoinAndSelect('product.vatRate', 'vatRate')
      .where('product.organizationId = :orgId', { orgId: filters.organizationId });

    if (filters.type) {
      qb.andWhere('product.type = :type', { type: filters.type });
    }

    if (filters.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId: filters.categoryId });
    }

    if (filters.search) {
      qb.andWhere('(product.name ILIKE :search OR product.tasteName ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    return qb.orderBy('product.name', 'ASC').getMany();
  }

  /**
   * Получить товар с полной информацией
   */
  async findOne(id: number): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category', 'ikpuCode', 'vatRate', 'packageType', 'supplier', 'recipes', 'recipes.ingredient'],
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return product;
  }
}
```

### 5.4 3-уровневая система инвентаря

```
┌─────────────────────────────────────────────────────────────────┐
│              3-УРОВНЕВАЯ СИСТЕМА ИНВЕНТАРЯ                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   СКЛАД (Warehouse)                                             │
│   └── Зоны (Warehouse Zones)                                    │
│       └── Остатки по зонам                                      │
│              │                                                  │
│              │ Выдача оператору                                 │
│              ▼                                                  │
│   ОПЕРАТОР (Operator)                                           │
│   └── Персональный запас                                        │
│       └── Ответственность за товар                              │
│              │                                                  │
│              │ Загрузка в автомат                               │
│              ▼                                                  │
│   АВТОМАТ (Machine)                                             │
│   └── Слоты (Machine Slots) - для снеков                       │
│   └── Бункеры (Bunkers) - для напитков                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 TypeORM Entities для инвентаря

```typescript
// apps/api/src/database/entities/inventory/warehouse-stock.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { WarehouseZone } from './warehouse-zone.entity';
import { Product } from '../product/product.entity';
import { Ingredient } from '../product/ingredient.entity';

@Entity('warehouse_stock')
export class WarehouseStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'warehouse_id' })
  warehouseId: number;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ name: 'zone_id', nullable: true })
  zoneId: number;

  @ManyToOne(() => WarehouseZone, { nullable: true })
  @JoinColumn({ name: 'zone_id' })
  zone: WarehouseZone;

  @Column({ name: 'product_id', nullable: true })
  productId: number;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'ingredient_id', nullable: true })
  ingredientId: number;

  @ManyToOne(() => Ingredient, { nullable: true })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Ingredient;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  quantity: number;

  @Column({ name: 'reserved_qty', type: 'decimal', precision: 12, scale: 4, default: 0 })
  reservedQty: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

```typescript
// apps/api/src/database/entities/inventory/operator-stock.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';
import { Ingredient } from '../product/ingredient.entity';

@Entity('operator_stock')
export class OperatorStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'operator_id' })
  operatorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @Column({ name: 'product_id', nullable: true })
  productId: number;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'ingredient_id', nullable: true })
  ingredientId: number;

  @ManyToOne(() => Ingredient, { nullable: true })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Ingredient;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  quantity: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

```typescript
// apps/api/src/database/entities/inventory/stock-movement.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Product } from '../product/product.entity';
import { Ingredient } from '../product/ingredient.entity';
import { Warehouse } from './warehouse.entity';
import { User } from '../user/user.entity';
import { Machine } from '../machine/machine.entity';

export enum StockMovementType {
  RECEIPT = 'receipt',              // приёмка на склад
  ISSUE_OPERATOR = 'issue_operator', // выдача оператору
  RETURN_OPERATOR = 'return_operator', // возврат от оператора
  LOAD_MACHINE = 'load_machine',    // загрузка в автомат
  UNLOAD_MACHINE = 'unload_machine', // выгрузка из автомата
  SALE = 'sale',                    // продажа
  WRITE_OFF = 'write_off',          // списание
  ADJUSTMENT = 'adjustment',        // корректировка
  TRANSFER = 'transfer',            // перемещение между складами
}

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: StockMovementType })
  type: StockMovementType;

  // Что перемещаем
  @Column({ name: 'product_id', nullable: true })
  productId: number;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'ingredient_id', nullable: true })
  ingredientId: number;

  @ManyToOne(() => Ingredient, { nullable: true })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Ingredient;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  quantity: number;

  // Откуда-куда
  @Column({ name: 'from_warehouse_id', nullable: true })
  fromWarehouseId: number;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'from_warehouse_id' })
  fromWarehouse: Warehouse;

  @Column({ name: 'to_warehouse_id', nullable: true })
  toWarehouseId: number;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'to_warehouse_id' })
  toWarehouse: Warehouse;

  @Column({ name: 'from_operator_id', nullable: true })
  fromOperatorId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'from_operator_id' })
  fromOperator: User;

  @Column({ name: 'to_operator_id', nullable: true })
  toOperatorId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'to_operator_id' })
  toOperator: User;

  @Column({ name: 'from_machine_id', nullable: true })
  fromMachineId: number;

  @ManyToOne(() => Machine, { nullable: true })
  @JoinColumn({ name: 'from_machine_id' })
  fromMachine: Machine;

  @Column({ name: 'to_machine_id', nullable: true })
  toMachineId: number;

  @ManyToOne(() => Machine, { nullable: true })
  @JoinColumn({ name: 'to_machine_id' })
  toMachine: Machine;

  // Документы
  @Column({ name: 'document_number', length: 50, nullable: true })
  documentNumber: string;

  @Column({ name: 'document_date', type: 'timestamp', nullable: true })
  documentDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Мета
  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

### 5.6 Задачи Фазы 2

| # | Задача | Источник | Время |
|---|--------|----------|-------|
| 2.1 | TypeORM entities: products, ingredients, recipes | VHM24-repo | 4ч |
| 2.2 | TypeORM entities: machines, machine_slots, bunkers | VHM24-repo | 4ч |
| 2.3 | TypeORM entities: warehouses, stock, movements | VHM24-repo | 4ч |
| 2.4 | TypeORM entities: tasks, task_items, task_comments | VHM24-repo | 3ч |
| 2.5 | NestJS module: products CRUD + costPrice calc | VHM24-repo | 4ч |
| 2.6 | NestJS module: ingredients, recipes | VHM24-repo | 3ч |
| 2.7 | NestJS module: machines CRUD + slots | VHM24-repo | 4ч |
| 2.8 | NestJS module: inventory (3 уровня) | VHM24-repo | 6ч |
| 2.9 | NestJS module: stock movements | VHM24-repo | 4ч |
| 2.10 | NestJS module: tasks CRUD + assignment | VHM24-repo | 4ч |
| 2.11 | Frontend: Products list (drinks/snacks tabs) | UI_UX_SPEC | 6ч |
| 2.12 | Frontend: Product detail (drink vs snack) | UI_UX_SPEC | 6ч |
| 2.13 | Frontend: Product create/edit forms | UI_UX_SPEC | 4ч |
| 2.14 | Frontend: Machines list + detail | VHM24-repo | 6ч |
| 2.15 | Frontend: Machines map (Yandex) | VHM24-repo | 4ч |
| 2.16 | Frontend: Inventory dashboard (3 levels) | UI_UX_SPEC | 6ч |
| 2.17 | Frontend: Stock movements | VHM24-repo | 4ч |
| 2.18 | Frontend: Tasks Kanban | VHM24-repo | 6ч |

---

## 6. Фаза 3: Финансы и аналитика

> **Длительность:** 7-9 дней
> **Модули:** transactions, reconciliation, analytics, reports

### 6.1 Reconciliation (сверка данных)

```
┌─────────────────────────────────────────────────────────────────┐
│                    RECONCILIATION SYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ИСТОЧНИКИ ДАННЫХ:                                            │
│   ├── HW Export (выгрузка с автомата)                         │
│   ├── VendHub транзакции (наша система)                       │
│   ├── Payme отчёты                                            │
│   ├── Click отчёты                                            │
│   ├── Узum отчёты                                             │
│   └── Фискальные чеки (MultiKassa)                            │
│                                                                 │
│   АЛГОРИТМ СВЕРКИ:                                             │
│   1. Загрузка данных из всех источников                       │
│   2. Сопоставление по: дата + автомат + сумма + товар         │
│   3. Классификация:                                            │
│      • MATCHED - совпадение во всех источниках                │
│      • HW_ONLY - только в выгрузке автомата                   │
│      • SW_ONLY - только в VendHub                             │
│      • MISMATCH - расхождение сумм                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 TypeORM Entities для Reconciliation

```typescript
// apps/api/src/database/entities/reconciliation/reconciliation-run.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../organization/organization.entity';
import { User } from '../user/user.entity';
import { ReconciliationMismatch } from './reconciliation-mismatch.entity';

export enum ReconciliationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('reconciliation_runs')
export class ReconciliationRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'enum', enum: ReconciliationStatus, default: ReconciliationStatus.PENDING })
  status: ReconciliationStatus;

  // Статистика
  @Column({ name: 'total_hw_records', default: 0 })
  totalHwRecords: number;

  @Column({ name: 'total_sw_records', default: 0 })
  totalSwRecords: number;

  @Column({ name: 'matched_count', default: 0 })
  matchedCount: number;

  @Column({ name: 'hw_only_count', default: 0 })
  hwOnlyCount: number;

  @Column({ name: 'sw_only_count', default: 0 })
  swOnlyCount: number;

  @Column({ name: 'mismatch_count', default: 0 })
  mismatchCount: number;

  @OneToMany(() => ReconciliationMismatch, (m) => m.run)
  mismatches: ReconciliationMismatch[];

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;
}
```

### 6.3 Задачи Фазы 3

| # | Задача | Источник | Время |
|---|--------|----------|-------|
| 3.1 | TypeORM entities: transactions | VHM24-repo | 3ч |
| 3.2 | TypeORM entities: reconciliation | VHM24-repo | 3ч |
| 3.3 | TypeORM entities: reports, dashboard_widgets | VHM24-repo | 2ч |
| 3.4 | NestJS module: transactions CRUD + filters | VHM24-repo | 4ч |
| 3.5 | NestJS module: reconciliation (run, mismatches) | VHM24-repo | 6ч |
| 3.6 | Service: reconciliation algorithm | VHM24-repo | 8ч |
| 3.7 | NestJS module: analytics aggregations | VHM24-repo | 4ч |
| 3.8 | NestJS module: reports generation | VHM24-repo | 4ч |
| 3.9 | Frontend: Transactions list | VHM24-repo | 4ч |
| 3.10 | Frontend: Reconciliation UI | VHM24-repo | 6ч |
| 3.11 | Frontend: Dashboard KPIs | UI_UX_SPEC | 6ч |
| 3.12 | Frontend: Charts (Recharts) | VHM24-repo | 4ч |

---

## 7. Фаза 4: Интеграции и AI

> **Длительность:** 8-10 дней
> **Модули:** payments, telegram, ai-import, notifications

### 7.1 Платёжные интеграции

```typescript
// apps/api/src/modules/payments/services/payme.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface PaymeConfig {
  merchantId: string;
  secretKey: string;
  testMode: boolean;
  callbackUrl: string;
}

@Injectable()
export class PaymeService {
  private readonly logger = new Logger(PaymeService.name);
  private config: PaymeConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      merchantId: this.configService.get('PAYME_MERCHANT_ID'),
      secretKey: this.configService.get('PAYME_SECRET_KEY'),
      testMode: this.configService.get('PAYME_TEST_MODE') === 'true',
      callbackUrl: this.configService.get('PAYME_CALLBACK_URL'),
    };
  }

  /**
   * Генерация ссылки на оплату
   */
  async createInvoice(orderId: number, amount: number): Promise<string> {
    const amountInTiyins = amount * 100; // Конвертация в тийины

    const params = new URLSearchParams({
      m: this.config.merchantId,
      ac: JSON.stringify({ order_id: orderId.toString() }),
      a: amountInTiyins.toString(),
      c: this.config.callbackUrl,
    });

    const baseUrl = this.config.testMode
      ? 'https://test.paycom.uz'
      : 'https://checkout.paycom.uz';

    return `${baseUrl}/${Buffer.from(params.toString()).toString('base64')}`;
  }

  /**
   * Обработка callback от Payme
   */
  async handleCallback(data: any): Promise<any> {
    this.logger.log(`Payme callback received: ${JSON.stringify(data)}`);

    // Проверка подписи
    // Обновление статуса заказа
    // Возврат ответа

    return { result: { success: true } };
  }
}
```

### 7.2 AI Import Service

```typescript
// apps/api/src/modules/ai-import/ai-import.service.ts

import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';

interface ImportResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors: ImportError[];
  mappings: FieldMapping[];
}

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
}

@Injectable()
export class AIImportService {
  private readonly logger = new Logger(AIImportService.name);

  /**
   * Импорт файла с AI анализом
   */
  async importFile(
    file: Buffer,
    fileType: 'xlsx' | 'csv' | 'json' | 'xml',
    targetEntity: string,
    organizationId: number,
  ): Promise<ImportResult> {
    // 1. Парсинг файла
    const rawData = await this.parseFile(file, fileType);
    this.logger.log(`Parsed ${rawData.length} records from ${fileType} file`);

    // 2. AI анализ структуры и предложение маппинга
    const suggestedMappings = await this.suggestMappings(rawData, targetEntity);

    // 3. Валидация данных
    const { validData, errors } = await this.validateData(rawData, suggestedMappings, targetEntity);

    // 4. Иерархическое заполнение (сначала справочники, потом основные сущности)
    const result = await this.processHierarchically(validData, targetEntity, organizationId);

    return {
      success: errors.length === 0,
      recordsProcessed: rawData.length,
      recordsCreated: result.created,
      recordsUpdated: result.updated,
      errors,
      mappings: suggestedMappings,
    };
  }

  /**
   * Парсинг файла
   */
  private async parseFile(file: Buffer, fileType: string): Promise<any[]> {
    if (fileType === 'xlsx' || fileType === 'csv') {
      const workbook = XLSX.read(file, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(sheet);
    }

    if (fileType === 'json') {
      return JSON.parse(file.toString());
    }

    throw new Error(`Unsupported file type: ${fileType}`);
  }

  /**
   * AI предложение маппинга полей
   */
  private async suggestMappings(rawData: any[], targetEntity: string): Promise<FieldMapping[]> {
    if (rawData.length === 0) return [];

    const sourceFields = Object.keys(rawData[0]);
    const targetFields = this.getTargetFields(targetEntity);

    const mappings: FieldMapping[] = [];

    for (const sourceField of sourceFields) {
      const bestMatch = this.findBestMatch(sourceField, targetFields);
      if (bestMatch) {
        mappings.push({
          sourceField,
          targetField: bestMatch.field,
          confidence: bestMatch.confidence,
        });
      }
    }

    return mappings;
  }

  /**
   * Поиск лучшего соответствия полей
   */
  private findBestMatch(sourceField: string, targetFields: string[]): { field: string; confidence: number } | null {
    const normalized = sourceField.toLowerCase().replace(/[_\s-]/g, '');

    for (const target of targetFields) {
      const targetNormalized = target.toLowerCase().replace(/[_\s-]/g, '');

      if (normalized === targetNormalized) {
        return { field: target, confidence: 1.0 };
      }

      if (normalized.includes(targetNormalized) || targetNormalized.includes(normalized)) {
        return { field: target, confidence: 0.8 };
      }
    }

    return null;
  }

  /**
   * Получить целевые поля для сущности
   */
  private getTargetFields(targetEntity: string): string[] {
    const entityFields: Record<string, string[]> = {
      products: ['name', 'tasteName', 'type', 'costPrice', 'sellPrice', 'barcode', 'categoryId'],
      ingredients: ['name', 'unit', 'pricePerUnit', 'minStock'],
      machines: ['name', 'type', 'serialNumber', 'locationId'],
    };

    return entityFields[targetEntity] || [];
  }

  private async validateData(rawData: any[], mappings: FieldMapping[], targetEntity: string) {
    const validData: any[] = [];
    const errors: ImportError[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const mappedRow: any = {};
      let hasError = false;

      for (const mapping of mappings) {
        const value = row[mapping.sourceField];
        mappedRow[mapping.targetField] = value;

        // Базовая валидация
        if (mapping.targetField === 'name' && !value) {
          errors.push({ row: i + 1, field: mapping.sourceField, message: 'Name is required' });
          hasError = true;
        }
      }

      if (!hasError) {
        validData.push(mappedRow);
      }
    }

    return { validData, errors };
  }

  private async processHierarchically(
    validData: any[],
    targetEntity: string,
    organizationId: number,
  ): Promise<{ created: number; updated: number }> {
    // Реализация иерархического заполнения
    return { created: validData.length, updated: 0 };
  }
}
```

### 7.3 Задачи Фазы 4

| # | Задача | Источник | Время |
|---|--------|----------|-------|
| 4.1 | TypeORM entities: payments, payment_logs | VHM24-repo | 3ч |
| 4.2 | TypeORM entities: notifications, alerts | VHM24-repo | 3ч |
| 4.3 | TypeORM entities: import_sessions, import_mappings | VHM24-repo | 2ч |
| 4.4 | NestJS service: PaymeService | VHD + VHM24-repo | 4ч |
| 4.5 | NestJS service: ClickService | VHD + VHM24-repo | 4ч |
| 4.6 | NestJS service: UzumService | VHD + VHM24-repo | 3ч |
| 4.7 | NestJS module: payments | VHM24-repo | 4ч |
| 4.8 | NestJS service: AIImportService | UI_UX_SPEC + VHM24-repo | 8ч |
| 4.9 | NestJS module: ai-import | VHM24-repo | 4ч |
| 4.10 | NestJS service: NotificationService (multi-channel) | VHM24-repo | 6ч |
| 4.11 | Telegram Bot setup (aiogram) | vendhub-bot2 | 4ч |
| 4.12 | Frontend: Payments settings | UI_UX_SPEC | 4ч |
| 4.13 | Frontend: AI Import UI | UI_UX_SPEC | 6ч |
| 4.14 | Frontend: Notifications center | VHM24-repo | 4ч |

---

## 8. UI/UX и дизайн-система

### 8.1 Дизайн-система "Warm Brew" (OKLCH)

```css
/* packages/ui/src/styles/theme.css */

:root {
  /* Light Theme */
  --background: oklch(0.98 0.008 85);      /* Кремовый #FDF8F3 */
  --foreground: oklch(0.2 0.04 50);        /* Шоколад #2C1810 */
  --primary: oklch(0.35 0.06 50);          /* Эспрессо #5D4037 */
  --primary-foreground: oklch(0.98 0.008 85);
  --accent: oklch(0.75 0.12 70);           /* Карамель #D4A574 */
  --accent-foreground: oklch(0.2 0.04 50);
  --success: oklch(0.7 0.1 160);           /* Мята #7CB69D */
  --destructive: oklch(0.55 0.2 25);       /* Красный */
  --warning: oklch(0.75 0.15 85);          /* Янтарь */
  --muted: oklch(0.92 0.01 85);
  --muted-foreground: oklch(0.45 0.02 50);
  --border: oklch(0.88 0.02 85);
  --ring: oklch(0.35 0.06 50);

  /* Typography */
  --font-display: 'Playfair Display', serif;
  --font-sans: 'DM Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Border Radius */
  --radius: 0.75rem;
}

.dark {
  --background: oklch(0.12 0.01 250);      /* Тёмный кофе */
  --foreground: oklch(0.95 0.01 85);       /* Светлый */
  --primary: oklch(0.65 0.12 70);          /* Карамель светлая */
  --card: oklch(0.18 0.01 250);
  --border: oklch(0.25 0.01 250);
}
```

### 8.2 Структура навигации Admin Dashboard

```
📊 ОБЗОР
├── Dashboard              /dashboard
├── Аналитика             /dashboard/analytics
├── Карта                 /dashboard/map
└── Мониторинг            /dashboard/monitoring

🏭 АВТОМАТЫ
├── Список автоматов      /dashboard/machines
├── Оборудование          /dashboard/equipment
├── Слоты и планограммы   /dashboard/machines/[id]/slots
└── Техобслуживание       /dashboard/maintenance

📦 ТОВАРЫ
├── Каталог               /dashboard/products
│   ├── Напитки           /dashboard/products?type=drink
│   └── Снеки             /dashboard/products?type=snack
├── Ингредиенты           /dashboard/ingredients
├── Рецептуры             /dashboard/recipes
└── Ценообразование       /dashboard/pricing

📚 СПРАВОЧНИКИ
├── Категории             /dashboard/references/categories
├── Коды ИКПУ             /dashboard/references/ikpu
├── Типы упаковки         /dashboard/references/packages
├── Ставки НДС            /dashboard/references/vat
├── Маркировка            /dashboard/references/marking
├── Поставщики            /dashboard/references/suppliers
└── Локации               /dashboard/references/locations

📦 СКЛАД
├── Остатки               /dashboard/inventory
├── Приёмка               /dashboard/inventory/receipt
├── Выдача операторам     /dashboard/inventory/issue
├── Инвентаризация        /dashboard/inventory/check
└── Перемещения           /dashboard/inventory/movements

✅ ОПЕРАЦИИ
├── Задачи                /dashboard/tasks
├── Расписание            /dashboard/scheduled-tasks
├── Маршруты              /dashboard/routes
├── Инциденты             /dashboard/incidents
└── Жалобы                /dashboard/complaints

💰 ФИНАНСЫ
├── Транзакции            /dashboard/transactions
├── Сверка данных         /dashboard/reconciliation
├── Отчёты                /dashboard/reports
└── Контрагенты           /dashboard/counterparties

💳 ИНТЕГРАЦИИ
├── Платёжные системы     /dashboard/integrations/payments
├── Фискализация          /dashboard/integrations/fiscal
├── API и Webhooks        /dashboard/integrations/api
└── AI Импорт             /dashboard/integrations/import

👥 АДМИНИСТРИРОВАНИЕ
├── Пользователи          /dashboard/users
├── Роли и права          /dashboard/rbac
├── Аудит                 /dashboard/audit
├── Безопасность          /dashboard/security
└── Настройки             /dashboard/settings
```

---

## 9. Чеклист готовности

### 9.1 Фаза 0: Справочники ✓

- [ ] Seed: measurement_units
- [ ] Seed: vat_rates
- [ ] Seed: package_types
- [ ] Seed: payment_providers
- [ ] Import: goods_classifiers (MXIK)
- [ ] Import: ikpu_codes
- [ ] Seed: system_roles + permissions

### 9.2 Фаза 1: Core ✓

- [ ] Entity + Module: auth
- [ ] Entity + Module: users
- [ ] Entity + Module: organizations
- [ ] Entity + Module: rbac (roles, permissions)
- [ ] Entity + Module: locations
- [ ] Frontend: Login, Profile
- [ ] Frontend: Users management
- [ ] Guards: auth, roles, permissions

### 9.3 Фаза 2: Operations ✓

- [ ] Entity + Module: products (drinks + snacks)
- [ ] Entity + Module: ingredients, recipes
- [ ] Entity + Module: machines, slots, bunkers
- [ ] Entity + Module: warehouses, zones
- [ ] Entity + Module: inventory (3 levels)
- [ ] Entity + Module: stock_movements
- [ ] Entity + Module: tasks
- [ ] Frontend: Products (with type tabs)
- [ ] Frontend: Machines + Map
- [ ] Frontend: Inventory dashboard
- [ ] Frontend: Tasks Kanban

### 9.4 Фаза 3: Finance ✓

- [ ] Entity + Module: transactions
- [ ] Entity + Module: reconciliation
- [ ] Service: reconciliation algorithm
- [ ] Entity + Module: reports
- [ ] Frontend: Transactions
- [ ] Frontend: Reconciliation UI
- [ ] Frontend: Dashboard KPIs
- [ ] Frontend: Reports

### 9.5 Фаза 4: Integrations ✓

- [ ] Service: PaymeService
- [ ] Service: ClickService
- [ ] Service: UzumService
- [ ] Service: AIImportService
- [ ] Service: NotificationService
- [ ] Telegram Bot setup
- [ ] Frontend: Payments settings
- [ ] Frontend: AI Import
- [ ] Frontend: Notifications

### 9.6 Quality ✓

- [ ] Unit tests: >60% coverage
- [ ] E2E tests: critical flows
- [ ] Performance: <500ms response
- [ ] Security: rate limiting, input validation
- [ ] Documentation: README, Swagger API docs

---

## 📅 Итоговый таймлайн

| Фаза | Длительность | Накопительно |
|------|--------------|--------------|
| Фаза 0: Справочники | 3-4 дня | День 4 |
| Фаза 1: Core | 5-7 дней | День 11 |
| Фаза 2: Operations | 10-12 дней | День 23 |
| Фаза 3: Finance | 7-9 дней | День 32 |
| Фаза 4: Integrations | 8-10 дней | День 42 |
| Тестирование + Полировка | 5-7 дней | **День 49** |

**Итого: ~7 недель до Production-Ready**

---

## 🔧 Ключевые отличия от v2

| Аспект | v2 (ОШИБКА) | v3 (ИСПРАВЛЕНО) |
|--------|-------------|-----------------|
| **ORM** | Drizzle | **TypeORM** |
| **Database** | MySQL | **PostgreSQL** |
| **API** | tRPC | **NestJS REST** |
| **Schemas** | Drizzle schemas | **TypeORM entities** |
| **Validation** | Zod (tRPC) | **class-validator** |
| **Миграции** | drizzle-kit | **TypeORM migrations** |

---

*План создан: 03 февраля 2026*
*Версия: 3.0 (Исправленный)*
*Технологии: TypeORM + PostgreSQL + NestJS*
*Статус: Готов к реализации*
