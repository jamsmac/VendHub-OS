/**
 * OLMA Example Seed — Config-driven location seed.
 *
 * This file demonstrates ONE location ("OLMA") via the generic SeedConfig
 * interface. It is NOT OLMA-specific: swap out OLMA_SEED for any other
 * SeedConfig to seed a different location.
 *
 * Run via: npm run db:seed
 * Or directly: ts-node src/database/seeds/run-seed.ts
 */

// ============================================================================
// SEED CONFIG INTERFACE
// ============================================================================

export interface SeedConfig {
  organization: {
    slug: string;
    name: string;
    publicEnabled?: boolean;
    settings?: Record<string, unknown>;
  };
  categories: Array<{
    code: string;
    name: string;
    icon?: string;
    color?: string;
    sortOrder?: number;
    defaultMarkup?: number;
  }>;
  suppliers: Array<{
    code: string;
    name: string;
    phone?: string;
    defaultPayment?: string;
  }>;
  locations: Array<{
    code: string;
    name: string;
    type: string;
    slug?: string;
    publicEnabled?: boolean;
    parentCode?: string; // references another location's code in this config
  }>;
  machines: Array<{
    code: string;
    name: string;
    type: string;
    locationCode: string; // references location's code in this config
    gridRows?: number;
    gridCols?: number;
  }>;
  products: Array<{
    sku: string;
    name: string;
    vol?: string;
    categoryCode: string;
    group: string;
    purchasePrice: number;
    sellingPrice: number;
    expectedSalesPerDay?: number;
    defaultSlotCapacity?: number;
    defaultSupplierCode: string;
    barcode?: string;
  }>;
}

// ============================================================================
// OLMA EXAMPLE CONFIG
// ============================================================================

