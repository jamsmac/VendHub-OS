---
name: vhm24-qa-review
description: |
  VendHub QA Review - код-ревью и проверка качества.
  Чеклист для NestJS API, React UI, TypeORM сущностей.
  Использовать при ревью кода, финальной проверке перед мержем.
---

# VendHub QA Review

## Когда использовать

```
vhm24-ux-spec -> vhm24-ui-generator -> [vhm24-qa-review] -> Готово!
```

Использовать ПОСЛЕ генерации кода для проверки качества.
Активировать при ревью кода, финальной проверке перед мержем, валидации API и UI.

---

## Быстрый чеклист

### Критические (блокеры)

```
[ ] TypeScript компилируется без ошибок (tsc --noEmit)
[ ] Все imports корректны (NestJS модули, TypeORM сущности, React компоненты)
[ ] NestJS REST endpoints определены + Swagger документация (@ApiTags, @ApiOperation)
[ ] class-validator декораторы на ВСЕХ DTO (@IsString, @IsNumber, @IsOptional и т.д.)
[ ] BaseEntity расширение на всех TypeORM сущностях
[ ] organization_id фильтрация во всех запросах (мультитенантность)
[ ] Soft delete используется вместо hard delete (@DeleteDateColumn + softRemove)
[ ] Нет hardcoded secrets
```

### Важные

```
[ ] Dark mode работает (все компоненты поддерживают dark:)
[ ] Все состояния (loading / empty / error) реализованы
[ ] Формы валидируются на клиенте и сервере
[ ] Кнопки имеют обработчики
[ ] Axios API вызовы обёрнуты в try/catch
[ ] Zustand сторы корректно типизированы
[ ] Guards и Interceptors применены к контроллерам
```

### Желательные

```
[ ] Accessibility (alt, aria-label)
[ ] Responsive дизайн
[ ] Оптимизация производительности (useMemo, useCallback)
[ ] Консистентный стиль кода (ESLint без предупреждений)
[ ] Jest тесты для сервисов и контроллеров
```

---

## Полный Review

### 1. Code Quality

**TypeScript (бэкенд NestJS):**
```typescript
// Плохо
const data: any = await this.repo.find();
const handler = (req, res) => {};

// Хорошо
const data: Product[] = await this.productRepository.find({
  where: { organization_id: orgId, deleted_at: IsNull() },
});
const handler = (req: Request, res: Response) => {};
```

**TypeScript (фронтенд React):**
```typescript
// Плохо
const data: any = await axios.get('/api/products');

// Хорошо
const data = await api.get<Product[]>('/products');
```

**Imports (бэкенд NestJS):**
```typescript
// Правильные импорты NestJS
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Правильные импорты сущностей
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../common/guards/organization.guard';
```

**Imports (фронтенд React):**
```typescript
// Правильные импорты VendHub UI
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Coffee, Plus } from "lucide-react";

// Правильные импорты API и сторов
import { api } from "@/lib/axios";
import { useProductStore } from "@/stores/product.store";
```

### 2. NestJS API проверка

**Контроллер:**
```typescript
// Правильный контроллер
@ApiTags('Продукты')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Получить список продуктов' })
  async findAll(@Req() req: RequestWithOrg): Promise<Product[]> {
    return this.productService.findAll(req.organization_id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать продукт' })
  async create(
    @Body() dto: CreateProductDto,
    @Req() req: RequestWithOrg,
  ): Promise<Product> {
    return this.productService.create(dto, req.organization_id);
  }
}
```

**DTO с class-validator:**
```typescript
// Правильная DTO
import { IsString, IsNumber, IsOptional, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Название продукта', example: 'Капучино' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Цена в UZS', example: 25000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Описание' })
  @IsOptional()
  @IsString()
  description?: string;
}
```

**TypeORM сущность:**
```typescript
// Правильная сущность
import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

@Entity('products')
export class Product extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('decimal', { precision: 12, scale: 2 })
  price: number;

  @Column({ nullable: true })
  description: string;

  @Column('uuid')
  organization_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
```

### 3. UI Consistency

**Цвета дизайн-системы:**
```tsx
// Правильные цвета
className="bg-amber-500 hover:bg-amber-600"  // Primary
className="bg-green-100 text-green-700"      // Success
className="bg-red-100 text-red-700"          // Error
className="bg-blue-100 text-blue-700"        // Info
```

**Dark Mode:**
```tsx
// С dark mode
className="bg-white dark:bg-gray-800"
className="text-gray-900 dark:text-white"
className="border-gray-200 dark:border-gray-700"
```

