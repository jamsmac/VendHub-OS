---
name: vhm24-api-generator
description: |
  VendHub NestJS REST API Generator - создаёт REST API модули для VendHub.
  Генерирует NestJS контроллеры, сервисы, DTOs с class-validator, Swagger документацию.
  Использовать при создании новых API endpoints, CRUD операций, бизнес-логики.
---

# VendHub NestJS REST API Generator

Генератор REST API модулей на NestJS 11 + TypeORM 0.3.20 для VendHub OS.

## Назначение

- Создание NestJS модулей (controller, service, dto, entity)
- TypeORM сущности с BaseEntity-паттерном (UUID, аудит, soft delete)
- DTO с class-validator + class-transformer + @nestjs/swagger
- CRUD контроллеры с пагинацией, фильтрацией, сортировкой
- Авторизация через Guards (JWT, Roles, Organization)
- Swagger документация через декораторы

## Когда использовать

- Создание нового REST API модуля
- CRUD операции для сущности
- Агрегирующие запросы (статистика, отчёты)
- Бизнес-логика (расчёты, валидации, транзакции)

## Технологический стек

| Технология            | Версия / Описание                        |
| --------------------- | ---------------------------------------- |
| NestJS                | 11                                       |
| TypeORM               | 0.3.20                                   |
| PostgreSQL            | 16                                       |
| Валидация             | class-validator + class-transformer      |
| API документация      | @nestjs/swagger                          |
| Аутентификация        | JWT (Passport)                           |
| API префикс           | `api/v1`                                 |
| Стиль колонок в БД    | snake_case                               |
| Первичный ключ        | UUID v4                                  |

## Структура модуля

```
src/modules/
├── machines/                        # Пример: модуль автоматов
│   ├── machines.module.ts           # Регистрация модуля
│   ├── machines.controller.ts       # REST контроллер
│   ├── machines.service.ts          # Бизнес-логика
│   ├── dto/
│   │   ├── create-machine.dto.ts    # DTO создания
│   │   ├── update-machine.dto.ts    # DTO обновления
│   │   └── filter-machine.dto.ts    # DTO фильтрации / пагинации
│   └── entities/
│       └── machine.entity.ts        # TypeORM сущность
├── products/
├── orders/
├── ingredients/
├── common/                          # Общие модули
│   ├── dto/
│   │   ├── page-options.dto.ts
│   │   ├── page-meta.dto.ts
│   │   └── page.dto.ts
│   ├── entities/
│   │   └── base.entity.ts
│   ├── decorators/
│   │   ├── public.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── auth.decorator.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── organization.guard.ts
│   └── interceptors/
│       └── transform.interceptor.ts
└── ...
```

---

## 1. BaseEntity - базовая сущность

Все сущности наследуются от `BaseEntity`. Колонки в snake_case, UUID первичный ключ, soft delete.

```typescript
// src/modules/common/entities/base.entity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
  BaseEntity as TypeOrmBaseEntity,
} from 'typeorm';

export abstract class BaseEntity extends TypeOrmBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById: string | null;
}
```

---

## 2. Entity - шаблон сущности

```typescript
// src/modules/machines/entities/machine.entity.ts
import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Order } from '../../orders/entities/order.entity';

// Статусы автомата
export enum MachineStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline',
}

@Entity('machines')
export class Machine extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, unique: true })
  @Index()
  serialNumber: string;

  @Column({
    type: 'enum',
    enum: MachineStatus,
    default: MachineStatus.INACTIVE,
  })
  status: MachineStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitude: number | null;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.machines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => Order, (order) => order.machine)
  orders: Order[];
}
```

---

## 3. DTO - шаблоны валидации

### CreateDto

