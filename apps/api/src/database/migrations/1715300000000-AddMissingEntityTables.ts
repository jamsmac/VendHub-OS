import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates 6 missing entity tables:
 * - permissions (RBAC)
 * - purchase_history
 * - stock_opening_balances
 * - trip_stops
 * - trip_anomalies
 * - trip_points
 *
 * All tables use IF NOT EXISTS for idempotency.
 */
export class AddMissingEntityTables1715300000000 implements MigrationInterface {
  name = "AddMissingEntityTables1715300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── permissions ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id"            uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name"          varchar(100) NOT NULL,
        "resource"      varchar(100) NOT NULL,
        "action"        varchar(50) NOT NULL,
        "description"   varchar(255),
        "is_active"     boolean NOT NULL DEFAULT true,
        "created_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at"    TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_permissions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_permissions_name"
        ON "permissions" ("name")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_permissions_resource_action"
        ON "permissions" ("resource", "action")
    `);

    // ── purchase_history ────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_history_status_enum') THEN
          CREATE TYPE "purchase_history_status_enum"
            AS ENUM ('PENDING','RECEIVED','PARTIAL','CANCELLED','RETURNED');
        END IF;
      END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchase_history" (
        "id"                uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id"   uuid NOT NULL,
        "purchase_date"     date NOT NULL,
        "invoice_number"    varchar(50),
        "supplier_id"       uuid,
        "product_id"        uuid NOT NULL,
        "warehouse_id"      uuid,
        "quantity"          decimal(15,3) NOT NULL,
        "unit"              varchar(20) NOT NULL DEFAULT 'pcs',
        "unit_price"        decimal(15,2) NOT NULL,
        "vat_rate"          decimal(5,2) NOT NULL DEFAULT 12,
        "vat_amount"        decimal(15,2) NOT NULL DEFAULT 0,
        "total_amount"      decimal(15,2) NOT NULL,
        "batch_number"      varchar(50),
        "production_date"   date,
        "expiry_date"       date,
        "status"            "purchase_history_status_enum" NOT NULL DEFAULT 'PENDING',
        "delivery_date"     date,
        "delivery_note_number" varchar(50),
        "currency"          varchar(3) NOT NULL DEFAULT 'UZS',
        "exchange_rate"     decimal(10,4) NOT NULL DEFAULT 1,
        "payment_method"    varchar(50),
        "payment_date"      date,
        "import_source"     varchar(50),
        "import_session_id" uuid,
        "notes"             text,
        "metadata"          jsonb NOT NULL DEFAULT '{}',
        "created_at"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at"        TIMESTAMP WITH TIME ZONE,
        "created_by_id"     uuid,
        "updated_by_id"     uuid,
        CONSTRAINT "PK_purchase_history" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ph_organization_id" ON "purchase_history" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ph_supplier_id"     ON "purchase_history" ("supplier_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ph_product_id"      ON "purchase_history" ("product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ph_warehouse_id"    ON "purchase_history" ("warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ph_purchase_date"   ON "purchase_history" ("purchase_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ph_status"          ON "purchase_history" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ph_invoice_number"  ON "purchase_history" ("invoice_number")`,
    );

    // ── stock_opening_balances ──────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stock_opening_balances" (
        "id"                uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id"   uuid NOT NULL,
        "product_id"        uuid NOT NULL,
        "warehouse_id"      uuid NOT NULL,
        "balance_date"      date NOT NULL,
        "quantity"          decimal(15,3) NOT NULL,
        "unit"              varchar(20) NOT NULL DEFAULT 'pcs',
        "unit_cost"         decimal(15,2) NOT NULL,
        "total_cost"        decimal(15,2) NOT NULL,
        "batch_number"      varchar(50),
        "expiry_date"       date,
        "location"          varchar(100),
        "is_applied"        boolean NOT NULL DEFAULT false,
        "applied_at"        TIMESTAMP WITH TIME ZONE,
        "applied_by_user_id" uuid,
        "import_source"     varchar(50),
        "import_session_id" uuid,
        "notes"             text,
        "metadata"          jsonb NOT NULL DEFAULT '{}',
        "created_at"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at"        TIMESTAMP WITH TIME ZONE,
        "created_by_id"     uuid,
        "updated_by_id"     uuid,
        CONSTRAINT "PK_stock_opening_balances" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sob_organization_id" ON "stock_opening_balances" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sob_product_id"      ON "stock_opening_balances" ("product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sob_warehouse_id"    ON "stock_opening_balances" ("warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sob_balance_date"    ON "stock_opening_balances" ("balance_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sob_is_applied"      ON "stock_opening_balances" ("is_applied")`,
    );

    // ── trip_stops ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_stops" (
        "id"                      uuid NOT NULL DEFAULT uuid_generate_v4(),
        "trip_id"                 uuid NOT NULL,
        "latitude"                decimal(10,8) NOT NULL,
        "longitude"               decimal(11,8) NOT NULL,
        "machine_id"              uuid,
        "machine_name"            varchar(128),
        "machine_address"         varchar(256),
        "distance_to_machine_meters" int,
        "started_at"              TIMESTAMP WITH TIME ZONE NOT NULL,
        "ended_at"                TIMESTAMP WITH TIME ZONE,
        "duration_seconds"        int,
        "is_verified"             boolean NOT NULL DEFAULT false,
        "is_anomaly"              boolean NOT NULL DEFAULT false,
        "notification_sent"       boolean NOT NULL DEFAULT false,
        "notes"                   text,
        "created_at"              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at"              TIMESTAMP WITH TIME ZONE,
        "created_by_id"           uuid,
        "updated_by_id"           uuid,
        CONSTRAINT "PK_trip_stops" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_stops_trip" FOREIGN KEY ("trip_id")
          REFERENCES "trips"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ts_trip_id"    ON "trip_stops" ("trip_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ts_machine_id" ON "trip_stops" ("machine_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ts_started_at" ON "trip_stops" ("started_at")`,
    );

    // ── trip_anomalies ──────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_anomaly_type_enum') THEN
          CREATE TYPE "trip_anomaly_type_enum"
            AS ENUM ('long_stop','speed_violation','route_deviation','gps_jump','missed_location','unplanned_stop','mileage_discrepancy');
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_anomaly_severity_enum') THEN
          CREATE TYPE "trip_anomaly_severity_enum"
            AS ENUM ('info','warning','critical');
        END IF;
      END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_anomalies" (
        "id"                uuid NOT NULL DEFAULT uuid_generate_v4(),
        "trip_id"           uuid NOT NULL,
        "type"              "trip_anomaly_type_enum" NOT NULL,
        "severity"          "trip_anomaly_severity_enum" NOT NULL DEFAULT 'warning',
        "latitude"          decimal(10,8),
        "longitude"         decimal(11,8),
        "details"           jsonb NOT NULL DEFAULT '{}',
        "notification_sent" boolean NOT NULL DEFAULT false,
        "resolved"          boolean NOT NULL DEFAULT false,
        "resolved_by_id"    uuid,
        "resolved_at"       TIMESTAMP WITH TIME ZONE,
        "resolution_notes"  text,
        "detected_at"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_at"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at"        TIMESTAMP WITH TIME ZONE,
        "created_by_id"     uuid,
        "updated_by_id"     uuid,
        CONSTRAINT "PK_trip_anomalies" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_anomalies_trip" FOREIGN KEY ("trip_id")
          REFERENCES "trips"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ta_trip_id"  ON "trip_anomalies" ("trip_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ta_type"     ON "trip_anomalies" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ta_resolved" ON "trip_anomalies" ("resolved")`,
    );

    // ── trip_points ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_points" (
        "id"                      uuid NOT NULL DEFAULT uuid_generate_v4(),
        "trip_id"                 uuid NOT NULL,
        "latitude"                decimal(10,8) NOT NULL,
        "longitude"               decimal(11,8) NOT NULL,
        "accuracy_meters"         decimal(8,2),
        "speed_mps"               decimal(8,2),
        "heading"                 decimal(5,2),
        "altitude"                decimal(10,2),
        "distance_from_prev_meters" decimal(10,2) NOT NULL DEFAULT 0,
        "is_filtered"             boolean NOT NULL DEFAULT false,
        "filter_reason"           varchar(50),
        "recorded_at"             TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at"              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at"              TIMESTAMP WITH TIME ZONE,
        "created_by_id"           uuid,
        "updated_by_id"           uuid,
        CONSTRAINT "PK_trip_points" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_points_trip" FOREIGN KEY ("trip_id")
          REFERENCES "trips"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tp_trip_recorded" ON "trip_points" ("trip_id", "recorded_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tp_trip_filtered" ON "trip_points" ("trip_id", "is_filtered")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_points"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_anomalies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_stops"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_opening_balances"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "trip_anomaly_severity_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "trip_anomaly_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "purchase_history_status_enum"`,
    );
  }
}
