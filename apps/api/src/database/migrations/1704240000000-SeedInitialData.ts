/**
 * Seed Initial Data Migration
 * Creates default organization, admin user, and sample data
 *
 * Run: npm run migration:run
 * Revert: npm run migration:revert
 */

import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from "bcrypt";

export class SeedInitialData1704240000000 implements MigrationInterface {
  name = "SeedInitialData1704240000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hash password
    const passwordHash = await bcrypt.hash("Admin123!", 12);

    // ========================================================================
    // CREATE DEFAULT ORGANIZATION (HQ)
    // ========================================================================

    await queryRunner.query(`
      INSERT INTO "organizations" (
        "id", "name", "legal_name", "type", "subscription_tier", "code",
        "inn", "address", "phone", "email", "is_active", "settings", "features"
      ) VALUES (
        'a0000000-0000-0000-0000-000000000001',
        'VendHub HQ',
        'VendHub Operations LLC',
        'headquarters',
        'enterprise',
        'VENDHUB-HQ',
        '123456789',
        'Ташкент, ул. Амира Темура 101',
        '+998712000001',
        'admin@vendhub.uz',
        true,
        '{"currency": "UZS", "timezone": "Asia/Tashkent", "language": "ru", "dateFormat": "DD.MM.YYYY", "timeFormat": "HH:mm"}',
        ARRAY['full_access', 'multi_tenant', 'api_access', 'white_label', 'custom_reports', 'sla_management', 'fiscal_integration']
      )
    `);

    // ========================================================================
    // CREATE SAMPLE FRANCHISE
    // ========================================================================

    await queryRunner.query(`
      INSERT INTO "organizations" (
        "id", "name", "legal_name", "type", "subscription_tier", "code",
        "parent_id", "inn", "address", "phone", "email", "is_active", "settings"
      ) VALUES (
        'a0000000-0000-0000-0000-000000000002',
        'VendHub Tashkent',
        'VendHub Tashkent LLC',
        'franchise',
        'professional',
        'VH-TASHKENT',
        'a0000000-0000-0000-0000-000000000001',
        '987654321',
        'Ташкент, ул. Навои 50',
        '+998712000002',
        'tashkent@vendhub.uz',
        true,
        '{"currency": "UZS", "timezone": "Asia/Tashkent", "language": "ru"}'
      )
    `);

    // ========================================================================
    // CREATE ADMIN USER
    // ========================================================================

    await queryRunner.query(`
      INSERT INTO "users" (
        "id", "email", "phone", "password_hash", "first_name", "last_name",
        "role", "status", "organization_id", "is_active", "phone_verified_at", "email_verified_at",
        "permissions", "language"
      ) VALUES (
        'b0000000-0000-0000-0000-000000000001',
        'admin@vendhub.uz',
        '+998901234567',
        '${passwordHash}',
        'System',
        'Administrator',
        'owner',
        'active',
        'a0000000-0000-0000-0000-000000000001',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        '{"*": ["*"]}',
        'ru'
      )
    `);

    // ========================================================================
    // CREATE SAMPLE USERS (Different Roles)
    // ========================================================================

    // Manager
    await queryRunner.query(`
      INSERT INTO "users" (
        "id", "email", "phone", "password_hash", "first_name", "last_name",
        "role", "status", "organization_id", "is_active", "phone_verified_at"
      ) VALUES (
        'b0000000-0000-0000-0000-000000000002',
        'manager@vendhub.uz',
        '+998901234568',
        '${passwordHash}',
        'Алишер',
        'Каримов',
        'manager',
        'active',
        'a0000000-0000-0000-0000-000000000002',
        true,
        CURRENT_TIMESTAMP
      )
    `);

    // Operator
    await queryRunner.query(`
      INSERT INTO "users" (
        "id", "email", "phone", "password_hash", "first_name", "last_name",
        "role", "status", "organization_id", "is_active", "phone_verified_at",
        "telegram_id"
      ) VALUES (
        'b0000000-0000-0000-0000-000000000003',
        'operator@vendhub.uz',
        '+998901234569',
        '${passwordHash}',
        'Бахром',
        'Иноятов',
        'operator',
        'active',
        'a0000000-0000-0000-0000-000000000002',
        true,
        CURRENT_TIMESTAMP,
        '123456789'
      )
    `);

    // Warehouse
    await queryRunner.query(`
      INSERT INTO "users" (
        "id", "phone", "password_hash", "first_name", "last_name",
        "role", "status", "organization_id", "is_active", "phone_verified_at"
      ) VALUES (
        'b0000000-0000-0000-0000-000000000004',
        '+998901234570',
        '${passwordHash}',
        'Санжар',
        'Рахимов',
        'warehouse',
        'active',
        'a0000000-0000-0000-0000-000000000002',
        true,
        CURRENT_TIMESTAMP
      )
    `);

