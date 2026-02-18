# VendHub OS — План доработки (v2, проверенный)

**Дата:** 18 февраля 2026
**Основание:** Сверка VENDHUB_MODULES_MAP.html с реальной структурой проекта
**Источники:** vendhub-client-site.html, vendhub-bonus-dashboard-ru.html, vhm24v2 (GitHub)

---

## Результат ревизии — что УЖЕ реализовано в API

Глубокая проверка показала, что API-бэкенд гораздо полнее, чем казалось при поверхностном сканировании. Вот что НЕ нужно создавать заново:

| Было в плане v1            | Статус в проекте | Где именно                                                                                 |
| -------------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| Ingredients/Recipes API    | ✅ УЖЕ ЕСТЬ      | `products/entities/`: Recipe, RecipeIngredient, RecipeSnapshot, IngredientBatch, Supplier  |
| Bunkers (бункеры) API      | ✅ УЖЕ ЕСТЬ      | `equipment/`: HopperType entity + hopper-type.controller + hopper-type.service             |
| Mixers (миксеры) API       | ✅ УЖЕ ЕСТЬ      | `equipment/`: EquipmentComponent с типом MIXER                                             |
| Spare Parts (запчасти) API | ✅ УЖЕ ЕСТЬ      | `equipment/`: SparePart entity + spare-part.controller + spare-part.service                |
| Cleaning (моющие) API      | ✅ УЖЕ ЕСТЬ      | `equipment/`: WashingSchedule entity + washing-schedule.controller                         |
| Streaks API                | ✅ УЖЕ ЕСТЬ      | `loyalty/constants/`: STREAK_MILESTONES, streakBonus[], getStreakBonus()                   |
| Loyalty Admin (частично)   | ✅ УЖЕ ЕСТЬ      | `loyalty.controller`: admin/adjust, admin/stats, admin/expiring, levels/info               |
| Loyalty Levels config      | ✅ УЖЕ ЕСТЬ      | `loyalty/constants/`: LOYALTY_LEVELS (Bronze→Platinum), POINTS_RULES, LOYALTY_BONUSES      |
| KPI сотрудников API        | ✅ УЖЕ ЕСТЬ      | `operator-ratings/` — полный модуль                                                        |
| Routes (маршруты) API      | ✅ УЖЕ ЕСТЬ      | `routes/`: CRUD + stops + optimize + reorder (13 endpoints)                                |
| Maintenance (ремонт) API   | ✅ УЖЕ ЕСТЬ      | `maintenance/`: полный workflow submit→approve→assign→start→complete→verify (25 endpoints) |
| Web: Маршруты страница     | ✅ УЖЕ ЕСТЬ      | `dashboard/routes/` (list + [id] + builder)                                                |
| Web: Обслуживание страница | ✅ УЖЕ ЕСТЬ      | `dashboard/maintenance/page.tsx`                                                           |
| Web: Оборудование страница | ✅ УЖЕ ЕСТЬ      | `dashboard/equipment/page.tsx`                                                             |

**Вывод:** Фаза 6 (API-модули) и Фаза 2C (доп. страницы админки) из плана v1 почти полностью отменяются — API уже готов. Фронтенд-страницы equipment, routes, maintenance тоже уже есть.

---

## Резюме обновлённого плана

Остаётся **4 основных направления**, общая оценка сократилась с 54-70 до **33-43 чел-дней**:

1. **Лендинг** (apps/site) — новый Next.js app
2. **Бонусная админка + Карта** (apps/web) — новые страницы
3. **Доработка клиента** (apps/client) — недостающие страницы
4. **Mobile + Bot** — клиентский режим mobile, команды бота

---

## Фаза 1: Лендинг vendhub.uz (apps/site)

**Приоритет:** Высокий | **Оценка:** 5-7 дней
**Референс:** vendhub-client-site.html + Архив.zip (изображения)

