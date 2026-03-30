#!/usr/bin/env npx tsx
/**
 * Seed ALL data from old Supabase (VHM24) into VendHub OS PostgreSQL.
 *
 * Tables migrated:
 *   1. machines (19)       → machines table
 *   2. products (23)       → products table
 *   3. promotions (4)      → promo_codes table (where promo_code exists) + website_configs
 *   4. site_content (27)   → website_configs table
 *   5. partners (5)        → website_configs (section: general, key: partners_*)
 *   6. machine_types (3)   → website_configs (section: general, key: machine_types_*)
 *   7. loyalty_tiers (4)   → website_configs (section: general, key: loyalty_tiers)
 *   8. loyalty_privileges (8) → website_configs (section: general, key: loyalty_privileges)
 *   9. bonus_actions (11)  → website_configs (section: general, key: bonus_actions)
 *  10. partnership_models (4) → website_configs (section: general, key: partnership_models)
 *  11. cooperation_requests (2) → skipped (test data)
 *
 * Usage:
 *   npx tsx scripts/seed-all-from-supabase.ts
 *
 * Prerequisites: Docker postgres must be running on port 24266.
 */

import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

// ======================================================================
// 1. MACHINES DATA (19 records)
// ======================================================================
const OLD_MACHINES = [
  {
    id: "4fb6256d-2950-43cc-a44e-7b85615098b6",
    name: "SOLIQ INSPEKTSIYASI Olmazor tumani",
    address: "Сагбон 12-й проезд 2-й тупик, 1/1",
    address_uz: "Sagbon 12-chi o'tish 2-chi ko'cha, 1/1",
    type: "coffee",
    status: "online",
    latitude: 41.3604,
    longitude: 69.2273,
    rating: 4.8,
    review_count: 42,
    product_count: 14,
    floor: "1",
    hours: "24/7",
    has_promotion: true,
    location_type: "government",
  },
  {
    id: "b1565cd8-aa0b-4676-9ee6-62def0dfbd5a",
    name: "Grand Clinic",
    address: "Тикланиш, 1а",
    address_uz: "Tiklanish, 1a",
    type: "coffee",
    status: "online",
    latitude: 41.3741,
    longitude: 69.2613,
    rating: 4.8,
    review_count: 52,
    product_count: 14,
    floor: "1",
    hours: "24/7",
    has_promotion: false,
    location_type: "hospital",
  },
  {
    id: "70dd65b7-4856-4bda-9ceb-07cf709e6050",
    name: "KIUT CLINIC",
    address: "Бунёдкор проспект, 19",
    address_uz: "Bunyodkor prospekti, 19",
    type: "coffee",
    status: "online",
    latitude: 41.2582,
    longitude: 69.1908,
    rating: 4.7,
    review_count: 41,
    product_count: 13,
    floor: "1",
    hours: "24/7",
    has_promotion: false,
    location_type: "hospital",
  },
  {
    id: "7991d0b6-6af2-4bbb-b6a2-c1ca83e78de0",
    name: "Parus F1",
    address: "Катартал, 60а/1",
    address_uz: "Qatartal, 60a/1",
    type: "coffee",
    status: "online",
    latitude: 41.2919,
    longitude: 69.2111,
    rating: 4.7,
    review_count: 39,
    product_count: 14,
    floor: "1",
    hours: "24/7",
    has_promotion: false,
    location_type: "residential",
  },
  {
    id: "c561e8ed-4247-4473-97b3-44770e37384b",
    name: "Parus F4",
    address: "Катартал, 60а/1",
    address_uz: "Qatartal, 60a/1",
    type: "coffee",
    status: "online",
    latitude: 41.2919,
    longitude: 69.2111,
    rating: 4.6,
    review_count: 27,
    product_count: 13,
    floor: "4",
    hours: "24/7",
    has_promotion: false,
    location_type: "residential",
  },
  {
    id: "715862ab-ce0a-41d1-9635-fbf5b9436b39",
    name: "KIUT M corpus",
    address: "Бунёдкор проспект, 19",
    address_uz: "Bunyodkor prospekti, 19",
    type: "coffee",
    status: "online",
    latitude: 41.2585,
    longitude: 69.1909,
    rating: 4.6,
    review_count: 47,
    product_count: 14,
    floor: "1",
    hours: "24/7",
    has_promotion: true,
    location_type: "university",
  },
  {
    id: "bcc3a535-d331-486d-90db-4f748bbf25bf",
    name: "KIUT Yotoqxona",
    address: "Махалля Яккабог",
    address_uz: "Yakkabog mahallasi",
    type: "coffee",
    status: "online",
    latitude: 41.2595,
    longitude: 69.1912,
    rating: 4.5,
    review_count: 34,
    product_count: 12,
    floor: "1",
    hours: "24/7",
    has_promotion: false,
    location_type: "university",
  },
  {
    id: "c15dec45-ea18-4d1c-922d-9f95bb17152f",
    name: "SOLIQ INSPEKTSIYASI Yashnobod tumani",
    address: "Шахрисабзская улица, 85",
    address_uz: "Shahrisabz ko'chasi, 85",
    type: "coffee",
    status: "online",
    latitude: 41.3077,
    longitude: 69.2857,
    rating: 4.7,
    review_count: 38,
    product_count: 14,
    floor: "1",
    hours: "24/7",
    has_promotion: true,
    location_type: "government",
  },
  {
    id: "9d7ccad2-8d20-419c-9870-d3ae26940984",
    name: "KARDIOLOGIYA MARKAZI 4-bino",
    address: "Осиё улица, 4к4",
    address_uz: "Osiyo ko'chasi, 4-bino 4-korpus",
    type: "coffee",
    status: "online",
    latitude: 41.3236,
    longitude: 69.3,
    rating: 4.7,
    review_count: 31,
    product_count: 13,
    floor: "1",
    hours: "24/7",
    has_promotion: false,
    location_type: "hospital",
  },
  {
    id: "90355a3e-fdd1-4c94-ad6d-1488d31ce1d4",
    name: "KARDIOLOGIYA MARKAZI KPP",
    address: "Осиё улица",
    address_uz: "Osiyo ko'chasi",
    type: "coffee",
    status: "online",
    latitude: 41.3247,
    longitude: 69.2994,
    rating: 4.9,
    review_count: 67,
    product_count: 14,
    floor: "1",
    hours: "24/7",
    has_promotion: true,
    location_type: "hospital",
  },
  {
    id: "2b97a135-1c9b-4875-8c7e-c13cef4f47be",
    name: "KIMYO University Janubiy",
    address: "Улица Шота Руставели, 156",
    address_uz: "Shota Rustaveli ko'chasi, 156",
    type: "coffee",
    status: "online",
    latitude: 41.2584,
    longitude: 69.2206,
    rating: 4.6,
    review_count: 63,
    product_count: 14,
    floor: "1",
    hours: "24/7",
    has_promotion: false,
    location_type: "university",
  },
  {
    id: "6e17e0de-74f6-4b10-afce-e3503a131eb7",
    name: "KARDIOLOGIYA MARKAZI 2-bino",
    address: "Осиё улица, 4к2",
    address_uz: "Osiyo ko'chasi, 4-bino 2-korpus",
    type: "coffee",
    status: "online",
    latitude: 41.3741,
    longitude: 69.2613,
    rating: 4.8,
    review_count: 45,
    product_count: 13,
    floor: "1",
    hours: "24/7",
    has_promotion: false,
    location_type: "hospital",
  },
  {
    id: "7b8d6dd8-6c10-4308-b75d-89189291ea47",
    name: "ZIYO market",
    address: "Юнусабад 19-й квартал",
    address_uz: "Yunusobod 19-kvartal",
    type: "coffee",
    status: "online",
    latitude: 41.3775,
    longitude: 69.3203,
    rating: 4.6,
    review_count: 55,
    product_count: 15,
    floor: "1",
    hours: "24/7",
    has_promotion: false,
    location_type: "market",
  },
  {
    id: "037226d1-4803-4765-8114-7e1714905055",
    name: "American Hospital",
    address: "Икбол, 14",
    address_uz: "Iqbol, 14",
    type: "coffee",
    status: "online",
    latitude: 41.3736,
    longitude: 69.3241,
    rating: 4.9,
    review_count: 78,
    product_count: 15,
    floor: "1",
    hours: "24/7",
    has_promotion: true,
    location_type: "hospital",
  },
  {
    id: "19922b9f-693e-4503-8a3f-173933b7fdb2",
    name: "DUNYO Supermarket",
    address: "Асалабад-2 жилмассив, 19",
    address_uz: "Asalobod-2 turar-joy majmuasi, 19",
    type: "coffee",
    status: "online",
    latitude: 41.2829,
    longitude: 69.3369,
    rating: 4.5,
    review_count: 29,
    product_count: 12,
    floor: "1",
    hours: "24/7",
    has_promotion: false,
    location_type: "market",
  },
  {
    id: "b2b46ab2-a6e3-48e2-bd8e-9c5e661ba075",
    name: "KIUT Kutubxona",
    address: "Махалля Яккабог",
    address_uz: "Yakkabog mahallasi",
    type: "coffee",
    status: "online",
    latitude: 41.2594,
    longitude: 69.1909,
    rating: 4.8,
    review_count: 56,
    product_count: 13,
    floor: "10",
    hours: "24/7",
    has_promotion: false,
    location_type: "university",
  },
  {
    id: "3a7d8449-2872-40c5-971a-44cdd3407ce2",
    name: "O'ZBEKISTON POCHTASI",
    address: "ул. ШАХРИСАБЗ, 7",
    address_uz: "SHAHRISABZ ko'chasi, 7",
    type: "coffee",
    status: "online",
    latitude: 41.3166,
    longitude: 69.2839,
    rating: 0,
    review_count: 0,
    product_count: 10,
    floor: "1",
    hours: "24/7",
    has_promotion: false,
    location_type: "government",
  },
  {
    id: "0cad9b3d-6990-4850-9b2d-6ffc2e4a27a6",
    name: "VendHub Cold Drinks",
    address: "Бунёдкор проспект, 19",
    address_uz: "Bunyodkor prospekti, 19",
    type: "cold",
    status: "offline",
    latitude: 41.3111,
    longitude: 69.2797,
    rating: 4.7,
    review_count: 45,
    product_count: 12,
    floor: "1 этаж",
    hours: "24/7",
    has_promotion: false,
    location_type: "university",
  },
  {
    id: "82abf6ef-f5fe-4cf8-8d2c-d7bc9ad45aea",
    name: "O'ZBEKISTON POCHTASI",
    address: "улица Шахрисабз, 7",
    address_uz: "SHAHRISABZ ko'chasi, 7",
    type: "coffee",
    status: "online",
    latitude: 41.3167,
    longitude: 69.2844,
    rating: 0,
    review_count: 0,
    product_count: 15,
    floor: "1",
    hours: "24/7",
    has_promotion: true,
    location_type: "government",
  },
];

