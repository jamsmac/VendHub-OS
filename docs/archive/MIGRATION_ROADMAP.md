# VendHub OS - Roadmap миграции функций из других проектов

**Дата:** 2026-01-17
**Версия:** 1.0

---

## 📊 ОБЗОР

На основе глубокого анализа всех репозиториев в `/VHM24/` выявлены следующие функции и модули, которые **ОТСУТСТВУЮТ** в VendHub OS, но реализованы в других проектах.

---

## 🔴 КРИТИЧЕСКИЙ ПРИОРИТЕТ (P0) - Необходимо немедленно

### 1. Система лояльности (Loyalty System)
**Источник:** `vhm24v2/drizzle/schema.ts`

**Что нужно добавить:**

```typescript
// Расширить User entity
pointsBalance: number           // Текущий баланс бонусов
loyaltyLevel: enum             // bronze | silver | gold | platinum
totalSpent: number             // Общая сумма покупок
totalOrders: number            // Количество заказов
welcomeBonusReceived: boolean  // Получен ли приветственный бонус
currentStreak: number          // Текущая серия дней
longestStreak: number          // Лучшая серия

// Новая entity: PointsTransaction
id, userId, type, amount, balanceAfter
description, source, referenceId, createdAt

// Source enum:
order | welcome_bonus | first_order | referral |
achievement | daily_quest | promo | admin | refund
```

**Файлы для создания:**
- `/apps/api/src/modules/loyalty/loyalty.module.ts`
- `/apps/api/src/modules/loyalty/entities/points-transaction.entity.ts`
- `/apps/api/src/modules/loyalty/loyalty.service.ts`
- `/apps/api/src/modules/loyalty/loyalty.controller.ts`

---

### 2. Система квестов (Daily/Weekly Quests)
**Источник:** `vhm24v2/server/scheduledTasks.ts`, `vhm24v2/drizzle/schema.ts`

**Что нужно добавить:**

```typescript
// Entity: DailyQuest
id, questKey (unique), title, description
type: enum (order | spend | visit | share | review | referral)
targetValue: number
rewardPoints: number
isWeekly: boolean
isActive: boolean

// Entity: UserQuestProgress
id, userId, questId
currentValue: number
isCompleted: boolean
rewardClaimed: boolean
questDate: Date
completedAt: Date

// Cron job для сброса квестов
resetDailyQuestsJob() // каждый день в 00:00 UTC+5
resetWeeklyQuestsJob() // каждый понедельник в 00:00 UTC+5
```

**Файлы для создания:**
- `/apps/api/src/modules/quests/quests.module.ts`
- `/apps/api/src/modules/quests/entities/daily-quest.entity.ts`
- `/apps/api/src/modules/quests/entities/user-quest-progress.entity.ts`
- `/apps/api/src/modules/quests/quests.service.ts`
- `/apps/api/src/modules/quests/quests.controller.ts`
- `/apps/api/src/modules/quests/quests.scheduler.ts`

---

### 3. Telegram Payments Integration
**Источник:** `vhm24v2/server/telegramBot.ts`

**Что нужно добавить:**

```typescript
// Расширить Transaction entity
paymentMethod: enum + 'TELEGRAM'
telegramPaymentChargeId: string
telegramInvoiceId: string

// Telegram Bot payments handlers
createInvoice(userId, amount, description)
handlePaymentCallback(chargeId)
sendPaymentConfirmation(userId, transactionId)
```

**Файлы для модификации:**
- `/apps/api/src/modules/transactions/entities/transaction.entity.ts`
- `/apps/api/src/modules/telegram-bot/telegram-bot.service.ts`

---

### 4. Избранное (Favorites)
**Источник:** `vhm24v2/drizzle/schema.ts`

**Что нужно добавить:**

```typescript
// Entity: Favorite
id, organizationId, userId, productId
createdAt
// Unique constraint: (userId, productId)
// Index: userId

// API endpoints
POST /favorites/:productId
DELETE /favorites/:productId
GET /favorites
```

**Файлы для создания:**
- `/apps/api/src/modules/favorites/favorites.module.ts`
- `/apps/api/src/modules/favorites/entities/favorite.entity.ts`
- `/apps/api/src/modules/favorites/favorites.service.ts`
- `/apps/api/src/modules/favorites/favorites.controller.ts`

