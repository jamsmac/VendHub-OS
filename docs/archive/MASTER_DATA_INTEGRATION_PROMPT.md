# Master Data Integration Prompt для VendHub OS

**Версия:** 1.0
**Дата:** Февраль 2026
**Цель:** Интеграция системы Master Data в существующий VendHub OS

---

## Обзор интеграции

### Что уже есть в VendHub OS:
- Базовые справочники: `products`, `machines`, `ingredients`, `employees`
- Система ролей и прав доступа
- Drizzle ORM + MySQL
- tRPC API

### Что добавит Master Data:
- Универсальный конструктор справочников (Directory Builder)
- Паттерн OFFICIAL/LOCAL для внешних данных
- Иерархические справочники с parent_id
- Версионирование и аудит изменений
- Inline Create в формах
- Автосинхронизация внешних справочников (ИКПУ, МФО банков)

---

## ЧАСТЬ 1: Схема базы данных (Drizzle ORM)

### 1.1 Новые таблицы

```typescript
// packages/database/src/schema/directories.ts

import {
  mysqlTable, varchar, text, int, boolean, timestamp,
  json, mysqlEnum, index, uniqueIndex
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// ============================================
// ENUMS
// ============================================

export const directoryTypeEnum = mysqlEnum('directory_type', [
  'MANUAL',    // Внутренний справочник
  'EXTERNAL',  // Внешний с автосинхронизацией
  'PARAM',     // Параметрический (для SELECT полей)
  'TEMPLATE'   // Из шаблона
]);

export const directoryScopeEnum = mysqlEnum('directory_scope', [
  'HQ',           // Уровень всей платформы
  'ORGANIZATION', // Уровень организации
  'LOCATION'      // Уровень локации
]);

export const dataOriginEnum = mysqlEnum('data_origin', [
  'OFFICIAL', // Официальные данные (read-only)
  'LOCAL'     // Локальные дополнения (editable)
]);

export const entryStatusEnum = mysqlEnum('entry_status', [
  'ACTIVE',
  'ARCHIVED',
  'PENDING_APPROVAL'
]);

export const fieldTypeEnum = mysqlEnum('field_type', [
  'TEXT',
  'NUMBER',
  'DATE',
  'DATETIME',
  'BOOLEAN',
  'SELECT_SINGLE',
  'SELECT_MULTI',
  'REF',        // Ссылка на другой справочник
  'JSON',
  'FILE',
  'IMAGE'
]);

// ============================================
// DIRECTORIES (Метаданные справочников)
// ============================================

export const directories = mysqlTable('directories', {
  id: int('id').autoincrement().primaryKey(),

  // Основные поля
  name: varchar('name', { length: 128 }).notNull(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  description: text('description'),
  icon: varchar('icon', { length: 32 }),

  // Тип и область
  type: directoryTypeEnum.notNull().default('MANUAL'),
  scope: directoryScopeEnum.notNull().default('HQ'),
  organizationId: int('organization_id'),
  locationId: int('location_id'),

  // Флаги
  isHierarchical: boolean('is_hierarchical').default(false),
  isSystem: boolean('is_system').default(false), // Нельзя удалить

  // Настройки (JSONB)
  settings: json('settings').$type<DirectorySettings>().default({
    allowInlineCreate: true,
    allowLocalOverlay: true,
    approvalRequired: false,
    prefetch: false,
    offlineEnabled: false,
    offlineMaxEntries: 1000
  }),

  // Аудит
  createdBy: int('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  slugIdx: uniqueIndex('idx_directories_slug').on(table.slug),
  typeIdx: index('idx_directories_type').on(table.type),
  scopeOrgIdx: index('idx_directories_scope_org').on(table.scope, table.organizationId),
}));

// ============================================
// DIRECTORY_FIELDS (Поля справочника)
// ============================================

export const directoryFields = mysqlTable('directory_fields', {
  id: int('id').autoincrement().primaryKey(),
  directoryId: int('directory_id').notNull().references(() => directories.id, { onDelete: 'cascade' }),

  // Основные
  name: varchar('name', { length: 64 }).notNull(),        // code
  displayName: varchar('display_name', { length: 128 }).notNull(), // Отображаемое имя
  fieldType: fieldTypeEnum.notNull(),

  // Для SELECT/REF типов
  refDirectoryId: int('ref_directory_id').references(() => directories.id),
  refDisplayField: varchar('ref_display_field', { length: 64 }), // Какое поле показывать

  // Флаги
  isRequired: boolean('is_required').default(false),
  isUnique: boolean('is_unique').default(false),
  showInList: boolean('show_in_list').default(true),
  showInCard: boolean('show_in_card').default(true),
  allowFreeInput: boolean('allow_free_input').default(false), // Для SELECT

  // Порядок
  sortOrder: int('sort_order').default(0),

  // Валидация (JSON)
  validationRules: json('validation_rules').$type<ValidationRules>(),

  // Значение по умолчанию
  defaultValue: text('default_value'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  dirFieldIdx: index('idx_directory_fields_dir').on(table.directoryId),
  sortIdx: index('idx_directory_fields_sort').on(table.directoryId, table.sortOrder),
}));

// ============================================
// DIRECTORY_ENTRIES (Записи справочника)
// ============================================

export const directoryEntries = mysqlTable('directory_entries', {
  id: int('id').autoincrement().primaryKey(),
  directoryId: int('directory_id').notNull().references(() => directories.id, { onDelete: 'cascade' }),

  // Для иерархии
  parentId: int('parent_id').references((): any => directoryEntries.id),
  path: varchar('path', { length: 512 }), // Materialized path: /1/5/12/
  depth: int('depth').default(0),

  // Основные поля
  name: varchar('name', { length: 256 }).notNull(),
  normalizedName: varchar('normalized_name', { length: 256 }), // Для поиска (lowercase, без пробелов)
  code: varchar('code', { length: 64 }),

  // Происхождение данных
  origin: dataOriginEnum.notNull().default('LOCAL'),
  officialId: varchar('official_id', { length: 128 }), // ID из внешнего источника

  // Статус
  status: entryStatusEnum.notNull().default('ACTIVE'),

  // Мультиязычность
  translations: json('translations').$type<Record<string, string>>(),

  // Динамические данные (все кастомные поля)
  data: json('data').$type<Record<string, any>>().default({}),

  // Полнотекстовый поиск (для MySQL FULLTEXT)
  searchText: text('search_text'),

  // Порядок сортировки
  sortOrder: int('sort_order').default(0),

  // Аудит
  createdBy: int('created_by'),
  updatedBy: int('updated_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  dirIdx: index('idx_entries_directory').on(table.directoryId),
  codeIdx: index('idx_entries_code').on(table.directoryId, table.code),
  parentIdx: index('idx_entries_parent').on(table.parentId),
  originIdx: index('idx_entries_origin').on(table.directoryId, table.origin),
  statusIdx: index('idx_entries_status').on(table.directoryId, table.status),
  // FULLTEXT для searchText добавляется отдельно
}));

// ============================================
// DIRECTORY_SOURCES (Источники внешних данных)
// ============================================

export const directorySources = mysqlTable('directory_sources', {
  id: int('id').autoincrement().primaryKey(),
  directoryId: int('directory_id').notNull().references(() => directories.id, { onDelete: 'cascade' }),

  // Тип источника
  sourceType: mysqlEnum('source_type', ['URL', 'API', 'FILE', 'TEXT']).notNull(),

  // Настройки подключения
  url: varchar('url', { length: 512 }),
  authType: mysqlEnum('auth_type', ['NONE', 'BEARER', 'BASIC', 'API_KEY']).default('NONE'),
  authCredentials: json('auth_credentials'), // Зашифрованные

  // Маппинг колонок
  columnMapping: json('column_mapping').$type<ColumnMapping[]>().default([]),
  uniqueKeyField: varchar('unique_key_field', { length: 64 }), // Поле для определения уникальности

  // Расписание
  schedule: varchar('schedule', { length: 64 }), // Cron: "0 0 * * *"
  isActive: boolean('is_active').default(true),

  // Статистика
  lastSyncAt: timestamp('last_sync_at'),
  lastSyncStatus: mysqlEnum('last_sync_status', ['SUCCESS', 'FAILED', 'PARTIAL']),
  lastSyncCount: int('last_sync_count').default(0),
  lastSyncError: text('last_sync_error'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ============================================
// DIRECTORY_SYNC_LOGS (Логи синхронизации)
// ============================================

export const directorySyncLogs = mysqlTable('directory_sync_logs', {
  id: int('id').autoincrement().primaryKey(),
  sourceId: int('source_id').notNull().references(() => directorySources.id, { onDelete: 'cascade' }),

  startedAt: timestamp('started_at').notNull(),
  finishedAt: timestamp('finished_at'),

  status: mysqlEnum('status', ['RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL']).notNull(),

  // Статистика
  totalRecords: int('total_records').default(0),
  insertedCount: int('inserted_count').default(0),
  updatedCount: int('updated_count').default(0),
  skippedCount: int('skipped_count').default(0),
  errorCount: int('error_count').default(0),

  // Детали ошибок
  errorDetails: json('error_details').$type<SyncError[]>(),

  triggeredBy: mysqlEnum('triggered_by', ['CRON', 'MANUAL', 'WEBHOOK']).default('MANUAL'),
  triggeredByUserId: int('triggered_by_user_id'),
});

// ============================================
// DIRECTORY_ENTRY_AUDIT (Аудит изменений)
// ============================================

export const directoryEntryAudit = mysqlTable('directory_entry_audit', {
  id: int('id').autoincrement().primaryKey(),
  entryId: int('entry_id').notNull().references(() => directoryEntries.id, { onDelete: 'cascade' }),

  action: mysqlEnum('action', ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'ARCHIVE']).notNull(),

  // Что изменилось
  changedFields: json('changed_fields').$type<string[]>(),
  oldValues: json('old_values').$type<Record<string, any>>(),
  newValues: json('new_values').$type<Record<string, any>>(),

  // Кто изменил
  userId: int('user_id'),
  userIp: varchar('user_ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 256 }),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  entryIdx: index('idx_audit_entry').on(table.entryId),
  createdIdx: index('idx_audit_created').on(table.createdAt),
}));

// ============================================
// RELATIONS
// ============================================

export const directoriesRelations = relations(directories, ({ many, one }) => ({
  fields: many(directoryFields),
  entries: many(directoryEntries),
  sources: many(directorySources),
}));

export const directoryFieldsRelations = relations(directoryFields, ({ one }) => ({
  directory: one(directories, {
    fields: [directoryFields.directoryId],
    references: [directories.id],
  }),
  refDirectory: one(directories, {
    fields: [directoryFields.refDirectoryId],
    references: [directories.id],
  }),
}));

export const directoryEntriesRelations = relations(directoryEntries, ({ one, many }) => ({
  directory: one(directories, {
    fields: [directoryEntries.directoryId],
    references: [directories.id],
  }),
  parent: one(directoryEntries, {
    fields: [directoryEntries.parentId],
    references: [directoryEntries.id],
  }),
  children: many(directoryEntries),
  auditLogs: many(directoryEntryAudit),
}));

// ============================================
// TYPES
// ============================================

export interface DirectorySettings {
  allowInlineCreate: boolean;
  allowLocalOverlay: boolean;
  approvalRequired: boolean;
  prefetch: boolean;
  offlineEnabled: boolean;
  offlineMaxEntries: number;
}

export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  customValidator?: string;
}

export interface ColumnMapping {
  sourceField: string;
  targetField: string;
  transform?: 'LOWERCASE' | 'UPPERCASE' | 'TRIM' | 'DATE_PARSE';
}

export interface SyncError {
  row: number;
  field?: string;
  error: string;
  data?: any;
}
```

