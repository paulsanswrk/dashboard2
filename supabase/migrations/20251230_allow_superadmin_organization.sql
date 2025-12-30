-- Allow SUPERADMIN users to have an organization
-- This changes the constraint from requiring SUPERADMIN to have NULL organization_id
-- to requiring ALL roles (including SUPERADMIN) to have a non-null organization_id

ALTER TABLE public.profiles
DROP
CONSTRAINT IF EXISTS profiles_organization_check;

-- First, backfill organization_id for any existing users (e.g. SUPERADMINs) that have it as NULL
DO
$$
DECLARE
r RECORD;
    new_org_id
uuid;
    org_name
text;
BEGIN
FOR r IN
SELECT *
FROM public.profiles
WHERE organization_id IS NULL LOOP
        -- Determine a name for the organization
        IF r.first_name IS NOT NULL AND r.first_name != '' THEN
            org_name := r.first_name || '''s Organization';
ELSE
            org_name := 'My Organization';
END IF;

        -- Create a new organization
INSERT INTO public.organizations (name, created_by)
VALUES (org_name, r.user_id) RETURNING id
INTO new_org_id;

-- Update the profile with the new organization_id
UPDATE public.profiles
SET organization_id = new_org_id
WHERE user_id = r.user_id;

RAISE
NOTICE 'Created organization % for user %', new_org_id, r.user_id;
END LOOP;
END $$;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_organization_check
        CHECK (organization_id IS NOT NULL);
