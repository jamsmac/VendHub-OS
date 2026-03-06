# VHM24 Master Data Management — NestJS Backend Implementation

## Appendix E to Technical Specification v1.0

Этот документ содержит примеры реализации backend компонентов на NestJS + TypeORM.

---

## 1. Структура модуля

```
src/
├── modules/
│   └── directories/
│       ├── directories.module.ts
│       ├── controllers/
│       │   ├── directories.controller.ts
│       │   ├── entries.controller.ts
│       │   ├── search.controller.ts
│       │   ├── bulk.controller.ts
│       │   └── sync.controller.ts
│       ├── services/
│       │   ├── directory.service.ts
│       │   ├── entry.service.ts
│       │   ├── search.service.ts
│       │   ├── import.service.ts
│       │   ├── sync.service.ts
│       │   ├── webhook.service.ts
│       │   ├── permission.service.ts
│       │   ├── audit.service.ts
│       │   └── validation.service.ts
│       ├── entities/
│       │   ├── directory.entity.ts
│       │   ├── directory-field.entity.ts
│       │   ├── directory-entry.entity.ts
│       │   ├── directory-source.entity.ts
│       │   └── ... (остальные entities)
│       ├── dto/
│       │   ├── create-directory.dto.ts
│       │   ├── update-directory.dto.ts
│       │   ├── create-entry.dto.ts
│       │   └── ... (остальные DTOs)
│       ├── guards/
│       │   └── rbac.guard.ts
│       ├── interceptors/
│       │   └── audit.interceptor.ts
│       ├── validators/
│       │   ├── async-validator.registry.ts
│       │   └── ikpu.validator.ts
│       └── jobs/
│           ├── sync.scheduler.ts
│           └── webhook.worker.ts
```

---

## 2. Entities

### 2.1 Directory Entity

```typescript
// src/modules/directories/entities/directory.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { DirectoryField } from "./directory-field.entity";
import { DirectoryEntry } from "./directory-entry.entity";
import { DirectorySource } from "./directory-source.entity";
import { DirectoryPermission } from "./directory-permission.entity";

export enum DirectoryType {
  MANUAL = "MANUAL",
  EXTERNAL = "EXTERNAL",
  PARAM = "PARAM",
  TEMPLATE = "TEMPLATE",
}

export enum DirectoryScope {
  HQ = "HQ",
  ORGANIZATION = "ORGANIZATION",
  LOCATION = "LOCATION",
}

export interface DirectorySettings {
  allow_inline_create: boolean;
  allow_local_overlay: boolean;
  approval_required: boolean;
  prefetch: boolean;
  offline_enabled: boolean;
  offline_max_entries: number;
}

@Entity("directories")
@Index(["slug"], { unique: true, where: "deleted_at IS NULL" })
@Index(["type"])
@Index(["scope", "organization_id"])
export class Directory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text" })
  name: string;

  @Column({ type: "text" })
  slug: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({
    type: "enum",
    enum: DirectoryType,
  })
  type: DirectoryType;

  @Column({
    type: "enum",
    enum: DirectoryScope,
    default: DirectoryScope.HQ,
  })
  scope: DirectoryScope;

  @Column({ type: "uuid", nullable: true })
  organization_id: string;

  @Column({ type: "uuid", nullable: true })
  location_id: string;

  @Column({ type: "boolean", default: false })
  is_hierarchical: boolean;

  @Column({ type: "boolean", default: false })
  is_system: boolean;

  @Column({ type: "text", nullable: true })
  icon: string;

  @Column({
    type: "jsonb",
    default: {
      allow_inline_create: true,
      allow_local_overlay: true,
      approval_required: false,
      prefetch: false,
      offline_enabled: false,
      offline_max_entries: 1000,
    },
  })
  settings: DirectorySettings;

  @Column({ type: "uuid", nullable: true })
  created_by: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: Date;

  @DeleteDateColumn({ type: "timestamptz" })
  deleted_at: Date;

  // Relations
  @OneToMany(() => DirectoryField, (field) => field.directory)
  fields: DirectoryField[];

  @OneToMany(() => DirectoryEntry, (entry) => entry.directory)
  entries: DirectoryEntry[];

  @OneToMany(() => DirectorySource, (source) => source.directory)
  sources: DirectorySource[];

  @OneToMany(() => DirectoryPermission, (permission) => permission.directory)
  permissions: DirectoryPermission[];
}
```

### 2.2 Directory Entry Entity