// ======================================================================
// 2. PRODUCTS DATA (23 records)
// ======================================================================
const OLD_PRODUCTS = [
  {
    id: "46458bec-1633-4028-959d-f2017598cab0",
    name: "ESPRESSO",
    name_uz: "Espresso",
    price: 25000,
    category: "coffee",
    temperature: "hot",
    popular: true,
    available: true,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/espresso.png",
    description: "Классический крепкий эспрессо",
    description_uz: "Klassik kuchli espresso",
    rating: 4.8,
    options: [
      { name: "С сахаром", price: 44, temperature: "hot" },
      { name: "Без сахара", price: 0, temperature: "hot" },
    ],
    is_new: false,
    discount_percent: null,
    sort_order: 1,
    detail_description:
      "100% арабика. Концентрированный кофе, приготовленный под высоким давлением. Насыщенный вкус с плотной крема-пенкой.",
    detail_description_uz:
      "100% arabika. Yuqori bosim ostida tayyorlangan konsentrlangan qahva. Boy ta'm va qalin krema ko'pik bilan.",
    calories: 5,
  },
  {
    id: "a6428859-8911-429a-bd37-5530a805936f",
    name: "AMERICANO",
    name_uz: "Americano",
    price: 25000,
    category: "coffee",
    temperature: "both",
    popular: true,
    available: true,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/americano.png",
    description: "Эспрессо с горячей водой",
    description_uz: "Espresso issiq suv bilan",
    rating: 4.7,
    options: [
      { name: "С сахаром", price: 0, temperature: "hot" },
      { name: "Без сахара", price: 0, temperature: "hot" },
      { name: "Ванильный", price: 0, temperature: "hot" },
      { name: "Карамельный", price: 0, temperature: "hot" },
      { name: "Без сахара", price: 0, temperature: "cold" },
      { name: "Ванильный", price: 0, temperature: "cold" },
      { name: "Карамельный", price: 0, temperature: "cold" },
    ],
    is_new: false,
    discount_percent: null,
    sort_order: 2,
    detail_description:
      "Эспрессо, разбавленный горячей водой. Мягкий вкус с лёгкой кислинкой.",
    detail_description_uz:
      "Issiq suv bilan suyultirilgan espresso. Engil nordonlik bilan yumshoq ta'm.",
    calories: 15,
  },
  {
    id: "54466756-43aa-4def-8202-96d9648db133",
    name: "CAPUCCINO",
    name_uz: "Cappuccino",
    price: 25000,
    category: "coffee",
    temperature: "both",
    popular: true,
    available: true,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/cappuccino.png",
    description: "Эспрессо с молочной пенкой",
    description_uz: "Espresso sutli ko'pik bilan",
    rating: 4.9,
    options: [
      { name: "С сахаром", price: 0, temperature: "hot" },
      { name: "Без сахара", price: 0, temperature: "hot" },
      { name: "Ванильный", price: 0, temperature: "hot" },
      { name: "Карамельный", price: 0, temperature: "hot" },
      { name: "Кокосовый", price: 0, temperature: "hot" },
      { name: "Без сахара", price: 0, temperature: "cold" },
      { name: "Ванильный", price: 0, temperature: "cold" },
      { name: "Карамельный", price: 0, temperature: "cold" },
      { name: "Кокосовый", price: 0, temperature: "cold" },
    ],
    is_new: false,
    discount_percent: null,
    sort_order: 3,
    detail_description: "Эспрессо с пышной молочной пенкой в пропорции 1:1:1.",
    detail_description_uz: "1:1:1 nisbatda sut ko'pigi bilan espresso.",
    calories: 120,
  },
  {
    id: "0822fad1-21ca-4d5c-95f7-4dd31f9224b6",
    name: "LATTE",
    name_uz: "Latte",
    price: 25000,
    category: "coffee",
    temperature: "both",
    popular: true,
    available: true,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/latte.png",
    description: "Эспрессо с большим количеством молока",
    description_uz: "Espresso ko'p miqdorda sut bilan",
    rating: 4.8,
    options: [
      { name: "С сахаром", price: 0, temperature: "hot" },
      { name: "Без сахара", price: 0, temperature: "hot" },
      { name: "Ванильный", price: 0, temperature: "hot" },
      { name: "Карамельный", price: 0, temperature: "hot" },
      { name: "Кокосовый", price: 0, temperature: "hot" },
      { name: "Без сахара", price: 0, temperature: "cold" },
      { name: "Ванильный", price: 0, temperature: "cold" },
      { name: "Карамельный", price: 0, temperature: "cold" },
      { name: "Кокосовый", price: 0, temperature: "cold" },
    ],
    is_new: false,
    discount_percent: null,
    sort_order: 4,
    detail_description: "Эспрессо с большим количеством вспененного молока.",
    detail_description_uz: "Ko'p miqdorda ko'pikli sut bilan espresso.",
    calories: 150,
  },
  {
    id: "205d31a2-c635-45c4-91aa-fabcd37ab7eb",
    name: "MOCCO",
    name_uz: "MOCCO",
    price: 25000,
    category: "coffee",
    temperature: "hot",
    popular: false,
    available: true,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/products/80c687e4-4de6-4c89-992a-2e95ba395e11.jpg",
    description: "Эспрессо с шоколадом и молоком",
    description_uz: "Espresso shokolad va sut bilan",
    rating: 4.6,
    options: [{ name: "Мокко", price: 0, temperature: "hot" }],
    is_new: false,
    discount_percent: null,
    sort_order: 5,
    detail_description: "Эспрессо с горячим шоколадом и молоком.",
    detail_description_uz: "Issiq shokolad va sut bilan espresso.",
    calories: 180,
  },
  {
    id: "3f960ca6-ee2b-44ba-8707-1214c5e00286",
    name: "FLAT WHITE",
    name_uz: "Flat White",
    price: 25000,
    category: "coffee",
    temperature: "hot",
    popular: false,
    available: true,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/flat-white.png",
    description: "Двойной эспрессо с бархатистым молоком",
    description_uz: "Ikki espresso baxmal sut bilan",
    rating: 4.7,
    options: [{ name: "Флэт Уайт", price: 0, temperature: "hot" }],
    is_new: false,
    discount_percent: null,
    sort_order: 6,
    detail_description: "Двойной эспрессо с тонким слоем бархатистого молока.",
    detail_description_uz: "Yupqa baxmal sut qatlami bilan ikki espresso.",
    calories: 120,
  },
  {
    id: "e910effa-5341-4fba-ac1d-22001008cb5f",
    name: "MacCoffee 3-in-1",
    name_uz: "MacCoffee 3-in-1",
    price: 10000,
    category: "coffee",
    temperature: "hot",
    popular: false,
    available: true,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/maccoffee.png",
    description: "Растворимый кофе 3-в-1",
    description_uz: "Tezkor qahva 3-in-1",
    rating: 4.2,
    options: [{ name: "Maccoffee 3-в-1", price: 0, temperature: "hot" }],
    is_new: false,
    discount_percent: null,
    sort_order: 7,
    detail_description: "Растворимый кофе с сухим молоком и сахаром.",
    detail_description_uz: "Quruq sut va shakar bilan tezkor qahva.",
    calories: 90,
  },
  {
    id: "af3a6392-4c19-4d5b-8026-42b9faacafec",
    name: "ICE LATTE",
    name_uz: "Ice Latte",
    price: 25000,
    category: "coffee",
    temperature: "cold",
    popular: true,
    available: true,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/ice-latte.png",
    description: "Холодный латте со льдом",
    description_uz: "Muzli sovuq latte",
    rating: 4.8,
    options: [
      { name: "Без сахара", price: 0, temperature: "cold" },
      { name: "Ванильный", price: 0, temperature: "cold" },
      { name: "Карамельный", price: 0, temperature: "cold" },
      { name: "Кокосовый", price: 0, temperature: "cold" },
    ],
    is_new: false,
    discount_percent: null,
    sort_order: 8,
    detail_description: "Холодный латте со льдом.",
    detail_description_uz: "Muzli sovuq latte.",
    calories: 140,
  },
  {
    id: "7d2e95e4-beaf-4f29-835e-e678521c0d96",
    name: "ICE AMERICANO",
    name_uz: "Ice Americano",
    price: 25000,
    category: "coffee",
    temperature: "cold",
    popular: false,
    available: true,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/ice-americano.png",
    description: "Холодный американо со льдом",
    description_uz: "Muzli sovuq americano",
    rating: 4.6,
    options: [
      { name: "Без сахара", price: 0, temperature: "cold" },
      { name: "Ванильный", price: 0, temperature: "cold" },
      { name: "Карамельный", price: 0, temperature: "cold" },
    ],
    is_new: false,
    discount_percent: null,
    sort_order: 9,
    detail_description: "Холодный американо со льдом.",
    detail_description_uz: "Muzli sovuq americano.",
    calories: 10,
  },
  {
    id: "831c3598-f79e-4f05-8f4e-ff063d419648",
    name: "Колд Брю",
    name_uz: "Kold Bryu",
    price: 22000,
    category: "coffee",
    temperature: "cold",
    popular: false,
    available: false,
    image_url: null,
    description: "Кофе холодного заваривания",
    description_uz: "Sovuq ekstraksiya qahvasi",
    rating: 4.7,
    options: [
      { name: "Без сахара", price: 0, temperature: "cold" },
      { name: "Ванильный", price: 0, temperature: "cold" },
      { name: "Карамельный", price: 0, temperature: "cold" },
    ],
    is_new: false,
    discount_percent: null,
    sort_order: 10,
    detail_description: "Кофе холодной экстракции (12+ часов).",
    detail_description_uz: "Sovuq ekstraksiya qahvasi (12+ soat).",
    calories: 5,
  },
  {
    id: "3fa4b87b-70ce-4560-a96c-3b3441c31958",
    name: "Чай с лимоном",
    name_uz: "Limonli choy",
    price: 10000,
    category: "tea",
    temperature: "hot",
    popular: false,
    available: true,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/tea-lemon.png",
    description: "Чёрный чай с лимоном",
    description_uz: "Limonli qora choy",
    rating: 4.5,
    options: [
      { name: "Чай с лимоном", price: 0, temperature: "hot" },
      { name: "Чай с лимоном", price: 0, temperature: "cold" },
    ],
    is_new: false,
    discount_percent: null,
    sort_order: 11,
    detail_description: "Чёрный чай с натуральным лимоном.",
    detail_description_uz: "Tabiiy limon bilan qora choy.",
    calories: 25,
  },
  {
    id: "02a7203e-211a-4dc9-beb8-2f2ee05ea0f0",
    name: "Чай фруктовый",
    name_uz: "Mevali choy",
    price: 15000,
    category: "tea",
    temperature: "hot",
    popular: false,
    available: true,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/tea-fruit.png",
    description: "Ароматный фруктовый чай",
    description_uz: "Xushbo'y mevali choy",
    rating: 4.4,
    options: [
      { name: "Чай фруктовый", price: 0, temperature: "hot" },
      { name: "Чай фруктовый ICE", price: 0, temperature: "cold" },
    ],
    is_new: false,
    discount_percent: null,
    sort_order: 12,
    detail_description: "Ароматный фруктовый чай из натуральных ингредиентов.",
    detail_description_uz: "Tabiiy ingrediyentlardan xushbo'y mevali choy.",
    calories: 35,
  },
  {
    id: "9aa580fa-8fb3-4e68-861d-9e144c22e076",
    name: "Matcha Latte",
    name_uz: "Matcha Latte",
    price: 30000,
    category: "tea",
    temperature: "both",
    popular: false,
    available: true,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/matcha-latte.png",
    description: "Японский чай матча с молоком",
    description_uz: "Yaponiya matcha choyi sut bilan",
    rating: 4.6,
    options: [{ name: "Матча Латте", price: 0, temperature: "hot" }],
    is_new: true,
    discount_percent: null,
    sort_order: 13,
    detail_description: "Японский зелёный чай матча, взбитый с молоком.",
    detail_description_uz: "Sut bilan ko'pirilgan yapon yashil matcha choyi.",
    calories: 160,
  },
  {
    id: "5881581a-d615-4778-864e-6c27b8a18225",
    name: "Какао",
    name_uz: "Kakao",
    price: 20000,
    category: "other",
    temperature: "hot",
    popular: false,
    available: true,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/cocoa.png",
    description: "Горячее какао с молоком",
    description_uz: "Sutli issiq kakao",
    rating: 4.5,
    options: [{ name: "Какао", price: 0, temperature: "hot" }],
    is_new: false,
    discount_percent: null,
    sort_order: 14,
    detail_description: "Горячее какао с молоком.",
    detail_description_uz: "Sutli issiq kakao.",
    calories: 190,
  },
  {
    id: "465adafa-2482-4856-af50-e226146b1464",
    name: "Горячий шоколад",
    name_uz: "Issiq shokolad",
    price: 20000,
    category: "coffee",
    temperature: "hot",
    popular: false,
    available: true,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/products/e267eebf-9455-4b05-a5ab-d4d27b4024de.jpg",
    description: "Насыщенный горячий шоколад с молоком",
    description_uz: "Sutli issiq shokolad",
    rating: 4.8,
    options: [{ name: "Горячий шоколад", price: 0, temperature: "hot" }],
    is_new: false,
    discount_percent: null,
    sort_order: 15,
    detail_description:
      "Насыщенный горячий шоколад из настоящего какао с молоком.",
    detail_description_uz: "Haqiqiy kakaodan sut bilan boy issiq shokolad.",
    calories: 200,
  },
  {
    id: "f6407c83-3286-44dc-8042-341aa2d1d45c",
    name: "Лёд",
    name_uz: "Muz",
    price: 10000,
    category: "other",
    temperature: "cold",
    popular: false,
    available: true,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/ice.png",
    description: "Порция льда",
    description_uz: "Bir porsiya muz",
    rating: 4.0,
    options: [{ name: "Лёд", price: 0, temperature: "cold" }],
    is_new: false,
    discount_percent: null,
    sort_order: 15,
    detail_description: "Порция кубиков льда для любого напитка.",
    detail_description_uz:
      "Har qanday ichimlik uchun muz bo'laklari porsiyasi.",
    calories: 0,
  },
  {
    id: "50ec886f-a3da-4e30-85c3-b6efc33e8e75",
    name: "Вода",
    name_uz: "Suv",
    price: 5000,
    category: "snack",
    temperature: "cold",
    popular: false,
    available: false,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/water.png",
    description: "Питьевая вода",
    description_uz: "Ichimlik suvi",
    rating: 4.3,
    options: [{ name: "Вода", price: 0, temperature: "cold" }],
    is_new: false,
    discount_percent: null,
    sort_order: 16,
    detail_description: "Чистая питьевая вода.",
    detail_description_uz: "Toza ichimlik suvi.",
    calories: 0,
  },
  {
    id: "019b8e35-13cb-4a48-a23b-a09246e871fd",
    name: "Кола",
    name_uz: "Kola",
    price: 8000,
    category: "snack",
    temperature: "cold",
    popular: false,
    available: false,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/cola.png",
    description: "Газированный напиток",
    description_uz: "Gazlangan ichimlik",
    rating: 4.4,
    options: [{ name: "Кола", price: 0, temperature: "cold" }],
    is_new: false,
    discount_percent: null,
    sort_order: 17,
    detail_description: "Классический газированный напиток.",
    detail_description_uz: "Klassik gazlangan ichimlik.",
    calories: 139,
  },
  {
    id: "933911ee-a5e5-44a0-9f9c-ecf3800bc0d0",
    name: "Сок апельсин",
    name_uz: "Apelsin sharbati",
    price: 10000,
    category: "snack",
    temperature: "cold",
    popular: false,
    available: false,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/orange-juice.png",
    description: "Апельсиновый сок",
    description_uz: "Tabiiy apelsin sharbati",
    rating: 4.5,
    options: [{ name: "Сок апельсин", price: 0, temperature: "cold" }],
    is_new: false,
    discount_percent: null,
    sort_order: 18,
    detail_description: "Натуральный апельсиновый сок.",
    detail_description_uz: "Tabiiy apelsin sharbati.",
    calories: 112,
  },
  {
    id: "1421071e-d2e1-4c44-990f-38af9ce6dd1f",
    name: "Шоколадный батончик",
    name_uz: "Shokolad batoncik",
    price: 7000,
    category: "snack",
    temperature: "none",
    popular: false,
    available: false,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/chocolate-bar.png",
    description: "Шоколадный батончик",
    description_uz: "Sutli shokolad batoncik",
    rating: 4.3,
    options: [{ name: "Шоколадный батончик", price: 0, temperature: "cold" }],
    is_new: false,
    discount_percent: null,
    sort_order: 19,
    detail_description: "Шоколадный батончик — сладкий перекус к кофе.",
    detail_description_uz: "Shokolad batoncik — qahvaga shirin gazak.",
    calories: 230,
  },
  {
    id: "4dbc5e8e-18e3-49cd-94a3-9bc915dbb3e3",
    name: "Чипсы",
    name_uz: "Chipslar",
    price: 8000,
    category: "snack",
    temperature: "none",
    popular: false,
    available: false,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/chips.png",
    description: "Картофельные чипсы",
    description_uz: "Kartoshka chipslari",
    rating: 4.2,
    options: [{ name: "Чипсы", price: 0, temperature: "cold" }],
    is_new: false,
    discount_percent: null,
    sort_order: 20,
    detail_description: "Хрустящие картофельные чипсы.",
    detail_description_uz: "Qarsildoq kartoshka chipslari.",
    calories: 270,
  },
  {
    id: "2b6cf27c-bd39-4249-97cd-cc75b61f347d",
    name: "Круассан",
    name_uz: "Kruassan",
    price: 12000,
    category: "snack",
    temperature: "none",
    popular: false,
    available: false,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/croissant.png",
    description: "Свежий круассан",
    description_uz: "Yangi kruassan",
    rating: 4.6,
    options: [{ name: "Круассан", price: 0, temperature: "cold" }],
    is_new: false,
    discount_percent: null,
    sort_order: 21,
    detail_description: "Свежий слоёный круассан с маслом.",
    detail_description_uz: "Sariyog'li yangi qatlamali kruassan.",
    calories: 310,
  },
  {
    id: "1bca47d5-5a5b-4859-94c2-ae2ca1756c96",
    name: "Фраппе",
    name_uz: "Frappe",
    price: 26000,
    category: "coffee",
    temperature: "cold",
    popular: false,
    available: false,
    image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/frappe.png",
    description: "Холодный кофейный напиток с пенкой",
    description_uz: "Ko'pikli sovuq qahva ichimligi",
    rating: 4.5,
    options: [{ name: "Фраппе", price: 0, temperature: "cold" }],
    is_new: false,
    discount_percent: null,
    sort_order: 22,
    detail_description: "Холодный кофейный напиток с ледяной пенкой.",
    detail_description_uz: "Muzli ko'pikli sovuq qahva ichimligi.",
    calories: 220,
  },
];

