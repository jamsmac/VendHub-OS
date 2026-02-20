# 🚀 VendHub OS - ПОЛНЫЙ ПРОМТ МИГРАЦИИ ФУНКЦИЙ

**Версия:** 2.0
**Дата:** 2026-01-17
**Статус:** Production-Ready Migration Guide

---

## 📋 ПОЛНЫЙ СПИСОК ФУНКЦИЙ ДЛЯ МИГРАЦИИ (22 функции)

### Категория A: Core Business Features (P0 - Критический)
| # | Функция | Модуль | Effort | Статус |
|---|---------|--------|--------|--------|
| 1 | Loyalty System (баллы, уровни) | `/modules/loyalty` | 3 дня | ⏳ |
| 2 | Daily/Weekly Quests | `/modules/quests` | 3 дня | ⏳ |
| 3 | Referral Program | `/modules/referrals` | 2 дня | ⏳ |
| 4 | Favorites (избранное) | `/modules/favorites` | 1 день | ⏳ |
| 5 | Telegram Payments | `/modules/telegram-bot` | 2 дня | ⏳ |

### Категория B: Integrations (P1 - Высокий)
| # | Функция | Модуль | Effort | Статус |
|---|---------|--------|--------|--------|
| 6 | Google Maps Integration | `/modules/geo` | 2 дня | ⏳ |
| 7 | Recommendation Engine | `/modules/recommendations` | 3 дня | ⏳ |
| 8 | Batch Database Operations | `/common/utils` | 2 дня | ⏳ |

### Категория C: Operations (P1 - Высокий)
| # | Функция | Модуль | Effort | Статус |
|---|---------|--------|--------|--------|
| 9 | Material Request Workflow | `/modules/material-requests` | 4 дня | ⏳ |
| 10 | Telegram Bot Admin Panel | `/modules/telegram-bot` | 3 дня | ⏳ |
| 11 | Employees Module | `/modules/employees` | 2 дня | ⏳ |
| 12 | Contractors Module | `/modules/contractors` | 2 дня | ⏳ |

### Категория D: Extended Features (P2 - Средний)
| # | Функция | Модуль | Effort | Статус |
|---|---------|--------|--------|--------|
| 13 | Extended Maintenance Workflow | `/modules/maintenance` | 3 дня | ⏳ |
| 14 | Work Logs Module | `/modules/work-logs` | 2 дня | ⏳ |
| 15 | Extended Inventory Workflow | `/modules/inventory` | 2 дня | ⏳ |
| 16 | Warehouse Zones | `/modules/inventory` | 1 день | ⏳ |

### Категория E: Nice-to-Have (P3 - Низкий)
| # | Функция | Модуль | Effort | Статус |
|---|---------|--------|--------|--------|
| 17 | AI Image Generation | `/modules/ai` | 2 дня | ⏳ |
| 18 | Voice Transcription | `/modules/ai` | 1 день | ⏳ |
| 19 | Sales Import (Legacy Data) | `/modules/import` | 2 дня | ⏳ |
| 20 | S3 + CloudFront Integration | `/modules/storage` | 2 дня | ⏳ |
| 21 | Offline Data Sync (Client) | Client-side | 3 дня | ⏳ |
| 22 | ELK Stack Logging | Infrastructure | 2 дня | ⏳ |

---

## 🔧 ОБЩИЕ ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ

### Стек технологий
```typescript
// Backend
NestJS 10.x
TypeORM 0.3.x
PostgreSQL 15+
Redis (кэширование)

// Валидация
class-validator
class-transformer

// Документация
@nestjs/swagger

// Тестирование
Jest
Supertest
```

### Структура каждого модуля
```
/apps/api/src/modules/{module-name}/
├── {module-name}.module.ts          # Module definition
├── {module-name}.controller.ts       # REST API endpoints
├── {module-name}.service.ts          # Business logic
├── dto/
│   ├── create-{entity}.dto.ts
│   ├── update-{entity}.dto.ts
│   └── {entity}-query.dto.ts
├── entities/
│   └── {entity}.entity.ts           # TypeORM entity
├── interfaces/
│   └── {entity}.interface.ts
├── guards/                          # If needed
├── decorators/                      # If needed
└── index.ts                         # Module exports
```

### Обязательные требования для каждой функции
1. ✅ TypeORM Entity с правильными индексами
2. ✅ DTO с валидацией (class-validator)
3. ✅ CRUD operations
4. ✅ Пагинация для списков
5. ✅ Мультитенантность (organizationId)
6. ✅ Роли и права доступа
7. ✅ Swagger документация
8. ✅ Unit тесты
9. ✅ Integration тесты
10. ✅ Soft delete где применимо

---

