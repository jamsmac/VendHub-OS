# Plan migratsii VHM24-repo -> VendHub OS (v4.0)

> **Versiia:** 4.0 (Audit-corrected)
> **Data:** 03 fevralia 2026
> **Bazovaia arkhitektura:** VendHub OS (Turborepo + TypeORM + PostgreSQL)
> **Biznes-logika:** VHM24-repo (56 modulei, 120 entities)
> **Appendix A:** Master Data EAV-sistema (directories)
> **Status:** Gotov k realizatsii

---

## Changelog v3 -> v4

| # | Problema v3 | Ispravlenie v4 |
|---|-------------|----------------|
| 1 | `id: number` (integer PK) | `id: string` (UUID) via BaseEntity |
| 2 | Net BaseEntity nasledovaniia | Vse entities extends BaseEntity |
| 3 | Appendix A SQL ignoriruetsia | Gibridnyi podkhod: EAV + typed entities |
| 4 | VendHub OS (37 modulei) ignoriruetsia | Karta sootvetstiviia VHM24-repo <-> VendHub OS |
| 5 | NestJS 10 | NestJS 11 (fakticheskaia versiia) |
| 6 | 3 raznye sistemy rolei | Edinaia RBAC: 7 rolei iz VHM24-repo |
| 7 | Skills ssylaiutsia na Drizzle/tRPC | Otmecheno kak TODO: obnovit skills |
| 8 | LIKE vs ILIKE | Unifitsirovano ILIKE |
| 9 | DTO klassy ne opredeleny | Dobavleny s class-validator |
| 10 | PackageType seed bez coefficient | Ispravleno |
| 11 | Enum nesootvetstviia SQL/TS | Soglasovano |
| 12 | Ingredient.currentStock dublirovanie | Udaleno, schitaetsia iz warehouse_stock |
| 13 | Product.costPrice NOT NULL dlia napitkov | Sdelano nullable, schitaetsia iz retseptury |
| 14 | PaymeService uproshchennyi | Polnyi JSON-RPC protokol |
| 15 | AI Import bez AI | Ssylka na sushchestvuiushchii intelligent-import |
| 16 | Taimlain ne uchityvaet sushchestvuiushchii kod | Peresmotreno |
| 17 | Otsutstvuiut moduli: fiscal, loyalty, HR, equipment, security | Dobavleny |

---

## 1. Printsipy migratsii

### 1.1 Istochnik pravdy

```
VHM24-repo/backend/     -- ISTOCHNIK biznes-logiki (56 modulei, 120 entities, 89 migratsii)
VendHub OS/vendhub-unified/ -- TSELEVAIAI monorepo (37 modulei uzhe est)
Appendix A SQL           -- EAV-sistema dlia dinamicheskikh spravochnikov
```

### 1.2 Strategiia: MERGE, ne CREATE

V3 predlagal sozdavat s nulia. V4 uchityvaet chto VendHub OS uzhe soderzhit 37 modulei.
Dlia kazhdogo modulia opredeliaetsia odin iz rezhimov:

| Rezhim | Opisanie | Primer |
|--------|----------|--------|
| **KEEP** | VendHub OS versiia polnaia, ispolzuem kak est | health, geo |
| **MERGE** | Oba repo imeiut modul, obediniiem biznes-logiku | machines, inventory, auth |
| **PORT** | Tolko v VHM24-repo, perenosim tselikom | hr, equipment, counterparty |
| **NEW** | Net ni v odnom, sozdaem | fiscal (novaia realizatsiia) |

### 1.3 BaseEntity (obiazatelnoe nasledovanie)

```typescript
// apps/api/src/common/entities/base.entity.ts
// UZhE SUSHCHESTVUET v VHM24-repo, kopiruem v VendHub OS

import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deleted_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  updated_by_id: string | null;
}
```

**Pravilo:** KAZHDAIA entity v proekte DOLZHNA nasledovat BaseEntity.
Eto daet: UUID PK, soft delete, audit trail, timestamps.

---

## 2. Tekhnologicheskii stek (VERIFIED)

### 2.1 Finalnyi stek (podtverzhdeno iz package.json oboikh repo)