```typescript
// src/modules/machines/dto/create-machine.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MachineStatus } from '../entities/machine.entity';

export class CreateMachineDto {
  @ApiProperty({ description: 'Название автомата', example: 'Автомат #42' })
  @IsString({ message: 'Название должно быть строкой' })
  @IsNotEmpty({ message: 'Название обязательно' })
  @MinLength(1, { message: 'Название не может быть пустым' })
  @MaxLength(255, { message: 'Название не может превышать 255 символов' })
  name: string;

  @ApiProperty({ description: 'Серийный номер', example: 'VH-2024-001' })
  @IsString()
  @IsNotEmpty({ message: 'Серийный номер обязателен' })
  @MaxLength(100)
  serialNumber: string;

  @ApiPropertyOptional({
    description: 'Статус автомата',
    enum: MachineStatus,
    default: MachineStatus.INACTIVE,
  })
  @IsOptional()
  @IsEnum(MachineStatus, { message: 'Неверный статус автомата' })
  status?: MachineStatus;

  @ApiPropertyOptional({ description: 'Адрес установки', example: 'ул. Навои, 10' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'Широта', example: 41.311081 })
  @IsOptional()
  @IsNumber({}, { message: 'Широта должна быть числом' })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Долгота', example: 69.240562 })
  @IsOptional()
  @IsNumber({}, { message: 'Долгота должна быть числом' })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({ description: 'ID организации' })
  @IsUUID('4', { message: 'Неверный формат UUID организации' })
  organizationId: string;
}
```

### UpdateDto

```typescript
// src/modules/machines/dto/update-machine.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateMachineDto } from './create-machine.dto';

// PartialType делает все поля опциональными и сохраняет Swagger-метаданные
export class UpdateMachineDto extends PartialType(CreateMachineDto) {}
```

### FilterDto (пагинация + фильтры)

```typescript
// src/modules/machines/dto/filter-machine.dto.ts
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MachineStatus } from '../entities/machine.entity';
import { PageOptionsDto } from '../../common/dto/page-options.dto';

export class FilterMachineDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: 'Поиск по названию или серийному номеру' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Фильтр по статусу', enum: MachineStatus })
  @IsOptional()
  @IsEnum(MachineStatus)
  status?: MachineStatus;

  @ApiPropertyOptional({ description: 'Фильтр по организации (UUID)' })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
```

---

## 4. Пагинация (общие DTO)

### PageOptionsDto

```typescript
// src/modules/common/dto/page-options.dto.ts
import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class PageOptionsDto {
  @ApiPropertyOptional({ description: 'Номер страницы', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Количество на странице', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Поле сортировки', default: 'createdAt' })
  @IsOptional()
  sortBy: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Направление сортировки', enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;

  /** Вычисляемое смещение для TypeORM skip */
  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
```

### PageMetaDto

```typescript
// src/modules/common/dto/page-meta.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export interface PageMetaParams {
  pageOptions: { page: number; limit: number };
  totalItems: number;
}

export class PageMetaDto {
  @ApiProperty({ description: 'Текущая страница' })
  readonly page: number;

  @ApiProperty({ description: 'Количество на странице' })
  readonly limit: number;

  @ApiProperty({ description: 'Общее количество записей' })
  readonly totalItems: number;

  @ApiProperty({ description: 'Общее количество страниц' })
  readonly totalPages: number;

  @ApiProperty({ description: 'Есть предыдущая страница' })
  readonly hasPrevious: boolean;

  @ApiProperty({ description: 'Есть следующая страница' })
  readonly hasNext: boolean;

  constructor({ pageOptions, totalItems }: PageMetaParams) {
    this.page = pageOptions.page;
    this.limit = pageOptions.limit;
    this.totalItems = totalItems;
    this.totalPages = Math.ceil(totalItems / this.limit);
    this.hasPrevious = this.page > 1;
    this.hasNext = this.page < this.totalPages;
  }
}
```

### PageDto

```typescript
// src/modules/common/dto/page.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from './page-meta.dto';

export class PageDto<T> {
  @ApiProperty({ isArray: true, description: 'Массив данных' })
  readonly data: T[];

  @ApiProperty({ type: () => PageMetaDto, description: 'Метаданные пагинации' })
  readonly meta: PageMetaDto;

  constructor(data: T[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
```

---

## 5. Controller - шаблон контроллера

