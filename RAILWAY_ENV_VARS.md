# Railway Environment Variables Reference

Copy these variables into **Railway Dashboard → Service → Variables** for each service.

> 🔑 Variables marked `SECRET` should be added as Railway **Secret** variables (not plain text).
> Variables with `XXXX` need to be updated after the first deploy with your actual Railway subdomain.

---

## API Service (`apps/api`)

### Database — Railway Postgres

| Variable                     | Value                        | Notes                                      |
| ---------------------------- | ---------------------------- | ------------------------------------------ |
| `DATABASE_URL`               | `${{Postgres.DATABASE_URL}}` | Railway variable reference (auto-resolved) |
| `DB_HOST`                    | `${{Postgres.PGHOST}}`       | `postgres.railway.internal` on private net |
| `DB_PORT`                    | `${{Postgres.PGPORT}}`       | `5432`                                     |
| `DB_NAME`                    | `${{Postgres.PGDATABASE}}`   | `railway`                                  |
| `DB_USER`                    | `${{Postgres.PGUSER}}`       | `postgres`                                 |
| `DB_PASSWORD`                | `${{Postgres.PGPASSWORD}}`   | SECRET — auto-populated by Railway         |
| `DB_SYNCHRONIZE`             | `false`                      | Never true in production                   |
| `DB_LOGGING`                 | `false`                      |                                            |
| `DB_POOL_SIZE`               | `10`                         |                                            |
| `DB_SSL`                     | `false`                      | No SSL on Railway internal network         |
| `DB_SSL_REJECT_UNAUTHORIZED` | `false`                      |                                            |
| `DB_MIGRATIONS_RUN`          | `true`                       | TypeORM auto-runs migrations on startup    |

### Redis — Railway Managed

| Variable         | Value                                                                          | Notes                |
| ---------------- | ------------------------------------------------------------------------------ | -------------------- |
| `REDIS_HOST`     | `redis.railway.internal`                                                       | Private network only |
| `REDIS_PORT`     | `6379`                                                                         |                      |
| `REDIS_PASSWORD` | `gWQddoaowhHvWQqfTFauXhPqVHrkIwnX`                                             | SECRET               |
| `REDIS_URL`      | `redis://default:gWQddoaowhHvWQqfTFauXhPqVHrkIwnX@redis.railway.internal:6379` |                      |

### JWT Authentication

| Variable                 | Value                                                                                      | Notes  |
| ------------------------ | ------------------------------------------------------------------------------------------ | ------ |
| `JWT_SECRET`             | `LWE3U8dXiAXhu1icNVI5mwZA/fH8NyT8ZidK11f2uVvCKM1m5xs+oANmQz+qKDGJHbZMC57RQlUwPjM9nWsz2A==` | SECRET |
| `JWT_REFRESH_SECRET`     | `RbFaf1MMVjEhygv5Aib3YW/wbtPYasrgkjo0XrfBiUcM+Tni++dmnVnO9lJH5B8hPZgo0AHF6Ue5gpds9Tjkdg==` | SECRET |
| `JWT_EXPIRES_IN`         | `15m`                                                                                      |        |
| `JWT_REFRESH_EXPIRES_IN` | `7d`                                                                                       |        |
| `COOKIE_SECRET`          | `m+C5wjEIgg0C9bnSXHuyOq8UoZONhl6Dcj44gFPkE8Xk3UbPe+4hHTij74NT5CWsfVNYrG+Swx/jLje1Nsk9ZA==` | SECRET |

### 2FA (TOTP)

| Variable         | Value     |
| ---------------- | --------- |
| `TOTP_ISSUER`    | `VendHub` |
| `TOTP_ALGORITHM` | `sha1`    |
| `TOTP_DIGITS`    | `6`       |
| `TOTP_PERIOD`    | `30`      |

### API Config

| Variable       | Value                                                                                      | Notes                     |
| -------------- | ------------------------------------------------------------------------------------------ | ------------------------- |
| `NODE_ENV`     | `production`                                                                               |                           |
| `API_PORT`     | `4000`                                                                                     |                           |
| `API_PREFIX`   | `api/v1`                                                                                   |                           |
| `APP_URL`      | `https://web-production-XXXX.up.railway.app`                                               | Update after first deploy |
| `API_URL`      | `https://api-production-XXXX.up.railway.app`                                               | Update after first deploy |
| `CORS_ORIGINS` | `https://web-production-XXXX.up.railway.app,https://client-production-XXXX.up.railway.app` | Update after first deploy |
| `APP_NAME`     | `VendHub`                                                                                  |                           |

### Swagger

