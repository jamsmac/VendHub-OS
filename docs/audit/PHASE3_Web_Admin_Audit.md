# Phase 3: Web Admin Audit — Report

**Date:** 2025-02-17

## Summary

- **49 dashboard pages** under `apps/web/src/app/dashboard/` (including (overview), loyalty/_, users/_, routes/_, trips/_, employees/_, directories/_).
- **Build:** OK (Next.js 16.1, Turbopack).
- **Layout:** Dashboard layout with Sidebar, Header; auth check via `useAuthStore` and redirect to `/auth` when not authenticated.
- **Sidebar:** 24 nav items with Lucide icons — Дашборд, Автоматы, Товары, Склад, Заказы, Задачи, Рейсы, Маршруты, Техобслуживание, Заявки, Жалобы, Транзакции, Сотрудники, Подрядчики, Табель, Пользователи, Локации, Карта, Бонусы, Отчёты, Фискализация, Мастер-данные, Интеграции, Аудит, Уведомления, Настройки. No role-based hiding in sidebar (all items visible).
- **API coverage:** Dashboard pages align with API modules (machines, products, inventory, orders, tasks, trips, routes, maintenance, material-requests, complaints, transactions, employees, contractors, work-logs, users, locations, map, loyalty, reports, fiscal, directories, integrations, audit, notifications, settings). Sub-routes cover loyalty (achievements, quests, promo-codes, levels, settings, transactions), employees (attendance, leave, payroll, departments, reviews), routes (builder, [id]), trips ([id], tracker), directories ([id]), users (new, [id]).

## Gaps / Improvements

1. **i18n:** Sidebar and UI use hardcoded Russian; no visible i18n (uz, ru, en) switch.
2. **Role-based menu:** Sidebar does not filter by role (owner, admin, manager, etc.); consider hiding or disabling items per role.
3. **Mobile sidebar:** Layout is flex; ensure Sidebar collapses to burger on small screens if not already implemented in Sidebar component.

## Page Quality (sample)

- TypeScript: project compiles; strict types expected.
- Data: pages use API via lib/store or API client; organization context should be passed where needed.
- UI: Lucide icons, shadcn-style layout; tables/charts usage to be verified per page.

## Next

- Phase 4 (Client PWA).
