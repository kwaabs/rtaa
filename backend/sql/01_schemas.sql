-- Create application schemas
CREATE SCHEMA IF NOT EXISTS dbo;      -- main application data (mirrors source DB)
CREATE SCHEMA IF NOT EXISTS auth;     -- GoTrue auth tables (managed by GoTrue)
CREATE SCHEMA IF NOT EXISTS meta;     -- metadata / configuration tables
CREATE SCHEMA IF NOT EXISTS cache;    -- materialised/cache tables if needed