```typescript
// src/modules/directories/entities/directory-entry.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { Directory } from "./directory.entity";

export enum EntryOrigin {
  OFFICIAL = "OFFICIAL",
  LOCAL = "LOCAL",
}

export enum EntryStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  ACTIVE = "ACTIVE",
  DEPRECATED = "DEPRECATED",
  ARCHIVED = "ARCHIVED",
}

@Entity("directory_entries")
@Index(["directory_id"])
@Index(["directory_id", "status"])
@Index(["parent_id"], { where: "parent_id IS NOT NULL" })
@Index(["directory_id", "code"], { where: "code IS NOT NULL" })
@Index(["directory_id", "external_key"], { where: "external_key IS NOT NULL" })
@Index(["directory_id", "normalized_name", "origin"], {
  unique: true,
  where: "deleted_at IS NULL",
})
export class DirectoryEntry {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  directory_id: string;

  @Column({ type: "uuid", nullable: true })
  parent_id: string;

  @Column({ type: "text" })
  name: string;

  @Column({ type: "text" })
  normalized_name: string;

  @Column({ type: "text", nullable: true })
  code: string;

  @Column({ type: "text", nullable: true })
  external_key: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "jsonb", nullable: true })
  translations: Record<string, string>;

  @Column({
    type: "enum",
    enum: EntryOrigin,
    default: EntryOrigin.LOCAL,
  })
  origin: EntryOrigin;

  @Column({ type: "text", nullable: true })
  origin_source: string;

  @Column({ type: "timestamptz", nullable: true })
  origin_date: Date;

  @Column({
    type: "enum",
    enum: EntryStatus,
    default: EntryStatus.ACTIVE,
  })
  status: EntryStatus;

  @Column({ type: "int", default: 1 })
  version: number;

  @Column({ type: "timestamptz", nullable: true })
  valid_from: Date;

  @Column({ type: "timestamptz", nullable: true })
  valid_to: Date;

  @Column({ type: "timestamptz", nullable: true })
  deprecated_at: Date;

  @Column({ type: "uuid", nullable: true })
  replacement_entry_id: string;

  @Column({ type: "text", array: true, nullable: true })
  tags: string[];

  @Column({ type: "int", default: 0 })
  sort_order: number;

  @Column({ type: "jsonb", default: {} })
  data: Record<string, any>;

  @Column({ type: "tsvector", select: false })
  search_vector: string;

  @Column({ type: "uuid", nullable: true })
  organization_id: string;

  @Column({ type: "uuid", nullable: true })
  created_by: string;

  @Column({ type: "uuid", nullable: true })
  updated_by: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: Date;

  @DeleteDateColumn({ type: "timestamptz" })
  deleted_at: Date;

  // Relations
  @ManyToOne(() => Directory, (directory) => directory.entries)
  @JoinColumn({ name: "directory_id" })
  directory: Directory;

  @ManyToOne(() => DirectoryEntry, (entry) => entry.children)
  @JoinColumn({ name: "parent_id" })
  parent: DirectoryEntry;

  @OneToMany(() => DirectoryEntry, (entry) => entry.parent)
  children: DirectoryEntry[];

  @ManyToOne(() => DirectoryEntry)
  @JoinColumn({ name: "replacement_entry_id" })
  replacement: DirectoryEntry;

  // Hooks - normalized_name вычисляется триггером в БД
}
```

---

## 3. DTOs

### 3.1 Create Directory DTO

```typescript
// src/modules/directories/dto/create-directory.dto.ts

import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";
import { DirectoryType, DirectoryScope } from "../entities/directory.entity";

export class CreateFieldDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[a-z_][a-z0-9_]*$/, {
    message: "Field name must be lowercase with underscores",
  })
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  display_name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  field_type: string;

  @IsOptional()
  @IsUUID()
  ref_directory_id?: string;

  @IsOptional()
  @IsBoolean()
  allow_free_text?: boolean;

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @IsOptional()
  @IsBoolean()
  is_unique?: boolean;

  @IsOptional()
  @IsBoolean()
  show_in_list?: boolean;

  @IsOptional()
  @IsBoolean()
  show_in_card?: boolean;

  @IsOptional()
  sort_order?: number;

  @IsOptional()
  default_value?: any;

  @IsOptional()
  validation_rules?: Record<string, any>;

  @IsOptional()
  translations?: Record<string, string>;
}

export class DirectorySettingsDto {
  @IsOptional()
  @IsBoolean()
  allow_inline_create?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_local_overlay?: boolean;

  @IsOptional()
  @IsBoolean()
  approval_required?: boolean;

  @IsOptional()
  @IsBoolean()
  prefetch?: boolean;

  @IsOptional()
  @IsBoolean()
  offline_enabled?: boolean;

  @IsOptional()
  offline_max_entries?: number;
}

export class CreateDirectoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: "Slug must be lowercase letters, numbers, and underscores",
  })
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum(DirectoryType)
  type: DirectoryType;

  @IsOptional()
  @IsEnum(DirectoryScope)
  scope?: DirectoryScope;

  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @IsOptional()
  @IsBoolean()
  is_hierarchical?: boolean;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DirectorySettingsDto)
  settings?: DirectorySettingsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFieldDto)
  fields?: CreateFieldDto[];
}
```

