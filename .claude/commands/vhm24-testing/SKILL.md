---
name: vhm24-testing
description: |
  VendHub Testing - Jest юнит/интеграционные тесты и Playwright E2E.
  Создаёт тесты для NestJS сервисов, контроллеров, React компонентов.
  Использовать при написании тестов, настройке тестовой инфраструктуры.
---

# VendHub Testing

Тестирование VendHub OS: NestJS бэкенд, React фронтенд, E2E сценарии.

## Назначение

- Юнит-тесты NestJS сервисов и контроллеров
- Интеграционные тесты HTTP-эндпоинтов через supertest
- E2E-тесты полного приложения
- Тесты React компонентов
- Фикстуры и фабрики на базе TypeORM сущностей

## Когда использовать

- Написание тестов для новой функциональности
- TDD разработка NestJS модулей
- Проверка REST API эндпоинтов
- Тестирование React компонентов веб-админки
- E2E проверка критических пользовательских сценариев

## Стек тестирования

| Инструмент             | Версия | Назначение                               |
|------------------------|--------|------------------------------------------|
| Jest                   | 29     | Тест-раннер, юнит и интеграционные тесты |
| @nestjs/testing        | 10     | Утилиты для тестирования NestJS модулей  |
| supertest              | 6      | HTTP-тесты эндпоинтов                    |
| Playwright             | 1.48   | E2E тестирование веб-админки             |
| @testing-library/react | 14     | Тесты React компонентов                  |

## Именование файлов тестов

```
*.spec.ts          — юнит-тесты (сервисы, контроллеры, утилиты)
*.spec.tsx         — юнит-тесты React компонентов
*.e2e-spec.ts      — E2E и интеграционные тесты (полный bootstrap приложения)
```

## Структура тестов

```
src/
├── vending/
│   ├── vending.service.ts
│   ├── vending.service.spec.ts        # Юнит-тест сервиса
│   ├── vending.controller.ts
│   └── vending.controller.spec.ts     # Юнит-тест контроллера
├── transactions/
│   ├── transactions.service.ts
│   └── transactions.service.spec.ts
├── components/
│   ├── MachineCard/
│   │   ├── MachineCard.tsx
│   │   └── MachineCard.spec.tsx       # Тест React компонента
│   └── TransactionTable/
│       ├── TransactionTable.tsx
│       └── TransactionTable.spec.tsx
test/
├── e2e/
│   ├── vending.e2e-spec.ts            # E2E тест модуля
│   ├── auth.e2e-spec.ts
│   └── machines.e2e-spec.ts
├── fixtures/
│   ├── machine.fixture.ts             # Фабрики тестовых данных
│   ├── transaction.fixture.ts
│   └── user.fixture.ts
├── jest-e2e.json                       # Конфигурация E2E тестов
└── setup.ts                            # Глобальная настройка
e2e/
├── playwright.config.ts                # Конфигурация Playwright
├── admin-login.spec.ts                 # Playwright E2E сценарии
├── machines.spec.ts
└── transactions.spec.ts
```

## Юнит-тест NestJS сервиса

