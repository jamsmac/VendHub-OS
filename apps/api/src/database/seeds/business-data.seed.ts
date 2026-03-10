/**
 * Business Data Seeder for VendHub OS
 *
 * Populates tables that feed dashboard pages:
 * - Counterparties (suppliers, partners, location owners)
 * - Contracts with commission structures
 * - Promo codes
 * - Bank deposits (cash-finance)
 *
 * IDEMPOTENT: checks for existing data before inserting.
 * Run: npx ts-node --project tsconfig.json src/database/seeds/business-data.seed.ts
 */

import { DataSource } from "typeorm";
import { v4 as uuid } from "uuid";

// ============================================================================
// DATA
// ============================================================================

const COUNTERPARTIES = [
  {
    name: 'ООО "Coca-Cola Ichimligi"',
    shortName: "Coca-Cola",
    type: "supplier",
    inn: "304567890",
    contactPerson: "Ильхом Назаров",
    phone: "+998901234567",
    email: "supply@coca-cola.uz",
    bankName: "NBU Tashkent",
    bankAccount: "20208000100123456789",
    mfo: "00014",
  },
  {
    name: 'ООО "Nestle Uzbekistan"',
    shortName: "Nestle",
    type: "supplier",
    inn: "305678901",
    contactPerson: "Дильшод Рахимов",
    phone: "+998901234568",
    email: "orders@nestle.uz",
    bankName: "Ipoteka Bank",
    bankAccount: "20208000200234567890",
    mfo: "00084",
  },
  {
    name: 'ООО "PepsiCo Uzbekistan"',
    shortName: "PepsiCo",
    type: "supplier",
    inn: "306789012",
    contactPerson: "Бахром Усмонов",
    phone: "+998901234569",
    email: "supply@pepsico.uz",
    bankName: "Hamkorbank",
    bankAccount: "20208000300345678901",
    mfo: "00843",
  },
  {
    name: 'ООО "Арома-Кофе"',
    shortName: "Арома-Кофе",
    type: "supplier",
    inn: "307890123",
    contactPerson: "Сардор Мирзаев",
    phone: "+998901234570",
    email: "info@aromacoffee.uz",
    bankName: "Kapitalbank",
    bankAccount: "20208000400456789012",
    mfo: "01058",
  },
  {
    name: "ТЦ Samarqand Darvoza",
    shortName: "Samarqand D.",
    type: "location_owner",
    inn: "308901234",
    contactPerson: "Акбар Жумаев",
    phone: "+998901234571",
    email: "admin@samarqanddarvoza.uz",
    bankName: "Davr Bank",
    bankAccount: "20208000500567890123",
    mfo: "01139",
  },
  {
    name: "ТЦ Tashkent City Mall",
    shortName: "TCM",
    type: "location_owner",
    inn: "309012345",
    contactPerson: "Шахзод Каримов",
    phone: "+998901234572",
    email: "rent@tashkentcitymall.uz",
    bankName: "Asaka Bank",
    bankAccount: "20208000600678901234",
    mfo: "00083",
  },
  {
    name: "KIUT University",
    shortName: "KIUT",
    type: "location_owner",
    inn: "310123456",
    contactPerson: "Бобур Алимов",
    phone: "+998901234573",
    email: "admin@kiut.uz",
    bankName: "Agrobank",
    bankAccount: "20208000700789012345",
    mfo: "00003",
  },
  {
    name: 'ООО "Технопарк Сервис"',
    shortName: "Технопарк",
    type: "partner",
    inn: "311234567",
    contactPerson: "Равшан Тошматов",
    phone: "+998901234574",
    email: "service@technopark.uz",
    bankName: "Uzpromstroybank",
    bankAccount: "20208000800890123456",
    mfo: "00067",
  },
];

