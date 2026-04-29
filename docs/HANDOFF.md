# VendHub OS — Handoff

**Цель:** дать любой следующей сессии (Claude или человек в команде) полный контекст без перечитывания всего кода.

**Последнее обновление:** 2026-04-29
**Repo:** `~/VendHub-OS`
**Branch:** `main`
**Owner:** Jamshid Sadikov (jamshidsmac@gmail.com)

---

## 1. Где мы сейчас

### Этап проекта

Готовимся к **запуску пилота** на 23 машинах. Аудит проекта проведён, решения по архитектуре зафиксированы. Осталось практическое — починить Railway, прокатить миграции, прописать env, smoke-тест.

### Состояние кода

- `apps/api` — NestJS 11, **готов** (95 модулей, 1067 защищённых эндпоинтов, 0 RBAC violations, 0 CVE, score 10.0)
- `apps/web` — Next.js 16, локально билдится, **на Railway не билдится с 06.04.2026** (биллинг)
- `apps/site` — Next.js 16 маркетинг-сайт
- `apps/client` — Vite Telegram Mini App
- `apps/mobile` — React Native + Expo (не для пилота)
- `apps/bot` — Telegram bot (Telegraf 4.x)

### Активные блокеры запуска

1. 🔴 Railway web build пустой с 06.04. Причина — биллинг или пауза, не код. Локальный `docker build` работает. Нужно открыть `railway.app/account/usage` и разобраться.
2. 🔴 Миграции БД не накатились на прод (отсутствуют `1776100000000+`). Накатятся автоматом через `releaseCommand` при следующем deploy api.

---

## 2. Точки входа в документацию

### Самые важные

| Файл                                    | Назначение                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| **`docs/audits/MASTER.html`**           | Главный документ — мастер-аудит. 8 секций, sticky навигация. **Читать первым.** |
| **`docs/audits/MODULE_AUDIT_INDEX.md`** | Журнал сессий аудита, все принятые решения, свод рисков                         |
| **`docs/runbooks/LAUNCH_CHECKLIST.md`** | Практический пошаговый чек-лист для запуска пилота                              |
| **`docs/runbooks/ENV_VARIABLES.md`**    | Чистые блоки env-переменных для копипаста в Railway                             |
| **`docs/adr/`**                         | Архитектурные решения (ADR-format)                                              |

### Контекст

| Файл                                       | Назначение                                                |
| ------------------------------------------ | --------------------------------------------------------- |
| `CLAUDE.md`                                | Общий контекст проекта (1111 строк, не трогать без нужды) |
| `RESOURCES.md`                             | Доступы, аккаунты, контакты                               |
| `ARCHITECTURE.md`                          | Высокоуровневая архитектура                               |
| `docs/RAILWAY-DEPLOY-STATUS-2026-04-21.md` | Диагностика блокера Railway                               |
| `docs/ROADMAP-2026-Q2.md`                  | Roadmap на квартал                                        |
| `docs/runbooks/deploy.md`                  | Процесс деплоя                                            |
| `docs/runbooks/rollback.md`                | Откат                                                     |
| `docs/runbooks/oncall.md`                  | On-call процедуры                                         |

### Аудиты по модулям

| Файл                                                        | Содержание                          |
| ----------------------------------------------------------- | ----------------------------------- |
| `docs/audits/identity-access/auth.md`                       | Аудит auth модуля по 8 пунктам      |
| `docs/audits/identity-access/01-role-matrix.md`             | Матрица 84 модуля × 7 ролей         |
| `docs/audits/identity-access/role-redesign-decision.md`     | Решение перейти на 4 staff + Client |
| `docs/audits/identity-access/01-role-matrix.html`           | Интерактивный документ ролей        |
| `docs/audits/identity-access/02-phase3-execution-plan.html` | План Фазы 3 миграции ролей          |

---

## 3. Принятые решения (2026-04-29)

### Решение 1 — Хостинг на Railway

Вся инфраструктура (api, web, site, client, bot, Postgres, Redis) — на Railway. Vercel **не используется**. Один счёт. Причина: NestJS+BullMQ+WebSocket нельзя унести с persistent host без месячного рефакторинга.

### Решение 2 — Модель ролей: 4 staff + Client + конструктор галочек

Сократить 7 жёстких ролей до **4 staff** (Owner, Admin, Manager, Employee) + **отдельная Client**.