```typescript
// src/vending/vending.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendingService } from './vending.service';
import { Machine } from './entities/machine.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { createMachineFixture } from '../../test/fixtures/machine.fixture';

// Тип для мока репозитория
type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

// Фабрика мока репозитория
const createMockRepository = <T>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('VendingService', () => {
  let service: VendingService;
  let machineRepo: MockRepository<Machine>;
  let transactionRepo: MockRepository<Transaction>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendingService,
        {
          provide: getRepositoryToken(Machine),
          useValue: createMockRepository<Machine>(),
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: createMockRepository<Transaction>(),
        },
      ],
    }).compile();

    service = module.get<VendingService>(VendingService);
    machineRepo = module.get(getRepositoryToken(Machine));
    transactionRepo = module.get(getRepositoryToken(Transaction));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllMachines', () => {
    it('должен вернуть список автоматов с пагинацией', async () => {
      // Подготовка
      const machines = [
        createMachineFixture({ id: 1, serialNumber: 'VH-001' }),
        createMachineFixture({ id: 2, serialNumber: 'VH-002' }),
      ];
      machineRepo.find.mockResolvedValue(machines);
      machineRepo.count.mockResolvedValue(2);

      // Действие
      const result = await service.findAllMachines({ page: 1, limit: 10 });

      // Проверка
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(machineRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });

    it('должен фильтровать автоматы по статусу', async () => {
      machineRepo.find.mockResolvedValue([]);
      machineRepo.count.mockResolvedValue(0);

      await service.findAllMachines({ status: 'online' });

      expect(machineRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'online' }),
        }),
      );
    });
  });

  describe('processTransaction', () => {
    it('должен создать транзакцию и обновить баланс автомата', async () => {
      // Подготовка
      const machine = createMachineFixture({ id: 1, balance: 50000 });
      machineRepo.findOne.mockResolvedValue(machine);
      transactionRepo.save.mockResolvedValue({ id: 100 });

      // Действие
      const result = await service.processTransaction({
        machineId: 1,
        amount: 5000,
        type: 'sale',
      });

      // Проверка
      expect(result.id).toBe(100);
      expect(machineRepo.update).toHaveBeenCalledWith(1, {
        balance: 55000,
      });
      expect(transactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          machineId: 1,
          amount: 5000,
          type: 'sale',
        }),
      );
    });

    it('должен выбросить ошибку если автомат не найден', async () => {
      machineRepo.findOne.mockResolvedValue(null);

      await expect(
        service.processTransaction({ machineId: 999, amount: 1000, type: 'sale' }),
      ).rejects.toThrow('Автомат не найден');
    });
  });
});
```

## Юнит-тест NestJS контроллера (supertest)

```typescript
// src/vending/vending.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { VendingController } from './vending.controller';
import { VendingService } from './vending.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { createMachineFixture } from '../../test/fixtures/machine.fixture';

describe('VendingController', () => {
  let app: INestApplication;
  let vendingService: Partial<VendingService>;

  beforeEach(async () => {
    // Мок сервиса
    vendingService = {
      findAllMachines: jest.fn(),
      findMachineById: jest.fn(),
      createMachine: jest.fn(),
      updateMachine: jest.fn(),
      deleteMachine: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendingController],
      providers: [
        { provide: VendingService, useValue: vendingService },
      ],
    })
      // Переопределяем guard для тестов
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /vending/machines', () => {
    it('должен вернуть 200 и список автоматов', async () => {
      const machines = [
        createMachineFixture({ serialNumber: 'VH-001' }),
        createMachineFixture({ serialNumber: 'VH-002' }),
      ];
      (vendingService.findAllMachines as jest.Mock).mockResolvedValue({
        items: machines,
        total: 2,
      });

      const response = await request(app.getHttpServer())
        .get('/vending/machines')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('должен вернуть 400 при невалидных параметрах пагинации', async () => {
      await request(app.getHttpServer())
        .get('/vending/machines')
        .query({ page: -1 })
        .expect(400);
    });
  });

  describe('POST /vending/machines', () => {
    it('должен создать автомат и вернуть 201', async () => {
      const newMachine = createMachineFixture({ id: 1 });
      (vendingService.createMachine as jest.Mock).mockResolvedValue(newMachine);

      const response = await request(app.getHttpServer())
        .post('/vending/machines')
        .send({
          serialNumber: 'VH-100',
          location: 'Ташкент, ул. Навои 10',
          model: 'VH-3000',
        })
        .expect(201);

      expect(response.body.id).toBe(1);
      expect(vendingService.createMachine).toHaveBeenCalledWith(
        expect.objectContaining({ serialNumber: 'VH-100' }),
      );
    });

    it('должен вернуть 400 без обязательных полей', async () => {
      await request(app.getHttpServer())
        .post('/vending/machines')
        .send({})
        .expect(400);
    });
  });

  describe('DELETE /vending/machines/:id', () => {
    it('должен удалить автомат и вернуть 200', async () => {
      (vendingService.deleteMachine as jest.Mock).mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/vending/machines/1')
        .expect(200);

      expect(vendingService.deleteMachine).toHaveBeenCalledWith(1);
    });
  });
});
```

## E2E тест NestJS (полный bootstrap)

