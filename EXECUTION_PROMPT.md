# VendHub OS — МАСТЕР-ПРОМТ ИСПОЛНЕНИЯ

# Доработка до 100% Production Ready

> **ИНСТРУКЦИЯ ДЛЯ AI-АГЕНТА**: Этот промт — пошаговое руководство по доведению проекта VendHub OS до полной боевой готовности. Работай последовательно по этапам. После каждого этапа запускай верификацию. НЕ переходи к следующему этапу пока текущий не пройдёт все проверки с 0 ошибками.

---

## КОНТЕКСТ ПРОЕКТА

VendHub OS — платформа управления вендинговыми автоматами для Узбекистана.
Монорепозиторий (Turborepo + pnpm) с 5 приложениями.

**Корень проекта**: `vendhub-unified/`

### Приложения

| App         | Путь               | Технология                            | Порт |
| ----------- | ------------------ | ------------------------------------- | ---- |
| API Backend | `apps/api/`        | NestJS 11.1 + TypeORM + PostgreSQL 16 | 4000 |
| Web Admin   | `apps/web/`        | Next.js 16.1 + React 19 (App Router)  | 3000 |
| Client PWA  | `apps/client/`     | Vite 5.4 + React 19                   | 5173 |
| Bot         | `apps/bot/`        | Telegraf 4.16                         | —    |
| Mobile      | `apps/mobile/`     | React Native + Expo 52                | —    |
| Shared      | `packages/shared/` | TypeScript + tsup                     | —    |

### ⛔ ЗАПРЕЩЁННЫЕ ТЕХНОЛОГИИ (НИКОГДА не использовать)

- ❌ Drizzle ORM → используй **TypeORM 0.3.20**
- ❌ MySQL → используй **PostgreSQL 16**
- ❌ tRPC → используй **NestJS controllers + class-validator DTOs**
- ❌ Express standalone → используй **NestJS (который внутри использует Express)**
- ❌ Prisma → используй **TypeORM**

### Текущее состояние (на момент старта)

- API: 59 модулей, 93 entities, 49 миграций, 1646 тестов (0 failures), 0 TS errors
- Web: 33 dashboard routes, middleware, error/loading pages
- Client PWA: 16 страниц (Loyalty, Quests, Referrals — есть)
- Mobile: 15 экранов (только staff: tasks, machines, inventory)
- Bot: 14 файлов, базовые команды
- Shared: 26 файлов (types, constants, utils)

---

## ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА КОДА

Каждый файл, который ты создаёшь или редактируешь, ОБЯЗАН соблюдать ВСЕ правила ниже. Нарушение любого правила = баг, который нужно исправить до перехода дальше.

### Правило 1: BaseEntity

```typescript
// КАЖДАЯ entity ОБЯЗАНА наследовать BaseEntity
import { BaseEntity } from "../../../common/entities/base.entity";

@Entity("table_name")
export class MyEntity extends BaseEntity {
  // BaseEntity даёт: id (UUID), created_at, updated_at, deleted_at, created_by_id, updated_by_id
  // НИКОГДА не добавляй эти поля вручную
}
```

### Правило 2: UUID everywhere

```typescript
// Все PK — UUID (string), все FK — string | null
@PrimaryGeneratedColumn('uuid')
id: string;

@Column({ type: 'uuid', nullable: true })
organization_id: string | null;
```

### Правило 3: snake_case в БД

```typescript
@Column({ type: 'varchar', length: 100 })
machine_number: string;  // НЕ machineNumber
```

### Правило 4: class-validator на ВСЕХ inputs

```typescript
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Length,
  IsUUID,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateAchievementDto {
  @ApiProperty({ description: "Название достижения" })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
```

### Правило 5: Swagger на ВСЕХ endpoints

```typescript
@ApiTags('achievements')
@Controller('achievements')
@UseGuards(JwtAuthGuard, RolesGuard, OrganizationGuard)
export class AchievementsController {
  @Get()
  @ApiOperation({ summary: 'Get all achievements' })
  @Roles('admin', 'manager')
  async findAll(@Query() query: FindAchievementsDto) { ... }
}
```

### Правило 6: Только soft delete

```typescript
// Используй .softDelete() и .restore(), НИКОГДА .delete()
await this.repo.softDelete(id);
await this.repo.restore(id);
```