    // ========================================================================
    // CREATE SAMPLE LOCATIONS
    // ========================================================================

    await queryRunner.query(`
      INSERT INTO "locations" (
        "id", "name", "code", "type", "status", "city", "region",
        "latitude", "longitude", "organization_id", "is_active", "is_24_hours",
        "address", "contacts", "working_hours"
      ) VALUES
      (
        'c0000000-0000-0000-0000-000000000001',
        'ТРЦ Mega Planet',
        'LOC-MEGA-001',
        'shopping_center',
        'active',
        'Ташкент',
        'Ташкент',
        41.311081,
        69.279737,
        'a0000000-0000-0000-0000-000000000002',
        true,
        false,
        '{"street": "ул. Бухоро 21", "building": "ТРЦ Mega Planet", "floor": "1"}',
        '[{"name": "Администрация", "phone": "+998712001001", "role": "admin"}]',
        '{"monday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "10:00", "close": "22:00"}, "wednesday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "10:00", "close": "22:00"}, "friday": {"open": "10:00", "close": "22:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "sunday": {"open": "10:00", "close": "21:00"}}'
      ),
      (
        'c0000000-0000-0000-0000-000000000002',
        'БЦ Infinity Tower',
        'LOC-INFINITY-001',
        'business_center',
        'active',
        'Ташкент',
        'Ташкент',
        41.299496,
        69.240074,
        'a0000000-0000-0000-0000-000000000002',
        true,
        false,
        '{"street": "ул. Истикбол 10", "building": "БЦ Infinity Tower", "floor": "G"}',
        '[{"name": "Управление зданием", "phone": "+998712001002", "role": "facility"}]',
        '{"monday": {"open": "08:00", "close": "20:00"}, "tuesday": {"open": "08:00", "close": "20:00"}, "wednesday": {"open": "08:00", "close": "20:00"}, "thursday": {"open": "08:00", "close": "20:00"}, "friday": {"open": "08:00", "close": "20:00"}, "saturday": {"open": "09:00", "close": "18:00"}, "sunday": "closed"}'
      ),
      (
        'c0000000-0000-0000-0000-000000000003',
        'Станция метро Чорсу',
        'LOC-METRO-CHORSU',
        'metro_station',
        'active',
        'Ташкент',
        'Ташкент',
        41.324722,
        69.230278,
        'a0000000-0000-0000-0000-000000000002',
        true,
        true,
        '{"street": "Станция метро Чорсу", "floor": "вестибюль"}',
        '[]',
        null
      )
    `);

    // ========================================================================
    // CREATE SAMPLE MACHINES
    // ========================================================================

    await queryRunner.query(`
      INSERT INTO "machines" (
        "id", "name", "code", "serial_number", "type", "status",
        "manufacturer", "model", "slot_count", "organization_id", "location_id",
        "assigned_operator_id", "is_active", "settings", "qr_code_complaint", "payment_methods"
      ) VALUES
      (
        'd0000000-0000-0000-0000-000000000001',
        'Кофе-автомат Mega #1',
        'VH-001',
        'CF-2024-001-TAS',
        'coffee',
        'active',
        'Necta',
        'Krea Touch',
        12,
        'a0000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000003',
        true,
        '{"temperature": {"coffee": 85, "water": 95}, "cups": {"size": "medium"}}',
        'https://vendhub.uz/c/VH-001',
        '["cash", "card", "payme", "click", "uzum"]'
      ),
      (
        'd0000000-0000-0000-0000-000000000002',
        'Снеки Mega #1',
        'VH-002',
        'SN-2024-001-TAS',
        'snack',
        'active',
        'Crane',
        'Merchant 6',
        60,
        'a0000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000003',
        true,
        '{"coolingEnabled": true, "targetTemperature": 4}',
        'https://vendhub.uz/c/VH-002',
        '["cash", "card", "payme", "click"]'
      ),
      (
        'd0000000-0000-0000-0000-000000000003',
        'Кофе-автомат Infinity',
        'VH-003',
        'CF-2024-002-TAS',
        'coffee',
        'active',
        'Saeco',
        'Idea Cappuccino',
        10,
        'a0000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000003',
        true,
        '{"temperature": {"coffee": 88, "water": 93}}',
        'https://vendhub.uz/c/VH-003',
        '["cash", "card", "payme", "click", "uzum"]'
      ),
      (
        'd0000000-0000-0000-0000-000000000004',
        'Напитки Метро Чорсу',
        'VH-004',
        'BV-2024-001-TAS',
        'beverage',
        'active',
        'Vendo',
        'Vue 40',
        40,
        'a0000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000003',
        true,
        '{"coolingEnabled": true, "targetTemperature": 6}',
        'https://vendhub.uz/c/VH-004',
        '["cash", "card"]'
      )
    `);

