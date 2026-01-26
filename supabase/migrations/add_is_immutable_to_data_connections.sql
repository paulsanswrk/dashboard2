-- Add is_immutable column to data_connections table
-- This column prevents modification of auto-created OptiqoFlow connections

ALTER TABLE data_connections 
ADD COLUMN IF NOT EXISTS is_immutable BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN data_connections.is_immutable IS 'When true, connection cannot be edited or deleted. Used for auto-created tenant connections.';
