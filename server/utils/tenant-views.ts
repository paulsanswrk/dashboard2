/**
 * Tenant View Generation Utilities
 * 
 * Creates per-tenant views in tenant-specific schemas that provide:
 * - Row isolation via tenant_id filtering
 * - Column isolation via dynamic column selection
 * 
 * Views are created in `tenant_{short_name}` schema with simple table names,
 * allowing unqualified SQL queries when using the tenant's role.
 */

import { pgClient } from '../../lib/db'
import { ensureTenantRole } from './tenant-role'

// Tables that use direct tenant_id filtering
const DIRECT_TENANT_TABLES = [
    'work_orders', 'work_order_checklists', 'attendance_events', 'issue_reports',
    'work_order_categories', 'work_order_services', 'ward_cleaning_requests',
    'schedules', 'schedule_assignments', 'schedule_templates', 'staff_availability',
    'staff_shift_assignments', 'staff_work_schedule', 'team_shift_templates',
    'holidays', 'absence_requests', 'overtime_requests', 'overtime_reason_codes', 'overtime_factors',
    'sites', 'rooms', 'zones', 'room_status_log', 'room_qr_codes', 'qr_code_scans',
    'qr_landing_page_configs', 'public_site_info', 'optimized_routes',
    'zone_floorplans', 'floorplan_walls', 'floorplan_furniture', 'floorplan_room_assignments',
    'drawing_calibration', 'checklist_libraries', 'checklist_categories', 'checklist_completions',
    'quality_inspections', 'quality_control_checklists', 'quality_checklist_key_figures',
    'site_quality_profiles', 'service_standards', 'room_feedback', 'healthcare_metrics',
    'profiles', 'teams', 'team_members', 'departments', 'user_cards', 'user_role_categories',
    'customers', 'contracts', 'contract_amendments', 'contract_costs',
    'base_pricing', 'pricing_rules', 'pricing_rule_templates', 'pricing_matrices',
    'customer_pricing_overrides', 'cost_calculation_profiles', 'equipment_costs',
    'material_costs', 'overhead_factors', 'workforce_cost_factors', 'travel_costs',
    'quotes', 'invoices', 'budgets', 'programs', 'program_teams', 'program_template_overrides',
    'tasks', 'task_templates', 'template_categories', 'template_category_libraries',
    'notifications', 'notification_logs', 'shift_chats', 'direct_chats', 'video_sessions',
    'tenant_settings', 'company_policies', 'filter_presets', 'triggers', 'device_admin_cards',
]

// Tables that use device-based filtering (via device_tenants junction)
const DEVICE_BASED_TABLES: Record<string, { joinColumn: string }> = {
    'devices': { joinColumn: 'id' },
    'device_measurements': { joinColumn: 'device_id' },
    'device_measurements_daily': { joinColumn: 'device_id' },
    'device_configs': { joinColumn: 'device_id' },
    'device_network_info': { joinColumn: 'device_id' },
    'device_activity': { joinColumn: 'device_id' },
}