## 📝 ПРОМТЫ ДЛЯ ПОЭТАПНОЙ РЕАЛИЗАЦИИ

---

### 🔴 ЭТАП 1: LOYALTY SYSTEM (Система лояльности)

```
ПРОМТ:

Реализуй полноценную систему лояльности для VendHub OS.

КОНТЕКСТ:
- VendHub OS - monorepo для управления вендинговыми автоматами
- NestJS + TypeORM + PostgreSQL
- 7 ролей: owner, admin, manager, operator, warehouse, accountant, viewer
- Мультитенантность через organizationId

ТРЕБОВАНИЯ:

1. ENTITY: PointsTransaction
```typescript
@Entity('points_transactions')
export class PointsTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  organizationId: string;

  @Column()
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: PointsTransactionType,
  })
  type: PointsTransactionType; // earn | spend | adjust | expire

  @Column({ type: 'int' })
  amount: number; // +100 или -50

  @Column({ type: 'int' })
  balanceAfter: number;

  @Column({
    type: 'enum',
    enum: PointsSource,
  })
  source: PointsSource;
  // order | welcome_bonus | first_order | referral |
  // achievement | daily_quest | weekly_quest | promo |
  // admin | refund | expiry | purchase

  @Column({ nullable: true })
  referenceId: string; // orderId, questId, etc.

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date; // Когда баллы сгорят
}
```

2. РАСШИРИТЬ User Entity:
```typescript
// Добавить поля в User entity
@Column({ type: 'int', default: 0 })
pointsBalance: number;

@Column({
  type: 'enum',
  enum: LoyaltyLevel,
  default: LoyaltyLevel.BRONZE,
})
loyaltyLevel: LoyaltyLevel; // bronze | silver | gold | platinum

@Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
totalSpent: number;

@Column({ type: 'int', default: 0 })
totalOrders: number;

@Column({ default: false })
welcomeBonusReceived: boolean;

@Column({ type: 'int', default: 0 })
currentStreak: number; // Дней подряд заказов

@Column({ type: 'int', default: 0 })
longestStreak: number;

@Column({ type: 'date', nullable: true })
lastOrderDate: Date;
```

3. LOYALTY LEVELS:
```typescript
export enum LoyaltyLevel {
  BRONZE = 'bronze',     // 0+ баллов
  SILVER = 'silver',     // 1000+ баллов
  GOLD = 'gold',         // 5000+ баллов
  PLATINUM = 'platinum', // 20000+ баллов
}

export const LOYALTY_CONFIG = {
  levels: {
    bronze: { minPoints: 0, cashbackPercent: 1, bonusMultiplier: 1 },
    silver: { minPoints: 1000, cashbackPercent: 2, bonusMultiplier: 1.2 },
    gold: { minPoints: 5000, cashbackPercent: 3, bonusMultiplier: 1.5 },
    platinum: { minPoints: 20000, cashbackPercent: 5, bonusMultiplier: 2 },
  },
  bonuses: {
    welcome: 100,      // За регистрацию
    firstOrder: 50,    // За первый заказ
    referral: 200,     // За приглашенного друга
    referralBonus: 100, // Бонус приглашенному
    streakBonus: [10, 20, 30, 50, 100], // 3, 5, 7, 14, 30 дней подряд
  },
  pointsPerSum: 100, // 1 балл за каждые 100 сум
  pointsExpiryDays: 365,
};
```

4. SERVICE METHODS:
```typescript
// LoyaltyService
earnPoints(userId, amount, source, referenceId?, description?)
spendPoints(userId, amount, referenceId?, description?)
adjustPoints(userId, amount, reason, adminId)
getPointsHistory(userId, filters, pagination)
checkAndUpgradeLevel(userId)
processWelcomeBonus(userId)
processOrderPoints(userId, orderId, orderAmount)
processStreakBonus(userId)
calculatePointsToNextLevel(userId)
getAvailableRewards(userId)
expireOldPoints() // Cron job
```

5. API ENDPOINTS:
```
GET    /loyalty/balance          - Текущий баланс и уровень
GET    /loyalty/history          - История транзакций
GET    /loyalty/rewards          - Доступные награды
POST   /loyalty/redeem           - Использовать баллы
GET    /loyalty/levels           - Информация об уровнях
POST   /loyalty/admin/adjust     - [Admin] Корректировка баллов
GET    /loyalty/admin/stats      - [Admin] Статистика программы
```

6. CRON JOBS:
```typescript
// Ежедневно в 00:00 UTC+5
@Cron('0 0 * * *', { timeZone: 'Asia/Tashkent' })
async expirePoints()

// Ежедневно в 01:00 UTC+5
@Cron('0 1 * * *', { timeZone: 'Asia/Tashkent' })
async checkAndUpdateStreaks()