### 3.2 Create Entry DTO

```typescript
// src/modules/directories/dto/create-entry.dto.ts

import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  IsObject,
  MaxLength,
  MinLength,
} from "class-validator";
import { EntryOrigin, EntryStatus } from "../entities/directory-entry.entity";

export class CreateEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @IsOptional()
  @IsEnum(EntryOrigin)
  origin?: EntryOrigin;

  @IsOptional()
  @IsEnum(EntryStatus)
  status?: EntryStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  sort_order?: number;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
```

### 3.3 Search Query DTO

```typescript
// src/modules/directories/dto/search-query.dto.ts

import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { Transform } from "class-transformer";
import { EntryStatus, EntryOrigin } from "../entities/directory-entry.entity";

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(EntryStatus)
  status?: EntryStatus;

  @IsOptional()
  @IsEnum(EntryOrigin)
  origin?: EntryOrigin;

  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === "string" ? value.split(",") : value,
  )
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 50;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  include_recent?: boolean = false;

  @IsOptional()
  @IsString()
  sort?: string = "name";
}
```

---

## 4. Services

### 4.1 Directory Service

```typescript
// src/modules/directories/services/directory.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Directory,
  DirectoryType,
  DirectoryScope,
} from "../entities/directory.entity";
import { DirectoryField } from "../entities/directory-field.entity";
import { CreateDirectoryDto } from "../dto/create-directory.dto";
import { UpdateDirectoryDto } from "../dto/update-directory.dto";

@Injectable()
export class DirectoryService {
  constructor(
    @InjectRepository(Directory)
    private readonly directoryRepository: Repository<Directory>,
    @InjectRepository(DirectoryField)
    private readonly fieldRepository: Repository<DirectoryField>,
  ) {}

  async findAll(filters?: {
    type?: DirectoryType;
    scope?: DirectoryScope;
    organization_id?: string;
  }): Promise<Directory[]> {
    const qb = this.directoryRepository
      .createQueryBuilder("d")
      .leftJoinAndSelect("d.fields", "f")
      .where("d.deleted_at IS NULL")
      .orderBy("d.name", "ASC");

    if (filters?.type) {
      qb.andWhere("d.type = :type", { type: filters.type });
    }

    if (filters?.scope) {
      qb.andWhere("d.scope = :scope", { scope: filters.scope });
    }

    if (filters?.organization_id) {
      qb.andWhere("(d.organization_id = :org OR d.scope = :hq)", {
        org: filters.organization_id,
        hq: DirectoryScope.HQ,
      });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Directory> {
    const directory = await this.directoryRepository.findOne({
      where: { id },
      relations: ["fields", "sources"],
    });

    if (!directory) {
      throw new NotFoundException(`Directory ${id} not found`);
    }

    return directory;
  }

  async findBySlug(slug: string): Promise<Directory> {
    const directory = await this.directoryRepository.findOne({
      where: { slug },
      relations: ["fields"],
    });

    if (!directory) {
      throw new NotFoundException(`Directory with slug "${slug}" not found`);
    }

    return directory;
  }

  async create(dto: CreateDirectoryDto, userId: string): Promise<Directory> {
    // Check slug uniqueness
    const existing = await this.directoryRepository.findOne({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(
        `Directory with slug "${dto.slug}" already exists`,
      );
    }

    // Create directory
    const directory = this.directoryRepository.create({
      ...dto,
      created_by: userId,
      settings: {
        allow_inline_create: true,
        allow_local_overlay: true,
        approval_required: false,
        prefetch: false,
        offline_enabled: false,
        offline_max_entries: 1000,
        ...dto.settings,
      },
    });

    const saved = await this.directoryRepository.save(directory);

    // Create fields if provided
    if (dto.fields?.length) {
      const fields = dto.fields.map((f, index) =>
        this.fieldRepository.create({
          ...f,
          directory_id: saved.id,
          sort_order: f.sort_order ?? index,
        }),
      );
      await this.fieldRepository.save(fields);
    }

    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateDirectoryDto): Promise<Directory> {
    const directory = await this.findOne(id);

    // Check if trying to change slug
    if (dto.slug && dto.slug !== directory.slug) {
      const existing = await this.directoryRepository.findOne({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException(
          `Directory with slug "${dto.slug}" already exists`,
        );
      }
    }

    // Cannot change type of system directory
    if (directory.is_system && dto.type && dto.type !== directory.type) {
      throw new ConflictException("Cannot change type of system directory");
    }

    Object.assign(directory, dto);
    return this.directoryRepository.save(directory);
  }

  async archive(id: string): Promise<void> {
    const directory = await this.findOne(id);

    if (directory.is_system) {
      throw new ConflictException("Cannot delete system directory");
    }

    await this.directoryRepository.softDelete(id);
  }
}
```