// Tables that use parent relation filtering
const PARENT_RELATION_TABLES: Record<string, { parentTable: string; foreignKey: string }> = {
    'inspection_rooms': { parentTable: 'quality_inspections', foreignKey: 'inspection_id' },
    'quote_line_items': { parentTable: 'quotes', foreignKey: 'quote_id' },
    'quote_pricing': { parentTable: 'quotes', foreignKey: 'quote_id' },
    'quote_scope': { parentTable: 'quotes', foreignKey: 'quote_id' },
    'chat_messages': { parentTable: 'shift_chats', foreignKey: 'chat_id' },
    'direct_messages': { parentTable: 'direct_chats', foreignKey: 'chat_id' },
    'notification_reads': { parentTable: 'notifications', foreignKey: 'notification_id' },
    'notification_team_targets': { parentTable: 'notifications', foreignKey: 'notification_id' },
    'floorplan_drawing_metadata': { parentTable: 'zone_floorplans', foreignKey: 'floorplan_id' },
    'floorplan_user_preferences': { parentTable: 'zone_floorplans', foreignKey: 'floorplan_id' },
    'template_checklist_mappings': { parentTable: 'task_templates', foreignKey: 'template_id' },
    'site_quality_profile_levels': { parentTable: 'site_quality_profiles', foreignKey: 'profile_id' },
    'budget_allocations': { parentTable: 'budgets', foreignKey: 'budget_id' },
    'checklist_library_service_standards': { parentTable: 'checklist_libraries', foreignKey: 'checklist_library_id' },
    'cost_profile_equipment': { parentTable: 'cost_calculation_profiles', foreignKey: 'cost_profile_id' },
    'cost_profile_materials': { parentTable: 'cost_calculation_profiles', foreignKey: 'cost_profile_id' },
    'cost_profile_overhead': { parentTable: 'cost_calculation_profiles', foreignKey: 'cost_profile_id' },
    'route_waypoints': { parentTable: 'optimized_routes', foreignKey: 'route_id' },
    'route_metrics': { parentTable: 'optimized_routes', foreignKey: 'route_id' },
    'trigger_executions': { parentTable: 'triggers', foreignKey: 'trigger_id' },
    'pricing_matrix_equipment': { parentTable: 'pricing_matrices', foreignKey: 'matrix_id' },
    'pricing_matrix_materials': { parentTable: 'pricing_matrices', foreignKey: 'matrix_id' },
    'pricing_matrix_overhead_factors': { parentTable: 'pricing_matrices', foreignKey: 'matrix_id' },
    'pricing_matrix_overtime_factors': { parentTable: 'pricing_matrices', foreignKey: 'matrix_id' },
    'pricing_matrix_travel': { parentTable: 'pricing_matrices', foreignKey: 'matrix_id' },
    'pricing_matrix_workforce_factors': { parentTable: 'pricing_matrices', foreignKey: 'matrix_id' },
}

// Global tables (no tenant filtering needed - shared reference data)
const GLOBAL_TABLES = ['tenants', 'insta_quality_levels', 'service_types']

/**
 * Gets the tenant's short_name from the database using pgClient (Drizzle)
 * Queries from tenants.tenant_short_names (dashboard-controlled schema)
 */
export async function getTenantShortName(tenantId: string): Promise<string | null> {
    try {
        const result = await pgClient.unsafe(
            `SELECT short_name FROM tenants.tenant_short_names WHERE tenant_id = $1`,
            [tenantId]
        ) as Array<{ short_name: string | null }>

        if (!result[0]?.short_name) {
            console.error(`[TenantViews] Tenant ${tenantId} not found in tenants.tenant_short_names`)
            return null
        }

        return result[0].short_name
    } catch (error) {
        console.error('[TenantViews] Failed to get tenant short_name:', error)
        return null
    }
}

/**
 * Generates the filter SQL for a table based on its type
 */
function generateFilterSql(tableName: string, tenantId: string): string {
    // Direct tenant_id filter
    if (DIRECT_TENANT_TABLES.includes(tableName)) {
        return `tenant_id = '${tenantId}'`
    }

    // Device-based filter
    if (tableName in DEVICE_BASED_TABLES) {
        const { joinColumn } = DEVICE_BASED_TABLES[tableName]
        // This will be a subquery filter since we can't do JOINs in simple WHERE
        return `${joinColumn} IN (SELECT device_id FROM optiqoflow.device_tenants WHERE tenant_id = '${tenantId}' AND is_current_owner = true)`
    }

    // Parent relation filter - need a different approach for views
    if (tableName in PARENT_RELATION_TABLES) {
        const { parentTable, foreignKey } = PARENT_RELATION_TABLES[tableName]
        return `${foreignKey} IN (SELECT id FROM optiqoflow.${parentTable} WHERE tenant_id = '${tenantId}')`
    }

    // Global tables - no filtering
    if (GLOBAL_TABLES.includes(tableName)) {
        return '1=1'
    }

    // Default: assume direct tenant_id
    return `tenant_id = '${tenantId}'`
}

/**
 * Generates SQL for creating a tenant-specific view in their schema
 */
