-- Ensure organization_id rules align with SUPERADMIN vs other roles

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_organization_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_organization_check
        CHECK (
            (role = 'SUPERADMIN'::text AND organization_id IS NULL) OR
            (role = ANY (ARRAY ['ADMIN'::text, 'EDITOR'::text, 'VIEWER'::text]) AND organization_id IS NOT NULL)
            );