```typescript
// test/e2e/vending.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Machine } from '../../src/vending/entities/machine.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMachineFixture } from '../fixtures/machine.fixture';

describe('Vending (e2e)', () => {
  let app: INestApplication;
  let machineRepo: Repository<Machine>;
  let authToken: string;

  beforeAll(async () => {
    // Поднимаем полное приложение с тестовой БД
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    machineRepo = moduleFixture.get<Repository<Machine>>(
      getRepositoryToken(Machine),
    );

    // Получаем токен авторизации для тестов
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@vendhub.uz', password: 'testpassword' });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Очищаем таблицу перед каждым тестом
    await machineRepo.clear();
  });

  describe('CRUD автоматов', () => {
    it('POST /vending/machines — создание нового автомата', async () => {
      const response = await request(app.getHttpServer())
        .post('/vending/machines')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          serialNumber: 'VH-E2E-001',
          location: 'Ташкент, ТЦ Мега Планет',
          model: 'VH-3000',
          slots: 30,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        serialNumber: 'VH-E2E-001',
        location: 'Ташкент, ТЦ Мега Планет',
        status: 'offline', // Статус по умолчанию
      });

      // Проверяем что запись реально в БД
      const saved = await machineRepo.findOneBy({ serialNumber: 'VH-E2E-001' });
      expect(saved).toBeDefined();
      expect(saved.slots).toBe(30);
    });

    it('GET /vending/machines — получение списка с пагинацией', async () => {
      // Засеиваем тестовые данные
      await machineRepo.save([
        machineRepo.create(createMachineFixture({ serialNumber: 'VH-E2E-010' })),
        machineRepo.create(createMachineFixture({ serialNumber: 'VH-E2E-011' })),
        machineRepo.create(createMachineFixture({ serialNumber: 'VH-E2E-012' })),
      ]);

      const response = await request(app.getHttpServer())
        .get('/vending/machines')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.total).toBe(3);
      expect(response.body.pages).toBe(2);
    });

    it('PUT /vending/machines/:id — обновление автомата', async () => {
      const machine = await machineRepo.save(
        machineRepo.create(createMachineFixture({ serialNumber: 'VH-UPD-001' })),
      );

      await request(app.getHttpServer())
        .put(`/vending/machines/${machine.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ location: 'Самарканд, ТЦ Регистан' })
        .expect(200);

      const updated = await machineRepo.findOneBy({ id: machine.id });
      expect(updated.location).toBe('Самарканд, ТЦ Регистан');
    });

    it('должен вернуть 401 без токена авторизации', async () => {
      await request(app.getHttpServer())
        .get('/vending/machines')
        .expect(401);
    });
  });
});
```

## Тест React компонента

```tsx
// src/components/MachineCard/MachineCard.spec.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MachineCard } from './MachineCard';

// Мок данных автомата
const mockMachine = {
  id: 1,
  serialNumber: 'VH-001',
  location: 'Ташкент, ТЦ Мега Планет',
  model: 'VH-3000',
  status: 'online' as const,
  balance: 150000,
  lastSync: '2024-11-15T10:30:00Z',
};