### Правило 7: Multi-tenant фильтрация

```typescript
// КАЖДЫЙ запрос фильтруется по organization_id
async findAll(organizationId: string): Promise<Achievement[]> {
  return this.repo.find({
    where: { organization_id: organizationId },
  });
}
```

### Правило 8: Регистрация модулей

Каждый новый модуль ОБЯЗАН быть:

1. Зарегистрирован в `apps/api/src/app.module.ts`
2. Иметь минимум 1 unit-тест (`.spec.ts`)
3. Экспортировать service если используется другими модулями

### Правило 9: Структура модуля API

```
src/modules/<module-name>/
├── <module-name>.module.ts
├── <module-name>.controller.ts
├── <module-name>.service.ts
├── <module-name>.service.spec.ts      # ОБЯЗАТЕЛЬНО
├── dto/
│   ├── create-<name>.dto.ts
│   └── update-<name>.dto.ts
├── entities/
│   └── <name>.entity.ts
└── constants/                         # если нужны enum/const
    └── <name>.constants.ts
```

### Правило 10: Фронтенд-стандарты

```typescript
// React компоненты:
// - Functional components only (не class)
// - TypeScript strict mode
// - shadcn/ui + Radix UI + TailwindCSS 3.4
// - Zustand 5 для state management
// - React Hook Form 7.61 + Zod для форм
// - @tanstack/react-table 8 для таблиц
// - Recharts 2.15 для графиков
// - Lucide React для иконок
// - i18next для локализации (ru, uz, en)
```

---

## ЭТАП 1: BACKEND — Loyalty доп-модули

### Задача 1.1: Модуль Achievements (Достижения)

Создать полный модуль на основе спецификации VendHub.docx (7 механик лояльности).

**Файлы для создания:**

```
apps/api/src/modules/achievements/
├── achievements.module.ts
├── achievements.controller.ts
├── achievements.service.ts
├── achievements.service.spec.ts
├── dto/
│   ├── create-achievement.dto.ts
│   └── update-achievement.dto.ts
├── entities/
│   ├── achievement.entity.ts
│   └── user-achievement.entity.ts
└── constants/
    └── achievement.constants.ts
```

**achievement.constants.ts**:

```typescript
export enum AchievementCategory {
  PURCHASE = "purchase", // Покупки
  VISIT = "visit", // Посещения
  SOCIAL = "social", // Социальная активность
  STREAK = "streak", // Серии
  LOYALTY = "loyalty", // Программа лояльности
  SPECIAL = "special", // Специальные
}

export enum AchievementRarity {
  COMMON = "common",
  RARE = "rare",
  EPIC = "epic",
  LEGENDARY = "legendary",
}
```

**achievement.entity.ts** — Обязательные поля:

- name: string (varchar 255)
- description: string (text)
- icon: string (varchar 100) — имя иконки из Lucide
- category: AchievementCategory (enum)
- rarity: AchievementRarity (enum)
- criteria_type: string — тип критерия ('total_purchases', 'consecutive_days', 'referral_count', etc.)
- criteria_value: number — целевое значение
- points_reward: number — награда в баллах
- is_active: boolean
- organization_id: string (UUID)

**user-achievement.entity.ts** — Обязательные поля:

- user_id: string (UUID)
- achievement_id: string (UUID)
- unlocked_at: Date
- current_progress: number (default 0)
- organization_id: string (UUID)

**Контроллер endpoints:**

- `GET /api/v1/achievements` — список всех достижений (с пагинацией)
- `GET /api/v1/achievements/:id` — детали достижения
- `POST /api/v1/achievements` — создать (admin/manager)
- `PATCH /api/v1/achievements/:id` — обновить (admin/manager)
- `DELETE /api/v1/achievements/:id` — soft delete (admin)
- `GET /api/v1/achievements/user/:userId` — достижения пользователя
- `POST /api/v1/achievements/:id/check` — проверить прогресс пользователя

**Сервис логика:**

- checkAndUnlock(userId, criteriaType, currentValue) — проверяет все достижения по типу критерия, если currentValue >= criteria_value → разблокирует
- getUserProgress(userId) — возвращает все достижения с прогрессом
- unlockAchievement(userId, achievementId) — разблокирует + начисляет points_reward через LoyaltyService

### Задача 1.2: Модуль Streaks (Серии)

**Файлы для создания:**

