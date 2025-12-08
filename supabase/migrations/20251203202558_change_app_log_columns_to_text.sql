-- Change app_log.request and response column types from jsonb to text
-- This migration converts the JSONB columns to TEXT type for simpler storage

ALTER TABLE app_log
    ALTER COLUMN request TYPE text,
    ALTER COLUMN response TYPE text;
