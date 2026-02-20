# VendHub OS API Endpoint Map

> Auto-generated context for AI agents. 566+ endpoints across 66 controllers.
> All endpoints prefixed with `/api/v1` unless marked Public.

## auth (13 endpoints)

| Method | Path                   | Access        |
| ------ | ---------------------- | ------------- |
| POST   | /register              | Public        |
| POST   | /login                 | Public        |
| POST   | /refresh               | Public        |
| POST   | /logout                | authenticated |
| GET    | /me                    | authenticated |
| GET    | /sessions              | authenticated |
| POST   | /password/forgot       | Public        |
| POST   | /password/reset        | Public        |
| POST   | /2fa/enable            | authenticated |
| POST   | /2fa/verify            | authenticated |
| POST   | /2fa/disable           | authenticated |
| POST   | /2fa/backup-codes      | authenticated |
| GET    | /password/requirements | Public        |

## users (5 endpoints)

| Method | Path | Roles                 |
| ------ | ---- | --------------------- |
| POST   | /    | admin, owner          |
| GET    | /    | admin, manager, owner |
| GET    | /:id | owner, admin, manager |
| PATCH  | /:id | admin, owner          |
| DELETE | /:id | admin, owner          |

## organizations (5 endpoints)

| Method | Path | Roles        |
| ------ | ---- | ------------ |
| POST   | /    | owner        |
| GET    | /    | owner        |
| GET    | /:id | all 7 roles  |
| PATCH  | /:id | admin, owner |
| DELETE | /:id | owner        |

## employees (40 endpoints)

| Method | Path                         | Roles                                      |
| ------ | ---------------------------- | ------------------------------------------ |
| POST   | /                            | manager, admin, owner                      |
| GET    | /                            | manager, admin, owner                      |
| GET    | /stats                       | manager, admin, owner                      |
| GET    | /active                      | operator, warehouse, manager, admin, owner |
| GET    | /by-role/:role               | manager, admin, owner                      |
| GET    | /by-telegram/:telegramUserId | manager, admin, owner                      |
| GET    | /:id                         | manager, admin, owner                      |
| PUT    | /:id                         | manager, admin, owner                      |
| DELETE | /:id                         | admin, owner                               |
| POST   | /:id/terminate               | manager, admin, owner                      |
| POST   | /:id/link-user               | admin, owner                               |
| POST   | /:id/unlink-user             | admin, owner                               |
| POST   | /departments                 | manager, admin, owner                      |
| GET    | /departments                 | manager, admin, owner                      |
| GET    | /departments/:id             | manager, admin, owner                      |
| PUT    | /departments/:id             | manager, admin, owner                      |
| DELETE | /departments/:id             | admin, owner                               |
| POST   | /positions                   | manager, admin, owner                      |
| GET    | /positions                   | manager, admin, owner                      |
| GET    | /positions/:id               | manager, admin, owner                      |
| PUT    | /positions/:id               | manager, admin, owner                      |
| POST   | /attendance/check-in         | operator, manager, admin, owner            |
| POST   | /attendance/check-out        | operator, manager, admin, owner            |
| GET    | /attendance                  | manager, admin, owner                      |
| GET    | /attendance/daily            | manager, admin, owner                      |
| POST   | /leave                       | operator, manager, admin, owner            |
| GET    | /leave                       | manager, admin, owner                      |
| GET    | /leave/balance/:employeeId   | manager, admin, owner                      |
| POST   | /leave/:id/approve           | manager, admin, owner                      |
| POST   | /leave/:id/reject            | manager, admin, owner                      |
| POST   | /leave/:id/cancel            | operator, manager, admin, owner            |
| POST   | /payroll/calculate           | accountant, admin, owner                   |
| GET    | /payroll                     | accountant, manager, admin, owner          |
| GET    | /payroll/:id                 | accountant, manager, admin, owner          |
| POST   | /payroll/:id/approve         | admin, owner                               |
| POST   | /payroll/:id/pay             | admin, owner                               |
| POST   | /reviews                     | manager, admin, owner                      |
| GET    | /reviews                     | manager, admin, owner                      |
| GET    | /reviews/:id                 | manager, admin, owner                      |
| POST   | /reviews/:id/submit          | manager, admin, owner                      |

