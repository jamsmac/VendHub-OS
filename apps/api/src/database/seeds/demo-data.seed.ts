/**
 * Demo Data Seeder
 * Creates sample data for demonstration and testing
 * Run: pnpm db:seed
 */

import { DataSource } from 'typeorm';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcrypt';

export async function seedDemoData(dataSource: DataSource) {
  console.log('🌱 Seeding demo data...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // ===========================================
    // 1. ORGANIZATION
    // ===========================================
    const orgId = uuid();
    await queryRunner.query(`
      INSERT INTO organizations (id, name, type, slug, settings, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (slug) DO NOTHING
    `, [
      orgId,
      'VendHub Demo',
      'headquarters',
      'vendhub-demo',
      JSON.stringify({
        currency: 'UZS',
        timezone: 'Asia/Tashkent',
        language: 'ru',
      }),
    ]);
    console.log('✅ Organization created');

    // ===========================================
    // 2. ADMIN USER
    // ===========================================
    const adminId = uuid();
    const hashedPassword = await bcrypt.hash('demo123456', 10);
    await queryRunner.query(`
      INSERT INTO users (id, email, phone, password, "firstName", "lastName", role, status, "organizationId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `, [
      adminId,
      'admin@vendhub.uz',
      '+998901234567',
      hashedPassword,
      'Demo',
      'Admin',
      'admin',
      'active',
      orgId,
    ]);
    console.log('✅ Admin user created (admin@vendhub.uz / demo123456)');

    // ===========================================
    // 3. SAMPLE EMPLOYEES
    // ===========================================
    const employees = [
      { firstName: 'Азиз', lastName: 'Каримов', role: 'operator', position: 'Оператор', department: 'Операции' },
      { firstName: 'Малика', lastName: 'Рахимова', role: 'warehouse', position: 'Кладовщик', department: 'Склад' },
      { firstName: 'Бахром', lastName: 'Юсупов', role: 'manager', position: 'Менеджер', department: 'Управление' },
    ];

    for (const emp of employees) {
      await queryRunner.query(`
        INSERT INTO employees (id, "firstName", "lastName", email, phone, role, position, department, status, "organizationId", "hireDate", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, NOW(), NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [
        uuid(),
        emp.firstName,
        emp.lastName,
        `${emp.firstName.toLowerCase()}@vendhub.uz`,
        `+9989${Math.floor(10000000 + Math.random() * 90000000)}`,
        emp.role,
        emp.position,
        emp.department,
        orgId,
      ]);
    }
    console.log('✅ Employees created');

    // ===========================================
    // 4. SAMPLE LOCATIONS
    // ===========================================
    const locations = [
      { name: 'ТЦ Samarqand Darvoza', address: 'ул. Коратош 5А, Ташкент', lat: 41.311081, lng: 69.279737 },
      { name: 'IT Park Tashkent', address: 'ул. Мирабад 7, Ташкент', lat: 41.285095, lng: 69.204039 },
      { name: 'Nexus Mall', address: 'ул. Шота Руставели 44, Ташкент', lat: 41.295695, lng: 69.266880 },
      { name: 'Tashkent City', address: 'ул. Навои 1, Ташкент', lat: 41.326546, lng: 69.281353 },
      { name: 'АЭРОПОРТ', address: 'Аэропорт Ташкент, Ташкент', lat: 41.257158, lng: 69.281227 },
    ];

    const locationIds: string[] = [];
    for (const loc of locations) {
      const locId = uuid();
      locationIds.push(locId);
      await queryRunner.query(`
        INSERT INTO locations (id, name, address, latitude, longitude, type, status, "organizationId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, 'commercial', 'active', $6, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [locId, loc.name, loc.address, loc.lat, loc.lng, orgId]);
    }
    console.log('✅ Locations created');

    // ===========================================
    // 5. SAMPLE PRODUCTS
    // ===========================================
    const products = [
      // Coffee
      { name: 'Американо', category: 'Кофе', price: 12000, sku: 'COF-001' },
      { name: 'Капучино', category: 'Кофе', price: 15000, sku: 'COF-002' },
      { name: 'Латте', category: 'Кофе', price: 16000, sku: 'COF-003' },
      { name: 'Эспрессо', category: 'Кофе', price: 10000, sku: 'COF-004' },
      // Drinks
      { name: 'Coca-Cola 0.5L', category: 'Напитки', price: 8000, sku: 'DRK-001' },
      { name: 'Fanta 0.5L', category: 'Напитки', price: 8000, sku: 'DRK-002' },
      { name: 'Sprite 0.5L', category: 'Напитки', price: 8000, sku: 'DRK-003' },
      { name: 'Вода Nestle 0.5L', category: 'Напитки', price: 4000, sku: 'DRK-004' },
      // Snacks
      { name: 'Snickers', category: 'Снеки', price: 9000, sku: 'SNK-001' },
      { name: 'Mars', category: 'Снеки', price: 9000, sku: 'SNK-002' },
      { name: 'Twix', category: 'Снеки', price: 9000, sku: 'SNK-003' },
      { name: "Lay's Classic", category: 'Снеки', price: 7000, sku: 'SNK-004' },
    ];

    const productIds: string[] = [];
    for (const prod of products) {
      const prodId = uuid();
      productIds.push(prodId);
      await queryRunner.query(`
        INSERT INTO products (id, name, category, price, sku, status, "organizationId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, 'active', $6, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [prodId, prod.name, prod.category, prod.price, prod.sku, orgId]);
    }
    console.log('✅ Products created');

    // ===========================================
    // 6. SAMPLE MACHINES
    // ===========================================
    const machineTypes = ['coffee', 'snack', 'combo', 'drink'];
    const machineIds: string[] = [];

    for (let i = 0; i < 10; i++) {
      const machineId = uuid();
      machineIds.push(machineId);
      const locationId = locationIds[i % locationIds.length];
      const machineType = machineTypes[i % machineTypes.length];

      await queryRunner.query(`
        INSERT INTO machines (
          id, "serialNumber", name, type, status,
          "locationId", "organizationId",
          latitude, longitude,
          settings, "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT ("serialNumber") DO NOTHING
      `, [
        machineId,
        `VH-2024-${String(i + 1).padStart(4, '0')}`,
        `Автомат ${i + 1}`,
        machineType,
        'online',
        locationId,
        orgId,
        41.28 + (Math.random() * 0.1),
        69.20 + (Math.random() * 0.1),
        JSON.stringify({ temperature: 4, lastSync: new Date().toISOString() }),
      ]);
    }
    console.log('✅ Machines created');

    // ===========================================
    // 7. SAMPLE LOYALTY TIERS
    // ===========================================
    const tiers = [
      { name: 'Базовый', level: 1, minPoints: 0, cashbackPercent: 1, bonusMultiplier: 1, color: 'gray' },
      { name: 'Серебряный', level: 2, minPoints: 1000, cashbackPercent: 2, bonusMultiplier: 1.5, color: 'silver' },
      { name: 'Золотой', level: 3, minPoints: 5000, cashbackPercent: 5, bonusMultiplier: 2, color: 'gold' },
      { name: 'Платиновый', level: 4, minPoints: 15000, cashbackPercent: 10, bonusMultiplier: 3, color: 'platinum' },
    ];

    for (const tier of tiers) {
      await queryRunner.query(`
        INSERT INTO loyalty_tiers (id, name, level, "minPoints", "maxPoints", "cashbackPercent", "bonusMultiplier", color, "organizationId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [
        uuid(),
        tier.name,
        tier.level,
        tier.minPoints,
        tier.level === 4 ? null : tiers[tier.level]?.minPoints - 1,
        tier.cashbackPercent,
        tier.bonusMultiplier,
        tier.color,
        orgId,
      ]);
    }
    console.log('✅ Loyalty tiers created');

    // ===========================================
    // 8. SAMPLE QUESTS
    // ===========================================
    const quests = [
      { title: 'Первая покупка', description: 'Сделайте первую покупку', type: 'achievement', target: 1, reward: 500 },
      { title: '3 покупки за день', description: 'Сделайте 3 покупки за один день', type: 'daily', target: 3, reward: 200 },
      { title: '10 покупок за неделю', description: 'Сделайте 10 покупок за неделю', type: 'weekly', target: 10, reward: 1000 },
      { title: 'Попробуй кофе', description: 'Купите любой кофейный напиток', type: 'daily', target: 1, reward: 100 },
      { title: 'Пригласи друга', description: 'Пригласите друга в приложение', type: 'achievement', target: 1, reward: 1000 },
    ];

    for (const quest of quests) {
      await queryRunner.query(`
        INSERT INTO quests (id, title, description, type, category, target, reward, "rewardType", status, "organizationId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, 'purchase', $5, $6, 'points', 'active', $7, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [uuid(), quest.title, quest.description, quest.type, quest.target, quest.reward, orgId]);
    }
    console.log('✅ Quests created');

    // ===========================================
    // 9. SAMPLE CONTRACTORS
    // ===========================================
    const contractors = [
      { name: 'TechServis LLC', type: 'repair', contact: 'Алишер Нурматов' },
      { name: 'CoffeeSupply UZ', type: 'supply', contact: 'Дильнора Каримова' },
      { name: 'CleanPro', type: 'cleaning', contact: 'Бобур Исмоилов' },
    ];

    for (const contractor of contractors) {
      await queryRunner.query(`
        INSERT INTO contractors (id, name, "contactPerson", email, phone, type, status, rating, "organizationId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, 'active', 4.5, $7, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [
        uuid(),
        contractor.name,
        contractor.contact,
        `${contractor.name.toLowerCase().replace(/\s/g, '')}@mail.uz`,
        `+9989${Math.floor(10000000 + Math.random() * 90000000)}`,
        contractor.type,
        orgId,
      ]);
    }
    console.log('✅ Contractors created');

    await queryRunner.commitTransaction();
    console.log('\n✅ Demo data seeding completed!');
    console.log('📧 Login: admin@vendhub.uz');
    console.log('🔑 Password: demo123456');

  } catch (error: any) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// CLI runner
if (require.main === module) {
  const { DataSource } = require('typeorm');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'vendhub',
    password: process.env.DB_PASSWORD || 'vendhub_secret',
    database: process.env.DB_NAME || 'vendhub',
  });

  dataSource.initialize()
    .then(() => seedDemoData(dataSource))
    .then(() => dataSource.destroy())
    .then(() => process.exit(0))
    .catch((err: Error) => {
      console.error(err);
      process.exit(1);
    });
}