```
apps/api/src/modules/streaks/
├── streaks.module.ts
├── streaks.controller.ts
├── streaks.service.ts
├── streaks.service.spec.ts
├── dto/
│   ├── check-in.dto.ts
│   └── update-streak.dto.ts
├── entities/
│   └── user-streak.entity.ts
└── constants/
    └── streak.constants.ts
```

**user-streak.entity.ts** — Поля:

- user_id: string (UUID, unique per organization)
- current_streak: number (default 0)
- longest_streak: number (default 0)
- last_activity_date: Date
- freeze_tokens: number (default 3) — 3 в месяц, обнуляются 1-го числа
- freeze_tokens_used: number (default 0)
- total_check_ins: number (default 0)
- organization_id: string (UUID)

**Сервис логика:**

- checkIn(userId, orgId) — ежедневный check-in:
  - Если last_activity_date === today → уже зачекинился (ошибка)
  - Если last_activity_date === yesterday → current_streak++
  - Если last_activity_date < yesterday - 1 → проверить freeze_tokens, если есть → использовать, иначе current_streak = 1
  - Обновить longest_streak если current_streak > longest_streak
  - Начислить бонусы за серию: 7 дней = 100pts, 14 = 300pts, 30 = 1000pts
- getStreak(userId) — текущее состояние
- resetFreezeTokens() — @Cron('0 0 1 \* \*') — обнуление 1-го числа месяца

**Контроллер endpoints:**

- `POST /api/v1/streaks/check-in` — ежедневный check-in
- `GET /api/v1/streaks/me` — текущая серия
- `POST /api/v1/streaks/use-freeze` — использовать freeze token
- `GET /api/v1/streaks/user/:userId` — серия пользователя (admin)

### Задача 1.3: Leaderboard (в составе loyalty module)

Добавить в существующий `apps/api/src/modules/loyalty/`:

**Новые файлы:**

- `loyalty/leaderboard.service.ts`
- `loyalty/leaderboard.controller.ts`
- `loyalty/dto/leaderboard-query.dto.ts`

**leaderboard.service.ts** логика:

- Использовать Redis sorted sets (ioredis) для real-time рейтинга
- Keys: `leaderboard:${orgId}:${period}` (weekly, monthly, alltime)
- addPoints(userId, points, orgId) — ZINCRBY
- getLeaderboard(orgId, period, limit, offset) — ZREVRANGE с scores
- getUserRank(userId, orgId, period) — ZREVRANK
- resetWeekly() — @Cron('0 0 \* \* 1') — обнуление еженедельного рейтинга
- resetMonthly() — @Cron('0 0 1 \* \*')

**Контроллер endpoints:**

- `GET /api/v1/loyalty/leaderboard?period=weekly&limit=100&offset=0`
- `GET /api/v1/loyalty/leaderboard/me?period=weekly` — моя позиция
- `GET /api/v1/loyalty/leaderboard/friends?period=weekly` — друзья

### Задача 1.4: Anti-fraud улучшения в Loyalty

Добавить в `apps/api/src/modules/loyalty/loyalty.service.ts`:

```typescript
// Rate limiting на earn
private async checkEarnRateLimit(userId: string, orgId: string): Promise<void> {
  const key = `earn_rate:${orgId}:${userId}`;
  const count = await this.redis.incr(key);
  if (count === 1) await this.redis.expire(key, 3600); // 1 hour window
  if (count > 50) throw new TooManyRequestsException('Earn rate limit exceeded');
}

// Velocity check — не больше X баллов в день
private async checkDailyVelocity(userId: string, orgId: string, points: number): Promise<void> {
  const key = `daily_earn:${orgId}:${userId}:${new Date().toISOString().split('T')[0]}`;
  const total = await this.redis.incrby(key, points);
  if (total === points) await this.redis.expire(key, 86400);
  if (total > 10000) { // max 10,000 pts/day
    await this.redis.decrby(key, points);
    throw new BadRequestException('Daily earning limit exceeded');
  }
}
```

### ✅ ВЕРИФИКАЦИЯ ЭТАПА 1

После создания всех файлов запусти:

