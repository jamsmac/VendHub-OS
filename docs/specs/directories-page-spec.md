# Directories (MDM) Page Specification

## Overview
Master Data Management - управление справочниками с EAV pattern.

## URL Structure
- `/dashboard/directories` - список справочников
- `/dashboard/directories/[id]` - записи справочника
- `/dashboard/directories/[id]/new` - новая запись
- `/dashboard/directories/[id]/[entryId]` - редактирование записи

## Entities
```typescript
interface Directory {
  id: string;
  organizationId: string;
  code: string;           // unique slug
  name: string;           // display name
  description: string;
  isSystem: boolean;      // built-in, can't delete
  isActive: boolean;
  entriesCount: number;
  fieldsCount: number;
  createdAt: string;
}

interface DirectoryField {
  id: string;
  directoryId: string;
  code: string;           // field key
  name: string;           // display label
  fieldType: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'reference';
  isRequired: boolean;
  isUnique: boolean;
  options: string[] | null;      // for select type
  referenceDirectoryId: string | null;  // for reference type
  sortOrder: number;
  validationRules: Record<string, any>;
}

interface DirectoryEntry {
  id: string;
  directoryId: string;
  values: Record<string, any>;  // { fieldCode: value }
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## Page: Directories List (`/dashboard/directories`)

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Справочники                              [+ Создать]        │
├─────────────────────────────────────────────────────────────┤
│ Search: [🔍 Поиск по названию...]                           │
├─────────────────────────────────────────────────────────────┤
│ Grid of Cards:                                               │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐    │
│ │ 📋 Бренды      │ │ 📋 Категории   │ │ 📋 Регионы     │    │
│ │ 45 записей    │ │ 12 записей    │ │ 8 записей     │    │
│ │ 4 поля        │ │ 3 поля        │ │ 5 полей       │    │
│ │ [Открыть]     │ │ [Открыть]     │ │ [Открыть]     │    │
│ └────────────────┘ └────────────────┘ └────────────────┘    │
│                                                              │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐    │
│ │ 📋 Поставщики  │ │ 📋 Единицы    │ │ 🔒 Статусы    │    │
│ │ 23 записей    │ │ 7 записей     │ │ 5 записей     │    │
│ │ 6 полей       │ │ 2 поля        │ │ 2 поля        │    │
│ │ [Открыть]     │ │ [Открыть]     │ │ [Системный]   │    │
│ └────────────────┘ └────────────────┘ └────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Directory Card
- Icon (📋 or 🔒 for system)
- Name
- Entries count
- Fields count
- Actions: Open, Edit (not for system), Delete (not for system)

## Page: Directory Entries (`/dashboard/directories/[id]`)

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [← Назад] Бренды                    [⚙️ Поля] [+ Добавить]  │
├─────────────────────────────────────────────────────────────┤
│ Search: [🔍 Поиск...]              Фильтр: [Активные ▼]     │
├─────────────────────────────────────────────────────────────┤
│ Table (dynamic columns based on fields):                     │
│ │ # │ Название │ Код │ Страна │ Активен │ Действия │        │
│ │ 1 │ Coca-Cola│ CC  │ США    │ ✓       │ ✏️ 🗑️    │        │
│ │ 2 │ Pepsi    │ PEP │ США    │ ✓       │ ✏️ 🗑️    │        │
│ │ 3 │ Fanta    │ FNT │ USA    │ ✓       │ ✏️ 🗑️    │        │
├─────────────────────────────────────────────────────────────┤
│ Pagination: [<] 1 2 3 [>]                                    │
└─────────────────────────────────────────────────────────────┘
```

### Dynamic Table
- Columns generated from DirectoryField[]
- Sortable by any column
- Inline edit for simple fields
- Reference fields show linked entry name

### Actions
- Edit → Opens edit modal/page
- Delete → Confirmation dialog
- Export → CSV/Excel
- Import → CSV upload with validation