describe('MachineCard', () => {
  it('должен отображать информацию об автомате', () => {
    render(<MachineCard machine={mockMachine} />);

    expect(screen.getByText('VH-001')).toBeInTheDocument();
    expect(screen.getByText('Ташкент, ТЦ Мега Планет')).toBeInTheDocument();
    expect(screen.getByText('VH-3000')).toBeInTheDocument();
  });

  it('должен отображать статус онлайн зелёным цветом', () => {
    render(<MachineCard machine={mockMachine} />);

    const statusBadge = screen.getByTestId('machine-status');
    expect(statusBadge).toHaveClass('bg-green-500');
    expect(statusBadge).toHaveTextContent('Онлайн');
  });

  it('должен отображать статус оффлайн красным цветом', () => {
    const offlineMachine = { ...mockMachine, status: 'offline' as const };
    render(<MachineCard machine={offlineMachine} />);

    const statusBadge = screen.getByTestId('machine-status');
    expect(statusBadge).toHaveClass('bg-red-500');
    expect(statusBadge).toHaveTextContent('Оффлайн');
  });

  it('должен форматировать баланс в валюте UZS', () => {
    render(<MachineCard machine={mockMachine} />);

    // 150000 -> "150 000 сум"
    expect(screen.getByText(/150\s?000/)).toBeInTheDocument();
  });

  it('должен вызвать onSelect при клике на карточку', async () => {
    const handleSelect = jest.fn();
    const user = userEvent.setup();

    render(<MachineCard machine={mockMachine} onSelect={handleSelect} />);

    await user.click(screen.getByRole('article'));

    expect(handleSelect).toHaveBeenCalledWith(mockMachine.id);
  });

  it('должен показать меню действий по клику на кнопку', async () => {
    const user = userEvent.setup();

    render(<MachineCard machine={mockMachine} />);

    await user.click(screen.getByRole('button', { name: /действия/i }));

    expect(screen.getByText('Редактировать')).toBeVisible();
    expect(screen.getByText('Удалить')).toBeVisible();
    expect(screen.getByText('Перезагрузить')).toBeVisible();
  });
});
```

### Тест формы с валидацией

```tsx
// src/components/MachineForm/MachineForm.spec.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MachineForm } from './MachineForm';

describe('MachineForm', () => {
  it('должен отправить форму с валидными данными', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();

    render(<MachineForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Серийный номер'), 'VH-NEW-001');
    await user.type(screen.getByLabelText('Локация'), 'Бухара, ТЦ Арк');
    await user.selectOptions(screen.getByLabelText('Модель'), 'VH-3000');
    await user.type(screen.getByLabelText('Кол-во слотов'), '30');

    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        serialNumber: 'VH-NEW-001',
        location: 'Бухара, ТЦ Арк',
        model: 'VH-3000',
        slots: 30,
      });
    });
  });

  it('должен показать ошибки валидации для пустых полей', async () => {
    const user = userEvent.setup();

    render(<MachineForm onSubmit={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(screen.getByText('Серийный номер обязателен')).toBeInTheDocument();
    expect(screen.getByText('Укажите локацию')).toBeInTheDocument();
  });

  it('должен валидировать формат серийного номера', async () => {
    const user = userEvent.setup();

    render(<MachineForm onSubmit={jest.fn()} />);

    await user.type(screen.getByLabelText('Серийный номер'), 'invalid');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(
      screen.getByText('Формат: VH-XXX-NNN'),
    ).toBeInTheDocument();
  });
});
```

## Конфигурация Jest

### jest.config.ts (NestJS бэкенд)

```typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  // Модульная система
  moduleFileExtensions: ['js', 'json', 'ts'],

  // Корневая директория
  rootDir: '.',

  // Паттерн поиска тестов
  testRegex: '.*\\.spec\\.ts$',

  // Трансформация TypeScript
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // Тестовое окружение
  testEnvironment: 'node',

  // Маппинг путей (совпадает с tsconfig.paths)
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },

  // Директории для сбора покрытия
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.interface.ts',
    '!src/main.ts',
  ],

  // Директория отчётов покрытия
  coverageDirectory: './coverage',

  // Пороги покрытия
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Глобальная настройка
  setupFilesAfterSetup: ['<rootDir>/test/setup.ts'],

  // Таймаут тестов (мс)
  testTimeout: 30000,
};

export default config;
```

### jest-e2e.json (E2E тесты)

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "..",
  "testRegex": ".*\\.e2e-spec\\.ts$",
  "transform": {
    "^.+\\.ts$": "ts-jest"
  },
  "testEnvironment": "node",
  "moduleNameMapper": {
    "^@app/(.*)$": "<rootDir>/src/$1",
    "^@test/(.*)$": "<rootDir>/test/$1"
  },
  "testTimeout": 60000
}
```

### test/setup.ts

```typescript
// test/setup.ts
import { DataSource } from 'typeorm';

// Глобальный тестовый DataSource
let dataSource: DataSource;

beforeAll(async () => {
  // Инициализация тестовой БД (SQLite in-memory или тестовый PostgreSQL)
  dataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: ['src/**/*.entity.ts'],
    synchronize: true,
  });
  await dataSource.initialize();
});

afterAll(async () => {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
});
```