---

## ЧАСТЬ 2: tRPC API Router

```typescript
// apps/api/src/modules/directories/directories.router.ts

import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../../trpc';
import { DirectoriesService } from './directories.service';
import { TRPCError } from '@trpc/server';

// ============================================
// INPUT SCHEMAS
// ============================================

const createDirectorySchema = z.object({
  name: z.string().min(2).max(128),
  slug: z.string().min(2).max(64).regex(/^[a-z][a-z0-9_]*$/),
  description: z.string().optional(),
  icon: z.string().max(32).optional(),
  type: z.enum(['MANUAL', 'EXTERNAL', 'PARAM', 'TEMPLATE']),
  scope: z.enum(['HQ', 'ORGANIZATION', 'LOCATION']).default('HQ'),
  isHierarchical: z.boolean().default(false),
  settings: z.object({
    allowInlineCreate: z.boolean().default(true),
    allowLocalOverlay: z.boolean().default(true),
    approvalRequired: z.boolean().default(false),
    prefetch: z.boolean().default(false),
    offlineEnabled: z.boolean().default(false),
    offlineMaxEntries: z.number().default(1000),
  }).optional(),
  fields: z.array(z.object({
    name: z.string(),
    displayName: z.string(),
    fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'DATETIME', 'BOOLEAN',
                       'SELECT_SINGLE', 'SELECT_MULTI', 'REF', 'JSON', 'FILE', 'IMAGE']),
    refDirectoryId: z.number().optional(),
    isRequired: z.boolean().default(false),
    isUnique: z.boolean().default(false),
    showInList: z.boolean().default(true),
    sortOrder: z.number().default(0),
    validationRules: z.any().optional(),
    defaultValue: z.string().optional(),
  })).optional(),
});

const createEntrySchema = z.object({
  directoryId: z.number(),
  parentId: z.number().optional(),
  name: z.string().min(1).max(256),
  code: z.string().max(64).optional(),
  data: z.record(z.any()).default({}),
  translations: z.record(z.string()).optional(),
});

const updateEntrySchema = createEntrySchema.partial().extend({
  id: z.number(),
});

const listEntriesSchema = z.object({
  directoryId: z.number().optional(),
  directorySlug: z.string().optional(),
  parentId: z.number().nullable().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'PENDING_APPROVAL']).optional(),
  origin: z.enum(['OFFICIAL', 'LOCAL']).optional(),
  search: z.string().optional(),
  page: z.number().default(1),
  limit: z.number().default(50).max(200),
  sortBy: z.string().default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ============================================
// ROUTER
// ============================================

export const directoriesRouter = router({
  // ==========================================
  // DIRECTORIES CRUD
  // ==========================================

  list: protectedProcedure
    .input(z.object({
      type: z.enum(['MANUAL', 'EXTERNAL', 'PARAM', 'TEMPLATE']).optional(),
      scope: z.enum(['HQ', 'ORGANIZATION', 'LOCATION']).optional(),
      includeSystem: z.boolean().default(true),
    }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.directoriesService.listDirectories(input);
    }),

  getById: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return ctx.directoriesService.getDirectoryById(input);
    }),

  getBySlug: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.directoriesService.getDirectoryBySlug(input);
    }),

  create: adminProcedure
    .input(createDirectorySchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.directoriesService.createDirectory(input, ctx.user.id);
    }),

  update: adminProcedure
    .input(createDirectorySchema.partial().extend({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.directoriesService.updateDirectory(input);
    }),

  delete: adminProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      return ctx.directoriesService.softDeleteDirectory(input);
    }),

  // ==========================================
  // ENTRIES CRUD
  // ==========================================

  entries: router({
    list: protectedProcedure
      .input(listEntriesSchema)
      .query(async ({ ctx, input }) => {
        return ctx.directoriesService.listEntries(input);
      }),

    getById: protectedProcedure
      .input(z.number())
      .query(async ({ ctx, input }) => {
        return ctx.directoriesService.getEntryById(input);
      }),

    create: protectedProcedure
      .input(createEntrySchema)
      .mutation(async ({ ctx, input }) => {
        // Проверка прав на создание
        const directory = await ctx.directoriesService.getDirectoryById(input.directoryId);
        if (!directory) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Directory not found' });
        }

        return ctx.directoriesService.createEntry(input, ctx.user.id);
      }),

    update: protectedProcedure
      .input(updateEntrySchema)
      .mutation(async ({ ctx, input }) => {
        // Проверка что запись не OFFICIAL
        const entry = await ctx.directoriesService.getEntryById(input.id);
        if (entry?.origin === 'OFFICIAL') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot modify OFFICIAL entries'
          });
        }

        return ctx.directoriesService.updateEntry(input, ctx.user.id);
      }),

    archive: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        return ctx.directoriesService.archiveEntry(input, ctx.user.id);
      }),

    restore: protectedProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        return ctx.directoriesService.restoreEntry(input, ctx.user.id);
      }),

    // Inline Create (быстрое создание из формы)
    inlineCreate: protectedProcedure
      .input(z.object({
        directorySlug: z.string(),
        name: z.string().min(1),
        code: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const directory = await ctx.directoriesService.getDirectoryBySlug(input.directorySlug);
        if (!directory) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        if (!directory.settings?.allowInlineCreate) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Inline create disabled' });
        }

        return ctx.directoriesService.createEntry({
          directoryId: directory.id,
          name: input.name,
          code: input.code,
          data: {},
        }, ctx.user.id);
      }),
  }),

  // ==========================================
  // SYNC (для EXTERNAL справочников)
  // ==========================================

  sync: router({
    trigger: adminProcedure
      .input(z.number()) // directoryId
      .mutation(async ({ ctx, input }) => {
        return ctx.directoriesService.triggerSync(input, ctx.user.id);
      }),

    status: protectedProcedure
      .input(z.number()) // directoryId
      .query(async ({ ctx, input }) => {
        return ctx.directoriesService.getSyncStatus(input);
      }),

    logs: protectedProcedure
      .input(z.object({
        directoryId: z.number(),
        limit: z.number().default(10),
      }))
      .query(async ({ ctx, input }) => {
        return ctx.directoriesService.getSyncLogs(input.directoryId, input.limit);
      }),
  }),

  // ==========================================
  // SEARCH
  // ==========================================

  search: protectedProcedure
    .input(z.object({
      directorySlug: z.string(),
      query: z.string().min(1),
      limit: z.number().default(20),
      excludeIds: z.array(z.number()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.directoriesService.searchEntries(input);
    }),

  // ==========================================
  // HIERARCHY
  // ==========================================

  hierarchy: router({
    getTree: protectedProcedure
      .input(z.object({
        directoryId: z.number(),
        parentId: z.number().nullable().optional(),
        maxDepth: z.number().default(3),
      }))
      .query(async ({ ctx, input }) => {
        return ctx.directoriesService.getHierarchyTree(input);
      }),

    moveEntry: adminProcedure
      .input(z.object({
        entryId: z.number(),
        newParentId: z.number().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.directoriesService.moveEntry(input.entryId, input.newParentId);
      }),
  }),
});
```