// ======================================================================
// 3. PROMOTIONS DATA (4 records)
// ======================================================================
const OLD_PROMOTIONS = [
  {
    id: "8d636cb2-7b09-4f80-b0fd-bc24f98e9d32",
    title: "Скидка 20% на всё меню",
    badge: "Популярное",
    description:
      "Используйте промокод COFFEE20 и получите скидку 20% на любой напиток",
    promo_code: "COFFEE20",
    gradient: "from-red-500 to-rose-600",
    conditions: [
      "Все напитки",
      "Не суммируется с другими скидками",
      "Один раз на пользователя",
    ],
    valid_until: "2026-03-15",
    is_active: true,
    sort_order: 1,
    title_uz: "Butun menyuga 20% chegirma",
    description_uz:
      "COFFEE20 promokodidan foydalaning va istalgan ichimlikka 20% chegirma oling",
  },
  {
    id: "af2ab708-f017-435b-8f4e-67d019bacf80",
    title: "Комбо: Капучино + Круассан",
    badge: "Выгодно",
    description: "45 000 → 30 000 UZS",
    promo_code: null,
    gradient: "from-purple-500 to-violet-600",
    conditions: ["Капучино 300мл + Круассан", "Все автоматы"],
    valid_until: "2026-03-31",
    is_active: false,
    sort_order: 2,
    title_uz: "Kombo: Kapuchino + Kruassan",
    description_uz: "45 000 → 30 000 UZS",
  },
  {
    id: "28f94956-7f70-44f0-884b-730c8ef987a6",
    title: "Happy Hour: -30%",
    badge: "Ежедневно",
    description: "Скидка 30% на холодные напитки каждый день с 14:00 до 16:00",
    promo_code: null,
    gradient: "from-blue-500 to-indigo-600",
    conditions: ["Только холодные напитки", "14:00–16:00", "Все автоматы"],
    valid_until: null,
    is_active: false,
    sort_order: 3,
    title_uz: "Happy Hour: -30%",
    description_uz:
      "Har kuni soat 14:00 dan 16:00 gacha sovuq ichimliklarga 30% chegirma",
  },
  {
    id: "6da119a0-45f7-47d3-bc2f-e0a8e33e1c4e",
    title: "x2 бонусов за первый заказ",
    badge: "Новичкам",
    description:
      "Получите двойные бонусы за первые 3 заказа с промокодом WELCOME",
    promo_code: "WELCOME",
    gradient: "from-amber-500 to-orange-600",
    conditions: ["Новые пользователи", "Первые 3 заказа"],
    valid_until: null,
    is_active: true,
    sort_order: 4,
    title_uz: "Birinchi buyurtma uchun x2 bonus",
    description_uz:
      "WELCOME promokodi bilan birinchi 3 ta buyurtma uchun ikki baravar bonus oling",
  },
];