## Фикстуры и фабрики (TypeORM сущности)

```typescript
// test/fixtures/machine.fixture.ts
import { Machine } from '../../src/vending/entities/machine.entity';

// Счётчик для уникальных серийных номеров
let machineCounter = 0;

/**
 * Фабрика тестового автомата.
 * Возвращает частичный объект Machine для использования в тестах.
 */
export const createMachineFixture = (
  overrides: Partial<Machine> = {},
): Partial<Machine> => {
  machineCounter++;
  return {
    serialNumber: `VH-TEST-${String(machineCounter).padStart(3, '0')}`,
    location: 'Ташкент, тестовая локация',
    model: 'VH-3000',
    status: 'online',
    balance: 0,
    slots: 30,
    firmwareVersion: '2.1.0',
    lastSyncAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

/**
 * Фабрика массива автоматов.
 */
export const createMachinesFixture = (
  count: number,
  overrides: Partial<Machine> = {},
): Partial<Machine>[] =>
  Array.from({ length: count }, () => createMachineFixture(overrides));

/**
 * Сброс счётчика (вызывать в beforeEach если нужны предсказуемые номера).
 */
export const resetMachineCounter = (): void => {
  machineCounter = 0;
};
```

```typescript
// test/fixtures/transaction.fixture.ts
import { Transaction } from '../../src/transactions/entities/transaction.entity';

let txCounter = 0;

/**
 * Фабрика тестовой транзакции.
 */
export const createTransactionFixture = (
  overrides: Partial<Transaction> = {},
): Partial<Transaction> => {
  txCounter++;
  return {
    machineId: 1,
    amount: 5000,
    type: 'sale',
    productName: `Товар ${txCounter}`,
    slotNumber: 1,
    paymentMethod: 'cash',
    status: 'completed',
    createdAt: new Date(),
    ...overrides,
  };
};

export const createTransactionsFixture = (
  count: number,
  overrides: Partial<Transaction> = {},
): Partial<Transaction>[] =>
  Array.from({ length: count }, () => createTransactionFixture(overrides));

export const resetTransactionCounter = (): void => {
  txCounter = 0;
};
```

```typescript
// test/fixtures/user.fixture.ts
import { User } from '../../src/users/entities/user.entity';
import * as bcrypt from 'bcrypt';

let userCounter = 0;

/**
 * Фабрика тестового пользователя.
 */
export const createUserFixture = (
  overrides: Partial<User> = {},
): Partial<User> => {
  userCounter++;
  return {
    email: `user${userCounter}@vendhub.test`,
    name: `Тестовый Пользователь ${userCounter}`,
    passwordHash: bcrypt.hashSync('testpassword', 10),
    role: 'operator',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

export const resetUserCounter = (): void => {
  userCounter = 0;
};
```

## Playwright E2E тесты (веб-админка)

### Конфигурация Playwright

```typescript
// e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Директория с тестами
  testDir: '.',
  testMatch: '**/*.spec.ts',

  // Параллельный запуск
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,

  // Повторы при падении (CI)
  retries: process.env.CI ? 2 : 0,

  // Репортеры
  reporter: process.env.CI
    ? [['html'], ['github']]
    : [['html', { open: 'never' }]],

  // Глобальные настройки
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'ru-RU',
  },

  // Браузеры
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Автоматический запуск dev-сервера
  webServer: {
    command: 'npm run start:dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### Playwright E2E сценарий

```typescript
// e2e/machines.spec.ts
import { test, expect } from '@playwright/test';

// Авторизация перед всеми тестами в файле
test.beforeEach(async ({ page }) => {
  // Логин в админку
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@vendhub.uz');
  await page.getByLabel('Пароль').fill('testpassword');
  await page.getByRole('button', { name: 'Войти' }).click();

  // Ждём редирект на дашборд
  await expect(page).toHaveURL('/dashboard');
});