| Sloi | Tekhnologiia | Versiia | Istochnik |
|------|-------------|---------|-----------|
| **Monorepo** | Turborepo + pnpm | 2.5 | VendHub OS |
| **Backend** | NestJS | **11.1** | Oba repo |
| **ORM** | TypeORM | **0.3.20** | Oba repo |
| **Database** | PostgreSQL | **16** | Oba repo |
| **Validation** | class-validator + class-transformer | 0.14 | Oba repo |
| **API Docs** | @nestjs/swagger | 11 | Oba repo |
| **Frontend** | Next.js | **16.1** | VendHub OS |
| **React** | React | **19** | Oba |
| **State** | Zustand | 5 | VendHub OS |
| **UI** | shadcn/ui + Radix | latest | Oba |
| **Styling** | TailwindCSS | 4 | Oba |
| **Charts** | Recharts | 2 | VHM24-repo |
| **Forms** | React Hook Form + Zod | latest | Oba |
| **Maps** | Yandex Maps | latest | VHM24-repo |
| **Real-time** | Socket.IO + Redis adapter | 4.7 | Oba |
| **Queue** | BullMQ | 5 | VendHub OS |
| **Cache** | Redis (ioredis) | 7 | Oba |
| **Bot** | Telegraf | 4.16 | VendHub OS |
| **Auth** | Passport + JWT | latest | Oba |
| **2FA** | otplib (TOTP) | 12 | VHM24-repo |
| **Files** | Sharp + MinIO/S3 | latest | VendHub OS |
| **Testing** | Jest + Playwright | 29/latest | Oba |

### 2.2 Struktura monorepo (FAKTICHESKAIA)

```
VendHub OS/vendhub-unified/
+-- apps/
|   +-- api/                    # NestJS backend
|   |   +-- src/
|   |       +-- common/         # BaseEntity, guards, interceptors
|   |       +-- config/         # TypeORM config, env validation
|   |       +-- database/
|   |       |   +-- migrations/ # TypeORM migrations
|   |       |   +-- seeds/      # Seed data
|   |       +-- modules/        # 37+ modulei (RASSHIRIAEM do 56+)
|   |       +-- health/
|   |       +-- scheduled-tasks/
|   +-- web/                    # Next.js 16 admin dashboard
|   +-- client/                 # Vite Telegram Mini App
|   +-- bot/                    # Telegram bot (Telegraf)
|   +-- mobile/                 # React Native (Expo)
+-- packages/
|   +-- shared/                 # Types, utils, constants
|   +-- ui/                     # Shared UI components
+-- infrastructure/
|   +-- k8s/
|   +-- helm/
+-- e2e/                        # Playwright tests
+-- skills/                     # Claude AI skills (21 shtuk)
```

---

## 3. RBAC: Edinaia sistema rolei

### 3.1 Finalnye roli (iz VHM24-repo User entity)

| Rol | Kod | Opisanie |
|-----|-----|----------|
| Owner | `Owner` | Vladelets organizatsii, polnyi dostup |
| Admin | `Admin` | Administrator, upravlenie vsem krome vladelcheskikh |
| Manager | `Manager` | Menedzher operatsii |
| Operator | `Operator` | Obsluzhivanie avtomatov (zagruzka, sborka) |
| Collector | `Collector` | Inkassator (sbor nalichnykh) |
| Technician | `Technician` | Tekhnik (remont, TO) |
| Viewer | `Viewer` | Tolko prosmotr |

**Dopolnitelno:** Granuliarnye permissions cherez many-to-many `user_roles` + `role_permissions`.
Modul `rbac/` iz VHM24-repo realizuet eto polnostiu.

### 3.2 Permissions format

```
module.action
Primery: machines.create, inventory.update, reports.export, users.delete
```

---

## 4. Karta sootvetstviia modulei

### 4.1 Polnaia tablitsa (56 modulei VHM24-repo -> VendHub OS)

