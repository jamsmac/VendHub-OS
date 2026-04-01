import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Seed TEST data for machines, containers, slots, and components.
 *
 * These records simulate a realistic fleet for development/demo purposes.
 * All test data uses a known organization and user so it shows in the UI.
 *
 * ⚠️ TEST DATA — replace with real data before production!
 *
 * Convention: test UUIDs use pattern:
 *   Machines:   m1000000-0000-0000-0000-00000000000X
 *   Containers: c1000000-0000-0000-0000-00000000000X
 *   Slots:      s1000000-0000-0000-0000-00000000000X
 *   Components: e1000000-0000-0000-0000-00000000000X
 */
export class SeedTestMachinesData1775300000000 implements MigrationInterface {
  name = "SeedTestMachinesData1775300000000";

  // Known IDs from seed data / auth logs
  private readonly ORG_ID = "d0000000-0000-0000-0000-000000000001";
  private readonly USER_ID = "a0000000-0000-0000-0000-000000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ════════════════════════════════════════════════════════════
    // 1. MACHINES — 5 test machines covering all major types
    // ════════════════════════════════════════════════════════════

    // Machine 1: Coffee (active, with containers)
    await queryRunner.query(`
      INSERT INTO "machines" (
        "id", "machine_number", "name", "serial_number", "type", "status",
        "manufacturer", "model", "max_product_slots", "content_model",
        "is_active", "organization_id", "created_by_id"
      ) VALUES (
        'm1000000-0000-0000-0000-000000000001',
        'CF-001', 'Кофе ТЦ Мега Планет', 'NEC-2024-001', 'coffee', 'active',
        'Necta', 'Korinto Prime', 0, 'containers',
        true, '${this.ORG_ID}', '${this.USER_ID}'
      ) ON CONFLICT DO NOTHING
    `);

    // Machine 2: Snack (active, with slots)
    await queryRunner.query(`
      INSERT INTO "machines" (
        "id", "machine_number", "name", "serial_number", "type", "status",
        "manufacturer", "model", "max_product_slots", "content_model",
        "is_active", "organization_id", "created_by_id"
      ) VALUES (
        'm1000000-0000-0000-0000-000000000002',
        'SN-001', 'Снэки метро Чиланзар', 'JOF-2024-042', 'snack', 'active',
        'Jofemar', 'Vision ES Plus', 24, 'slots',
        true, '${this.ORG_ID}', '${this.USER_ID}'
      ) ON CONFLICT DO NOTHING
    `);

    // Machine 3: Water (low_stock)
    await queryRunner.query(`
      INSERT INTO "machines" (
        "id", "machine_number", "name", "serial_number", "type", "status",
        "manufacturer", "model", "max_product_slots", "content_model",
        "is_active", "organization_id", "created_by_id"
      ) VALUES (
        'm1000000-0000-0000-0000-000000000003',
        'WA-001', 'Водомат Офис Mirzo', 'WAT-2023-100', 'water', 'low_stock',
        NULL, NULL, 0, 'containers',
        true, '${this.ORG_ID}', '${this.USER_ID}'
      ) ON CONFLICT DO NOTHING
    `);

    // Machine 4: Combo (maintenance)
    await queryRunner.query(`
      INSERT INTO "machines" (
        "id", "machine_number", "name", "serial_number", "type", "status",
        "manufacturer", "model", "max_product_slots", "content_model",
        "is_active", "organization_id", "created_by_id"
      ) VALUES (
        'm1000000-0000-0000-0000-000000000004',
        'CB-001', 'Комбо БЦ Инконел', 'CMB-2024-007', 'combo', 'maintenance',
        NULL, NULL, 12, 'mixed',
        true, '${this.ORG_ID}', '${this.USER_ID}'
      ) ON CONFLICT DO NOTHING
    `);

    // Machine 5: Drink (offline)
    await queryRunner.query(`
      INSERT INTO "machines" (
        "id", "machine_number", "name", "serial_number", "type", "status",
        "manufacturer", "model", "max_product_slots", "content_model",
        "is_active", "organization_id", "created_by_id"
      ) VALUES (
        'm1000000-0000-0000-0000-000000000005',
        'DR-001', 'Напитки ТЦ Samarqand Darvoza', 'JOF-2023-088', 'drink', 'offline',
        'Jofemar', 'Arctic 272', 18, 'slots',
        false, '${this.ORG_ID}', '${this.USER_ID}'
      ) ON CONFLICT DO NOTHING
    `);