test.describe('Управление автоматами', () => {
  test('должен отображать таблицу автоматов', async ({ page }) => {
    await page.goto('/machines');

    await expect(
      page.getByRole('heading', { name: 'Автоматы' }),
    ).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();

    // Проверяем заголовки столбцов
    await expect(page.getByRole('columnheader', { name: 'Серийный номер' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Локация' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Статус' })).toBeVisible();
  });

  test('должен создать новый автомат через форму', async ({ page }) => {
    await page.goto('/machines');

    // Открываем модальное окно создания
    await page.getByRole('button', { name: 'Добавить автомат' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Заполняем форму
    await page.getByLabel('Серийный номер').fill('VH-PW-001');
    await page.getByLabel('Локация').fill('Ташкент, Чиланзар');
    await page.getByLabel('Модель').selectOption('VH-3000');
    await page.getByLabel('Кол-во слотов').fill('30');

    // Сохраняем
    await page.getByRole('button', { name: 'Сохранить' }).click();

    // Проверяем уведомление и строку в таблице
    await expect(page.getByText('Автомат успешно создан')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'VH-PW-001' })).toBeVisible();
  });

  test('должен фильтровать автоматы по статусу', async ({ page }) => {
    await page.goto('/machines');

    // Выбираем фильтр "Оффлайн"
    await page.getByRole('combobox', { name: 'Статус' }).selectOption('offline');

    // Все видимые статусы должны быть "Оффлайн"
    const statusCells = page.locator('[data-testid="machine-status"]');
    const count = await statusCells.count();
    for (let i = 0; i < count; i++) {
      await expect(statusCells.nth(i)).toHaveText('Оффлайн');
    }
  });

  test('должен открывать детальную страницу автомата', async ({ page }) => {
    await page.goto('/machines');

    // Кликаем по первой строке таблицы
    await page.getByRole('row').nth(1).click();

    // Проверяем что открылась страница с деталями
    await expect(page).toHaveURL(/\/machines\/\d+/);
    await expect(page.getByTestId('machine-detail')).toBeVisible();
    await expect(page.getByText('Транзакции')).toBeVisible();
    await expect(page.getByText('Статистика')).toBeVisible();
  });
});

test.describe('Транзакции', () => {
  test('должен отображать историю транзакций с фильтрами', async ({ page }) => {
    await page.goto('/transactions');

    await expect(page.getByRole('table')).toBeVisible();

    // Фильтр по дате
    await page.getByLabel('Дата от').fill('2024-11-01');
    await page.getByLabel('Дата до').fill('2024-11-30');
    await page.getByRole('button', { name: 'Применить' }).click();

    // Таблица должна обновиться (проверяем что спиннер пропал)
    await expect(page.getByTestId('loading-spinner')).not.toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('должен экспортировать транзакции в Excel', async ({ page }) => {
    await page.goto('/transactions');

    // Ожидаем скачивание файла при клике
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Экспорт' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/transactions.*\.xlsx$/);
  });
});
```

## Пороги покрытия и команды

### Команды запуска

```bash
# Юнит-тесты
npm run test                    # Запуск всех юнит-тестов
npm run test -- --watch         # Режим наблюдения
npm run test -- --coverage      # С отчётом о покрытии

# Запуск конкретного файла
npm run test -- vending.service.spec.ts

# E2E тесты (NestJS + supertest)
npm run test:e2e                # Запуск всех e2e-spec.ts

# Playwright E2E тесты
npx playwright test             # Все Playwright тесты
npx playwright test --ui        # Интерактивный режим
npx playwright test --project=chromium  # Только Chromium

# Покрытие
npm run test:cov                # Юнит-тесты с покрытием
```

### Целевые пороги покрытия

```text
Файл                      | Branches | Functions | Lines | Statements
---------------------------|----------|-----------|-------|----------
Глобальный минимум         |    70%   |    80%    |  80%  |    80%
Сервисы (*.service.ts)     |    75%   |    90%    |  85%  |    85%
Контроллеры (*.controller) |    60%   |    80%    |  75%  |    75%
```

### Скрипты package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r ts-jest/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:pw": "playwright test",
    "test:pw:ui": "playwright test --ui"
  }
}
```

## Ссылки

- `skills/vhm24-nestjs/SKILL.md` — Паттерны NestJS сервисов и контроллеров
- `skills/vhm24-database/SKILL.md` — TypeORM сущности и миграции
- `skills/vhm24-frontend/SKILL.md` — React компоненты