// Ежемесячно 1 числа
@Cron('0 0 1 * *', { timeZone: 'Asia/Tashkent' })
async recalculateLoyaltyLevels()
```

7. ИНТЕГРАЦИЯ:
- При создании заказа → начислять баллы
- При регистрации → welcome bonus
- При реферале → бонусы обоим
- EventEmitter для уведомлений

СОЗДАЙ ВСЕ ФАЙЛЫ:
- /apps/api/src/modules/loyalty/loyalty.module.ts
- /apps/api/src/modules/loyalty/loyalty.service.ts
- /apps/api/src/modules/loyalty/loyalty.controller.ts
- /apps/api/src/modules/loyalty/entities/points-transaction.entity.ts
- /apps/api/src/modules/loyalty/dto/*.dto.ts
- /apps/api/src/modules/loyalty/constants/loyalty.constants.ts
- /apps/api/src/modules/loyalty/index.ts
- Обнови User entity

SWAGGER, ВАЛИДАЦИЯ, ПРАВА ДОСТУПА - ОБЯЗАТЕЛЬНО.
```

---

### 🔴 ЭТАП 2: QUESTS SYSTEM (Система квестов)

```
ПРОМТ:

Реализуй систему ежедневных и еженедельных квестов для VendHub OS.

КОНТЕКСТ:
- Уже есть Loyalty System с баллами
- Квесты дают баллы за выполнение задач
- Сброс ежедневных квестов в 00:00, еженедельных в понедельник

ТРЕБОВАНИЯ:

1. ENTITY: Quest
```typescript
@Entity('quests')
export class Quest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  questKey: string; // 'daily_first_order', 'weekly_5_orders'

  @Column()
  title: string;

  @Column({ nullable: true })
  titleUz: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: QuestType,
  })
  type: QuestType;
  // order | spend | visit | share | review | referral | streak

  @Column({ type: 'int' })
  targetValue: number; // Сколько нужно для выполнения

  @Column({ type: 'int' })
  rewardPoints: number;

  @Column({
    type: 'enum',
    enum: QuestPeriod,
    default: QuestPeriod.DAILY,
  })
  period: QuestPeriod; // daily | weekly | monthly | one_time

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ nullable: true })
  iconUrl: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
```

2. ENTITY: UserQuestProgress
```typescript
@Entity('user_quest_progress')
@Index(['userId', 'questId', 'questDate'], { unique: true })
export class UserQuestProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  questId: string;

  @ManyToOne(() => Quest)
  @JoinColumn({ name: 'questId' })
  quest: Quest;

  @Column({ type: 'int', default: 0 })
  currentValue: number;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ default: false })
  rewardClaimed: boolean;

  @Column({ type: 'date' })
  questDate: Date; // Дата квеста (для daily/weekly)

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

3. PREDEFINED QUESTS:
```typescript
export const DEFAULT_QUESTS = [
  // Daily
  { questKey: 'daily_first_order', type: 'order', targetValue: 1, rewardPoints: 10, period: 'daily', title: 'Первый заказ' },
  { questKey: 'daily_3_orders', type: 'order', targetValue: 3, rewardPoints: 30, period: 'daily', title: '3 заказа за день' },
  { questKey: 'daily_spend_50000', type: 'spend', targetValue: 50000, rewardPoints: 25, period: 'daily', title: 'Потратить 50,000 сум' },

  // Weekly
  { questKey: 'weekly_10_orders', type: 'order', targetValue: 10, rewardPoints: 100, period: 'weekly', title: '10 заказов за неделю' },
  { questKey: 'weekly_spend_200000', type: 'spend', targetValue: 200000, rewardPoints: 100, period: 'weekly', title: 'Потратить 200,000 сум за неделю' },
  { questKey: 'weekly_5_machines', type: 'visit', targetValue: 5, rewardPoints: 50, period: 'weekly', title: '5 разных автоматов' },
  { questKey: 'weekly_referral', type: 'referral', targetValue: 1, rewardPoints: 200, period: 'weekly', title: 'Пригласить друга' },

  // Monthly
  { questKey: 'monthly_streak_7', type: 'streak', targetValue: 7, rewardPoints: 200, period: 'monthly', title: '7 дней подряд' },
  { questKey: 'monthly_50_orders', type: 'order', targetValue: 50, rewardPoints: 500, period: 'monthly', title: '50 заказов за месяц' },
];
```