### 4.2 Entry Service

```typescript
// src/modules/directories/services/entry.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  DirectoryEntry,
  EntryOrigin,
  EntryStatus,
} from "../entities/directory-entry.entity";
import {
  DirectoryEntryAudit,
  AuditAction,
} from "../entities/directory-entry-audit.entity";
import { CreateEntryDto } from "../dto/create-entry.dto";
import { UpdateEntryDto } from "../dto/update-entry.dto";
import { DirectoryService } from "./directory.service";
import { ValidationService } from "./validation.service";
import { EventService } from "./event.service";

@Injectable()
export class EntryService {
  constructor(
    @InjectRepository(DirectoryEntry)
    private readonly entryRepository: Repository<DirectoryEntry>,
    @InjectRepository(DirectoryEntryAudit)
    private readonly auditRepository: Repository<DirectoryEntryAudit>,
    private readonly dataSource: DataSource,
    private readonly directoryService: DirectoryService,
    private readonly validationService: ValidationService,
    private readonly eventService: EventService,
  ) {}

  async findAll(
    directoryId: string,
    filters?: {
      status?: EntryStatus;
      origin?: EntryOrigin;
      parent_id?: string | null;
      tags?: string[];
      page?: number;
      limit?: number;
      sort?: string;
    },
  ): Promise<{ data: DirectoryEntry[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    const qb = this.entryRepository
      .createQueryBuilder("e")
      .where("e.directory_id = :directoryId", { directoryId })
      .andWhere("e.deleted_at IS NULL");

    if (filters?.status) {
      qb.andWhere("e.status = :status", { status: filters.status });
    }

    if (filters?.origin) {
      qb.andWhere("e.origin = :origin", { origin: filters.origin });
    }

    if (filters?.parent_id !== undefined) {
      if (filters.parent_id === null) {
        qb.andWhere("e.parent_id IS NULL");
      } else {
        qb.andWhere("e.parent_id = :parentId", { parentId: filters.parent_id });
      }
    }

    if (filters?.tags?.length) {
      qb.andWhere("e.tags && :tags", { tags: filters.tags });
    }

    // Sorting
    const sort = filters?.sort || "name";
    const sortDir = sort.startsWith("-") ? "DESC" : "ASC";
    const sortField = sort.replace(/^-/, "");
    qb.orderBy(`e.${sortField}`, sortDir);

    const [data, total] = await qb.skip(offset).take(limit).getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<DirectoryEntry> {
    const entry = await this.entryRepository.findOne({
      where: { id },
      relations: ["parent", "children", "replacement"],
    });

    if (!entry) {
      throw new NotFoundException(`Entry ${id} not found`);
    }

    return entry;
  }

  async create(
    directoryId: string,
    dto: CreateEntryDto,
    userId: string,
  ): Promise<DirectoryEntry> {
    const directory = await this.directoryService.findOne(directoryId);

    // Validate data against field rules
    await this.validationService.validateEntryData(directory, dto.data || {});

    // Check for hierarchy cycle if parent_id provided
    if (dto.parent_id) {
      await this.checkParentExists(directoryId, dto.parent_id);
    }

    // Create entry
    const entry = this.entryRepository.create({
      directory_id: directoryId,
      ...dto,
      origin: dto.origin || EntryOrigin.LOCAL,
      status: directory.settings.approval_required
        ? EntryStatus.PENDING_APPROVAL
        : dto.status || EntryStatus.ACTIVE,
      created_by: userId,
      updated_by: userId,
    });

    const saved = await this.entryRepository.save(entry);

    // Audit log
    await this.createAuditLog(saved.id, AuditAction.CREATE, userId, null, {
      name: saved.name,
      code: saved.code,
      data: saved.data,
    });

    // Emit event
    await this.eventService.emit("ENTRY_CREATED", directoryId, saved.id, {
      entry: saved,
    });

    return saved;
  }

  async update(
    id: string,
    dto: UpdateEntryDto,
    userId: string,
  ): Promise<DirectoryEntry> {
    const entry = await this.findOne(id);

    // Cannot edit OFFICIAL entries
    if (entry.origin === EntryOrigin.OFFICIAL) {
      throw new BadRequestException("Cannot edit OFFICIAL entry");
    }

    const directory = await this.directoryService.findOne(entry.directory_id);

    // Validate data
    if (dto.data) {
      await this.validationService.validateEntryData(directory, dto.data);
    }

    // Check for hierarchy cycle
    if (dto.parent_id && dto.parent_id !== entry.parent_id) {
      await this.checkHierarchyCycle(entry.id, dto.parent_id);
    }

    // Capture old values for audit
    const oldValues = {
      name: entry.name,
      code: entry.code,
      status: entry.status,
      data: entry.data,
    };

    // Update
    Object.assign(entry, dto);
    entry.updated_by = userId;
    entry.version += 1;

    const saved = await this.entryRepository.save(entry);

    // Audit log
    await this.createAuditLog(saved.id, AuditAction.UPDATE, userId, oldValues, {
      name: saved.name,
      code: saved.code,
      status: saved.status,
      data: saved.data,
    });

    // Emit event
    await this.eventService.emit(
      "ENTRY_UPDATED",
      entry.directory_id,
      saved.id,
      {
        entry: saved,
        changes: this.computeChanges(oldValues, saved),
      },
    );

    return saved;
  }

  async archive(id: string, userId: string): Promise<void> {
    const entry = await this.findOne(id);

    if (entry.origin === EntryOrigin.OFFICIAL) {
      throw new BadRequestException("Cannot archive OFFICIAL entry");
    }

    const oldStatus = entry.status;
    entry.status = EntryStatus.ARCHIVED;
    entry.updated_by = userId;
    await this.entryRepository.save(entry);

    // Audit log
    await this.createAuditLog(
      entry.id,
      AuditAction.ARCHIVE,
      userId,
      { status: oldStatus },
      { status: EntryStatus.ARCHIVED },
    );

    // Emit event
    await this.eventService.emit(
      "ENTRY_ARCHIVED",
      entry.directory_id,
      entry.id,
      {
        entry,
      },
    );
  }

  async restore(id: string, userId: string): Promise<DirectoryEntry> {
    const entry = await this.findOne(id);

    if (entry.status !== EntryStatus.ARCHIVED) {
      throw new BadRequestException("Entry is not archived");
    }

    entry.status = EntryStatus.ACTIVE;
    entry.updated_by = userId;
    const saved = await this.entryRepository.save(entry);

    // Audit log
    await this.createAuditLog(
      entry.id,
      AuditAction.RESTORE,
      userId,
      { status: EntryStatus.ARCHIVED },
      { status: EntryStatus.ACTIVE },
    );

    // Emit event
    await this.eventService.emit(
      "ENTRY_RESTORED",
      entry.directory_id,
      entry.id,
      {
        entry: saved,
      },
    );

    return saved;
  }

  private async checkParentExists(
    directoryId: string,
    parentId: string,
  ): Promise<void> {
    const parent = await this.entryRepository.findOne({
      where: { id: parentId, directory_id: directoryId },
    });

    if (!parent) {
      throw new NotFoundException(`Parent entry ${parentId} not found`);
    }
  }

  private async checkHierarchyCycle(
    entryId: string,
    newParentId: string,
  ): Promise<void> {
    // Use the DB function
    const result = await this.dataSource.query(
      "SELECT check_hierarchy_cycle($1, $2) as has_cycle",
      [entryId, newParentId],
    );

    if (result[0]?.has_cycle) {
      throw new BadRequestException("Cycle detected in hierarchy");
    }
  }

  private async createAuditLog(
    entryId: string,
    action: AuditAction,
    userId: string,
    oldValues: any,
    newValues: any,
  ): Promise<void> {
    const audit = this.auditRepository.create({
      entry_id: entryId,
      action,
      changed_by: userId,
      old_values: oldValues,
      new_values: newValues,
    });
    await this.auditRepository.save(audit);
  }

  private computeChanges(
    oldValues: any,
    newValues: any,
  ): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    for (const key of Object.keys(newValues)) {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changes[key] = { old: oldValues[key], new: newValues[key] };
      }
    }

    return changes;
  }
}
```

