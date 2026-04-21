import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePurchasesAndExtendPriceHistory1776500000000 implements MigrationInterface {
  name = "CreatePurchasesAndExtendPriceHistory1776500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ────────────────────────────────────────────────
    // 1. Enums
    // ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE purchase_status_enum AS ENUM (
        'draft', 'received', 'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE payment_method_enum AS ENUM (
        'cash', 'card_humo', 'card_uzcard', 'card_visa',
        'transfer', 'payme', 'click', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE price_type_enum AS ENUM ('cost', 'selling')
    `);

    // ────────────────────────────────────────────────
    // 2. purchases table
    // ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        number VARCHAR(100),
        supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
        supplier_name_snapshot VARCHAR(255),
        warehouse_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        payment_method payment_method_enum,
        status purchase_status_enum NOT NULL DEFAULT 'draft',
        purchase_date TIMESTAMP WITH TIME ZONE NOT NULL,
        received_at TIMESTAMP WITH TIME ZONE,
        total_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
        total_items INT NOT NULL DEFAULT 0,
        note TEXT,
        by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by_id UUID,
        updated_by_id UUID
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_purchases_org_status ON purchases (organization_id, status)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_purchases_org_date ON purchases (organization_id, purchase_date DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_purchases_org_supplier ON purchases (organization_id, supplier_id)
        WHERE supplier_id IS NOT NULL
    `);

    // ────────────────────────────────────────────────
    // 3. purchase_items table
    // ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE purchase_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity INT NOT NULL CHECK (quantity > 0),
        unit_cost DECIMAL(12, 2) NOT NULL CHECK (unit_cost >= 0),
        line_total DECIMAL(14, 2) NOT NULL,
        note TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by_id UUID,
        updated_by_id UUID
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_purchase_items_purchase ON purchase_items (purchase_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_purchase_items_product ON purchase_items (product_id)
    `);

    // ────────────────────────────────────────────────
    // 4. Extend product_price_history
    // ────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE product_price_history
        ADD COLUMN IF NOT EXISTS price_type price_type_enum NOT NULL DEFAULT 'cost'
    `);
    await queryRunner.query(`
      ALTER TABLE product_price_history
        ADD COLUMN IF NOT EXISTS reason TEXT
    `);
    await queryRunner.query(`
      ALTER TABLE product_price_history
        ADD COLUMN IF NOT EXISTS organization_id UUID
    `);
    await queryRunner.query(`
      ALTER TABLE product_price_history
        ADD COLUMN IF NOT EXISTS old_price DECIMAL(15, 2)
    `);
    await queryRunner.query(`
      ALTER TABLE product_price_history
        ADD COLUMN IF NOT EXISTS new_price DECIMAL(15, 2)
    `);
    await queryRunner.query(`
      ALTER TABLE product_price_history
        ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE product_price_history
        ADD COLUMN IF NOT EXISTS supplier_name_snapshot VARCHAR(255)
    `);
    await queryRunner.query(`
      ALTER TABLE product_price_history
        ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_price_history_purchase
        ON product_price_history (purchase_id)
        WHERE purchase_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_price_history_supplier
        ON product_price_history (supplier_id)
        WHERE supplier_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_price_history_org_product
        ON product_price_history (organization_id, product_id)
        WHERE organization_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert price history extensions
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_price_history_org_product`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_price_history_supplier`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_price_history_purchase`);
    await queryRunner.query(
      `ALTER TABLE product_price_history DROP COLUMN IF EXISTS purchase_id`,
    );
    await queryRunner.query(
      `ALTER TABLE product_price_history DROP COLUMN IF EXISTS supplier_name_snapshot`,
    );
    await queryRunner.query(
      `ALTER TABLE product_price_history DROP COLUMN IF EXISTS supplier_id`,
    );
    await queryRunner.query(
      `ALTER TABLE product_price_history DROP COLUMN IF EXISTS new_price`,
    );
    await queryRunner.query(
      `ALTER TABLE product_price_history DROP COLUMN IF EXISTS old_price`,
    );
    await queryRunner.query(
      `ALTER TABLE product_price_history DROP COLUMN IF EXISTS organization_id`,
    );
    await queryRunner.query(
      `ALTER TABLE product_price_history DROP COLUMN IF EXISTS reason`,
    );
    await queryRunner.query(
      `ALTER TABLE product_price_history DROP COLUMN IF EXISTS price_type`,
    );

    // Drop purchase tables
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchases`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS price_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_method_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS purchase_status_enum`);
  }
}