4. SERVICE METHODS:
```typescript
// QuestsService
getActiveQuests(userId) → {daily: Quest[], weekly: Quest[], monthly: Quest[]}
getUserQuestProgress(userId, questId) → UserQuestProgress
updateQuestProgress(userId, type, value, metadata?)
claimQuestReward(userId, questId)
resetDailyQuests() // Cron
resetWeeklyQuests() // Cron
resetMonthlyQuests() // Cron
seedDefaultQuests()

// Автоматическое обновление при событиях:
onOrderCreated(order) → updateQuestProgress('order', 1)
onOrderCreated(order) → updateQuestProgress('spend', order.amount)
onMachineVisit(userId, machineId) → updateQuestProgress('visit', 1)
onReferralCompleted(userId) → updateQuestProgress('referral', 1)
```

5. API ENDPOINTS:
```
GET    /quests                    - Список активных квестов с прогрессом
GET    /quests/progress           - Только прогресс пользователя
POST   /quests/:questId/claim     - Забрать награду
GET    /quests/history            - История выполненных квестов
POST   /quests/admin/create       - [Admin] Создать квест
PUT    /quests/admin/:id          - [Admin] Обновить квест
DELETE /quests/admin/:id          - [Admin] Удалить квест
POST   /quests/admin/seed         - [Admin] Загрузить дефолтные квесты
```

6. CRON JOBS:
```typescript
@Cron('0 0 * * *', { timeZone: 'Asia/Tashkent' })
async resetDailyQuests()

@Cron('0 0 * * 1', { timeZone: 'Asia/Tashkent' }) // Понедельник
async resetWeeklyQuests()

@Cron('0 0 1 * *', { timeZone: 'Asia/Tashkent' }) // 1 число
async resetMonthlyQuests()
```

7. ИНТЕГРАЦИЯ С LOYALTY:
- При claimQuestReward → вызывать loyaltyService.earnPoints()
- EventEmitter: quest.completed, quest.claimed

СОЗДАЙ ВСЕ ФАЙЛЫ ДЛЯ МОДУЛЯ QUESTS.
```

---

### 🔴 ЭТАП 3: REFERRAL PROGRAM

```
ПРОМТ:

Реализуй реферальную программу для VendHub OS.

ТРЕБОВАНИЯ:

1. ENTITY: ReferralCode
```typescript
@Entity('referral_codes')
export class ReferralCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  @Index()
  userId: string; // Владелец кода

  @Column({ unique: true, length: 10 })
  code: string; // Автогенерируемый: 'VH' + random(8)

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', nullable: true })
  maxUses: number; // null = unlimited

  @Column({ type: 'int', default: 0 })
  currentUses: number;

  @Column({ type: 'int', default: 200 })
  referrerReward: number; // Награда владельцу

  @Column({ type: 'int', default: 100 })
  refereeReward: number; // Награда приглашенному

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
```

2. ENTITY: Referral
```typescript
@Entity('referrals')
@Index(['referrerId', 'refereeId'], { unique: true })
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  @Index()
  referrerId: string; // Кто пригласил

  @Column()
  @Index()
  refereeId: string; // Кого пригласили

  @Column()
  referralCodeId: string;

  @ManyToOne(() => ReferralCode)
  @JoinColumn({ name: 'referralCodeId' })
  referralCode: ReferralCode;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus; // pending | completed | cancelled

  @Column({ type: 'int', default: 0 })
  referrerRewardPoints: number;

  @Column({ type: 'int', default: 0 })
  refereeRewardPoints: number;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date; // Когда реферал совершил первый заказ

  @CreateDateColumn()
  createdAt: Date;
}
```

3. SERVICE METHODS:
```typescript
// ReferralsService
generateReferralCode(userId) → ReferralCode
getReferralCode(userId) → ReferralCode | null
applyReferralCode(newUserId, code) → Referral
completeReferral(referralId) // При первом заказе реферала
getReferralStats(userId) → { totalReferred, totalEarned, pendingRewards }
getReferralHistory(userId, pagination)
getReferralLink(userId) → string // t.me/VendHubBot?start=ref_<code>

// Вызывается при первом заказе нового пользователя
onFirstOrder(userId, orderId) {
  const referral = await this.findPendingReferral(userId);
  if (referral) {
    await this.completeReferral(referral.id);
  }
}
```

4. API ENDPOINTS:
```
GET    /referrals/code            - Получить свой реферальный код
POST   /referrals/code/generate   - Сгенерировать код (если нет)
GET    /referrals/link            - Получить deep link
POST   /referrals/apply           - Применить чужой код (при регистрации)
GET    /referrals/stats           - Статистика рефералов
GET    /referrals/history         - История приглашений
GET    /referrals/admin/all       - [Admin] Все рефералы
```

5. ИНТЕГРАЦИЯ:
- При регистрации через Telegram с ref_<code> → applyReferralCode
- При первом заказе → completeReferral → начислить баллы обоим
- EventEmitter: referral.created, referral.completed