---

### 5. Реферальная программа (Referrals)
**Источник:** Отсутствует во всех проектах, но упоминается в pointsTransactions

**Что нужно создать:**

```typescript
// Entity: ReferralCode
id, organizationId, userId
code: string (unique, auto-generated)
isActive: boolean
maxUses: number (optional)
currentUses: number
expiresAt: Date (optional)
rewardPoints: number
createdAt

// Entity: Referral
id, organizationId
referrerId: userId (who referred)
refereeId: userId (who was referred)
referralCodeId
status: enum (pending | completed | cancelled)
rewardPoints: number
completedAt: Date

// Deep link generation
generateReferralLink(userId) → t.me/VendHubBot?start=ref_<code>
```

**Файлы для создания:**
- `/apps/api/src/modules/referrals/referrals.module.ts`
- `/apps/api/src/modules/referrals/entities/referral-code.entity.ts`
- `/apps/api/src/modules/referrals/entities/referral.entity.ts`
- `/apps/api/src/modules/referrals/referrals.service.ts`
- `/apps/api/src/modules/referrals/referrals.controller.ts`

---

## 🟠 ВЫСОКИЙ ПРИОРИТЕТ (P1) - В течение 2 недель

### 6. Google Maps Integration
**Источник:** `vhm24v2/server/_core/map.ts`

```typescript
// Service: GoogleMapsService
geocode(address: string) → {lat, lng}
reverseGeocode(lat, lng) → address
calculateDistance(origin, destination) → distanceKm
findNearestMachines(lat, lng, radius) → Machine[]
getDirections(origin, destination) → route

// Environment
GOOGLE_MAPS_API_KEY=...
```

**Файлы для создания:**
- `/apps/api/src/modules/geo/geo.module.ts`
- `/apps/api/src/modules/geo/geo.service.ts`
- `/apps/api/src/modules/geo/geo.controller.ts`

---

### 7. Recommendation Engine
**Источник:** `vhm24v2/client/src/services/recommendationEngine.ts`

```typescript
// Types of recommendations:
'history' | 'favorite' | 'popular' | 'time' | 'similar' | 'new'

// Service: RecommendationService
getPersonalizedRecommendations(userId, machineId) → Product[]
getPopularProducts(machineId, period) → Product[]
getTimeBasedRecommendations(hour) → Product[]
getSimilarProducts(productId) → Product[]
getNewProducts(machineId, days) → Product[]
```

**Файлы для создания:**
- `/apps/api/src/modules/recommendations/recommendations.module.ts`
- `/apps/api/src/modules/recommendations/recommendations.service.ts`
- `/apps/api/src/modules/recommendations/recommendations.controller.ts`

---

### 8. Database Batch Operations
**Источник:** `vhm24v2/server/db.ts`

```typescript
// Оптимизированные batch операции
updateQuestProgressOnOrderBatch(orders: Order[])
updateVisitQuestProgressBatch(visits: Visit[])
bulkInsertNotifications(notifications: Notification[])
batchUpdateMachineStatus(machineIds: string[], status: MachineStatus)

// Устранение N+1 queries
findMachinesWithRelations(filters, relations: string[])
```

**Файлы для модификации:**
- `/apps/api/src/modules/*/services/*.service.ts`
- Создать utility: `/apps/api/src/common/utils/batch-operations.ts`

---

### 9. Material Request Workflow
**Источник:** `vendhub-bot2/handlers/catalog.py`, `vendhub-bot2/handlers/cart.py`

```typescript
// Entity: MaterialRequest
id, organizationId, requestNumber (unique)
requesterId: userId
status: enum (
  draft | new | approved | sent |
  pending_payment | paid | partially_paid |
  delivered | completed | rejected | cancelled
)
items: MaterialRequestItem[]
supplierId, priority, notes
approvedBy, approvedAt
sentAt, paidAt, deliveredAt, completedAt

// Entity: MaterialRequestItem
id, requestId, productId
quantity, unitPrice, totalPrice
notes, deliveredQuantity

// Workflow transitions
submitRequest() → new
approveRequest() → approved
rejectRequest() → rejected
sendToSupplier() → sent
recordPayment() → paid/partially_paid
confirmDelivery() → delivered
completeRequest() → completed
```

