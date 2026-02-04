-- ============================================================================
-- PostgreSQL Extensions for VendHub OS
-- Run after database initialization
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable crypto functions (for password hashing verification)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable PostGIS for geolocation features (optional but recommended)
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enable fuzzy string matching (for search)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable unaccent for search normalization
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Enable tablefunc for crosstab queries
CREATE EXTENSION IF NOT EXISTS "tablefunc";

-- ============================================================================
-- Custom Functions
-- ============================================================================

-- Function to generate short codes
CREATE OR REPLACE FUNCTION generate_short_code(prefix TEXT, length INT DEFAULT 6)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := prefix || '-';
  i INT;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for soft delete cascade
CREATE OR REPLACE FUNCTION soft_delete_cascade()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be customized for specific tables
  -- to cascade soft deletes to related records
  NEW.deleted_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Performance Indexes (will be created by TypeORM, but here for reference)
-- ============================================================================

-- These indexes will be created automatically by TypeORM based on @Index decorators
-- This file serves as documentation of expected indexes

-- Users
-- CREATE INDEX IF NOT EXISTS idx_users_org_active ON users(organization_id, is_active);
-- CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Machines
-- CREATE INDEX IF NOT EXISTS idx_machines_org_status ON machines(organization_id, status);
-- CREATE INDEX IF NOT EXISTS idx_machines_location ON machines(location_id);
-- CREATE INDEX IF NOT EXISTS idx_machines_code ON machines(code);

-- Transactions
-- CREATE INDEX IF NOT EXISTS idx_transactions_machine_date ON transactions(machine_id, created_at);
-- CREATE INDEX IF NOT EXISTS idx_transactions_org_date ON transactions(organization_id, created_at);

-- Inventory
-- CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse_id, product_id);
-- CREATE INDEX IF NOT EXISTS idx_inventory_machine ON inventory(machine_id, product_id);

-- ============================================================================
-- Materialized Views for Reporting (Optional - Create after migration)
-- ============================================================================

-- Daily sales summary (example - uncomment and customize as needed)
-- CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_sales AS
-- SELECT
--   date_trunc('day', t.created_at) AS sale_date,
--   t.organization_id,
--   t.machine_id,
--   COUNT(*) AS transaction_count,
--   SUM(t.total_amount) AS total_revenue,
--   AVG(t.total_amount) AS avg_transaction
-- FROM transactions t
-- WHERE t.status = 'completed'
-- GROUP BY date_trunc('day', t.created_at), t.organization_id, t.machine_id;

-- CREATE UNIQUE INDEX IF NOT EXISTS mv_daily_sales_idx
-- ON mv_daily_sales(sale_date, organization_id, machine_id);

-- ============================================================================
-- Audit Log Function (Optional)
-- ============================================================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(changed_by);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, action, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant all privileges to the application user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vendhub;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vendhub;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO vendhub;

-- ============================================================================
-- Notification Function for Real-time Updates (Optional)
-- ============================================================================

-- Function to notify on changes (for WebSocket integration)
CREATE OR REPLACE FUNCTION notify_changes()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  IF TG_OP = 'DELETE' THEN
    payload = json_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'id', OLD.id
    );
  ELSE
    payload = json_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'id', NEW.id
    );
  END IF;

  PERFORM pg_notify('db_changes', payload::text);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Example: Enable notifications on transactions table
-- CREATE TRIGGER transactions_notify
--   AFTER INSERT OR UPDATE OR DELETE ON transactions
--   FOR EACH ROW EXECUTE FUNCTION notify_changes();