СОЗДАЙ ПОЛНЫЙ МОДУЛЬ REFERRALS.
```

---

### 🔴 ЭТАП 4: FAVORITES

```
ПРОМТ:

Реализуй модуль избранного для VendHub OS.

ТРЕБОВАНИЯ:

1. ENTITY: Favorite
```typescript
@Entity('favorites')
@Unique(['userId', 'productId'])
@Index(['userId'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @CreateDateColumn()
  createdAt: Date;
}
```

2. SERVICE METHODS:
```typescript
addToFavorites(userId, productId)
removeFromFavorites(userId, productId)
getFavorites(userId, pagination) → Product[]
isFavorite(userId, productId) → boolean
getFavoritesCount(userId) → number
toggleFavorite(userId, productId) → { isFavorite: boolean }
```

3. API ENDPOINTS:
```
POST   /favorites/:productId        - Добавить в избранное
DELETE /favorites/:productId        - Удалить из избранного
GET    /favorites                   - Список избранного
GET    /favorites/check/:productId  - Проверить в избранном ли
POST   /favorites/:productId/toggle - Переключить
```

4. РАСШИРИТЬ PRODUCT RESPONSE:
```typescript
// При возврате продукта добавлять
isFavorite: boolean (если авторизован)
favoritesCount: number
```

СОЗДАЙ МОДУЛЬ FAVORITES - ПРОСТОЙ, НО ПОЛНОСТЬЮ РАБОЧИЙ.
```

---

### 🔴 ЭТАП 5: TELEGRAM PAYMENTS

```
ПРОМТ:

Добавь поддержку Telegram Payments в VendHub OS.

ТРЕБОВАНИЯ:

1. РАСШИРИТЬ Transaction entity:
```typescript
// Добавить в PaymentMethod enum
TELEGRAM = 'telegram'

// Новые поля
@Column({ nullable: true })
telegramPaymentChargeId: string;

@Column({ nullable: true })
telegramProviderPaymentChargeId: string;

@Column({ nullable: true })
telegramInvoicePayload: string;
```

2. TELEGRAM BOT METHODS:
```typescript
// TelegramBotService
async sendInvoice(
  chatId: number,
  title: string,
  description: string,
  payload: string, // orderId
  currency: string, // 'UZS'
  prices: { label: string; amount: number }[]
) → Message

async handlePreCheckoutQuery(query: PreCheckoutQuery)
async handleSuccessfulPayment(message: Message)

// Invoice payload format
interface InvoicePayload {
  orderId: string;
  userId: string;
  machineId: string;
  productIds: string[];
}
```

3. PAYMENT FLOW:
```
1. User выбирает товар → createOrder(pending)
2. Bot отправляет Invoice
3. Telegram показывает форму оплаты
4. pre_checkout_query → validate order
5. successful_payment → complete order, update transaction
6. Send confirmation message
```

4. HANDLERS:
```typescript
@On('pre_checkout_query')
async onPreCheckoutQuery(ctx: Context)

@On('successful_payment')
async onSuccessfulPayment(ctx: Context)
```

ОБНОВИ СУЩЕСТВУЮЩИЙ TELEGRAM BOT MODULE.
```

---

### 🟠 ЭТАП 6: GOOGLE MAPS INTEGRATION

```
ПРОМТ:

Реализуй интеграцию с Google Maps для VendHub OS.

ТРЕБОВАНИЯ:

1. GEO MODULE:
```typescript
// /modules/geo/geo.module.ts
// /modules/geo/geo.service.ts
// /modules/geo/geo.controller.ts
```

2. SERVICE METHODS:
```typescript
// GeoService
geocode(address: string) → { lat: number; lng: number; formattedAddress: string }
reverseGeocode(lat: number, lng: number) → { address: string; city: string; district: string }
calculateDistance(origin: Coordinates, destination: Coordinates) → { distanceKm: number; durationMinutes: number }
findNearestMachines(lat: number, lng: number, radiusKm: number) → Machine[]
getDirections(origin: Coordinates, destination: Coordinates) → Route
validateCoordinates(lat: number, lng: number) → boolean

// Coordinates interface
interface Coordinates {
  lat: number;
  lng: number;
}
```

3. API ENDPOINTS:
```
POST   /geo/geocode              - Адрес → координаты
POST   /geo/reverse-geocode      - Координаты → адрес
POST   /geo/distance             - Расстояние между точками
GET    /geo/nearest-machines     - Ближайшие автоматы
POST   /geo/directions           - Маршрут
```

4. ENVIRONMENT:
```
GOOGLE_MAPS_API_KEY=...
```

5. КЭШИРОВАНИЕ:
- Geocode результаты кэшировать в Redis на 24 часа
- Distance результаты кэшировать на 1 час