| Variable          | Value         |
| ----------------- | ------------- |
| `SWAGGER_ENABLED` | `true`        |
| `SWAGGER_TITLE`   | `VendHub API` |
| `SWAGGER_VERSION` | `1.0.0`       |

### Supabase Client (JS SDK)

| Variable                    | Value                                                                                                                                                                                                                         | Notes                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `SUPABASE_URL`              | `https://gwrfhzvulvkudobtmkrs.supabase.co`                                                                                                                                                                                    |                         |
| `SUPABASE_ANON_KEY`         | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cmZoenZ1bHZrdWRvYnRta3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTg4ODIsImV4cCI6MjA4ODI3NDg4Mn0.mYp4ZbTsPcF2taoNcFq6EgNYYVtQnGhB_ZymUYpnXsM`            |                         |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cmZoenZ1bHZrdWRvYnRta3JzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY5ODg4MiwiZXhwIjoyMDg4Mjc0ODgyfQ.toawf9oCs9G_5eP8quGLg0foTtEWs3JHU5LJ_E6lvuM` | SECRET — full DB access |
| `SUPABASE_PUBLISHABLE_KEY`  | `sb_publishable_VLh62823_UhYFxUyLiC5xg_6sQQUmbD`                                                                                                                                                                              |                         |
| `SUPABASE_SECRET_KEY`       | `sb_secret_cp09tzPmdYrklnM79_ralw_uCWsPfds`                                                                                                                                                                                   | SECRET                  |

### Storage (S3-compatible via Supabase)

| Variable             | Value                                                              |
| -------------------- | ------------------------------------------------------------------ |
| `STORAGE_ENDPOINT`   | `https://gwrfhzvulvkudobtmkrs.storage.supabase.co/storage/v1/s3`   |
| `STORAGE_ACCESS_KEY` | `0767113015174f7ff67dba39c556b64a`                                 |
| `STORAGE_SECRET_KEY` | `e04dc57e16741e0d5af98e706fd1ccd4322eebe4cf40e6c3b68d8f62fa2fd594` |
| `STORAGE_BUCKET`     | `vendhub-media`                                                    |
| `STORAGE_REGION`     | `ap-southeast-1`                                                   |
| `STORAGE_USE_SSL`    | `true`                                                             |
| `MAX_FILE_SIZE`      | `10485760`                                                         |

### Telegram Bot

| Variable               | Value                                                               | Notes                                                                                                           |
| ---------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`   | `your_telegram_bot_token`                                           | Get from @BotFather                                                                                             |
| `TELEGRAM_WEBHOOK_URL` | `https://vendhubapi-production.up.railway.app/telegram-bot/webhook` | Update after first deploy                                                                                       |
| `BOT_API_TOKEN`        | _(JWT token)_                                                       | Service account JWT for bot→API auth. Generate via admin panel or CLI: `pnpm --filter api cli:create-bot-token` |

### SMS (Uzbekistan)

| Variable         | Value           | Notes                      |
| ---------------- | --------------- | -------------------------- |
| `SMS_PROVIDER`   | `eskiz`         | eskiz / playmobile / smsuz |
| `SMS_API_KEY`    | _(your key)_    |                            |
| `SMS_API_SECRET` | _(your secret)_ | SECRET                     |
| `SMS_SENDER_ID`  | `VendHub`       |                            |

### Email (SMTP)

| Variable        | Value                             |
| --------------- | --------------------------------- |
| `SMTP_HOST`     | `smtp.gmail.com`                  |
| `SMTP_PORT`     | `587`                             |
| `SMTP_USER`     | `your-email@gmail.com`            |
| `SMTP_PASSWORD` | `your-app-password`               |
| `SMTP_FROM`     | `VendHub OS <noreply@vendhub.uz>` |

### Payment Integrations (Uzbekistan)

| Variable            | Value        | Notes                   |
| ------------------- | ------------ | ----------------------- |
| `PAYME_MERCHANT_ID` | _(your ID)_  |                         |
| `PAYME_SECRET_KEY`  | _(your key)_ | SECRET                  |
| `PAYME_TEST_MODE`   | `false`      | Set false in production |
| `CLICK_MERCHANT_ID` | _(your ID)_  |                         |
| `CLICK_SERVICE_ID`  | _(your ID)_  |                         |
| `CLICK_SECRET_KEY`  | _(your key)_ | SECRET                  |
| `UZUM_MERCHANT_ID`  | _(your ID)_  |                         |
| `UZUM_SECRET_KEY`   | _(your key)_ | SECRET                  |

### OFD / Fiscal (Uzbekistan Tax)

