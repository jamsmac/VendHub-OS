/**
 * Reference Data Seeder for VendHub OS
 *
 * Seeds foundational reference data that must exist before any
 * organization-scoped data (VAT rates, package types, payment providers,
 * MXIK goods classifiers, IKPU codes).
 *
 * All inserts use ON CONFLICT (code) DO NOTHING for idempotency.
 *
 * Run: npm run db:seed
 */

import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export async function seedReferences(dataSource: DataSource): Promise<void> {
  // ========================================================================
  // 1. VAT RATES
  // ========================================================================
  const vatRates = [
    {
      code: 'STANDARD',
      rate: 12.0,
      name_ru: 'Стандартная ставка НДС (12%)',
      name_uz: 'Standart QQS stavkasi (12%)',
      description:
        'Стандартная ставка НДС для большинства товаров и услуг',
      is_default: true,
      is_active: true,
      sort_order: 1,
    },
    {
      code: 'REDUCED',
      rate: 0.0,
      name_ru: 'Нулевая ставка (экспорт)',
      name_uz: 'Nol stavka (eksport)',
      description: 'Нулевая ставка для экспортных операций',
      is_default: false,
      is_active: true,
      sort_order: 2,
    },
    {
      code: 'EXEMPT',
      rate: 0.0,
      name_ru: 'Освобождение от НДС',
      name_uz: 'QQSdan ozod qilish',
      description:
        'Освобождение от НДС для определённых категорий',
      is_default: false,
      is_active: true,
      sort_order: 3,
    },
    {
      code: 'SPECIAL_15',
      rate: 15.0,
      name_ru: 'Повышенная ставка НДС (15%)',
      name_uz: 'Oshirilgan QQS stavkasi (15%)',
      description: 'Повышенная ставка для отдельных категорий',
      is_default: false,
      is_active: true,
      sort_order: 4,
    },
  ];

  for (const vat of vatRates) {
    await dataSource.query(
      `
      INSERT INTO vat_rates (id, code, rate, name_ru, name_uz, description, is_default, is_active, sort_order, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING
    `,
      [
        uuidv4(),
        vat.code,
        vat.rate,
        vat.name_ru,
        vat.name_uz,
        vat.description,
        vat.is_default,
        vat.is_active,
        vat.sort_order,
      ],
    );
  }

  // ========================================================================
  // 2. PACKAGE TYPES
  // ========================================================================
  const packageTypes = [
    { code: 'PIECE', name_ru: 'Штука', name_uz: 'Dona', name_en: 'Piece', sort_order: 1 },
    { code: 'BOX', name_ru: 'Коробка', name_uz: 'Quti', name_en: 'Box', sort_order: 2 },
    { code: 'BOTTLE', name_ru: 'Бутылка', name_uz: 'Shisha', name_en: 'Bottle', sort_order: 3 },
    { code: 'CAN', name_ru: 'Банка', name_uz: 'Banka', name_en: 'Can', sort_order: 4 },
    { code: 'PACK', name_ru: 'Упаковка', name_uz: 'Qadoq', name_en: 'Pack', sort_order: 5 },
    { code: 'BAG', name_ru: 'Пакет', name_uz: 'Paket', name_en: 'Bag', sort_order: 6 },
    { code: 'CUP', name_ru: 'Стакан', name_uz: 'Stakan', name_en: 'Cup', sort_order: 7 },
    { code: 'SACHET', name_ru: 'Пакетик', name_uz: 'Paketcha', name_en: 'Sachet', sort_order: 8 },
    { code: 'TRAY', name_ru: 'Лоток', name_uz: 'Lotok', name_en: 'Tray', sort_order: 9 },
    { code: 'CARTON', name_ru: 'Картон', name_uz: 'Karton', name_en: 'Carton', sort_order: 10 },
  ];

  for (const pkg of packageTypes) {
    await dataSource.query(
      `
      INSERT INTO package_types (id, code, name_ru, name_uz, name_en, is_active, sort_order, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING
    `,
      [uuidv4(), pkg.code, pkg.name_ru, pkg.name_uz, pkg.name_en, pkg.sort_order],
    );
  }

  // ========================================================================
  // 3. PAYMENT PROVIDERS
  // ========================================================================
  const paymentProviders = [
    {
      code: 'payme',
      name: 'Payme',
      name_ru: 'Payme',
      name_uz: 'Payme',
      type: 'card',
      commission_rate: 1.0,
      is_active: true,
      is_default: true,
      supported_currencies: ['UZS'],
      sort_order: 1,
    },
    {
      code: 'click',
      name: 'Click',
      name_ru: 'Click',
      name_uz: 'Click',
      type: 'card',
      commission_rate: 0.8,
      is_active: true,
      is_default: false,
      supported_currencies: ['UZS'],
      sort_order: 2,
    },
    {
      code: 'uzum',
      name: 'Uzum Bank',
      name_ru: 'Uzum Bank',
      name_uz: 'Uzum Bank',
      type: 'card',
      commission_rate: 0.5,
      is_active: true,
      is_default: false,
      supported_currencies: ['UZS'],
      sort_order: 3,
    },
    {
      code: 'humo',
      name: 'HUMO',
      name_ru: 'HUMO',
      name_uz: 'HUMO',
      type: 'card',
      commission_rate: 0.9,
      is_active: true,
      is_default: false,
      supported_currencies: ['UZS'],
      sort_order: 4,
    },
    {
      code: 'uzcard',
      name: 'UZCARD',
      name_ru: 'UZCARD',
      name_uz: 'UZCARD',
      type: 'card',
      commission_rate: 0.8,
      is_active: true,
      is_default: false,
      supported_currencies: ['UZS'],
      sort_order: 5,
    },
    {
      code: 'cash',
      name: 'Cash',
      name_ru: 'Наличные',
      name_uz: 'Naqd pul',
      type: 'cash',
      commission_rate: 0.0,
      is_active: true,
      is_default: false,
      supported_currencies: ['UZS'],
      sort_order: 6,
    },
    {
      code: 'telegram_stars',
      name: 'Telegram Stars',
      name_ru: 'Telegram Stars',
      name_uz: 'Telegram Stars',
      type: 'telegram',
      commission_rate: 0.0,
      is_active: true,
      is_default: false,
      supported_currencies: ['XTR'],
      sort_order: 7,
    },
  ];

  for (const provider of paymentProviders) {
    await dataSource.query(
      `
      INSERT INTO payment_providers (id, code, name, name_ru, name_uz, type, commission_rate, is_active, is_default, supported_currencies, sort_order, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING
    `,
      [
        uuidv4(),
        provider.code,
        provider.name,
        provider.name_ru,
        provider.name_uz,
        provider.type,
        provider.commission_rate,
        provider.is_active,
        provider.is_default,
        JSON.stringify(provider.supported_currencies),
        provider.sort_order,
      ],
    );
  }

  // ========================================================================
  // 4. GOODS CLASSIFIERS (Sample MXIK codes for vending)
  // ========================================================================
  const goodsClassifiers = [
    // Beverages - carbonated
    { code: '10820001001000000', name_ru: 'Напитки газированные', name_uz: 'Gazlangan ichimliklar', name_en: 'Carbonated beverages', group_code: '108', group_name: 'Напитки', level: 3 },
    { code: '10820001002000000', name_ru: 'Кола и аналоги', name_uz: 'Kola va analoglar', name_en: 'Cola and similar', group_code: '108', group_name: 'Напитки', level: 4 },
    { code: '10820001003000000', name_ru: 'Лимонад', name_uz: 'Limonad', name_en: 'Lemonade', group_code: '108', group_name: 'Напитки', level: 4 },

    // Beverages - water
    { code: '10820002001000000', name_ru: 'Вода питьевая бутилированная', name_uz: 'Butilka ichimlik suvi', name_en: 'Bottled drinking water', group_code: '108', group_name: 'Напитки', level: 3 },
    { code: '10820002002000000', name_ru: 'Вода минеральная', name_uz: 'Mineral suv', name_en: 'Mineral water', group_code: '108', group_name: 'Напитки', level: 4 },

    // Beverages - juice
    { code: '10820003001000000', name_ru: 'Соки фруктовые', name_uz: 'Meva sharbatlari', name_en: 'Fruit juices', group_code: '108', group_name: 'Напитки', level: 3 },
    { code: '10820003002000000', name_ru: 'Нектар', name_uz: 'Nektar', name_en: 'Nectar', group_code: '108', group_name: 'Напитки', level: 4 },

    // Beverages - tea
    { code: '10820004001000000', name_ru: 'Чай холодный (айс-ти)', name_uz: 'Sovuq choy (ays-ti)', name_en: 'Iced tea', group_code: '108', group_name: 'Напитки', level: 4 },

    // Coffee
    { code: '01210001001000000', name_ru: 'Кофе растворимый', name_uz: 'Tezkor qahva', name_en: 'Instant coffee', group_code: '012', group_name: 'Кофе и чай', level: 3 },
    { code: '01210001002000000', name_ru: 'Кофе в зёрнах', name_uz: 'Donali qahva', name_en: 'Coffee beans', group_code: '012', group_name: 'Кофе и чай', level: 3 },
    { code: '01210001003000000', name_ru: 'Кофейный напиток 3в1', name_uz: '3in1 qahva ichimlik', name_en: 'Coffee drink 3-in-1', group_code: '012', group_name: 'Кофе и чай', level: 4 },

    // Snacks - chips
    { code: '10710001001000000', name_ru: 'Чипсы картофельные', name_uz: 'Kartoshka chipslari', name_en: 'Potato chips', group_code: '107', group_name: 'Снеки и закуски', level: 3 },
    { code: '10710001002000000', name_ru: 'Снеки кукурузные', name_uz: 'Makkajo\'xori snaklari', name_en: 'Corn snacks', group_code: '107', group_name: 'Снеки и закуски', level: 4 },

    // Confectionery - chocolate
    { code: '10721001001000000', name_ru: 'Шоколад плиточный', name_uz: 'Plitka shokolad', name_en: 'Chocolate bars', group_code: '107', group_name: 'Кондитерские изделия', level: 3 },
    { code: '10721001002000000', name_ru: 'Батончик шоколадный', name_uz: 'Shokolad batonchik', name_en: 'Chocolate candy bar', group_code: '107', group_name: 'Кондитерские изделия', level: 4 },
    { code: '10721001003000000', name_ru: 'Вафли шоколадные', name_uz: 'Shokoladli vaflalar', name_en: 'Chocolate wafers', group_code: '107', group_name: 'Кондитерские изделия', level: 4 },

    // Confectionery - cookies/crackers
    { code: '10721002001000000', name_ru: 'Печенье', name_uz: 'Pechene', name_en: 'Cookies', group_code: '107', group_name: 'Кондитерские изделия', level: 3 },
    { code: '10721002002000000', name_ru: 'Крекеры', name_uz: 'Krekerlar', name_en: 'Crackers', group_code: '107', group_name: 'Кондитерские изделия', level: 4 },

    // Confectionery - gum/candy
    { code: '10721003001000000', name_ru: 'Жевательная резинка', name_uz: 'Saqich', name_en: 'Chewing gum', group_code: '107', group_name: 'Кондитерские изделия', level: 3 },
    { code: '10721003002000000', name_ru: 'Леденцы', name_uz: 'Konfetlar', name_en: 'Hard candy', group_code: '107', group_name: 'Кондитерские изделия', level: 4 },
  ];

  for (const gc of goodsClassifiers) {
    await dataSource.query(
      `
      INSERT INTO goods_classifiers (id, code, name_ru, name_uz, name_en, group_code, group_name, level, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING
    `,
      [
        uuidv4(),
        gc.code,
        gc.name_ru,
        gc.name_uz,
        gc.name_en,
        gc.group_code,
        gc.group_name,
        gc.level,
      ],
    );
  }

  // ========================================================================
  // 5. IKPU CODES (Sample tax identification codes for vending products)
  // ========================================================================
  const ikpuCodes = [
    // Beverages
    { code: '10820001001000001', name_ru: 'Напитки газированные (безалк.)', name_uz: 'Gazlangan ichimliklar (alkogolsiz)', mxik_code: '10820001001000000', vat_rate: 12.0, is_marked: false, package_code: 'BOTTLE' },
    { code: '10820002001000001', name_ru: 'Вода питьевая (бутылка)', name_uz: 'Ichimlik suvi (shisha)', mxik_code: '10820002001000000', vat_rate: 12.0, is_marked: false, package_code: 'BOTTLE' },
    { code: '10820003001000001', name_ru: 'Сок фруктовый (тетрапак)', name_uz: 'Meva sharbati (tetrapak)', mxik_code: '10820003001000000', vat_rate: 12.0, is_marked: false, package_code: 'PACK' },
    { code: '10820004001000001', name_ru: 'Чай холодный (бутылка)', name_uz: 'Sovuq choy (shisha)', mxik_code: '10820004001000000', vat_rate: 12.0, is_marked: false, package_code: 'BOTTLE' },

    // Coffee
    { code: '01210001001000001', name_ru: 'Кофе растворимый (пакетик)', name_uz: 'Tezkor qahva (paketcha)', mxik_code: '01210001001000000', vat_rate: 12.0, is_marked: false, package_code: 'SACHET' },
    { code: '01210001003000001', name_ru: 'Кофе 3в1 (пакетик)', name_uz: '3in1 qahva (paketcha)', mxik_code: '01210001003000000', vat_rate: 12.0, is_marked: false, package_code: 'SACHET' },
    { code: '01210001002000001', name_ru: 'Кофе в зёрнах (пачка)', name_uz: 'Donali qahva (qadoq)', mxik_code: '01210001002000000', vat_rate: 12.0, is_marked: false, package_code: 'PACK' },

    // Snacks
    { code: '10710001001000001', name_ru: 'Чипсы (пакет)', name_uz: 'Chipslar (paket)', mxik_code: '10710001001000000', vat_rate: 12.0, is_marked: false, package_code: 'BAG' },
    { code: '10710001002000001', name_ru: 'Снеки кукурузные (пакет)', name_uz: 'Makkajo\'xori snaklari (paket)', mxik_code: '10710001002000000', vat_rate: 12.0, is_marked: false, package_code: 'BAG' },

    // Chocolate / Confectionery
    { code: '10721001001000001', name_ru: 'Шоколад плиточный (штука)', name_uz: 'Plitka shokolad (dona)', mxik_code: '10721001001000000', vat_rate: 12.0, is_marked: false, package_code: 'PIECE' },
    { code: '10721001002000001', name_ru: 'Батончик шоколадный (штука)', name_uz: 'Shokolad batonchik (dona)', mxik_code: '10721001002000000', vat_rate: 12.0, is_marked: false, package_code: 'PIECE' },
    { code: '10721001003000001', name_ru: 'Вафли (штука)', name_uz: 'Vaflalar (dona)', mxik_code: '10721001003000000', vat_rate: 12.0, is_marked: false, package_code: 'PIECE' },
    { code: '10721002001000001', name_ru: 'Печенье (упаковка)', name_uz: 'Pechene (qadoq)', mxik_code: '10721002001000000', vat_rate: 12.0, is_marked: false, package_code: 'PACK' },
    { code: '10721003001000001', name_ru: 'Жевательная резинка (пачка)', name_uz: 'Saqich (qadoq)', mxik_code: '10721003001000000', vat_rate: 12.0, is_marked: false, package_code: 'PIECE' },
  ];

  for (const ikpu of ikpuCodes) {
    await dataSource.query(
      `
      INSERT INTO ikpu_codes (id, code, name_ru, name_uz, mxik_code, vat_rate, is_marked, package_code, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING
    `,
      [
        uuidv4(),
        ikpu.code,
        ikpu.name_ru,
        ikpu.name_uz,
        ikpu.mxik_code,
        ikpu.vat_rate,
        ikpu.is_marked,
        ikpu.package_code,
      ],
    );
  }
}