СОЗДАЙ GEO MODULE С GOOGLE MAPS CLIENT.
```

---

### 🟠 ЭТАП 7: RECOMMENDATION ENGINE

```
ПРОМТ:

Реализуй систему рекомендаций для VendHub OS.

ТРЕБОВАНИЯ:

1. RECOMMENDATION TYPES:
```typescript
export enum RecommendationType {
  HISTORY = 'history',       // На основе истории покупок
  FAVORITE = 'favorite',     // Избранные товары
  POPULAR = 'popular',       // Популярное на автомате
  TIME_BASED = 'time',       // По времени суток
  SIMILAR = 'similar',       // Похожие товары
  NEW = 'new',               // Новинки
  SEASONAL = 'seasonal',     // Сезонное
  PERSONALIZED = 'personalized', // AI-based
}
```

2. SERVICE METHODS:
```typescript
// RecommendationsService
getPersonalizedRecommendations(userId, machineId, limit: 10) → RecommendedProduct[]
getPopularProducts(machineId, period: '24h' | '7d' | '30d', limit) → Product[]
getTimeBasedRecommendations(hour: number, machineId) → Product[]
getSimilarProducts(productId, limit) → Product[]
getNewProducts(machineId, days: 30, limit) → Product[]
getFrequentlyBoughtTogether(productId) → Product[]

// RecommendedProduct
interface RecommendedProduct extends Product {
  recommendationType: RecommendationType;
  score: number; // 0-100
  reason?: string; // "Вы покупали раньше"
}
```

3. ALGORITHMS:
```typescript
// History-based: последние 30 дней заказов пользователя
// Popular: COUNT orders GROUP BY productId, machineId
// Time-based: кофе утром, снеки днем, напитки вечером
// Similar: по категории и ценовому диапазону
// Frequently bought together: co-occurrence в заказах
```

4. API ENDPOINTS:
```
GET /recommendations                     - Персональные рекомендации
GET /recommendations/popular/:machineId  - Популярное на автомате
GET /recommendations/similar/:productId  - Похожие товары
GET /recommendations/for-you             - Подборка "Для вас"
```

5. КЭШИРОВАНИЕ:
- Popular на 1 час
- Similar на 24 часа
- Personalized на 15 минут

СОЗДАЙ RECOMMENDATIONS MODULE.
```

---

### 🟠 ЭТАП 8: MATERIAL REQUESTS WORKFLOW

```
ПРОМТ:

Реализуй полный workflow заявок на материалы для VendHub OS.

ТРЕБОВАНИЯ:

1. ENTITY: MaterialRequest
```typescript
@Entity('material_requests')
export class MaterialRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  organizationId: string;

  @Column({ unique: true })
  requestNumber: string; // MR-2025-00001

  @Column()
  requesterId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @Column({
    type: 'enum',
    enum: MaterialRequestStatus,
    default: MaterialRequestStatus.DRAFT,
  })
  status: MaterialRequestStatus;

  @Column({ type: 'enum', enum: RequestPriority, default: RequestPriority.NORMAL })
  priority: RequestPriority; // low | normal | high | urgent

  @Column({ nullable: true })
  supplierId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount: number;

  // Approval
  @Column({ nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  // Timestamps
  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @OneToMany(() => MaterialRequestItem, item => item.request)
  items: MaterialRequestItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Status enum
export enum MaterialRequestStatus {
  DRAFT = 'draft',
  NEW = 'new',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SENT = 'sent',
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
```

2. ENTITY: MaterialRequestItem
```typescript
@Entity('material_request_items')
export class MaterialRequestItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  requestId: string;

  @ManyToOne(() => MaterialRequest, req => req.items)
  @JoinColumn({ name: 'requestId' })
  request: MaterialRequest;

  @Column()
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalPrice: number;

  @Column({ type: 'int', default: 0 })
  deliveredQuantity: number;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
```

3. WORKFLOW:
```typescript
// State transitions
DRAFT → NEW (submit)
NEW → APPROVED (approve)
NEW → REJECTED (reject)
APPROVED → SENT (sendToSupplier)
SENT → PENDING_PAYMENT (requestPayment)
PENDING_PAYMENT → PAID/PARTIALLY_PAID (recordPayment)
PAID → DELIVERED (confirmDelivery)
DELIVERED → COMPLETED (complete)
Any → CANCELLED (cancel, with reason)
```

4. SERVICE METHODS:
```typescript
createRequest(userId, items)
submitRequest(requestId)
approveRequest(requestId, approverId)
rejectRequest(requestId, reason, rejecterId)
sendToSupplier(requestId)
recordPayment(requestId, amount, paymentMethod)
confirmDelivery(requestId, deliveredItems)
completeRequest(requestId)
cancelRequest(requestId, reason)
getRequestHistory(organizationId, filters, pagination)
getPendingApprovals(organizationId)
```

