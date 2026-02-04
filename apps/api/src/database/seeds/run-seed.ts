/**
 * Database Seeder Runner for VendHub OS
 * Seeds initial data for development/testing
 *
 * Run: npm run db:seed
 */

import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../typeorm.config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { seedReferences } from './references.seed';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
};

async function runSeed() {
  log.info('Starting database seeding...');

  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    log.success('Database connection established');

    // ========================================================================
    // 0. SEED REFERENCE DATA
    // ========================================================================
    log.info('Seeding reference data (VAT rates, package types, payment providers, MXIK codes, IKPU codes)...');
    await seedReferences(dataSource);
    log.success('Reference data seeded');

    // ========================================================================
    // 1. SEED ORGANIZATIONS
    // ========================================================================
    log.info('Seeding organizations...');

    const orgId = uuidv4();
    const demoOrgId = uuidv4();

    await dataSource.query(`
      INSERT INTO organizations (id, name, legal_name, type, subscription_tier, code, inn, phone, email, is_active, settings, limits, features, created_at, updated_at)
      VALUES
        ($1, 'VendHub Demo', 'VendHub Demo OOO', 'headquarters', 'enterprise', 'VENDHUB-HQ', '123456789', '+998901234567', 'admin@vendhub.uz', true,
         '{"language": "ru", "timezone": "Asia/Tashkent", "currency": "UZS"}',
         '{"maxMachines": 0, "maxUsers": 0, "maxWarehouses": 0}',
         ARRAY['telegram_bot', 'reports', 'api_access', 'multi_location'],
         NOW(), NOW()),
        ($2, 'Демо Оператор', 'ИП Демо Оператор', 'operator', 'professional', 'DEMO-OP-001', '987654321', '+998909876543', 'operator@demo.uz', true,
         '{"language": "ru", "timezone": "Asia/Tashkent", "currency": "UZS"}',
         '{"maxMachines": 50, "maxUsers": 10, "maxWarehouses": 3}',
         ARRAY['telegram_bot', 'reports'],
         NOW(), NOW())
      ON CONFLICT (code) DO NOTHING
    `, [orgId, demoOrgId]);

    log.success('Organizations seeded');

    // ========================================================================
    // 2. SEED USERS
    // ========================================================================
    log.info('Seeding users...');

    const passwordHash = await bcrypt.hash('Demo123!', 10);
    const adminId = uuidv4();
    const managerId = uuidv4();
    const operatorId = uuidv4();

    await dataSource.query(`
      INSERT INTO users (id, email, phone, password, first_name, last_name, role, status, organization_id, language, is_active, created_at, updated_at)
      VALUES
        -- Super Admin
        ($1, 'admin@vendhub.uz', '+998901234567', $4, 'Администратор', 'VendHub', 'owner', 'active', $5, 'ru', true, NOW(), NOW()),
        -- Manager
        ($2, 'manager@demo.uz', '+998901234568', $4, 'Менеджер', 'Демо', 'manager', 'active', $5, 'ru', true, NOW(), NOW()),
        -- Operator
        ($3, 'operator@demo.uz', '+998901234569', $4, 'Оператор', 'Полевой', 'operator', 'active', $5, 'ru', true, NOW(), NOW())
      ON CONFLICT (phone) DO NOTHING
    `, [adminId, managerId, operatorId, passwordHash, orgId]);

    log.success('Users seeded');

    // ========================================================================
    // 3. SEED LOCATIONS
    // ========================================================================
    log.info('Seeding locations...');

    const locations = [
      {
        id: uuidv4(),
        name: 'ТРЦ Samarkand Darvoza',
        code: 'LOC-TAS-001',
        type: 'shopping_center',
        city: 'Tashkent',
        latitude: 41.311081,
        longitude: 69.279737,
      },
      {
        id: uuidv4(),
        name: 'Бизнес центр Poytaxt',
        code: 'LOC-TAS-002',
        type: 'business_center',
        city: 'Tashkent',
        latitude: 41.299496,
        longitude: 69.240074,
      },
      {
        id: uuidv4(),
        name: 'IT Park Tashkent',
        code: 'LOC-TAS-003',
        type: 'business_center',
        city: 'Tashkent',
        latitude: 41.340813,
        longitude: 69.334891,
      },
      {
        id: uuidv4(),
        name: 'Станция метро Чиланзар',
        code: 'LOC-TAS-004',
        type: 'metro_station',
        city: 'Tashkent',
        latitude: 41.287654,
        longitude: 69.203456,
      },
    ];

    for (const loc of locations) {
      await dataSource.query(`
        INSERT INTO locations (id, name, code, type, status, city, latitude, longitude, organization_id, is_active,
          address, monthly_rent, currency, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, true,
          '{"fullAddress": "${loc.name}, ${loc.city}", "city": "${loc.city}", "country": "Uzbekistan"}',
          1500000, 'UZS', NOW(), NOW())
        ON CONFLICT (code) DO NOTHING
      `, [loc.id, loc.name, loc.code, loc.type, loc.city, loc.latitude, loc.longitude, orgId]);
    }

    log.success('Locations seeded');

    // ========================================================================
    // 4. SEED PRODUCTS
    // ========================================================================
    log.info('Seeding products...');

    const products = [
      // Напитки
      { name: 'Coca-Cola 0.5L', sku: 'BEV-COLA-500', category: 'beverages', price: 8000, vatRate: 12 },
      { name: 'Fanta Orange 0.5L', sku: 'BEV-FANT-500', category: 'beverages', price: 8000, vatRate: 12 },
      { name: 'Sprite 0.5L', sku: 'BEV-SPRT-500', category: 'beverages', price: 8000, vatRate: 12 },
      { name: 'Nestle Pure Life 0.5L', sku: 'BEV-WATR-500', category: 'beverages', price: 3000, vatRate: 12 },
      { name: 'Lipton Ice Tea 0.5L', sku: 'BEV-LIPT-500', category: 'beverages', price: 9000, vatRate: 12 },

      // Снеки
      { name: 'Lays Classic 80g', sku: 'SNK-LAYS-080', category: 'snacks', price: 7000, vatRate: 12 },
      { name: 'Cheetos 55g', sku: 'SNK-CHTS-055', category: 'snacks', price: 5500, vatRate: 12 },
      { name: 'Snickers 50g', sku: 'SNK-SNCK-050', category: 'snacks', price: 6000, vatRate: 12 },
      { name: 'KitKat 45g', sku: 'SNK-KITK-045', category: 'snacks', price: 5500, vatRate: 12 },
      { name: 'Twix 50g', sku: 'SNK-TWIX-050', category: 'snacks', price: 6000, vatRate: 12 },

      // Кофе
      { name: 'Nescafe 3in1 Classic', sku: 'COF-NSC3-001', category: 'coffee', price: 3000, vatRate: 12 },
      { name: 'Americano', sku: 'COF-AMER-001', category: 'coffee', price: 8000, vatRate: 12 },
      { name: 'Cappuccino', sku: 'COF-CAPP-001', category: 'coffee', price: 12000, vatRate: 12 },
      { name: 'Latte', sku: 'COF-LATT-001', category: 'coffee', price: 14000, vatRate: 12 },
    ];

    for (const product of products) {
      const productId = uuidv4();
      await dataSource.query(`
        INSERT INTO products (id, name, sku, category, base_price, vat_rate, is_active, is_available, organization_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, true, $7, NOW(), NOW())
        ON CONFLICT (sku) DO NOTHING
      `, [productId, product.name, product.sku, product.category, product.price, product.vatRate, orgId]);
    }

    log.success('Products seeded');

    // ========================================================================
    // 5. SEED MACHINES
    // ========================================================================
    log.info('Seeding machines...');

    const machines = [
      { name: 'VM-Напитки-001', code: 'VM-TAS-001', serial: 'SN2024001001', type: 'beverage', slotCount: 8 },
      { name: 'VM-Снеки-001', code: 'VM-TAS-002', serial: 'SN2024001002', type: 'snack', slotCount: 12 },
      { name: 'VM-Комбо-001', code: 'VM-TAS-003', serial: 'SN2024001003', type: 'combo', slotCount: 20 },
      { name: 'VM-Кофе-001', code: 'VM-TAS-004', serial: 'SN2024001004', type: 'coffee', slotCount: 6 },
    ];

    for (let i = 0; i < machines.length; i++) {
      const machine = machines[i];
      const machineId = uuidv4();
      await dataSource.query(`
        INSERT INTO machines (id, name, code, serial_number, type, status, slot_count, organization_id, location_id,
          is_active, payment_methods, settings, created_at, updated_at)
        SELECT $1, $2, $3, $4, $5, 'active', $6, $7, l.id, true,
          '[{"method": "cash", "enabled": true}, {"method": "card", "enabled": true}, {"method": "payme", "enabled": true}]',
          '{"temperature": {"min": 2, "max": 8}, "notifications": {"lowStock": true, "offline": true}}',
          NOW(), NOW()
        FROM locations l WHERE l.organization_id = $7 LIMIT 1 OFFSET $8
        ON CONFLICT (code) DO NOTHING
      `, [machineId, machine.name, machine.code, machine.serial, machine.type, machine.slotCount, orgId, i % 4]);
    }

    log.success('Machines seeded');

    // ========================================================================
    // 6. SEED NOTIFICATION TEMPLATES
    // ========================================================================
    log.info('Seeding notification templates...');

    const templates = [
      {
        code: 'TASK_ASSIGNED',
        name: 'Задача назначена',
        type: 'task_assigned',
        titleRu: 'Новая задача: {{task_title}}',
        bodyRu: 'Вам назначена задача "{{task_title}}". Срок выполнения: {{task_deadline}}.',
        titleUz: 'Yangi vazifa: {{task_title}}',
        bodyUz: 'Sizga "{{task_title}}" vazifasi tayinlandi. Muddat: {{task_deadline}}.',
      },
      {
        code: 'MACHINE_OFFLINE',
        name: 'Автомат оффлайн',
        type: 'machine_offline',
        titleRu: 'Автомат {{machine_name}} не в сети',
        bodyRu: 'Автомат {{machine_name}} ({{machine_code}}) потерял связь. Локация: {{machine_location}}.',
        titleUz: 'Avtomat {{machine_name}} oflayn',
        bodyUz: 'Avtomat {{machine_name}} ({{machine_code}}) aloqani yo\'qotdi. Joylashuv: {{machine_location}}.',
      },
      {
        code: 'LOW_STOCK_ALERT',
        name: 'Низкий запас',
        type: 'machine_low_stock',
        titleRu: 'Низкий запас в {{machine_name}}',
        bodyRu: 'В автомате {{machine_name}} заканчивается товар {{product_name}}. Осталось: {{product_quantity}} шт.',
        titleUz: 'Kam zaxira: {{machine_name}}',
        bodyUz: '{{machine_name}} avtomatida {{product_name}} mahsuloti tugamoqda. Qoldi: {{product_quantity}} dona.',
      },
      {
        code: 'COMPLAINT_NEW',
        name: 'Новая жалоба',
        type: 'complaint_new',
        titleRu: 'Новая жалоба #{{complaint_number}}',
        bodyRu: 'Поступила новая жалоба от клиента. Категория: {{complaint_category}}. Автомат: {{machine_name}}.',
        titleUz: 'Yangi shikoyat #{{complaint_number}}',
        bodyUz: 'Mijozdan yangi shikoyat keldi. Kategoriya: {{complaint_category}}. Avtomat: {{machine_name}}.',
      },
    ];

    for (const template of templates) {
      const templateId = uuidv4();
      await dataSource.query(`
        INSERT INTO notification_templates (id, organization_id, name, code, type, title_ru, body_ru, title_uz, body_uz,
          default_channels, is_active, is_system, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '{in_app,telegram}', true, true, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [templateId, orgId, template.name, template.code, template.type, template.titleRu, template.bodyRu, template.titleUz, template.bodyUz]);
    }

    log.success('Notification templates seeded');

    // ========================================================================
    // 7. SEED REPORT DEFINITIONS
    // ========================================================================
    log.info('Seeding report definitions...');

    const reports = [
      {
        code: 'SALES_DAILY',
        name: 'Ежедневный отчет по продажам',
        type: 'sales_summary',
        category: 'sales',
      },
      {
        code: 'MACHINE_PERFORMANCE',
        name: 'Производительность автоматов',
        type: 'machine_performance',
        category: 'machines',
      },
      {
        code: 'INVENTORY_LEVELS',
        name: 'Уровни запасов',
        type: 'inventory_levels',
        category: 'inventory',
      },
    ];

    for (const report of reports) {
      const reportId = uuidv4();
      await dataSource.query(`
        INSERT INTO report_definitions (id, organization_id, name, code, type, category, is_active, is_system,
          available_formats, generation_params, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, true, '{pdf,excel}', '{"language": "ru"}', NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [reportId, orgId, report.name, report.code, report.type, report.category]);
    }

    log.success('Report definitions seeded');

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('');
    log.success('═══════════════════════════════════════════════════════════');
    log.success('Database seeding completed successfully!');
    log.success('═══════════════════════════════════════════════════════════');
    console.log('');
    log.info('Demo credentials:');
    console.log('  Email: admin@vendhub.uz');
    console.log('  Phone: +998901234567');
    console.log('  Password: Demo123!');
    console.log('');

    await dataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    log.error(`Seeding failed: ${error.message}`);
    console.error(error);
    await dataSource.destroy();
    process.exit(1);
  }
}

// Run the seeder
runSeed();
