/**
 * Generate activity seed SQL file for Railway deployment.
 * Outputs SQL to stdout — pipe to psql or save to file.
 *
 * Usage: npx ts-node --project tsconfig.json src/database/seeds/generate-activity-sql.ts > /tmp/activity-seed.sql
 */

import { v4 as uuid } from "uuid";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function formatTimestamp(d: Date): string {
  return d.toISOString();
}

function randomPaymentMethod(): string {
  const r = Math.random();
  if (r < 0.4) return "payme";
  if (r < 0.65) return "click";
  if (r < 0.85) return "cash";
  return "uzum";
}

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

// ==========================================================================

function generate() {
  const lines: string[] = [];
  lines.push("-- VendHub OS Activity Seed Data");
  lines.push("-- Generated: " + new Date().toISOString());
  lines.push("BEGIN;");
  lines.push("");

  // Use dynamic references
  lines.push("DO $SEED$");
  lines.push("DECLARE");
  lines.push("  v_org_id UUID;");
  lines.push("  v_machines UUID[];");
  lines.push("  v_machine_names TEXT[];");
  lines.push("  v_products UUID[];");
  lines.push("  v_product_names TEXT[];");
  lines.push("  v_product_skus TEXT[];");
  lines.push("  v_product_prices NUMERIC[];");
  lines.push("  v_admin_id UUID;");
  lines.push("  v_operator_id UUID;");
  lines.push("  v_tx_count INT;");
  lines.push("BEGIN");
  lines.push("");

  // Check if already seeded
  lines.push(
    "  SELECT COUNT(*)::int INTO v_tx_count FROM transactions WHERE type = 'sale';",
  );
  lines.push("  IF v_tx_count > 10 THEN");
  lines.push(
    "    RAISE NOTICE 'Already have % transactions. Skipping seed.', v_tx_count;",
  );
  lines.push("    RETURN;");
  lines.push("  END IF;");
  lines.push("");

  // Load references
  lines.push(
    "  SELECT id INTO v_org_id FROM organizations WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1;",
  );
  lines.push("  IF v_org_id IS NULL THEN");
  lines.push(
    "    RAISE EXCEPTION 'No organization found. Run base seed first.';",
  );
  lines.push("  END IF;");
  lines.push("");

  lines.push(
    "  SELECT ARRAY_AGG(id), ARRAY_AGG(COALESCE(name, machine_number)) INTO v_machines, v_machine_names FROM machines WHERE organization_id = v_org_id AND deleted_at IS NULL;",
  );
  lines.push(
    "  SELECT ARRAY_AGG(id), ARRAY_AGG(name), ARRAY_AGG(COALESCE(sku, '')), ARRAY_AGG(COALESCE(selling_price, 10000)) INTO v_products, v_product_names, v_product_skus, v_product_prices FROM products WHERE organization_id = v_org_id AND deleted_at IS NULL;",
  );
  lines.push("");

  lines.push(
    "  SELECT id INTO v_admin_id FROM users WHERE organization_id = v_org_id AND role IN ('owner', 'admin') AND deleted_at IS NULL LIMIT 1;",
  );
  lines.push(
    "  SELECT id INTO v_operator_id FROM users WHERE organization_id = v_org_id AND role = 'operator' AND deleted_at IS NULL LIMIT 1;",
  );
  lines.push(
    "  IF v_operator_id IS NULL THEN v_operator_id := v_admin_id; END IF;",
  );
  lines.push("");

  lines.push(
    "  RAISE NOTICE 'Org: %, Machines: %, Products: %', v_org_id, array_length(v_machines, 1), array_length(v_products, 1);",
  );
  lines.push("");

  // ========================================================================
  // TRANSACTIONS
  // ========================================================================
  const DAYS = 90;
  let txCounter = 0;

  for (let day = DAYS; day >= 0; day--) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    const dateStr = formatDate(date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const dailySales = isWeekend ? randomInt(15, 35) : randomInt(30, 70);

    for (let s = 0; s < dailySales; s++) {
      const txId = uuid();
      const machineIdx = randomInt(1, 10); // 1-based PG array
      const productIdx = randomInt(1, 14);
      const qty = randomInt(1, 3);
      const paymentMethod = randomPaymentMethod();
      const hour = randomChoice([
        7, 8, 9, 10, 11, 11, 12, 12, 12, 13, 13, 14, 15, 16, 17, 17, 18, 18, 19,
        20, 21,
      ]);
      const txDate = new Date(date);
      txDate.setHours(hour, randomInt(0, 59), randomInt(0, 59));
      const txTs = formatTimestamp(txDate);
      const txNumber = `S-${txCounter.toString(36).toUpperCase().padStart(6, "0")}`;

      lines.push(`  INSERT INTO transactions (
    id, organization_id, machine_id, transaction_number,
    type, status, payment_method,
    amount, vat_amount, discount_amount, total_amount,
    currency, exchange_rate, transaction_date, sale_date,
    quantity, is_fiscalized, metadata, created_at, updated_at
  ) VALUES (
    '${txId}', v_org_id, v_machines[${Math.min(machineIdx, 4)}], '${txNumber}',
    'sale', 'completed', '${paymentMethod}',
    v_product_prices[${Math.min(productIdx, 14)}] * ${qty},
    ROUND(v_product_prices[${Math.min(productIdx, 14)}] * ${qty} * 0.12),
    0, v_product_prices[${Math.min(productIdx, 14)}] * ${qty},
    'UZS', 1, '${txTs}', '${dateStr}',
    ${qty}, false, '{}', '${txTs}', '${txTs}'
  );`);

      lines.push(`  INSERT INTO transaction_items (
    id, transaction_id, product_id, product_name, sku,
    quantity, unit_price, vat_rate, vat_amount, discount_amount, total_amount,
    metadata, created_at, updated_at
  ) VALUES (
    '${uuid()}', '${txId}', v_products[${Math.min(productIdx, 14)}], v_product_names[${Math.min(productIdx, 14)}], v_product_skus[${Math.min(productIdx, 14)}],
    ${qty}, v_product_prices[${Math.min(productIdx, 14)}], 12,
    ROUND(v_product_prices[${Math.min(productIdx, 14)}] * ${qty} * 0.12),
    0, v_product_prices[${Math.min(productIdx, 14)}] * ${qty},
    '{}', '${txTs}', '${txTs}'
  );`);

      txCounter++;
    }

    // Refunds (3%)
    const refundCount = Math.floor(dailySales * 0.03);
    for (let r = 0; r < refundCount; r++) {
      const refAmount = randomInt(5000, 20000);
      const refDate = new Date(date);
      refDate.setHours(randomInt(10, 18), randomInt(0, 59));
      const refTs = formatTimestamp(refDate);
      const refNumber = `R-${txCounter.toString(36).toUpperCase().padStart(6, "0")}`;

      lines.push(`  INSERT INTO transactions (
    id, organization_id, machine_id, transaction_number,
    type, status, payment_method,
    amount, vat_amount, discount_amount, total_amount,
    currency, exchange_rate, transaction_date, sale_date,
    quantity, is_fiscalized, metadata, created_at, updated_at
  ) VALUES (
    '${uuid()}', v_org_id, v_machines[${randomInt(1, 4)}], '${refNumber}',
    'refund', 'completed', 'payme',
    ${refAmount}, ${Math.round(refAmount * 0.12)}, 0, ${refAmount},
    'UZS', 1, '${refTs}', '${dateStr}',
    1, false, '{}', '${refTs}', '${refTs}'
  );`);
      txCounter++;
    }
  }

  lines.push(
    `  RAISE NOTICE 'Created ${txCounter} transactions over ${DAYS} days';`,
  );

  // ========================================================================
  // ORDERS (30 days)
  // ========================================================================
  let orderCounter = 0;
  for (let day = 30; day >= 0; day--) {
    const dailyOrders = randomInt(5, 15);
    for (let o = 0; o < dailyOrders; o++) {
      const orderId = uuid();
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - day);
      orderDate.setHours(randomInt(7, 22), randomInt(0, 59));
      const orderTs = formatTimestamp(orderDate);
      const machineIdx = randomInt(1, 4);
      const productIdx = randomInt(1, 14);
      const qty = randomInt(1, 3);
      const status = randomChoice([
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
      const orderNumber = `ORD-2026-${String(orderCounter + 1).padStart(5, "0")}`;

      lines.push(`  INSERT INTO orders (
    id, organization_id, order_number, user_id, machine_id,
    status, payment_status, payment_method,
    subtotal_amount, discount_amount, bonus_amount, total_amount,
    points_earned, points_used,
    confirmed_at, completed_at, paid_at,
    metadata, created_at, updated_at
  ) VALUES (
    '${orderId}', v_org_id, '${orderNumber}', v_admin_id, v_machines[${machineIdx}],
    '${status}', '${paymentStatus}', '${paymentMethod}',
    v_product_prices[${Math.min(productIdx, 14)}] * ${qty}, 0, 0, v_product_prices[${Math.min(productIdx, 14)}] * ${qty},
    FLOOR(v_product_prices[${Math.min(productIdx, 14)}] * ${qty} / 1000)::int, 0,
    '${orderTs}',
    ${status === "completed" ? `'${orderTs}'` : "NULL"},
    ${paymentStatus === "paid" ? `'${orderTs}'` : "NULL"},
    '{}', '${orderTs}', '${orderTs}'
  ) ON CONFLICT (order_number) DO NOTHING;`);

      lines.push(`  INSERT INTO order_items (
    id, order_id, product_id, product_name, product_sku,
    quantity, unit_price, total_price, created_at, updated_at
  ) VALUES (
    '${uuid()}', '${orderId}', v_products[${Math.min(productIdx, 14)}], v_product_names[${Math.min(productIdx, 14)}], v_product_skus[${Math.min(productIdx, 14)}],
    ${qty}, v_product_prices[${Math.min(productIdx, 14)}], v_product_prices[${Math.min(productIdx, 14)}] * ${qty},
    '${orderTs}', '${orderTs}'
  );`);

      orderCounter++;
    }
  }

  lines.push(`  RAISE NOTICE 'Created ${orderCounter} orders';`);

  // ========================================================================
  // TASKS (60 days)
  // ========================================================================
  const taskTypes = [
    "refill",
    "collection",
    "cleaning",
    "repair",
    "inspection",
  ];
  let taskCounter = 0;

  for (let day = 60; day >= 0; day--) {
    const dailyTasks = randomInt(2, 6);
    for (let t = 0; t < dailyTasks; t++) {
      const taskId = uuid();
      const taskDate = new Date();
      taskDate.setDate(taskDate.getDate() - day);
      taskDate.setHours(randomInt(8, 17), randomInt(0, 59));
      const taskTs = formatTimestamp(taskDate);
      const dueDate = new Date(taskDate);
      dueDate.setHours(dueDate.getHours() + randomInt(2, 8));
      const dueTs = formatTimestamp(dueDate);
      const typeCode = randomChoice(taskTypes);
      const status =
        day > 2
          ? "completed"
          : randomChoice(["completed", "in_progress", "assigned", "pending"]);
      const priority = randomChoice([
        "normal",
        "normal",
        "normal",
        "high",
        "urgent",
      ]);
      const taskNumber = `TSK-2026-${String(taskCounter + 1).padStart(6, "0")}`;
      const machineIdx = randomInt(1, 4);

      const completedTs =
        status === "completed"
          ? formatTimestamp(
              new Date(taskDate.getTime() + randomInt(30, 180) * 60000),
            )
          : null;

      const expectedCash =
        typeCode === "collection" ? randomInt(100000, 500000) : null;
      const actualCash =
        typeCode === "collection" && status === "completed"
          ? (expectedCash || 0) + randomInt(-5000, 5000)
          : null;

      const desc = esc(
        `${typeCode === "refill" ? "Пополнение товаров" : typeCode === "collection" ? "Инкассация" : typeCode === "cleaning" ? "Чистка" : typeCode === "repair" ? "Ремонт" : "Осмотр"}`,
      );

      lines.push(`  INSERT INTO tasks (
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
    '${taskId}', v_org_id, '${taskNumber}', '${typeCode}', '${status}', '${priority}',
    v_machines[${machineIdx}], v_operator_id, v_admin_id,
    '${taskTs}', '${dueTs}',
    ${status !== "pending" ? `'${taskTs}'` : "NULL"},
    ${completedTs ? `'${completedTs}'` : "NULL"},
    '${desc}', ${expectedCash ?? "NULL"}, ${actualCash ?? "NULL"},
    false, false, true, true, false, false,
    ${randomInt(30, 120)}, ${completedTs ? Math.round((new Date(completedTs).getTime() - taskDate.getTime()) / 60000) : "NULL"},
    '{}', '${taskTs}', '${taskTs}'
  ) ON CONFLICT DO NOTHING;`);

      taskCounter++;
    }
  }

  lines.push(`  RAISE NOTICE 'Created ${taskCounter} tasks';`);

  // ========================================================================
  // ALERT RULES + HISTORY
  // ========================================================================
  const alertRules = [
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

  for (const rule of alertRules) {
    const ruleId = uuid();
    lines.push(`  INSERT INTO alert_rules (
    id, organization_id, name, metric, condition, threshold_value,
    severity, is_active, cooldown_minutes, notification_channels, created_at, updated_at
  ) VALUES (
    '${ruleId}', v_org_id, '${esc(rule.name)}', '${rule.metric}', '${rule.condition}', ${rule.threshold},
    '${rule.severity}', true, 60, '{in_app,telegram}', NOW(), NOW()
  ) ON CONFLICT DO NOTHING;`);

    // 0-4 alert events per day for 30 days
    for (let day = 30; day >= 0; day--) {
      const dailyAlerts = randomInt(0, 2);
      for (let a = 0; a < dailyAlerts; a++) {
        const alertDate = new Date();
        alertDate.setDate(alertDate.getDate() - day);
        alertDate.setHours(randomInt(6, 22), randomInt(0, 59));
        const alertTs = formatTimestamp(alertDate);
        const status =
          day > 3
            ? randomChoice(["resolved", "acknowledged"])
            : randomChoice(["active", "acknowledged", "resolved"]);
        const machineIdx = randomInt(1, 4);
        const ackTs = formatTimestamp(
          new Date(alertDate.getTime() + randomInt(5, 60) * 60000),
        );
        const resolvedTs = formatTimestamp(
          new Date(alertDate.getTime() + randomInt(30, 240) * 60000),
        );

        lines.push(`  INSERT INTO alert_history (
    id, organization_id, rule_id, machine_id,
    metric, severity, status,
    message, current_value, threshold_value,
    triggered_at, acknowledged_at, resolved_at,
    metadata, created_at, updated_at
  ) VALUES (
    '${uuid()}', v_org_id, '${ruleId}', v_machines[${machineIdx}],
    '${rule.metric}', '${rule.severity}', '${status}',
    '${esc(rule.name)}', ${rule.threshold + randomInt(-2, 5)}, ${rule.threshold},
    '${alertTs}', ${status !== "active" ? `'${ackTs}'` : "NULL"}, ${status === "resolved" ? `'${resolvedTs}'` : "NULL"},
    '{}', '${alertTs}', '${alertTs}'
  ) ON CONFLICT DO NOTHING;`);
      }
    }
  }

  lines.push("  RAISE NOTICE 'Alert rules and history created';");

  // ========================================================================
  // COLLECTION RECORDS (every 3 days)
  // ========================================================================
  let collectionCount = 0;
  for (let day = 60; day >= 0; day -= 3) {
    for (let m = 1; m <= 4; m++) {
      const collDate = new Date();
      collDate.setDate(collDate.getDate() - day);
      collDate.setHours(randomInt(9, 16), randomInt(0, 59));
      const collTs = formatTimestamp(collDate);
      const cashAmount = randomInt(50000, 300000);
      const coinAmount = randomInt(5000, 30000);
      const totalAmount = cashAmount + coinAmount;
      const expectedTotal = totalAmount + randomInt(-3000, 3000);
      const diff = totalAmount - expectedTotal;
      const diffPct = Number(((diff / expectedTotal) * 100).toFixed(2));

      lines.push(`  INSERT INTO collection_records (
    id, organization_id, machine_id, collected_by_user_id,
    cash_amount, coin_amount, total_amount,
    expected_cash_amount, expected_coin_amount, expected_total_amount,
    difference, difference_percent, sales_count, is_verified,
    collected_at, metadata, created_at, updated_at
  ) VALUES (
    '${uuid()}', v_org_id, v_machines[${m}], v_operator_id,
    ${cashAmount}, ${coinAmount}, ${totalAmount},
    ${cashAmount + randomInt(-2000, 2000)}, ${coinAmount + randomInt(-1000, 1000)}, ${expectedTotal},
    ${diff}, ${diffPct}, ${randomInt(20, 80)}, true,
    '${collTs}', '{}', '${collTs}', '${collTs}'
  ) ON CONFLICT DO NOTHING;`);
      collectionCount++;
    }
  }

  lines.push(`  RAISE NOTICE 'Created ${collectionCount} collection records';`);

  // ========================================================================
  // DAILY SUMMARIES
  // ========================================================================
  lines.push("");
  lines.push("  -- Daily summaries (aggregate from transactions)");
  lines.push(`  INSERT INTO transaction_daily_summaries (
    id, organization_id, summary_date,
    sales_count, sales_amount, sales_vat_amount,
    cash_amount, card_amount, mobile_amount,
    refunds_count, refunds_amount,
    collections_count, collections_amount,
    expenses_amount, net_amount,
    top_products, hourly_stats,
    calculated_at, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), v_org_id, t.sale_date,
    COUNT(*)::int FILTER (WHERE t.type = 'sale'),
    COALESCE(SUM(t.total_amount) FILTER (WHERE t.type = 'sale'), 0),
    COALESCE(SUM(t.vat_amount) FILTER (WHERE t.type = 'sale'), 0),
    COALESCE(SUM(t.total_amount) FILTER (WHERE t.type = 'sale' AND t.payment_method = 'cash'), 0),
    COALESCE(SUM(t.total_amount) FILTER (WHERE t.type = 'sale' AND t.payment_method != 'cash'), 0),
    0,
    COUNT(*)::int FILTER (WHERE t.type = 'refund'),
    COALESCE(SUM(t.total_amount) FILTER (WHERE t.type = 'refund'), 0),
    0, 0, 0,
    COALESCE(SUM(t.total_amount) FILTER (WHERE t.type = 'sale'), 0) - COALESCE(SUM(t.total_amount) FILTER (WHERE t.type = 'refund'), 0),
    '[]', '[]',
    NOW(), NOW(), NOW()
  FROM transactions t
  WHERE t.organization_id = v_org_id AND t.sale_date IS NOT NULL
  GROUP BY t.sale_date
  ON CONFLICT DO NOTHING;`);

  lines.push(
    "  RAISE NOTICE 'Daily summaries created from aggregated transactions';",
  );

  // ========================================================================
  lines.push("");
  lines.push("  RAISE NOTICE '═══════════════════════════════════════════';");
  lines.push("  RAISE NOTICE 'Activity data seeding completed!';");
  lines.push(`  RAISE NOTICE '  Transactions: ~${txCounter}';`);
  lines.push(`  RAISE NOTICE '  Orders: ${orderCounter}';`);
  lines.push(`  RAISE NOTICE '  Tasks: ${taskCounter}';`);
  lines.push(`  RAISE NOTICE '  Collections: ${collectionCount}';`);
  lines.push("  RAISE NOTICE '═══════════════════════════════════════════';");
  lines.push("");
  lines.push("END;");
  lines.push("$SEED$;");
  lines.push("");
  lines.push("COMMIT;");

  return lines.join("\n");
}

// Output to stdout
process.stdout.write(generate());
