import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: AddHrEntities
 *
 * Creates the full HR subsystem:
 * - departments: organizational units with tree hierarchy
 * - positions: job titles with salary ranges and levels
 * - attendances: daily check-in/check-out with location
 * - leave_requests: vacation/sick leave with approval workflow
 * - payrolls: salary calculation, approval, and payment tracking
 * - performance_reviews: periodic employee evaluations
 *
 * Also adds department_id and position_id columns to the existing
 * employees table with foreign key references.
 */
export class AddHrEntities1710000006000 implements MigrationInterface {
  name = 'AddHrEntities1710000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ====================================================================
    // ENUMS
    // ====================================================================

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE position_level_enum AS ENUM (
          'intern', 'junior', 'middle', 'senior',
          'lead', 'head', 'director', 'c_level'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE attendance_status_enum AS ENUM (
          'present', 'absent', 'late', 'half_day', 'on_leave'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE leave_type_enum AS ENUM (
          'annual', 'sick', 'unpaid', 'maternity',
          'paternity', 'bereavement', 'study', 'other'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE leave_status_enum AS ENUM (
          'pending', 'approved', 'rejected', 'cancelled'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payroll_status_enum AS ENUM (
          'draft', 'calculated', 'approved', 'paid', 'cancelled'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE review_period_enum AS ENUM (
          'monthly', 'quarterly', 'semi_annual', 'annual'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE review_status_enum AS ENUM (
          'scheduled', 'in_progress', 'completed', 'cancelled'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ====================================================================
    // TABLE: departments
    // ====================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization scope
        organization_id uuid NOT NULL,

        -- Identity
        name varchar(100) NOT NULL,
        code varchar(50) NOT NULL,
        description text,

        -- Hierarchy
        manager_id uuid,
        parent_department_id uuid,

        -- Status
        is_active boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,

        -- Metadata
        metadata jsonb,

        -- BaseEntity standard columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // ====================================================================
    // TABLE: positions
    // ====================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS positions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization scope
        organization_id uuid NOT NULL,

        -- Identity
        title varchar(100) NOT NULL,
        code varchar(50) NOT NULL,
        description text,

        -- Department link
        department_id uuid,

        -- Level & salary range
        level position_level_enum NOT NULL,
        min_salary decimal(15, 2),
        max_salary decimal(15, 2),

        -- Status
        is_active boolean NOT NULL DEFAULT true,

        -- Metadata
        metadata jsonb,

        -- BaseEntity standard columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // ====================================================================
    // ALTER employees: add department_id and position_id
    // ====================================================================
    const hasDeptCol = await queryRunner.hasColumn('employees', 'department_id');
    if (!hasDeptCol) {
      await queryRunner.query(`
        ALTER TABLE employees ADD COLUMN department_id uuid
      `);
    }

    const hasPosCol = await queryRunner.hasColumn('employees', 'position_id');
    if (!hasPosCol) {
      await queryRunner.query(`
        ALTER TABLE employees ADD COLUMN position_id uuid
      `);
    }

    // ====================================================================
    // TABLE: attendances
    // ====================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS attendances (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization scope
        organization_id uuid NOT NULL,

        -- Employee link
        employee_id uuid NOT NULL,

        -- Date & time
        date date NOT NULL,
        check_in timestamptz,
        check_out timestamptz,

        -- Hours
        total_hours decimal(5, 2),
        overtime_hours decimal(5, 2),

        -- Status
        status attendance_status_enum NOT NULL DEFAULT 'present',

        -- Details
        note text,
        check_in_location jsonb,
        check_out_location jsonb,

        -- Metadata
        metadata jsonb,

        -- BaseEntity standard columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // ====================================================================
    // TABLE: leave_requests
    // ====================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization scope
        organization_id uuid NOT NULL,

        -- Employee link
        employee_id uuid NOT NULL,

        -- Leave details
        leave_type leave_type_enum NOT NULL,
        start_date date NOT NULL,
        end_date date NOT NULL,
        total_days decimal(5, 1) NOT NULL,
        reason text,

        -- Approval workflow
        status leave_status_enum NOT NULL DEFAULT 'pending',
        approved_by_id uuid,
        approved_at timestamptz,
        rejection_reason text,

        -- Metadata
        metadata jsonb,

        -- BaseEntity standard columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // ====================================================================
    // TABLE: payrolls
    // ====================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payrolls (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization scope
        organization_id uuid NOT NULL,

        -- Employee link
        employee_id uuid NOT NULL,

        -- Period
        period_start date NOT NULL,
        period_end date NOT NULL,

        -- Salary components
        base_salary decimal(15, 2) NOT NULL,
        overtime_pay decimal(15, 2) NOT NULL DEFAULT 0,
        bonuses decimal(15, 2) NOT NULL DEFAULT 0,
        deductions decimal(15, 2) NOT NULL DEFAULT 0,
        tax_amount decimal(15, 2) NOT NULL DEFAULT 0,
        net_salary decimal(15, 2) NOT NULL,
        currency varchar(10) NOT NULL DEFAULT 'UZS',

        -- Working details
        working_days integer NOT NULL DEFAULT 0,
        worked_days integer NOT NULL DEFAULT 0,
        overtime_hours decimal(5, 2) NOT NULL DEFAULT 0,
        details jsonb,

        -- Status & approval
        status payroll_status_enum NOT NULL DEFAULT 'draft',
        calculated_at timestamptz,
        approved_by_id uuid,
        approved_at timestamptz,
        paid_at timestamptz,
        payment_reference varchar(100),

        -- Notes
        note text,

        -- Metadata
        metadata jsonb,

        -- BaseEntity standard columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // ====================================================================
    // TABLE: performance_reviews
    // ====================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS performance_reviews (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization scope
        organization_id uuid NOT NULL,

        -- Employee & reviewer
        employee_id uuid NOT NULL,
        reviewer_id uuid NOT NULL,

        -- Period
        review_period review_period_enum NOT NULL,
        period_start date NOT NULL,
        period_end date NOT NULL,

        -- Status
        status review_status_enum NOT NULL DEFAULT 'scheduled',

        -- Ratings (1-5 scale)
        overall_rating decimal(3, 1),
        ratings jsonb,

        -- Feedback
        strengths text,
        areas_for_improvement text,
        goals text,
        employee_comments text,
        reviewer_comments text,
        completed_at timestamptz,

        -- Metadata
        metadata jsonb,

        -- BaseEntity standard columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // ====================================================================
    // INDEXES: departments
    // ====================================================================
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_departments_organization_id
        ON departments(organization_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_code
        ON departments(code)
        WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_departments_parent
        ON departments(parent_department_id)
        WHERE parent_department_id IS NOT NULL
    `);

    // ====================================================================
    // INDEXES: positions
    // ====================================================================
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_positions_organization_id
        ON positions(organization_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_code
        ON positions(code)
        WHERE deleted_at IS NULL
    `);

    // ====================================================================
    // INDEXES: attendances
    // ====================================================================
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_attendances_employee_date
        ON attendances(employee_id, date)
        WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_attendances_org_date
        ON attendances(organization_id, date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_attendances_status
        ON attendances(status)
    `);

    // ====================================================================
    // INDEXES: leave_requests
    // ====================================================================
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_status
        ON leave_requests(employee_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_requests_org_status
        ON leave_requests(organization_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_requests_dates
        ON leave_requests(start_date, end_date)
    `);

    // ====================================================================
    // INDEXES: payrolls
    // ====================================================================
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payrolls_employee_period
        ON payrolls(employee_id, period_start)
        WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payrolls_org_status
        ON payrolls(organization_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payrolls_period_range
        ON payrolls(period_start, period_end)
    `);

    // ====================================================================
    // INDEXES: performance_reviews
    // ====================================================================
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_period
        ON performance_reviews(employee_id, review_period)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_reviews_org_status
        ON performance_reviews(organization_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer
        ON performance_reviews(reviewer_id)
    `);

    // ====================================================================
    // FOREIGN KEYS: departments
    // ====================================================================
    await queryRunner.query(`
      ALTER TABLE departments
        ADD CONSTRAINT fk_departments_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE departments
        ADD CONSTRAINT fk_departments_manager
        FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE departments
        ADD CONSTRAINT fk_departments_parent
        FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL
    `);

    // ====================================================================
    // FOREIGN KEYS: positions
    // ====================================================================
    await queryRunner.query(`
      ALTER TABLE positions
        ADD CONSTRAINT fk_positions_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE positions
        ADD CONSTRAINT fk_positions_department
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    `);

    // ====================================================================
    // FOREIGN KEYS: employees (new columns)
    // ====================================================================
    await queryRunner.query(`
      ALTER TABLE employees
        ADD CONSTRAINT fk_employees_department
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE employees
        ADD CONSTRAINT fk_employees_position
        FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL
    `);

    // ====================================================================
    // FOREIGN KEYS: attendances
    // ====================================================================
    await queryRunner.query(`
      ALTER TABLE attendances
        ADD CONSTRAINT fk_attendances_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE attendances
        ADD CONSTRAINT fk_attendances_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    `);

    // ====================================================================
    // FOREIGN KEYS: leave_requests
    // ====================================================================
    await queryRunner.query(`
      ALTER TABLE leave_requests
        ADD CONSTRAINT fk_leave_requests_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE leave_requests
        ADD CONSTRAINT fk_leave_requests_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    `);

    // ====================================================================
    // FOREIGN KEYS: payrolls
    // ====================================================================
    await queryRunner.query(`
      ALTER TABLE payrolls
        ADD CONSTRAINT fk_payrolls_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE payrolls
        ADD CONSTRAINT fk_payrolls_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    `);

    // ====================================================================
    // FOREIGN KEYS: performance_reviews
    // ====================================================================
    await queryRunner.query(`
      ALTER TABLE performance_reviews
        ADD CONSTRAINT fk_performance_reviews_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE performance_reviews
        ADD CONSTRAINT fk_performance_reviews_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE performance_reviews
        ADD CONSTRAINT fk_performance_reviews_reviewer
        FOREIGN KEY (reviewer_id) REFERENCES employees(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop foreign keys: performance_reviews
    await queryRunner.query(`ALTER TABLE performance_reviews DROP CONSTRAINT IF EXISTS fk_performance_reviews_reviewer`);
    await queryRunner.query(`ALTER TABLE performance_reviews DROP CONSTRAINT IF EXISTS fk_performance_reviews_employee`);
    await queryRunner.query(`ALTER TABLE performance_reviews DROP CONSTRAINT IF EXISTS fk_performance_reviews_organization`);

    // -- Drop foreign keys: payrolls
    await queryRunner.query(`ALTER TABLE payrolls DROP CONSTRAINT IF EXISTS fk_payrolls_employee`);
    await queryRunner.query(`ALTER TABLE payrolls DROP CONSTRAINT IF EXISTS fk_payrolls_organization`);

    // -- Drop foreign keys: leave_requests
    await queryRunner.query(`ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS fk_leave_requests_employee`);
    await queryRunner.query(`ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS fk_leave_requests_organization`);

    // -- Drop foreign keys: attendances
    await queryRunner.query(`ALTER TABLE attendances DROP CONSTRAINT IF EXISTS fk_attendances_employee`);
    await queryRunner.query(`ALTER TABLE attendances DROP CONSTRAINT IF EXISTS fk_attendances_organization`);

    // -- Drop foreign keys: employees (department/position)
    await queryRunner.query(`ALTER TABLE employees DROP CONSTRAINT IF EXISTS fk_employees_position`);
    await queryRunner.query(`ALTER TABLE employees DROP CONSTRAINT IF EXISTS fk_employees_department`);

    // -- Drop foreign keys: positions
    await queryRunner.query(`ALTER TABLE positions DROP CONSTRAINT IF EXISTS fk_positions_department`);
    await queryRunner.query(`ALTER TABLE positions DROP CONSTRAINT IF EXISTS fk_positions_organization`);

    // -- Drop foreign keys: departments
    await queryRunner.query(`ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_departments_parent`);
    await queryRunner.query(`ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_departments_manager`);
    await queryRunner.query(`ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_departments_organization`);

    // -- Drop indexes: performance_reviews
    await queryRunner.query(`DROP INDEX IF EXISTS idx_performance_reviews_reviewer`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_performance_reviews_org_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_performance_reviews_employee_period`);

    // -- Drop indexes: payrolls
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payrolls_period_range`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payrolls_org_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payrolls_employee_period`);

    // -- Drop indexes: leave_requests
    await queryRunner.query(`DROP INDEX IF EXISTS idx_leave_requests_dates`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_leave_requests_org_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_leave_requests_employee_status`);

    // -- Drop indexes: attendances
    await queryRunner.query(`DROP INDEX IF EXISTS idx_attendances_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_attendances_org_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_attendances_employee_date`);

    // -- Drop indexes: positions
    await queryRunner.query(`DROP INDEX IF EXISTS idx_positions_code`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_positions_organization_id`);

    // -- Drop indexes: departments
    await queryRunner.query(`DROP INDEX IF EXISTS idx_departments_parent`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_departments_code`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_departments_organization_id`);

    // -- Drop tables (reverse order of creation)
    await queryRunner.query(`DROP TABLE IF EXISTS performance_reviews CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS payrolls CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS leave_requests CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS attendances CASCADE`);

    // -- Drop employee columns
    const hasPosCol = await queryRunner.hasColumn('employees', 'position_id');
    if (hasPosCol) {
      await queryRunner.query(`ALTER TABLE employees DROP COLUMN position_id`);
    }
    const hasDeptCol = await queryRunner.hasColumn('employees', 'department_id');
    if (hasDeptCol) {
      await queryRunner.query(`ALTER TABLE employees DROP COLUMN department_id`);
    }

    await queryRunner.query(`DROP TABLE IF EXISTS positions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS departments CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS review_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS review_period_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS payroll_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS leave_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS leave_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS attendance_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS position_level_enum`);
  }
}