## machines (24 endpoints)

| Method | Path                                  | Roles                           |
| ------ | ------------------------------------- | ------------------------------- |
| POST   | /                                     | owner, admin, manager           |
| GET    | /                                     | all 7 roles                     |
| GET    | /stats                                | all 7 roles                     |
| GET    | /map                                  | all 7 roles                     |
| GET    | /:id                                  | all 7 roles                     |
| PATCH  | /:id                                  | owner, admin, manager           |
| PATCH  | /:id/status                           | owner, admin, manager, operator |
| PATCH  | /:id/telemetry                        | owner, admin, manager, operator |
| DELETE | /:id                                  | owner, admin, manager           |
| GET    | /:id/slots                            | all 7 roles                     |
| POST   | /:id/slots                            | owner, admin, manager           |
| PATCH  | /:id/slots/:slotId                    | owner, admin, manager           |
| POST   | /:id/slots/:slotId/refill             | owner, admin, manager, operator |
| POST   | /:id/move                             | owner, admin, manager           |
| GET    | /:id/location-history                 | all 7 roles                     |
| GET    | /:id/components                       | all 7 roles                     |
| POST   | /:id/components                       | owner, admin, manager           |
| DELETE | /:id/components/:componentId          | owner, admin, manager           |
| GET    | /:id/errors                           | all 7 roles                     |
| POST   | /:id/errors                           | owner, admin, manager, operator |
| PATCH  | /:id/errors/:errorId/resolve          | owner, admin, manager, operator |
| GET    | /:id/maintenance                      | all 7 roles                     |
| POST   | /:id/maintenance                      | owner, admin, manager           |
| PATCH  | /:id/maintenance/:scheduleId/complete | owner, admin, manager, operator |

## products (16 endpoints)

| Method | Path                                             | Roles                 |
| ------ | ------------------------------------------------ | --------------------- |
| POST   | /                                                | owner, admin, manager |
| GET    | /                                                | all 7 roles           |
| GET    | /:id                                             | all 7 roles           |
| GET    | /barcode/:barcode                                | all 7 roles           |
| PATCH  | /:id                                             | owner, admin, manager |
| DELETE | /:id                                             | owner, admin, manager |
| POST   | /:id/recipes                                     | owner, admin, manager |
| GET    | /:id/recipes                                     | all 7 roles           |
| PATCH  | /:id/recipes/:recipeId                           | owner, admin, manager |
| DELETE | /:id/recipes/:recipeId                           | owner, admin, manager |
| POST   | /:id/recipes/:recipeId/ingredients               | owner, admin, manager |
| DELETE | /:id/recipes/:recipeId/ingredients/:ingredientId | owner, admin, manager |
| POST   | /:id/batches                                     | owner, admin, manager |
| GET    | /:id/batches                                     | all 7 roles           |
| GET    | /:id/price-history                               | all 7 roles           |
| POST   | /:id/update-price                                | owner, admin, manager |

## suppliers (4 endpoints)

| Method | Path | Roles                 |
| ------ | ---- | --------------------- |
| GET    | /    | all 7 roles           |
| POST   | /    | owner, admin, manager |
| GET    | /:id | all 7 roles           |
| PATCH  | /:id | owner, admin, manager |

## inventory (14 endpoints)

| Method | Path                       | Roles                            |
| ------ | -------------------------- | -------------------------------- |
| GET    | /warehouse                 | owner, admin, manager, warehouse |
| GET    | /operator                  | owner, admin, manager, warehouse |
| GET    | /machine                   | owner, admin, manager, warehouse |
| GET    | /low-stock                 | owner, admin, manager, warehouse |
| POST   | /transfer                  | owner, admin, manager, warehouse |
| GET    | /movements                 | owner, admin, manager, warehouse |
| GET    | /reservations              | owner, admin, manager, warehouse |
| GET    | /reservations/summary      | owner, admin, manager, warehouse |
| GET    | /reservations/task/:taskId | owner, admin, manager, warehouse |
| GET    | /reservations/:id          | owner, admin, manager, warehouse |
| POST   | /reservations              | owner, admin, manager, warehouse |
| POST   | /reservations/:id/confirm  | owner, admin, manager, warehouse |
| POST   | /reservations/:id/fulfill  | owner, admin, manager, warehouse |
| POST   | /reservations/:id/cancel   | owner, admin, manager, warehouse |