```typescript
// src/modules/machines/machines.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MachinesService } from './machines.service';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import { FilterMachineDto } from './dto/filter-machine.dto';
import { Machine } from './entities/machine.entity';
import { PageDto } from '../common/dto/page.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { Roles } from '../common/decorators/roles.decorator';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Автоматы')
@ApiBearerAuth()
@Controller('machines')
@UseGuards(JwtAuthGuard, RolesGuard, OrganizationGuard)
@UseInterceptors(TransformInterceptor)
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  // --- GET /api/v1/machines ---
  @Get()
  @ApiOperation({ summary: 'Получить список автоматов с пагинацией и фильтрацией' })
  @ApiResponse({ status: 200, description: 'Список автоматов' })
  async findAll(
    @Query() filterDto: FilterMachineDto,
    @CurrentUser() user: { id: string; organizationId: string },
  ): Promise<PageDto<Machine>> {
    return this.machinesService.findAll(filterDto, user);
  }

  // --- GET /api/v1/machines/:id ---
  @Get(':id')
  @ApiOperation({ summary: 'Получить автомат по ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Данные автомата' })
  @ApiResponse({ status: 404, description: 'Автомат не найден' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<Machine> {
    return this.machinesService.findOne(id);
  }

  // --- POST /api/v1/machines ---
  @Post()
  @Auth(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать новый автомат' })
  @ApiResponse({ status: 201, description: 'Автомат создан' })
  @ApiResponse({ status: 409, description: 'Серийный номер уже существует' })
  async create(
    @Body() createDto: CreateMachineDto,
    @CurrentUser() user: { id: string },
  ): Promise<Machine> {
    return this.machinesService.create(createDto, user.id);
  }

  // --- PUT /api/v1/machines/:id ---
  @Put(':id')
  @Auth(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить автомат' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Автомат обновлён' })
  @ApiResponse({ status: 404, description: 'Автомат не найден' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateDto: UpdateMachineDto,
    @CurrentUser() user: { id: string },
  ): Promise<Machine> {
    return this.machinesService.update(id, updateDto, user.id);
  }

  // --- DELETE /api/v1/machines/:id ---
  @Delete(':id')
  @Auth(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить автомат (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Автомат удалён' })
  @ApiResponse({ status: 404, description: 'Автомат не найден' })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.machinesService.remove(id);
  }
}
```

---

## 6. Service - шаблон сервиса

