-- ============================================================================
-- COMPREHENSIVE SECURITY AND PERFORMANCE FIXES
-- ============================================================================
-- This migration addresses:
-- 1. Remove unused database functions
-- 2. Fix search_path on functions used by triggers
-- 3. Enable RLS on tables missing it (service_role only)
-- 4. Simplify RLS to service_role only for server-accessed tables
-- 5. Optimize RLS for client-accessed tables (profiles, reports, email_queue)
-- 6. Consolidate multiple permissive policies
-- 7. Add missing foreign key indexes
-- ============================================================================

-- ============================================================================
-- PART 1: REMOVE UNUSED FUNCTIONS
-- ============================================================================

-- Drop unused reporting introspection functions
DROP FUNCTION IF EXISTS public.fn_reporting_list_datasets();
DROP FUNCTION IF EXISTS public.fn_reporting_get_schema(text);
DROP FUNCTION IF EXISTS public.fn_reporting_get_relationships(text);

-- Drop unused auth helper functions (not referenced in any RLS policies or code)
DROP FUNCTION IF EXISTS public.get_current_user_organization();
DROP FUNCTION IF EXISTS public.get_viewer_organization();
DROP FUNCTION IF EXISTS public.is_viewer();

-- ============================================================================
-- PART 2: FIX SEARCH_PATH ON USED FUNCTIONS
-- ============================================================================

-- Recreate set_updated_at with fixed search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY INVOKER
    SET search_path = public
AS
$$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate update_report_next_run_at with fixed search_path
CREATE OR REPLACE FUNCTION public.update_report_next_run_at()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY INVOKER
    SET search_path = public
AS
$$
DECLARE
    next_run           timestamp with time zone;
    day_names          text[] := ARRAY ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    target_day_idx     int;
    days_until_target  int;
    local_time         time;
    local_date         date;
    combined_timestamp timestamp;
BEGIN
    -- Only update if schedule-related fields changed
    IF (TG_OP = 'UPDATE' AND
        (OLD.interval IS DISTINCT FROM NEW.interval OR
         OLD.send_time IS DISTINCT FROM NEW.send_time OR
         OLD.timezone IS DISTINCT FROM NEW.timezone OR
         OLD.day_of_week IS DISTINCT FROM NEW.day_of_week OR
         OLD.status IS DISTINCT FROM NEW.status)) OR
       TG_OP = 'INSERT' THEN

        -- Don't schedule if not active
        IF NEW.status != 'Active' THEN
            NEW.next_run_at = NULL;
            RETURN NEW;
        END IF;

        -- Parse send_time (HH:MM format)
        local_time := NEW.send_time::time;

        -- Get current date in user's timezone
        local_date := (now() AT TIME ZONE NEW.timezone)::date;

        -- Combine date and time
        combined_timestamp := (local_date || ' ' || local_time)::timestamp;

        -- Convert to UTC
        next_run := combined_timestamp AT TIME ZONE NEW.timezone;

        -- If the time has already passed today, move to next occurrence
        IF next_run <= now() THEN
            CASE NEW.interval
                WHEN 'DAILY' THEN next_run := next_run + interval '1 day';
                WHEN 'WEEKLY' THEN -- Find next matching day of week
                IF NEW.day_of_week IS NOT NULL AND jsonb_array_length(NEW.day_of_week) > 0 THEN
                    -- Start from tomorrow and find next matching day
                    next_run := next_run + interval '1 day';
                    WHILE NOT (day_names[EXTRACT(DOW FROM next_run AT TIME ZONE NEW.timezone)::int + 1] = ANY (SELECT jsonb_array_elements_text(NEW.day_of_week)))
                        LOOP
                            next_run := next_run + interval '1 day';
                        END LOOP;
                ELSE
                    next_run := next_run + interval '7 days';
                END IF;
                WHEN 'MONTHLY' THEN next_run := next_run + interval '1 month';
                END CASE;
        ELSE
            -- Time hasn't passed yet today, but for weekly we need to check if today is a scheduled day
            IF NEW.interval = 'WEEKLY' AND NEW.day_of_week IS NOT NULL AND jsonb_array_length(NEW.day_of_week) > 0 THEN
                IF NOT (day_names[EXTRACT(DOW FROM next_run AT TIME ZONE NEW.timezone)::int + 1] = ANY (SELECT jsonb_array_elements_text(NEW.day_of_week))) THEN
                    -- Today is not a scheduled day, find next matching day
                    WHILE NOT (day_names[EXTRACT(DOW FROM next_run AT TIME ZONE NEW.timezone)::int + 1] = ANY (SELECT jsonb_array_elements_text(NEW.day_of_week)))
                        LOOP
                            next_run := next_run + interval '1 day';
                        END LOOP;
                END IF;
            END IF;
        END IF;

        NEW.next_run_at = next_run;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 3: ENABLE RLS ON TABLES MISSING IT (SERVICE_ROLE ONLY)