```bash
# 1. TypeScript компиляция (0 ошибок)
cd apps/api && npx tsc --noEmit
# Если есть ошибки → исправь ВСЕ → повтори

# 2. Все тесты проходят
npx jest --forceExit --passWithNoTests
# Если есть failures → исправь ВСЕ → повтори

# 3. Lint
npx eslint src/modules/achievements src/modules/streaks --fix
# Если есть ошибки → исправь ВСЕ → повтори

# КРИТЕРИЙ ПРОХОЖДЕНИЯ: 0 TS errors, 0 test failures, 0 lint errors
# Если хоть один check не пройден → НЕ переходи к Этапу 2
```

---

## ЭТАП 2: CLIENT PWA — Бонусные страницы

### Задача 2.1: AchievementsPage

**Файл**: `apps/client/src/pages/AchievementsPage.tsx`

Содержание:

- Галерея достижений в виде grid (3 колонки на desktop, 2 на mobile)
- Каждый badge: иконка (Lucide), название, описание, rarity (цветовая рамка)
- Unlocked badges — яркие, с датой разблокировки
- Locked badges — серые, с прогресс-баром (current/target)
- Фильтры: All, Unlocked, Locked, по категории
- Анимация при разблокировке (confetti / shimmer)
- API: `GET /api/v1/achievements/user/me`

### Задача 2.2: LeaderboardPage

**Файл**: `apps/client/src/pages/LeaderboardPage.tsx`

Содержание:

- Табы: Неделя / Месяц / Все время
- Top-3 с крупными аватарами и анимацией (gold/silver/bronze)
- Список #4-#100 с компактными строками
- Своя позиция — sticky footer с подсветкой
- Анонимизация: показывать "Ja\*\*\*d" (первые 2 + маска)
- Pull-to-refresh
- API: `GET /api/v1/loyalty/leaderboard?period=weekly`

### Задача 2.3: StreaksPage

**Файл**: `apps/client/src/pages/StreaksPage.tsx`

Содержание:

- Calendar heatmap (последние 90 дней) — зелёные дни = check-in, серые = пропуск
- Current streak counter (большой число по центру)
- Longest streak record
- Freeze tokens display (3 иконки ❄️)
- Кнопка "Check-in сегодня" (POST /api/v1/streaks/check-in)
- Награды за серии: 7 дней = 100 pts, 14 = 300, 30 = 1000
- API: `GET /api/v1/streaks/me`

### Задача 2.4: Обновление роутера

**Файл**: `apps/client/src/App.tsx` — добавить routes:

```tsx
<Route path="achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
<Route path="leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
<Route path="streaks" element={<ProtectedRoute><StreaksPage /></ProtectedRoute>} />
```

### Задача 2.5: Улучшения существующих страниц

**LoyaltyPage.tsx** — добавить:

- Виджет текущей серии (streak) с маленьким flame icon
- Секция "Мои достижения" — последние 3 unlocked badges
- Ссылка "Все достижения →" → /achievements

**HomePage.tsx** — добавить:

- Баннер текущей акции / квеста дня
- Mini streak counter в header

**QuestsPage.tsx** — добавить:

- Таймер до сброса daily квестов (countdown)
- Анимация claim reward (particles / haptic feedback)

### ✅ ВЕРИФИКАЦИЯ ЭТАПА 2

```bash
# 1. TypeScript (0 ошибок)
cd apps/client && npx tsc --noEmit
# Если ошибки → исправь → повтори

# 2. Build проходит
npx vite build
# Если ошибки → исправь → повтори

# 3. Lint
npx eslint src/ --fix
# Если ошибки → исправь → повтори

# КРИТЕРИЙ: 0 TS errors, build success, 0 lint errors
```

---

## ЭТАП 3: WEB ADMIN — Bonus Dashboard

### Задача 3.1: Bonus Dashboard Page

На основе спецификации `vendhub-bonus-dashboard-ru.html` создать полный раздел управления бонусной программой.

**Новые файлы:**

```
apps/web/src/app/dashboard/loyalty/
├── page.tsx                          # Обзор бонусной программы
├── layout.tsx                        # Layout с табами
├── tiers/
│   └── page.tsx                      # Управление уровнями
├── quests/
│   └── page.tsx                      # Управление квестами
├── achievements/
│   └── page.tsx                      # Управление достижениями
├── promo-codes/
│   └── page.tsx                      # Управление промо-кодами
├── leaderboard/
│   └── page.tsx                      # Настройки лидерборда
└── anti-fraud/
    └── page.tsx                      # Мониторинг мошенничества
```