1.1. **Создать apps/site на Next.js 16 (App Router)** — инициализация, подключение к monorepo (turbo.json, pnpm-workspace.yaml)

1.2. **Перенести дизайн из vendhub-client-site.html** — "Warm Brew" тема (cream, espresso, caramel палитра), шрифты DM Sans + Playfair Display, адаптивная вёрстка

1.3. **Реализовать страницы:**

- Главная (Hero баннер, преимущества, CTA)
- Каталог напитков (карточки с фото, категории, фильтр по типу/цене)
- Карта автоматов (интерактивная карта Ташкента, фильтр по районам)
- Бонусная программа (уровни: Бронза → Серебро → Золото → Платина)
- Для партнёров (условия, форма заявки, калькулятор дохода)
- Контакты (телефон, адрес, соцсети, форма обратной связи)

  1.4. **Перенести изображения** из Архив.zip в public/images, оптимизировать через next/image

  1.5. **SEO и метаданные** — Open Graph, JSON-LD, sitemap.xml, robots.txt

  1.6. **Docker** — добавить сервис `site` в docker-compose.yml (порт 3001)

---

## Фаза 2: Админ-панель — недостающие модули (apps/web)

**Приоритет:** Высокий | **Оценка:** 9-12 дней
**Референс:** vendhub-bonus-dashboard-ru.html, vhm24v2/client/src/pages/admin/

### 2A. Управление бонусной программой (dashboard/loyalty) — ❗НОВОЕ

API уже готов (loyalty controller с admin endpoints, levels, streaks в constants). Нужен только **фронтенд**:

2A.1. **dashboard/loyalty/page.tsx** — главная сводка: клиенты по уровням, активные бонусы, конверсия, средний чек

2A.2. **Подстраницы:**

- `/loyalty/levels` — визуальная настройка 4 уровней (пороги из LOYALTY_LEVELS, множители, скидки). API: GET/PUT levels
- `/loyalty/promo-codes` — управление промокодами. API: promo-codes CRUD уже есть
- `/loyalty/quests` — управление квестами. API: quests CRUD уже есть (GET, POST, PUT, DELETE + stats)
- `/loyalty/referrals` — настройка реферальной программы. API: referrals модуль есть
- `/loyalty/achievements` — управление достижениями. ⚠️ Нужен новый API endpoint (entity PointsSource.ACHIEVEMENT есть, но CRUD нет)
- `/loyalty/streaks` — визуализация настроек серий (данные в STREAK_MILESTONES — нужен UI)
- `/loyalty/calculator` — калькулятор бонусов (логика в calculateOrderPoints, calculateCashback — нужен только UI)

### 2B. Карта автоматов для админки — ❗НОВОЕ

2B.1. **dashboard/map/page.tsx** — интерактивная карта (Leaflet/Mapbox)

- Цветные метки по MachineStatus (active=зелёный, low_stock=жёлтый, error/offline=красный)
- Кластеризация при масштабировании
- Фильтры по статусу и району
- Попап с карточкой автомата при клике
- API: machines.list + locations уже полностью готовы

### 2C. Проверка существующих страниц — ❗РЕВИЗИЯ вместо создания

Следующие страницы в API+Web уже существуют. Задача — **проверить полноту UI** и при необходимости расширить:

2C.1. ~~dashboard/ingredients~~ → Проверить, показывает ли `dashboard/products` рецепты (Recipe, RecipeIngredient). Если нет — добавить табы/секцию «Рецепты» на странице продуктов

2C.2. ~~dashboard/bunkers~~ → Проверить, показывает ли `dashboard/equipment` бункеры (HopperType). Если нет — добавить таб

2C.3. ~~dashboard/spare-parts~~ → Проверить, показывает ли `dashboard/equipment` запчасти (SparePart). Если нет — добавить таб

2C.4. ~~dashboard/performance~~ → Проверить, есть ли UI для `operator-ratings`. Если нет — добавить страницу или секцию в employees

