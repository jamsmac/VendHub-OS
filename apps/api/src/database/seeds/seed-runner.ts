/**
 * Generic Seed Runner for VendHub OS
 *
 * runSeed(dataSource, config, organizationId) — idempotent, skip-if-exists
 * for every entity. Safe to re-run multiple times.
 *
 * Entity insertion order:
 *   1. Suppliers
 *   2. Categories
 *   3. Products  (references suppliers + categories)
 *   4. Locations (handles parent-child refs within the config)
 *   5. Machines  (references locations)
 */

import { DataSource } from "typeorm";
import { v4 as uuid } from "uuid";
import type { SeedConfig } from "./olma-example.seed";

// ============================================================================
// TYPES
// ============================================================================

interface InsertResult {
  created: number;
  skipped: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function log(msg: string): void {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[seed ${ts}] ${msg}`);
}

function summaryLine(entity: string, result: InsertResult): void {
  log(`${entity}: ${result.created} created, ${result.skipped} skipped`);
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

export async function runSeed(
  dataSource: DataSource,
  config: SeedConfig,
  organizationId: string,
): Promise<void> {
  log("Starting seed...");
  log(`Organization ID: ${organizationId}`);

  const runner = dataSource.createQueryRunner();
  await runner.connect();

  try {
    // ========================================================================
    // 1. SUPPLIERS
    // ========================================================================
    log("Seeding suppliers...");
    const supplierIdByCode = new Map<string, string>();
    const supplierResult: InsertResult = { created: 0, skipped: 0 };

    for (const sup of config.suppliers) {
      // Check if already exists (unique index: code where deleted_at IS NULL)
      const existing = await runner.query<{ id: string }[]>(
        `SELECT id FROM suppliers WHERE code = $1 AND deleted_at IS NULL LIMIT 1`,
        [sup.code],
      );

      if (existing.length > 0) {
        supplierIdByCode.set(sup.code, existing[0]!.id);
        supplierResult.skipped++;
        continue;
      }

      const id = uuid();
      const params: unknown[] = [
        id,
        organizationId,
        sup.code,
        sup.name,
        sup.phone ?? null,
        sup.defaultPayment ?? null,
      ];
      await runner.query(
        `INSERT INTO suppliers
           (id, organization_id, code, name, phone, default_payment,
            is_active, priority, payment_term_days, metadata,
            created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6,
                 true, 0, 0, '{}',
                 NOW(), NOW())`,
        params,
      );
      supplierIdByCode.set(sup.code, id);
      supplierResult.created++;
    }

    summaryLine("Suppliers", supplierResult);

    // ========================================================================
    // 2. CATEGORIES
    // ========================================================================
    log("Seeding categories...");
    const categoryIdByCode = new Map<string, string>();
    const catResult: InsertResult = { created: 0, skipped: 0 };

    for (const cat of config.categories) {
      // Unique index: (organization_id, code) where deleted_at IS NULL
      const existing = await runner.query<{ id: string }[]>(
        `SELECT id FROM categories
          WHERE organization_id = $1 AND code = $2 AND deleted_at IS NULL
          LIMIT 1`,
        [organizationId, cat.code],
      );

      if (existing.length > 0) {
        categoryIdByCode.set(cat.code, existing[0]!.id);
        catResult.skipped++;
        continue;
      }

      const id = uuid();
      await runner.query(
        `INSERT INTO categories
           (id, organization_id, code, name, icon, color,
            sort_order, default_markup, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          id,
          organizationId,
          cat.code,
          cat.name,
          cat.icon ?? null,
          cat.color ?? null,
          cat.sortOrder ?? 0,
          cat.defaultMarkup ?? null,
        ],
      );
      categoryIdByCode.set(cat.code, id);
      catResult.created++;
    }

    summaryLine("Categories", catResult);

    // ========================================================================
    // 3. PRODUCTS
    // ========================================================================
    log("Seeding products...");
    const productResult: InsertResult = { created: 0, skipped: 0 };

    for (const prod of config.products) {
      // Unique index: sku where deleted_at IS NULL
      const existing = await runner.query<{ id: string }[]>(
        `SELECT id FROM products WHERE sku = $1 AND deleted_at IS NULL LIMIT 1`,
        [prod.sku],
      );

      if (existing.length > 0) {
        productResult.skipped++;
        continue;
      }

      const supplierId = supplierIdByCode.get(prod.defaultSupplierCode);
      if (!supplierId) {
        log(
          `  WARN: supplier code "${prod.defaultSupplierCode}" not found for product "${prod.sku}" — skipping`,
        );
        productResult.skipped++;
        continue;
      }

      const categoryId = categoryIdByCode.get(prod.categoryCode) ?? null;

      const id = uuid();
      // Use "other" as the legacy enum fallback since these products use
      // the first-class category FK (category_id) introduced in Sprint G5.
      await runner.query(
        `INSERT INTO products
           (id, organization_id, sku, name, category, is_active,
            purchase_price, selling_price, currency,
            expected_sales_per_day, default_slot_capacity,
            category_id, default_supplier_id,
            barcode,
            vat_rate, is_ingredient, metadata, images, allergens,
            tags, compatible_machine_types, price_modifiers,
            created_at, updated_at)
         VALUES ($1,  $2,  $3,  $4,  'other', true,
                 $5,  $6,  'UZS',
                 $7,  $8,
                 $9,  $10,
                 $11,
                 12,  false, '{}', '[]', '[]',
                 '[]', '[]', '[]',
                 NOW(), NOW())`,
        [
          id,
          organizationId,
          prod.sku,
          prod.vol ? `${prod.name} ${prod.vol}` : prod.name,
          prod.purchasePrice,
          prod.sellingPrice,
          prod.expectedSalesPerDay ?? null,
          prod.defaultSlotCapacity ?? 8,
          categoryId,
          supplierId,
          prod.barcode ?? null,
        ],
      );
      productResult.created++;
    }

    summaryLine("Products", productResult);

    // ========================================================================
    // 4. LOCATIONS  (two-pass for parent refs)
    // ========================================================================
    log("Seeding locations...");
    const locationIdByCode = new Map<string, string>();
    const locResult: InsertResult = { created: 0, skipped: 0 };

    // Pass 1: locations without a parent
    const withoutParent = config.locations.filter((l) => !l.parentCode);
    const withParent = config.locations.filter((l) => !!l.parentCode);

    for (const loc of [...withoutParent, ...withParent]) {
      const existing = await runner.query<{ id: string }[]>(
        `SELECT id FROM locations WHERE code = $1 AND deleted_at IS NULL LIMIT 1`,
        [loc.code],
      );

      if (existing.length > 0) {
        locationIdByCode.set(loc.code, existing[0]!.id);
        locResult.skipped++;
        continue;
      }

      const parentId = loc.parentCode
        ? (locationIdByCode.get(loc.parentCode) ?? null)
        : null;

      const id = uuid();
      const addressJson = JSON.stringify({
        fullAddress: loc.name,
        city: "Tashkent",
        country: "Uzbekistan",
      });

      await runner.query(
        `INSERT INTO locations
           (id, organization_id, code, name, type, status,
            slug, public_enabled, parent_location_id,
            city, latitude, longitude, address,
            is_active, is_vip, requires_approval, has_exclusivity,
            monthly_rent, revenue_share_percent, currency,
            machine_count, total_revenue, total_transactions,
            priority_score, contacts, holidays, characteristics,
            stats, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active',
                 $6, $7, $8,
                 'Tashkent', 41.2995, 69.2401, $9::jsonb,
                 true, false, false, false,
                 0, 0, 'UZS',
                 0, 0, 0,
                 5, '[]', '[]', '{}',
                 '{}', '{}', NOW(), NOW())`,
        [
          id,
          organizationId,
          loc.code,
          loc.name,
          loc.type,
          loc.slug ?? null,
          loc.publicEnabled ?? false,
          parentId,
          addressJson,
        ],
      );

      locationIdByCode.set(loc.code, id);
      locResult.created++;
    }

    summaryLine("Locations", locResult);

    // ========================================================================
    // 5. MACHINES
    // ========================================================================
    log("Seeding machines...");
    const machineResult: InsertResult = { created: 0, skipped: 0 };

    for (const mac of config.machines) {
      // Unique index: machine_number where deleted_at IS NULL
      const existing = await runner.query<{ id: string }[]>(
        `SELECT id FROM machines
          WHERE machine_number = $1 AND deleted_at IS NULL LIMIT 1`,
        [mac.code],
      );

      if (existing.length > 0) {
        machineResult.skipped++;
        continue;
      }

      const locationId = locationIdByCode.get(mac.locationCode);
      if (!locationId) {
        log(
          `  WARN: location code "${mac.locationCode}" not found for machine "${mac.code}" — skipping`,
        );
        machineResult.skipped++;
        continue;
      }

      const id = uuid();
      const settingsJson = JSON.stringify({
        notifications: {
          lowStock: true,
          errors: true,
          offline: true,
          temperature: false,
          cashFull: false,
        },
      });

      await runner.query(
        `INSERT INTO machines
           (id, organization_id, machine_number, name, type, status,
            content_model, connection_status, location_id,
            grid_rows, grid_cols,
            max_product_slots, current_product_count,
            low_stock_threshold_percent,
            cash_capacity, current_cash_amount,
            accepts_cash, accepts_card, accepts_qr, accepts_nfc,
            total_sales_count, total_revenue,
            accumulated_depreciation,
            is_disposed, has_trash_bin, has_camera,
            depreciation_method,
            settings, telemetry, metadata,
            created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active',
                 'slots', 'unknown', $6,
                 $7, $8,
                 0, 0,
                 10,
                 0, 0,
                 true, false, false, false,
                 0, 0,
                 0,
                 false, false, false,
                 'linear',
                 $9::jsonb, '{}', '{}',
                 NOW(), NOW())`,
        [
          id,
          organizationId,
          mac.code,
          mac.name,
          mac.type,
          locationId,
          mac.gridRows ?? null,
          mac.gridCols ?? null,
          settingsJson,
        ],
      );

      machineResult.created++;
    }

    summaryLine("Machines", machineResult);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    log("═══════════════════════════════════════════════════════");
    log("Seed complete!");
    log(`  Org ID : ${organizationId}`);
    log(
      `  Suppliers : ${supplierResult.created} created / ${supplierResult.skipped} skipped`,
    );
    log(
      `  Categories: ${catResult.created} created / ${catResult.skipped} skipped`,
    );
    log(
      `  Products  : ${productResult.created} created / ${productResult.skipped} skipped`,
    );
    log(
      `  Locations : ${locResult.created} created / ${locResult.skipped} skipped`,
    );
    log(
      `  Machines  : ${machineResult.created} created / ${machineResult.skipped} skipped`,
    );
    log("═══════════════════════════════════════════════════════");
  } finally {
    await runner.release();
  }
}
