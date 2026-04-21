# ScreenSpecs — VendHub

Полный список экранов и их назначения. Для разработчиков.

---

## Desktop Admin · `admin/`

| №   | Файл                 | Экран                  | Ключевые компоненты                                    | Endpoints                                       |
| --- | -------------------- | ---------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| 01  | `Dashboard.html`     | Операционный дашборд   | KPIstat, RealtimeFeed, MapWidget, RevenueChart         | `/api/metrics/today`, `/api/events/stream`      |
| 02  | `Machines.html`      | Список автоматов       | DataTable (sort, filter, bulk), StatusBadge            | `/api/machines?filter=...`                      |
| 03  | `MachineDetail.html` | Карточка автомата      | TelemetryGraph, InventoryGrid, EventLog, Quick-actions | `/api/machines/:id`, `/api/machines/:id/events` |
| 04  | `Catalog.html`       | Ассортимент и рецепты  | RecipeCard, PriceEditor, SKUTable                      | `/api/products`, `/api/recipes`                 |
| 05  | `Tasks.html`         | Задачи команды         | KanbanBoard, TaskCard, AssigneePicker                  | `/api/tasks`, `/api/tasks/:id/assign`           |
| 06  | `Routes.html`        | Построение маршрутов   | RouteBuilder, TimelineBar, MapPreview                  | `/api/routes/today`, `/api/routes/optimize`     |
| 07  | `Incidents.html`     | Инциденты и SLA        | IncidentList, DiagCard, SLATimer, AssignDialog         | `/api/incidents`, `/api/incidents/:id/events`   |
| 08  | `Finance.html`       | Выручка и сверка       | RevenueChart, ReconTable, FilterBar                    | `/api/finance/revenue`, `/api/finance/recon`    |
| 09  | `Payouts.html`       | Выплаты партнёрам      | PayoutTable, InvoiceModal, SignStatus                  | `/api/payouts`, `/api/payouts/:id/sign`         |
| 10  | `Users.html`         | Роли и команда         | UserGrid, RoleEditor, InviteDialog                     | `/api/users`, `/api/roles`                      |
| 11  | `Settings.html`      | Интеграции и настройки | ConfigPanel, IntegrationCard, APIKeys                  | `/api/settings`, `/api/integrations`            |

---

## Mobile · Staff (`mobile/Staff.html`)

| №   | Экран                  | Flow              | Примечание                                    |
| --- | ---------------------- | ----------------- | --------------------------------------------- |
| 01  | Главная / маршрут      | Ежедневный driver | Авто-построение маршрута на сервере в 5:00    |
| 02  | Заправка автомата      | Task detail       | Чек-лист позиций, QR-фиксация обязательна     |
| 03  | Инцидент · диагностика | Reactive task     | Чек-лист диагностики, связь с поддержкой 24/7 |

## Mobile · Client (`mobile/Client.html`)

| №   | Экран         | Flow                                        |
| --- | ------------- | ------------------------------------------- |
| 01  | Меню напитков | Поиск + категории                           |
| 02  | QR-оплата     | Click, Payme, Uzcard                        |
| 03  | Лояльность    | Tier-система Gold/Platinum + кэшбек чашками |

---

## Public Site · `Site.html`

Секции сверху вниз:

1. **Nav** — фиксированный, прозрачный блюр, 72px, anchor-links
2. **Hero** — заявление + 3 KPI + виж автомата
3. **Marquee** — лента клиентов (БЦ, ВУЗы, ТРЦ)
4. **How it works** — 3 шага
5. **Platform split** — описание + мок-телеметрия
6. **Franchise calculator** — слайдеры + прогноз дохода
7. **Service split** — 34 инженера + SLA
8. **FAQ** — 6 вопросов (collapsible, открыт первый)
9. **Coverage** — карта Узбекистана + список городов
10. **Contact form** — имя, телефон, email, цель, сообщение
11. **Big CTA banner** — «Кофе — это точка»
12. **Footer** — 4 колонки + legal

---

## Prototype · `Prototype.html`

### Flow 01 · Refill (Оператор, mobile)

`route → nav → check → qr → done` — 5 шагов, iOS-устройство

### Flow 02 · Incident (Админ, desktop)

`alert → diag → assign → work → close` — 5 шагов, браузер-окно

### Flow 03 · Franchise (Сайт → CRM)

`calc → form → crm → call → approved` — сайт переходит в админку

Навигация: ← / → на клавиатуре, клик по сайдбару для прыжка, proto-btn «Далее →».

---

## Design tokens reference

Полный список — в `shared/tokens.css`.

### Цвет

| Токен              | Значение               | Использование         |
| ------------------ | ---------------------- | --------------------- |
| `--hub-sand`       | `#D3A066`              | Primary accent, brand |
| `--hub-black`      | `#1A1919`              | Canvas, contrast      |
| `--surface-canvas` | `#0f0e0e`              | Фон приложения        |
| `--surface-card`   | `#201f1e`              | Карточки              |
| `--text-primary`   | `#f5f1ea`              | Основной текст        |
| `--text-secondary` | `#a59e94`              | Вторичный текст       |
| `--text-tertiary`  | `#746d64`              | Метки, подписи        |
| `--status-success` | `oklch(0.74 0.13 150)` | Успех                 |
| `--status-danger`  | `oklch(0.66 0.21 25)`  | Ошибка                |

### Типографика

| Токен               | Размер |
| ------------------- | ------ |
| `--fs-display-hero` | 96px   |
| `--fs-display-lg`   | 64px   |
| `--fs-h1`           | 32px   |
| `--fs-body`         | 15px   |
| `--fs-caption`      | 12px   |

### Spacing: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96

### Radius: 2 / 4 / 6 / 10 / 14 / 20 / 9999

---

## Состояния и взаимодействия

Все интерактивные элементы должны иметь 4 состояния: `default`, `hover`, `active`, `focus-visible`, `disabled`. Переходы — `--dur-default` (220ms) с `--ease-standard`.

Focus ring — всегда `2px solid var(--hub-sand)` с `outline-offset: 2px`.

Selection — `background: var(--hub-sand); color: var(--hub-black);`

---

© 2025 VendHub · Screen specs · v1.0
