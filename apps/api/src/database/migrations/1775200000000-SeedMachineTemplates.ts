import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Seed default machine templates for common vending machine types.
 *
 * These are system templates (is_system = true) that cannot be deleted.
 * Organizations can create their own custom templates too.
 *
 * Template types:
 * - Coffee (containers: beans, milk, water, sugar, cups)
 * - Snack (slots: A1-A8, B1-B8, C1-C8 = 24 cells)
 * - Drink (slots: A1-A6, B1-B6, C1-C6 = 18 cells)
 * - Water (containers: purified water tank)
 * - Combo (mixed: containers for coffee + slots for snacks)
 * - Fresh food (slots: A1-A6, B1-B6 = 12 cells, with cooling component)
 * - Ice cream (slots: A1-A4, B1-B4 = 8 cells, with freezer component)
 */
export class SeedMachineTemplates1775200000000 implements MigrationInterface {
  name = "SeedMachineTemplates1775200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Coffee machine template
    await queryRunner.query(`
      INSERT INTO "machine_templates" (
        "name", "type", "content_model", "manufacturer", "model",
        "description", "max_product_slots",
        "default_containers", "default_slots", "default_components",
        "accepts_cash", "accepts_card", "accepts_qr", "accepts_nfc",
        "is_system", "is_active", "organization_id"
      ) VALUES (
        'Кофемашина (стандарт)', 'coffee', 'containers', 'Necta', 'Korinto Prime',
        'Стандартный шаблон для кофейного автомата с 5 бункерами и кофемолкой',
        0,
        '${JSON.stringify([
          { slotNumber: 1, name: "Кофе зёрна", capacity: 1200, unit: "g", minLevel: 100 },
          { slotNumber: 2, name: "Молоко сухое", capacity: 800, unit: "g", minLevel: 80 },
          { slotNumber: 3, name: "Вода", capacity: 5000, unit: "ml", minLevel: 500 },
          { slotNumber: 4, name: "Сахар", capacity: 1000, unit: "g", minLevel: 100 },
          { slotNumber: 5, name: "Стаканчики", capacity: 100, unit: "pcs", minLevel: 10 },
        ])}',
        '[]',
        '${JSON.stringify([
          { componentType: "grinder", name: "Встроенная кофемолка" },
          { componentType: "brew_unit", name: "Варочный блок" },
          { componentType: "pump", name: "Водяной насос" },
        ])}',
        true, false, true, false,
        true, true,
        '00000000-0000-0000-0000-000000000000'
      )
    `);

    // Snack machine template
    await queryRunner.query(`
      INSERT INTO "machine_templates" (
        "name", "type", "content_model", "manufacturer", "model",
        "description", "max_product_slots",
        "default_containers", "default_slots", "default_components",
        "accepts_cash", "accepts_card", "accepts_qr", "accepts_nfc",
        "is_system", "is_active", "organization_id"
      ) VALUES (
        'Снэк-автомат (стандарт)', 'snack', 'slots', 'Jofemar', 'Vision ES Plus',
        'Стандартный шаблон для снэк-автомата с 24 ячейками (3 ряда по 8)',
        24,
        '[]',
        '${JSON.stringify([
          ...["A", "B", "C"].flatMap((row) =>
            Array.from({ length: 8 }, (_, i) => ({
              slotNumber: `${row}${i + 1}`,
              capacity: 10,
            })),
          ),
        ])}',
        '${JSON.stringify([
          { componentType: "motor", name: "Спиральный мотор" },
          { componentType: "other", name: "Купюроприёмник" },
        ])}',
        true, true, true, false,
        true, true,
        '00000000-0000-0000-0000-000000000000'
      )
    `);

    // Drink machine template
    await queryRunner.query(`
      INSERT INTO "machine_templates" (
        "name", "type", "content_model", "manufacturer", "model",
        "description", "max_product_slots",
        "default_containers", "default_slots", "default_components",
        "accepts_cash", "accepts_card", "accepts_qr", "accepts_nfc",
        "is_system", "is_active", "organization_id"
      ) VALUES (
        'Напитки (стандарт)', 'drink', 'slots', 'Jofemar', 'Arctic 272',
        'Стандартный шаблон для автомата прохладительных напитков (18 ячеек, 3x6)',
        18,
        '[]',
        '${JSON.stringify([
          ...["A", "B", "C"].flatMap((row) =>
            Array.from({ length: 6 }, (_, i) => ({
              slotNumber: `${row}${i + 1}`,
              capacity: 8,
            })),
          ),
        ])}',
        '${JSON.stringify([
          { componentType: "compressor", name: "Система охлаждения" },
          { componentType: "other", name: "Купюроприёмник" },
        ])}',
        true, true, true, false,
        true, true,
        '00000000-0000-0000-0000-000000000000'
      )
    `);