## orders (14 endpoints)

| Method | Path                    | Roles                             |
| ------ | ----------------------- | --------------------------------- |
| POST   | /                       | all 7 roles                       |
| GET    | /my                     | all 7 roles                       |
| GET    | /my/:id                 | all 7 roles                       |
| GET    | /                       | owner, admin, manager, accountant |
| GET    | /stats                  | owner, admin, manager, accountant |
| GET    | /by-number/:orderNumber | owner, admin, manager, accountant |
| GET    | /:id                    | owner, admin, manager, accountant |
| PUT    | /:id/status             | operator, manager, admin, owner   |
| PUT    | /:id/payment            | operator, manager, admin, owner   |
| POST   | /:id/confirm            | operator, manager, admin, owner   |
| POST   | /:id/prepare            | operator, manager, admin, owner   |
| POST   | /:id/ready              | operator, manager, admin, owner   |
| POST   | /:id/complete           | operator, manager, admin, owner   |
| POST   | /:id/cancel             | owner, admin                      |

## payments (11 endpoints)

| Method | Path                | Roles                             |
| ------ | ------------------- | --------------------------------- |
| POST   | /payme/create       | all 7 roles                       |
| POST   | /click/create       | all 7 roles                       |
| POST   | /uzum/create        | all 7 roles                       |
| POST   | /qr/generate        | all 7 roles                       |
| POST   | /webhook/payme      | Public                            |
| POST   | /webhook/click      | Public                            |
| POST   | /webhook/uzum       | Public                            |
| POST   | /refund             | admin, owner, manager             |
| GET    | /transactions       | admin, owner, manager, accountant |
| GET    | /transactions/stats | owner, admin, manager, accountant |
| GET    | /transactions/:id   | admin, owner, manager, accountant |

## transactions (17 endpoints)

| Method | Path                              | Roles                             |
| ------ | --------------------------------- | --------------------------------- |
| POST   | /                                 | owner, admin, manager, operator   |
| POST   | /:id/payment                      | owner, admin, manager, operator   |
| POST   | /:id/dispense                     | owner, admin, manager, operator   |
| POST   | /:id/cancel                       | owner, admin                      |
| GET    | /                                 | owner, admin, manager, accountant |
| GET    | /statistics                       | owner, admin, manager, accountant |
| GET    | /collections                      | owner, admin, manager, accountant |
| POST   | /collections                      | owner, admin, manager, operator   |
| PATCH  | /collections/:collectionId/verify | owner, admin, manager, accountant |
| GET    | /daily-summaries                  | owner, admin, manager, accountant |
| POST   | /daily-summaries/rebuild          | owner, admin                      |
| GET    | /commissions                      | owner, admin, accountant          |
| GET    | /:id                              | owner, admin, accountant          |
| GET    | /number/:number                   | owner, admin, accountant          |
| POST   | /:id/refund                       | owner, admin, manager             |
| POST   | /refunds/:refundId/process        | owner, admin, accountant          |
| POST   | /:id/fiscalize                    | owner, admin, accountant          |

## notifications (22 endpoints)

| Method | Path                 | Roles                 |
| ------ | -------------------- | --------------------- |
| GET    | /                    | all 7 roles           |
| GET    | /unread-count        | all 7 roles           |
| POST   | /:id/read            | all 7 roles           |
| POST   | /read-all            | all 7 roles           |
| DELETE | /:id                 | all 7 roles           |
| GET    | /settings            | all 7 roles           |
| PUT    | /settings            | all 7 roles           |
| POST   | /                    | owner, admin, manager |
| POST   | /send-templated      | owner, admin, manager |
| GET    | /organization        | owner, admin, manager |
| GET    | /templates           | owner, admin, manager |
| GET    | /templates/:id       | owner, admin, manager |
| POST   | /templates           | owner, admin          |
| PATCH  | /templates/:id       | owner, admin          |
| GET    | /campaigns           | owner, admin, manager |
| POST   | /campaigns           | owner, admin          |
| POST   | /campaigns/:id/start | owner, admin          |
| POST   | /cleanup             | owner, admin          |
| POST   | /process-queue       | owner, admin          |
| POST   | /push/subscribe      | all 7 roles           |
| DELETE | /push/unsubscribe    | all 7 roles           |
| POST   | /fcm/register        | all 7 roles           |
| DELETE | /fcm/unregister      | all 7 roles           |