**page.tsx (Обзор)** — KPI виджеты:

- Активные участники (число + % роста)
- Баллы выдано сегодня / неделя / месяц
- Конверсия по тирам (воронка: Bronze → Silver → Gold → Platinum)
- Графики: начисление/списание баллов (Recharts LineChart), новые участники (BarChart)
- Топ-10 пользователей (таблица)

**tiers/page.tsx** — CRUD для уровней:

- Таблица с тирами: название, minPoints, multiplier, cashback%, цвет, иконка
- Модалка создания/редактирования тира
- Drag-and-drop для сортировки

**quests/page.tsx** — управление квестами:

- Таблица: название, тип (daily/weekly/monthly), категория, награда, статус (active/inactive), статистика выполнения
- Фильтры: по типу, статусу, категории
- Модалка создания квеста с React Hook Form + Zod validation
- Расписание: начало/конец, повторение

**achievements/page.tsx** — управление достижениями:

- Grid достижений с badges
- CRUD с модалкой: name, description, icon picker (Lucide), category, rarity, criteria_type, criteria_value, points_reward
- Статистика: сколько пользователей разблокировали каждое

**promo-codes/page.tsx** — промо-коды:

- Таблица: код, тип скидки (% / fixed), лимит использований, срок действия, статус
- Генерация случайных кодов (batch generate)
- Экспорт в CSV

**anti-fraud/page.tsx** — мониторинг:

- Аномалии: пользователи с необычной активностью (>50 earn/час, >10000 pts/день)
- Velocity rules: настройка лимитов
- Блокировка подозрительных аккаунтов
- Логи событий безопасности

### Задача 3.2: Навигация

Добавить в sidebar (`apps/web/src/app/dashboard/layout.tsx`):

- Раздел "Бонусная программа" с иконкой Gift
- Подразделы: Обзор, Уровни, Квесты, Достижения, Промо-коды, Лидерборд, Anti-fraud

### ✅ ВЕРИФИКАЦИЯ ЭТАПА 3

```bash
cd apps/web && npx tsc --noEmit && npm run build
# 0 TS errors, build success
# Визуально проверь каждую страницу
```

---

## ЭТАП 4: WEB ADMIN — MachineDetailPage

### Задача 4.1: Machine Detail

**Путь**: `apps/web/src/app/dashboard/machines/[id]/page.tsx`

На основе спецификации экрана #3 (03-machine-detail) создать детальную страницу автомата.

**Содержание:**

- Header: фото автомата, номер, модель, статус (badge), локация
- Табы: Обзор | Телеметрия | Заказы | Инвентарь | Обслуживание | Финансы

**Обзор таб:**

- KPI карточки: продажи сегодня (UZS), заказов, uptime %, последний визит техника
- График продаж за 7 дней (Recharts AreaChart)
- Статус бункеров (прогресс-бары: кофе, молоко, вода, стаканы)

**Телеметрия таб:**

- Real-time данные через WebSocket (apps/api WebSocket gateway)
- Температура, давление, уровни бункеров
- Графики в реальном времени (обновление каждые 5 сек)

**Заказы таб:**

- Таблица последних заказов (@tanstack/react-table)
- Фильтры: дата, продукт, способ оплаты
- Пагинация

**Инвентарь таб:**

- Текущий уровень каждого ингредиента
- Прогноз: когда закончится (на основе средних продаж)
- Кнопка "Создать задачу на загрузку"

**Обслуживание таб:**

- История обслуживания (таблица)
- Расписание ТО
- Кнопка "Создать задачу на ТО"

**Финансы таб:**

- Выручка по дням/неделям/месяцам (BarChart)
- Расходы на ингредиенты
- Прибыль = выручка - расходы
- ROI калькулятор

### ✅ ВЕРИФИКАЦИЯ ЭТАПА 4

```bash
cd apps/web && npx tsc --noEmit && npm run build
# 0 TS errors, build success
```

---

## ЭТАП 5: CLIENT WEBSITE — Лендинг

### Задача 5.1: Клиентский сайт

Создать лендинг для привлечения клиентов. Реализовать как отдельные routes в `apps/client/` (public routes, без авторизации).

**Дизайн "Warm Brew":**

