-- Create organizations table
CREATE TABLE public.organizations (
                                      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                                      name TEXT NOT NULL,
                                      viewer_count INTEGER NOT NULL DEFAULT 0,
                                      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for internal users (ADMIN/EDITOR)
CREATE TABLE public.profiles (
                                 user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                                 first_name TEXT,
                                 last_name TEXT,
                                 role TEXT NOT NULL CHECK (role IN ('ADMIN', 'EDITOR')),
                                 organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
                                 created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create viewers table for customer viewers
CREATE TABLE public.viewers (
                                user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                                organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
                                first_name TEXT,
                                last_name TEXT,
                                viewer_type TEXT,
                                group_name TEXT,
                                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dashboards table
CREATE TABLE public.dashboards (
                                   id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                                   name TEXT NOT NULL,
                                   owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                   is_public BOOLEAN NOT NULL DEFAULT false,
                                   password TEXT,
                                   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dashboard_access table for sharing permissions
CREATE TABLE public.dashboard_access (
                                         id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                                         dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
                                         viewer_user_id UUID REFERENCES public.viewers(user_id) ON DELETE CASCADE,
                                         organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
                                         shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                         created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                                         CONSTRAINT check_access_type CHECK (
                                             (viewer_user_id IS NOT NULL AND organization_id IS NULL) OR
                                             (viewer_user_id IS NULL AND organization_id IS NOT NULL)
                                             )
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_access ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create security definer function to get current user organization
CREATE OR REPLACE FUNCTION public.get_current_user_organization()
RETURNS UUID AS $$
SELECT organization_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create security definer function to check if user is viewer
CREATE OR REPLACE FUNCTION public.is_viewer()
RETURNS BOOLEAN AS $$
SELECT EXISTS(SELECT 1 FROM public.viewers WHERE user_id = auth.uid());
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create security definer function to get viewer organization
CREATE OR REPLACE FUNCTION public.get_viewer_organization()
RETURNS UUID AS $$
SELECT organization_id FROM public.viewers WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- RLS Policies for organizations table
CREATE POLICY "Admins can view all organizations" ON public.organizations
    FOR SELECT TO authenticated
                      USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Editors can view their organization" ON public.organizations
    FOR SELECT TO authenticated
                   USING (
                   public.get_current_user_role() = 'EDITOR' AND
                   id = public.get_current_user_organization()
                   );

CREATE POLICY "Viewers can view their organization" ON public.organizations
    FOR SELECT TO authenticated
                   USING (
                   public.is_viewer() AND
                   id = public.get_viewer_organization()
                   );

CREATE POLICY "Only admins can modify organizations" ON public.organizations
    FOR ALL TO authenticated
    USING (public.get_current_user_role() = 'ADMIN')
    WITH CHECK (public.get_current_user_role() = 'ADMIN');

-- RLS Policies for profiles table
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT TO authenticated
                          USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT TO authenticated
                   USING (user_id = auth.uid());

CREATE POLICY "Admins can insert all profiles" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE TO authenticated
                          USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated
                   USING (user_id = auth.uid());

CREATE POLICY "Admins can delete all profiles" ON public.profiles
    FOR DELETE TO authenticated
    USING (public.get_current_user_role() = 'ADMIN');

-- RLS Policies for viewers table
CREATE POLICY "Admins can view all viewers" ON public.viewers
    FOR SELECT TO authenticated
                                         USING (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Editors can view viewers in their organization" ON public.viewers
    FOR SELECT TO authenticated
                   USING (
                   public.get_current_user_role() = 'EDITOR' AND
                   organization_id = public.get_current_user_organization()
                   );

CREATE POLICY "Viewers can view their own record" ON public.viewers
    FOR SELECT TO authenticated
                   USING (user_id = auth.uid());

CREATE POLICY "Admins can modify all viewers" ON public.viewers
    FOR ALL TO authenticated
    USING (public.get_current_user_role() = 'ADMIN')
    WITH CHECK (public.get_current_user_role() = 'ADMIN');

CREATE POLICY "Editors can modify viewers in their organization" ON public.viewers
    FOR ALL TO authenticated
    USING (
        public.get_current_user_role() = 'EDITOR' AND
        organization_id = public.get_current_user_organization()
    )
    WITH CHECK (
        public.get_current_user_role() = 'EDITOR' AND
        organization_id = public.get_current_user_organization()
    );

-- RLS Policies for dashboards table
CREATE POLICY "Users can view dashboards they own" ON public.dashboards
    FOR SELECT TO authenticated
                                 USING (owner_id = auth.uid());

CREATE POLICY "Users can view public dashboards" ON public.dashboards
    FOR SELECT TO authenticated
                   USING (is_public = true);

CREATE POLICY "Users can view dashboards shared with them" ON public.dashboards
    FOR SELECT TO authenticated
                   USING (
                   id IN (
                   SELECT dashboard_id FROM public.dashboard_access
                   WHERE viewer_user_id = auth.uid()
                   )
                   );

CREATE POLICY "Users can view dashboards shared with their organization" ON public.dashboards
    FOR SELECT TO authenticated
                   USING (
                   id IN (
                   SELECT dashboard_id FROM public.dashboard_access
                   WHERE organization_id = public.get_viewer_organization()
                   )
                   );

CREATE POLICY "Users can insert their own dashboards" ON public.dashboards
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own dashboards" ON public.dashboards
    FOR UPDATE TO authenticated
                          USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own dashboards" ON public.dashboards
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());

-- RLS Policies for dashboard_access table
CREATE POLICY "Users can view access grants that affect them" ON public.dashboard_access
    FOR SELECT TO authenticated
                                         USING (
                                         viewer_user_id = auth.uid() OR
                                         organization_id = public.get_viewer_organization() OR
                                         shared_by = auth.uid() OR
                                         public.get_current_user_role() = 'ADMIN'
                                         );

CREATE POLICY "Dashboard owners can manage access" ON public.dashboard_access
    FOR ALL TO authenticated
    USING (
        shared_by = auth.uid() OR
        dashboard_id IN (
            SELECT id FROM public.dashboards WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        shared_by = auth.uid() OR
        dashboard_id IN (
            SELECT id FROM public.dashboards WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all access" ON public.dashboard_access
    FOR ALL TO authenticated
    USING (public.get_current_user_role() = 'ADMIN')
    WITH CHECK (public.get_current_user_role() = 'ADMIN');

-- Create indexes for better performance
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX idx_viewers_organization_id ON public.viewers(organization_id);
CREATE INDEX idx_dashboards_owner_id ON public.dashboards(owner_id);
CREATE INDEX idx_dashboards_is_public ON public.dashboards(is_public);
CREATE INDEX idx_dashboard_access_dashboard_id ON public.dashboard_access(dashboard_id);
CREATE INDEX idx_dashboard_access_viewer_user_id ON public.dashboard_access(viewer_user_id);
CREATE INDEX idx_dashboard_access_organization_id ON public.dashboard_access(organization_id);

-- Create trigger function for updating viewer count
CREATE OR REPLACE FUNCTION public.update_organization_viewer_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
UPDATE public.organizations
SET viewer_count = viewer_count + 1
WHERE id = NEW.organization_id;
RETURN NEW;
ELSIF TG_OP = 'DELETE' THEN
UPDATE public.organizations
SET viewer_count = viewer_count - 1
WHERE id = OLD.organization_id;
RETURN OLD;
ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.organization_id != NEW.organization_id THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically update viewer count
CREATE TRIGGER update_viewer_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.viewers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_organization_viewer_count();
