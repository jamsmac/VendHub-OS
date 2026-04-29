# Audit: `apps/api/src/modules/auth`

**Date:** 2026-04-29
**Group:** Identity & Access
**Verdict:** 🟡 **Готов к запуску при условии корректной настройки env на Railway.** Код качественный, угроз архитектурного уровня нет, но есть 4 env-зависимых риска, которые надо снять до прода.

---

## 1. Назначение и границы

Корневой модуль аутентификации API. Закрывает:

- Регистрацию (email+password, по invite, через Telegram WebApp).
- Вход (email+password с lockout, Telegram, refresh-token rotation).
- 2FA (TOTP, backup codes, challenge-token flow для предотвращения IDOR).
- Сброс пароля, политика паролей, first-login change-password.
- JWT-сессии: подпись, валидация, blacklist по `jti`, blacklist всех токенов пользователя по `iat` (после смены пароля).
- Куки: HttpOnly, secure, sameSite, configurable domain.
- AgentMode bypass для autonomous-агентов (только если `NODE_ENV !== production`).

**Не делает:** RBAC (это `rbac` модуль использует `@Roles()` + `RolesGuard` из этого модуля), пользовательский CRUD (это `users`), приглашения CRUD (это `invites`).

## 2. Связи

**Imports:**

- `UsersModule` — для `UsersService.findAuthUserById()`.
- `InvitesModule` — для регистрации по приглашению.
- `JwtModule` (registered async с `JWT_SECRET`).
- `PassportModule` (default strategy: jwt).
- `TypeOrmModule.forFeature([User, UserSession, TwoFactorAuth, PasswordResetToken, LoginAttempt])` — entities из `users` модуля.
- `MetricsService` — внутри `AuthService` (для login-метрик).
- `EventEmitter2` — для `email.send` (`auth.service.ts:827`).

**Exports:**

- `AuthService`, `JwtModule`, `TokenBlacklistService`, `PasswordPolicyService`, `CookieService`, `TwoFactorService`, `AuthSessionService`.

**Кто импортирует артефакты auth:** **129 файлов** в `apps/api/src/modules/`. Это `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@Public()`, `@CurrentUser()` — то есть фактически все остальные модули зависят от auth напрямую или через guards.

**События:**

- ✉️ Emit: `email.send` (для password reset emails).
- 📥 Listen: ничего.

## 3. Схема данных

5 entities (определены в `apps/api/src/modules/users/entities/user.entity.ts`):

- `User` (id, email, password hash, role, organizationId, status, telegramId, telegramUsername, isActive, ...)
- `UserSession` (id, userId, jti, ipAddress, userAgent, expiresAt, ...)
- `TwoFactorAuth` (id, userId, secret, backupCodes, enabled)
- `PasswordResetToken` (id, userId, tokenHash, expiresAt)
- `LoginAttempt` (id, email, ipAddress, success, createdAt) — для lockout

**Миграции:**

- Создание схемы — в `1700000000000-Init.ts` (ранние).
- `1715000000000-AddInvitesTable.ts` — расширение для invites.
- Несколько `SyncEntities`/`SyncDrift` патчей.

## 4. API surface

**REST endpoints (`/api/v1/auth/*`):**

| Method | Path                             | Public?              | Throttle | Roles     |
| ------ | -------------------------------- | -------------------- | -------- | --------- |
| POST   | `/register`                      | ✅                   | 5/min    | —         |
| POST   | `/register/invite`               | ✅                   | 5/min    | —         |
| POST   | `/login`                         | ✅                   | 10/min   | —         |
| POST   | `/telegram`                      | ✅                   | 10/min   | —         |
| POST   | `/refresh`                       | ✅                   | 30/min   | —         |
| POST   | `/logout`                        | 🔒                   | default  | all roles |
| GET    | `/me`                            | 🔒                   | skip     | all roles |
| GET    | `/sessions`                      | 🔒                   | default  | all roles |
| POST   | `/password/forgot`               | ✅                   | 3/min    | —         |
| POST   | `/password/reset`                | ✅                   | 5/min    | —         |
| POST   | `/password/validate-reset-token` | ✅                   | default  | —         |
| POST   | `/2fa/complete`                  | ✅                   | default  | —         |
| POST   | `/2fa/enable`                    | 🔒                   | default  | all roles |
| POST   | `/2fa/verify`                    | 🔒                   | default  | all roles |
| POST   | `/2fa/disable`                   | 🔒                   | default  | all roles |
| POST   | `/2fa/backup-codes`              | 🔒                   | default  | all roles |
| POST   | `/first-login/change-password`   | ✅ (challenge-token) | default  | —         |
| GET    | `/password/requirements`         | ✅                   | default  | —         |

