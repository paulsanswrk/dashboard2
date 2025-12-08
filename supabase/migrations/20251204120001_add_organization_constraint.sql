-- Add constraint to enforce organization_id rules for SUPERADMIN vs other roles
-- SUPERADMIN users must have organization_id = NULL
-- Other roles (ADMIN, EDITOR, VIEWER) must have organization_id IS NOT NULL

-- First, ensure existing SUPERADMIN records have organization_id = NULL
UPDATE public.profiles
SET organization_id = NULL
WHERE role = 'SUPERADMIN'
  AND organization_id IS NOT NULL;

-- Note: If there are ADMIN/EDITOR/VIEWER records with organization_id IS NULL,
-- they will need to be manually fixed before applying this migration
-- For now, we'll add the constraint and let it fail if there are violations

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_organization_check
        CHECK ((role = 'SUPERADMIN' AND organization_id IS NULL) OR
               (role IN ('ADMIN', 'EDITOR', 'VIEWER') AND organization_id IS NOT NULL));