| # | VHM24-repo modul | VendHub OS modul | Rezhim | Prioritet |
|---|------------------|------------------|--------|-----------|
| 1 | auth | auth | MERGE | P0 |
| 2 | users | users | MERGE | P0 |
| 3 | organizations | organizations | MERGE | P0 |
| 4 | rbac | (net) | PORT | P0 |
| 5 | locations | locations | MERGE | P0 |
| 6 | dictionaries | references | MERGE | P0 |
| 7 | machines | machines | MERGE | P1 |
| 8 | nomenclature | products | MERGE | P1 |
| 9 | recipes | (net) | PORT | P1 |
| 10 | inventory | inventory | MERGE | P1 |
| 11 | warehouse | (net) | PORT | P1 |
| 12 | tasks | tasks | MERGE | P1 |
| 13 | containers | (net) | PORT | P1 |
| 14 | ingredient-batches | (net) | PORT | P1 |
| 15 | transactions | transactions | MERGE | P2 |
| 16 | reconciliation | (net) | PORT | P2 |
| 17 | billing | (net) | PORT | P2 |
| 18 | counterparty | contractors | MERGE | P2 |
| 19 | analytics | (net) | PORT | P2 |
| 20 | reports | reports | MERGE | P2 |
| 21 | equipment | (net) | PORT | P1 |
| 22 | hr | employees | MERGE | P2 |
| 23 | routes | (net) | PORT | P1 |
| 24 | incidents | (net) | PORT | P1 |
| 25 | complaints | complaints | MERGE | P1 |
| 26 | notifications | notifications | MERGE | P1 |
| 27 | telegram | telegram-bot | MERGE | P2 |
| 28 | web-push | (net) | PORT | P3 |
| 29 | fcm | (net) | PORT | P3 |
| 30 | sms | (net) | PORT | P3 |
| 31 | alerts | (net) | PORT | P2 |
| 32 | integration | integrations | MERGE | P3 |
| 33 | intelligent-import | import | MERGE | P3 |
| 34 | sales-import | (net) | PORT | P2 |
| 35 | security | (net) | PORT | P0 |
| 36 | audit-logs | audit | MERGE | P0 |
| 37 | websocket | websocket | MERGE | P1 |
| 38 | files | storage | MERGE | P1 |
| 39 | operator-ratings | (net) | PORT | P2 |
| 40 | machine-access | (net) | PORT | P1 |
| 41 | access-requests | (net) | PORT | P1 |
| 42 | settings | (net) | PORT | P1 |
| 43 | monitoring | (net) | PORT | P2 |
| 44 | data-parser | (net) | PORT | P3 |
| 45 | opening-balances | (net) | PORT | P2 |
| 46 | purchase-history | (net) | PORT | P2 |
| 47 | client | (net) | PORT | P3 |
| 48 | promo-codes | (net) | PORT | P3 |
| 49 | bull-board | (net) | PORT | P2 |
| 50 | scheduled-tasks | (est v health/) | MERGE | P1 |
| 51 | ai-assistant | ai | MERGE | P3 |
| 52 | agent-bridge | (net) | PORT | P3 |
| 53 | material-requests | material-requests | KEEP | P2 |
| 54 | (net) | fiscal | KEEP | P2 |
| 55 | (net) | loyalty | KEEP | P3 |
| 56 | (net) | payments | KEEP | P2 |

**Itogo:**
- MERGE: 25 modulei (nado obiedinit logiku)
- PORT: 24 modulei (nado pereneIsti iz VHM24-repo)
- KEEP: 4 modulia (uzhe v VendHub OS, ne trogaem)
- NEW: 3 modulia (novaia realizatsiia)

---

## 5. Faza 0: Spravochniki + Infrastruktura

### 5.1 Gibridnyi podkhod k spravochnikam

**Appendix A EAV** (directory_entries s jsonb data) -- dlia:
- Edinitsy izmereniia (units)
- Kategorii tovarov (product_categories)
- Tipy avtomatov (machine_types)
- Tipy lokatsii (location_types)
- Tipy kontraagentov (contractor_types)
- Proizvoditeli (manufacturers)
- Liubye polzovatelskie spravochniki

**Tipizirovannye entities** -- dlia reguliatornykh dannykh Uzbekistana:
- `goods_classifiers` (MXIK kody, ierarkhiia)
- `ikpu_codes` (nalogovye kody)
- `vat_rates` (stavki NDS)
- `package_types` (tipy upakovki UN/CEFACT)
- `payment_providers` (platezhnye provaidevy)
- `marking_types` (tipy markirovki)

