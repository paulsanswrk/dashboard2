-- Migration: Add IN_PROGRESS status to email_queue delivery_status
-- This prevents duplicate processing when overlapping cron runs pick up the same item

-- First, drop the existing check constraint
ALTER TABLE email_queue DROP CONSTRAINT IF EXISTS email_queue_delivery_status_check;

-- Add new check constraint with IN_PROGRESS status
ALTER TABLE email_queue ADD CONSTRAINT email_queue_delivery_status_check 
    CHECK (delivery_status IN ('PENDING', 'IN_PROGRESS', 'SENT', 'FAILED', 'CANCELLED'));

-- Reset any stuck IN_PROGRESS items back to PENDING (cleanup from crashes)
UPDATE email_queue 
SET delivery_status = 'PENDING' 
WHERE delivery_status = 'IN_PROGRESS';