// ======================================================================
// 4. SITE CONTENT (27 records)
// ======================================================================
const OLD_SITE_CONTENT = [
  {
    section: "about",
    key: "description",
    value:
      "VendHub — оператор сети современных кофейных и снэк-автоматов в Ташкенте. Автоматы в больницах, университетах, госучреждениях и жилых комплексах. Круглосуточный доступ к качественным горячим и холодным напиткам.",
    value_uz: null,
  },
  {
    section: "about",
    key: "phone",
    value: "+998 71 200 39 99",
    value_uz: null,
  },
  { section: "about", key: "email", value: "info@vendhub.uz", value_uz: null },
  {
    section: "about",
    key: "address",
    value: "Ташкент, Узбекистан",
    value_uz: null,
  },
  {
    section: "about",
    key: "telegram",
    value: "@vendhub_supportbot",
    value_uz: null,
  },
  {
    section: "hero",
    key: "title",
    value: "Кофе из автоматов в пару кликов",
    value_uz: "Avtomatlardan kofe bir necha bosishda",
  },
  {
    section: "hero",
    key: "subtitle",
    value:
      "25+ видов напитков. 15+ автоматов в бизнес центрах, больницах, университетах и общественных местах Ташкента.",
    value_uz:
      "25+ turdagi ichimliklar. Toshkentdagi kasalxonalar, universitetlar va jamoat joylarida 16 ta avtomat.",
  },
  {
    section: "hero",
    key: "greeting_morning",
    value: "☀️ Доброе утро!",
    value_uz: "☀️ Xayrli tong!",
  },
  {
    section: "hero",
    key: "greeting_afternoon",
    value: "🌤️ Добрый день!",
    value_uz: "🌤️ Xayrli kun!",
  },
  {
    section: "hero",
    key: "greeting_evening",
    value: "🌙 Добрый вечер!",
    value_uz: "🌙 Xayrli kech!",
  },
  { section: "stats", key: "machines_count", value: "15+", value_uz: "16" },
  { section: "stats", key: "drinks_count", value: "25+", value_uz: "25+" },
  { section: "stats", key: "orders_count", value: "20K+", value_uz: "10K+" },
  { section: "stats", key: "rating", value: "4.8", value_uz: "4.8" },
];