**Файлы для создания:**
- `/apps/api/src/modules/material-requests/material-requests.module.ts`
- `/apps/api/src/modules/material-requests/entities/material-request.entity.ts`
- `/apps/api/src/modules/material-requests/entities/material-request-item.entity.ts`
- `/apps/api/src/modules/material-requests/material-requests.service.ts`
- `/apps/api/src/modules/material-requests/material-requests.controller.ts`

---

### 10. Telegram Bot Admin Panel
**Источник:** `vendhub-bot2/handlers/admin.py`

```typescript
// Admin commands через Telegram бот:
/pending_requests - Ожидающие заявки
/approve <id> - Одобрить заявку
/reject <id> - Отклонить заявку
/users - Список пользователей
/grant_role <user> <role> - Назначить роль
/revoke_role <user> <role> - Отозвать роль
/stats - Статистика
/machines - Статус машин
/low_stock - Машины с низким запасом
/daily_report - Ежедневный отчет
```

**Файлы для модификации:**
- `/apps/api/src/modules/telegram-bot/telegram-bot.service.ts`
- `/apps/api/src/modules/telegram-bot/handlers/admin.handler.ts`

---

## 🟡 СРЕДНИЙ ПРИОРИТЕТ (P2) - В течение месяца

### 11. Employees Module (отдельно от Users)
**Источник:** `vhm24v2/drizzle/schema.ts`

```typescript
// Entity: Employee
id, organizationId
userId (optional - link to User)
employeeNumber, firstName, lastName
phone, email
employeeRole: enum (operator | technician | warehouse | driver | manager)
employeeStatus: enum (active | on_leave | suspended | terminated)
telegramUserId, telegramUsername
hireDate, terminationDate
salary, salaryFrequency
notes
```

---

### 12. Contractors Module
**Источник:** `vhm24v2/drizzle/schema.ts`

```typescript
// Entity: Contractor
id, organizationId
companyName, contactPerson
phone, email, address
serviceType: enum (maintenance | cleaning | delivery | repair | other)
contractStart, contractEnd
paymentTerms, rating, notes, isActive

// Entity: ContractorInvoice
id, organizationId, contractorId
invoiceNumber, amount, status
issueDate, dueDate, paidDate
description, attachmentUrls
```

---

### 13. Maintenance Workflow (расширенный)
**Источник:** `vhm24v2/server/maintenanceWorkflow.ts`

```typescript
// Entity: MaintenanceHistory (расширенный)
id, organizationId, machineId
employeeId, contractorId
maintenanceType: enum (scheduled | emergency | preventive | corrective)
description, partsUsed (JSON)
cost, scheduledDate, completedDate
status: enum (scheduled | in_progress | completed | cancelled)
notes, photoUrls

// Workflow
scheduleMaintenance()
startMaintenance()
completeMaintenance()
cancelMaintenance()
recordPartsUsed()
uploadPhotos()
```

---

### 14. Work Logs Module
**Источник:** `vhm24v2/drizzle/schema.ts`

```typescript
// Entity: WorkLog
id, organizationId, employeeId, machineId
workType: enum (refill | collection | cleaning | maintenance | inspection)
workStatus: enum (started | in_progress | completed | cancelled)
startTime, endTime, duration
description, notes
issuesFound (JSON), partsUsed (JSON)
photoUrls (JSON), rating
verifiedBy, verifiedAt

// Entity: EmployeePerformance (computed)
employeeId, period (month/week)
totalWorkLogs, totalWorkHours
completedTasks, cancelledTasks
averageRating, issuesReported
```

---

### 15. Inventory Workflow (расширенный)
**Источник:** `vhm24v2/server/inventoryWorkflow.ts`

```typescript
// Workflow statuses:
draft → in_progress → completed → approved

// Methods:
startInventoryCheck(machineId/warehouseId)
submitCount(items: {productId, expectedQty, actualQty}[])
approveInventoryCheck(checkId, approverId)
generateDiscrepancyReport(checkId)
createAdjustments(checkId)
```

---

### 16. Warehouse Zones
**Источник:** `vhm24v2/drizzle/schema.ts`

```typescript
// Entity: WarehouseZone
id, organizationId, warehouseId
name, code, description
zoneType: enum (dry | cold | frozen | hazardous)
capacity, currentOccupancy
temperature (optional)
isActive
```