- Палитра: Cream (#FDF6E3), Espresso (#43302B), Caramel (#D4A76A), Amber (#F59E0B)
- Шрифты: DM Sans (body, через Google Fonts), Playfair Display (headings)
- Стиль: premium coffee aesthetic, warm tones, smooth animations

**Новые файлы:**

```
apps/client/src/pages/landing/
├── LandingPage.tsx          # Главная с Hero
├── AboutPage.tsx            # О компании
├── PartnershipPage.tsx      # Для партнёров
├── components/
│   ├── HeroSection.tsx
│   ├── ProductsSection.tsx
│   ├── MapSection.tsx
│   ├── BonusSection.tsx
│   ├── PartnersSection.tsx
│   ├── ContactSection.tsx
│   ├── LandingHeader.tsx
│   └── LandingFooter.tsx
```

**HeroSection**: Заголовок "Умные кофейные автоматы нового поколения", CTA "Скачать приложение", фоновый gradient
**ProductsSection**: Карточки напитков с ценами в UZS (кофе от 8,000 сум, чай от 5,000 сум, какао от 10,000 сум)
**MapSection**: Интеграция Leaflet карты с маркерами автоматов в Ташкенте (11 районов из TASHKENT_DISTRICTS)
**BonusSection**: Объяснение тиров (Bronze→Platinum), как зарабатывать баллы, преимущества каждого уровня
**PartnersSection**: "Установите автомат в ваш офис" — форма заявки (React Hook Form + Zod)
**ContactSection**: Telegram @vendhub, Instagram, email, телефон +998

**SEO (для каждой landing-страницы):**

- `<title>`, `<meta description>`, Open Graph tags
- JSON-LD schema для LocalBusiness

**i18n:**

- Русский (default), Узбекский, English — переключатель в header

### ✅ ВЕРИФИКАЦИЯ ЭТАПА 5

```bash
cd apps/client && npx tsc --noEmit && npx vite build
# 0 errors, build success
```

---

## ЭТАП 6: MOBILE — Клиентские бонусные экраны

### Задача 6.1: Dual-mode Navigation

В `apps/mobile/src/navigation/` добавить:

- `ClientNavigator.tsx` — навигация для клиентского режима
- Обновить `RootNavigator.tsx` — switch по роли: staff → MainNavigator, client → ClientNavigator

### Задача 6.2: Новые экраны (11 штук)

Все в `apps/mobile/src/screens/client/`:

| #   | Экран                  | Приоритет | Описание                                        |
| --- | ---------------------- | --------- | ----------------------------------------------- |
| 1   | ClientHomeScreen.tsx   | P0        | Баланс, тир, ближайший автомат, активные квесты |
| 2   | LoyaltyScreen.tsx      | P0        | Тиры, прогресс, история баллов                  |
| 3   | QuestsScreen.tsx       | P0        | Daily/weekly квесты, claim                      |
| 4   | AchievementsScreen.tsx | P1        | Галерея badges                                  |
| 5   | LeaderboardScreen.tsx  | P1        | Рейтинг                                         |
| 6   | StreakScreen.tsx       | P1        | Calendar heatmap, check-in                      |
| 7   | ReferralScreen.tsx     | P1        | Код, QR, share                                  |
| 8   | QRScanScreen.tsx       | P0        | Камера + QR (expo-camera)                       |
| 9   | OrderHistoryScreen.tsx | P1        | История заказов                                 |
| 10  | MapScreen.tsx          | P0        | react-native-maps + кластеры                    |
| 11  | ProfileScreen.tsx      | P0        | Профиль клиента, edit данных                    |

**Каждый экран ОБЯЗАН:**

- Быть TypeScript strict
- Использовать React Native компоненты (View, Text, ScrollView, FlatList)
- Использовать Zustand store для state
- Использовать React Query для API запросов
- Иметь loading / error / empty states
- Быть responsive (работать на iPhone SE → iPad)

### Задача 6.3: Push Notifications

```bash
npx expo install expo-notifications expo-device
```

Создать `apps/mobile/src/services/notifications.ts`:

- registerForPushNotifications() — получить Expo push token, отправить на API
- Обработка: streak reminder, quest completed, achievement unlocked, promo expiring
- Scheduled: ежедневное напоминание о check-in (если streak > 0 и не зачекинился)

### ✅ ВЕРИФИКАЦИЯ ЭТАПА 6

```bash
cd apps/mobile && npx tsc --noEmit
# 0 TS errors
npx expo export --platform web  # или expo build проверка
```

---

## ЭТАП 7: TELEGRAM BOT — Расширение

### Задача 7.1: Новые команды

В `apps/bot/src/handlers/commands.ts` добавить:

| Команда       | Описание                             |
| ------------- | ------------------------------------ |
| /balance      | Баланс баллов и текущий тир          |
| /quests       | Список активных квестов с прогрессом |
| /leaderboard  | Топ-10 рейтинга этой недели          |
| /referral     | Мой реферальный код + ссылка         |
| /nearest      | Ближайший автомат (по геолокации)    |
| /streak       | Текущая серия дней                   |
| /achievements | Мои достижения (последние 5)         |
| /checkin      | Daily check-in для streak            |

### Задача 7.2: Inline Keyboards

Для каждой команды — inline keyboard с навигацией:

- /balance → кнопки: [Квесты] [Рейтинг] [Достижения]
- /quests → кнопки: [Daily] [Weekly] [Claim All]
- Callback handlers в `apps/bot/src/handlers/callbacks.ts`

### Задача 7.3: Payment Flow

Интегрировать оплату через бота:

- Telegram Stars (для цифровых товаров)
- WebApp Mini App (для Payme/Click/Uzum)

### ✅ ВЕРИФИКАЦИЯ ЭТАПА 7

```bash
cd apps/bot && npx tsc --noEmit
# 0 TS errors
```

---

## ЭТАП 8: INFRASTRUCTURE HARDENING

### Задача 8.1: Kubernetes

Обновить все deployment.yml в `infrastructure/k8s/`:

- Resource limits: cpu 100m-500m, memory 128Mi-512Mi
- Readiness probe: httpGet /health, initialDelaySeconds: 10
- Liveness probe: httpGet /health, periodSeconds: 30
- HPA для api: minReplicas 2, maxReplicas 10, targetCPU 70%

### Задача 8.2: Docker

Проверить все Dockerfile:

- Multi-stage build (builder → runner)
- Non-root user (USER 1001)
- .dockerignore (node_modules, .git, tests, \*.spec.ts)
- HEALTHCHECK instruction

### Задача 8.3: Monitoring

В `infrastructure/monitoring/`:

- Prometheus: scrape config для api (metrics endpoint)
- Grafana dashboards: API health, business KPIs, loyalty metrics
- Alert rules: error rate > 5%, latency p99 > 2s, pod restart > 3

### ✅ ВЕРИФИКАЦИЯ ЭТАПА 8

```bash
# Docker build проходит для всех apps
docker build -f apps/api/Dockerfile -t vendhub-api .
docker build -f apps/web/Dockerfile -t vendhub-web .
docker build -f apps/client/Dockerfile -t vendhub-client .
docker build -f apps/bot/Dockerfile -t vendhub-bot .

# K8s манифесты валидны
kubectl apply --dry-run=client -f infrastructure/k8s/
```

---

## ЭТАП 9: E2E ТЕСТЫ

### Задача 9.1: Playwright тесты

В `apps/web/tests/e2e/`:

```
├── auth.spec.ts              # Login → Dashboard
├── machines.spec.ts          # CRUD автоматов
├── loyalty.spec.ts           # Bonus dashboard операции
├── tasks.spec.ts             # Создание/выполнение задач
└── reports.spec.ts           # Генерация отчётов
```

### Задача 9.2: API E2E тесты

В `apps/api/test/`:

```
├── auth.e2e-spec.ts          # Register → Login → Token refresh
├── loyalty.e2e-spec.ts       # Earn points → Level up → Leaderboard
├── achievements.e2e-spec.ts  # Create → Check progress → Unlock
├── streaks.e2e-spec.ts       # Check-in → Streak → Freeze → Break
```

### ✅ ВЕРИФИКАЦИЯ ЭТАПА 9

```bash
# Unit тесты
cd apps/api && npx jest --forceExit --passWithNoTests
# 0 failures

# E2E (если есть DB)
npx jest --config jest-e2e.config.ts --forceExit
```

---

## ЭТАП 10: ФИНАЛЬНАЯ ПОЛИРОВКА

### Задача 10.1: Settings Page (полная)

`apps/web/src/app/dashboard/settings/page.tsx` — табы:

- Организация: название, логотип, timezone, язык
- Пользователи: RBAC management, invite, deactivate
- Уведомления: email/telegram/push preferences
- Интеграции: API keys, webhooks, payment providers
- Billing: текущий план, история платежей

### Задача 10.2: Shared Types

Обновить `packages/shared/src/types/` — добавить:

- `achievement.types.ts`
- `streak.types.ts`
- `leaderboard.types.ts`
- `loyalty-extended.types.ts`

### Задача 10.3: i18n Coverage

Проверить что ВСЕ строки в client, web, mobile имеют переводы:

- ru (Russian) — default
- uz (Uzbek)
- en (English)

### ✅ ФИНАЛЬНАЯ ВЕРИФИКАЦИЯ

```bash
# ==============================
# ПОЛНАЯ ПРОВЕРКА ВСЕГО ПРОЕКТА
# ==============================

# 1. TypeScript — ВСЕ apps (0 errors)
cd apps/api && npx tsc --noEmit && echo "✅ API TS OK"
cd ../web && npx tsc --noEmit && echo "✅ Web TS OK"
cd ../client && npx tsc --noEmit && echo "✅ Client TS OK"
cd ../bot && npx tsc --noEmit && echo "✅ Bot TS OK"
cd ../mobile && npx tsc --noEmit && echo "✅ Mobile TS OK"

# 2. Unit тесты — ВСЕ проходят
cd ../../apps/api && npx jest --forceExit --passWithNoTests
echo "✅ Tests OK: 0 failures"

# 3. Build — ВСЕ apps собираются
cd ../.. && pnpm build
echo "✅ Build OK"

# 4. Lint — 0 warnings
pnpm lint
echo "✅ Lint OK"

# 5. Docker — ВСЕ images собираются
docker compose build
echo "✅ Docker OK"
```

---

## АЛГОРИТМ РАБОТЫ (для AI-агента)

```
ДЛЯ КАЖДОГО ЭТАПА (1 → 10):
  1. Прочитай задачу этапа
  2. Создай/отредактируй ВСЕ файлы этапа
  3. Запусти верификацию этапа
  4. ЕСЛИ есть ошибки:
     a. Прочитай ошибку
     b. Найди файл с ошибкой
     c. Исправь ошибку
     d. GOTO 3 (повтори верификацию)
  5. ЕСЛИ 0 ошибок → переходи к следующему этапу
  6. После ВСЕХ этапов → запусти ФИНАЛЬНУЮ ВЕРИФИКАЦИЮ
  7. ЕСЛИ финальная верификация не проходит → найди и исправь проблемы → GOTO 6
  8. ГОТОВО когда ВСЕ проверки = 0 ошибок
```

**ВАЖНО:**

- НЕ пропускай ошибки. Каждая ошибка ДОЛЖНА быть исправлена.
- НЕ переходи к следующему этапу с ошибками в текущем.
- Используй `Task` tool с параллельными агентами для ускорения.
- Используй VHM24 skills (vhm24-api-generator, vhm24-ui-generator, vhm24-testing) для best practices.
- Всегда проверяй что import paths правильные.
- Всегда проверяй что новые модули зарегистрированы в app.module.ts.
- НИКОГДА не используй Drizzle, MySQL, tRPC — только TypeORM + PostgreSQL + NestJS controllers.

---

## БИЗНЕС-КОНТЕКСТ (для правильных решений)

- Рынок: Узбекистан
- Валюта: UZS (Uzbek Sum), формат: `1 000 000 сум`
- Языки: uz-UZ (узбекский), ru-RU (русский), en (английский)
- Timezone: Asia/Tashkent (UTC+5)
- Платёжные системы: Payme, Click, Uzum Bank, HUMO, UZCARD, Telegram Stars, наличные, баллы
- Фискализация: OFD / Soliq.uz / Multikassa
- Районы Ташкента: 11 (Алмазарский, Чиланзарский, Юнусабадский, etc.)
- Тиры лояльности: Bronze (0), Silver (1000), Gold (5000), Platinum (15000)
- Достижения: 15+ по спеке (First Purchase, Coffee Lover, Social Butterfly, etc.)
- Квесты: daily (купи 3 напитка), weekly (потрать 50,000), monthly (пригласи 5 друзей)
- Anti-fraud: max 50 earn/час, max 10,000 pts/день, device fingerprinting
