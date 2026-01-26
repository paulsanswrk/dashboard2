-- Add tenant_id column to organizations table
-- Maps dashboard organizations to Optiqoflow tenants for data isolation

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Add index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_organizations_tenant_id 
ON public.organizations (tenant_id);

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.tenant_id IS 'Optional FK to optiqoflow.tenants - links organization to tenant for data isolation';
