-- Update profiles.role check constraint to allow SUPERADMIN alongside existing roles

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
        CHECK (role = ANY (ARRAY ['SUPERADMIN'::text, 'ADMIN'::text, 'EDITOR'::text, 'VIEWER'::text]));