## favorites (16 endpoints)

| Method | Path                        | Roles       |
| ------ | --------------------------- | ----------- |
| GET    | /                           | all 7 roles |
| GET    | /products                   | all 7 roles |
| GET    | /machines                   | all 7 roles |
| GET    | /count                      | all 7 roles |
| POST   | /                           | all 7 roles |
| DELETE | /:id                        | all 7 roles |
| PUT    | /:id                        | all 7 roles |
| POST   | /products/:productId/toggle | all 7 roles |
| POST   | /machines/:machineId/toggle | all 7 roles |
| GET    | /products/:productId/status | all 7 roles |
| GET    | /machines/:machineId/status | all 7 roles |
| POST   | /products/status/bulk       | all 7 roles |
| POST   | /machines/status/bulk       | all 7 roles |
| POST   | /bulk                       | all 7 roles |
| DELETE | /bulk                       | all 7 roles |
| PUT    | /reorder                    | all 7 roles |

## client (12 endpoints)

| Method | Path                           | Roles                 |
| ------ | ------------------------------ | --------------------- |
| POST   | /register                      | Public                |
| GET    | /profile/me                    | all 7 roles           |
| PUT    | /profile/me                    | all 7 roles           |
| POST   | /orders                        | all 7 roles           |
| GET    | /orders/me                     | all 7 roles           |
| GET    | /wallet/me                     | all 7 roles           |
| GET    | /loyalty/me                    | all 7 roles           |
| GET    | /admin/clients                 | admin, owner, manager |
| GET    | /admin/clients/:id             | admin, owner, manager |
| POST   | /admin/wallet/:clientId/top-up | admin, owner          |
| POST   | /admin/wallet/:clientId/adjust | admin, owner          |
| GET    | /admin/orders                  | admin, owner, manager |

## locations (6 endpoints)

| Method | Path    | Roles                                                   |
| ------ | ------- | ------------------------------------------------------- |
| POST   | /       | admin, manager, owner                                   |
| GET    | /       | admin, manager, operator, warehouse, accountant, viewer |
| GET    | /nearby | admin, manager, operator, warehouse, viewer             |
| GET    | /:id    | admin, manager, operator, warehouse, accountant, viewer |
| PATCH  | /:id    | admin, manager, owner                                   |
| DELETE | /:id    | admin, owner                                            |

## routes (12 endpoints)

| Method | Path               | Roles                            |
| ------ | ------------------ | -------------------------------- |
| POST   | /                  | admin, manager, owner            |
| GET    | /                  | admin, manager, operator, viewer |
| GET    | /:id               | admin, manager, operator, viewer |
| PATCH  | /:id               | admin, manager, owner            |
| DELETE | /:id               | admin, owner                     |
| POST   | /:id/start         | admin, manager, operator, owner  |
| POST   | /:id/complete      | admin, manager, operator, owner  |
| POST   | /:id/optimize      | admin, manager, owner            |
| GET    | /:id/stops         | owner, admin, manager, operator  |
| POST   | /:id/stops         | admin, manager, owner            |
| PATCH  | /:id/stops/:stopId | admin, manager, operator, owner  |
| DELETE | /:id/stops/:stopId | admin, manager, owner            |
| POST   | /:id/stops/reorder | admin, manager, owner            |

## tasks (25 endpoints)