```typescript
// src/modules/machines/machines.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  ILike,
  FindOptionsWhere,
  SelectQueryBuilder,
} from 'typeorm';
import { Machine, MachineStatus } from './entities/machine.entity';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import { FilterMachineDto } from './dto/filter-machine.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';

@Injectable()
export class MachinesService {
  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    private readonly dataSource: DataSource,
  ) {}

  // ========== ПОЛУЧИТЬ СПИСОК ==========
  async findAll(
    filterDto: FilterMachineDto,
    user: { id: string; organizationId: string },
  ): Promise<PageDto<Machine>> {
    const queryBuilder: SelectQueryBuilder<Machine> = this.machineRepository
      .createQueryBuilder('machine')
      .leftJoinAndSelect('machine.organization', 'organization');

    // Фильтр по организации текущего пользователя
    queryBuilder.andWhere('machine.organization_id = :orgId', {
      orgId: user.organizationId,
    });

    // Полнотекстовый поиск по названию и серийному номеру
    if (filterDto.search) {
      queryBuilder.andWhere(
        '(machine.name ILIKE :search OR machine.serial_number ILIKE :search)',
        { search: `%${filterDto.search}%` },
      );
    }

    // Фильтр по статусу
    if (filterDto.status) {
      queryBuilder.andWhere('machine.status = :status', {
        status: filterDto.status,
      });
    }

    // Фильтр по организации (для админов, у которых доступ ко всем)
    if (filterDto.organizationId) {
      queryBuilder.andWhere('machine.organization_id = :filterOrgId', {
        filterOrgId: filterDto.organizationId,
      });
    }

    // Сортировка
    const sortColumn = this.getSortColumn(filterDto.sortBy);
    queryBuilder.orderBy(sortColumn, filterDto.sortOrder);

    // Пагинация
    queryBuilder.skip(filterDto.skip).take(filterDto.limit);

    // Выполнение запроса
    const [items, totalItems] = await queryBuilder.getManyAndCount();

    const meta = new PageMetaDto({
      pageOptions: { page: filterDto.page, limit: filterDto.limit },
      totalItems,
    });

    return new PageDto(items, meta);
  }

  // ========== ПОЛУЧИТЬ ПО ID ==========
  async findOne(id: string): Promise<Machine> {
    const machine = await this.machineRepository.findOne({
      where: { id },
      relations: ['organization', 'orders'],
    });

    if (!machine) {
      throw new NotFoundException(`Автомат с ID "${id}" не найден`);
    }

    return machine;
  }

  // ========== СОЗДАТЬ ==========
  async create(createDto: CreateMachineDto, userId: string): Promise<Machine> {
    // Проверка уникальности серийного номера
    const existing = await this.machineRepository.findOne({
      where: { serialNumber: createDto.serialNumber },
    });

    if (existing) {
      throw new ConflictException(
        `Автомат с серийным номером "${createDto.serialNumber}" уже существует`,
      );
    }

    const machine = this.machineRepository.create({
      ...createDto,
      createdById: userId,
      updatedById: userId,
    });

    return this.machineRepository.save(machine);
  }

  // ========== ОБНОВИТЬ ==========
  async update(
    id: string,
    updateDto: UpdateMachineDto,
    userId: string,
  ): Promise<Machine> {
    const machine = await this.findOne(id);

    // Если меняется серийный номер - проверить уникальность
    if (updateDto.serialNumber && updateDto.serialNumber !== machine.serialNumber) {
      const existing = await this.machineRepository.findOne({
        where: { serialNumber: updateDto.serialNumber },
      });

      if (existing) {
        throw new ConflictException(
          `Автомат с серийным номером "${updateDto.serialNumber}" уже существует`,
        );
      }
    }

    Object.assign(machine, updateDto, { updatedById: userId });

    return this.machineRepository.save(machine);
  }

  // ========== УДАЛИТЬ (soft delete) ==========
  async remove(id: string): Promise<void> {
    const machine = await this.findOne(id);
    await this.machineRepository.softRemove(machine);
  }

  // ========== ТРАНЗАКЦИЯ - пример сложной операции ==========
  async createWithInventory(
    createDto: CreateMachineDto,
    inventoryItems: { productId: string; quantity: number }[],
    userId: string,
  ): Promise<Machine> {
    return this.dataSource.transaction(async (manager) => {
      // Создать автомат
      const machine = manager.create(Machine, {
        ...createDto,
        createdById: userId,
        updatedById: userId,
      });
      const savedMachine = await manager.save(machine);

      // Создать записи инвентаря для автомата
      if (inventoryItems.length > 0) {
        const inventory = inventoryItems.map((item) =>
          manager.create('MachineInventory', {
            machineId: savedMachine.id,
            productId: item.productId,
            quantity: item.quantity,
            createdById: userId,
          }),
        );
        await manager.save(inventory);
      }

      return savedMachine;
    });
  }

  // ========== BULK операции ==========
  async bulkUpdateStatus(
    ids: string[],
    status: MachineStatus,
    userId: string,
  ): Promise<number> {
    const result = await this.machineRepository
      .createQueryBuilder()
      .update(Machine)
      .set({ status, updatedById: userId })
      .whereInIds(ids)
      .execute();

    return result.affected ?? 0;
  }

  async bulkSoftDelete(ids: string[]): Promise<number> {
    const result = await this.machineRepository.softDelete(ids);
    return result.affected ?? 0;
  }

  // ========== АГРЕГАЦИИ ==========
  async getStats(organizationId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
    offline: number;
  }> {
    const stats = await this.machineRepository
      .createQueryBuilder('machine')
      .select('machine.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('machine.organization_id = :orgId', { orgId: organizationId })
      .groupBy('machine.status')
      .getRawMany<{ status: MachineStatus; count: string }>();

    const result = {
      total: 0,
      active: 0,
      inactive: 0,
      maintenance: 0,
      offline: 0,
    };

    for (const row of stats) {
      const count = parseInt(row.count, 10);
      result.total += count;
      result[row.status] = count;
    }

    return result;
  }

  // ========== Вспомогательные методы ==========
  private getSortColumn(sortBy: string): string {
    const allowedColumns: Record<string, string> = {
      name: 'machine.name',
      serialNumber: 'machine.serial_number',
      status: 'machine.status',
      createdAt: 'machine.created_at',
      updatedAt: 'machine.updated_at',
    };

    return allowedColumns[sortBy] ?? 'machine.created_at';
  }
}
```

---

## 7. Module - регистрация модуля

```typescript
// src/modules/machines/machines.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MachinesController } from './machines.controller';
import { MachinesService } from './machines.service';
import { Machine } from './entities/machine.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Machine])],
  controllers: [MachinesController],
  providers: [MachinesService],
  exports: [MachinesService], // экспортируем если нужен другим модулям
})
export class MachinesModule {}
```