**Pochemu gibrid:** Reguliatornye dannye imeiut zhestkie polia (vat_percent, excise_rate, is_marked), kotorye ne ukladyvaiutsia v EAV bez poteri tipobezopasnosti.

### 5.2 Tipizirovannye entities (ISPRAVLENY: UUID + BaseEntity)

```typescript
// apps/api/src/modules/references/entities/goods-classifier.entity.ts

import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('goods_classifiers')
@Index(['code'], { unique: true })
@Index(['parent_id'])
@Index(['level'])
export class GoodsClassifier extends BaseEntity {
  @Column({ type: 'varchar', length: 20, unique: true })
  code: string; // MXIK kod "10810001001000000"

  @Column({ type: 'varchar', length: 500 })
  name_uz: string;

  @Column({ type: 'varchar', length: 500 })
  name_ru: string;

  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  @ManyToOne(() => GoodsClassifier, (gc) => gc.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: GoodsClassifier | null;

  @OneToMany(() => GoodsClassifier, (gc) => gc.parent)
  children: GoodsClassifier[];

  @Column({ type: 'integer', default: 1 })
  level: number; // 1-5

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  allowed_units: string[] | null; // ["sht", "kg", "l"]
}
```

```typescript
// apps/api/src/modules/references/entities/ikpu-code.entity.ts

import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { GoodsClassifier } from './goods-classifier.entity';

@Entity('ikpu_codes')
@Index(['code'], { unique: true })
@Index(['goods_classifier_id'])
@Index(['is_marked'])
export class IkpuCode extends BaseEntity {
  @Column({ type: 'varchar', length: 17, unique: true })
  code: string; // do 17 tsifr (ne 10 kak v v3)

  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  goods_classifier_id: string | null;

  @ManyToOne(() => GoodsClassifier, { nullable: true })
  @JoinColumn({ name: 'goods_classifier_id' })
  goods_classifier: GoodsClassifier | null;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  vat_percent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  excise_rate: number | null;

  @Column({ type: 'boolean', default: false })
  is_marked: boolean; // trebuet markirovki

  @Column({ type: 'varchar', length: 20, nullable: true })
  package_code: string | null; // UN/CEFACT
}
```

```typescript
// apps/api/src/modules/references/entities/vat-rate.entity.ts

import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('vat_rates')
@Index(['percent'], { unique: true })
export class VatRate extends BaseEntity {
  @Column({ type: 'decimal', precision: 5, scale: 2, unique: true })
  percent: number;

  @Column({ type: 'varchar', length: 50 })
  name: string; // "NDS 12%"

  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  @Column({ type: 'date', nullable: true })
  valid_from: Date | null;

  @Column({ type: 'date', nullable: true })
  valid_to: Date | null;
}
```

```typescript
// apps/api/src/modules/references/entities/package-type.entity.ts

import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('package_types')
@Index(['code'], { unique: true })
export class PackageType extends BaseEntity {
  @Column({ type: 'varchar', length: 10, unique: true })
  code: string; // CAN, BOT, PKG, CUP (UN/CEFACT)

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1 })
  coefficient: number; // koeffitsient pereschetia
}
```

```typescript
// apps/api/src/modules/references/entities/payment-provider.entity.ts

import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('payment_providers')
@Index(['code'], { unique: true })
export class PaymentProvider extends BaseEntity {
  @Column({ type: 'varchar', length: 20, unique: true })
  code: string; // payme, click, uzum, cash

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any> | null; // encrypted API keys

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commission_percent: number | null;
}
```

### 5.3 DTO s class-validator (DOBAVLENO v v4)

```typescript
// apps/api/src/modules/references/dto/ikpu-code.dto.ts

import { IsString, IsNumber, IsBoolean, IsOptional, Length, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIkpuCodeDto {
  @ApiProperty({ example: '10810001001', description: 'IKPU kod (do 17 tsifr)' })
  @IsString()
  @Length(5, 17)
  code: string;

  @ApiProperty({ example: 'Kofe naturalnyi zharenyi' })
  @IsString()
  @Length(1, 500)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  goods_classifier_id?: string;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(0)
  @Max(100)
  vat_percent: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  excise_rate?: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  is_marked: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  package_code?: string;
}

export class UpdateIkpuCodeDto {
  @IsOptional() @IsString() @Length(1, 500) name?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) vat_percent?: number;
  @IsOptional() @IsNumber() excise_rate?: number;
  @IsOptional() @IsBoolean() is_marked?: boolean;
  @IsOptional() @IsString() package_code?: string;
}
```