5. API ENDPOINTS:
```
POST   /material-requests                    - Создать заявку
GET    /material-requests                    - Список заявок
GET    /material-requests/:id                - Детали заявки
PUT    /material-requests/:id                - Обновить черновик
DELETE /material-requests/:id                - Удалить черновик

POST   /material-requests/:id/submit         - Отправить на утверждение
POST   /material-requests/:id/approve        - Утвердить
POST   /material-requests/:id/reject         - Отклонить
POST   /material-requests/:id/send           - Отправить поставщику
POST   /material-requests/:id/payment        - Записать оплату
POST   /material-requests/:id/delivery       - Подтвердить доставку
POST   /material-requests/:id/complete       - Завершить
POST   /material-requests/:id/cancel         - Отменить

GET    /material-requests/pending            - Ожидающие утверждения
GET    /material-requests/stats              - Статистика
```

6. ПРАВА ДОСТУПА:
- Создание: operator, warehouse, manager
- Утверждение: manager, admin, owner
- Оплата: accountant, admin, owner
- Просмотр всех: manager+

7. УВЕДОМЛЕНИЯ:
- При создании → manager
- При утверждении → requester, accountant
- При отклонении → requester
- При доставке → requester, warehouse

СОЗДАЙ ПОЛНЫЙ MATERIAL-REQUESTS MODULE.
```

---

### 🟠 ЭТАП 9: EMPLOYEES MODULE

```
ПРОМТ:

Реализуй модуль сотрудников для VendHub OS (отдельно от Users).

ТРЕБОВАНИЯ:

1. ENTITY: Employee
```typescript
@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  organizationId: string;

  @Column({ nullable: true })
  userId: string; // Link to User (optional)

  @Column({ unique: true })
  employeeNumber: string; // EMP-001

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  middleName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({
    type: 'enum',
    enum: EmployeeRole,
  })
  employeeRole: EmployeeRole;

  @Column({
    type: 'enum',
    enum: EmployeeStatus,
    default: EmployeeStatus.ACTIVE,
  })
  status: EmployeeStatus;

  @Column({ nullable: true })
  telegramUserId: string;

  @Column({ nullable: true })
  telegramUsername: string;

  @Column({ type: 'date' })
  hireDate: Date;

  @Column({ type: 'date', nullable: true })
  terminationDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  salary: number;

  @Column({
    type: 'enum',
    enum: SalaryFrequency,
    nullable: true,
  })
  salaryFrequency: SalaryFrequency;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  documents: { type: string; url: string; uploadedAt: Date }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

// Enums
export enum EmployeeRole {
  OPERATOR = 'operator',
  TECHNICIAN = 'technician',
  WAREHOUSE = 'warehouse',
  DRIVER = 'driver',
  MANAGER = 'manager',
  ACCOUNTANT = 'accountant',
}

export enum EmployeeStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

export enum SalaryFrequency {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}
```

2. SERVICE METHODS:
```typescript
createEmployee(data)
updateEmployee(id, data)
terminateEmployee(id, terminationDate, reason)
linkToUser(employeeId, userId)
unlinkFromUser(employeeId)
getEmployeeByTelegram(telegramUserId)
getEmployeesByRole(organizationId, role)
getActiveEmployees(organizationId)
getEmployeeStats(organizationId)
```

3. API ENDPOINTS:
```
POST   /employees                  - Создать сотрудника
GET    /employees                  - Список сотрудников
GET    /employees/:id              - Детали сотрудника
PUT    /employees/:id              - Обновить
DELETE /employees/:id              - Удалить (soft)

POST   /employees/:id/terminate    - Уволить
POST   /employees/:id/link-user    - Связать с User
POST   /employees/:id/unlink-user  - Отвязать от User

GET    /employees/by-role/:role    - По роли
GET    /employees/stats            - Статистика
```

СОЗДАЙ EMPLOYEES MODULE.
```

---

### 🟠 ЭТАП 10: CONTRACTORS MODULE

```
ПРОМТ:

Реализуй модуль подрядчиков для VendHub OS.

ТРЕБОВАНИЯ:

