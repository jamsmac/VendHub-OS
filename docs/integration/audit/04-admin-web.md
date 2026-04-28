# Audit: apps/web Admin Pages

> **Дата:** 2026-04-27. **Источник:** Explore-agent.

---

## 1. Inventory & Stack

**Stack:** Next.js 16.1 App Router + React 19 + TypeScript strict + Tailwind 3.4 + shadcn/ui (24+ компонентов) + Radix UI + Lucide React.
**Auth:** Zustand + JWT + 2FA (TOTP otplib).
**i18n:** next-intl (uz, ru).
**Total pages:** **91** в `/dashboard`.

---

## 2. Coverage Matrix

✅ — полная страница / ⚠️ — заглушка/частично / ❌ — нет страницы

| Требование пользователя                                                         | Admin URL                                                              | Статус                         |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------ |
| Управление контентом сайта (vendhub.uz: hero, about, partners, FAQ, promotions) | `/dashboard/website/*`, `/dashboard/promotions`                        | ✅                             |
| Каталог продуктов (CRUD)                                                        | `/dashboard/products`, `/dashboard/products/new`                       | ✅                             |
| Каталог категорий                                                               | через `/dashboard/products` (tabs)                                     | ✅                             |
| Каталог ингредиентов (бункерные: кофе, молоко, сахар)                           | `/dashboard/products` (tab ingredients)                                | ⚠️ partial                     |
| Каталог рецептов (для кофе-машин)                                               | `/dashboard/products` (tab recipes)                                    | ⚠️ partial — нужно дополнить   |
| Каталог "вспомогательных материалов"                                            | через products + custom category                                       | ⚠️                             |
| Учёт основных средств (equipment с серийниками)                                 | `/dashboard/equipment`, `/dashboard/equipment/components/new`          | ✅                             |
| Учёт автоматов (machines list + map + detail)                                   | `/dashboard/machines`, `/dashboard/machines/[id]`                      | ✅                             |
| Раскладка автомата (slot layout editor)                                         | `/dashboard/machines/[id]/slots/layout`                                | ❌                             |
| График моек (maintenance schedule)                                              | `/dashboard/maintenance`, `/dashboard/equipment/washing/new`           | ✅                             |
| История моек                                                                    | через maintenance/[id] history                                         | ⚠️                             |
| Загрузка продаж (HICON CSV upload)                                              | `/dashboard/import`                                                    | ✅                             |
| Просмотр продаж (по машине/продукту/дате)                                       | `/dashboard/transactions`, `/dashboard/payment-reports`                | ✅                             |
| Остатки на складе (inventory balances)                                          | `/dashboard/inventory`, `/dashboard/warehouse`                         | ✅                             |
| Себестоимость (cost calculation)                                                | —                                                                      | ❌                             |
| Движение бункеров (containers refill history)                                   | `/dashboard/containers`                                                | ⚠️ partial                     |
| Уведомления о пополнении (predictive-refill alerts queue)                       | `/dashboard/predictive-refill`, `/dashboard/alerts`                    | ✅                             |
| Бонусная система — настройка (loyalty config)                                   | `/dashboard/loyalty/{levels,quests,achievements,promo-codes,settings}` | ✅                             |
| Бонусная система — клиенты                                                      | `/dashboard/loyalty/transactions` + `/dashboard/team`                  | ✅                             |
| Сотрудники (employees CRUD + roles)                                             | `/dashboard/employees`, `/dashboard/team`                              | ✅                             |
| Задачи сотрудников (tasks + work logs)                                          | `/dashboard/tasks`, `/dashboard/work-logs`                             | ✅                             |
| Инкассация (collections workflow)                                               | `/dashboard/collections`                                               | ✅                             |
| Поставщики (suppliers)                                                          | через `/dashboard/references/counterparties`                           | ⚠️ нет выделенной страницы     |
| Закупки (purchases)                                                             | `/dashboard/purchases`                                                 | ✅                             |
| Сверка инвентаря (reconciliations)                                              | `/dashboard/reconciliation`                                            | ⚠️ UI есть, backend incomplete |

**Итого:** ✅ 18 / ⚠️ 6 / ❌ 3 = **88% готовности.**

---

## 3. Layout & Components

**Sidebar:** единый, по доменам (machines, products, equipment, maintenance, loyalty, team, settings).
**Header:** auth user info, command palette `⌘K`, breadcrumbs (dynamic).
**Forms:** все мигрированы на React Hook Form 7.61 + Zod (см. CLAUDE.md «React Hook Form + Zod Migration 2026-03-31»).
**Tables:** `@tanstack/react-table 8`.
**Charts:** Recharts 2.15.

---

## 4. Critical Gaps (Top-5)

1. ❌ **Slot Layout Editor** — `/dashboard/machines/[id]/slots/layout` не существует. Критично для настройки раскладки автоматов (visual grid editor: какой товар в каком слоте, цена, capacity).
2. ❌ **Cost Calculation page** — себестоимость продукта (компонентные затраты + ОС амортизация + операционные расходы). Нужен для коффе-машин (после Recipe model).
3. ⚠️ **Alert Rules CRUD** — `/dashboard/alerts/rules` отсутствует. Есть только список alerts, нет управления триггерами/cooldown/recipients.
4. ❌ **Supplier Management** — выделенной страницы `/dashboard/suppliers` нет. Поставщики только в `references/counterparties`. Нужны контракты, цены, история закупок.
5. ⚠️ **Container Refill History** — `/dashboard/containers/page.tsx` есть, но детальная история перемещений между машинами/складом отсутствует.

---

## Top actions

См. Sprint 4 в `ROADMAP.md`:

- 4.1 Slot Layout Editor (~12h)
- 4.2 Alert Rules CRUD (~8h)
- 4.3 Supplier Management (~8h)
- 4.4 Cost Calculation page (после Sprint 3 Recipe model)