### 4. Functionality

**Axios API вызовы + Zustand сторы:**
```tsx
// Правильное использование Axios + Zustand
// stores/product.store.ts
import { create } from 'zustand';
import { api } from '@/lib/axios';

interface ProductStore {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  createProduct: (dto: CreateProductDto) => Promise<void>;
}

export const useProductStore = create<ProductStore>((set) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<Product[]>('/products');
      set({ products: data, isLoading: false });
    } catch (err) {
      set({ error: 'Ошибка загрузки продуктов', isLoading: false });
    }
  },

  createProduct: async (dto) => {
    try {
      await api.post('/products', dto);
      // Перезагружаем список
      const { data } = await api.get<Product[]>('/products');
      set({ products: data });
    } catch (err) {
      set({ error: 'Ошибка создания продукта' });
    }
  },
}));
```

**Использование стора в компоненте:**
```tsx
// Правильное использование в компоненте
const ProductList = () => {
  const { products, isLoading, error, fetchProducts } = useProductStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (isLoading) return <Skeleton />;
  if (error) return <Alert variant="destructive">{error}</Alert>;
  if (!products.length) return <EmptyState icon={Coffee} title="Нет данных" />;
  return <DataTable data={products} />;
};
```

### 5. Localization

**Русский язык:**
```tsx
// Русский UI
<Button>Добавить</Button>
<span>Загрузка...</span>
<p>Нет данных</p>
toast.success("Успешно сохранено");
```

**Валюта:**
```tsx
// Формат UZS
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ru-RU').format(value) + ' UZS';

// Результат: "1 234 567 UZS"
```

---

## Как проводить Review

### Шаг 1: Статический анализ

1. Проверить TypeScript ошибки (`tsc --noEmit`)
2. Проверить все импорты (NestJS модули, TypeORM сущности, React компоненты)
3. Проверить naming conventions (camelCase для переменных, PascalCase для классов)
4. Проверить наличие class-validator декораторов на всех DTO
5. Проверить что все сущности расширяют BaseEntity
6. Проверить organization_id фильтрацию во всех запросах к БД

### Шаг 2: API проверка

1. Проверить Swagger документацию (@ApiTags, @ApiOperation, @ApiProperty)
2. Проверить Guards на контроллерах (JwtAuthGuard, OrganizationGuard)
3. Проверить DTO валидацию (class-validator)
4. Проверить soft delete вместо hard delete
5. Проверить обработку ошибок (HttpException, фильтры)

### Шаг 3: UI проверка

1. Открыть в браузере
2. Проверить light/dark mode
3. Проверить responsive (mobile/tablet/desktop)
4. Проверить все состояния (loading / empty / error / data)

### Шаг 4: Функциональная проверка

1. Протестировать все CRUD действия
2. Проверить формы (валидация, отправка, сброс)
3. Проверить обработку ошибок (сеть, сервер, валидация)
4. Проверить edge cases (пустые поля, большие числа, спецсимволы)

### Шаг 5: Документация

1. Заполнить отчёт
2. Список найденных проблем
3. Рекомендации

---

## Шаблон отчёта

```markdown
## QA Review: [Название экрана/модуля]

**Файлы:** [путь к файлам]
**Дата:** [YYYY-MM-DD]

### Результаты

| Категория | Статус | Комментарий |
|-----------|--------|-------------|
| TypeScript компиляция | OK | Без ошибок |
| NestJS API + Swagger | OK | Эндпоинты документированы |
| class-validator DTO | WARN | Нет валидации на UpdateDto |
| BaseEntity extension | OK | Все сущности расширяют |
| organization_id filter | OK | Все запросы фильтруют |
| Soft delete | OK | DeleteDateColumn на сущностях |
| Axios + Zustand | OK | Сторы типизированы |
| UI Consistency | WARN | Нет dark mode на badge |
| Localization | OK | Русский |
| Accessibility | WARN | Нет aria-label на иконках |

### Критические проблемы
_Нет_

### Требует исправления
1. Добавить class-validator декораторы на UpdateProductDto
2. Добавить dark mode для StatusBadge
3. Добавить aria-label на кнопки-иконки

### Рекомендации
1. Использовать useMemo для фильтрации списка
2. Добавить Jest тесты для ProductService
3. Добавить индекс на organization_id в миграции

---
**Вердикт:** WARN - REQUIRES FIXES
```

---

## References

- **QA Checklist**: See [references/qa-checklist.md](references/qa-checklist.md) - полный чеклист