-- ============================================================================

-- Enable RLS on user_groups
ALTER TABLE public.user_groups
    ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies and create service_role only
DROP POLICY IF EXISTS "user_groups_service_role" ON public.user_groups;
CREATE POLICY "user_groups_service_role" ON public.user_groups
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Enable RLS on user_group_members
ALTER TABLE public.user_group_members
    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_group_members_service_role" ON public.user_group_members;
CREATE POLICY "user_group_members_service_role" ON public.user_group_members
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Enable RLS on dashboard_widgets
ALTER TABLE public.dashboard_widgets
    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_widgets_service_role" ON public.dashboard_widgets;
CREATE POLICY "dashboard_widgets_service_role" ON public.dashboard_widgets
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- PART 4: SIMPLIFY RLS TO SERVICE_ROLE ONLY FOR SERVER-ACCESSED TABLES
-- ============================================================================

-- DASHBOARDS: Remove existing policies, add service_role only
DROP POLICY IF EXISTS "Authenticated users can view dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "Service role can manage dashboards" ON public.dashboards;

CREATE POLICY "dashboards_service_role" ON public.dashboards
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- DASHBOARD_ACCESS: Remove existing policies, add service_role only
DROP POLICY IF EXISTS "Authenticated users can view dashboard access" ON public.dashboard_access;
DROP POLICY IF EXISTS "Service role can manage dashboard access" ON public.dashboard_access;

CREATE POLICY "dashboard_access_service_role" ON public.dashboard_access
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- DASHBOARD_TAB: Remove existing policies, add service_role only
DROP POLICY IF EXISTS "Service role can manage all tabs" ON public.dashboard_tab;
DROP POLICY IF EXISTS "Users can view tabs of public dashboards" ON public.dashboard_tab;

CREATE POLICY "dashboard_tab_service_role" ON public.dashboard_tab
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- DASHBOARD_FILTERS: Remove existing policies, add service_role only
DROP POLICY IF EXISTS "dashboard_filters_access" ON public.dashboard_filters;

CREATE POLICY "dashboard_filters_service_role" ON public.dashboard_filters
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- CHARTS: Remove existing policies, add service_role only
DROP POLICY IF EXISTS "reporting_reports_owner_rw" ON public.charts;

CREATE POLICY "charts_service_role" ON public.charts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- DATA_CONNECTIONS: Remove existing policies, add service_role only
DROP POLICY IF EXISTS "data_connections_owner_rw" ON public.data_connections;

CREATE POLICY "data_connections_service_role" ON public.data_connections
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- APP_LOG: Remove existing policies, add service_role only
DROP POLICY IF EXISTS "Only admins can view logs" ON public.app_log;
DROP POLICY IF EXISTS "Service role can manage logs" ON public.app_log;

CREATE POLICY "app_log_service_role" ON public.app_log
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- PART 5: OPTIMIZE RLS FOR CLIENT-ACCESSED TABLES
-- ============================================================================