// ======================================================================
// 5. LOYALTY, PARTNERS, MACHINE_TYPES — stored as JSON blobs
// ======================================================================
const LOYALTY_TIERS = [
  {
    level: "Bronze",
    emoji: "🥉",
    discount_percent: 0,
    threshold: 0,
    cashback_percent: 1,
    privileges: {
      cashback: true,
      discount: false,
      early_access: false,
      special_codes: false,
      birthday_bonus: 5000,
      personal_offers: false,
      priority_promos: false,
      free_drink_monthly: false,
    },
    sort_order: 1,
  },
  {
    level: "Silver",
    emoji: "🥈",
    discount_percent: 3,
    threshold: 100000,
    cashback_percent: 1,
    privileges: {
      cashback: true,
      discount: true,
      early_access: false,
      special_codes: true,
      birthday_bonus: 15000,
      personal_offers: false,
      priority_promos: true,
      free_drink_monthly: false,
    },
    sort_order: 2,
  },
  {
    level: "Gold",
    emoji: "🥇",
    discount_percent: 5,
    threshold: 500000,
    cashback_percent: 1,
    privileges: {
      cashback: true,
      discount: true,
      early_access: false,
      special_codes: true,
      birthday_bonus: 20000,
      personal_offers: true,
      priority_promos: true,
      free_drink_monthly: true,
    },
    sort_order: 3,
  },
  {
    level: "Platinum",
    emoji: "💎",
    discount_percent: 10,
    threshold: 1000000,
    cashback_percent: 1,
    privileges: {
      cashback: true,
      discount: true,
      early_access: false,
      special_codes: true,
      birthday_bonus: 30000,
      personal_offers: true,
      priority_promos: true,
      free_drink_monthly: true,
    },
    sort_order: 4,
  },
];

const LOYALTY_PRIVILEGES = [
  { key: "cashback", label: "Кэшбэк", label_uz: "Keshbek", sort_order: 1 },
  {
    key: "discount",
    label: "Скидка на заказ",
    label_uz: "Buyurtma chegirmasi",
    sort_order: 2,
  },
  {
    key: "priority_promos",
    label: "Приоритетные акции",
    label_uz: "Ustuvor aksiyalar",
    sort_order: 3,
  },
  {
    key: "special_codes",
    label: "Спецпромокоды",
    label_uz: "Maxsus promokodlar",
    sort_order: 4,
  },
  {
    key: "birthday_bonus",
    label: "Бонус на ДР",
    label_uz: "Tug'ilgan kun bonusi",
    sort_order: 5,
  },
  {
    key: "early_access",
    label: "Ранний доступ",
    label_uz: "Erta kirish",
    sort_order: 6,
  },
  {
    key: "personal_offers",
    label: "Персональные предложения",
    label_uz: "Shaxsiy takliflar",
    sort_order: 7,
  },
  {
    key: "free_drink_monthly",
    label: "Бесплатный напиток/мес",
    label_uz: "Bepul ichimlik/oy",
    sort_order: 8,
  },
];