### 5.4 Seed dannye (ISPRAVLENO: coefficient dobavlen)

```typescript
// apps/api/src/database/seeds/references.seed.ts

import { DataSource } from 'typeorm';

export const seedReferences = async (ds: DataSource) => {
  // VAT Rates
  await ds.query(`
    INSERT INTO vat_rates (id, percent, name, is_default)
    VALUES
      (gen_random_uuid(), 0,  'Bez NDS',  false),
      (gen_random_uuid(), 5,  'NDS 5%',   false),
      (gen_random_uuid(), 12, 'NDS 12%',  true),
      (gen_random_uuid(), 15, 'NDS 15%',  false)
    ON CONFLICT (percent) DO NOTHING;
  `);

  // Package Types (s coefficient!)
  await ds.query(`
    INSERT INTO package_types (id, code, name, description, coefficient)
    VALUES
      (gen_random_uuid(), 'CAN', 'Banka',    'Zhestianaia banka',     1.0000),
      (gen_random_uuid(), 'BOT', 'Butylka',  'Plastikovaia butylka',  1.0000),
      (gen_random_uuid(), 'PKG', 'Upakovka', 'Upakovka/paket',        1.0000),
      (gen_random_uuid(), 'CUP', 'Stakan',   'Odnorazovyi stakan',    1.0000),
      (gen_random_uuid(), 'PCE', 'Shtuka',   'Poshtuchno',            1.0000)
    ON CONFLICT (code) DO NOTHING;
  `);

  // Payment Providers
  await ds.query(`
    INSERT INTO payment_providers (id, code, name, commission_percent, is_active)
    VALUES
      (gen_random_uuid(), 'cash',           'Nalichnye',      0,    true),
      (gen_random_uuid(), 'payme',          'Payme',           1.5,  true),
      (gen_random_uuid(), 'click',          'Click',           1.5,  true),
      (gen_random_uuid(), 'uzum',           'Uzum Bank',       1.0,  true),
      (gen_random_uuid(), 'humo',           'HUMO',            0.5,  true),
      (gen_random_uuid(), 'uzcard',         'UZCARD',          0.5,  true),
      (gen_random_uuid(), 'telegram_stars', 'Telegram Stars',  0,    true)
    ON CONFLICT (code) DO NOTHING;
  `);
};
```

### 5.5 Appendix A EAV migratsiia

Appendix A SQL (`VHM24_Master_Data_Appendix_A_SQL_Migration.sql`) primeniaetsia KAK EST:
- Sozdaet tablitsy `directories`, `directory_entries`, `directory_fields` i dr.
- Sozdaet sistemnye spravochniki: units, product_categories, machine_types, location_types, contractor_types, manufacturers
- Sozdaet funktsii poiska, normalizatsii, proverki tsiklov

**Poriadok:** Snachala Appendix A (EAV sistema), zatem seed tipizirovannykh entities.

### 5.6 Zadachi Fazy 0

| # | Zadacha | Rezhim | Prioritet |
|---|---------|--------|-----------|
| 0.1 | Skopirovat BaseEntity iz VHM24-repo v VendHub OS | PORT | P0 |
| 0.2 | Primeniti Appendix A SQL migratsiiu | NEW | P0 |
| 0.3 | Sozdat TypeORM entities: goods_classifiers, ikpu_codes, vat_rates, package_types, payment_providers | NEW | P0 |
| 0.4 | Sozdat DTO s class-validator dlia kazhdoi entity | NEW | P0 |
| 0.5 | Sozdat ReferencesModule (controller, service) | NEW | P0 |
| 0.6 | Zapustit seed dannye | NEW | P0 |
| 0.7 | Importirovat MXIK kody (goods_classifiers) iz CSV | NEW | P0 |