    // ════════════════════════════════════════════════════════════
    // 2. CONTAINERS (bunkers) — for Machine 1 (coffee) and Machine 3 (water)
    // ════════════════════════════════════════════════════════════

    const coffeeContainers = [
      {
        id: "c1000000-0000-0000-0000-000000000001",
        num: 1,
        name: "Кофе зёрна",
        cap: 1200,
        unit: "g",
        cur: 850,
        min: 100,
      },
      {
        id: "c1000000-0000-0000-0000-000000000002",
        num: 2,
        name: "Молоко сухое",
        cap: 800,
        unit: "g",
        cur: 320,
        min: 80,
      },
      {
        id: "c1000000-0000-0000-0000-000000000003",
        num: 3,
        name: "Вода",
        cap: 5000,
        unit: "ml",
        cur: 3200,
        min: 500,
      },
      {
        id: "c1000000-0000-0000-0000-000000000004",
        num: 4,
        name: "Сахар",
        cap: 1000,
        unit: "g",
        cur: 720,
        min: 100,
      },
      {
        id: "c1000000-0000-0000-0000-000000000005",
        num: 5,
        name: "Стаканчики",
        cap: 100,
        unit: "pcs",
        cur: 45,
        min: 10,
      },
    ];

    for (const c of coffeeContainers) {
      await queryRunner.query(`
        INSERT INTO "containers" (
          "id", "machine_id", "slot_number", "name", "capacity", "unit",
          "current_quantity", "min_level", "status",
          "organization_id", "created_by_id"
        ) VALUES (
          '${c.id}',
          'm1000000-0000-0000-0000-000000000001',
          ${c.num}, '${c.name}', ${c.cap}, '${c.unit}',
          ${c.cur}, ${c.min}, 'active',
          '${this.ORG_ID}', '${this.USER_ID}'
        ) ON CONFLICT DO NOTHING
      `);
    }

    // Water machine — 1 big tank (low level!)
    await queryRunner.query(`
      INSERT INTO "containers" (
        "id", "machine_id", "slot_number", "name", "capacity", "unit",
        "current_quantity", "min_level", "status",
        "organization_id", "created_by_id"
      ) VALUES (
        'c1000000-0000-0000-0000-000000000006',
        'm1000000-0000-0000-0000-000000000003',
        1, 'Бак очищенной воды', 500000, 'ml',
        35000, 50000, 'low',
        '${this.ORG_ID}', '${this.USER_ID}'
      ) ON CONFLICT DO NOTHING
    `);

    // ════════════════════════════════════════════════════════════
    // 3. EQUIPMENT COMPONENTS — for machines 1, 2, 3
    // ════════════════════════════════════════════════════════════

    const components = [
      // Coffee machine components
      {
        id: "e1000000-0000-0000-0000-000000000001",
        mid: "m1000000-0000-0000-0000-000000000001",
        type: "grinder",
        name: "Кофемолка Necta",
        status: "installed",
        loc: "machine",
      },
      {
        id: "e1000000-0000-0000-0000-000000000002",
        mid: "m1000000-0000-0000-0000-000000000001",
        type: "brew_unit",
        name: "Варочный блок",
        status: "installed",
        loc: "machine",
      },
      {
        id: "e1000000-0000-0000-0000-000000000003",
        mid: "m1000000-0000-0000-0000-000000000001",
        type: "pump",
        name: "Водяной насос",
        status: "installed",
        loc: "machine",
      },
      {
        id: "e1000000-0000-0000-0000-000000000004",
        mid: "m1000000-0000-0000-0000-000000000001",
        type: "board",
        name: "Плата управления v3.2",
        status: "installed",
        loc: "machine",
      },
      // Snack machine components
      {
        id: "e1000000-0000-0000-0000-000000000005",
        mid: "m1000000-0000-0000-0000-000000000002",
        type: "motor",
        name: "Спиральный мотор A-ряд",
        status: "installed",
        loc: "machine",
      },
      {
        id: "e1000000-0000-0000-0000-000000000006",
        mid: "m1000000-0000-0000-0000-000000000002",
        type: "motor",
        name: "Спиральный мотор B-ряд",
        status: "installed",
        loc: "machine",
      },
      {
        id: "e1000000-0000-0000-0000-000000000007",
        mid: "m1000000-0000-0000-0000-000000000002",
        type: "board",
        name: "Контроллер Jofemar",
        status: "installed",
        loc: "machine",
      },
      // Water machine
      {
        id: "e1000000-0000-0000-0000-000000000008",
        mid: "m1000000-0000-0000-0000-000000000003",
        type: "pump",
        name: "Насос подачи воды",
        status: "installed",
        loc: "machine",
      },
      {
        id: "e1000000-0000-0000-0000-000000000009",
        mid: "m1000000-0000-0000-0000-000000000003",
        type: "filter",
        name: "Система фильтрации 5-ступ",
        status: "in_repair",
        loc: "repair",
      },
    ];

