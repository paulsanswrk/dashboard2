# Tenant Cleanup Operations

## Overview

The tenant cleanup system safely removes all tenant-related objects from the dashboard database. This includes schemas, roles, views, charts, data connections, and metadata.

## Components

### 1. SQL Function
Located in: `supabase/migrations/20260127_tenant_cleanup_function.sql`

**Function:** `tenants.delete_tenant_completely(tenant_id, unlink_organizations, delete_optiqoflow_data, dry_run)`

**Parameters:**
- `tenant_id` (UUID) - The tenant to delete
- `unlink_organizations` (BOOLEAN, default: true) - If true, unlinks orgs; if false, deletes orgs
- `delete_optiqoflow_data` (BOOLEAN, default: false) - **WARNING:** Deletes external data
- `dry_run` (BOOLEAN, default: true) - Preview without executing

**Returns:** JSONB with deletion summary

### 2. API Endpoint
Located in: `server/api/admin/tenants/[id]/delete.delete.ts`

**Endpoint:** `DELETE /api/admin/tenants/{id}`

**Authorization:** SUPERADMIN only

**Query Parameters:**
- `dry_run` (boolean, default: true) - Preview mode
- `unlink_organizations` (boolean, default: true) - Unlink vs delete orgs  
- `confirm` (boolean, required for actual deletion) - Safety confirmation

**Example:**
```bash
# Dry-run preview
curl -X DELETE "https://your-domain.com/api/admin/tenants/123e4567.../delete?dry_run=true"

# Actual deletion  
curl -X DELETE "https://your-domain.com/api/admin/tenants/123e4567.../delete?dry_run=false&confirm=true"
```

### 3. CLI Script
Located in: `scripts/cleanup-tenant.ts`

**Usage:**
```bash
# Interactive deletion with prompts
npx tsx scripts/cleanup-tenant.ts <tenant_id>

# Help
npx tsx scripts/cleanup-tenant.ts --help
```

**Features:**
- ✅ Dry-run preview first
- ✅ Multiple confirmation prompts
- ✅ Choice to unlink or delete organizations
- ✅ Detailed reporting
- ✅ Safe by default

## What Gets Deleted

### Dashboard Objects (public schema):
1. **Chart data cache** - All cached results for tenant
2. **Charts** - All charts using tenant's connections
3. **Chart dependencies** - Table dependency tracking
4. **Data connections** - All connections for tenant's organizations
5. **Organizations** - Either unlinked (tenant_id → NULL) or deleted

### Tenant-Specific Objects (tenants schema):
6. **Column access tracking** - `tenants.tenant_column_access`
7. **Data push logs** - `tenants.tenant_data_push_log`
8. **Tenant registration** - `tenants.tenant_short_names`

### PostgreSQL Objects:
9. **Views** - All views in `tenant_{short_name}` schema
10. **Schema** - The `tenant_{short_name}` schema (CASCADE)
11. **Role** - The `tenant_{short_name}_role` PostgreSQL role

### NOT Deleted:
- ❌ **OptiqoFlow data** - External data in `optiqoflow` schema tables
  - This is managed by the OptiqoFlow system
  - Delete manually if needed

## Usage Examples

### Example 1: Preview Cleanup (CLI - Recommended)
```bash
npx tsx scripts/cleanup-tenant.ts 123e4567-e89b-12d3-a456-426614174000
```

Output:
```
🔍 DRY RUN PREVIEW
============================================================
Tenant ID: 123e4567-e89b-12d3-a456-426614174000
Tenant Short Name: acme_cleaning_co

Objects affected:
  Organizations:        2
  Data Connections:     2  
  Charts:               15
  Cache Entries:        234
  Chart Dependencies:   45
  Views:                45
  Column Access Rows:   48
  Push Log Rows:        108
  Schema:               tenant_acme_cleaning_co
  Role:                 tenant_acme_cleaning_co_role

⚠️  Warnings:
  - 2 organization(s) linked to tenant: Acme Corp, Acme Beta

Action: Organizations will be unlinked (tenant_id set to NULL)
============================================================
```

### Example 2: Execute Cleanup (CLI)
The CLI will prompt for confirmations:
1. Preview shown
2. "Do you want to proceed with deletion?" → yes
3. "Do you want to UNLINK organizations?" → yes (recommended)
4. "FINAL CONFIRMATION..." → yes

### Example 3: API Usage
```bash
# Preview
curl -X DELETE \
  "https://api.optiqo.report/api/admin/tenants/123e4567.../delete?dry_run=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Execute (requires confirmation)
curl -X DELETE \
  "https://api.optiqo.report/api/admin/tenants/123e4567.../delete?dry_run=false&confirm=true&unlink_organizations=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 4: Direct SQL
```sql
-- Dry-run
SELECT tenants.delete_tenant_completely(
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    true,  -- unlink_organizations
    false, -- delete_optiqoflow_data
    true   -- dry_run
);

-- Actual deletion
SELECT tenants.delete_tenant_completely(
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    true,  -- unlink_organizations  
    false, -- delete_optiqoflow_data
    false  -- NOT dry_run
);
```

## Safety Features

### Built-in Safeguards:
1. ✅ **Dry-run default** - Always preview first
2. ✅ **SUPERADMIN only** - API restricted to superadmins
3. ✅ **Explicit confirmation** - Required for actual deletion
4. ✅ **Transaction wrapped** - Rollback on any error
5. ✅ **Detailed warnings** - Lists affected organizations
6. ✅ **Never deletes optiqoflow data** - External data protected

### Recommendations:
- ⚠️ Always run dry-run first
- ⚠️ Review the preview carefully
- ⚠️ Backup database before major deletions
- ⚠️ Use CLI for interactive safety
- ⚠️ Prefer unlinking organizations over deleting

## Troubleshooting

### "Tenant not found"
- Verify tenant ID exists in `tenants.tenant_short_names`
- Check UUID format is correct

### "Deletion requires explicit confirmation"
- Add `confirm=true` query parameter to API request
- CLI will prompt automatically

### Objects still exist after deletion
- Check function returned `success: true`
- Verify transaction wasn't rolled back
- Check PostgreSQL logs

## Migration

To apply the cleanup function:

```bash
cd /home/ubuntu/nodejs/optiqo-dashboard
# Apply manually (migrations are manually applied)
psql -d your_database < supabase/migrations/20260127_tenant_cleanup_function.sql
```

Or apply via Supabase dashboard SQL editor.

## Related Documentation

- [Multi-Tenant Data Architecture](../implementation/optiqoflow/multi-tenant-data-architecture.md)
- [Organization-Tenant Mapping](../implementation/optiqoflow/multi-tenant-data-architecture.md#organization-tenant-mapping)