| Variable       | Value             |
| -------------- | ----------------- |
| `OFD_ENABLED`  | `false`           |
| `OFD_PROVIDER` | `soliq`           |
| `OFD_API_URL`  | _(from Soliq.uz)_ |
| `OFD_API_KEY`  | _(your key)_      |
| `OFD_INN`      | _(your INN)_      |

### Monitoring

| Variable     | Value                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------- |
| `SENTRY_DSN` | `https://2644801113f30ea3ede5e741cf322a95@o4510824306442240.ingest.de.sentry.io/4510824315093072` |
| `LOG_LEVEL`  | `info`                                                                                            |
| `LOG_FORMAT` | `combined`                                                                                        |

### Feature Flags

| Variable                      | Value   |
| ----------------------------- | ------- |
| `FEATURE_TELEGRAM_BOT`        | `true`  |
| `FEATURE_SMS_NOTIFICATIONS`   | `true`  |
| `FEATURE_EMAIL_NOTIFICATIONS` | `true`  |
| `FEATURE_PUSH_NOTIFICATIONS`  | `false` |
| `FEATURE_OFD_INTEGRATION`     | `false` |
| `FEATURE_PAYMENT_INTEGRATION` | `true`  |
| `FEATURE_AI_IMPORT`           | `true`  |
| `FEATURE_AI_ANALYSIS`         | `true`  |

### Rate Limiting

| Variable         | Value |
| ---------------- | ----- |
| `THROTTLE_TTL`   | `60`  |
| `THROTTLE_LIMIT` | `100` |

### Multi-Tenant

| Variable                  | Value     |
| ------------------------- | --------- |
| `DEFAULT_ORGANIZATION_ID` | `default` |

### AI Integration

| Variable            | Value        |
| ------------------- | ------------ |
| `AI_PROVIDER`       | `openai`     |
| `OPENAI_API_KEY`    | _(your key)_ |
| `ANTHROPIC_API_KEY` | _(your key)_ |

---

## Web Service (`apps/web`)

| Variable                        | Value                                          | Notes                     |
| ------------------------------- | ---------------------------------------------- | ------------------------- |
| `NODE_ENV`                      | `production`                                   |                           |
| `PORT`                          | `3000`                                         |                           |
| `NEXT_PUBLIC_API_URL`           | `https://vendhubapi-production.up.railway.app` | Update after first deploy |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://gwrfhzvulvkudobtmkrs.supabase.co`     |                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`      | (full key from .env)      |

---

## Client Service (`apps/client`)

| Variable                 | Value                                          | Notes                     |
| ------------------------ | ---------------------------------------------- | ------------------------- |
| `NODE_ENV`               | `production`                                   |                           |
| `PORT`                   | `3000`                                         | serve uses 3000 default   |
| `VITE_API_URL`           | `https://vendhubapi-production.up.railway.app` | Update after first deploy |
| `VITE_SUPABASE_URL`      | `https://gwrfhzvulvkudobtmkrs.supabase.co`     |                           |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`      | (full key from .env)      |

---

## Bot Service (`apps/bot`)

| Variable             | Value                                                                          |
| -------------------- | ------------------------------------------------------------------------------ |
| `NODE_ENV`           | `production`                                                                   |
| `TELEGRAM_BOT_TOKEN` | `your_telegram_bot_token`                                                      |
| `API_URL`            | `https://vendhubapi-production.up.railway.app`                                 |
| `REDIS_URL`          | `redis://default:gWQddoaowhHvWQqfTFauXhPqVHrkIwnX@redis.railway.internal:6379` |

---

## Site Service (`apps/site`)

| Variable   | Value        |
| ---------- | ------------ |
| `NODE_ENV` | `production` |
| `PORT`     | `3100`       |

---

## Tips

### Using Railway CLI to bulk-import variables

Create a `.env.railway.api` file with only the API variables, then:

```bash
railway variables set --service api < .env.railway.api
```

Or use the Railway Dashboard **Variables → Bulk Import** feature (paste all KEY=VALUE pairs at once).

### Referencing variables between services

Railway allows referencing another service's variable:

```
# In web service, reference api service's generated URL:
NEXT_PUBLIC_API_URL=${{api.RAILWAY_PUBLIC_DOMAIN}}
```

### Railway auto-injects these variables

Railway automatically injects these — you don't need to set them:

```
PORT              # Railway assigns this — use $PORT in start commands
RAILWAY_PUBLIC_DOMAIN
RAILWAY_PRIVATE_DOMAIN
RAILWAY_ENVIRONMENT
```

---

_Generated: 2026-03-06 | VendHub OS — Railway deployment reference_