**WS gateways:** нет.
**BullMQ queues:** нет.
**Cron:** **3 cron job'а** в `auth.service.ts`, все в Asia/Tashkent timezone:

- `@Cron("0 3 * * *", { timeZone: "Asia/Tashkent" })` — 03:00 daily (`auth.service.ts:1117`)
- `@Cron("0 4 * * *", { timeZone: "Asia/Tashkent" })` — 04:00 daily (`auth.service.ts:1146`)
- `@Cron("0 5 * * *", { timeZone: "Asia/Tashkent" })` — 05:00 daily (`auth.service.ts:1179`)

Скорее всего: cleanup expired sessions / blacklisted tokens / login attempts. **Зависят от tzdata** в контейнере и от того, что Railway-инстанс не уезжает в кому ночью. Проверить, что `tzdata` есть в Dockerfile API.

## 5. Tenant scoping и RBAC

- **JWT payload** включает `organizationId` — все downstream-модули фильтруют по `user.organizationId`.
- **`RolesGuard`** ([guards/roles.guard.ts](../../apps/api/src/modules/auth/guards/roles.guard.ts)): `OWNER` имеет доступ ко всему, остальные — только к ролям из `@Roles()`.
- **AGENT_MODE** инжектит fake-user `00000000-...-001` с `role=owner` — **только если `NODE_ENV !== production`**. Защита есть, но завязана на одну переменную (см. риски).
- Cross-org защиты в самом auth нет — все auth-эндпоинты public или работают со «своим» user из JWT.

## 6. Тестовое покрытие

Всего: **121 тест** в 6 spec-файлах.

| File                                       | Tests |
| ------------------------------------------ | ----- |
| `auth.controller.spec.ts`                  | 23    |
| `auth.service.spec.ts`                     | 17    |
| `services/cookie.service.spec.ts`          | 23    |
| `services/password-policy.service.spec.ts` | 29    |
| `services/token-blacklist.service.spec.ts` | 18    |
| `services/two-factor.service.spec.ts`      | 11    |

Покрытие выглядит плотным. То что покрыто — критические пути login/refresh/2fa/lockout/cookie semantics/policy.

## 7. Риски к проду

### 🟡 R1. Fallback `JWT_SECRET ?? ""` в auth.module.ts и auth.service.ts

```ts
// auth.module.ts:40
secret: configService.get<string>("JWT_SECRET") ?? "",
```

Если переменная не установлена, `JwtService.sign()` подпишет токены пустой строкой. `JwtStrategy` явно падает при отсутствии `JWT_SECRET`, но это второй слой — секрет уже мог быть скомпрометирован при подписи. **Action:** в Railway env обязательно `JWT_SECRET` (≥32 байта random), плюс желательно убрать `?? ""` и кинуть error на старте приложения.

### 🟡 R2. AGENT_MODE bypass

`JwtAuthGuard` пропускает аутентификацию полностью, если `AGENT_MODE=true` и `NODE_ENV !== "production"`.

```ts
this.agentMode =
  process.env.AGENT_MODE === "true" && process.env.NODE_ENV !== "production";
```

**Risk:** если `NODE_ENV` не выставлен в Railway явно, и у атакующего есть способ задать переменную окружения (через misconfig CI/CD), bypass активен. **Action:** в Railway env переменных `NODE_ENV=production` обязательно. Можно дополнительно ужесточить — `process.env.NODE_ENV === "development"`.

### 🟡 R3. Cookie config для cross-origin