---

## 🟢 НИЗКИЙ ПРИОРИТЕТ (P3) - По мере возможности

### 17. AI Image Generation
**Источник:** `vhm24v2/server/_core/imageGeneration.ts`

```typescript
// Service: ImageGenerationService
generateProductImage(prompt, style)
editProductImage(imageUrl, editPrompt)
removeBackground(imageUrl)
```

---

### 18. Voice Transcription
**Источник:** `vhm24v2/server/_core/voiceTranscription.ts`

```typescript
// Service: VoiceService
transcribeAudio(audioUrl, language?)
```

---

### 19. Sales Import (Historical Data)
**Источник:** `vhm24v2/drizzle/schema.ts`

```typescript
// Entity: SalesRecord (for legacy imports)
// Entity: ImportBatch (tracking imports)
```

---

### 20. S3 + CloudFront Integration
**Источник:** `vhm24v2` dependencies

```typescript
// Service: StorageService
uploadFile(file, folder) → presignedUrl
getPresignedUploadUrl(filename, contentType)
deleteFile(key)
```

---

### 21. Offline Data Sync
**Источник:** `vhm24v2/client/src/hooks/useDataSync.ts`

```typescript
// Client-side hook
useDataSync({
  onSync: callback,
  onConflict: (local, remote) => resolution
})
```

---

### 22. ELK Stack Logging
**Источник:** `VHM24R_1/infrastructure`

```yaml
# docker-compose.yml additions
elasticsearch, logstash, kibana
```

---

## 📈 ПРИОРИТЕЗИРОВАННЫЙ ПЛАН РЕАЛИЗАЦИИ

### Фаза 1: Core Business (Неделя 1-2)
| # | Функция | Effort | Business Value |
|---|---------|--------|----------------|
| 1 | Loyalty System | 3 дня | Очень высокая |
| 2 | Quests System | 3 дня | Высокая |
| 3 | Favorites | 1 день | Средняя |
| 4 | Referrals | 2 дня | Высокая |

### Фаза 2: Integrations (Неделя 3-4)
| # | Функция | Effort | Business Value |
|---|---------|--------|----------------|
| 5 | Telegram Payments | 2 дня | Высокая |
| 6 | Google Maps | 2 дня | Средняя |
| 7 | Recommendations | 3 дня | Средняя |
| 8 | Batch Operations | 2 дня | Высокая (perf) |

### Фаза 3: Operations (Неделя 5-6)
| # | Функция | Effort | Business Value |
|---|---------|--------|----------------|
| 9 | Material Requests | 4 дня | Высокая |
| 10 | Telegram Admin | 3 дня | Средняя |
| 11 | Employees Module | 2 дня | Средняя |

### Фаза 4: Extended Features (Неделя 7-8)
| # | Функция | Effort | Business Value |
|---|---------|--------|----------------|
| 12 | Contractors | 2 дня | Средняя |
| 13 | Maintenance Workflow | 3 дня | Средняя |
| 14 | Work Logs | 2 дня | Средняя |
| 15 | Warehouse Zones | 1 день | Низкая |

### Фаза 5: Nice-to-Have (По мере необходимости)
| # | Функция | Effort | Business Value |
|---|---------|--------|----------------|
| 16-22 | AI, Voice, Import, S3, etc. | Variable | Низкая |

---

## 📁 ИСХОДНЫЕ ФАЙЛЫ ДЛЯ РЕФЕРЕНСА

### vhm24v2:
- `/drizzle/schema.ts` (814 строк) - Схема БД
- `/server/db.ts` (2344 строки) - Database operations
- `/server/routers.ts` (1267 строк) - API endpoints
- `/server/_core/*` - Интеграции
- `/client/src/services/recommendationEngine.ts` - Рекомендации
- `/server/scheduledTasks.ts` - Cron jobs
- `/server/telegramBot.ts` - Telegram интеграция

### vendhub-bot2:
- `/database/__init__.py` (600+ строк) - Async DB
- `/handlers/*.py` - Все обработчики
- `/services/*.py` - Сервисы
- `/config.py` - Конфигурация

### VHD:
- `/MASTER_PROMPT.md` - Полная спецификация
- `/PART_*.md` - Детальная документация

---

*Автоматически сгенерировано на основе анализа репозиториев*