export const OLMA_SEED: SeedConfig = {
  organization: {
    slug: "olma",
    name: "OLMA",
    publicEnabled: false,
    settings: {
      currency: "UZS",
      timezone: "Asia/Tashkent",
      language: "ru",
    },
  },

  // --------------------------------------------------------------------------
  // 8 CATEGORIES
  // --------------------------------------------------------------------------
  categories: [
    {
      code: "cola",
      name: "Cola",
      icon: "🥤",
      color: "#C0392B",
      sortOrder: 1,
      defaultMarkup: 100,
    },
    {
      code: "energy",
      name: "Energy",
      icon: "⚡",
      color: "#F39C12",
      sortOrder: 2,
      defaultMarkup: 52,
    },
    {
      code: "mojito",
      name: "Mojito",
      icon: "🍹",
      color: "#27AE60",
      sortOrder: 3,
      defaultMarkup: 53,
    },
    {
      code: "fresh",
      name: "Fresh",
      icon: "🍋",
      color: "#2ECC71",
      sortOrder: 4,
      defaultMarkup: 71,
    },
    {
      code: "tea",
      name: "Tea",
      icon: "🍵",
      color: "#8E44AD",
      sortOrder: 5,
      defaultMarkup: 65,
    },
    {
      code: "water",
      name: "Water",
      icon: "💧",
      color: "#2980B9",
      sortOrder: 6,
      defaultMarkup: 67,
    },
    {
      code: "bar",
      name: "Bar",
      icon: "🍫",
      color: "#6D4C41",
      sortOrder: 7,
      defaultMarkup: 60,
    },
    {
      code: "chips",
      name: "Chips",
      icon: "🍟",
      color: "#E67E22",
      sortOrder: 8,
      defaultMarkup: 75,
    },
  ],

  // --------------------------------------------------------------------------
  // 21 SUPPLIERS
  // --------------------------------------------------------------------------
  suppliers: [
    { code: "POSITI", name: "POSITI" },
    { code: "RED_BULL_UZ", name: "Red Bull UZ" },
    { code: "MARS_UZ", name: "Mars Uzbekistan" },
    { code: "INTL_BEV", name: "INTERNATIONAL BEV" },
    { code: "INTER_FOOD_PLUS", name: "INTER FOOD PLUS" },
    { code: "BILLUR_SUV", name: "BILLUR SUV" },
    { code: "NESTLE", name: "Nestle" },
    { code: "PEPSICO", name: "PepsiCo" },
    { code: "MONDELEZ", name: "Mondelez" },
    { code: "FERRERO", name: "Ferrero" },
    { code: "IDEAL_FUTURE", name: "Ideal Future Trade" },
    { code: "BIZNES_AZIYA", name: "BIZNES-AZIYA" },
    { code: "KELLOGG", name: "Kellogg" },
    { code: "OMAF_LOCAL", name: "Omaf local" },
    { code: "STROBAR", name: "Strobar" },
    { code: "VELONA", name: "Velona" },
    { code: "KONTI", name: "Konti" },
    { code: "CHEERS_LOCAL", name: "Cheers local" },
    { code: "SEVEN_DAYS", name: "7Days" },
    { code: "FLINT", name: "Flint" },
    { code: "ERMAK", name: "Ermak" },
  ],

  // --------------------------------------------------------------------------
  // 5 LOCATIONS  (warehouse + 2 storage + 2 machine points)
  // --------------------------------------------------------------------------
  locations: [
    {
      code: "wh_olma",
      name: "Склад OLMA",
      type: "warehouse",
    },
    {
      code: "st_icedrink",
      name: "Ice Drink · хранилище",
      type: "machine_storage",
      parentCode: "wh_olma",
    },
    {
      code: "st_snack",
      name: "Snack · хранилище",
      type: "machine_storage",
      parentCode: "wh_olma",
    },
    {
      code: "m_icedrink",
      name: "Ice Drink @ OLMA",
      type: "other",
      slug: "olma-icedrink",
      publicEnabled: false,
    },
    {
      code: "m_snack",
      name: "Snack @ OLMA",
      type: "other",
      slug: "olma-snack",
      publicEnabled: false,
    },
  ],

  // --------------------------------------------------------------------------
  // 2 MACHINES
  // --------------------------------------------------------------------------
  machines: [
    {
      code: "m_icedrink",
      name: "Ice Drink",
      type: "drink",
      locationCode: "m_icedrink",
      gridRows: 5,
      gridCols: 8,
    },
    {
      code: "m_snack",
      name: "Snack",
      type: "snack",
      locationCode: "m_snack",
      gridRows: 6,
      gridCols: 8,
    },
  ],

  // --------------------------------------------------------------------------
  // 40 PRODUCTS
  // --------------------------------------------------------------------------
  products: [
    // ── COLA ─────────────────────────────────────────────────────────────────
    {
      sku: "coca_025",
      name: "Coca-Cola Classic",
      vol: "0.25 CAN",
      categoryCode: "cola",
      group: "cola",
      purchasePrice: 5000,
      sellingPrice: 10000,
      expectedSalesPerDay: 5,
      defaultSlotCapacity: 12,
      defaultSupplierCode: "POSITI",
    },
    {
      sku: "coca_zero",
      name: "Coca-Cola Zero",
      vol: "0.25 CAN",
      categoryCode: "cola",
      group: "cola",
      purchasePrice: 5000,
      sellingPrice: 10000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 12,
      defaultSupplierCode: "POSITI",
    },
    {
      sku: "pepsi_025",
      name: "Pepsi",
      vol: "0.25 CAN",
      categoryCode: "cola",
      group: "cola",
      purchasePrice: 5000,
      sellingPrice: 10000,
      expectedSalesPerDay: 4,
      defaultSlotCapacity: 12,
      defaultSupplierCode: "INTL_BEV",
    },
    {
      sku: "fanta_025",
      name: "Fanta Orange",
      vol: "0.25 CAN",
      categoryCode: "cola",
      group: "cola",
      purchasePrice: 5000,
      sellingPrice: 10000,
      expectedSalesPerDay: 3,
      defaultSlotCapacity: 12,
      defaultSupplierCode: "POSITI",
    },
    {
      sku: "sprite_025",
      name: "Sprite",
      vol: "0.25 CAN",
      categoryCode: "cola",
      group: "cola",
      purchasePrice: 5000,
      sellingPrice: 10000,
      expectedSalesPerDay: 3,
      defaultSlotCapacity: 12,
      defaultSupplierCode: "POSITI",
    },

    // ── ENERGY ───────────────────────────────────────────────────────────────
    {
      sku: "redbull_025",
      name: "Red Bull",
      vol: "0.25 CAN",
      categoryCode: "energy",
      group: "energy",
      purchasePrice: 16500,
      sellingPrice: 25000,
      expectedSalesPerDay: 4,
      defaultSlotCapacity: 12,
      defaultSupplierCode: "RED_BULL_UZ",
    },
    {
      sku: "flashup_045",
      name: "Flash Up Energy",
      vol: "0.45 CAN",
      categoryCode: "energy",
      group: "energy",
      purchasePrice: 9167,
      sellingPrice: 15000,
      expectedSalesPerDay: 3,
      defaultSlotCapacity: 10,
      defaultSupplierCode: "INTER_FOOD_PLUS",
    },
    {
      sku: "plus18_033",
      name: "Plus 18",
      vol: "0.33 CAN",
      categoryCode: "energy",
      group: "energy",
      purchasePrice: 9990,
      sellingPrice: 15000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 12,
      defaultSupplierCode: "INTER_FOOD_PLUS",
    },

    // ── MOJITO ───────────────────────────────────────────────────────────────
    {
      sku: "moxito_lime",
      name: "Moxito Lime",
      vol: "0.5 CAN",
      categoryCode: "mojito",
      group: "mojito",
      purchasePrice: 9800,
      sellingPrice: 15000,
      expectedSalesPerDay: 3,
      defaultSlotCapacity: 10,
      defaultSupplierCode: "IDEAL_FUTURE",
    },
    {
      sku: "ozbegim_045",
      name: "O'zbegim Mojito",
      vol: "0.45 CAN",
      categoryCode: "mojito",
      group: "mojito",
      purchasePrice: 4000,
      sellingPrice: 7000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 10,
      defaultSupplierCode: "IDEAL_FUTURE",
    },

    // ── FRESH ────────────────────────────────────────────────────────────────
    {
      sku: "laimon_033",
      name: "Laimon Fresh",
      vol: "0.33 CAN",
      categoryCode: "fresh",
      group: "fresh",
      purchasePrice: 8000,
      sellingPrice: 15000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 12,
      defaultSupplierCode: "BIZNES_AZIYA",
    },
    {
      sku: "omaf_035",
      name: "Omaf",
      vol: "0.35 CAN",
      categoryCode: "fresh",
      group: "fresh",
      purchasePrice: 3500,
      sellingPrice: 6000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 10,
      defaultSupplierCode: "OMAF_LOCAL",
    },

    // ── TEA ──────────────────────────────────────────────────────────────────
    {
      sku: "fusetea",
      name: "Fuse Tea Mango",
      vol: "0.5 PET",
      categoryCode: "tea",
      group: "tea",
      purchasePrice: 6084,
      sellingPrice: 10000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "POSITI",
    },
    {
      sku: "lipton_025",
      name: "Lipton Lemon Tea",
      vol: "0.25 CAN",
      categoryCode: "tea",
      group: "tea",
      purchasePrice: 5800,
      sellingPrice: 10000,
      expectedSalesPerDay: 1,
      defaultSlotCapacity: 10,
      defaultSupplierCode: "INTL_BEV",
    },
    {
      sku: "fusetea_045",
      name: "Fuse Tea",
      vol: "0.45 CAN",
      categoryCode: "tea",
      group: "tea",
      purchasePrice: 6500,
      sellingPrice: 11000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 10,
      defaultSupplierCode: "POSITI",
    },

    // ── WATER ────────────────────────────────────────────────────────────────
    {
      sku: "borjomi",
      name: "Borjomi Mineral",
      vol: "0.33 CAN",
      categoryCode: "water",
      group: "water",
      purchasePrice: 9000,
      sellingPrice: 12000,
      expectedSalesPerDay: 3,
      defaultSlotCapacity: 12,
      defaultSupplierCode: "BILLUR_SUV",
    },
    {
      sku: "nesquick_025",
      name: "Nesquick Choco Milk",
      vol: "0.25 CAN",
      categoryCode: "water",
      group: "water",
      purchasePrice: 7000,
      sellingPrice: 12000,
      expectedSalesPerDay: 1,
      defaultSlotCapacity: 10,
      defaultSupplierCode: "NESTLE",
    },
    {
      sku: "water_still",
      name: "Bonaqua Still",
      vol: "0.5 PET",
      categoryCode: "water",
      group: "water",
      purchasePrice: 2500,
      sellingPrice: 5000,
      expectedSalesPerDay: 3,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "POSITI",
    },
    {
      sku: "water_gas",
      name: "Bonaqua Sparkling",
      vol: "0.5 PET",
      categoryCode: "water",
      group: "water",
      purchasePrice: 3000,
      sellingPrice: 5000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "POSITI",
    },

    // ── BAR ──────────────────────────────────────────────────────────────────
    {
      sku: "snickers",
      name: "Snickers",
      vol: "50g",
      categoryCode: "bar",
      group: "bar",
      purchasePrice: 5500,
      sellingPrice: 9000,
      expectedSalesPerDay: 3,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "MARS_UZ",
    },
    {
      sku: "twix",
      name: "Twix",
      vol: "55g",
      categoryCode: "bar",
      group: "bar",
      purchasePrice: 6500,
      sellingPrice: 10000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "MARS_UZ",
    },
    {
      sku: "bounty",
      name: "Bounty",
      vol: "57g",
      categoryCode: "bar",
      group: "bar",
      purchasePrice: 7000,
      sellingPrice: 10000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "MARS_UZ",
    },
    {
      sku: "kitkat",
      name: "KitKat",
      vol: "45g",
      categoryCode: "bar",
      group: "bar",
      purchasePrice: 8500,
      sellingPrice: 12000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "NESTLE",
    },
    {
      sku: "milkyway",
      name: "MilkyWay",
      vol: "21g",
      categoryCode: "bar",
      group: "bar",
      purchasePrice: 3500,
      sellingPrice: 6000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "MARS_UZ",
    },
    {
      sku: "picnic",
      name: "Picnic",
      vol: "38g",
      categoryCode: "bar",
      group: "bar",
      purchasePrice: 4500,
      sellingPrice: 7000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "MARS_UZ",
    },
    {
      sku: "kinder_bueno",
      name: "Kinder Bueno",
      vol: "43g",
      categoryCode: "bar",
      group: "bar",
      purchasePrice: 7500,
      sellingPrice: 11000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "FERRERO",
    },
    {
      sku: "strobar",
      name: "Strobar",
      vol: "40g",
      categoryCode: "bar",
      group: "bar",
      purchasePrice: 4500,
      sellingPrice: 7000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "STROBAR",
    },
    {
      sku: "barni",
      name: "Barni",
      vol: "30g",
      categoryCode: "bar",
      group: "bar",
      purchasePrice: 3500,
      sellingPrice: 6000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "MONDELEZ",
    },
    {
      sku: "oreo",
      name: "Oreo 4шт",
      vol: "44g",
      categoryCode: "bar",
      group: "bar",
      purchasePrice: 4000,
      sellingPrice: 7000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "MONDELEZ",
    },
    {
      sku: "super_contic",
      name: "Супер Контик",
      vol: "51g",
      categoryCode: "bar",
      group: "bar",
      purchasePrice: 3500,
      sellingPrice: 6000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "KONTI",
    },
    {
      sku: "velona",
      name: "Velona",
      vol: "40g",
      categoryCode: "bar",
      group: "bar",
      purchasePrice: 3000,
      sellingPrice: 5000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 6,
      defaultSupplierCode: "VELONA",
    },

    // ── CHIPS ─────────────────────────────────────────────────────────────────
    {
      sku: "lays_70",
      name: "Lay's",
      vol: "70g",
      categoryCode: "chips",
      group: "chips",
      purchasePrice: 6500,
      sellingPrice: 10000,
      expectedSalesPerDay: 3,
      defaultSlotCapacity: 6,
      defaultSupplierCode: "PEPSICO",
    },
    {
      sku: "cheers_130",
      name: "Cheers",
      vol: "130g",
      categoryCode: "chips",
      group: "chips",
      purchasePrice: 8000,
      sellingPrice: 12000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 6,
      defaultSupplierCode: "CHEERS_LOCAL",
    },
    {
      sku: "pringles",
      name: "Pringles",
      vol: "40g",
      categoryCode: "chips",
      group: "chips",
      purchasePrice: 12000,
      sellingPrice: 18000,
      expectedSalesPerDay: 1,
      defaultSlotCapacity: 6,
      defaultSupplierCode: "KELLOGG",
    },
    {
      sku: "tuc",
      name: "TUC печенье",
      vol: "100g",
      categoryCode: "chips",
      group: "chips",
      purchasePrice: 5000,
      sellingPrice: 8000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 6,
      defaultSupplierCode: "MONDELEZ",
    },
    {
      sku: "seven_days",
      name: "7Days круассан",
      vol: "60g",
      categoryCode: "chips",
      group: "chips",
      purchasePrice: 4500,
      sellingPrice: 7000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 6,
      defaultSupplierCode: "SEVEN_DAYS",
    },
    {
      sku: "flint",
      name: "Flint сухарики",
      vol: "80g",
      categoryCode: "chips",
      group: "chips",
      purchasePrice: 2500,
      sellingPrice: 5000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "FLINT",
    },
    {
      sku: "sushki_ermak",
      name: "Сушки Ermak",
      vol: "100g",
      categoryCode: "chips",
      group: "chips",
      purchasePrice: 3000,
      sellingPrice: 5000,
      expectedSalesPerDay: 1,
      defaultSlotCapacity: 6,
      defaultSupplierCode: "ERMAK",
    },
    {
      sku: "ermak_peanut",
      name: "Ermak арахис",
      vol: "40g",
      categoryCode: "chips",
      group: "chips",
      purchasePrice: 4500,
      sellingPrice: 7000,
      expectedSalesPerDay: 2,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "ERMAK",
    },
    {
      sku: "kurt_ermak",
      name: "Курт Ermak",
      vol: "6 шт",
      categoryCode: "chips",
      group: "chips",
      purchasePrice: 3000,
      sellingPrice: 5000,
      expectedSalesPerDay: 1,
      defaultSlotCapacity: 8,
      defaultSupplierCode: "ERMAK",
    },
  ],
};