### 4.3 Search Service

```typescript
// src/modules/directories/services/search.service.ts

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  DirectoryEntry,
  EntryStatus,
} from "../entities/directory-entry.entity";
import { UserRecentSelection } from "../entities/user-recent-selection.entity";
import { SearchQueryDto } from "../dto/search-query.dto";

export interface SearchResult {
  recent?: DirectoryEntry[];
  results: DirectoryEntry[];
  total: number;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(DirectoryEntry)
    private readonly entryRepository: Repository<DirectoryEntry>,
    @InjectRepository(UserRecentSelection)
    private readonly recentRepository: Repository<UserRecentSelection>,
    private readonly dataSource: DataSource,
  ) {}

  async search(
    directoryId: string,
    query: SearchQueryDto,
    userId?: string,
  ): Promise<SearchResult> {
    const limit = query.limit || 50;
    const status = query.status || EntryStatus.ACTIVE;

    let results: DirectoryEntry[] = [];
    let total = 0;

    if (query.q && query.q.length >= 2) {
      // Use the optimized search function
      const searchResults = await this.dataSource.query(
        `SELECT * FROM search_directory_entries($1, $2, $3, $4)`,
        [directoryId, query.q, status, limit],
      );

      const ids = searchResults.map((r: any) => r.id);

      if (ids.length > 0) {
        results = await this.entryRepository
          .createQueryBuilder("e")
          .whereInIds(ids)
          .getMany();

        // Preserve order from search results
        results.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      }

      total = results.length;
    } else {
      // No query - return paginated list
      const [data, count] = await this.entryRepository
        .createQueryBuilder("e")
        .where("e.directory_id = :directoryId", { directoryId })
        .andWhere("e.status = :status", { status })
        .andWhere("e.deleted_at IS NULL")
        .orderBy("e.sort_order", "ASC")
        .addOrderBy("e.name", "ASC")
        .take(limit)
        .skip((query.page - 1) * limit)
        .getManyAndCount();

      results = data;
      total = count;
    }

    // Include recent selections if requested
    let recent: DirectoryEntry[] | undefined;
    if (query.include_recent && userId) {
      recent = await this.getRecentSelections(directoryId, userId, 5);
    }

    return { recent, results, total };
  }

  async getRecentSelections(
    directoryId: string,
    userId: string,
    limit: number = 5,
  ): Promise<DirectoryEntry[]> {
    const selections = await this.recentRepository
      .createQueryBuilder("r")
      .innerJoinAndSelect(DirectoryEntry, "e", "e.id = r.entry_id")
      .where("r.user_id = :userId", { userId })
      .andWhere("r.directory_id = :directoryId", { directoryId })
      .andWhere("e.status = :status", { status: EntryStatus.ACTIVE })
      .orderBy("r.selected_at", "DESC")
      .limit(limit)
      .getRawMany();

    // Map to entries
    return selections.map((s: any) => ({
      id: s.e_id,
      name: s.e_name,
      code: s.e_code,
      origin: s.e_origin,
      // ... other fields
    })) as DirectoryEntry[];
  }

  async recordSelection(
    directoryId: string,
    entryId: string,
    userId: string,
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO user_recent_selections (user_id, directory_id, entry_id, selected_at, selection_count)
       VALUES ($1, $2, $3, now(), 1)
       ON CONFLICT (user_id, directory_id, entry_id) DO UPDATE SET
         selected_at = now(),
         selection_count = user_recent_selections.selection_count + 1`,
      [userId, directoryId, entryId],
    );
  }
}
```

### 4.4 Permission Service

```typescript
// src/modules/directories/services/permission.service.ts

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DirectoryPermission } from "../entities/directory-permission.entity";

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "archive"
  | "bulk_import"
  | "sync_external"
  | "approve";