-- ORGANIZATIONS: Simplify - users need SELECT for profile JOIN
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can delete their organization" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Service role can manage organizations" ON public.organizations;

-- Service role full access
CREATE POLICY "organizations_service_role" ON public.organizations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can SELECT (needed for profile JOIN)
CREATE POLICY "organizations_authenticated_select" ON public.organizations
    FOR SELECT
    TO authenticated
    USING (true);

-- PROFILES: Optimize with (select auth.uid()) pattern and consolidate
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Service role full access
CREATE POLICY "profiles_service_role" ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Users can SELECT their own profile (optimized)
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Users can UPDATE their own profile (optimized)
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- REPORTS: Consolidate and optimize
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can insert their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON public.reports;
DROP POLICY IF EXISTS "Service role can manage all reports" ON public.reports;

-- Service role full access
CREATE POLICY "reports_service_role" ON public.reports
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Users can SELECT their own reports (optimized)
CREATE POLICY "reports_select_own" ON public.reports
    FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Users can INSERT their own reports (optimized)
CREATE POLICY "reports_insert_own" ON public.reports
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can UPDATE their own reports (optimized)
CREATE POLICY "reports_update_own" ON public.reports
    FOR UPDATE
    TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can DELETE their own reports (optimized)
CREATE POLICY "reports_delete_own" ON public.reports
    FOR DELETE
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- EMAIL_QUEUE: Consolidate and optimize
DROP POLICY IF EXISTS "Users can view email queue for their reports" ON public.email_queue;
DROP POLICY IF EXISTS "Users can view their own email queue" ON public.email_queue;
DROP POLICY IF EXISTS "Admins can view all email queue entries" ON public.email_queue;
DROP POLICY IF EXISTS "Service role can manage all email queue" ON public.email_queue;

-- Service role full access
CREATE POLICY "email_queue_service_role" ON public.email_queue
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Users can SELECT email queue entries for their reports (optimized, consolidated)
CREATE POLICY "email_queue_select_own" ON public.email_queue
    FOR SELECT
    TO authenticated
    USING (
    report_id IN (SELECT id
                  FROM public.reports
                  WHERE user_id = (SELECT auth.uid()))
    );

-- Users can INSERT email queue entries for their reports (optimized)
CREATE POLICY "email_queue_insert_own" ON public.email_queue
    FOR INSERT
    TO authenticated
    WITH CHECK (
    report_id IN (SELECT id
                  FROM public.reports
                  WHERE user_id = (SELECT auth.uid()))
    );

-- ============================================================================
-- PART 6: ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Index on dashboard_access.shared_by
CREATE INDEX IF NOT EXISTS idx_dashboard_access_shared_by
    ON public.dashboard_access (shared_by);

-- Index on dashboards.creator
CREATE INDEX IF NOT EXISTS idx_dashboards_creator
    ON public.dashboards (creator);

-- Index on user_groups.organization_id
CREATE INDEX IF NOT EXISTS idx_user_groups_organization_id
    ON public.user_groups (organization_id);

-- Index on user_groups.created_by
CREATE INDEX IF NOT EXISTS idx_user_groups_created_by
    ON public.user_groups (created_by);

-- Index on user_group_members.user_id
CREATE INDEX IF NOT EXISTS idx_user_group_members_user_id
    ON public.user_group_members (user_id);

-- ============================================================================
-- VERIFICATION COMMENTS
-- ============================================================================
-- After applying this migration:
-- 1. All tables have RLS enabled
-- 2. Server-accessed tables (dashboards, charts, etc.) only allow service_role
-- 3. Client-accessed tables (profiles, reports, email_queue) have optimized policies
-- 4. All RLS policies use (SELECT auth.uid()) for better performance
-- 5. Multiple permissive policies have been consolidated
-- 6. All foreign keys have covering indexes
-- 7. Unused functions have been removed
-- 8. Used functions have proper search_path set
-- ============================================================================