const BONUS_ACTIONS = [
  {
    title: "Регистрация в приложении",
    title_uz: "Ilovada ro'yxatdan o'tish",
    description: "Зарегистрируйтесь в Telegram-боте @vendhub_bot",
    description_uz: "Telegram-bot @vendhub_bot da ro'yxatdan o'ting",
    icon: "Smartphone",
    points_amount: "20 000",
    type: "earn",
    sort_order: 1,
  },
  {
    title: "Подписка на Telegram-бот",
    title_uz: "Telegram-botga obuna",
    description: "Подпишитесь на @vendhub_bot",
    description_uz: "@vendhub_bot ga obuna bo'ling",
    icon: "Send",
    points_amount: "10 000",
    type: "earn",
    sort_order: 2,
  },
  {
    title: "Подписка на Instagram",
    title_uz: "Instagram obuna",
    description: "Подпишитесь на @vendhub.uz в Instagram",
    description_uz: "Instagramda @vendhub.uz ga obuna bo'ling",
    icon: "Camera",
    points_amount: "5 000",
    type: "earn",
    sort_order: 3,
  },
  {
    title: "Подписка на Telegram-канал",
    title_uz: "Telegram kanalga obuna",
    description: "Подпишитесь на канал @vendhub_news",
    description_uz: "@vendhub_news kanaliga obuna bo'ling",
    icon: "MessageCircle",
    points_amount: "5 000",
    type: "earn",
    sort_order: 4,
  },
  {
    title: "Верификация телефона",
    title_uz: "Telefon tasdiqlash",
    description: "Подтвердите номер телефона в приложении",
    description_uz: "Ilovada telefon raqamingizni tasdiqlang",
    icon: "Phone",
    points_amount: "5 000",
    type: "earn",
    sort_order: 5,
  },
  {
    title: "Кэшбэк за покупки",
    title_uz: "Xaridlar uchun keshbek",
    description: "Получайте баллы за каждую покупку напитков",
    description_uz: "Har bir ichimlik xaridi uchun ball oling",
    icon: "Coffee",
    points_amount: "1%",
    type: "earn",
    sort_order: 6,
  },
  {
    title: "Приглашение друзей",
    title_uz: "Do'stlarni taklif qilish",
    description: "Пригласите друга — получите оба бонус",
    description_uz: "Do'stingizni taklif qiling — ikkalangiz bonus olasiz",
    icon: "UserPlus",
    points_amount: "5 000",
    type: "earn",
    sort_order: 7,
  },
  {
    title: "Бонус в день рождения",
    title_uz: "Tug'ilgan kun bonusi",
    description: "Тройные баллы в ваш день рождения",
    description_uz: "Tug'ilgan kuningizda uch baravar ball",
    icon: "Cake",
    points_amount: "x3",
    type: "earn",
    sort_order: 8,
  },
  {
    title: "Оплата заказов",
    title_uz: "Buyurtmalarni to'lash",
    description: "Списывайте баллы при покупке напитков",
    description_uz: "Ichimlik xarid qilganda ballarni yechib oling",
    icon: "ShoppingCart",
    points_amount: "1 балл = 1 UZS",
    type: "spend",
    sort_order: 1,
  },
  {
    title: "Подарки друзьям",
    title_uz: "Do'stlarga sovg'a",
    description: "Отправьте баллы другу через бот",
    description_uz: "Bot orqali do'stingizga ball yuboring",
    icon: "Gift",
    points_amount: "от 1 000",
    type: "spend",
    sort_order: 2,
  },
  {
    title: "Эксклюзивный мерч",
    title_uz: "Eksklyuziv merch",
    description: "Обменяйте баллы на фирменные товары",
    description_uz: "Ballarni firmaviy tovarlarga almashing",
    icon: "Star",
    points_amount: "от 50 000",
    type: "spend",
    sort_order: 3,
  },
];

const PARTNERS = [
  {
    name: "KARDIOLOGIYA MARKAZI",
    logo_url: "/images/partners/kardiologiya-markazi.png",
    sort_order: 1,
  },
  {
    name: "American Hospital",
    logo_url: "/images/partners/american-hospital.svg",
    sort_order: 2,
  },
  {
    name: "KIMYO INTERNATIONAL UNIVERSITY IN TASHKENT",
    logo_url: "/images/partners/kiut.svg",
    sort_order: 3,
  },
  {
    name: "Grand Medical Clinic",
    logo_url: "/images/partners/grand-medical.png",
    sort_order: 5,
  },
  {
    name: "O'ZBEKISTON POCHTASI",
    logo_url: "/images/partners/uzpost.png",
    sort_order: 5,
  },
];

const MACHINE_TYPES = [
  {
    slug: "coffee",
    name: "COFFEE VENDING MACHINE",
    model_name: "JQ-002-A",
    description:
      "Кофейный автомат JQ-002-A — флагманская модель VendHub для приготовления горячих напитков. Оснащён 43-дюймовым сенсорным экраном с поддержкой рекламных промороликов, встроенным льдогенератором и UV-стерилизацией.",
    hero_image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/machine-types/2bda54aa-81dc-403c-af4c-612b8221d747.png",
    specs: [
      { label: "Модель", value: "JQ-002-A" },
      { label: "Габариты", value: "730 × 730 × 1960 мм" },
      { label: "Масса", value: "~240 кг" },
      { label: "Экран", value: "43″ сенсорный с промороликами" },
      { label: "Напитки", value: "20+ видов кофе и чая" },
      { label: "Оплата", value: "PAYME, CLICK, UZUM, наличные" },
      { label: "Связь", value: "4G / Wi-Fi / LAN" },
      { label: "Освещение", value: "внутренняя LED-подсветка" },
      { label: "ПО", value: "VendHub OS" },
      { label: "Энергопотребление", value: "~1200 Вт" },
    ],
    advantages: [
      {
        title: "43-дюймовый сенсорный экран",
        desc: "промо-ролики, удобный выбор напитков",
      },
      {
        title: "Встроенный льдогенератор",
        desc: "айс-латте, айс-американо и холодные чаи",
      },
      {
        title: "UV-стерилизация",
        desc: "обработка ультрафиолетом для безопасности",
      },
      { title: "Поддержка своего стакана", desc: "эко-опция" },
      { title: "Закрытая крышка и корзина", desc: "напиток защищён крышкой" },
    ],
    gallery_images: [],
    is_active: true,
    badge: null,
    sort_order: 1,
  },
  {
    slug: "snack",
    name: "SNACK $ DRINK VENDING MACHINE",
    model_name: "TCN-CSC-8C",
    description: "",
    hero_image_url:
      "https://cuaxgniyrffrzqmelfbw.supabase.co/storage/v1/object/public/product-images/machine-types/69d194ac-f76d-4b0a-83e7-fa195c837efe.webp",
    specs: [],
    advantages: [],
    gallery_images: [],
    is_active: true,
    badge: "Скоро",
    sort_order: 2,
  },
  {
    slug: "cold",
    name: "ICE DRINK VENDING MACHINE",
    model_name: "JS-001-A01",
    description: "Автомат для прохладительных и слэш-напитков JS-001-A01.",
    hero_image_url: "/images/machines/js-001-a01-hero.jpg",
    specs: [
      { label: "Модель", value: "JS-001-A01" },
      { label: "Габариты", value: "1000 × 910 × 1960 мм" },
      { label: "Масса", value: "~350 кг" },
      { label: "Экран", value: "55″ 4K сенсорный" },
      { label: "Количество спиралей", value: "до 40" },
      { label: "Температурный диапазон", value: "-10°C...0°C" },
      { label: "Оплата", value: "наличные / карта / QR / VIP-карта" },
      { label: "Связь", value: "4G / Wi-Fi / LAN" },
      { label: "ПО", value: "VendHub OS" },
      { label: "Энергопотребление", value: "~850 Вт" },
    ],
    advantages: [
      {
        title: "Большой 55-дюймовый экран",
        desc: "рекламные ролики и промо-контент",
      },
      {
        title: "Встроенная морозильная камера",
        desc: "хранение при минусовой температуре",
      },
      {
        title: "Гибкая система оплаты",
        desc: "наличные, карты, QR, VIP-карты",
      },
      {
        title: "Удалённый мониторинг (VendHub OS)",
        desc: "контроль в реальном времени",
      },
      { title: "Компактные габариты", desc: "~1 м² площади" },
    ],
    gallery_images: [],
    is_active: true,
    badge: null,
    sort_order: 3,
  },
];