export function generateViewSql(
    shortName: string,
    tenantId: string,
    tableName: string,
    columns: string[]
): string {
    const schemaName = `tenant_${shortName}`
    const columnList = columns.map(c => `"${c}"`).join(', ')
    const filterSql = generateFilterSql(tableName, tenantId)

    // Device-based tables need JOIN syntax
    if (tableName in DEVICE_BASED_TABLES) {
        const { joinColumn } = DEVICE_BASED_TABLES[tableName]
        const prefixedColumns = columns.map(c => `t."${c}"`).join(', ')
        return `
CREATE OR REPLACE VIEW ${schemaName}."${tableName}" AS
SELECT ${prefixedColumns}
FROM optiqoflow."${tableName}" t
INNER JOIN optiqoflow.device_tenants dt ON dt.device_id = t.${joinColumn}
WHERE dt.tenant_id = '${tenantId}' AND dt.is_current_owner = true;`
    }

    // Parent relation tables need JOIN syntax  
    if (tableName in PARENT_RELATION_TABLES) {
        const { parentTable, foreignKey } = PARENT_RELATION_TABLES[tableName]
        const prefixedColumns = columns.map(c => `t."${c}"`).join(', ')
        return `
CREATE OR REPLACE VIEW ${schemaName}."${tableName}" AS
SELECT ${prefixedColumns}
FROM optiqoflow."${tableName}" t
INNER JOIN optiqoflow."${parentTable}" p ON p.id = t.${foreignKey}
WHERE p.tenant_id = '${tenantId}';`
    }

    // Simple WHERE clause for direct and global tables
    return `
CREATE OR REPLACE VIEW ${schemaName}."${tableName}" AS
SELECT ${columnList}
FROM optiqoflow."${tableName}"
WHERE ${filterSql};`
}

/**
 * Creates or updates a tenant-specific view in their schema using pgClient (Drizzle)
 * Also ensures the tenant schema and role exist with proper permissions
 */
export async function createOrUpdateTenantView(
    tenantId: string,
    tableName: string,
    columns: string[]
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get the tenant's short_name
        const shortName = await getTenantShortName(tenantId)

        if (!shortName) {
            return { success: false, error: `Tenant ${tenantId} not found or missing short_name` }
        }

        const schemaName = `tenant_${shortName}`

        // Ensure schema exists
        console.log(`[TenantViews] Ensuring schema exists: ${schemaName}`)
        await pgClient.unsafe(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`)

        // Ensure role exists with proper permissions (including optiqoflow access)
        console.log(`[TenantViews] Ensuring tenant role has correct permissions`)
        const roleResult = await ensureTenantRole(shortName)
        if (!roleResult.success) {
            console.error(`[TenantViews] Failed to ensure tenant role:`, roleResult.error)
            // Continue anyway - view creation might still work
        }

        // Create the view
        const sql = generateViewSql(shortName, tenantId, tableName, columns)
        console.log(`[TenantViews] Creating view for ${tenantId}/${tableName} in ${schemaName}`)

        await pgClient.unsafe(sql)

        console.log(`[TenantViews] ✓ View created:  ${schemaName}.${tableName}`)
        return { success: true }
    } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[TenantViews] ✗ Error creating tenant view:`, error)
        return { success: false, error }
    }
}

/**
 * Drops a tenant-specific view from their schema using pgClient (Drizzle)
 */
export async function dropTenantView(
    tenantId: string,
    tableName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const shortName = await getTenantShortName(tenantId)

        if (!shortName) {
            return { success: false, error: `Tenant ${tenantId} not found` }
        }

        const schemaName = `tenant_${shortName}`
        const sql = `DROP VIEW IF EXISTS ${schemaName}."${tableName}";`

        await pgClient.unsafe(sql)

        return { success: true }
    } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error'
        return { success: false, error }
    }
}

/**
 * Gets the schema name for a tenant (requires short_name lookup)
 */
export async function getTenantSchemaName(tenantId: string): Promise<string | null> {
    const shortName = await getTenantShortName(tenantId)
    if (!shortName) return null
    return `tenant_${shortName}`
}

/**
 * Gets the view name for a tenant/table (for logging/debugging)
 */
export function getTenantViewName(shortName: string, tableName: string): string {
    return `tenant_${shortName}.${tableName}`
}

/**
 * Gets the filter type for a table
 */
export function getTableFilterType(tableName: string): 'direct' | 'device' | 'parent' | 'global' {
    if (DIRECT_TENANT_TABLES.includes(tableName)) return 'direct'
    if (tableName in DEVICE_BASED_TABLES) return 'device'
    if (tableName in PARENT_RELATION_TABLES) return 'parent'
    if (GLOBAL_TABLES.includes(tableName)) return 'global'
    return 'direct' // Default to direct
}