    // ========================================================================
    // CREATE SAMPLE PRODUCTS
    // ========================================================================

    await queryRunner.query(`
      INSERT INTO "products" (
        "id", "name", "name_uz", "sku", "barcode", "category", "brand",
        "base_price", "cost_price", "vat_rate", "organization_id", "is_active",
        "description", "unit"
      ) VALUES
      -- Coffee products
      (
        'e0000000-0000-0000-0000-000000000001',
        'Эспрессо',
        'Espresso',
        'COFFEE-ESP-001',
        '4607001234001',
        'coffee',
        'VendHub Coffee',
        8000,
        2500,
        12,
        'a0000000-0000-0000-0000-000000000001',
        true,
        'Классический эспрессо из свежемолотого кофе',
        'cup'
      ),
      (
        'e0000000-0000-0000-0000-000000000002',
        'Американо',
        'Amerikano',
        'COFFEE-AMR-001',
        '4607001234002',
        'coffee',
        'VendHub Coffee',
        10000,
        3000,
        12,
        'a0000000-0000-0000-0000-000000000001',
        true,
        'Американо из 100% арабики',
        'cup'
      ),
      (
        'e0000000-0000-0000-0000-000000000003',
        'Капучино',
        'Kapuchino',
        'COFFEE-CAP-001',
        '4607001234003',
        'coffee',
        'VendHub Coffee',
        12000,
        4000,
        12,
        'a0000000-0000-0000-0000-000000000001',
        true,
        'Нежный капучино с молочной пенкой',
        'cup'
      ),
      (
        'e0000000-0000-0000-0000-000000000004',
        'Латте',
        'Latte',
        'COFFEE-LAT-001',
        '4607001234004',
        'coffee',
        'VendHub Coffee',
        14000,
        4500,
        12,
        'a0000000-0000-0000-0000-000000000001',
        true,
        'Латте со вспененным молоком',
        'cup'
      ),
      -- Snacks
      (
        'e0000000-0000-0000-0000-000000000005',
        'Сникерс',
        'Snickers',
        'SNACK-SNK-001',
        '5000159454124',
        'snack',
        'Mars',
        8000,
        5500,
        12,
        'a0000000-0000-0000-0000-000000000001',
        true,
        'Шоколадный батончик с орехами и карамелью',
        'pcs'
      ),
      (
        'e0000000-0000-0000-0000-000000000006',
        'Твикс',
        'Twix',
        'SNACK-TWX-001',
        '5000159454131',
        'snack',
        'Mars',
        8000,
        5500,
        12,
        'a0000000-0000-0000-0000-000000000001',
        true,
        'Хрустящий батончик с карамелью',
        'pcs'
      ),
      (
        'e0000000-0000-0000-0000-000000000007',
        'Lay''s Классические',
        'Lays Original',
        'SNACK-LAY-001',
        '5010029000016',
        'snack',
        'Lay''s',
        6000,
        3800,
        12,
        'a0000000-0000-0000-0000-000000000001',
        true,
        'Картофельные чипсы классические',
        'pcs'
      ),
      -- Beverages
      (
        'e0000000-0000-0000-0000-000000000008',
        'Coca-Cola 0.5л',
        'Coca-Cola 0.5l',
        'DRINK-CCL-050',
        '5449000000996',
        'beverage',
        'Coca-Cola',
        7000,
        4500,
        12,
        'a0000000-0000-0000-0000-000000000001',
        true,
        'Газированный напиток Coca-Cola',
        'bottle'
      ),
      (
        'e0000000-0000-0000-0000-000000000009',
        'Fanta Orange 0.5л',
        'Fanta Orange 0.5l',
        'DRINK-FNT-050',
        '5449000000989',
        'beverage',
        'Coca-Cola',
        7000,
        4500,
        12,
        'a0000000-0000-0000-0000-000000000001',
        true,
        'Газированный напиток со вкусом апельсина',
        'bottle'
      ),
      (
        'e0000000-0000-0000-0000-000000000010',
        'Вода Nestle Pure Life 0.5л',
        'Nestle Pure Life 0.5l',
        'DRINK-NPL-050',
        '7613031869503',
        'water',
        'Nestle',
        4000,
        2500,
        12,
        'a0000000-0000-0000-0000-000000000001',
        true,
        'Питьевая вода',
        'bottle'
      )
    `);