interface PermissionContext {
  userId: string;
  userRoles: string[];
  organizationId?: string;
}

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(DirectoryPermission)
    private readonly permissionRepository: Repository<DirectoryPermission>,
  ) {}

  async checkPermission(
    directoryId: string,
    action: PermissionAction,
    context: PermissionContext,
  ): Promise<boolean> {
    const permissions = await this.permissionRepository.find({
      where: { directory_id: directoryId },
    });

    // Sort by priority: user > role > org > inherited
    const sortedPermissions = this.sortByPriority(permissions, context);

    for (const perm of sortedPermissions) {
      const hasPermission = this.getPermissionValue(perm, action);

      // Explicit deny - immediate rejection
      if (perm.is_deny && hasPermission) {
        return false;
      }

      // Explicit allow
      if (!perm.is_deny && hasPermission) {
        return true;
      }
    }

    // Default: denied
    return false;
  }

  async getEffectivePermissions(
    directoryId: string,
    context: PermissionContext,
  ): Promise<Record<PermissionAction, boolean>> {
    const actions: PermissionAction[] = [
      "view",
      "create",
      "edit",
      "archive",
      "bulk_import",
      "sync_external",
      "approve",
    ];

    const result: Record<PermissionAction, boolean> = {} as any;

    for (const action of actions) {
      result[action] = await this.checkPermission(directoryId, action, context);
    }

    return result;
  }

  private sortByPriority(
    permissions: DirectoryPermission[],
    context: PermissionContext,
  ): DirectoryPermission[] {
    return permissions.sort((a, b) => {
      const priorityA = this.getPriority(a, context);
      const priorityB = this.getPriority(b, context);
      return priorityA - priorityB;
    });
  }

  private getPriority(
    perm: DirectoryPermission,
    context: PermissionContext,
  ): number {
    // User-specific deny: highest priority
    if (perm.user_id === context.userId && perm.is_deny) return 1;
    // User-specific allow
    if (perm.user_id === context.userId && !perm.is_deny) return 2;
    // Role-based deny
    if (perm.role && context.userRoles.includes(perm.role) && perm.is_deny)
      return 3;
    // Role-based allow
    if (perm.role && context.userRoles.includes(perm.role) && !perm.is_deny)
      return 4;
    // Org-based deny
    if (perm.organization_id === context.organizationId && perm.is_deny)
      return 5;
    // Org-based allow
    if (perm.organization_id === context.organizationId && !perm.is_deny)
      return 6;
    // Inherited
    if (perm.inherit_from_parent) return 7;
    // Default
    return 8;
  }

  private getPermissionValue(
    perm: DirectoryPermission,
    action: PermissionAction,
  ): boolean {
    const mapping: Record<PermissionAction, keyof DirectoryPermission> = {
      view: "can_view",
      create: "can_create",
      edit: "can_edit",
      archive: "can_archive",
      bulk_import: "can_bulk_import",
      sync_external: "can_sync_external",
      approve: "can_approve",
    };

    return perm[mapping[action]] as boolean;
  }
}
```

---

## 5. Guards

### 5.1 RBAC Guard

```typescript
// src/modules/directories/guards/rbac.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  PermissionService,
  PermissionAction,
} from "../services/permission.service";

