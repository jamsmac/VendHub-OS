#!/usr/bin/env npx tsx
/**
 * Seed machines from old Supabase (VHM24) into VendHub OS PostgreSQL.
 *
 * Usage:
 *   cd apps/api
 *   npx tsx ../../scripts/seed-machines-from-supabase.ts
 *
 * Prerequisites: Docker postgres must be running on port 24266.
 * The script auto-detects the first organization in the DB.
 */

import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

// ──────────────────────────────────────────────────────────
// 1. 19 machines from old Supabase (cuaxgniyrffrzqmelfbw)
// ──────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────
// 2. Field mapping: old Supabase → new VendHub OS
// ──────────────────────────────────────────────────────────
function mapStatus(old: string): string {
  const map: Record<string, string> = {
    online: "active",
    offline: "offline",
    maintenance: "maintenance",
    error: "error",
    disabled: "disabled",
  };
  return map[old] || "active";
}

function mapType(old: string): string {
  const map: Record<string, string> = {
    coffee: "coffee",
    cold: "drink",
    snack: "snack",
    combo: "combo",
    fresh: "fresh",
    ice_cream: "ice_cream",
    water: "water",
  };
  return map[old] || "coffee";
}

function typePrefix(type: string): string {
  const map: Record<string, string> = {
    coffee: "CF",
    drink: "DR",
    snack: "SN",
    combo: "CB",
    fresh: "FR",
    ice_cream: "IC",
    water: "WA",
  };
  return map[type] || "VM";
}

// ──────────────────────────────────────────────────────────
// 3. Main
// ──────────────────────────────────────────────────────────
async function main() {
  // Connect to local PostgreSQL
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
  console.log("✅ Connected to PostgreSQL");

  const qr = ds.createQueryRunner();

  // Get first organization
  const orgs = await qr.query("SELECT id, name FROM organizations LIMIT 1");
  if (orgs.length === 0) {
    console.error(
      "❌ No organizations found. Create one first via the admin panel.",
    );
    await ds.destroy();
    process.exit(1);
  }
  const orgId = orgs[0].id;
  console.log(`📋 Using organization: ${orgs[0].name} (${orgId})`);

  // Check existing machines to avoid duplicates
  const existing = await qr.query(
    "SELECT machine_number, serial_number FROM machines WHERE organization_id = $1 AND deleted_at IS NULL",
    [orgId],
  );
  const existingNumbers = new Set(
    existing.map((r: { machine_number: string }) => r.machine_number),
  );
  const existingSerials = new Set(
    existing.map((r: { serial_number: string }) => r.serial_number),
  );
  console.log(`📊 Existing machines: ${existing.length}`);

  // Find the highest counter per type prefix to continue numbering
  const counters: Record<string, number> = {};
  for (const m of existing) {
    const match = m.machine_number?.match(/^([A-Z]{2})-(\d+)$/);
    if (match) {
      const prefix = match[1];
      const num = parseInt(match[2]);
      counters[prefix] = Math.max(counters[prefix] || 0, num);
    }
  }

  let inserted = 0;
  let skipped = 0;

  for (const old of OLD_MACHINES) {
    const newType = mapType(old.type);
    const prefix = typePrefix(newType);

    // Generate machine number: CF-001, CF-002, etc.
    counters[prefix] = (counters[prefix] || 0) + 1;
    const machineNumber = `${prefix}-${String(counters[prefix]).padStart(3, "0")}`;

    // Use old Supabase ID as serial number for traceability
    const serialNumber = old.id;

    // Skip if already exists
    if (
      existingNumbers.has(machineNumber) ||
      existingSerials.has(serialNumber)
    ) {
      console.log(`⏭️  Skipping ${old.name} (already exists)`);
      skipped++;
      continue;
    }

    const newStatus = mapStatus(old.status);
    const connectionStatus = old.status === "online" ? "online" : "offline";

    // Insert using raw SQL to bypass DTO validation (seed script)
    await qr.query(
      `INSERT INTO machines (
        id, organization_id, machine_number, name, serial_number,
        type, status, connection_status,
        latitude, longitude, address,
        max_product_slots, current_product_count,
        accepts_cash, accepts_card, accepts_qr, accepts_nfc,
        total_sales_count, total_revenue,
        cash_capacity, current_cash_amount,
        low_stock_threshold_percent,
        depreciation_method, accumulated_depreciation,
        is_disposed,
        telemetry, settings, metadata, notes,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10,
        $11, $12,
        true, true, true, false,
        0, 0,
        0, 0,
        10,
        'linear', 0,
        false,
        $13, '{}', $14, $15,
        NOW(), NOW()
      )`,
      [
        orgId, // $1: organization_id
        machineNumber, // $2: machine_number
        old.name, // $3: name
        serialNumber, // $4: serial_number
        newType, // $5: type
        newStatus, // $6: status
        connectionStatus, // $7: connection_status
        old.latitude, // $8: latitude
        old.longitude, // $9: longitude
        old.address, // $10: address
        old.product_count || 0, // $11: max_product_slots
        0, // $12: current_product_count
        JSON.stringify({}), // $13: telemetry
        JSON.stringify({
          // $14: metadata
          supabaseId: old.id,
          addressUz: old.address_uz,
          rating: old.rating,
          reviewCount: old.review_count,
          floor: old.floor,
          hours: old.hours,
          hasPromotion: old.has_promotion,
          locationType: old.location_type,
        }),
        old.address_uz
          ? `Этаж: ${old.floor} | ${old.hours} | ${old.location_type}`
          : null, // $15: notes
      ],
    );

    console.log(
      `✅ [${machineNumber}] ${old.name} — ${old.address} (${newType}/${newStatus})`,
    );
    inserted++;
  }

  console.log(`\n🎉 Done! Inserted: ${inserted}, Skipped: ${skipped}`);
  await ds.destroy();
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