const PARTNERSHIP_MODELS = [
  {
    key: "locations",
    title: "Локациям",
    title_uz: "Joylashuvlar uchun",
    description:
      "У вас есть помещение с трафиком? Мы установим автомат бесплатно, вы получаете процент с продаж.",
    description_uz:
      "Sizda odamlar ko'p keladigan joy bormi? Biz avtomatni bepul o'rnatamiz, siz sotuvdan foiz olasiz.",
    icon: "MapPin",
    color_scheme: "mint",
    benefits: [
      "Бесплатная установка и обслуживание",
      "Ежемесячные выплаты от продаж",
      "Привлечение посетителей",
      "Нет минимальных требований по площади",
    ],
    benefits_uz: [
      "Bepul o'rnatish va texnik xizmat",
      "Sotuvdan oylik to'lovlar",
      "Tashrif buyuvchilarni jalb qilish",
      "Minimal maydon talablari yo'q",
    ],
    sort_order: 1,
  },
  {
    key: "suppliers",
    title: "Поставщикам",
    title_uz: "Yetkazib beruvchilar uchun",
    description:
      "Поставляете кофе, снеки или расходники? Станьте нашим партнёром-поставщиком.",
    description_uz:
      "Qahva, gazak yoki sarf materiallari yetkazib berasizmi? Bizning hamkor-yetkazib beruvchimiz bo'ling.",
    icon: "Package",
    color_scheme: "caramel",
    benefits: [
      "Стабильные закупки",
      "Долгосрочные контракты",
      "Оплата в срок",
      "Расширение географии поставок",
    ],
    benefits_uz: [
      "Barqaror xaridlar",
      "Uzoq muddatli shartnomalar",
      "O'z vaqtida to'lov",
      "Yetkazib berish geografiyasini kengaytirish",
    ],
    sort_order: 2,
  },
  {
    key: "investors",
    title: "Инвесторам",
    title_uz: "Investorlar uchun",
    description:
      "Стабильный доход от сети автоматов. Окупаемость от 12 месяцев.",
    description_uz:
      "Avtomat tarmog'idan barqaror daromad. 12 oydan boshlab o'zini qoplaydi.",
    icon: "TrendingUp",
    color_scheme: "espresso",
    benefits: [
      "ROI от 12 месяцев",
      "Прозрачная отчётность",
      "Пассивный доход",
      "Масштабируемая модель",
    ],
    benefits_uz: [
      "12 oydan ROI",
      "Shaffof hisobot",
      "Passiv daromad",
      "Kengaytiriladigan model",
    ],
    sort_order: 3,
  },
  {
    key: "franchise",
    title: "Франшиза",
    title_uz: "Franchayzing",
    description:
      "Запустите VendHub в своём городе. Полная поддержка и обучение.",
    description_uz:
      "O'z shahringizda VendHub-ni ishga tushiring. To'liq qo'llab-quvvatlash va o'qitish.",
    icon: "Building2",
    color_scheme: "purple",
    benefits: [
      "Готовая бизнес-модель",
      "Обучение и поддержка",
      "Маркетинговые материалы",
      "Техническая инфраструктура",
    ],
    benefits_uz: [
      "Tayyor biznes-model",
      "O'qitish va qo'llab-quvvatlash",
      "Marketing materiallari",
      "Texnik infratuzilma",
    ],
    sort_order: 4,
  },
];

// ======================================================================
// HELPERS
// ======================================================================
function mapMachineStatus(old: string): string {
  return (
    {
      online: "active",
      offline: "offline",
      maintenance: "maintenance",
      error: "error",
      disabled: "disabled",
    }[old] || "active"
  );
}
function mapMachineType(old: string): string {
  return (
    {
      coffee: "coffee",
      cold: "drink",
      snack: "snack",
      combo: "combo",
      fresh: "fresh",
      ice_cream: "ice_cream",
      water: "water",
    }[old] || "coffee"
  );
}
function machineTypePrefix(type: string): string {
  return (
    {
      coffee: "CF",
      drink: "DR",
      snack: "SN",
      combo: "CB",
      fresh: "FR",
      ice_cream: "IC",
      water: "WA",
    }[type] || "VM"
  );
}
function mapProductCategory(old: string): string {
  return (
    { coffee: "hot_drinks", tea: "tea", snack: "snacks", other: "other" }[
      old
    ] || "other"
  );
}
// Transliterate Cyrillic → Latin for SKU generation
function transliterate(str: string): string {
  const map: Record<string, string> = {
    А: "A",
    Б: "B",
    В: "V",
    Г: "G",
    Д: "D",
    Е: "E",
    Ё: "YO",
    Ж: "ZH",
    З: "Z",
    И: "I",
    Й: "Y",
    К: "K",
    Л: "L",
    М: "M",
    Н: "N",
    О: "O",
    П: "P",
    Р: "R",
    С: "S",
    Т: "T",
    У: "U",
    Ф: "F",
    Х: "KH",
    Ц: "TS",
    Ч: "CH",
    Ш: "SH",
    Щ: "SCH",
    Ъ: "",
    Ы: "Y",
    Ь: "",
    Э: "E",
    Ю: "YU",
    Я: "YA",
  };
  return str
    .toUpperCase()
    .split("")
    .map((c) => map[c] || c)
    .join("");
}
function generateSku(name: string, idx: number): string {
  const slug = transliterate(name)
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 10);
  return `PRD-${slug || "ITEM"}-${String(idx).padStart(3, "0")}`;
}