`web` на `vendhubweb-production.up.railway.app`, `api` на `vendhubapi-production.up.railway.app` — **разные origin**.

В `cookie.service.ts:37–45` есть умные дефолты:

- `COOKIE_SECURE` **авто** = `"true"` если `NODE_ENV === "production"` → **не критично выставлять**, достаточно `NODE_ENV=production`.
- `COOKIE_SAME_SITE` дефолт = `"lax"` → **критично переопределить**. `lax` НЕ отдаёт cookie на cross-origin POST/PUT/DELETE (только на top-level GET-навигации). Login на отдельном домене сломается.
- `COOKIE_DOMAIN` дефолт = `undefined` (current host) → **ok**, если у каждого сервиса свой `*.up.railway.app`. Если будет кастомный единый домен `vendhub.uz` для обоих — поставить `.vendhub.uz`.

**Action:** в Railway env API выставить:

```
NODE_ENV=production
COOKIE_SAME_SITE=none
```

Если домен общий — добавить `COOKIE_DOMAIN=.vendhub.uz`.

### 🟡 R4a. tzdata отсутствует в API Dockerfile (новая находка при verify)

`apps/api/Dockerfile` все 4 stage'а на `node:20-alpine`. Alpine knows only UTC.

```dockerfile
FROM node:20-alpine AS deps
FROM node:20-alpine AS development
FROM node:20-alpine AS builder
FROM node:20-alpine AS production
```

`tzdata` нигде не ставится → `@Cron("0 3 * * *", { timeZone: "Asia/Tashkent" })` либо молча падает в UTC (03:00 UTC = 08:00 Ташкент), либо ScheduleModule бросает ошибку при resolve TZ.

**Action:** добавить `RUN apk add --no-cache tzdata` в production stage Dockerfile, и `ENV TZ=Asia/Tashkent` если хотим default zone. Проверить в других модулях, кто ещё использует `Asia/Tashkent` явно.

### 🟡 R4. `verifyTelegramData()` зависит от `TELEGRAM_BOT_TOKEN`

Telegram login верифицирует HMAC от `initData`. Если токен в env неверный — все Telegram-логины 401. **Action:** проверить значение в Railway, плюс убедиться, что не попадает в логи.

### 🟢 Низкие риски / уже хорошо

- bcrypt cost = 12 — норм для CPU 2026 года.
- JWT issuer/audience выставлены явно.
- Token blacklist: и по `jti`, и по user-level через `iat` (защита после password change / force logout).
- Challenge-token flow для 2FA и first-login предотвращает IDOR (явно прокомментировано в коде).
- Throttle на всех публичных эндпоинтах.
- `User.password` исключается из `findAuthUserById` (нужно подтвердить в `users` модуле, но JWT strategy просто берёт user без password — ok).

## 8. Готовность

**🟡 Готов условно.** Action items для запуска:

| #   | Action                                                                                                                                                                                        | Owner          | ETA    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| 1   | Прописать в Railway env API: `JWT_SECRET` (≥32B random), `NODE_ENV=production`, `COOKIE_SAME_SITE=none`, `TELEGRAM_BOT_TOKEN`. (COOKIE_SECURE авто-true в prod, выставлять отдельно не нужно) | Jamshid        | 15 мин |
| 1.1 | Проверить, что в API Dockerfile есть `tzdata` — иначе 3 cron'а в `Asia/Tashkent` стартуют в UTC                                                                                               | Claude         | 5 мин  |
| 2   | После старта прода — smoke-test: `/auth/login` → cookie set → `/auth/me` 200                                                                                                                  | Jamshid+Claude | 10 мин |
| 3   | (Опционально, не блокер) Заменить `?? ""` на explicit throw при отсутствии `JWT_SECRET` в `auth.module.ts`                                                                                    | Claude         | 5 мин  |
| 4   | (Опционально) Ужесточить `agentMode` до `NODE_ENV === "development"`                                                                                                                          | Claude         | 5 мин  |

После выполнения 1+2 — модуль 🟢 ready.

## Следующий шаг

Аудит модуля `users` — он закрывает entities + CRUD пользователей и owner'ит User entity, на которую опирается auth.
