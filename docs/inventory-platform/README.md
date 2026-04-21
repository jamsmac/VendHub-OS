# OLMA Platform — Handoff Package v1.3

Этот пакет содержит всё необходимое чтобы Claude Code разработал production-версию системы учёта товаров OLMA Inventory Platform.

**Пакет прошёл три аудита** — найдено и закрыто 31 проблема (7 критичных + 24 серьёзных/мелких).

## 📦 Что в пакете

| #   | Файл                                 | Что это                                     | Статус               |
| --- | ------------------------------------ | ------------------------------------------- | -------------------- |
| 1   | `README.md`                          | Этот файл — точка входа                     | —                    |
| 2   | `OLMA_PLATFORM_SPEC.md`              | Базовая спецификация (2083 строк)           | v1.0 (стабильная)    |
| 3   | `OLMA_PLATFORM_PATCHES.md`           | Аудит №1 — 11 фиксов                        | v1.1                 |
| 4   | `OLMA_PLATFORM_PATCHES_v1.2.md`      | Аудит №2 — 7 критичных блокеров + серьёзные | v1.2                 |
| 5   | **`OLMA_PLATFORM_PATCHES_v1.3.md`**  | **Аудит №3 — self-review v1.2, 13 фиксов**  | **v1.3 (финальная)** |
| 6   | `olma.html`                          | Рабочий прототип (4984 строки vanilla JS)   | Референс UX          |
| 7   | `Product_name2026-4-21_15_34_44.csv` | Реальный HICON отчёт                        | Test fixture         |
| 8   | `VendHub_Resale_Module_Prompt.md`    | Контекст                                    | Опциональный         |

**Приоритет при конфликтах: v1.3 > v1.2 > v1.1 > SPEC v1.0.** Всегда выбирай самую новую версию.

## 🚀 Как начать работу с Claude Code

### Шаг 1: Создай новый проект

```bash
cd ~/projects
mkdir olma-platform && cd olma-platform
claude init
```

### Шаг 2: Скопируй все файлы в `docs/`

```bash
mkdir docs
# Скопируй сюда все 8 файлов из этого handoff (они все на одном уровне, без вложений)
```

### Шаг 3: Первый промпт Claude Code

```
Ты разработчик production SaaS. Прочитай в строгом порядке:

1. docs/OLMA_PLATFORM_SPEC.md — базовая спецификация
2. docs/OLMA_PLATFORM_PATCHES.md — исправления v1.1 (первый аудит)
3. docs/OLMA_PLATFORM_PATCHES_v1.2.md — исправления v1.2 (второй аудит, 7 блокеров)
4. docs/OLMA_PLATFORM_PATCHES_v1.3.md — исправления v1.3 (третий аудит, 13 фиксов к v1.2)
5. docs/olma.html — рабочий прототип (референс UX и бизнес-логики)

КРИТИЧНО: при любых противоречиях v1.3 > v1.2 > v1.1 > SPEC. Всегда используй самое новое.

Тестовый файл: docs/Product_name2026-4-21_15_34_44.csv (HICON, UTF-8 BOM).

После изучения:
- подтверди что понял задачу
- предложи план первой недели
  (вариант "Walking Skeleton" из v1.1 Patch 11 для быстрого MVP,
   либо полный план из SPEC §11 если время позволяет)
- задай 3-5 уточняющих вопросов если есть

Не начинай писать код пока не получишь подтверждение плана.
```

### Шаг 4: Выполнение по этапам

После подтверждения плана — работай по этапам. После каждого: тест локально, git commit, Vercel preview.

## ⚙️ Pre-flight checklist (Supabase + Vercel + GitHub)

### Два Supabase-проекта

**Production** (`olma-platform-prod`):

- Регион: Frankfurt или Mumbai (ближе к Узбекистану)
- Сохрани: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Staging** (`olma-platform-staging`):

- Тот же регион, free tier

### Supabase — обязательная настройка ДО разработки

⚠️ **Без этих шагов приложение не запустится. Все детали — в v1.2 Patch 4 + v1.3 Patch 23.**

1. **Custom Access Token Hook:**
   - Dashboard → Authentication → Hooks → Custom Access Token
   - Создать функцию `custom_access_token_hook` (SQL из v1.2 Patch 4)
   - `GRANT USAGE ON SCHEMA public TO supabase_auth_admin`
   - `GRANT SELECT ON public.users TO supabase_auth_admin`
   - `REVOKE ALL ON public.users FROM anon, authenticated`

2. **Helper-функция `current_org_id()`:**
   - SQL из v1.2 Patch 13.1 + `GRANT EXECUTE` из v1.3 Patch 23
   - Без GRANT'а RLS через supabase-js не работает

3. **Storage buckets (все private):**
   - `parse-sessions` (default-deny, без явной политики)
   - `sales-imports` (с "users read own org" политикой из v1.1 Patch 6)
   - `purchase-invoices`
   - `backups`

4. **Extensions (опциональные для MVP):**
   - `pg_cron` — только если будешь поднимать Edge Function cleanup (v1.3 Patch 21 Решение B)

### Vercel

```bash
pnpm i -g vercel
vercel login
```

Env переменные:

- `DATABASE_URL` (из Supabase; используй connection string для Supavisor pooler)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only!)

### GitHub

Private репозиторий `olma-platform`. Branch protection на `main` — только через PR.

## 💰 Ориентировочные затраты

**Разработка (один раз):**

- Claude Code подписка ($200/mo) — 1-2 месяца
- Опциональный senior-code-review — $1,500-3,000

**Ежемесячно production:**

- Supabase Pro: $25
- Vercel Pro: $20
- Domain: ~$15/год
- **Итого: ~$50/mo** для пилота на OLMA