const PROMO_CODES = [
  {
    code: "SPRING2026",
    name: "Весенняя скидка 10%",
    description: "Скидка 10% на все напитки в марте 2026",
    type: "percentage",
    value: 10,
    status: "active",
    maxTotalUses: 500,
    maxUsesPerUser: 3,
    validFrom: "2026-03-01",
    validUntil: "2026-03-31",
  },
  {
    code: "WELCOME",
    name: "Приветственный бонус",
    description: "5000 UZS скидка для новых пользователей",
    type: "fixed_amount",
    value: 5000,
    status: "active",
    maxTotalUses: 1000,
    maxUsesPerUser: 1,
    validFrom: "2026-01-01",
    validUntil: "2026-12-31",
  },
  {
    code: "LOYALTY50",
    name: "Программа лояльности +50",
    description: "50 бонусных баллов за каждый заказ",
    type: "loyalty_bonus",
    value: 50,
    status: "active",
    maxTotalUses: null,
    maxUsesPerUser: 100,
    validFrom: "2026-01-01",
    validUntil: "2026-06-30",
  },
  {
    code: "COFFEE20",
    name: "Скидка на кофе 20%",
    description: "20% на все кофейные напитки",
    type: "percentage",
    value: 20,
    status: "active",
    maxTotalUses: 200,
    maxUsesPerUser: 5,
    validFrom: "2026-03-01",
    validUntil: "2026-04-30",
    minOrderAmount: 15000,
    maxDiscountAmount: 10000,
  },
  {
    code: "SUMMER2025",
    name: "Летняя акция 2025",
    description: "Прошлогодняя акция",
    type: "percentage",
    value: 15,
    status: "expired",
    maxTotalUses: 300,
    maxUsesPerUser: 2,
    currentTotalUses: 287,
    validFrom: "2025-06-01",
    validUntil: "2025-08-31",
  },
  {
    code: "RAMADAN2026",
    name: "Рамадан — iftar скидка",
    description: "Скидка 3000 UZS на напитки после 18:00",
    type: "fixed_amount",
    value: 3000,
    status: "draft",
    maxTotalUses: 1000,
    maxUsesPerUser: 30,
    validFrom: "2026-03-22",
    validUntil: "2026-04-21",
  },
];

const BANK_DEPOSITS = [
  {
    amount: 15_450_000,
    date: "2026-02-01",
    notes: "Инкассация за январь — маршрут A",
  },
  {
    amount: 12_300_000,
    date: "2026-02-05",
    notes: "Инкассация за январь — маршрут B",
  },
  {
    amount: 18_750_000,
    date: "2026-02-10",
    notes: "Инкассация KIUT + Samarqand",
  },
  { amount: 9_800_000, date: "2026-02-15", notes: "Инкассация ТЦ" },
  {
    amount: 22_100_000,
    date: "2026-02-20",
    notes: "Инкассация общая — февраль",
  },
  {
    amount: 14_670_000,
    date: "2026-02-25",
    notes: "Инкассация Humo Arena + City Mall",
  },
  {
    amount: 16_340_000,
    date: "2026-03-01",
    notes: "Инкассация за февраль — маршрут A",
  },
  {
    amount: 11_890_000,
    date: "2026-03-05",
    notes: "Инкассация за февраль — маршрут B",
  },
  { amount: 19_200_000, date: "2026-03-08", notes: "Инкассация общая — март" },
];

// ============================================================================
// SEED FUNCTION
// ============================================================================

