/**
 * Activity Data Seeder for VendHub OS
 *
 * Generates realistic transactional data to populate the dashboard:
 * - 90 days of transactions (sales, collections, refunds)
 * - Orders with items
 * - Tasks (refill, collection, cleaning, repair)
 * - Alert history
 * - Transaction daily summaries
 *
 * IDEMPOTENT: checks for existing data before inserting.
 * Run: npx ts-node --project tsconfig.json src/database/seeds/activity-data.seed.ts
 */

import { DataSource } from "typeorm";
import { v4 as uuid } from "uuid";

// ============================================================================
// TYPES
// ============================================================================

interface MachineRow {
  id: string;
  name: string;
  machine_number: string;
}

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  selling_price: string | number;
}

interface UserRow {
  id: string;
  role: string;
}

interface AlertRuleDef {
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  severity: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(randomInt(7, 22), randomInt(0, 59), randomInt(0, 59), 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function formatTimestamp(d: Date): string {
  return d.toISOString();
}

// Weighted random: Uzbekistan payment mix
function randomPaymentMethod(): string {
  const r = Math.random();
  if (r < 0.4) return "payme";
  if (r < 0.65) return "click";
  if (r < 0.85) return "cash";
  return "uzum";
}

// ============================================================================
// MAIN SEEDER
// ============================================================================

export async function seedActivityData(dataSource: DataSource) {
  console.log("[ActivitySeed] Starting activity data seed...");

  // Check if already seeded (look for transactions)
  const [{ count: txCount }] = await dataSource.query(
    `SELECT COUNT(*)::int AS count FROM transactions WHERE type = 'sale'`,
  );
  if (txCount > 10) {
    console.log(
      `[ActivitySeed] Already have ${txCount} sale transactions. Skipping.`,
    );
    return;
  }

  // ========================================================================
  // LOAD EXISTING REFERENCE DATA
  // ========================================================================
  const orgs = await dataSource.query(
    `SELECT id FROM organizations WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1`,
  );
  if (!orgs.length) {
    console.error(
      "[ActivitySeed] No organizations found. Run base seed first.",
    );
    return;
  }
  const orgId: string = orgs[0].id;

  const machines: MachineRow[] = await dataSource.query(
    `SELECT id, name, machine_number FROM machines WHERE organization_id = $1 AND deleted_at IS NULL`,
    [orgId],
  );
  if (!machines.length) {
    console.error("[ActivitySeed] No machines found. Run base seed first.");
    return;
  }

  const products: ProductRow[] = await dataSource.query(
    `SELECT id, name, sku, selling_price FROM products WHERE organization_id = $1 AND deleted_at IS NULL`,
    [orgId],
  );
  if (!products.length) {
    console.error("[ActivitySeed] No products found. Run base seed first.");
    return;
  }

  const users: UserRow[] = await dataSource.query(
    `SELECT id, role FROM users WHERE organization_id = $1 AND deleted_at IS NULL`,
    [orgId],
  );
  const adminUser = users.find((u) => u.role === "owner" || u.role === "admin");
  const operatorUser = users.find((u) => u.role === "operator");
  const adminId = adminUser?.id || users[0]?.id;
  const operatorId = operatorUser?.id || adminId;

  console.log(
    `[ActivitySeed] Org: ${orgId}, Machines: ${machines.length}, Products: ${products.length}`,
  );

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // ======================================================================
    // 1. TRANSACTIONS — 90 days of sales
    // ======================================================================
    console.log("[ActivitySeed] Seeding transactions...");

    const DAYS = 90;
    const dailySummaries: Map<
      string,
      {
        salesCount: number;
        salesAmount: number;
        cashAmount: number;
        cardAmount: number;
        refundsCount: number;
        refundsAmount: number;
      }
    > = new Map();

    let totalTx = 0;
    const allTransactionIds: string[] = [];

    for (let day = DAYS; day >= 0; day--) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      const dateStr = formatDate(date);

      // Weekend gets fewer sales
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const dailySales = isWeekend ? randomInt(15, 35) : randomInt(30, 70);

      const summary = {
        salesCount: 0,
        salesAmount: 0,
        cashAmount: 0,
        cardAmount: 0,
        refundsCount: 0,
        refundsAmount: 0,
      };

      for (let s = 0; s < dailySales; s++) {
        const txId = uuid();
        allTransactionIds.push(txId);
        const machine = randomChoice(machines);
        const product = randomChoice(products);
        const qty = randomInt(1, 3);
        const price = Number(product.selling_price) || randomInt(5000, 20000);
        const amount = price * qty;
        const vatAmount = Math.round(amount * 0.12);
        const totalAmount = amount;
        const paymentMethod = randomPaymentMethod();

        // Time: busier 11-14 and 17-19
        const hour = randomChoice([
          7, 8, 9, 10, 11, 11, 12, 12, 12, 13, 13, 14, 15, 16, 17, 17, 18, 18,
          19, 20, 21,
        ]);
        const txDate = new Date(date);
        txDate.setHours(hour, randomInt(0, 59), randomInt(0, 59));

        const txNumber = `S-${Date.now().toString(36).toUpperCase()}${totalTx.toString(36).toUpperCase()}`;

        await queryRunner.query(
          `INSERT INTO transactions (
            id, organization_id, machine_id, transaction_number,
            type, status, payment_method,
            amount, vat_amount, discount_amount, total_amount,
            currency, exchange_rate, transaction_date, sale_date,
            quantity, is_fiscalized, metadata,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4,
            'sale', 'completed', $5,
            $6, $7, 0, $8,
            'UZS', 1, $9, $10,
            $11, false, '{}',
            $9, $9
          )`,
          [
            txId,
            orgId,
            machine.id,
            txNumber,
            paymentMethod,
            amount,
            vatAmount,
            totalAmount,
            formatTimestamp(txDate),
            dateStr,
            qty,
          ],
        );

        // Transaction item
        await queryRunner.query(
          `INSERT INTO transaction_items (
            id, transaction_id, product_id, product_name, sku,
            quantity, unit_price, vat_rate, vat_amount, discount_amount, total_amount,
            metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 12, $8, 0, $9, '{}', $10, $10)`,
          [
            uuid(),
            txId,
            product.id,
            product.name,
            product.sku,
            qty,
            price,
            vatAmount,
            totalAmount,
            formatTimestamp(txDate),
          ],
        );

        summary.salesCount++;
        summary.salesAmount += totalAmount;
        if (paymentMethod === "cash") {
          summary.cashAmount += totalAmount;
        } else {
          summary.cardAmount += totalAmount;
        }
        totalTx++;
      }

      // 2-5% refunds per day
      const refundCount = Math.floor(dailySales * 0.03);
      for (let r = 0; r < refundCount; r++) {
        const refAmount = randomInt(5000, 20000);
        const refDate = new Date(date);
        refDate.setHours(randomInt(10, 18), randomInt(0, 59));

        await queryRunner.query(
          `INSERT INTO transactions (
            id, organization_id, machine_id, transaction_number,
            type, status, payment_method,
            amount, vat_amount, discount_amount, total_amount,
            currency, exchange_rate, transaction_date, sale_date,
            quantity, is_fiscalized, metadata,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4,
            'refund', 'completed', 'payme',
            $5, $6, 0, $5,
            'UZS', 1, $7, $8,
            1, false, '{}',
            $7, $7
          )`,
          [
            uuid(),
            orgId,
            randomChoice(machines).id,
            `R-${Date.now().toString(36).toUpperCase()}${totalTx.toString(36).toUpperCase()}`,
            refAmount,
            Math.round(refAmount * 0.12),
            formatTimestamp(refDate),
            dateStr,
          ],
        );
        summary.refundsCount++;
        summary.refundsAmount += refAmount;
        totalTx++;
      }

      dailySummaries.set(dateStr, summary);
    }

    console.log(
      `[ActivitySeed] Created ${totalTx} transactions over ${DAYS} days`,
    );

    // ======================================================================
    // 2. DAILY SUMMARIES
    // ======================================================================
    console.log("[ActivitySeed] Seeding daily summaries...");

    for (const [dateStr, s] of dailySummaries) {
      await queryRunner.query(
        `INSERT INTO transaction_daily_summaries (
          id, organization_id, summary_date,
          sales_count, sales_amount, sales_vat_amount,
          cash_amount, card_amount, mobile_amount,
          refunds_count, refunds_amount,
          collections_count, collections_amount,
          expenses_amount, net_amount,
          top_products, hourly_stats,
          calculated_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3,
          $4, $5, $6,
          $7, $8, 0,
          $9, $10,
          0, 0,
          0, $11,
          '[]', '[]',
          NOW(), NOW(), NOW()
        )
        ON CONFLICT DO NOTHING`,
        [
          uuid(),
          orgId,
          dateStr,
          s.salesCount,
          s.salesAmount,
          Math.round(s.salesAmount * 0.12),
          s.cashAmount,
          s.cardAmount,
          s.refundsCount,
          s.refundsAmount,
          s.salesAmount - s.refundsAmount,
        ],
      );
    }

    console.log(
      `[ActivitySeed] Created ${dailySummaries.size} daily summaries`,
    );

    // ======================================================================
    // 3. ORDERS — recent 30 days
    // ======================================================================
    console.log("[ActivitySeed] Seeding orders...");

    let orderCount = 0;
    for (let day = 30; day >= 0; day--) {
      const dailyOrders = randomInt(5, 15);
      for (let o = 0; o < dailyOrders; o++) {
        const orderId = uuid();
        const orderDate = randomDate(day);
        const machine = randomChoice(machines);
        const product = randomChoice(products);
        const qty = randomInt(1, 3);
        const price = Number(product.selling_price) || randomInt(5000, 20000);
        const total = price * qty;
        const status = randomChoice([
          "completed",
          "completed",
          "completed",
          "completed",
          "completed",
          "cancelled",
          "pending",
        ]);
        const paymentStatus =
          status === "completed"
            ? "paid"
            : status === "cancelled"
              ? "failed"
              : "pending";
        const paymentMethod = randomPaymentMethod();
        const orderNumber = `ORD-2026-${String(orderCount + 1).padStart(5, "0")}`;

        await queryRunner.query(
          `INSERT INTO orders (
            id, organization_id, order_number, user_id, machine_id,
            status, payment_status, payment_method,
            subtotal_amount, discount_amount, bonus_amount, total_amount,
            points_earned, points_used,
            confirmed_at, completed_at, paid_at,
            metadata, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8,
            $9, 0, 0, $9,
            $10, 0,
            $11, $12, $13,
            '{}', $11, $11
          )
          ON CONFLICT (order_number) DO NOTHING`,
          [
            orderId,
            orgId,
            orderNumber,
            adminId,
            machine.id,
            status,
            paymentStatus,
            paymentMethod,
            total,
            Math.floor(total / 1000), // 1 point per 1000 UZS
            formatTimestamp(orderDate),
            status === "completed" ? formatTimestamp(orderDate) : null,
            paymentStatus === "paid" ? formatTimestamp(orderDate) : null,
          ],
        );

        // Order item
        await queryRunner.query(
          `INSERT INTO order_items (
            id, order_id, product_id, product_name, product_sku,
            quantity, unit_price, total_price,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
          ON CONFLICT DO NOTHING`,
          [
            uuid(),
            orderId,
            product.id,
            product.name,
            product.sku,
            qty,
            price,
            total,
            formatTimestamp(orderDate),
          ],
        );

        orderCount++;
      }
    }

    console.log(`[ActivitySeed] Created ${orderCount} orders`);

    // ======================================================================
    // 4. TASKS — realistic operator tasks
    // ======================================================================
    console.log("[ActivitySeed] Seeding tasks...");

    const taskTypes = [
      "refill",
      "collection",
      "cleaning",
      "repair",
      "inspection",
    ];
    const taskStatuses = [
      "completed",
      "completed",
      "completed",
      "in_progress",
      "assigned",
      "pending",
    ];
    const taskPriorities = ["normal", "normal", "normal", "high", "urgent"];

    let taskCount = 0;
    for (let day = 60; day >= 0; day--) {
      const dailyTasks = randomInt(2, 6);
      for (let t = 0; t < dailyTasks; t++) {
        const taskId = uuid();
        const taskDate = randomDate(day);
        const dueDate = new Date(taskDate);
        dueDate.setHours(dueDate.getHours() + randomInt(2, 8));
        const machine = randomChoice(machines);
        const typeCode = randomChoice(taskTypes);
        const status = day > 2 ? "completed" : randomChoice(taskStatuses);
        const priority = randomChoice(taskPriorities);
        const taskNumber = `TSK-2026-${String(taskCount + 1).padStart(6, "0")}`;

        const completedAt =
          status === "completed"
            ? new Date(taskDate.getTime() + randomInt(30, 180) * 60000)
            : null;

        const expectedCash =
          typeCode === "collection" ? randomInt(100000, 500000) : null;
        const actualCash =
          typeCode === "collection" && status === "completed"
            ? (expectedCash || 0) + randomInt(-5000, 5000)
            : null;

        await queryRunner.query(
          `INSERT INTO tasks (
            id, organization_id, task_number, type_code, status, priority,
            machine_id, assigned_to_user_id, created_by_user_id,
            scheduled_date, due_date, started_at, completed_at,
            description, expected_cash_amount, actual_cash_amount,
            has_photo_before, has_photo_after,
            requires_photo_before, requires_photo_after,
            pending_photos, offline_completed,
            estimated_duration, actual_duration,
            metadata, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9,
            $10, $11, $12, $13,
            $14, $15, $16,
            false, false,
            true, true,
            false, false,
            $17, $18,
            '{}', $10, $10
          )
          ON CONFLICT DO NOTHING`,
          [
            taskId,
            orgId,
            taskNumber,
            typeCode,
            status,
            priority,
            machine.id,
            operatorId,
            adminId,
            formatTimestamp(taskDate),
            formatTimestamp(dueDate),
            status !== "pending" ? formatTimestamp(taskDate) : null,
            completedAt ? formatTimestamp(completedAt) : null,
            `${typeCode === "refill" ? "Пополнение товаров в" : typeCode === "collection" ? "Инкассация из" : typeCode === "cleaning" ? "Чистка" : typeCode === "repair" ? "Ремонт" : "Осмотр"} ${machine.name || machine.machine_number}`,
            expectedCash,
            actualCash,
            randomInt(30, 120),
            completedAt
              ? Math.round((completedAt.getTime() - taskDate.getTime()) / 60000)
              : null,
          ],
        );

        taskCount++;
      }
    }

    console.log(`[ActivitySeed] Created ${taskCount} tasks`);

    // ======================================================================
    // 5. ALERT HISTORY — recent events
    // ======================================================================
    console.log("[ActivitySeed] Seeding alert history...");

    // First create some alert rules
    const alertRules: AlertRuleDef[] = [
      {
        name: "Температура выше нормы",
        metric: "temperature",
        condition: "greater_than",
        threshold: 8,
        severity: "warning",
      },
      {
        name: "Автомат оффлайн >30мин",
        metric: "offline_duration",
        condition: "greater_than",
        threshold: 30,
        severity: "critical",
      },
      {
        name: "Низкий запас товара",
        metric: "stock_level",
        condition: "less_than",
        threshold: 5,
        severity: "warning",
      },
      {
        name: "Касса заполнена",
        metric: "cash_level",
        condition: "greater_than",
        threshold: 500000,
        severity: "info",
      },
      {
        name: "Падение продаж >50%",
        metric: "sales_drop",
        condition: "greater_than",
        threshold: 50,
        severity: "critical",
      },
    ];

    const ruleIds: string[] = [];
    for (const rule of alertRules) {
      const ruleId = uuid();
      ruleIds.push(ruleId);
      await queryRunner.query(
        `INSERT INTO alert_rules (
          id, organization_id, name, metric, condition, threshold_value,
          severity, is_active, cooldown_minutes, notification_channels,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, 60, '{in_app,telegram}', NOW(), NOW())
        ON CONFLICT DO NOTHING`,
        [
          ruleId,
          orgId,
          rule.name,
          rule.metric,
          rule.condition,
          rule.threshold,
          rule.severity,
        ],
      );
    }

    // Alert history
    let alertCount = 0;
    for (let day = 30; day >= 0; day--) {
      const dailyAlerts = randomInt(0, 4);
      for (let a = 0; a < dailyAlerts; a++) {
        const alertDate = randomDate(day);
        const rule = randomChoice(alertRules);
        const ruleId = ruleIds[alertRules.indexOf(rule)];
        const machine = randomChoice(machines);
        const status =
          day > 3
            ? randomChoice(["resolved", "resolved", "acknowledged"])
            : randomChoice(["active", "acknowledged", "resolved"]);

        await queryRunner.query(
          `INSERT INTO alert_history (
            id, organization_id, rule_id, machine_id,
            metric, severity, status,
            message, current_value, threshold_value,
            triggered_at, acknowledged_at, resolved_at,
            metadata, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7,
            $8, $9, $10,
            $11, $12, $13,
            '{}', $11, $11
          )
          ON CONFLICT DO NOTHING`,
          [
            uuid(),
            orgId,
            ruleId,
            machine.id,
            rule.metric,
            rule.severity,
            status,
            `${rule.name}: ${machine.name || machine.machine_number}`,
            rule.threshold + randomInt(-2, 5),
            rule.threshold,
            formatTimestamp(alertDate),
            status !== "active"
              ? formatTimestamp(
                  new Date(alertDate.getTime() + randomInt(5, 60) * 60000),
                )
              : null,
            status === "resolved"
              ? formatTimestamp(
                  new Date(alertDate.getTime() + randomInt(30, 240) * 60000),
                )
              : null,
          ],
        );
        alertCount++;
      }
    }

    console.log(`[ActivitySeed] Created ${alertCount} alert events`);

    // ======================================================================
    // 6. COLLECTION RECORDS
    // ======================================================================
    console.log("[ActivitySeed] Seeding collection records...");

    let collectionCount = 0;
    for (let day = 60; day >= 0; day += 3) {
      // Every 3 days
      for (const machine of machines.slice(0, 4)) {
        const collDate = randomDate(day);
        const cashAmount = randomInt(50000, 300000);
        const coinAmount = randomInt(5000, 30000);
        const totalAmount = cashAmount + coinAmount;
        const expectedTotal = totalAmount + randomInt(-3000, 3000);

        await queryRunner.query(
          `INSERT INTO collection_records (
            id, organization_id, machine_id, collected_by_user_id,
            cash_amount, coin_amount, total_amount,
            expected_cash_amount, expected_coin_amount, expected_total_amount,
            difference, difference_percent,
            sales_count, is_verified,
            collected_at, metadata,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7,
            $8, $9, $10,
            $11, $12,
            $13, true,
            $14, '{}',
            $14, $14
          )
          ON CONFLICT DO NOTHING`,
          [
            uuid(),
            orgId,
            machine.id,
            operatorId,
            cashAmount,
            coinAmount,
            totalAmount,
            cashAmount + randomInt(-2000, 2000),
            coinAmount + randomInt(-1000, 1000),
            expectedTotal,
            totalAmount - expectedTotal,
            Number(
              (((totalAmount - expectedTotal) / expectedTotal) * 100).toFixed(
                2,
              ),
            ),
            randomInt(20, 80),
            formatTimestamp(collDate),
          ],
        );
        collectionCount++;
      }
    }

    console.log(`[ActivitySeed] Created ${collectionCount} collection records`);

    // ======================================================================
    // COMMIT
    // ======================================================================
    await queryRunner.commitTransaction();

    console.log("[ActivitySeed] ═══════════════════════════════════════════");
    console.log("[ActivitySeed] Activity data seeding completed!");
    console.log(`[ActivitySeed]   Transactions: ${totalTx}`);
    console.log(`[ActivitySeed]   Daily summaries: ${dailySummaries.size}`);
    console.log(`[ActivitySeed]   Orders: ${orderCount}`);
    console.log(`[ActivitySeed]   Tasks: ${taskCount}`);
    console.log(`[ActivitySeed]   Alert events: ${alertCount}`);
    console.log(`[ActivitySeed]   Collections: ${collectionCount}`);
    console.log("[ActivitySeed] ═══════════════════════════════════════════");
  } catch (error: unknown) {
    await queryRunner.rollbackTransaction();
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[ActivitySeed] Error: ${message}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// ============================================================================
// CLI RUNNER
// ============================================================================

if (require.main === module) {
  const path = require("path");

  const dotenv = require("dotenv");

  dotenv.config({ path: path.join(__dirname, "../../../.env") });

  const { dataSourceOptions } = require("../typeorm.config");
  const ds = new DataSource(dataSourceOptions);

  ds.initialize()
    .then(() => seedActivityData(ds))
    .then(() => ds.destroy())
    .then(() => process.exit(0))
    .catch((err: Error) => {
      console.error("[ActivitySeed] Fatal:", err.message);
      process.exit(1);
    });
}