| Method | Path               | Roles                           |
| ------ | ------------------ | ------------------------------- |
| GET    | /kanban            | owner, admin, manager, operator |
| GET    | /my                | owner, admin, manager, operator |
| POST   | /                  | admin, manager, owner           |
| GET    | /                  | owner, admin, manager, operator |
| GET    | /:id               | owner, admin, manager, operator |
| PATCH  | /:id               | admin, manager, owner           |
| DELETE | /:id               | admin, owner                    |
| POST   | /:id/assign        | admin, manager, owner           |
| POST   | /:id/start         | owner, admin, manager, operator |
| POST   | /:id/postpone      | owner, admin, manager, operator |
| POST   | /:id/reject        | admin, manager, owner           |
| POST   | /:id/cancel        | admin, manager, owner           |
| POST   | /:id/photo-before  | owner, admin, manager, operator |
| POST   | /:id/photo-after   | owner, admin, manager, operator |
| POST   | /:id/complete      | owner, admin, manager, operator |
| GET    | /:id/items         | owner, admin, manager, operator |
| POST   | /:id/items         | admin, manager, owner, operator |
| PATCH  | /:id/items/:itemId | admin, manager, owner, operator |
| DELETE | /:id/items/:itemId | admin, manager, owner           |
| GET    | /:id/comments      | owner, admin, manager, operator |
| POST   | /:id/comments      | owner, admin, manager, operator |
| GET    | /:id/components    | owner, admin, manager, operator |
| POST   | /:id/components    | admin, manager, owner, operator |
| GET    | /:id/photos        | owner, admin, manager, operator |
| POST   | /:id/photos        | owner, admin, manager, operator |

## trips (22 endpoints)

| Method | Path                               | Roles                           |
| ------ | ---------------------------------- | ------------------------------- |
| POST   | /start                             | admin, manager, operator, owner |
| POST   | /:id/end                           | admin, manager, operator, owner |
| POST   | /:id/cancel                        | admin, manager, operator, owner |
| GET    | /active                            | admin, manager, operator, owner |
| GET    | /                                  | admin, manager, operator, owner |
| GET    | /:id                               | admin, manager, operator, owner |
| GET    | /:id/route                         | admin, manager, operator, owner |
| GET    | /:id/stops                         | admin, manager, operator, owner |
| GET    | /:id/anomalies                     | admin, manager, operator, owner |
| POST   | /:id/points                        | admin, manager, operator, owner |
| POST   | /:id/points/batch                  | admin, manager, operator, owner |
| PATCH  | /:id/live-location                 | admin, manager, operator, owner |
| GET    | /:id/tasks                         | admin, manager, operator, owner |
| POST   | /:id/tasks                         | admin, manager, operator, owner |
| POST   | /:tripId/tasks/:taskId/complete    | admin, manager, operator, owner |
| GET    | /anomalies/unresolved              | admin, manager, owner           |
| POST   | /anomalies/:id/resolve             | admin, manager, owner           |
| POST   | /reconciliation                    | admin, manager, operator, owner |
| GET    | /reconciliation/:vehicleId/history | admin, manager, operator, owner |
| GET    | /analytics/employee                | admin, manager, owner           |
| GET    | /analytics/machines                | admin, manager, owner           |
| GET    | /analytics/summary                 | admin, manager, owner           |

## reports (26 endpoints)

| Method | Path                            | Roles                             |
| ------ | ------------------------------- | --------------------------------- |
| GET    | /definitions                    | owner, admin, manager, accountant |
| GET    | /definitions/:id                | owner, admin, manager, accountant |
| POST   | /definitions                    | owner, admin                      |
| POST   | /generate                       | owner, admin, manager, accountant |
| GET    | /generated                      | owner, admin, manager, accountant |
| GET    | /generated/:id                  | owner, admin, manager, accountant |
| GET    | /scheduled                      | owner, admin, manager             |
| POST   | /scheduled                      | owner, admin                      |
| PATCH  | /scheduled/:id                  | owner, admin                      |
| DELETE | /scheduled/:id                  | owner, admin                      |
| GET    | /dashboards                     | owner, admin, manager, accountant |
| GET    | /dashboards/:id                 | owner, admin, manager, accountant |
| POST   | /dashboards                     | owner, admin, manager             |
| PATCH  | /dashboards/:id                 | owner, admin, manager             |
| DELETE | /dashboards/:id                 | owner, admin                      |
| POST   | /dashboards/:id/set-default     | owner, admin, manager             |
| POST   | /widgets                        | owner, admin, manager             |
| PATCH  | /widgets/:id                    | owner, admin, manager             |
| DELETE | /widgets/:id                    | owner, admin, manager             |
| POST   | /dashboards/:id/reorder-widgets | owner, admin, manager             |
| GET    | /filters                        | owner, admin, manager, accountant |
| POST   | /filters                        | owner, admin, manager, accountant |
| DELETE | /filters/:id                    | owner, admin, manager, accountant |
| GET    | /sales                          | owner, admin, manager, accountant |
| GET    | /inventory                      | owner, admin, manager, warehouse  |
| GET    | /machines                       | owner, admin, manager             |