async function seedBusinessData(ds: DataSource) {
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    // Find the organization
    const orgs = await qr.query(
      `SELECT id FROM organizations WHERE name IS NOT NULL ORDER BY created_at LIMIT 1`,
    );
    if (!orgs.length) {
      throw new Error("No organization found. Run admin-seed first.");
    }
    const orgId = orgs[0].id;

    // Find a user for created_by
    const users = await qr.query(
      `SELECT id FROM users WHERE organization_id = $1 LIMIT 1`,
      [orgId],
    );
    const userId = users.length ? users[0].id : null;

    console.log(`Organization: ${orgId}`);
    console.log(`User: ${userId}`);

    // ── Counterparties ──────────────────────────────────────────────────
    const existingCP = await qr.query(
      `SELECT COUNT(*) as cnt FROM counterparties WHERE organization_id = $1`,
      [orgId],
    );
    if (Number(existingCP[0].cnt) === 0) {
      console.log("Seeding counterparties...");
      for (const cp of COUNTERPARTIES) {
        const id = uuid();
        await qr.query(
          `INSERT INTO counterparties (
            id, organization_id, name, short_name, type, inn,
            contact_person, phone, email, bank_name, bank_account, mfo,
            is_vat_payer, vat_rate, is_active,
            created_by_id, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())`,
          [
            id,
            orgId,
            cp.name,
            cp.shortName,
            cp.type,
            cp.inn,
            cp.contactPerson,
            cp.phone,
            cp.email,
            cp.bankName,
            cp.bankAccount,
            cp.mfo,
            true,
            15.0,
            true,
            userId,
          ],
        );
      }
      console.log(`  ✓ ${COUNTERPARTIES.length} counterparties created`);

      // ── Contracts ───────────────────────────────────────────────────────
      console.log("Seeding contracts...");
      const cpRows = await qr.query(
        `SELECT id, type, short_name FROM counterparties WHERE organization_id = $1`,
        [orgId],
      );

      let contractCount = 0;
      for (const cp of cpRows) {
        const contractId = uuid();
        const isSupplier = cp.type === "SUPPLIER";
        const isLocation = cp.type === "LOCATION_OWNER";

        await qr.query(
          `INSERT INTO contracts (
            id, organization_id, contract_number, start_date, end_date, status,
            counterparty_id, commission_type, commission_rate, commission_fixed_amount,
            commission_fixed_period, currency, payment_term_days, payment_type,
            created_by_id, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW())`,
          [
            contractId,
            orgId,
            `CTR-2026-${String(contractCount + 1).padStart(3, "0")}`,
            "2026-01-01",
            "2026-12-31",
            "active",
            cp.id,
            isLocation ? "percentage" : isSupplier ? "fixed" : "hybrid",
            isLocation ? 15.0 : null,
            isSupplier ? 500000 : null,
            isSupplier ? "monthly" : null,
            "UZS",
            isSupplier ? 30 : 15,
            isSupplier ? "postpayment" : "prepayment",
            userId,
          ],
        );
        contractCount++;
      }
      console.log(`  ✓ ${contractCount} contracts created`);
    } else {
      console.log(
        `Counterparties already seeded (${existingCP[0].cnt} rows), skipping.`,
      );
    }

    // ── Promo Codes ─────────────────────────────────────────────────────
    const existingPromo = await qr.query(
      `SELECT COUNT(*) as cnt FROM promo_codes WHERE organization_id = $1`,
      [orgId],
    );
    if (Number(existingPromo[0].cnt) === 0) {
      console.log("Seeding promo codes...");
      for (const p of PROMO_CODES) {
        await qr.query(
          `INSERT INTO promo_codes (
            id, organization_id, code, name, description, type, value, status,
            max_total_uses, max_uses_per_user, current_total_uses,
            valid_from, valid_until,
            min_order_amount, max_discount_amount,
            created_by_id, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())`,
          [
            uuid(),
            orgId,
            p.code,
            p.name,
            p.description,
            p.type,
            p.value,
            p.status,
            p.maxTotalUses,
            p.maxUsesPerUser,
            (p as Record<string, unknown>).currentTotalUses ?? 0,
            p.validFrom,
            p.validUntil,
            (p as Record<string, unknown>).minOrderAmount ?? null,
            (p as Record<string, unknown>).maxDiscountAmount ?? null,
            userId,
          ],
        );
      }
      console.log(`  ✓ ${PROMO_CODES.length} promo codes created`);
    } else {
      console.log(
        `Promo codes already seeded (${existingPromo[0].cnt} rows), skipping.`,
      );
    }

    // ── Bank Deposits ───────────────────────────────────────────────────
    const existingDeposits = await qr.query(
      `SELECT COUNT(*) as cnt FROM bank_deposits WHERE organization_id = $1`,
      [orgId],
    );
    if (Number(existingDeposits[0].cnt) === 0) {
      console.log("Seeding bank deposits...");
      for (const d of BANK_DEPOSITS) {
        await qr.query(
          `INSERT INTO bank_deposits (
            id, organization_id, amount, deposit_date, notes,
            created_by_id, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
          [uuid(), orgId, d.amount, d.date, d.notes, userId],
        );
      }
      console.log(`  ✓ ${BANK_DEPOSITS.length} bank deposits created`);
    } else {
      console.log(
        `Bank deposits already seeded (${existingDeposits[0].cnt} rows), skipping.`,
      );
    }

    await qr.commitTransaction();
    console.log("\n✅ Business data seed completed successfully!");
  } catch (err) {
    await qr.rollbackTransaction();
    console.error("❌ Seed failed:", err);
    throw err;
  } finally {
    await qr.release();
  }
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
  const path = require("path");

  const dotenv = require("dotenv");

  dotenv.config({ path: path.join(__dirname, "../../../.env") });

  const { dataSourceOptions } = require("../typeorm.config");
  const ds = new DataSource(dataSourceOptions);

  ds.initialize()
    .then(() => seedBusinessData(ds))
    .then(() => ds.destroy())
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error(err);
      process.exit(1);
    });
}

export { seedBusinessData };