1. ENTITY: Contractor
```typescript
@Entity('contractors')
export class Contractor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  organizationId: string;

  @Column()
  companyName: string;

  @Column({ nullable: true })
  contactPerson: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({
    type: 'enum',
    enum: ServiceType,
  })
  serviceType: ServiceType;

  @Column({ type: 'date', nullable: true })
  contractStart: Date;

  @Column({ type: 'date', nullable: true })
  contractEnd: Date;

  @Column({ type: 'text', nullable: true })
  paymentTerms: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating: number; // 1.00 - 5.00

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  bankDetails: {
    bankName: string;
    accountNumber: string;
    inn?: string;
  };

  @OneToMany(() => ContractorInvoice, invoice => invoice.contractor)
  invoices: ContractorInvoice[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Enum
export enum ServiceType {
  MAINTENANCE = 'maintenance',
  CLEANING = 'cleaning',
  DELIVERY = 'delivery',
  REPAIR = 'repair',
  SECURITY = 'security',
  OTHER = 'other',
}
```

2. ENTITY: ContractorInvoice
```typescript
@Entity('contractor_invoices')
export class ContractorInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column()
  contractorId: string;

  @ManyToOne(() => Contractor, c => c.invoices)
  @JoinColumn({ name: 'contractorId' })
  contractor: Contractor;

  @Column({ unique: true })
  invoiceNumber: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PENDING,
  })
  status: InvoiceStatus;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ type: 'date', nullable: true })
  paidDate: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-array', nullable: true })
  attachmentUrls: string[];

  @CreateDateColumn()
  createdAt: Date;
}

export enum InvoiceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}
```

3. API ENDPOINTS:
```
POST   /contractors                       - Создать подрядчика
GET    /contractors                       - Список подрядчиков
GET    /contractors/:id                   - Детали
PUT    /contractors/:id                   - Обновить
DELETE /contractors/:id                   - Удалить

POST   /contractors/:id/invoices          - Добавить счет
GET    /contractors/:id/invoices          - Счета подрядчика
PUT    /contractors/invoices/:invoiceId   - Обновить счет
POST   /contractors/invoices/:id/approve  - Утвердить счет
POST   /contractors/invoices/:id/pay      - Отметить оплаченным

GET    /contractors/by-service/:type      - По типу услуг
GET    /contractors/stats                 - Статистика
```

СОЗДАЙ CONTRACTORS MODULE.
```

---

## 📊 СВОДНАЯ ТАБЛИЦА РЕАЛИЗАЦИИ

| Этап | Функция | Файлы | Est. Time |
|------|---------|-------|-----------|
| 1 | Loyalty System | 7 файлов | 3 дня |
| 2 | Quests System | 7 файлов | 3 дня |
| 3 | Referral Program | 6 файлов | 2 дня |
| 4 | Favorites | 5 файлов | 1 день |
| 5 | Telegram Payments | Обновление 3 файлов | 2 дня |
| 6 | Google Maps | 4 файла | 2 дня |
| 7 | Recommendations | 4 файла | 3 дня |
| 8 | Material Requests | 7 файлов | 4 дня |
| 9 | Employees | 5 файлов | 2 дня |
| 10 | Contractors | 6 файлов | 2 дня |

**ИТОГО:** ~24 дня разработки (4-5 недель при полной загрузке)

---

## 🎯 ПОРЯДОК ВЫПОЛНЕНИЯ

### Неделя 1
- [ ] Loyalty System (Этап 1)
- [ ] Quests System (Этап 2)

### Неделя 2
- [ ] Referral Program (Этап 3)
- [ ] Favorites (Этап 4)
- [ ] Telegram Payments (Этап 5)

### Неделя 3
- [ ] Google Maps (Этап 6)
- [ ] Recommendations (Этап 7)

### Неделя 4
- [ ] Material Requests (Этап 8)

### Неделя 5
- [ ] Employees (Этап 9)
- [ ] Contractors (Этап 10)

---

## ✅ КРИТЕРИИ PRODUCTION READY

Для каждого модуля должны быть выполнены:

1. **Code Quality**
   - [ ] TypeScript strict mode
   - [ ] ESLint без ошибок
   - [ ] Prettier formatting
   - [ ] No any types

2. **Documentation**
   - [ ] Swagger decorators на всех endpoints
   - [ ] JSDoc комментарии на сервисах
   - [ ] README.md в папке модуля

3. **Security**
   - [ ] Валидация всех входных данных
   - [ ] RBAC на всех endpoints
   - [ ] SQL injection protection
   - [ ] Rate limiting

4. **Testing**
   - [ ] Unit tests (>80% coverage)
   - [ ] Integration tests
   - [ ] E2E tests для критичных flows

5. **Performance**
   - [ ] Индексы на часто используемых полях
   - [ ] Пагинация на списках
   - [ ] Кэширование где нужно
   - [ ] Batch operations

6. **Operations**
   - [ ] Health checks
   - [ ] Logging
   - [ ] Error handling
   - [ ] Graceful shutdown

---

*Используй этот документ как руководство для поэтапной реализации всех функций.*