### Регистрация в AppModule

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MachinesModule } from './modules/machines/machines.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { IngredientsModule } from './modules/ingredients/ingredients.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // Конфигурация
    ConfigModule.forRoot({ isGlobal: true }),

    // TypeORM + PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),

    // Модули приложения
    AuthModule,
    UsersModule,
    MachinesModule,
    ProductsModule,
    OrdersModule,
    IngredientsModule,
  ],
})
export class AppModule {}
```

### Настройка main.ts (API префикс, Swagger, валидация)

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Глобальный префикс API
  app.setGlobalPrefix('api/v1');

  // Глобальная валидация DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // удалять свойства без декораторов
      forbidNonWhitelisted: true, // ошибка при неизвестных свойствах
      transform: true,            // автоматическая трансформация типов
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  app.enableCors();

  // Swagger документация
  const config = new DocumentBuilder()
    .setTitle('VendHub API')
    .setDescription('REST API для VendHub OS - управление вендинговыми автоматами')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Автоматы', 'Управление вендинговыми автоматами')
    .addTag('Продукты', 'Управление каталогом продуктов')
    .addTag('Заказы', 'Управление заказами')
    .addTag('Ингредиенты', 'Управление ингредиентами')
    .addTag('Пользователи', 'Управление пользователями')
    .addTag('Авторизация', 'Вход, регистрация, токены')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
```

---

## 8. Guards и Decorators

### JwtAuthGuard

```typescript
// src/modules/common/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Пропускаем публичные эндпоинты (@Public())
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

### RolesGuard

```typescript
// src/modules/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Если роли не указаны - доступ разрешён
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

### OrganizationGuard

```typescript
// src/modules/common/guards/organization.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class OrganizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Суперадмин имеет доступ ко всем организациям
    if (user.role === 'superadmin') {
      return true;
    }

    // Проверяем что organization_id в запросе совпадает с организацией пользователя
    const orgId =
      request.params?.organizationId ??
      request.body?.organizationId ??
      request.query?.organizationId;

    if (orgId && orgId !== user.organizationId) {
      throw new ForbiddenException('Нет доступа к данной организации');
    }

    return true;
  }
}
```

### Декораторы

```typescript
// src/modules/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

```typescript
// src/modules/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
// src/modules/common/decorators/auth.decorator.ts
import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

// Комбинированный декоратор: авторизация + роли
export function Auth(...roles: UserRole[]) {
  return applyDecorators(
    Roles(...roles),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(),
  );
}
```

```typescript
// src/modules/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Извлечение текущего пользователя из request
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
```

---

## 9. TransformInterceptor

```typescript
// src/modules/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

---

## 10. Обработка ошибок

Используем встроенные исключения NestJS. Они автоматически преобразуются в JSON-ответы с соответствующими HTTP-статусами.

```typescript
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';

// 404 - Не найдено
throw new NotFoundException('Автомат с ID "abc-123" не найден');

// 409 - Конфликт (дублирование)
throw new ConflictException('Автомат с серийным номером "VH-001" уже существует');

// 400 - Некорректный запрос
throw new BadRequestException('Неверный формат даты');

// 403 - Нет прав
throw new ForbiddenException('Нет доступа к данной операции');

// 401 - Не авторизован
throw new UnauthorizedException('Токен истёк или недействителен');

// 422 - Ошибка валидации бизнес-логики
throw new UnprocessableEntityException('Нельзя удалить автомат с активными заказами');

// 500 - Внутренняя ошибка
throw new InternalServerErrorException('Ошибка подключения к платёжной системе');
```

### Глобальный фильтр ошибок (опционально)