    // ========================================================================
    // CREATE SAMPLE PLANOGRAMS
    // ========================================================================

    await queryRunner.query(`
      INSERT INTO "machine_planograms" (
        "machine_id", "slot_number", "product_id", "price", "capacity", "current_quantity"
      ) VALUES
      -- Coffee machine VH-001
      ('d0000000-0000-0000-0000-000000000001', 1, 'e0000000-0000-0000-0000-000000000001', 8000, 100, 80),
      ('d0000000-0000-0000-0000-000000000001', 2, 'e0000000-0000-0000-0000-000000000002', 10000, 100, 75),
      ('d0000000-0000-0000-0000-000000000001', 3, 'e0000000-0000-0000-0000-000000000003', 12000, 100, 90),
      ('d0000000-0000-0000-0000-000000000001', 4, 'e0000000-0000-0000-0000-000000000004', 14000, 100, 85),
      -- Snack machine VH-002
      ('d0000000-0000-0000-0000-000000000002', 1, 'e0000000-0000-0000-0000-000000000005', 8000, 15, 12),
      ('d0000000-0000-0000-0000-000000000002', 2, 'e0000000-0000-0000-0000-000000000006', 8000, 15, 10),
      ('d0000000-0000-0000-0000-000000000002', 3, 'e0000000-0000-0000-0000-000000000007', 6000, 20, 18),
      -- Beverage machine VH-004
      ('d0000000-0000-0000-0000-000000000004', 1, 'e0000000-0000-0000-0000-000000000008', 7000, 20, 15),
      ('d0000000-0000-0000-0000-000000000004', 2, 'e0000000-0000-0000-0000-000000000009', 7000, 20, 18),
      ('d0000000-0000-0000-0000-000000000004', 3, 'e0000000-0000-0000-0000-000000000010', 4000, 20, 20)
    `);

    // ========================================================================
    // CREATE SAMPLE TASKS
    // ========================================================================

    await queryRunner.query(`
      INSERT INTO "tasks" (
        "id", "task_number", "type", "status", "priority", "title", "description",
        "organization_id", "machine_id", "location_id", "assigned_to_id",
        "due_date", "checklist"
      ) VALUES
      (
        'f0000000-0000-0000-0000-000000000001',
        'TASK-2024-0001',
        'replenishment',
        'assigned',
        'normal',
        'Пополнение VH-002',
        'Пополнить снековый автомат в ТРЦ Mega Planet',
        'a0000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000003',
        CURRENT_TIMESTAMP + INTERVAL '1 day',
        '[{"id": 1, "text": "Проверить остатки", "completed": false}, {"id": 2, "text": "Загрузить товар", "completed": false}, {"id": 3, "text": "Проверить работу", "completed": false}]'
      ),
      (
        'f0000000-0000-0000-0000-000000000002',
        'TASK-2024-0002',
        'collection',
        'pending',
        'high',
        'Инкассация VH-001',
        'Собрать наличные из кофе-автомата Mega #1',
        'a0000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000003',
        CURRENT_TIMESTAMP + INTERVAL '2 days',
        '[{"id": 1, "text": "Открыть кассу", "completed": false}, {"id": 2, "text": "Пересчитать наличные", "completed": false}, {"id": 3, "text": "Зафиксировать сумму", "completed": false}]'
      )
    `);

    console.log("✅ Seed data migration completed successfully");
    console.log("");
    console.log("📋 Default admin credentials:");
    console.log("   Email: admin@vendhub.uz");
    console.log("   Phone: +998901234567");
    console.log("   Password: Admin123!");
    console.log("");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete in reverse order of dependencies
    await queryRunner.query(`DELETE FROM "tasks" WHERE "id" LIKE 'f0000000%'`);
    await queryRunner.query(
      `DELETE FROM "machine_planograms" WHERE "machine_id" LIKE 'd0000000%'`,
    );
    await queryRunner.query(
      `DELETE FROM "products" WHERE "id" LIKE 'e0000000%'`,
    );
    await queryRunner.query(
      `DELETE FROM "machines" WHERE "id" LIKE 'd0000000%'`,
    );
    await queryRunner.query(
      `DELETE FROM "locations" WHERE "id" LIKE 'c0000000%'`,
    );
    await queryRunner.query(`DELETE FROM "users" WHERE "id" LIKE 'b0000000%'`);
    await queryRunner.query(
      `DELETE FROM "organizations" WHERE "id" LIKE 'a0000000%'`,
    );

    console.log("✅ Seed data migration reverted successfully");
  }
}