---

## ЧАСТЬ 3: Сервис

```typescript
// apps/api/src/modules/directories/directories.service.ts

import { Injectable } from '@nestjs/common';
import { eq, and, like, isNull, desc, asc, sql, inArray } from 'drizzle-orm';
import { db } from '../../database';
import {
  directories, directoryFields, directoryEntries,
  directoryEntryAudit, directorySources, directorySyncLogs
} from '../../database/schema';

@Injectable()
export class DirectoriesService {

  // ==========================================
  // DIRECTORIES
  // ==========================================

  async listDirectories(options?: {
    type?: 'MANUAL' | 'EXTERNAL' | 'PARAM' | 'TEMPLATE';
    scope?: 'HQ' | 'ORGANIZATION' | 'LOCATION';
    includeSystem?: boolean;
  }) {
    const conditions = [isNull(directories.deletedAt)];

    if (options?.type) {
      conditions.push(eq(directories.type, options.type));
    }
    if (options?.scope) {
      conditions.push(eq(directories.scope, options.scope));
    }
    if (!options?.includeSystem) {
      conditions.push(eq(directories.isSystem, false));
    }

    return db.query.directories.findMany({
      where: and(...conditions),
      with: {
        fields: {
          orderBy: (f, { asc }) => [asc(f.sortOrder)],
        },
      },
      orderBy: [asc(directories.name)],
    });
  }

  async getDirectoryById(id: number) {
    return db.query.directories.findFirst({
      where: and(eq(directories.id, id), isNull(directories.deletedAt)),
      with: {
        fields: { orderBy: (f, { asc }) => [asc(f.sortOrder)] },
        sources: true,
      },
    });
  }

  async getDirectoryBySlug(slug: string) {
    return db.query.directories.findFirst({
      where: and(eq(directories.slug, slug), isNull(directories.deletedAt)),
      with: {
        fields: { orderBy: (f, { asc }) => [asc(f.sortOrder)] },
      },
    });
  }

  async createDirectory(input: any, userId: number) {
    return db.transaction(async (tx) => {
      // 1. Создаём справочник
      const [dir] = await tx.insert(directories).values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        icon: input.icon,
        type: input.type,
        scope: input.scope,
        isHierarchical: input.isHierarchical,
        settings: input.settings,
        createdBy: userId,
      });

      const directoryId = dir.insertId;

      // 2. Создаём поля если переданы
      if (input.fields?.length) {
        await tx.insert(directoryFields).values(
          input.fields.map((f: any, idx: number) => ({
            directoryId,
            name: f.name,
            displayName: f.displayName,
            fieldType: f.fieldType,
            refDirectoryId: f.refDirectoryId,
            isRequired: f.isRequired,
            isUnique: f.isUnique,
            showInList: f.showInList,
            sortOrder: f.sortOrder ?? idx,
            validationRules: f.validationRules,
            defaultValue: f.defaultValue,
          }))
        );
      }

      return this.getDirectoryById(Number(directoryId));
    });
  }

  // ==========================================
  // ENTRIES
  // ==========================================

  async listEntries(input: {
    directoryId?: number;
    directorySlug?: string;
    parentId?: number | null;
    status?: string;
    origin?: string;
    search?: string;
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }) {
    let dirId = input.directoryId;

    // Получаем directoryId по slug если нужно
    if (!dirId && input.directorySlug) {
      const dir = await this.getDirectoryBySlug(input.directorySlug);
      if (!dir) throw new Error('Directory not found');
      dirId = dir.id;
    }

    if (!dirId) throw new Error('directoryId or directorySlug required');

    const conditions = [
      eq(directoryEntries.directoryId, dirId),
      isNull(directoryEntries.deletedAt),
    ];

    // Фильтр по parentId (null = корневые элементы)
    if (input.parentId === null) {
      conditions.push(isNull(directoryEntries.parentId));
    } else if (input.parentId !== undefined) {
      conditions.push(eq(directoryEntries.parentId, input.parentId));
    }

    if (input.status) {
      conditions.push(eq(directoryEntries.status, input.status as any));
    }
    if (input.origin) {
      conditions.push(eq(directoryEntries.origin, input.origin as any));
    }
    if (input.search) {
      conditions.push(like(directoryEntries.normalizedName, `%${input.search.toLowerCase()}%`));
    }

    const offset = (input.page - 1) * input.limit;

    const [items, countResult] = await Promise.all([
      db.query.directoryEntries.findMany({
        where: and(...conditions),
        limit: input.limit,
        offset,
        orderBy: input.sortOrder === 'asc'
          ? [asc(directoryEntries[input.sortBy as keyof typeof directoryEntries] || directoryEntries.sortOrder)]
          : [desc(directoryEntries[input.sortBy as keyof typeof directoryEntries] || directoryEntries.sortOrder)],
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(directoryEntries)
        .where(and(...conditions)),
    ]);

    return {
      items,
      total: countResult[0]?.count || 0,
      page: input.page,
      limit: input.limit,
      totalPages: Math.ceil((countResult[0]?.count || 0) / input.limit),
    };
  }

  async getEntryById(id: number) {
    return db.query.directoryEntries.findFirst({
      where: and(eq(directoryEntries.id, id), isNull(directoryEntries.deletedAt)),
      with: {
        directory: true,
        parent: true,
        children: {
          where: isNull(directoryEntries.deletedAt),
        },
      },
    });
  }

  async createEntry(input: any, userId: number) {
    return db.transaction(async (tx) => {
      // Определяем path и depth для иерархии
      let path = '/';
      let depth = 0;

      if (input.parentId) {
        const parent = await this.getEntryById(input.parentId);
        if (parent) {
          path = `${parent.path}${parent.id}/`;
          depth = (parent.depth || 0) + 1;
        }
      }

      const normalizedName = input.name.toLowerCase().trim();

      const [result] = await tx.insert(directoryEntries).values({
        directoryId: input.directoryId,
        parentId: input.parentId || null,
        path,
        depth,
        name: input.name,
        normalizedName,
        code: input.code,
        origin: 'LOCAL',
        status: 'ACTIVE',
        data: input.data || {},
        translations: input.translations,
        searchText: `${input.name} ${input.code || ''} ${Object.values(input.data || {}).join(' ')}`,
        createdBy: userId,
      });

      const entryId = result.insertId;

      // Аудит
      await tx.insert(directoryEntryAudit).values({
        entryId: Number(entryId),
        action: 'CREATE',
        newValues: input,
        userId,
      });

      return this.getEntryById(Number(entryId));
    });
  }

  async updateEntry(input: any, userId: number) {
    const entry = await this.getEntryById(input.id);
    if (!entry) throw new Error('Entry not found');

    const oldValues = {
      name: entry.name,
      code: entry.code,
      data: entry.data,
    };

    const changedFields: string[] = [];
    const updates: any = { updatedBy: userId };

    if (input.name !== undefined && input.name !== entry.name) {
      updates.name = input.name;
      updates.normalizedName = input.name.toLowerCase().trim();
      changedFields.push('name');
    }
    if (input.code !== undefined && input.code !== entry.code) {
      updates.code = input.code;
      changedFields.push('code');
    }
    if (input.data !== undefined) {
      updates.data = { ...entry.data, ...input.data };
      changedFields.push('data');
    }
    if (input.translations !== undefined) {
      updates.translations = input.translations;
      changedFields.push('translations');
    }

    await db.transaction(async (tx) => {
      await tx.update(directoryEntries)
        .set(updates)
        .where(eq(directoryEntries.id, input.id));

      // Аудит
      await tx.insert(directoryEntryAudit).values({
        entryId: input.id,
        action: 'UPDATE',
        changedFields,
        oldValues,
        newValues: updates,
        userId,
      });
    });

    return this.getEntryById(input.id);
  }

  async archiveEntry(id: number, userId: number) {
    await db.transaction(async (tx) => {
      await tx.update(directoryEntries)
        .set({ status: 'ARCHIVED', updatedBy: userId })
        .where(eq(directoryEntries.id, id));

      await tx.insert(directoryEntryAudit).values({
        entryId: id,
        action: 'ARCHIVE',
        userId,
      });
    });

    return { success: true };
  }

  async restoreEntry(id: number, userId: number) {
    await db.transaction(async (tx) => {
      await tx.update(directoryEntries)
        .set({ status: 'ACTIVE', updatedBy: userId })
        .where(eq(directoryEntries.id, id));

      await tx.insert(directoryEntryAudit).values({
        entryId: id,
        action: 'RESTORE',
        userId,
      });
    });

    return { success: true };
  }

  // ==========================================
  // SEARCH
  // ==========================================

  async searchEntries(input: {
    directorySlug: string;
    query: string;
    limit: number;
    excludeIds?: number[];
  }) {
    const directory = await this.getDirectoryBySlug(input.directorySlug);
    if (!directory) throw new Error('Directory not found');

    const conditions = [
      eq(directoryEntries.directoryId, directory.id),
      eq(directoryEntries.status, 'ACTIVE'),
      isNull(directoryEntries.deletedAt),
      like(directoryEntries.normalizedName, `%${input.query.toLowerCase()}%`),
    ];

    if (input.excludeIds?.length) {
      // NOT IN excludeIds
    }

    return db.query.directoryEntries.findMany({
      where: and(...conditions),
      limit: input.limit,
      orderBy: [asc(directoryEntries.name)],
    });
  }

  // ==========================================
  // SYNC
  // ==========================================

  async triggerSync(directoryId: number, userId: number) {
    // Логика синхронизации с внешним источником
    // Здесь будет реализация загрузки данных из URL/API/файла
    // и обновление записей с origin='OFFICIAL'

    return { status: 'STARTED', message: 'Sync started' };
  }

  async getSyncStatus(directoryId: number) {
    const source = await db.query.directorySources.findFirst({
      where: eq(directorySources.directoryId, directoryId),
    });

    return {
      lastSyncAt: source?.lastSyncAt,
      lastSyncStatus: source?.lastSyncStatus,
      lastSyncCount: source?.lastSyncCount,
      isActive: source?.isActive,
    };
  }

  async getSyncLogs(directoryId: number, limit: number) {
    const source = await db.query.directorySources.findFirst({
      where: eq(directorySources.directoryId, directoryId),
    });

    if (!source) return [];

    return db.query.directorySyncLogs.findMany({
      where: eq(directorySyncLogs.sourceId, source.id),
      limit,
      orderBy: [desc(directorySyncLogs.startedAt)],
    });
  }

  // ==========================================
  // HIERARCHY
  // ==========================================

  async getHierarchyTree(input: {
    directoryId: number;
    parentId?: number | null;
    maxDepth: number;
  }) {
    const buildTree = async (parentId: number | null, currentDepth: number): Promise<any[]> => {
      if (currentDepth >= input.maxDepth) return [];

      const entries = await db.query.directoryEntries.findMany({
        where: and(
          eq(directoryEntries.directoryId, input.directoryId),
          parentId === null
            ? isNull(directoryEntries.parentId)
            : eq(directoryEntries.parentId, parentId),
          eq(directoryEntries.status, 'ACTIVE'),
          isNull(directoryEntries.deletedAt),
        ),
        orderBy: [asc(directoryEntries.sortOrder), asc(directoryEntries.name)],
      });

      return Promise.all(entries.map(async (entry) => ({
        ...entry,
        children: await buildTree(entry.id, currentDepth + 1),
      })));
    };

    return buildTree(input.parentId ?? null, 0);
  }

  async moveEntry(entryId: number, newParentId: number | null) {
    const entry = await this.getEntryById(entryId);
    if (!entry) throw new Error('Entry not found');

    let newPath = '/';
    let newDepth = 0;

    if (newParentId) {
      const newParent = await this.getEntryById(newParentId);
      if (!newParent) throw new Error('New parent not found');
      if (newParent.directoryId !== entry.directoryId) {
        throw new Error('Cannot move to different directory');
      }
      newPath = `${newParent.path}${newParent.id}/`;
      newDepth = (newParent.depth || 0) + 1;
    }

    await db.update(directoryEntries)
      .set({ parentId: newParentId, path: newPath, depth: newDepth })
      .where(eq(directoryEntries.id, entryId));

    // TODO: Обновить path и depth для всех потомков

    return this.getEntryById(entryId);
  }
}
```