## loyalty (9 endpoints)

| Method | Path            | Roles                 |
| ------ | --------------- | --------------------- |
| GET    | /balance        | all 7 roles           |
| GET    | /history        | all 7 roles           |
| GET    | /levels         | all 7 roles           |
| POST   | /spend          | all 7 roles           |
| GET    | /leaderboard    | all 7 roles           |
| POST   | /admin/adjust   | owner, admin          |
| GET    | /admin/stats    | owner, admin, manager |
| GET    | /admin/expiring | owner, admin, manager |
| GET    | /levels/info    | Public                |

## promo-codes (10 endpoints)

| Method | Path             | Roles                 |
| ------ | ---------------- | --------------------- |
| POST   | /                | admin, owner, manager |
| GET    | /                | admin, owner, manager |
| GET    | /:id             | admin, owner, manager |
| PUT    | /:id             | admin, owner, manager |
| POST   | /validate        | Public                |
| POST   | /redeem          | all 7 roles           |
| POST   | /:id/deactivate  | admin, owner          |
| GET    | /:id/stats       | admin, owner, manager |
| GET    | /:id/redemptions | admin, owner, manager |

## health (5 endpoints)

| Method | Path      | Access |
| ------ | --------- | ------ |
| GET    | /         | Public |
| GET    | /live     | Public |
| GET    | /ready    | Public |
| GET    | /detailed | Public |
| GET    | /version  | Public |

## audit (16 endpoints)

| Method | Path                                 | Roles                 |
| ------ | ------------------------------------ | --------------------- |
| GET    | /logs                                | owner, admin, manager |
| GET    | /logs/:id                            | owner, admin, manager |
| POST   | /logs                                | owner, admin          |
| GET    | /history/:entityType/:entityId       | owner, admin, manager |
| GET    | /statistics                          | owner, admin, manager |
| GET    | /snapshots/:entityType/:entityId     | owner, admin          |
| GET    | /snapshots/detail/:id                | owner, admin          |
| POST   | /snapshots                           | owner, admin          |
| GET    | /sessions/user/:userId               | owner, admin          |
| POST   | /sessions/:sessionId/end             | owner, admin          |
| POST   | /sessions/user/:userId/terminate-all | owner, admin          |
| POST   | /sessions/:sessionId/suspicious      | owner, admin          |
| GET    | /reports                             | owner, admin, manager |
| POST   | /reports/generate                    | owner, admin          |
| POST   | /cleanup/logs                        | owner                 |
| POST   | /cleanup/snapshots                   | owner                 |

## complaints (22 endpoints)

| Method | Path                         | Roles                           |
| ------ | ---------------------------- | ------------------------------- |
| POST   | /                            | owner, admin, manager           |
| POST   | /public                      | Public                          |
| GET    | /                            | owner, admin, manager, operator |
| GET    | /my                          | owner, admin, manager, operator |
| GET    | /statistics                  | owner, admin, manager           |
| GET    | /:id                         | owner, admin, manager, operator |
| GET    | /number/:number              | owner, admin, manager, operator |
| PATCH  | /:id                         | owner, admin, manager, operator |
| POST   | /:id/assign                  | owner, admin, manager           |
| POST   | /:id/resolve                 | owner, admin, manager, operator |
| POST   | /:id/escalate                | owner, admin, manager, operator |
| POST   | /:id/feedback                | Public                          |
| GET    | /:id/comments                | owner, admin, manager, operator |
| POST   | /:id/comments                | owner, admin, manager, operator |
| POST   | /:id/refunds                 | owner, admin, manager           |
| POST   | /refunds/:refundId/approve   | owner, admin                    |
| POST   | /refunds/:refundId/process   | owner, admin, accountant        |
| POST   | /refunds/:refundId/reject    | owner, admin                    |
| POST   | /qr-codes/generate           | owner, admin, manager           |
| GET    | /qr-codes/machine/:machineId | owner, admin, manager           |
| GET    | /qr-codes/:code              | Public                          |
| GET    | /templates                   | owner, admin, manager           |