**Оценка 2C:** 2-3 дня (ревизия + доработка, вместо 5-7 дней создания с нуля)

---

## Фаза 3: Клиентское приложение — доработка (apps/client)

**Приоритет:** Средний | **Оценка:** 5-7 дней
**Референс:** vhm24v2/client/src/pages/, vendhub-client-site.html

### Недостающие страницы

3.1. **AchievementsPage.tsx** — медали, прогресс, условия получения
⚠️ Нужен API: achievements CRUD (entity PointsSource.ACHIEVEMENT есть)

3.2. **PromoCodePage.tsx** — ввод промокода, валидация, применение
API: promo-codes/validate уже есть

3.3. **OrderSuccessPage.tsx** — экран после успешного заказа (номер, чек, «повторить»)
Референс: vhm24v2/OrderSuccess.tsx

3.4. **DrinkDetailPage.tsx** — детали напитка (состав из Recipe/RecipeIngredient, кастомизация)
Референс: vhm24v2/DrinkDetail.tsx. API: products + recipes entities готовы

3.5. **HelpPage.tsx** — FAQ, обратная связь, контакты поддержки
Референс: vhm24v2/Help.tsx

3.6. **NotificationSettingsPage.tsx** — настройка push-уведомлений
Референс: vhm24v2/NotificationSettings.tsx

### Улучшения существующих страниц

3.7. **LoyaltyPage** — добавить секции: достижения, серии (streak с визуалом огня🔥), ежедневные квесты, лидерборд
Данные: STREAK_MILESTONES, quests/my, loyalty/balance — всё в API

3.8. **MenuPage** — добавить кастомизацию напитка (сахар, объём, молоко)
Данные: Recipe, RecipeIngredient в API

---

## Фаза 4: Мобильное приложение (apps/mobile)

**Приоритет:** Средний | **Оценка:** 10-12 дней
**Референс:** VENDHUB_MODULES_MAP.html (блок 3), vhm24v2/client/

### 4A. Клиентский режим (отсутствует полностью) — ❗НОВОЕ

Все API endpoints готовы, нужны только экраны React Native:

4A.1. **MapScreen** — карта ближайших автоматов (react-native-maps + геолокация)
4A.2. **MenuScreen** — каталог напитков
4A.3. **DrinkDetailScreen** — детали + кастомизация
4A.4. **CartScreen** — корзина + промокод
4A.5. **CheckoutScreen** — оплата (Payme, Click, Uzum, бонусы)
4A.6. **OrderSuccessScreen** — подтверждение + чек
4A.7. **LoyaltyScreen** — баллы, уровень, достижения, серии
4A.8. **QuestsScreen** — квесты и задания
4A.9. **QRScanScreen** — сканер QR-кода (expo-camera)
4A.10. **FavoritesScreen** — избранные напитки

### 4B. Режим сотрудника — недостающее

API для всего уже есть (routes, maintenance), нужны экраны:

4B.1. **RouteScreen** — маршрут на день (API: routes/:id/stops) + deep link в Яндекс.Карты
4B.2. **MaintenanceScreen** — создание заявки на ремонт (API: maintenance POST + фото через storage)
4B.3. **BarcodeScanScreen** — сканер штрих-кода (expo-barcode-scanner)

### 4C. Переключение режимов

4C.1. **Режим клиент/сотрудник** — по роли из RBAC (7 ролей уже в API)

---

## Фаза 5: Telegram бот (apps/bot)

**Приоритет:** Низкий | **Оценка:** 3-4 дня

### Клиентские команды

5.1. **/menu** — каталог напитков (inline-кнопки). API: products/list готов
5.2. **/promo** — ввод промокода. API: promo-codes/validate готов
5.3. **/achievements** — достижения. ⚠️ Нужен achievements API
5.4. **/map** — алиас для /find

### Сотрудничские команды

5.5. **/tasks** — задачи на сегодня. API: tasks module готов
5.6. **/route** — маршрут объезда. API: routes module готов
5.7. **/report** — фото-отчёт. API: maintenance + storage готовы
5.8. **/alerts** — подписка на уведомления. API: alerts module готов

