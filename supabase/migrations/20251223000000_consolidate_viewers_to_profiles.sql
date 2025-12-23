-- Migration script to consolidate Viewers into Profiles table
-- 1. Insert existing Viewers into Profiles if they don't exist
-- 2. Update existing Profiles if they match Viewers
-- 3. Drop Viewers table
-- 4. Update Triggers/Functions

BEGIN;

-- 1. Migrate Data
-- Insert or Update profiles based on viewers data
-- We assume user_id is the same key.
INSERT INTO public.profiles (user_id, organization_id, first_name, last_name, role, viewer_type, group_name, created_at)
SELECT v.user_id,
       v.organization_id,
       v.first_name,
       v.last_name,
       'VIEWER', -- Force role to VIEWER
       v.viewer_type,
       v.group_name,
       v.created_at
FROM public.viewers v ON CONFLICT (user_id) DO
UPDATE
    SET
        role = 'VIEWER', -- Ensure role is VIEWER
    viewer_type = EXCLUDED.viewer_type,
    group_name = EXCLUDED.group_name,
    organization_id = EXCLUDED.organization_id;

-- 2. Drop Viewers Table
DROP TABLE IF EXISTS public.viewers CASCADE;

-- 3. Update Trigger Function for Organization Viewer Count
CREATE
OR REPLACE FUNCTION update_organization_viewer_count() RETURNS TRIGGER
    SECURITY DEFINER
    SET search_path = public
    LANGUAGE plpgsql
AS
$$
BEGIN
    IF
TG_OP = 'INSERT' THEN
        IF NEW.role = 'VIEWER' THEN
UPDATE public.organizations
SET viewer_count = viewer_count + 1
WHERE id = NEW.organization_id;
END IF;
RETURN NEW;
ELSIF
TG_OP = 'DELETE' THEN
        IF OLD.role = 'VIEWER' THEN
UPDATE public.organizations
SET viewer_count = viewer_count - 1
WHERE id = OLD.organization_id;
END IF;
RETURN OLD;
ELSIF
TG_OP = 'UPDATE' THEN
        -- Handle role change from VIEWER (decrease count)
        IF OLD.role = 'VIEWER' AND NEW.role != 'VIEWER' THEN
UPDATE public.organizations
SET viewer_count = viewer_count - 1
WHERE id = OLD.organization_id;
-- Handle role change TO VIEWER (increase count)
ELSIF
OLD.role != 'VIEWER' AND NEW.role = 'VIEWER' THEN
UPDATE public.organizations
SET viewer_count = viewer_count + 1
WHERE id = NEW.organization_id;
-- Handle Organization change for a VIEWER
ELSIF
OLD.role = 'VIEWER' AND NEW.role = 'VIEWER' AND OLD.organization_id != NEW.organization_id THEN
UPDATE public.organizations
SET viewer_count = viewer_count - 1
WHERE id = OLD.organization_id;
UPDATE public.organizations
SET viewer_count = viewer_count + 1
WHERE id = NEW.organization_id;
END IF;
RETURN NEW;
END IF;
RETURN NULL;
END;
$$;

-- Recreate Trigger on Profiles
DROP TRIGGER IF EXISTS trigger_update_organization_viewer_count ON public.profiles;
CREATE TRIGGER trigger_update_organization_viewer_count
    AFTER INSERT OR
DELETE
OR UPDATE
    ON public.profiles
    FOR EACH ROW
EXECUTE FUNCTION update_organization_viewer_count();


-- 4. Update Helper Functions
CREATE
OR REPLACE FUNCTION is_viewer() RETURNS boolean
    SECURITY DEFINER
    SET search_path = public
    LANGUAGE plpgsql
AS
$$
BEGIN
RETURN EXISTS (SELECT 1
               FROM profiles
               WHERE user_id = auth.uid()
                 AND role = 'VIEWER');
END;
$$;

COMMIT;
