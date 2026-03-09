/**
 * Database Seeder Runner for VendHub OS
 * Seeds initial data for development/testing
 *
 * Run: npm run db:seed
 */

import { DataSource } from "typeorm";
import { Logger } from "@nestjs/common";
import { dataSourceOptions } from "../typeorm.config";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { seedReferences } from "./references.seed";

const logger = new Logger("Seed");

async function runSeed() {
  logger.log("Starting database seeding...");

  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    logger.log("Database connection established");

    // ========================================================================
    // 0. SEED REFERENCE DATA
    // ========================================================================
    logger.log(
      "Seeding reference data (VAT rates, package types, payment providers, MXIK codes, IKPU codes)...",
    );
    await seedReferences(dataSource);
    logger.log("Reference data seeded");

    // ========================================================================
    // 1. SEED ORGANIZATIONS
    // ========================================================================
    logger.log("Seeding organizations...");

    const orgId = uuidv4();
    const demoOrgId = uuidv4();

    await dataSource.query(
      `
      INSERT INTO organizations (id, name, slug, type, status, subscription_tier, inn, phone, email, is_active,
        settings, limits, created_at, updated_at)
      VALUES
        ($1, 'VendHub Demo', 'vendhub-demo', 'headquarters', 'active', 'enterprise', '123456789', '+998901234567', 'admin@vendhub.uz', true,
         $3::jsonb, $4::jsonb, NOW(), NOW()),
        ($2, 'Демо Оператор', 'demo-operator', 'operator', 'active', 'professional', '987654321', '+998909876543', 'operator@demo.uz', true,
         $3::jsonb, $5::jsonb, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `,
      [
        orgId,
        demoOrgId,
        JSON.stringify({
          language: "ru",
          timezone: "Asia/Tashkent",
          currency: "UZS",
          defaultVatRate: 12,
          dateFormat: "DD.MM.YYYY",
          timeFormat: "HH:mm",
          notifications: {
            email: true,
            telegram: true,
            sms: false,
            lowStock: true,
            machineOffline: true,
            taskOverdue: true,
            dailyReport: true,
          },
        }),
        JSON.stringify({
          maxMachines: 0,
          maxUsers: 0,
          maxProducts: 0,
          maxLocations: 0,
          maxTransactionsPerMonth: 0,
          maxStorageMb: 0,
          features: ["telegram_bot", "reports", "api_access", "multi_location"],
        }),
        JSON.stringify({
          maxMachines: 50,
          maxUsers: 10,
          maxProducts: 1000,
          maxLocations: 50,
          maxTransactionsPerMonth: 100000,
          maxStorageMb: 2000,
          features: ["telegram_bot", "reports"],
        }),
      ],
    );

    logger.log("Organizations seeded");

    // ========================================================================
    // 2. SEED USERS
    // ========================================================================
    logger.log("Seeding users...");

    const seedPassword = process.env.SEED_PASSWORD || "Demo123!";
    if (process.env.NODE_ENV === "production") {
      logger.warn(
        "Running seed in production — ensure SEED_PASSWORD env var is set to a strong password",
      );
    }
    const passwordHash = await bcrypt.hash(seedPassword, 12);
    const adminId = uuidv4();
    const managerId = uuidv4();
    const operatorId = uuidv4();

    await dataSource.query(
      `
      INSERT INTO users (id, email, phone, password, first_name, last_name, role, status, organization_id, created_at, updated_at)
      VALUES
        -- Super Admin
        ($1, 'admin@vendhub.uz', '+998901234567', $4, 'Администратор', 'VendHub', 'owner', 'active', $5, NOW(), NOW()),
        -- Manager
        ($2, 'manager@demo.uz', '+998901234568', $4, 'Менеджер', 'Демо', 'manager', 'active', $5, NOW(), NOW()),
        -- Operator
        ($3, 'operator@demo.uz', '+998901234569', $4, 'Оператор', 'Полевой', 'operator', 'active', $5, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `,
      [adminId, managerId, operatorId, passwordHash, orgId],
    );

    logger.log("Users seeded");

    // ========================================================================
    // 3. SEED LOCATIONS
    // ========================================================================
    logger.log("Seeding locations...");

    const locations = [
      {
        id: uuidv4(),
        name: "ТРЦ Samarkand Darvoza",
        code: "LOC-TAS-001",
        type: "shopping_center",
        city: "Tashkent",
        latitude: 41.311081,
        longitude: 69.279737,
      },
      {
        id: uuidv4(),
        name: "Бизнес центр Poytaxt",
        code: "LOC-TAS-002",
        type: "business_center",
        city: "Tashkent",
        latitude: 41.299496,
        longitude: 69.240074,
      },
      {
        id: uuidv4(),
        name: "IT Park Tashkent",
        code: "LOC-TAS-003",
        type: "business_center",
        city: "Tashkent",
        latitude: 41.340813,
        longitude: 69.334891,
      },
      {
        id: uuidv4(),
        name: "Станция метро Чиланзар",
        code: "LOC-TAS-004",
        type: "metro_station",
        city: "Tashkent",
        latitude: 41.287654,
        longitude: 69.203456,
      },
    ];

    for (const loc of locations) {
      const addressJson = JSON.stringify({
        fullAddress: `${loc.name}, ${loc.city}`,
        city: loc.city,
        country: "Uzbekistan",
      });
      await dataSource.query(
        `
        INSERT INTO locations (id, name, code, type, status, city, latitude, longitude, organization_id, is_active,
          address, monthly_rent, currency, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, true,
          $9::jsonb, 1500000, 'UZS', NOW(), NOW())
        ON CONFLICT (code) DO NOTHING
      `,
        [
          loc.id,
          loc.name,
          loc.code,
          loc.type,
          loc.city,
          loc.latitude,
          loc.longitude,
          orgId,
          addressJson,
        ],
      );
    }

    logger.log("Locations seeded");

    // ========================================================================
    // 4. SEED PRODUCTS
    // ========================================================================
    logger.log("Seeding products...");

    const products = [
      // Напитки
      {
        name: "Coca-Cola 0.5L",
        sku: "BEV-COLA-500",
        category: "cold_drinks",
        price: 8000,
        vatRate: 12,
      },
      {
        name: "Fanta Orange 0.5L",
        sku: "BEV-FANT-500",
        category: "cold_drinks",
        price: 8000,
        vatRate: 12,
      },
      {
        name: "Sprite 0.5L",
        sku: "BEV-SPRT-500",
        category: "cold_drinks",
        price: 8000,
        vatRate: 12,
      },
      {
        name: "Nestle Pure Life 0.5L",
        sku: "BEV-WATR-500",
        category: "cold_drinks",
        price: 3000,
        vatRate: 12,
      },
      {
        name: "Lipton Ice Tea 0.5L",
        sku: "BEV-LIPT-500",
        category: "cold_drinks",
        price: 9000,
        vatRate: 12,
      },

      // Снеки
      {
        name: "Lays Classic 80g",
        sku: "SNK-LAYS-080",
        category: "snacks",
        price: 7000,
        vatRate: 12,
      },
      {
        name: "Cheetos 55g",
        sku: "SNK-CHTS-055",
        category: "snacks",
        price: 5500,
        vatRate: 12,
      },
      {
        name: "Snickers 50g",
        sku: "SNK-SNCK-050",
        category: "snacks",
        price: 6000,
        vatRate: 12,
      },
      {
        name: "KitKat 45g",
        sku: "SNK-KITK-045",
        category: "snacks",
        price: 5500,
        vatRate: 12,
      },
      {
        name: "Twix 50g",
        sku: "SNK-TWIX-050",
        category: "snacks",
        price: 6000,
        vatRate: 12,
      },

      // Кофе
      {
        name: "Nescafe 3in1 Classic",
        sku: "COF-NSC3-001",
        category: "hot_drinks",
        price: 3000,
        vatRate: 12,
      },
      {
        name: "Americano",
        sku: "COF-AMER-001",
        category: "hot_drinks",
        price: 8000,
        vatRate: 12,
      },
      {
        name: "Cappuccino",
        sku: "COF-CAPP-001",
        category: "hot_drinks",
        price: 12000,
        vatRate: 12,
      },
      {
        name: "Latte",
        sku: "COF-LATT-001",
        category: "hot_drinks",
        price: 14000,
        vatRate: 12,
      },
    ];

    for (const product of products) {
      const productId = uuidv4();
      await dataSource.query(
        `
        INSERT INTO products (id, name, sku, category, selling_price, vat_rate, is_active, organization_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `,
        [
          productId,
          product.name,
          product.sku,
          product.category,
          product.price,
          product.vatRate,
          orgId,
        ],
      );
    }

    logger.log("Products seeded");

    // ========================================================================
    // 5. SEED MACHINES
    // ========================================================================
    logger.log("Seeding machines...");

    const machines = [
      {
        name: "VM-Напитки-001",
        machineNumber: "VM-TAS-001",
        serial: "SN2024001001",
        type: "drink",
        maxProductSlots: 8,
      },
      {
        name: "VM-Снеки-001",
        machineNumber: "VM-TAS-002",
        serial: "SN2024001002",
        type: "snack",
        maxProductSlots: 12,
      },
      {
        name: "VM-Комбо-001",
        machineNumber: "VM-TAS-003",
        serial: "SN2024001003",
        type: "combo",
        maxProductSlots: 20,
      },
      {
        name: "VM-Кофе-001",
        machineNumber: "VM-TAS-004",
        serial: "SN2024001004",
        type: "coffee",
        maxProductSlots: 6,
      },
    ];

    for (let i = 0; i < machines.length; i++) {
      const machine = machines[i];
      const machineId = uuidv4();
      await dataSource.query(
        `
        INSERT INTO machines (id, name, machine_number, serial_number, type, status, max_product_slots,
          organization_id, location_id, accepts_cash, accepts_card, accepts_qr,
          settings, created_at, updated_at)
        SELECT $1, $2, $3, $4, $5, 'active', $6, $7, l.id,
          true, true, true,
          $8::jsonb,
          NOW(), NOW()
        FROM locations l WHERE l.organization_id = $7 LIMIT 1 OFFSET $9
        ON CONFLICT DO NOTHING
      `,
        [
          machineId,
          machine.name,
          machine.machineNumber,
          machine.serial,
          machine.type,
          machine.maxProductSlots,
          orgId,
          JSON.stringify({
            temperature: { min: 2, max: 8, alertEnabled: true },
            notifications: {
              lowStock: true,
              errors: true,
              offline: true,
              temperature: true,
              cashFull: false,
            },
          }),
          i % 4,
        ],
      );
    }

    logger.log("Machines seeded");

    // ========================================================================
    // 6. SEED NOTIFICATION TEMPLATES
    // ========================================================================
    logger.log("Seeding notification templates...");

    const templates = [
      {
        code: "TASK_ASSIGNED",
        name: "Задача назначена",
        type: "task_assigned",
        titleRu: "Новая задача: {{task_title}}",
        bodyRu:
          'Вам назначена задача "{{task_title}}". Срок выполнения: {{task_deadline}}.',
        titleUz: "Yangi vazifa: {{task_title}}",
        bodyUz:
          'Sizga "{{task_title}}" vazifasi tayinlandi. Muddat: {{task_deadline}}.',
      },
      {
        code: "MACHINE_OFFLINE",
        name: "Автомат оффлайн",
        type: "machine_offline",
        titleRu: "Автомат {{machine_name}} не в сети",
        bodyRu:
          "Автомат {{machine_name}} ({{machine_code}}) потерял связь. Локация: {{machine_location}}.",
        titleUz: "Avtomat {{machine_name}} oflayn",
        bodyUz:
          "Avtomat {{machine_name}} ({{machine_code}}) aloqani yo'qotdi. Joylashuv: {{machine_location}}.",
      },
      {
        code: "LOW_STOCK_ALERT",
        name: "Низкий запас",
        type: "machine_low_stock",
        titleRu: "Низкий запас в {{machine_name}}",
        bodyRu:
          "В автомате {{machine_name}} заканчивается товар {{product_name}}. Осталось: {{product_quantity}} шт.",
        titleUz: "Kam zaxira: {{machine_name}}",
        bodyUz:
          "{{machine_name}} avtomatida {{product_name}} mahsuloti tugamoqda. Qoldi: {{product_quantity}} dona.",
      },
      {
        code: "COMPLAINT_NEW",
        name: "Новая жалоба",
        type: "complaint_new",
        titleRu: "Новая жалоба #{{complaint_number}}",
        bodyRu:
          "Поступила новая жалоба от клиента. Категория: {{complaint_category}}. Автомат: {{machine_name}}.",
        titleUz: "Yangi shikoyat #{{complaint_number}}",
        bodyUz:
          "Mijozdan yangi shikoyat keldi. Kategoriya: {{complaint_category}}. Avtomat: {{machine_name}}.",
      },
    ];

    for (const template of templates) {
      const templateId = uuidv4();
      await dataSource.query(
        `
        INSERT INTO notification_templates (id, organization_id, name, code, type, title_ru, body_ru, title_uz, body_uz,
          default_channels, is_active, is_system, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '{in_app,telegram}', true, true, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `,
        [
          templateId,
          orgId,
          template.name,
          template.code,
          template.type,
          template.titleRu,
          template.bodyRu,
          template.titleUz,
          template.bodyUz,
        ],
      );
    }

    logger.log("Notification templates seeded");

    // ========================================================================
    // 7. SEED REPORT DEFINITIONS
    // ========================================================================
    logger.log("Seeding report definitions...");

    const reports = [
      {
        code: "SALES_DAILY",
        name: "Ежедневный отчет по продажам",
        type: "sales_summary",
        category: "sales",
      },
      {
        code: "MACHINE_PERFORMANCE",
        name: "Производительность автоматов",
        type: "machine_performance",
        category: "machines",
      },
      {
        code: "INVENTORY_LEVELS",
        name: "Уровни запасов",
        type: "inventory_levels",
        category: "inventory",
      },
    ];

    for (const report of reports) {
      const reportId = uuidv4();
      await dataSource.query(
        `
        INSERT INTO report_definitions (id, organization_id, name, code, type, category, is_active, is_system,
          available_formats, generation_params, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, true, '{pdf,excel}', '{"language": "ru"}', NOW(), NOW())
        ON CONFLICT DO NOTHING
      `,
        [
          reportId,
          orgId,
          report.name,
          report.code,
          report.type,
          report.category,
        ],
      );
    }

    logger.log("Report definitions seeded");

    // ========================================================================
    // SUMMARY
    // ========================================================================
    logger.log("═══════════════════════════════════════════════════════════");
    logger.log("Database seeding completed successfully!");
    logger.log("═══════════════════════════════════════════════════════════");
    logger.log("Demo credentials:");
    logger.log("  Email: admin@vendhub.uz");
    logger.log("  Phone: +998901234567");
    logger.log(
      `  Password: ${process.env.SEED_PASSWORD ? "[from SEED_PASSWORD env]" : seedPassword}`,
    );

    await dataSource.destroy();
    process.exit(0);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Seeding failed: ${message}`);
    if (error instanceof Error && error.stack) {
      logger.error(error.stack);
    }
    await dataSource.destroy();
    process.exit(1);
  }
}

// Run the seeder
runSeed();