export const PERMISSION_KEY = "permission";
export const Permission = (action: PermissionAction) =>
  Reflect.metadata(PERMISSION_KEY, action);

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<PermissionAction>(
      PERMISSION_KEY,
      context.getHandler(),
    );

    if (!requiredPermission) {
      return true; // No permission required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const directoryId = request.params.id || request.params.directoryId;

    if (!directoryId) {
      return true; // No directory context
    }

    const hasPermission = await this.permissionService.checkPermission(
      directoryId,
      requiredPermission,
      {
        userId: user.id,
        userRoles: user.roles || [],
        organizationId: user.organization_id,
      },
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions for action: ${requiredPermission}`,
      );
    }

    return true;
  }
}
```

---

## 6. Controllers

### 6.1 Entries Controller

```typescript
// src/modules/directories/controllers/entries.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RbacGuard, Permission } from "../guards/rbac.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { EntryService } from "../services/entry.service";
import { SearchService } from "../services/search.service";
import { CreateEntryDto } from "../dto/create-entry.dto";
import { UpdateEntryDto } from "../dto/update-entry.dto";
import { SearchQueryDto } from "../dto/search-query.dto";

@ApiTags("Directory Entries")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller("api/directories/:directoryId/entries")
export class EntriesController {
  constructor(
    private readonly entryService: EntryService,
    private readonly searchService: SearchService,
  ) {}

  @Get()
  @Permission("view")
  @ApiOperation({ summary: "Get entries list" })
  async findAll(
    @Param("directoryId", ParseUUIDPipe) directoryId: string,
    @Query() query: SearchQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.entryService.findAll(directoryId, query);
  }

  @Get("search")
  @Permission("view")
  @ApiOperation({ summary: "Search entries" })
  async search(
    @Param("directoryId", ParseUUIDPipe) directoryId: string,
    @Query() query: SearchQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.searchService.search(directoryId, query, user.id);
  }

  @Post()
  @Permission("create")
  @ApiOperation({ summary: "Create entry" })
  async create(
    @Param("directoryId", ParseUUIDPipe) directoryId: string,
    @Body() dto: CreateEntryDto,
    @CurrentUser() user: any,
  ) {
    const entry = await this.entryService.create(directoryId, dto, user.id);

    // Record selection for recent
    await this.searchService.recordSelection(directoryId, entry.id, user.id);

    return entry;
  }

  @Get(":id")
  @Permission("view")
  @ApiOperation({ summary: "Get entry by ID" })
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.entryService.findOne(id);
  }

  @Patch(":id")
  @Permission("edit")
  @ApiOperation({ summary: "Update entry" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateEntryDto,
    @CurrentUser() user: any,
  ) {
    return this.entryService.update(id, dto, user.id);
  }

  @Delete(":id")
  @Permission("archive")
  @ApiOperation({ summary: "Archive entry" })
  async archive(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    await this.entryService.archive(id, user.id);
    return { success: true };
  }

  @Post(":id/restore")
  @Permission("archive")
  @ApiOperation({ summary: "Restore archived entry" })
  async restore(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.entryService.restore(id, user.id);
  }
}
```

---

## 7. Module

```typescript
// src/modules/directories/directories.module.ts

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";

// Entities
import { Directory } from "./entities/directory.entity";
import { DirectoryField } from "./entities/directory-field.entity";
import { DirectoryEntry } from "./entities/directory-entry.entity";
import { DirectorySource } from "./entities/directory-source.entity";
import { DirectorySyncLog } from "./entities/directory-sync-log.entity";
import { DirectoryEntryAudit } from "./entities/directory-entry-audit.entity";
import { DirectoryPermission } from "./entities/directory-permission.entity";
import { DirectoryEvent } from "./entities/directory-event.entity";
import { Webhook } from "./entities/webhook.entity";
import { WebhookDelivery } from "./entities/webhook-delivery.entity";
import { WebhookDeadLetter } from "./entities/webhook-dead-letter.entity";
import { ImportJob } from "./entities/import-job.entity";
import { ImportTemplate } from "./entities/import-template.entity";
import { UserRecentSelection } from "./entities/user-recent-selection.entity";
import { DirectoryStats } from "./entities/directory-stats.entity";

// Services
import { DirectoryService } from "./services/directory.service";
import { EntryService } from "./services/entry.service";
import { SearchService } from "./services/search.service";
import { ImportService } from "./services/import.service";
import { SyncService } from "./services/sync.service";
import { PermissionService } from "./services/permission.service";
import { ValidationService } from "./services/validation.service";
import { EventService } from "./services/event.service";
import { WebhookService } from "./services/webhook.service";
import { AuditService } from "./services/audit.service";

// Controllers
import { DirectoriesController } from "./controllers/directories.controller";
import { EntriesController } from "./controllers/entries.controller";
import { SearchController } from "./controllers/search.controller";
import { BulkController } from "./controllers/bulk.controller";
import { SyncController } from "./controllers/sync.controller";

// Guards
import { RbacGuard } from "./guards/rbac.guard";

// Jobs
import { SyncScheduler } from "./jobs/sync.scheduler";
import { WebhookWorker } from "./jobs/webhook.worker";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Directory,
      DirectoryField,
      DirectoryEntry,
      DirectorySource,
      DirectorySyncLog,
      DirectoryEntryAudit,
      DirectoryPermission,
      DirectoryEvent,
      Webhook,
      WebhookDelivery,
      WebhookDeadLetter,
      ImportJob,
      ImportTemplate,
      UserRecentSelection,
      DirectoryStats,
    ]),
    BullModule.registerQueue(
      { name: "sync" },
      { name: "webhooks" },
      { name: "import" },
    ),
  ],
  controllers: [
    DirectoriesController,
    EntriesController,
    SearchController,
    BulkController,
    SyncController,
  ],
  providers: [
    // Services
    DirectoryService,
    EntryService,
    SearchService,
    ImportService,
    SyncService,
    PermissionService,
    ValidationService,
    EventService,
    WebhookService,
    AuditService,
    // Guards
    RbacGuard,
    // Jobs
    SyncScheduler,
    WebhookWorker,
  ],
  exports: [DirectoryService, EntryService, SearchService, PermissionService],
})
export class DirectoriesModule {}
```

---

**Конец Appendix E**