## warehouses (14 endpoints)

| Method | Path                            | Roles                            |
| ------ | ------------------------------- | -------------------------------- |
| POST   | /                               | owner, admin, manager            |
| GET    | /                               | owner, admin, manager, warehouse |
| GET    | /:id                            | owner, admin, manager, warehouse |
| PATCH  | /:id                            | owner, admin, manager            |
| DELETE | /:id                            | owner, admin, manager            |
| GET    | /:id/stock                      | owner, admin, manager, warehouse |
| GET    | /:id/movements                  | owner, admin, manager, warehouse |
| POST   | /:id/movements                  | owner, admin, manager            |
| PATCH  | /movements/:movementId/complete | owner, admin, manager            |
| PATCH  | /movements/:movementId/cancel   | owner, admin, manager            |
| POST   | /:id/transfer                   | owner, admin, manager            |
| GET    | /:id/batches                    | owner, admin, manager, warehouse |
| POST   | /:id/batches                    | owner, admin, manager            |
| POST   | /:id/batches/deplete            | owner, admin, manager            |

## settings (11 endpoints)

| Method | Path              | Roles        |
| ------ | ----------------- | ------------ |
| GET    | /                 | owner, admin |
| GET    | /public           | Public       |
| GET    | /ai-providers     | owner, admin |
| GET    | /ai-providers/:id | owner, admin |
| GET    | /:key             | owner, admin |
| POST   | /                 | owner        |
| POST   | /ai-providers     | owner        |
| PATCH  | /ai-providers/:id | owner, admin |
| DELETE | /ai-providers/:id | owner        |
| PATCH  | /:key             | owner, admin |
| DELETE | /:key             | owner        |

---

## Summary

| Module        | Endpoints | Notes                                            |
| ------------- | --------- | ------------------------------------------------ |
| auth          | 13        | 5 public, 8 authenticated                        |
| users         | 5         | admin/owner only                                 |
| organizations | 5         | owner-centric                                    |
| employees     | 40        | HR + attendance + payroll + reviews              |
| machines      | 24        | CRUD + slots + components + errors + maintenance |
| products      | 16        | CRUD + recipes + batches + pricing               |
| suppliers     | 4         | basic CRUD                                       |
| inventory     | 14        | warehouse/machine stock + reservations           |
| orders        | 14        | customer orders + lifecycle                      |
| payments      | 11        | Payme/Click/Uzum + webhooks + refunds            |
| transactions  | 17        | vending transactions + collections + commissions |
| notifications | 22        | user + org + templates + campaigns + push        |
| favorites     | 16        | products/machines + bulk ops                     |
| client        | 12        | customer-facing + admin management               |
| locations     | 6         | geographic management                            |
| routes        | 12        | route planning + stops                           |
| tasks         | 25        | kanban + lifecycle + items + comments            |
| trips         | 22        | GPS tracking + analytics + reconciliation        |
| reports       | 26        | definitions + dashboards + widgets + filters     |
| loyalty       | 9         | points + levels + admin                          |
| promo-codes   | 10        | CRUD + validate + redeem                         |
| health        | 5         | all public                                       |
| audit         | 16        | logs + sessions + snapshots + reports            |
| complaints    | 22        | lifecycle + refunds + QR codes                   |
| warehouses    | 14        | stock + movements + batches                      |
| settings      | 11        | system + AI providers                            |
| **Total**     | **~566**  |                                                  |
