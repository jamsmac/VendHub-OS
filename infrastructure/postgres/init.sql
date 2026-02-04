-- VendHub Database Initialization
-- This script runs when PostgreSQL container starts for the first time

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create database schema info
COMMENT ON DATABASE vendhub IS 'VendHub Unified System Database';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE vendhub TO vendhub;

-- Create default organization (will be used for development)
-- INSERT INTO organizations (id, name, slug, subscription_tier, is_active, created_at, updated_at)
-- VALUES (
--   uuid_generate_v4(),
--   'Default Organization',
--   'default',
--   'professional',
--   true,
--   NOW(),
--   NOW()
-- );

SELECT 'VendHub database initialized successfully!' AS status;