```typescript
// src/modules/common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Внутренняя ошибка сервера';

    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message ?? message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 11. Паттерны запросов

### Фильтрация с QueryBuilder

```typescript
// Динамическая фильтрация - добавлять условия по мере необходимости
async findAll(filter: FilterMachineDto): Promise<PageDto<Machine>> {
  const qb = this.machineRepository.createQueryBuilder('machine');

  // Полнотекстовый поиск (PostgreSQL ILIKE)
  if (filter.search) {
    qb.andWhere(
      '(machine.name ILIKE :search OR machine.serial_number ILIKE :search)',
      { search: `%${filter.search}%` },
    );
  }

  // Фильтр по enum
  if (filter.status) {
    qb.andWhere('machine.status = :status', { status: filter.status });
  }

  // Фильтр по дате (диапазон)
  if (filter.dateFrom) {
    qb.andWhere('machine.created_at >= :dateFrom', { dateFrom: filter.dateFrom });
  }
  if (filter.dateTo) {
    qb.andWhere('machine.created_at <= :dateTo', { dateTo: filter.dateTo });
  }

  // Фильтр по связанной сущности
  if (filter.organizationId) {
    qb.andWhere('machine.organization_id = :orgId', {
      orgId: filter.organizationId,
    });
  }

  // Сортировка
  qb.orderBy('machine.created_at', 'DESC');

  // Пагинация
  qb.skip(filter.skip).take(filter.limit);

  const [items, total] = await qb.getManyAndCount();

  const meta = new PageMetaDto({
    pageOptions: { page: filter.page, limit: filter.limit },
    totalItems: total,
  });

  return new PageDto(items, meta);
}
```

### Полнотекстовый поиск (PostgreSQL tsvector)

```typescript
// Для продвинутого полнотекстового поиска на PostgreSQL
if (filter.search) {
  qb.andWhere(
    `to_tsvector('russian', machine.name || ' ' || machine.serial_number)
     @@ plainto_tsquery('russian', :search)`,
    { search: filter.search },
  );
}
```

### Запрос с подзапросом и агрегацией

```typescript
// Получить автоматы с суммой заказов
async findAllWithRevenue(): Promise<any[]> {
  return this.machineRepository
    .createQueryBuilder('machine')
    .leftJoin('machine.orders', 'order')
    .select('machine.id', 'id')
    .addSelect('machine.name', 'name')
    .addSelect('COUNT(order.id)', 'ordersCount')
    .addSelect('COALESCE(SUM(order.total_amount), 0)', 'totalRevenue')
    .groupBy('machine.id')
    .orderBy('"totalRevenue"', 'DESC')
    .getRawMany();
}
```

### Загрузка связей (relations)

```typescript
// Через find options
const machine = await this.machineRepository.findOne({
  where: { id },
  relations: ['organization', 'orders', 'orders.items'],
});

// Через QueryBuilder (более гибко)
const machine = await this.machineRepository
  .createQueryBuilder('machine')
  .leftJoinAndSelect('machine.organization', 'org')
  .leftJoinAndSelect('machine.orders', 'order', 'order.status = :status', {
    status: 'completed',
  })
  .where('machine.id = :id', { id })
  .getOne();
```

---

## 12. Чеклист при создании нового модуля

1. Создать entity в `src/modules/<name>/entities/<name>.entity.ts`
   - Наследовать от `BaseEntity`
   - Определить колонки с декораторами TypeORM
   - Указать `snake_case` имена через `{ name: '...' }`
   - Определить связи (`@ManyToOne`, `@OneToMany`, `@ManyToMany`)

2. Создать DTO в `src/modules/<name>/dto/`
   - `create-<name>.dto.ts` - валидация создания (class-validator + @ApiProperty)
   - `update-<name>.dto.ts` - `PartialType(CreateDto)`
   - `filter-<name>.dto.ts` - наследует `PageOptionsDto`, добавляет фильтры

3. Создать service в `src/modules/<name>/<name>.service.ts`
   - `@InjectRepository(Entity)` для доступа к `Repository<Entity>`
   - `DataSource` для транзакций
   - CRUD методы: `findAll`, `findOne`, `create`, `update`, `remove`

4. Создать controller в `src/modules/<name>/<name>.controller.ts`
   - `@ApiTags()`, `@ApiBearerAuth()`, `@Controller('<name>')`
   - Guards: `@UseGuards(JwtAuthGuard, RolesGuard, OrganizationGuard)`
   - Swagger-декораторы: `@ApiOperation`, `@ApiResponse`, `@ApiParam`
   - Методы: `findAll`, `findOne`, `create`, `update`, `remove`

5. Создать module в `src/modules/<name>/<name>.module.ts`
   - `TypeOrmModule.forFeature([Entity])` в imports
   - Controller в controllers, Service в providers
   - Экспортировать Service если нужен другим модулям

6. Зарегистрировать модуль в `src/app.module.ts`

---

## Ссылки

- `references/crud-templates.md` - Готовые шаблоны CRUD
- `references/validation-patterns.md` - Паттерны class-validator валидации
- `assets/controller-template.ts` - Шаблон контроллера
- `assets/service-template.ts` - Шаблон сервиса
- `assets/entity-template.ts` - Шаблон сущности
