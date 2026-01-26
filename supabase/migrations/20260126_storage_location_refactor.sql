-- Migration: Refactor storage_location to explicit values
-- Date: 2026-01-26
-- Description: Update storage_location from implicit/null to explicit values for clarity

BEGIN;

-- Step 1: Update storage_location based on current logic
UPDATE data_connections
SET storage_location = CASE
    -- OptiqoFlow connections (database_type = 'internal')
    WHEN database_type = 'internal' THEN 'optiqoflow'
    
    -- Synced MySQL (currently has storage_location = 'internal')
    WHEN database_type = 'mysql' AND storage_location = 'internal' THEN 'supabase_synced'
    
    -- External MySQL (everything else with database_type = 'mysql')
    WHEN database_type = 'mysql' AND (storage_location IS NULL OR storage_location != 'internal') THEN 'external'
    
    -- Keep any other values as-is (safety fallback)
    ELSE COALESCE(storage_location, 'external')
END;

-- Step 2: Update database_type for OptiqoFlow connections
-- 'internal' was a placeholder, switch to actual DB engine type
UPDATE data_connections
SET database_type = 'postgresql'
WHERE database_type = 'internal';

-- Step 3: Make storage_location NOT NULL (now that all values are set)
ALTER TABLE data_connections
ALTER COLUMN storage_location SET NOT NULL;

-- Step 4: Add check constraint for valid values
ALTER TABLE data_connections
ADD CONSTRAINT data_connections_storage_location_check
CHECK (storage_location IN ('external', 'optiqoflow', 'supabase_synced'));

-- Step 5: Add check constraint for database_type
ALTER TABLE data_connections
ADD CONSTRAINT data_connections_database_type_check
CHECK (database_type IN ('mysql', 'postgresql'));

COMMIT;

-- Verification queries
-- SELECT database_type, storage_location, COUNT(*) 
-- FROM data_connections 
-- GROUP BY database_type, storage_location;