**Жёсткие правила:**

1. Owner — один пользователь, Jamshid. Никаких других owner'ов.
2. Admin привязан к одной организации.
3. Admin может создавать и Manager, и Employee (две мета-галочки).
4. Manager создаёт Employee только если Admin включил `can_create_employees`.
5. Каждый раздаёт права только из своего набора (assertCanGrant).
6. Staff и Client изолированы — разные таблицы, разные эндпоинты, разный JWT audience.
7. Управление в одной панели.

**Operator/Warehouse/Accountant/Viewer** становятся пресетами галочек внутри Employee.

**Реализация:** не перед пилотом. 8 этапов в `role-redesign-decision.md`.

### Решение 3 — Организации остаются

114 entities имеют `organizationId`. Это позвоночник multi-tenancy.

### Решение 4 — Resource-level доступ к машинам активируется на пилоте

Модуль `machine-access` уже в коде с 5 типами (FULL/REFILL/COLLECTION/MAINTENANCE/VIEW). Включение фильтрации — Фаза 1, не откладывается.

---

## 4. Архитектурные правила (нельзя нарушать)

1. Entities **extend `BaseEntity`** — id, timestamps, soft-delete, createdBy/updatedBy.
2. BullMQ — это `@nestjs/bullmq`, **НЕ** `@nestjs/bull`.
3. Tenant scoping — через `user.organizationId` напрямую.
4. `exactOptionalPropertyTypes: true` в `tsconfig.base.json`.
5. OpenAPI drift gate активен в CI.

---

## 5. Состояние аудита

| Группа               | Модулей | Статус       |
| -------------------- | ------: | ------------ |
| Identity & Access    |       8 | ✅ Готов     |
| Payments             |       7 | ✅ Готов     |
| Machines & Telemetry |      10 | ⏳ В очереди |
| Inventory & Stock    |       8 | ⏳ В очереди |
| Orders & Sales       |       5 | ⏳ В очереди |
| Products & Catalog   |       6 | ⏳ В очереди |
| Loyalty & Engagement |       6 | ⏳ В очереди |
| Routes & Field Ops   |      10 | ⏳ В очереди |
| Integrations         |      11 | ⏳ В очереди |
| Reports & Analytics  |       5 | ⏳ В очереди |
| Tenancy & Admin      |       8 | ⏳ В очереди |
| Plumbing             |       8 | ⏳ В очереди |

---

## 6. Команда: 6 агентов + 15 VHM24-скиллов

**Агенты в `.claude/agents/`:**

- `module-migrator` (opus) — перенос NestJS-модулей
- `db-migration-helper` (sonnet) — TypeORM миграции
- `build-verifier` (sonnet) — после каждого PR
- `production-quality-guardian` (opus) — финальный аудит
- `health-check` (sonnet) — SRE-диагностика
- `dependency-audit` (sonnet) — раз в 2 недели

**Якорные VHM24-скиллы:** `vhm24-orchestrator`, `vhm24-ux-spec`, `vhm24-auth-rbac`, `vhm24-db-expert`, `vhm24-api-generator`, `vhm24-forms`, `vhm24-component-lib`, `vhm24-ui-generator`, `vhm24-mobile`, `vhm24-i18n`, `vhm24-testing`, `vhm24-qa-review`.

---

## 7. Первые команды новой сессии

```bash
cd ~/VendHub-OS
git log --oneline -5
git status

# Главные документы
open docs/audits/MASTER.html
cat docs/audits/MODULE_AUDIT_INDEX.md
cat docs/HANDOFF.md

# Если запуск пилота
open docs/runbooks/LAUNCH_CHECKLIST.md
```

---

## 8. Ключевые цифры

- 95 модулей API
- 1067 защищённых функций
- 84 модуля используют `@Roles`
- 121 тест в auth
- 40 миграций (latest `1776900000000`)
- 23 машины в проде
- 6 агентов, 15 VHM24-скиллов
- 4 принятых решения
- 2 / 12 групп модулей детально проаудированы

---

## 9. Что НЕ нужно делать

- **Не переписывать** auth/RBAC перед пилотом.
- **Не убирать** organizations — 114 entities их используют.
- **Не править** Railway конфиг при блокере — проблема в биллинге.
- **Не создавать** новых owner'ов — Owner = Jamshid singleton.
- **Не вводить** Vercel — он не используется (см. Решение 1).