При 10+ клиентах — $100-200/mo.

## 🎯 Критерии успеха MVP

После завершения Jamshid должен с iPhone:

1. ✅ Зарегистрироваться, залогиниться (JWT содержит `org_id` из Custom Claims Hook)
2. ✅ Создать закупку через 3-шаговый wizard
3. ✅ Загрузить HICON CSV-отчёт — parse-session выживает между шагами wizard'а на Vercel
4. ✅ Повторно загрузить тот же файл — дубликаты пропустятся
5. ✅ Загрузить обновлённый отчёт за тот же день — только delta добавится
6. ✅ CSV с двумя строками для одного товара — обрабатывается корректно (in-batch dedup, v1.3 Patch 20)
7. ✅ Провести сверку остатков с расчётом недостачи в сум
8. ✅ Увидеть дашборд с выручкой за день/неделю/месяц (с пагинацией — v1.3 Patch 27)
9. ✅ Пригласить оператора с ограниченными правами
10. ✅ Открыть `/tenant/olma` без auth — прайс без цен закупки
11. ✅ Открыть `/tenant/nonexistent` → 404 (не 403 — enumeration defence)
12. ✅ Импорт 500 строк за <3 секунды (batched hash lookup, v1.2 Patch 15)
13. ✅ Отчёт за 21:00 Ташкента НЕ улетает в следующий день на Vercel (UTC server)
14. ✅ User организации A через API не видит данных организации B

## ⚠️ 12 граблей (не наступать)

1. **"Давайте без multi-tenancy"** — НЕТ. Фундамент.

2. **"Prisma вместо Drizzle"** — НЕТ. Выбор сделан.

3. **"`pg` вместо `postgres.js`"** — НЕТ. Для Supabase serverless только `postgres.js` (v1.2 Patch 19.4).

4. **"Дедупликация продаж по ID транзакции"** — НЕТ. В HICON нет txnId. 3-уровневая дедуп (SPEC 9.3 + v1.2 Patch 15 batched + v1.3 Patch 20 in-batch).

5. **"Map-сессия работает на Vercel"** — НЕТ. Serverless memory не shared. Supabase Storage (v1.2 Patch 12).

6. **"RLS через `auth.jwt() ->> org_id`"** — НЕТ, syntax broken. Используй `current_org_id()` helper (v1.2 Patch 13.1 + v1.3 Patch 23 GRANT).

7. **"RLS защитит от забытого WHERE в tRPC"** — НЕТ. Drizzle под `postgres` bypass'ит RLS. Защита только в middleware + code review (v1.2 Patch 13.3 Option A, v1.3 Patch 24).

8. **"`await` в цикле — ок для MVP"** — НЕТ при импорте 500+ строк. Batched lookup обязателен (v1.2 Patch 15).

9. **"Cursor pagination по UUID — стандарт"** — НЕТ. UUID v4 случайные. Offset для MVP (v1.3 Patch 27).

10. **"`rawInput` в tRPC middleware"** — НЕТ. v11 использует `getRawInput()` async (v1.3 Patch 26).

11. **"`DELETE FROM storage.objects` чистит файлы"** — НЕТ. Удаляет только метаданные, S3-файлы остаются (v1.3 Patch 21).

12. **"Filename ISO без TZ на сервере в UTC"** — НЕТ. Отчёт сдвинется на 5 часов. `+05:00` или `Intl.DateTimeFormat` с `Asia/Tashkent` (v1.2 Patch 14.2 + v1.3 Patch 22).

## ✅ Что проверено в трёх аудитах

**Аудит №1 (v1.1) — 11 проблем:**

- Forward references в Drizzle схеме
- 10 отсутствующих вспомогательных функций
- Расчёт totalAmount в salesAggregated
- RLS без Custom Claims
- Процедуры operator/auditor/tenantPublic
- Структура Storage
- Acceptance-тесты

**Аудит №2 (v1.2) — 7 критичных блокеров + серьёзные:**

- In-memory sessions → Supabase Storage (Patch 12)
- RLS SQL syntax → `current_org_id()` (Patch 13.1)
- Auth hook GRANTs (Patch 13.2)
- Drizzle bypass RLS → app-level honesty (Patch 13.3)
- File URL contract (Patch 14.1)
- Timezone on Vercel (Patch 14.2)
- JWT base64url (Patch 13.4)
- Batched hash lookup (Patch 15)
- Soft-delete helper (Patch 16.1)
- `organizationId` в дочерних таблицах (Patch 16.2)
- Полный seed с 21 supplier + 40 products + layouts (Patch 17)
- `parseSalesFile`, etc (Patch 18)
- Unified `tenantPublicProcedure` (Patch 19.1)
- Pagination contract (Patch 19.2)
- postgres.js + superjson (Patch 19.4)

**Аудит №3 (v1.3) — self-review v1.2, 13 проблем:**

- In-batch dedup для batched import (Patch 20) — критично
- `DELETE FROM storage.objects` не чистит файлы (Patch 21) — критично
- `ctx.organization` не существовал (Patch 22) — критично
- `current_org_id()` без GRANT EXECUTE (Patch 23)
- Option B из 13.3 — инфра-проект, не код (Patch 24)
- `locations.machineId` никогда не заполняется → удалить из схемы (Patch 25)
- `rawInput` → `getRawInput()` async (Patch 26)
- Cursor pagination с UUID v4 → offset (Patch 27)
- Парочка мелких фиксов (Patch 28)

## 📞 Если Claude Code что-то не понимает

Вернись в Claude (этот же чат или новый с приложенной спецификацией) и попроси уточнение. Не изобретай.

---

**Готов к production.** После deploy — пришлите ссылку на production URL, поможем провести smoke-тест на реальных данных OLMA.