    for (const comp of components) {
      await queryRunner.query(`
        INSERT INTO "equipment_components" (
          "id", "machine_id", "component_type", "name", "component_status",
          "current_location_type", "organization_id", "created_by_id"
        ) VALUES (
          '${comp.id}',
          '${comp.mid}',
          '${comp.type}', '${comp.name}', '${comp.status}',
          '${comp.loc}',
          '${this.ORG_ID}', '${this.USER_ID}'
        ) ON CONFLICT DO NOTHING
      `);
    }

    // ════════════════════════════════════════════════════════════
    // 4. MACHINE SLOTS — for Machine 2 (snack, 24 slots) and Machine 5 (drink, 18 slots)
    // ════════════════════════════════════════════════════════════

    // Snack machine: 3 rows × 8 columns = 24 slots (deterministic fill levels)
    const snackFill = [
      8, 5, 10, 3, 7, 0, 6, 9, 4, 10, 2, 8, 5, 7, 1, 6, 9, 3, 7, 5, 0, 8, 4, 10,
    ];
    const snackSlots: { id: string; num: string; cap: number; cur: number }[] =
      [];
    let slotIdx = 1;
    for (const row of ["A", "B", "C"]) {
      for (let col = 1; col <= 8; col++) {
        snackSlots.push({
          id: `s1000000-0000-0000-0000-0000000000${String(slotIdx).padStart(2, "0")}`,
          num: `${row}${col}`,
          cap: 10,
          cur: snackFill[slotIdx - 1] ?? 0,
        });
        slotIdx++;
      }
    }

    for (const s of snackSlots) {
      await queryRunner.query(`
        INSERT INTO "machine_slots" (
          "id", "machine_id", "slot_number", "capacity", "current_quantity",
          "is_active", "created_by_id"
        ) VALUES (
          '${s.id}',
          'm1000000-0000-0000-0000-000000000002',
          '${s.num}', ${s.cap}, ${s.cur},
          true, '${this.USER_ID}'
        ) ON CONFLICT DO NOTHING
      `);
    }

    // Drink machine: 3 rows × 6 columns = 18 slots (deterministic fill levels)
    const drinkFill = [6, 3, 8, 0, 5, 7, 2, 8, 4, 6, 1, 5, 7, 0, 3, 8, 6, 2];
    const drinkSlots: { id: string; num: string; cap: number; cur: number }[] =
      [];
    slotIdx = 25; // continue from 25
    let drinkIdx = 0;
    for (const row of ["A", "B", "C"]) {
      for (let col = 1; col <= 6; col++) {
        drinkSlots.push({
          id: `s1000000-0000-0000-0000-0000000000${String(slotIdx).padStart(2, "0")}`,
          num: `${row}${col}`,
          cap: 8,
          cur: drinkFill[drinkIdx] ?? 0,
        });
        slotIdx++;
        drinkIdx++;
      }
    }

    for (const s of drinkSlots) {
      await queryRunner.query(`
        INSERT INTO "machine_slots" (
          "id", "machine_id", "slot_number", "capacity", "current_quantity",
          "is_active", "created_by_id"
        ) VALUES (
          '${s.id}',
          'm1000000-0000-0000-0000-000000000005',
          '${s.num}', ${s.cap}, ${s.cur},
          true, '${this.USER_ID}'
        ) ON CONFLICT DO NOTHING
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove test data in reverse dependency order
    await queryRunner.query(`
      DELETE FROM "machine_slots" WHERE "id" LIKE 's1000000-%'
    `);
    await queryRunner.query(`
      DELETE FROM "equipment_components" WHERE "id" LIKE 'e1000000-%'
    `);
    await queryRunner.query(`
      DELETE FROM "containers" WHERE "id" LIKE 'c1000000-%'
    `);
    await queryRunner.query(`
      DELETE FROM "machines" WHERE "id" LIKE 'm1000000-%'
    `);
  }
}