// ======================================================================
// MAIN
// ======================================================================
async function main() {
  const ds = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "24266"),
    username: process.env.DB_USER || "vendhub",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "vendhub",
    namingStrategy: new SnakeNamingStrategy(),
    logging: false,
  });

  await ds.initialize();
  console.log("✅ Connected to PostgreSQL\n");
  const qr = ds.createQueryRunner();

  // Get org
  const orgs = await qr.query("SELECT id, name FROM organizations LIMIT 1");
  if (orgs.length === 0) {
    console.error(
      "❌ No organizations found. Create one first via the admin panel.",
    );
    await ds.destroy();
    process.exit(1);
  }
  const orgId = orgs[0].id;
  console.log(`📋 Organization: ${orgs[0].name} (${orgId})\n`);

  // ─────────────────────────────────────────────────
  // SECTION 1: MACHINES
  // ─────────────────────────────────────────────────
  console.log("═══ MACHINES ═══════════════════════════════════");
  const existingMachines = await qr.query(
    "SELECT machine_number, serial_number FROM machines WHERE organization_id = $1 AND deleted_at IS NULL",
    [orgId],
  );
  const existingMachineNumbers = new Set(
    existingMachines.map((r: Record<string, unknown>) => r.machine_number),
  );
  const existingSerials = new Set(
    existingMachines.map((r: Record<string, unknown>) => r.serial_number),
  );
  const counters: Record<string, number> = {};
  for (const m of existingMachines) {
    const match = m.machine_number?.match(/^([A-Z]{2})-(\d+)$/);
    if (match)
      counters[match[1]] = Math.max(
        counters[match[1]] || 0,
        parseInt(match[2]),
      );
  }

  let machinesInserted = 0;
  for (const old of OLD_MACHINES) {
    const newType = mapMachineType(old.type);
    const prefix = machineTypePrefix(newType);
    counters[prefix] = (counters[prefix] || 0) + 1;
    const machineNumber = `${prefix}-${String(counters[prefix]).padStart(3, "0")}`;
    const serialNumber = old.id;
    if (
      existingMachineNumbers.has(machineNumber) ||
      existingSerials.has(serialNumber)
    ) {
      console.log(`  ⏭️  Skip: ${old.name}`);
      continue;
    }
    await qr.query(
      `INSERT INTO machines (
        id, organization_id, machine_number, name, serial_number,
        type, status, connection_status,
        latitude, longitude, address,
        max_product_slots, current_product_count,
        accepts_cash, accepts_card, accepts_qr, accepts_nfc,
        total_sales_count, total_revenue, cash_capacity, current_cash_amount,
        low_stock_threshold_percent, depreciation_method, accumulated_depreciation, is_disposed,
        telemetry, settings, metadata, notes, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10,
        $11, 0, true, true, true, false,
        0, 0, 0, 0, 10, 'linear', 0, false,
        $12, '{}', $13, $14, NOW(), NOW()
      )`,
      [
        orgId,
        machineNumber,
        old.name,
        serialNumber,
        newType,
        mapMachineStatus(old.status),
        old.status === "online" ? "online" : "offline",
        old.latitude,
        old.longitude,
        old.address,
        old.product_count || 0,
        JSON.stringify({}),
        JSON.stringify({
          supabaseId: old.id,
          addressUz: old.address_uz,
          rating: old.rating,
          reviewCount: old.review_count,
          floor: old.floor,
          hours: old.hours,
          hasPromotion: old.has_promotion,
          locationType: old.location_type,
        }),
        `Этаж: ${old.floor} | ${old.hours} | ${old.location_type}`,
      ],
    );
    console.log(`  ✅ [${machineNumber}] ${old.name}`);
    machinesInserted++;
  }
  console.log(`  → Machines inserted: ${machinesInserted}\n`);

  // ─────────────────────────────────────────────────
  // SECTION 2: PRODUCTS
  // ─────────────────────────────────────────────────
  console.log("═══ PRODUCTS ═══════════════════════════════════");
  const existingProducts = await qr.query(
    "SELECT sku FROM products WHERE organization_id = $1 AND deleted_at IS NULL",
    [orgId],
  );
  const existingSkus = new Set(
    existingProducts.map((r: Record<string, unknown>) => r.sku),
  );

  let productsInserted = 0;
  for (let i = 0; i < OLD_PRODUCTS.length; i++) {
    const old = OLD_PRODUCTS[i];
    const sku = generateSku(old.name, old.sort_order);
    if (existingSkus.has(sku)) {
      console.log(`  ⏭️  Skip: ${old.name} (${sku})`);
      continue;
    }
    const category = mapProductCategory(old.category);
    const status = old.available ? "active" : "inactive";
    // Map options → priceModifiers
    const priceModifiers =
      old.options.length > 0
        ? [
            {
              name: "Вариант",
              nameUz: "Variant",
              options: old.options.map((o: Record<string, unknown>) => ({
                label: o.name,
                labelUz: o.name,
                priceAdjustment: o.price || 0,
                isDefault: false,
              })),
            },
          ]
        : [];

    await qr.query(
      `INSERT INTO products (
        id, organization_id, sku, name, name_uz, description, description_uz,
        category, status, unit_of_measure,
        is_ingredient, is_active, requires_temperature_control,
        purchase_price, selling_price, currency, vat_rate,
        image_url, images, nutrition, allergens, tags,
        compatible_machine_types, price_modifiers, metadata,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6,
        $7, $8, 'pcs',
        false, $9, $10,
        0, $11, 'UZS', 12,
        $12, '[]', $13, '[]', $14,
        $15, $16, $17,
        NOW(), NOW()
      )`,
      [
        orgId,
        sku,
        old.name,
        old.name_uz,
        old.detail_description || old.description,
        old.detail_description_uz || old.description_uz,
        category,
        status,
        old.available,
        old.temperature === "cold" || old.temperature === "both",
        old.price,
        old.image_url,
        JSON.stringify(old.calories ? { calories: old.calories } : {}),
        JSON.stringify(old.is_new ? ["new"] : old.popular ? ["popular"] : []),
        JSON.stringify(
          old.category === "coffee" || old.category === "tea"
            ? ["coffee"]
            : ["snack"],
        ),
        JSON.stringify(priceModifiers),
        JSON.stringify({
          supabaseId: old.id,
          temperature: old.temperature,
          rating: old.rating,
          sortOrder: old.sort_order,
          discountPercent: old.discount_percent,
        }),
      ],
    );
    console.log(`  ✅ [${sku}] ${old.name} — ${old.price} UZS`);
    productsInserted++;
  }
  console.log(`  → Products inserted: ${productsInserted}\n`);

  // ─────────────────────────────────────────────────
  // SECTION 3: PROMO CODES (from promotions with promo_code)
  // ─────────────────────────────────────────────────
  console.log("═══ PROMO CODES ════════════════════════════════");
  const existingPromos = await qr.query(
    "SELECT code FROM promo_codes WHERE organization_id = $1 AND deleted_at IS NULL",
    [orgId],
  );
  const existingCodes = new Set(
    existingPromos.map((r: Record<string, unknown>) => r.code),
  );

  let promosInserted = 0;
  for (const old of OLD_PROMOTIONS) {
    if (!old.promo_code) continue; // Only seed ones with actual codes
    if (existingCodes.has(old.promo_code)) {
      console.log(`  ⏭️  Skip: ${old.promo_code}`);
      continue;
    }
    const isPercentage = old.title.includes("%");
    const valueMatch = old.title.match(/(\d+)%/);
    const value = valueMatch ? parseInt(valueMatch[1]) : 0;

    await qr.query(
      `INSERT INTO promo_codes (
        id, organization_id, code, name, description,
        type, value, status,
        max_total_uses, max_uses_per_user, current_total_uses,
        valid_from, valid_until,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4,
        $5, $6, $7,
        null, 1, 0,
        NOW(), $8,
        NOW(), NOW()
      )`,
      [
        orgId,
        old.promo_code,
        old.title,
        old.description,
        isPercentage ? "percentage" : "loyalty_bonus",
        value,
        old.is_active ? "active" : "expired",
        old.valid_until || "2027-12-31",
      ],
    );
    console.log(`  ✅ [${old.promo_code}] ${old.title}`);
    promosInserted++;
  }
  console.log(`  → Promo codes inserted: ${promosInserted}\n`);

  // ─────────────────────────────────────────────────
  // SECTION 4: WEBSITE CONFIGS (site_content + JSON blobs)
  // ─────────────────────────────────────────────────
  console.log("═══ WEBSITE CONFIGS ════════════════════════════");
  let configsInserted = 0;

  // Helper: upsert website_config
  async function upsertConfig(
    key: string,
    value: string,
    section: string = "general",
  ) {
    const existing = await qr.query(
      "SELECT id FROM website_configs WHERE organization_id = $1 AND key = $2 AND deleted_at IS NULL",
      [orgId, key],
    );
    if (existing.length > 0) {
      console.log(`  ⏭️  Skip config: ${key}`);
      return;
    }
    await qr.query(
      `INSERT INTO website_configs (id, organization_id, key, value, section, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
      [orgId, key, value, section],
    );
    console.log(`  ✅ [${section}] ${key}`);
    configsInserted++;
  }

  // 4a. Site content
  for (const sc of OLD_SITE_CONTENT) {
    const configKey = `site_${sc.section}_${sc.key}`;
    const configValue = sc.value_uz
      ? JSON.stringify({ ru: sc.value, uz: sc.value_uz })
      : sc.value;
    await upsertConfig(configKey, configValue, "general");
  }

  // 4b. Loyalty tiers
  await upsertConfig("loyalty_tiers", JSON.stringify(LOYALTY_TIERS), "general");

  // 4c. Loyalty privileges
  await upsertConfig(
    "loyalty_privileges",
    JSON.stringify(LOYALTY_PRIVILEGES),
    "general",
  );

  // 4d. Bonus actions
  await upsertConfig("bonus_actions", JSON.stringify(BONUS_ACTIONS), "general");

  // 4e. Partners
  await upsertConfig("partners", JSON.stringify(PARTNERS), "general");

  // 4f. Machine types catalog
  await upsertConfig(
    "machine_types_catalog",
    JSON.stringify(MACHINE_TYPES),
    "general",
  );

  // 4g. Partnership models
  await upsertConfig(
    "partnership_models",
    JSON.stringify(PARTNERSHIP_MODELS),
    "general",
  );

  // 4h. All promotions as marketing data (including ones without promo codes)
  await upsertConfig(
    "promotions_marketing",
    JSON.stringify(OLD_PROMOTIONS),
    "general",
  );

  console.log(`  → Website configs inserted: ${configsInserted}\n`);

  // ─────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════");
  console.log(`🎉 Migration complete!`);
  console.log(`   Machines:       ${machinesInserted}`);
  console.log(`   Products:       ${productsInserted}`);
  console.log(`   Promo codes:    ${promosInserted}`);
  console.log(`   Website configs: ${configsInserted}`);
  console.log("═══════════════════════════════════════════════");

  await ds.destroy();
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