### Mini App

5.9. **Telegram Mini App** — встраивание PWA как WebApp

---

## Фаза 6: API — только то, чего реально нет

**Приоритет:** Параллельно | **Оценка:** 2-3 дня (вместо 8-10!)

6.1. **Achievements CRUD API** — отдельный модуль или расширение loyalty

- Entity: Achievement (name, description, icon, condition_type, condition_value, bonus_points)
- Endpoints: CRUD + check/auto-assign + user achievements list
- Необходим для: client 3.1, web 2A loyalty/achievements, bot 5.3

  6.2. **Leaderboard API** — эндпоинт в loyalty

- GET /loyalty/leaderboard?period=week|month|all&limit=50
- Необходим для: client 3.7

  6.3. ~~Ingredients API~~ — ✅ УЖЕ ЕСТЬ (Recipe, RecipeIngredient)
  6.4. ~~Bunkers API~~ — ✅ УЖЕ ЕСТЬ (HopperType)
  6.5. ~~Spare Parts API~~ — ✅ УЖЕ ЕСТЬ (SparePart)
  6.6. ~~Streaks API~~ — ✅ УЖЕ ЕСТЬ (STREAK_MILESTONES)
  6.7. ~~Loyalty Admin~~ — ✅ ЧАСТИЧНО ЕСТЬ (admin/adjust, admin/stats). Может потребоваться расширение для настройки уровней через UI

---

## Итоговая приоритизация и сроки

| Фаза                                | Приоритет | Оценка (дней) | API зависимости                           |
| ----------------------------------- | --------- | ------------- | ----------------------------------------- |
| 1. Лендинг (apps/site)              | Высокий   | 5-7           | Нет — API products, machines готовы       |
| 2A. Бонусная админка                | Высокий   | 6-8           | 6.1 (achievements) — всё остальное готово |
| 2B. Карта автоматов (admin)         | Высокий   | 2-3           | Нет — API machines, locations готовы      |
| 2C. Ревизия equipment/products UI   | Средний   | 2-3           | Нет — API полностью готов                 |
| 3. Доработка client                 | Средний   | 5-7           | 6.1, 6.2                                  |
| 4A. Mobile клиентский               | Средний   | 7-9           | Нет — все API готовы                      |
| 4B. Mobile staff                    | Средний   | 3-4           | Нет — routes, maintenance API готовы      |
| 5. Bot команды                      | Низкий    | 3-4           | 6.1 (для /achievements)                   |
| 6. API (achievements + leaderboard) | Высокий   | 2-3           | Нет                                       |
| **ИТОГО**                           |           | **35-48**     |                                           |

---

## Порядок выполнения

```
Неделя 1:    Фаза 6 (Achievements + Leaderboard API) + Фаза 1 начало (Лендинг)
Неделя 2:    Фаза 1 завершение + Фаза 2B (Карта автоматов)
Неделя 3-4:  Фаза 2A (Бонусная админка) + Фаза 2C (Ревизия UI)
Неделя 5:    Фаза 3 (Client доработка)
Неделя 6-7:  Фаза 4 (Mobile)
Неделя 8:    Фаза 5 (Bot) + Интеграционное тестирование
```

---

## Источники и референсы

| Файл/Ресурс                     | Что из него берём                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| vendhub-client-site.html        | Дизайн, контент и структура лендинга                                                    |
| vendhub-bonus-dashboard-ru.html | Дизайн и UX бонусной админки                                                            |
| Архив.zip / images/             | Изображения для лендинга (логотипы, автоматы, напитки)                                  |
| github.com/jamsmac/vhm24v2      | Референс для client (DrinkDetail, OrderSuccess, Help, Promotions, NotificationSettings) |
| VENDHUB_MODULES_MAP.html        | Целевое видение продукта — эталон для сверки                                            |