---

## 6. Faza 1: Core moduli (MERGE)

### 6.1 Auth + Security

**VHM24-repo imeet:** JWT + Passport + TOTP 2FA + refresh tokens + account lockout + IP whitelist
**VendHub OS imeet:** JWT + auth modul (bazovyi)

**Rezhim:** MERGE -- portirovat iz VHM24-repo: 2FA, account lockout, IP whitelist, CSRF guard

### 6.2 Users

**VHM24-repo User entity:** 40+ polei vkliuchaia telegram_user_id, 2FA, approval workflow, organization_id
**VendHub OS Users:** Bazovyi modul

**Rezhim:** MERGE -- vziat VHM24-repo entity kak bazovuiu (uzhe UUID + BaseEntity)

### 6.3 RBAC

**VHM24-repo imeet:** Polnyi rbac/ modul s Role entity, Permission entity, user_roles join table
**VendHub OS:** Net otdelnogo rbac modulia

**Rezhim:** PORT -- pereneIsti tselikom

### 6.4 Organizations (Multi-tenant)

**VHM24-repo:** Polnyi modul s franchise sistemoi
**VendHub OS:** Bazovyi modul

**Rezhim:** MERGE

### 6.5 Zadachi Fazy 1

| # | Zadacha | Rezhim | Modul |
|---|---------|--------|-------|
| 1.1 | MERGE auth: dobavit 2FA, lockout, IP whitelist | MERGE | auth |
| 1.2 | MERGE users: vziat VHM24-repo entity | MERGE | users |
| 1.3 | PORT rbac: role, permission, user_roles | PORT | rbac |
| 1.4 | MERGE organizations: franchise sistema | MERGE | organizations |
| 1.5 | MERGE locations: dobavit type_code iz dictionaries | MERGE | locations |
| 1.6 | PORT security: encryption service, CSRF guard | PORT | security |
| 1.7 | PORT audit-logs: tsentralizovannyi audit | PORT | audit-logs |
| 1.8 | PORT settings: sistema nastroek | PORT | settings |
| 1.9 | Frontend: Login s 2FA | MERGE | web |
| 1.10 | Frontend: Users CRUD + Role assignment | MERGE | web |

---

## 7. Faza 2: Operatsionnye moduli

### 7.1 Nomenclature -> Products (MERGE)

**VHM24-repo:** `nomenclature/` modul s Nomenclature entity (edinaia entity dlia vsekh tovarov/ingredientov)
**VendHub OS:** `products/` modul

**Vazhno:** VHM24-repo ispolzuet edinuiu tablitsu `nomenclature` s type field (PRODUCT/INGREDIENT/RAW_MATERIAL), a NE otdelnye tablitsy products/ingredients kak v v3.

**Reshenie v4:** Sokhranit podkhod VHM24-repo (edinaia nomenclature s type), no dobavit polia iz spetsifikatsii (taste_name, markup_percent, i dr.)

### 7.2 Inventory (MERGE)

**VHM24-repo:** 9 entities (machine-inventory, operator-inventory, warehouse-inventory, movements, reservations, adjustments, actual-counts, thresholds, report-presets)
**VendHub OS:** inventory modul (bazovyi)

**Rezhim:** MERGE -- vziat VHM24-repo kak bazovyi, on uzhe imeet 3-urovnevuiu sistemu

### 7.3 Machines (MERGE)

**VHM24-repo Machine entity:** 60+ polei vkliuchaia depreciation, disposal, connectivity, payment methods
**VendHub OS Machine entity:** Analogichnaia struktura s enums

**Rezhim:** MERGE -- sovmestit polia, vziat bolee polnuiu versiiu

### 7.4 Zadachi Fazy 2

