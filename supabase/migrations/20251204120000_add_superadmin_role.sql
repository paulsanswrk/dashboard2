-- Add SUPERADMIN role to profiles table role constraint
-- This migration updates the role check constraint to include SUPERADMIN

ALTER TABLE profiles
    DROP CONSTRAINT profiles_role_check;

ALTER TABLE profiles
    ADD CONSTRAINT profiles_role_check
        CHECK (role = ANY (ARRAY ['SUPERADMIN'::text, 'ADMIN'::text, 'EDITOR'::text, 'VIEWER'::text]));