    // Water machine template
    await queryRunner.query(`
      INSERT INTO "machine_templates" (
        "name", "type", "content_model", "manufacturer", "model",
        "description", "max_product_slots",
        "default_containers", "default_slots", "default_components",
        "accepts_cash", "accepts_card", "accepts_qr", "accepts_nfc",
        "is_system", "is_active", "organization_id"
      ) VALUES (
        'Водомат (стандарт)', 'water', 'containers', NULL, NULL,
        'Стандартный шаблон для водомата с одним баком очищенной воды',
        0,
        '${JSON.stringify([
          { slotNumber: 1, name: "Бак очищенной воды", capacity: 500000, unit: "ml", minLevel: 50000 },
        ])}',
        '[]',
        '${JSON.stringify([
          { componentType: "other", name: "Система фильтрации" },
          { componentType: "other", name: "УФ-лампа обеззараживания" },
          { componentType: "pump", name: "Водяной насос" },
        ])}',
        true, true, true, false,
        true, true,
        '00000000-0000-0000-0000-000000000000'
      )
    `);

    // Combo machine template
    await queryRunner.query(`
      INSERT INTO "machine_templates" (
        "name", "type", "content_model", "manufacturer", "model",
        "description", "max_product_slots",
        "default_containers", "default_slots", "default_components",
        "accepts_cash", "accepts_card", "accepts_qr", "accepts_nfc",
        "is_system", "is_active", "organization_id"
      ) VALUES (
        'Комбо-автомат (стандарт)', 'combo', 'mixed', NULL, NULL,
        'Комбинированный автомат: кофе (бункеры) + снэки (ячейки)',
        12,
        '${JSON.stringify([
          { slotNumber: 1, name: "Кофе зёрна", capacity: 1200, unit: "g", minLevel: 100 },
          { slotNumber: 2, name: "Молоко сухое", capacity: 800, unit: "g", minLevel: 80 },
          { slotNumber: 3, name: "Вода", capacity: 5000, unit: "ml", minLevel: 500 },
          { slotNumber: 4, name: "Сахар", capacity: 1000, unit: "g", minLevel: 100 },
        ])}',
        '${JSON.stringify([
          ...["A", "B"].flatMap((row) =>
            Array.from({ length: 6 }, (_, i) => ({
              slotNumber: `${row}${i + 1}`,
              capacity: 8,
            })),
          ),
        ])}',
        '${JSON.stringify([
          { componentType: "grinder", name: "Кофемолка" },
          { componentType: "motor", name: "Спиральный мотор" },
          { componentType: "other", name: "Купюроприёмник" },
        ])}',
        true, true, true, false,
        true, true,
        '00000000-0000-0000-0000-000000000000'
      )
    `);

    // Fresh food machine template
    await queryRunner.query(`
      INSERT INTO "machine_templates" (
        "name", "type", "content_model", "manufacturer", "model",
        "description", "max_product_slots",
        "default_containers", "default_slots", "default_components",
        "accepts_cash", "accepts_card", "accepts_qr", "accepts_nfc",
        "is_system", "is_active", "organization_id"
      ) VALUES (
        'Свежая еда (стандарт)', 'fresh', 'slots', NULL, NULL,
        'Автомат свежей еды с охлаждением (12 ячеек, 2x6)',
        12,
        '[]',
        '${JSON.stringify([
          ...["A", "B"].flatMap((row) =>
            Array.from({ length: 6 }, (_, i) => ({
              slotNumber: `${row}${i + 1}`,
              capacity: 6,
            })),
          ),
        ])}',
        '${JSON.stringify([
          { componentType: "compressor", name: "Система охлаждения" },
          { componentType: "dispenser", name: "Конвейерная лента" },
        ])}',
        true, true, true, false,
        true, true,
        '00000000-0000-0000-0000-000000000000'
      )
    `);

    // Ice cream machine template
    await queryRunner.query(`
      INSERT INTO "machine_templates" (
        "name", "type", "content_model", "manufacturer", "model",
        "description", "max_product_slots",
        "default_containers", "default_slots", "default_components",
        "accepts_cash", "accepts_card", "accepts_qr", "accepts_nfc",
        "is_system", "is_active", "organization_id"
      ) VALUES (
        'Мороженое (стандарт)', 'ice_cream', 'slots', NULL, NULL,
        'Автомат мороженого с морозильной камерой (8 ячеек, 2x4)',
        8,
        '[]',
        '${JSON.stringify([
          ...["A", "B"].flatMap((row) =>
            Array.from({ length: 4 }, (_, i) => ({
              slotNumber: `${row}${i + 1}`,
              capacity: 8,
            })),
          ),
        ])}',
        '${JSON.stringify([
          { componentType: "compressor", name: "Морозильная камера (-18°C)" },
          { componentType: "other", name: "Купюроприёмник" },
        ])}',
        true, true, true, false,
        true, true,
        '00000000-0000-0000-0000-000000000000'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "machine_templates" WHERE "is_system" = true`,
    );
  }
}