## Modal: Edit Fields (`⚙️ Поля`)

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Настройка полей справочника                           [×]   │
├─────────────────────────────────────────────────────────────┤
│ Drag to reorder:                                             │
│ ☰ Название    [string ▼] [✓ Required] [✓ Unique] [✏️] [🗑️] │
│ ☰ Код         [string ▼] [✓ Required] [✓ Unique] [✏️] [🗑️] │
│ ☰ Страна      [ref ▼]    [  Required] [  Unique] [✏️] [🗑️] │
│ ☰ Описание    [string ▼] [  Required] [  Unique] [✏️] [🗑️] │
├─────────────────────────────────────────────────────────────┤
│ [+ Добавить поле]                                            │
├─────────────────────────────────────────────────────────────┤
│                                    [Отмена] [Сохранить]      │
└─────────────────────────────────────────────────────────────┘
```

### Field Types
| Type | Description | UI Component |
|------|-------------|--------------|
| string | Text | Input |
| number | Numeric | NumberInput |
| boolean | Yes/No | Switch |
| date | Date | DatePicker |
| select | Predefined options | Select |
| reference | Link to another directory | SearchSelect |

## Modal: Add/Edit Entry

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Добавить запись в "Бренды"                            [×]   │
├─────────────────────────────────────────────────────────────┤
│ Form (generated from fields):                                │
│                                                              │
│ Название *                                                   │
│ [________________________]                                   │
│                                                              │
│ Код *                                                        │
│ [________________________]                                   │
│                                                              │
│ Страна                                                       │
│ [Выберите страну... ▼]                                      │
│                                                              │
│ Описание                                                     │
│ [________________________]                                   │
│ [________________________]                                   │
│                                                              │
│ Активен                                                      │
│ [✓]                                                         │
├─────────────────────────────────────────────────────────────┤
│                                    [Отмена] [Сохранить]      │
└─────────────────────────────────────────────────────────────┘
```

### Form Generation
- Forms auto-generated from DirectoryField[]
- Validation from fieldType + validationRules
- Reference fields fetch options from linked directory

## Components Hierarchy

```
directories/
├── page.tsx (DirectoriesListPage)
│   ├── DirectorySearch
│   └── DirectoryCard
│
├── [id]/page.tsx (DirectoryEntriesPage)
│   ├── DirectoryHeader
│   ├── DirectoryFilters
│   ├── DirectoryTable (dynamic)
│   ├── FieldsSettingsModal
│   │   ├── FieldRow (draggable)
│   │   └── AddFieldForm
│   └── EntryFormModal
│       └── DynamicField (per field type)
│
└── components/
    ├── DirectoryCard.tsx
    ├── DirectoryTable.tsx
    ├── DynamicField.tsx
    ├── FieldsEditor.tsx
    └── EntryForm.tsx
```

## API Endpoints

```
GET    /directories              - listDirectories()
POST   /directories              - createDirectory(input)
GET    /directories/:id          - getDirectory(id)
PUT    /directories/:id          - updateDirectory(id, input)
DELETE /directories/:id          - deleteDirectory(id)

GET    /directories/:id/fields   - getFields(directoryId)
POST   /directories/:id/fields   - createField(directoryId, input)
PUT    /directories/:id/fields/:fieldId - updateField(fieldId, input)
DELETE /directories/:id/fields/:fieldId - deleteField(fieldId)
POST   /directories/:id/fields/reorder - reorderFields(directoryId, fieldIds)

GET    /directories/:id/entries  - listEntries(directoryId, filters)
POST   /directories/:id/entries  - createEntry(directoryId, values)
GET    /directories/:id/entries/:entryId - getEntry(entryId)
PUT    /directories/:id/entries/:entryId - updateEntry(entryId, values)
DELETE /directories/:id/entries/:entryId - deleteEntry(entryId)

POST   /directories/:id/import   - importCSV(directoryId, file)
GET    /directories/:id/export   - exportCSV(directoryId)
```

## Validation Rules

### Field-level
```typescript
interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;  // regex
  email?: boolean;
  url?: boolean;
}
```

### Entry-level
- Required fields must have values
- Unique fields checked against existing entries
- Reference fields must point to existing entries

## System Directories (isSystem: true)
- Cannot be deleted
- Fields cannot be modified
- Examples: task_statuses, trip_statuses, anomaly_types

## Estimated Time: 19 hours
- List page: 3h
- Entries page: 6h
- Fields editor: 5h
- Entry form (dynamic): 5h