| # | Zadacha | Rezhim | Modul |
|---|---------|--------|-------|
| 2.1 | MERGE nomenclature/products | MERGE | nomenclature |
| 2.2 | PORT recipes (3 entities) | PORT | recipes |
| 2.3 | PORT containers (hoppers/bunkers) | PORT | containers |
| 2.4 | PORT ingredient-batches (FIFO) | PORT | ingredient-batches |
| 2.5 | MERGE machines (sovmestit entities) | MERGE | machines |
| 2.6 | PORT machine-access (3 entities) | PORT | machine-access |
| 2.7 | PORT equipment (6 entities) | PORT | equipment |
| 2.8 | MERGE inventory (9 entities) | MERGE | inventory |
| 2.9 | PORT warehouse (6 entities) | PORT | warehouse |
| 2.10 | MERGE tasks (4 entities) | MERGE | tasks |
| 2.11 | PORT routes (2 entities) | PORT | routes |
| 2.12 | PORT incidents | PORT | incidents |
| 2.13 | MERGE complaints | MERGE | complaints |
| 2.14 | MERGE notifications | MERGE | notifications |
| 2.15 | PORT alerts (2 entities) | PORT | alerts |
| 2.16 | MERGE websocket | MERGE | websocket |
| 2.17 | MERGE files/storage | MERGE | storage |
| 2.18 | PORT operator-ratings | PORT | operator-ratings |
| 2.19 | Frontend: Products (drinks/snacks tabs) | NEW | web |
| 2.20 | Frontend: Machines list + Yandex Map | MERGE | web |
| 2.21 | Frontend: Inventory dashboard (3 levels) | NEW | web |
| 2.22 | Frontend: Tasks Kanban | NEW | web |
| 2.23 | Frontend: Equipment management | NEW | web |

---

## 8. Faza 3: Finansy i analitika

### 8.1 Reconciliation (PORT)

VHM24-repo imeet polnyi reconciliation/ modul s 3 entities. Portirovat tselikom.

### 8.2 Zadachi Fazy 3

| # | Zadacha | Rezhim | Modul |
|---|---------|--------|-------|
| 3.1 | MERGE transactions | MERGE | transactions |
| 3.2 | PORT reconciliation (3 entities) | PORT | reconciliation |
| 3.3 | PORT billing (2 entities) | PORT | billing |
| 3.4 | MERGE counterparty/contractors (3 entities) | MERGE | counterparty |
| 3.5 | PORT analytics (4 entities) | PORT | analytics |
| 3.6 | MERGE reports | MERGE | reports |
| 3.7 | PORT opening-balances | PORT | opening-balances |
| 3.8 | PORT purchase-history | PORT | purchase-history |
| 3.9 | PORT sales-import | PORT | sales-import |
| 3.10 | Frontend: Transactions list | NEW | web |
| 3.11 | Frontend: Reconciliation UI | NEW | web |
| 3.12 | Frontend: Dashboard KPIs + Charts | NEW | web |

---

## 9. Faza 4: Integratsii i kommunikatsii

### 9.1 Platezhnye integratsii

VHM24-repo + VendHub OS oba imeiut moduli dlia Payme/Click/Uzum.
Portirovat biznes-logiku iz VHM24-repo, ispolzovat VendHub OS infrastrukturu.

**PaymeService:** Dolzhen realizovyvat polnyi JSON-RPC protokol:
- CheckPerformTransaction
- CreateTransaction
- PerformTransaction
- CancelTransaction
- CheckTransaction
- GetStatement

### 9.2 Intelligent Import (MERGE, ne "AI Import")

VHM24-repo uzhe imeet `intelligent-import/` s 5 entities:
- ImportSession
- ImportMapping
- ImportFieldMapping
- ImportValidationRule
- ImportTemplate

Eto realnaia realizatsiia, a ne stub iz v3. MERGE s VendHub OS `import/` modulem.

### 9.3 Zadachi Fazy 4

| # | Zadacha | Rezhim | Modul |
|---|---------|--------|-------|
| 4.1 | MERGE payments (Payme/Click/Uzum) | MERGE | payments |
| 4.2 | MERGE intelligent-import (5 entities) | MERGE | intelligent-import |
| 4.3 | MERGE telegram (4 entities) | MERGE | telegram |
| 4.4 | PORT web-push | PORT | web-push |
| 4.5 | PORT fcm | PORT | fcm |
| 4.6 | PORT sms | PORT | sms |
| 4.7 | MERGE integration (5 entities) | MERGE | integration |
| 4.8 | PORT data-parser | PORT | data-parser |
| 4.9 | PORT client (7 entities: B2C) | PORT | client |
| 4.10 | PORT promo-codes (2 entities) | PORT | promo-codes |
| 4.11 | KEEP fiscal | KEEP | fiscal |
| 4.12 | KEEP loyalty | KEEP | loyalty |
| 4.13 | PORT hr (7 entities) | PORT | hr |
| 4.14 | PORT bull-board | PORT | bull-board |
| 4.15 | PORT monitoring | PORT | monitoring |
| 4.16 | Frontend: Payment settings | NEW | web |
| 4.17 | Frontend: Import UI | NEW | web |
| 4.18 | Frontend: Notifications center | NEW | web |
| 4.19 | Frontend: HR module | NEW | web |