---

## ЧАСТЬ 4: React компоненты

### 4.1 DirectorySelect (с Inline Create)

```tsx
// apps/web/src/components/directories/DirectorySelect.tsx

import { useState, useCallback } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { useDebounce } from '@/hooks/useDebounce';

interface DirectorySelectProps {
  directorySlug: string;
  value?: number | null;
  onChange: (value: number | null, entry?: any) => void;
  placeholder?: string;
  disabled?: boolean;
  allowInlineCreate?: boolean;
  showOriginBadge?: boolean;
  className?: string;
}

export function DirectorySelect({
  directorySlug,
  value,
  onChange,
  placeholder = 'Выберите...',
  disabled = false,
  allowInlineCreate = true,
  showOriginBadge = true,
  className,
}: DirectorySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newEntryName, setNewEntryName] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  // Получаем метаданные справочника
  const { data: directory } = trpc.directories.getBySlug.useQuery(directorySlug);

  // Поиск записей
  const { data: searchResults, isLoading: isSearching } = trpc.directories.search.useQuery(
    { directorySlug, query: debouncedSearch, limit: 20 },
    { enabled: debouncedSearch.length > 0 }
  );

  // Список записей (для пустого поиска)
  const { data: entriesData, isLoading: isLoadingEntries } = trpc.directories.entries.list.useQuery(
    { directorySlug, status: 'ACTIVE', limit: 50 },
    { enabled: !debouncedSearch }
  );

  // Текущая выбранная запись
  const { data: selectedEntry } = trpc.directories.entries.getById.useQuery(
    value!,
    { enabled: !!value }
  );

  // Inline Create мутация
  const inlineCreateMutation = trpc.directories.entries.inlineCreate.useMutation({
    onSuccess: (newEntry) => {
      onChange(newEntry.id, newEntry);
      setCreateDialogOpen(false);
      setNewEntryName('');
      setOpen(false);
    },
  });

  const entries = debouncedSearch ? searchResults : entriesData?.items;
  const isLoading = isSearching || isLoadingEntries;

  const canCreate = allowInlineCreate && directory?.settings?.allowInlineCreate;

  const handleCreateClick = useCallback(() => {
    setNewEntryName(search);
    setCreateDialogOpen(true);
  }, [search]);

  const handleCreate = useCallback(() => {
    if (!newEntryName.trim()) return;
    inlineCreateMutation.mutate({
      directorySlug,
      name: newEntryName.trim(),
    });
  }, [directorySlug, newEntryName, inlineCreateMutation]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn('w-full justify-between', className)}
          >
            {selectedEntry ? (
              <span className="flex items-center gap-2">
                {selectedEntry.name}
                {showOriginBadge && selectedEntry.origin === 'OFFICIAL' && (
                  <Badge variant="secondary" className="text-xs">Официальный</Badge>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Поиск..."
              value={search}
              onValueChange={setSearch}
            />

            <CommandList>
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}

              {!isLoading && entries?.length === 0 && (
                <CommandEmpty>
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Ничего не найдено</p>
                    {canCreate && search && (
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2"
                        onClick={handleCreateClick}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Создать "{search}"
                      </Button>
                    )}
                  </div>
                </CommandEmpty>
              )}

              {!isLoading && entries && entries.length > 0 && (
                <CommandGroup>
                  {entries.map((entry: any) => (
                    <CommandItem
                      key={entry.id}
                      value={entry.id.toString()}
                      onSelect={() => {
                        onChange(entry.id, entry);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === entry.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="flex-1">{entry.name}</span>
                      {entry.code && (
                        <span className="text-xs text-muted-foreground">{entry.code}</span>
                      )}
                      {showOriginBadge && entry.origin === 'OFFICIAL' && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Официальный
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {canCreate && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem onSelect={handleCreateClick}>
                      <Plus className="mr-2 h-4 w-4" />
                      Создать новую запись
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Диалог Inline Create */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать запись в "{directory?.name}"</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="entry-name">Название</Label>
              <Input
                id="entry-name"
                value={newEntryName}
                onChange={(e) => setNewEntryName(e.target.value)}
                placeholder="Введите название..."
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newEntryName.trim() || inlineCreateMutation.isPending}
            >
              {inlineCreateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## ЧАСТЬ 5: Миграция существующих справочников

### Порядок миграции:

1. **Создать системные справочники** (PARAM):
```sql
-- Единицы измерения
INSERT INTO directories (name, slug, type, scope, is_system)
VALUES ('Единицы измерения', 'units', 'PARAM', 'HQ', true);

