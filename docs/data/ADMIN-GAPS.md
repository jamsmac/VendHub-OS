# Доработки админ-панели VHM24 для vendhub.uz

> Что нужно добавить/доработать в VHM24 бэкенде для полноценной работы клиентского сайта

---

## Уже есть и работает ✅

| Функция                       | API                                 | Контроллер                  |
| ----------------------------- | ----------------------------------- | --------------------------- |
| Список автоматов/локаций      | `GET /client/public/locations`      | client-public.controller.ts |
| Меню конкретного автомата     | `GET /client/public/menu`           | client-public.controller.ts |
| Список городов                | `GET /client/public/cities`         | client-public.controller.ts |
| Форма партнёрства             | `POST /client/public/cooperation`   | client-public.controller.ts |
| Валидация промокода           | `POST /client/promo-codes/validate` | client-promo.controller.ts  |
| Telegram-авторизация клиентов | Header `x-telegram-init-data`       | ClientAuthGuard             |
| Заказы клиентов               | CRUD                                | client-orders.controller.ts |
| Баланс лояльности (базовый)   | `points_balance`, `level`           | ClientUser entity           |
| Управление продуктами         | Admin CRUD                          | nomenclature module         |
| Управление локациями          | Admin CRUD                          | locations module            |
| Промокоды                     | Admin CRUD                          | promo-codes module          |

---

## Нужно добавить ❌

### Приоритет 1 — Обязательно для запуска сайта

| #   | Что                         | Описание                                                                                                               | Сложность |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | **Публичный API продуктов** | `GET /client/public/products` — все продукты без привязки к автомату, с категориями, ценами, опциями, статусом наличия | Средняя   |
| 2   | **API статистики**          | `GET /client/public/stats` — кол-во автоматов, напитков, заказов, средний рейтинг                                      | Лёгкая    |
| 3   | **API акций**               | `GET /client/public/promotions` — активные акции для публичного отображения                                            | Средняя   |
| 4   | **GPS-координаты**          | Добавить `latitude`/`longitude` в locations entity + заполнить для 16 автоматов                                        | Лёгкая    |

### Приоритет 2 — Для полной функциональности

| #   | Что                        | Описание                                                        | Сложность |
| --- | -------------------------- | --------------------------------------------------------------- | --------- |
| 5   | **API уровней лояльности** | `GET /client/public/loyalty-tiers` — тарифы, привилегии, пороги | Лёгкая    |
| 6   | **CMS для текстов**        | Управление hero, about, stats через админку                     | Высокая   |
| 7   | **CMS для промо-баннеров** | Управление баннерами на главной                                 | Средняя   |

### Приоритет 3 — Бонусная система v2.0

| #   | Что                     | Описание                                      | Сложность |
| --- | ----------------------- | --------------------------------------------- | --------- |
| 8   | **Квесты**              | Ежедневные и еженедельные задания с наградами | Высокая   |
| 9   | **Достижения**          | Система ачивок за вехи использования          | Высокая   |
| 10  | **Стрик-бонусы**        | Серии заказов подряд (7 дней = 2000 баллов)   | Средняя   |
| 11  | **Реферальная система** | Пригласи друга → 10K каждому                  | Средняя   |
| 12  | **Welcome-бонус**       | Автоматические 15K при регистрации            | Лёгкая    |
| 13  | **День рождения**       | 20K бонусов для Gold/Platinum                 | Лёгкая    |

---

## Существующие модули VHM24 (38)

Полный список проверен — бэкенд включает:
auth, users, machines, machine-access, tasks, inventory, transactions, incidents, complaints, nomenclature, recipes, files, notifications, telegram, web-push, sales-import, intelligent-import, reports, analytics, equipment, locations, dictionaries, routes, billing, warehouse, hr, integration, security, rbac, access-requests, alerts, audit-logs, counterparty, monitoring, operator-ratings, reconciliation, websocket, **client** (5 контроллеров)

---

## Два фронтенда — важно понимать

1. **vendhub-client-site.html** — standalone SPA (анализируемый файл), React 18 + Babel CDN
2. **VHM24 Next.js frontend** — часть монорепо, уже имеет:
   - `/locations` — карта автоматов
   - `/menu/[machineNumber]` — меню конкретного автомата
   - `/cooperation` — форма партнёрства
   - `/my/*` — личный кабинет клиента (Telegram auth)

**Эти два фронтенда НЕ связаны.** Нужно решить: переделать standalone SPA или интегрировать в Next.js.