---

## 10. UI/UX: Dizain-sistema "Warm Brew"

Bez izmenenii otnositelno v3. Sm. razdel 8 v MIGRATION_PLAN_v3.md.

Kliuchevye kharakteristiki:
- OKLCH tsveta
- Shrifty: Playfair Display, DM Sans, JetBrains Mono
- Dark mode support
- shadcn/ui komponenty

---

## 11. Quality Gates mezhdu fazami

### 11.1 Posle kazhdoi fazy

| Proverka | Instrument | Kriterii |
|----------|-----------|----------|
| TypeScript compilation | `tsc --noEmit` | 0 errors |
| Lint | ESLint | 0 errors, 0 warnings |
| Unit tests | Jest | >60% coverage na novyi kod |
| E2E tests | Playwright | Kriticheskie flows prohodiat |
| API docs | Swagger | Vse endpoints dokumentirovany |
| Security | class-validator na vsekh DTO | Vsya validatsiia na meste |
| DB migrations | TypeORM | Vse migratsii primeneny, rollback rabotaet |

### 11.2 Pered production

| Proverka | Kriterii |
|----------|---------|
| Obshchee pokrytie | >60% unit tests |
| Performance | <500ms response dlia 95% endpointov |
| Security | Rate limiting, CORS, Helmet, CSRF, input validation |
| Monitoring | Prometheus metrik, health checks |
| Logging | Strukturirovannye logi, audit trail |
| Backup | PostgreSQL backup + restore provereno |
| SSL | HTTPS everywhere |
| Secrets | Vse sekrety v env variables, ne v kode |

---

## 12. Obnovlennyi taimlain

| Faza | Soderzhanie | Trudoemkost |
|------|-------------|-------------|
| **0** | Spravochniki + infrastruktura (BaseEntity, Appendix A, seeds) | 7 zadach |
| **1** | Core: auth, users, rbac, organizations, locations, security, audit | 10 zadach |
| **2** | Operations: nomenclature, machines, inventory, tasks, equipment, routes | 23 zadachi |
| **3** | Finance: transactions, reconciliation, billing, analytics, reports | 12 zadach |
| **4** | Integrations: payments, import, telegram, notifications, HR, B2C | 19 zadach |
| **QA** | Testirovanie, performance, security audit | - |

**Itogo: 71 zadacha**

Sravnenie s v3: v3 predlagal ~49 dnei na sozdanie s nulia.
V4 uchityvaet chto ~40% koda uzhe est v VendHub OS (KEEP/MERGE moduli).

---

## 13. Kritichnye TODO

1. [ ] **Obnovit skills/**: `vhm24-db-expert`, `vhm24-api-generator` ssylaiutsia na Drizzle/MySQL/tRPC -- nado perepisat na TypeORM/PostgreSQL/NestJS
2. [ ] **Sozdat CLAUDE.md**: Edinyi istochnik pravdy dlia vsekh AI agentov s opisaniem steka, konventsii, BaseEntity pravil
3. [ ] **Udalit drizzle.config.ts** iz VHM24-repo (legacy, ne ispolzuetsia)
4. [ ] **Soglasovat naming**: VHM24-repo ispolzuet snake_case (machine_number), VendHub OS -- camelCase (machineNumber). Vybrat ODIN stil.

---

*Plan sozdan: 03 fevralia 2026*
*Versiia: 4.0 (Audit-corrected)*
*Tekhnologii: TypeORM 0.3.20 + PostgreSQL 16 + NestJS 11*
*Status: Gotov k realizatsii*
