import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateEquipmentTables
 *
 * Creates equipment management tables:
 * 1. equipment_components - Physical components in/for vending machines
 * 2. hopper_types - Dictionary of hopper types
 * 3. spare_parts - Spare parts inventory
 * 4. component_maintenance - Maintenance records for components
 * 5. component_movements - Movement history of components between machines
 * 6. washing_schedules - Recurring wash/cleaning schedules
 */
export class CreateEquipmentTables1708000001000 implements MigrationInterface {
  name = 'CreateEquipmentTables1708000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: equipment_component_type_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE equipment_component_type_enum AS ENUM (
        'hopper',
        'grinder',
        'brew_unit',
        'mixer',
        'pump',
        'heater',
        'dispenser',
        'compressor',
        'board',
        'motor',
        'valve',
        'sensor',
        'filter',
        'tank',
        'conveyor',
        'display',
        'card_reader',
        'other'
      )
    `);

    // ========================================================================
    // ENUM: equipment_component_status_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE equipment_component_status_enum AS ENUM (
        'new',
        'installed',
        'in_use',
        'needs_maintenance',
        'in_repair',
        'repaired',
        'decommissioned',
        'disposed'
      )
    `);

    // ========================================================================
    // ENUM: component_maintenance_type_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE component_maintenance_type_enum AS ENUM (
        'cleaning',
        'lubrication',
        'calibration',
        'repair',
        'replacement',
        'inspection'
      )
    `);

    // ========================================================================
    // TABLE 1: equipment_components
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS equipment_components (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        machine_id uuid,

        -- Component classification
        component_type equipment_component_type_enum NOT NULL,
        component_status equipment_component_status_enum NOT NULL DEFAULT 'new',

        -- Identification
        name varchar(200) NOT NULL,
        serial_number varchar(100),
        manufacturer varchar(100),
        model varchar(100),

        -- Purchase info
        purchase_date date,
        purchase_price decimal(12, 2),
        warranty_until date,

        -- Installation & lifecycle
        installed_at date,
        expected_life_hours integer,
        current_hours integer NOT NULL DEFAULT 0,

        -- Maintenance tracking
        last_maintenance_date date,
        next_maintenance_date date,

        -- Notes & metadata
        notes text,
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for equipment_components
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_components_organization_id
        ON equipment_components(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_components_machine_id
        ON equipment_components(machine_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_components_component_type
        ON equipment_components(component_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_components_component_status
        ON equipment_components(component_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_components_serial_number
        ON equipment_components(serial_number)
    `);

    // ========================================================================
    // TABLE 2: hopper_types
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hopper_types (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,

        -- Hopper details
        name varchar(200) NOT NULL,
        volume_ml integer NOT NULL,
        material varchar(100),
        compatible_machine_types jsonb NOT NULL DEFAULT '[]',
        is_active boolean NOT NULL DEFAULT true,
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for hopper_types
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hopper_types_organization_id
        ON hopper_types(organization_id)
    `);

    // ========================================================================
    // TABLE 3: spare_parts
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS spare_parts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        supplier_id uuid,

        -- Part identification
        part_number varchar(100) NOT NULL,
        name varchar(200) NOT NULL,
        description text,
        compatible_component_types jsonb NOT NULL DEFAULT '[]',

        -- Stock info
        quantity integer NOT NULL DEFAULT 0,
        min_quantity integer NOT NULL DEFAULT 0,
        cost_price decimal(12, 2),

        -- Storage
        storage_location varchar(100),

        -- Status
        is_active boolean NOT NULL DEFAULT true,
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for spare_parts
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spare_parts_organization_id
        ON spare_parts(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spare_parts_part_number
        ON spare_parts(part_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spare_parts_supplier_id
        ON spare_parts(supplier_id)
    `);

    // ========================================================================
    // TABLE 4: component_maintenance
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS component_maintenance (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        component_id uuid NOT NULL,

        -- Maintenance details
        maintenance_type component_maintenance_type_enum NOT NULL,
        description text,
        cost decimal(12, 2),
        performed_by_user_id uuid NOT NULL,
        performed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

        -- Parts used
        parts_used jsonb NOT NULL DEFAULT '[]',

        -- Notes & metadata
        notes text,
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid,

        -- Foreign keys
        CONSTRAINT "FK_component_maintenance_component_id"
          FOREIGN KEY (component_id) REFERENCES equipment_components(id)
          ON DELETE CASCADE
      )
    `);

    // -- Indexes for component_maintenance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_component_maintenance_component_id
        ON component_maintenance(component_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_component_maintenance_organization_id
        ON component_maintenance(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_component_maintenance_performed_at
        ON component_maintenance(performed_at)
    `);

    // ========================================================================
    // TABLE 5: component_movements
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS component_movements (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        component_id uuid NOT NULL,

        -- Movement details
        from_machine_id uuid,
        to_machine_id uuid,
        moved_by_user_id uuid NOT NULL,
        moved_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

        -- Notes & metadata
        reason text,
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid,

        -- Foreign keys
        CONSTRAINT "FK_component_movements_component_id"
          FOREIGN KEY (component_id) REFERENCES equipment_components(id)
          ON DELETE CASCADE
      )
    `);

    // -- Indexes for component_movements
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_component_movements_component_id
        ON component_movements(component_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_component_movements_organization_id
        ON component_movements(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_component_movements_moved_at
        ON component_movements(moved_at)
    `);

    // ========================================================================
    // TABLE 6: washing_schedules
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS washing_schedules (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        machine_id uuid NOT NULL,
        component_id uuid,

        -- Schedule details
        frequency_days integer NOT NULL,
        last_wash_date date,
        next_wash_date date NOT NULL,
        assigned_to_user_id uuid,

        -- Status
        is_active boolean NOT NULL DEFAULT true,

        -- Notes & metadata
        notes text,
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for washing_schedules
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_washing_schedules_organization_id
        ON washing_schedules(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_washing_schedules_machine_id
        ON washing_schedules(machine_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_washing_schedules_next_wash_date
        ON washing_schedules(next_wash_date)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop indexes for washing_schedules
    await queryRunner.query(`DROP INDEX IF EXISTS idx_washing_schedules_next_wash_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_washing_schedules_machine_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_washing_schedules_organization_id`);

    // -- Drop indexes for component_movements
    await queryRunner.query(`DROP INDEX IF EXISTS idx_component_movements_moved_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_component_movements_organization_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_component_movements_component_id`);

    // -- Drop indexes for component_maintenance
    await queryRunner.query(`DROP INDEX IF EXISTS idx_component_maintenance_performed_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_component_maintenance_organization_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_component_maintenance_component_id`);

    // -- Drop indexes for spare_parts
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spare_parts_supplier_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spare_parts_part_number`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spare_parts_organization_id`);

    // -- Drop indexes for hopper_types
    await queryRunner.query(`DROP INDEX IF EXISTS idx_hopper_types_organization_id`);

    // -- Drop indexes for equipment_components
    await queryRunner.query(`DROP INDEX IF EXISTS idx_equipment_components_serial_number`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_equipment_components_component_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_equipment_components_component_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_equipment_components_machine_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_equipment_components_organization_id`);

    // -- Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS washing_schedules CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS component_movements CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS component_maintenance CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS spare_parts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS hopper_types CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS equipment_components CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS component_maintenance_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS equipment_component_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS equipment_component_type_enum`);
  }
}
