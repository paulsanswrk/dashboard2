-- Truncate all tables in optiqoflow schema with CASCADE
-- This script dynamically fetches all tables and truncates them
-- WARNING: This will delete ALL data in the optiqoflow schema!

DO $$
DECLARE
    table_record RECORD;
    truncate_cmd TEXT;
BEGIN
    RAISE NOTICE 'Starting truncation of all optiqoflow tables...';
    
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'optiqoflow'
        ORDER BY tablename
    LOOP
        truncate_cmd := format('TRUNCATE TABLE optiqoflow.%I CASCADE', table_record.tablename);
        RAISE NOTICE 'Executing: %', truncate_cmd;
        EXECUTE truncate_cmd;
    END LOOP;
    
    RAISE NOTICE 'Truncation complete!';
END $$;