-- Категории товаров
INSERT INTO directories (name, slug, type, scope, is_system)
VALUES ('Категории товаров', 'product_categories', 'PARAM', 'HQ', true);

-- Типы автоматов
INSERT INTO directories (name, slug, type, scope, is_system)
VALUES ('Типы автоматов', 'machine_types', 'PARAM', 'HQ', true);

-- Производители
INSERT INTO directories (name, slug, type, scope, is_system)
VALUES ('Производители', 'manufacturers', 'PARAM', 'HQ', true);

-- Типы контрагентов
INSERT INTO directories (name, slug, type, scope, is_system)
VALUES ('Типы контрагентов', 'contractor_types', 'PARAM', 'HQ', true);

-- Типы локаций
INSERT INTO directories (name, slug, type, scope, is_system)
VALUES ('Типы локаций', 'location_types', 'PARAM', 'HQ', true);
```

2. **Seed начальные данные**:
```typescript
// seeds/directories.seed.ts

const systemDirectories = [
  {
    slug: 'units',
    entries: [
      { name: 'Штука', code: 'pcs' },
      { name: 'Грамм', code: 'g' },
      { name: 'Килограмм', code: 'kg' },
      { name: 'Миллилитр', code: 'ml' },
      { name: 'Литр', code: 'l' },
      { name: 'Метр', code: 'm' },
      { name: 'Порция', code: 'portion' },
    ],
  },
  {
    slug: 'product_categories',
    entries: [
      { name: 'Кофе', code: 'coffee' },
      { name: 'Чай', code: 'tea' },
      { name: 'Снеки', code: 'snacks' },
      { name: 'Холодные напитки', code: 'cold_drinks' },
      { name: 'Прочее', code: 'other' },
    ],
  },
  // ... и т.д.
];
```

3. **Миграция существующих products → directories**:
```typescript
// Существующие товары преобразуем в записи справочника "goods"
await db.insert(directoryEntries).values(
  existingProducts.map(p => ({
    directoryId: goodsDirectoryId,
    name: p.name,
    code: p.slug,
    origin: 'LOCAL',
    status: 'ACTIVE',
    data: {
      category: p.category,
      price: p.price,
      imageUrl: p.imageUrl,
      isAvailable: p.isAvailable,
      calories: p.calories,
      volume: p.volume,
    },
  }))
);
```

---

## ЧАСТЬ 6: Checklist внедрения

### Backend:
- [ ] Создать схему таблиц (directories, directory_fields, directory_entries, etc.)
- [ ] Запустить миграцию `drizzle-kit push`
- [ ] Создать DirectoriesService
- [ ] Создать DirectoriesRouter (tRPC)
- [ ] Добавить роутер в appRouter
- [ ] Создать seed для системных справочников
- [ ] Добавить Cron job для синхронизации EXTERNAL справочников

### Frontend:
- [ ] Создать DirectorySelect компонент
- [ ] Создать DirectoryBuilder (Wizard) для админки
- [ ] Создать DirectoryEntriesList страницу
- [ ] Создать EntryCard компонент
- [ ] Интегрировать DirectorySelect в существующие формы

### Тестирование:
- [ ] Unit тесты для DirectoriesService
- [ ] Integration тесты для API
- [ ] E2E тесты для Inline Create

---

## Оценка времени

| Компонент | Часы |
|-----------|------|
| Database Schema + Migrations | 3-4 |
| tRPC API Router | 4-5 |
| DirectoriesService | 5-6 |
| DirectorySelect Component | 3-4 |
| DirectoryBuilder Wizard | 6-8 |
| Seed Data | 2-3 |
| Миграция существующих данных | 3-4 |
| Тестирование | 4-5 |
| **ИТОГО** | **30-39 часов** |

---

**Готово к реализации!**
