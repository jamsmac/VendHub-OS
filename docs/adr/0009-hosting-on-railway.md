# ADR-001: Хостинг на Railway, без Vercel

**Status:** Accepted
**Date:** 2026-04-29
**Decision-makers:** Jamshid Sadikov (Owner)

---

## Context

VendHub OS состоит из 5 приложений: api (NestJS), web (Next.js админка), site (Next.js маркетинг), client (Vite Telegram Mini App), bot (Telegraf). Плюс инфраструктура: Postgres, Redis, BullMQ-воркеры, WebSocket Gateway.

На момент решения был открыт вопрос: размещать ли всё на Railway или разделить — Next.js на Vercel (нативный фреймворк), NestJS на Railway. Vercel Pro у Jamshid'а уже оплачен.

## Decision

**Вся инфраструктура размещается на Railway.** Vercel не используется.

## Rationale

### Почему НЕ разделять между Vercel и Railway

1. **NestJS+BullMQ+WebSocket — persistent stack.** Vercel serverless model несовместим с long-lived BullMQ workers и WebSocket Gateway. Перенос требовал бы 3-6 недель рефакторинга на Inngest/Trigger.dev/Pusher.

2. **Двойной счёт.** Главное возражение Jamshid'а — не платить дважды. Подтверждено рациональным.

3. **Один источник истины для env-переменных.** При разделении NEXT_PUBLIC_API_URL на Vercel должен совпадать с Railway-доменом api. Лишний источник ошибок.

4. **Cookies cross-origin.** Web на Vercel + api на Railway = разные origin → нужен SameSite=none + Secure + правильные CORS. Это работает, но больше точек отказа.

5. **Managed Postgres + Redis на Railway уже подключены.** Перевозить — это переезжать prod БД.

### Почему всё-таки Railway, а не альтернативы (Render, Fly.io, VDS)

- Команда уже работает с Railway, есть знание
- Railway имеет releaseCommand для миграций — это автоматизирует deploy
- На 23 машинах + команде до 20 человек Railway Pro ($20/мес) покрывает с запасом
- DOcker Compose в репо есть — миграция на VDS возможна в будущем без переписывания

## Consequences

### Positive

- Один счёт, единая dashboard
- Простая cross-origin модель (один корневой домен)
- Меньше когнитивной нагрузки на DevOps

### Negative

- Privileged dependency на Railway — если они упадут, упадёт всё
- Невозможность использовать Vercel preview deployments для PR'ов

### Mitigations

- Backup БД перед каждым крупным деплоем
- `docs/runbooks/rollback.md` описывает процедуру отката
- В перспективе — Docker Compose готов к миграции на VDS, если нужно

## Status of related actions

- **Текущий блокер 06.04.2026** — Railway web service не билдится, причина биллинг или пауза. Подробнее в `docs/RAILWAY-DEPLOY-STATUS-2026-04-21.md`.
- **Vercel-подписка** должна быть отменена через интерфейс Vercel (или использована для другого проекта).

## References

- `docs/audits/MASTER.html` — секция «Принятые решения» card #1
- `docs/runbooks/LAUNCH_CHECKLIST.md` — процедура запуска
- `apps/api/railway.toml`, `apps/web/railway.toml` — Railway-конфиг сервисов
