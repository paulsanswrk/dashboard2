import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'crypto'
import { createOrUpdateTenantView } from '../utils/tenant-views'
import { invalidateCacheForTables } from '../utils/chart-cache'
import { pgClient } from '../../lib/db'

// Initialize Supabase client with optiqoflow schema
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        db: { schema: 'optiqoflow' }
    }
)

// Supabase client for public schema (for cache operations and view creation)
const publicSupabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Table mapping from Optiqo tables to optiqoflow schema tables
// Full list of 89 syncable tables - organized by category
const TABLE_MAPPING: Record<string, string> = {
    // ===== ORGANIZATION =====
    'tenants': 'tenants',  // Only id and name (for ID→name mapping)

    // ===== OPERATIONS =====
    'adhoc_work_orders': 'work_orders',
    'adhoc_work_order_checklists': 'work_order_checklists',
    'attendance_events': 'attendance_events',
    'issue_reports': 'issue_reports',
    'work_order_categories': 'work_order_categories',
    'work_order_services': 'work_order_services',
    'ward_cleaning_requests': 'ward_cleaning_requests',

    // ===== SCHEDULING =====
    'schedules': 'schedules',
    'schedule_assignments': 'schedule_assignments',
    'schedule_templates': 'schedule_templates',
    'staff_availability': 'staff_availability',
    'staff_shift_assignments': 'staff_shift_assignments',
    'staff_work_schedule': 'staff_work_schedule',
    'team_shift_templates': 'team_shift_templates',
    'holidays': 'holidays',
    'absence_requests': 'absence_requests',
    'overtime_requests': 'overtime_requests',
    'overtime_reason_codes': 'overtime_reason_codes',
    'overtime_factors': 'overtime_factors',

    // ===== DEVICES & IOT =====
    'devices': 'devices',
    'device_measurements': 'device_measurements',
    'device_measurements_daily': 'device_measurements_daily',
    'device_configs': 'device_configs',
    'device_activity': 'device_activity',
    'device_admin_cards': 'device_admin_cards',
    'device_network_info': 'device_network_info',
    'device_tenants': 'device_tenants',
    'triggers': 'triggers',
    'trigger_executions': 'trigger_executions',

    // ===== LOCATIONS =====
    'sites': 'sites',
    'rooms': 'rooms',
    'zone_categories': 'zones',
    'room_status_log': 'room_status_log',
    'room_qr_codes': 'room_qr_codes',
    'qr_code_scans': 'qr_code_scans',
    'qr_landing_page_configs': 'qr_landing_page_configs',
    'public_site_info': 'public_site_info',
    'optimized_routes': 'optimized_routes',
    'route_waypoints': 'route_waypoints',
    'route_metrics': 'route_metrics',

    // ===== FLOORPLANS =====
    'zone_floorplans': 'zone_floorplans',
    'floorplan_walls': 'floorplan_walls',
    'floorplan_furniture': 'floorplan_furniture',
    'floorplan_room_assignments': 'floorplan_room_assignments',
    'floorplan_drawing_metadata': 'floorplan_drawing_metadata',
    'floorplan_user_preferences': 'floorplan_user_preferences',
    'drawing_calibration': 'drawing_calibration',

    // ===== CHECKLISTS =====
    'checklist_libraries': 'checklist_libraries',
    'checklist_categories': 'checklist_categories',
    'checklist_completions': 'checklist_completions',
    'checklist_library_service_standards': 'checklist_library_service_standards',

    // ===== QUALITY & INSPECTIONS =====
    'quality_inspections': 'quality_inspections',
    'inspection_rooms': 'inspection_rooms',
    'quality_control_checklists': 'quality_control_checklists',
    'quality_checklist_key_figures': 'quality_checklist_key_figures',
    'insta_quality_levels': 'insta_quality_levels',
    'site_quality_profiles': 'site_quality_profiles',
    'site_quality_profile_levels': 'site_quality_profile_levels',
    'service_standards': 'service_standards',
    'service_types': 'service_types',

    // ===== FEEDBACK =====
    'room_feedback': 'room_feedback',

    // ===== HEALTHCARE =====
    'healthcare_metrics': 'healthcare_metrics',

    // ===== USERS & TEAMS =====
    'profiles': 'profiles',
    'teams': 'teams',
    'team_members': 'team_members',
    'departments': 'departments',
    'user_cards': 'user_cards',
    'user_role_categories': 'user_role_categories',

    // ===== CUSTOMERS & CONTRACTS =====
    'customers': 'customers',
    'contracts': 'contracts',
    'contract_amendments': 'contract_amendments',
    'contract_costs': 'contract_costs',

    // ===== PRICING & COSTS =====
    'base_pricing': 'base_pricing',
    'pricing_rules': 'pricing_rules',
    'pricing_rule_templates': 'pricing_rule_templates',
    'pricing_matrices': 'pricing_matrices',
    'pricing_matrix_equipment': 'pricing_matrix_equipment',
    'pricing_matrix_materials': 'pricing_matrix_materials',
    'pricing_matrix_overhead_factors': 'pricing_matrix_overhead_factors',
    'pricing_matrix_overtime_factors': 'pricing_matrix_overtime_factors',
    'pricing_matrix_travel': 'pricing_matrix_travel',
    'pricing_matrix_workforce_factors': 'pricing_matrix_workforce_factors',
    'customer_pricing_overrides': 'customer_pricing_overrides',
    'cost_calculation_profiles': 'cost_calculation_profiles',
    'cost_profile_equipment': 'cost_profile_equipment',
    'cost_profile_materials': 'cost_profile_materials',
    'cost_profile_overhead': 'cost_profile_overhead',
    'equipment_costs': 'equipment_costs',
    'material_costs': 'material_costs',
    'overhead_factors': 'overhead_factors',
    'workforce_cost_factors': 'workforce_cost_factors',
    'travel_costs': 'travel_costs',

    // ===== QUOTES & INVOICES =====
    'quotes': 'quotes',
    'quote_line_items': 'quote_line_items',
    'quote_pricing': 'quote_pricing',
    'quote_scope': 'quote_scope',
    'invoices': 'invoices',
    'budgets': 'budgets',
    'budget_allocations': 'budget_allocations',

    // ===== PROGRAMS & TEMPLATES =====
    'programs': 'programs',
    'program_teams': 'program_teams',
    'program_template_overrides': 'program_template_overrides',
    'tasks': 'tasks',
    'task_templates': 'task_templates',
    'template_categories': 'template_categories',
    'template_category_libraries': 'template_category_libraries',
    'template_checklist_mappings': 'template_checklist_mappings',

    // ===== NOTIFICATIONS =====
    'notifications': 'notifications',
    'notification_logs': 'notification_logs',
    'notification_reads': 'notification_reads',
    'notification_team_targets': 'notification_team_targets',

    // ===== CHAT & MESSAGING =====
    'chat_messages': 'chat_messages',
    'shift_chats': 'shift_chats',
    'direct_chats': 'direct_chats',
    'direct_messages': 'direct_messages',
    'video_sessions': 'video_sessions',

    // ===== SETTINGS =====
    'tenant_settings': 'tenant_settings',
    'company_policies': 'company_policies',
    'filter_presets': 'filter_presets',
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = createHmac('sha256', secret)
        .update(payload)
        .digest('hex')

    try {
        return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    } catch {
        return false
    }
}

/**
 * Updates tenant column access and regenerates view if columns changed or view doesn't exist
 * Uses pgClient (Drizzle) for direct SQL access to tenants schema
 */
async function updateTenantColumnAccess(
    tenantId: string,
    tableName: string,
    columns: string[]
): Promise<boolean> {
    console.log(`[WEBHOOK DEBUG] updateTenantColumnAccess called:`, { tenantId, tableName, columnCount: columns.length })
    const sortedColumns = [...columns].sort()

    try {
        // Check current columns using raw SQL
        const existingRows = await pgClient.unsafe(`
            SELECT columns FROM tenants.tenant_column_access 
            WHERE tenant_id = $1 AND table_name = $2
        `, [tenantId, tableName]) as Array<{ columns: string[] }>

        const existingColumns = existingRows[0]?.columns?.sort() || []
        const columnsChanged = JSON.stringify(sortedColumns) !== JSON.stringify(existingColumns)

        console.log(`[WEBHOOK DEBUG] Column comparison:`, {
            existingCount: existingColumns.length,
            newCount: sortedColumns.length,
            changed: columnsChanged,
            newColumns: sortedColumns.slice(0, 10).join(', ') + (sortedColumns.length > 10 ? '...' : '')
        })

        // Upsert column access using raw SQL
        // PostgreSQL array literal format: {a,b,c}
        const pgArrayLiteral = `{${sortedColumns.join(',')}}`
        await pgClient.unsafe(`
            INSERT INTO tenants.tenant_column_access (tenant_id, table_name, columns, last_push_at, updated_at)
            VALUES ($1, $2, $3::text[], NOW(), NOW())
            ON CONFLICT (tenant_id, table_name) 
            DO UPDATE SET columns = $3::text[], last_push_at = NOW(), updated_at = NOW()
        `, [tenantId, tableName, pgArrayLiteral])

        console.log(`[WEBHOOK DEBUG] Column access upserted successfully`)

        // Check if view exists by looking up tenant's schema
        const schemaResult = await pgClient.unsafe(
            `SELECT tenants.get_tenant_schema($1) as schema_name`,
            [tenantId]
        ) as Array<{ schema_name: string | null }>
        const schemaName = schemaResult[0]?.schema_name

        let viewExists = false
        if (schemaName) {
            const viewCheck = await pgClient.unsafe(`
                SELECT 1 FROM pg_views 
                WHERE schemaname = $1 AND viewname = $2
            `, [schemaName, tableName]) as Array<{ count: number }>
            viewExists = viewCheck.length > 0
        }

        // Regenerate view if columns changed OR view doesn't exist
        if (sortedColumns.length > 0 && (columnsChanged || !viewExists)) {
            const reason = columnsChanged ? 'columns changed' : 'view missing'
            console.log(`[WEBHOOK DEBUG] Regenerating tenant view for ${tenantId}/${tableName} (${reason})...`)
            const viewResult = await createOrUpdateTenantView(tenantId, tableName, sortedColumns)
            console.log(`[WEBHOOK DEBUG] View regeneration result:`, viewResult)
        }

        return columnsChanged
    } catch (error: any) {
        console.error(`[WEBHOOK DEBUG] Failed to update column access:`, error?.message || error)
        return false
    }
}

/**
 * Logs data push for cache invalidation tracking
 * Uses pgClient (Drizzle) for direct SQL access to tenants schema
 */
async function logDataPush(
    tenantId: string,
    pushId: string,
    affectedTables: string[],
    recordCounts: Record<string, number>
): Promise<void> {
    console.log(`[WEBHOOK DEBUG] logDataPush:`, { tenantId, pushId, affectedTables, recordCounts })

    try {
        // Generate a proper UUID for push_id if provided string isn't valid UUID
        const uuidPushId = pushId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
            ? pushId
            : crypto.randomUUID()
        // PostgreSQL array literal format
        const pgArrayLiteral = `{${affectedTables.join(',')}}`
        await pgClient.unsafe(`
            INSERT INTO tenants.tenant_data_push_log 
            (tenant_id, push_id, affected_tables, pushed_at, record_counts)
            VALUES ($1, $2, $3::text[], NOW(), $4::jsonb)
        `, [tenantId, uuidPushId, pgArrayLiteral, JSON.stringify(recordCounts)])

        console.log(`[WEBHOOK DEBUG] Data push logged successfully`)
    } catch (error: any) {
        console.error(`[WEBHOOK DEBUG] Failed to log data push:`, error?.message || error)
    }
}

/**
 * Ensures a tenant is registered in tenants.tenant_short_names
 * Calls the Postgres function tenants.register_tenant() if needed
 */
async function ensureTenantRegistered(tenantId: string): Promise<boolean> {
    try {
        // Check if tenant already registered
        const existing = await pgClient.unsafe(
            `SELECT short_name FROM tenants.tenant_short_names WHERE tenant_id = $1`,
            [tenantId]
        ) as Array<{ short_name: string }>

        if (existing.length > 0) {
            console.log(`[WEBHOOK DEBUG] Tenant ${tenantId} already registered as ${existing[0].short_name}`)
            return true
        }

        // Get tenant name from optiqoflow.tenants table
        const tenantData = await supabase
            .from('tenants')
            .select('name')
            .eq('id', tenantId)
            .single()

        if (tenantData.error || !tenantData.data?.name) {
            console.error(`[WEBHOOK DEBUG] Failed to get tenant name for ${tenantId}:`, tenantData.error)
            return false
        }

        const tenantName = tenantData.data.name

        // Register the tenant using the Postgres function
        console.log(`[WEBHOOK DEBUG] Registering new tenant ${tenantId} (${tenantName})...`)
        const result = await pgClient.unsafe(
            `SELECT tenants.register_tenant($1, $2) as short_name`,
            [tenantId, tenantName]
        ) as Array<{ short_name: string }>

        if (result[0]?.short_name) {
            console.log(`[WEBHOOK DEBUG] ✓ Tenant registered successfully: ${result[0].short_name}`)
            return true
        }

        return false
    } catch (error: any) {
        console.error(`[WEBHOOK DEBUG] ❌ Failed to register tenant:`, error?.message || error)
        return false
    }
}

export default defineEventHandler(async (event) => {
    const startTime = Date.now()

    try {
        // Get raw body for signature verification
        const rawBody = await readRawBody(event)
        const body = JSON.parse(rawBody || '{}')

        // Verify webhook signature if secret is configured
        const webhookSecret = process.env.OPTIQO_WEBHOOK_SECRET
        const signature = getHeader(event, 'x-webhook-signature')

        if (webhookSecret && signature) {
            if (!verifySignature(rawBody || '', signature, webhookSecret)) {
                console.error('Invalid webhook signature')
                throw createError({ statusCode: 401, message: 'Invalid signature' })
            }
        }

        const { operation, table, tenant_id, data, old_data, batch, sync_id } = body
        const targetTable = TABLE_MAPPING[table]

        console.log(`[WEBHOOK DEBUG] ========== INCOMING WEBHOOK ==========`)
        console.log(`[WEBHOOK DEBUG] Operation: ${operation}`)
        console.log(`[WEBHOOK DEBUG] Source table: ${table} -> Target: optiqoflow.${targetTable || '(UNMAPPED)'}`)
        console.log(`[WEBHOOK DEBUG] Tenant ID: ${tenant_id}`)
        console.log(`[WEBHOOK DEBUG] Sync ID: ${sync_id || '(none)'}`)
        console.log(`[WEBHOOK DEBUG] Has data: ${!!data}, Has batch: ${!!batch}`)
        if (data) console.log(`[WEBHOOK DEBUG] Data keys: ${Object.keys(data).join(', ')}`)
        if (batch) console.log(`[WEBHOOK DEBUG] Batch offset: ${batch.offset}, Batch size: ${batch.data?.length || 0}`)

        // Ensure tenant is registered in tenant_short_names before processing
        if (tenant_id && operation !== 'TEST') {
            console.log(`[WEBHOOK DEBUG] Ensuring tenant ${tenant_id} is registered...`)
            await ensureTenantRegistered(tenant_id)
        }

        // Handle operations that don't require a single table first
        if (operation === 'MULTI_TABLE_SYNC') {
            // Handled in switch below, skip targetTable check
        } else if (operation === 'TEST') {
            console.log('[WEBHOOK DEBUG] Test webhook received:', JSON.stringify(data, null, 2))
            return { received: true, test: true }
        } else if (!targetTable) {
            console.log(`[WEBHOOK DEBUG] ❌ Skipping unmapped table: ${table}`)
            return { received: true, skipped: true }
        }

        switch (operation) {
            case 'INSERT':
            case 'UPDATE':
                console.log(`[WEBHOOK DEBUG] Processing ${operation} for ${targetTable}...`)

                // Upsert the record
                const { error: upsertError } = await supabase
                    .from(targetTable)
                    .upsert(data, { onConflict: 'id' })

                if (upsertError) {
                    console.error(`[WEBHOOK DEBUG] ❌ Upsert failed:`, upsertError)
                    throw upsertError
                }
                console.log(`[WEBHOOK DEBUG] ✓ Upsert successful for record ID: ${data?.id}`)

                // Track columns and update tenant view (async, non-blocking)
                if (tenant_id && data) {
                    const columns = Object.keys(data)
                    console.log(`[WEBHOOK DEBUG] Starting background tasks for ${columns.length} columns...`)

                    event.waitUntil(
                        Promise.all([
                            updateTenantColumnAccess(tenant_id, targetTable, columns),
                            invalidateCacheForTables(publicSupabase, tenant_id, [targetTable]).then(count => {
                                console.log(`[WEBHOOK DEBUG] Cache invalidation result: ${count} entries invalidated`)
                            }),
                            logDataPush(tenant_id, sync_id || crypto.randomUUID(), [targetTable], { [targetTable]: 1 })
                        ]).catch(e => console.error('[WEBHOOK DEBUG] ❌ Background task error:', e))
                    )
                } else {
                    console.log(`[WEBHOOK DEBUG] ⚠ Skipping background tasks: tenant_id=${tenant_id}, hasData=${!!data}`)
                }
                break

            case 'DELETE':
                const { error: deleteError } = await supabase
                    .from(targetTable)
                    .delete()
                    .eq('id', data.id)

                if (deleteError) throw deleteError
                break

            case 'FULL_SYNC':
                console.log(`[WEBHOOK DEBUG] Processing FULL_SYNC for ${targetTable}...`)
                const syncStartTime = new Date()
                let recordCount = 0
                const primaryKeys: string[] = []

                // Global tables that don't have tenant_id filtering
                const GLOBAL_TABLES = ['tenants', 'insta_quality_levels', 'service_types']

                // On first batch, clear existing data for this tenant
                if (batch.offset === 0) {
                    console.log(`[WEBHOOK DEBUG] First batch (offset=0), clearing existing data for tenant ${tenant_id}...`)

                    // Global tables: skip clearing (they're shared across all tenants)
                    if (GLOBAL_TABLES.includes(targetTable)) {
                        console.log(`[WEBHOOK DEBUG] ⚠ Skipping clear for global table: ${targetTable}`)
                    } else {
                        const { error: delErr } = await supabase
                            .from(targetTable)
                            .delete()
                            .eq('tenant_id', tenant_id)
                        if (delErr) {
                            console.error(`[WEBHOOK DEBUG] ❌ Failed to clear existing data:`, delErr)
                        } else {
                            console.log(`[WEBHOOK DEBUG] ✓ Existing data cleared`)
                        }
                    }
                }

                // Bulk insert
                if (batch.data && batch.data.length > 0) {
                    console.log(`[WEBHOOK DEBUG] Upserting ${batch.data.length} records...`)
                    const { error: bulkError } = await supabase
                        .from(targetTable)
                        .upsert(batch.data, { onConflict: 'id' })

                    if (bulkError) {
                        console.error(`[WEBHOOK DEBUG] ❌ Bulk upsert failed:`, bulkError)
                        throw bulkError
                    }
                    console.log(`[WEBHOOK DEBUG] ✓ Bulk upsert successful`)

                    recordCount = batch.data.length
                    // Collect primary keys (max 1000 per table)
                    batch.data.slice(0, 1000).forEach((row: any) => {
                        if (row.id) primaryKeys.push(row.id)
                    })
                }

                // Log to sync_summary for chart update tracking
                if (sync_id) {
                    console.log(`[WEBHOOK DEBUG] Logging to sync_summary...`)
                    try {
                        await supabase.from('sync_summary').insert({
                            sync_id,
                            sync_type: 'full_sync',
                            tenant_id,
                            table_name: targetTable,
                            operation: 'FULL_SYNC',
                            record_count: recordCount,
                            primary_keys: primaryKeys,
                            primary_keys_overflow: (batch.data?.length || 0) > 1000,
                            started_at: syncStartTime,
                            completed_at: new Date(),
                            success: true,
                        })
                        console.log(`[WEBHOOK DEBUG] ✓ sync_summary logged`)
                    } catch (e) {
                        console.error('[WEBHOOK DEBUG] Failed to log sync_summary:', e)
                    }
                }

                // Track columns and invalidate cache (async, non-blocking)
                if (tenant_id && batch.data && batch.data.length > 0) {
                    const columns = Object.keys(batch.data[0])
                    console.log(`[WEBHOOK DEBUG] Starting background tasks for FULL_SYNC (${columns.length} columns)...`)

                    event.waitUntil(
                        Promise.all([
                            updateTenantColumnAccess(tenant_id, targetTable, columns),
                            invalidateCacheForTables(publicSupabase, tenant_id, [targetTable]).then(count => {
                                console.log(`[WEBHOOK DEBUG] Cache invalidation result: ${count} entries invalidated`)
                            }),
                            logDataPush(tenant_id, sync_id || crypto.randomUUID(), [targetTable], { [targetTable]: recordCount })
                        ]).catch(e => console.error('[WEBHOOK DEBUG] ❌ Background task error:', e))
                    )
                }
                console.log(`[WEBHOOK DEBUG] FULL_SYNC complete: ${recordCount} records processed`)
                break

            case 'MULTI_TABLE_SYNC':
                // Handle multiple tables in a single request
                // Expected format: { operation: 'MULTI_TABLE_SYNC', tenant_id, sync_id, tables: { tableName: { data: [...] }, ... } }
                console.log(`[WEBHOOK DEBUG] Processing MULTI_TABLE_SYNC for ${Object.keys(body.tables || {}).length} tables...`)
                const multiResults: Record<string, { success: boolean; count: number }> = {}
                const allAffectedTables: string[] = []
                const allRecordCounts: Record<string, number> = {}

                for (const [sourceTable, tablePayload] of Object.entries(body.tables || {})) {
                    const mappedTable = TABLE_MAPPING[sourceTable]
                    if (!mappedTable) {
                        console.log(`[WEBHOOK DEBUG] ⚠ Skipping unmapped table: ${sourceTable}`)
                        multiResults[sourceTable] = { success: false, count: 0 }
                        continue
                    }

                    const payload = tablePayload as { data: any[]; clearExisting?: boolean }
                    const records = payload.data || []

                    console.log(`[WEBHOOK DEBUG] Processing ${sourceTable} -> ${mappedTable} (${records.length} records)`)

                    // Global tables that don't have tenant_id filtering
                    const GLOBAL_TABLES_MULTI = ['tenants', 'insta_quality_levels', 'service_types']

                    try {
                        // Clear existing data if first sync or explicitly requested
                        if (payload.clearExisting !== false) {
                            // Global tables: skip clearing (they're shared across all tenants)
                            if (GLOBAL_TABLES_MULTI.includes(mappedTable)) {
                                console.log(`[WEBHOOK DEBUG] ⚠ Skipping clear for global table: ${mappedTable}`)
                            } else {
                                await supabase.from(mappedTable).delete().eq('tenant_id', tenant_id)
                            }
                        }

                        // Bulk insert
                        if (records.length > 0) {
                            // Handle tables with composite primary keys
                            const conflictColumn = mappedTable === 'device_tenants' ? 'device_id,tenant_id' : 'id'
                            const { error: bulkError } = await supabase
                                .from(mappedTable)
                                .upsert(records, { onConflict: conflictColumn })

                            if (bulkError) {
                                console.error(`[WEBHOOK DEBUG] ❌ Bulk upsert failed for ${mappedTable}:`, bulkError)
                                multiResults[sourceTable] = { success: false, count: 0 }
                                continue
                            }
                        }

                        multiResults[sourceTable] = { success: true, count: records.length }
                        allAffectedTables.push(mappedTable)
                        allRecordCounts[mappedTable] = records.length

                        // Track columns for this table
                        if (records.length > 0) {
                            const columns = Object.keys(records[0])
                            event.waitUntil(
                                updateTenantColumnAccess(tenant_id, mappedTable, columns)
                                    .catch(e => console.error(`[WEBHOOK DEBUG] Column tracking error for ${mappedTable}:`, e))
                            )
                        }
                    } catch (e: any) {
                        console.error(`[WEBHOOK DEBUG] ❌ Error processing ${mappedTable}:`, e)
                        multiResults[sourceTable] = { success: false, count: 0 }
                    }
                }

                // Cache invalidation and logging for all affected tables
                if (allAffectedTables.length > 0) {
                    event.waitUntil(
                        Promise.all([
                            invalidateCacheForTables(publicSupabase, tenant_id, allAffectedTables),
                            logDataPush(tenant_id, sync_id || crypto.randomUUID(), allAffectedTables, allRecordCounts)
                        ]).catch(e => console.error('[WEBHOOK DEBUG] ❌ Background task error:', e))
                    )
                }

                console.log(`[WEBHOOK DEBUG] MULTI_TABLE_SYNC complete:`, multiResults)
                return {
                    received: true,
                    results: multiResults,
                    duration_ms: Date.now() - startTime
                }

            case 'TEST':
                console.log('[WEBHOOK DEBUG] Test webhook received:', JSON.stringify(data, null, 2))
                break
        }

        const duration = Date.now() - startTime
        console.log(`[WEBHOOK DEBUG] ========== WEBHOOK COMPLETE (${duration}ms) ==========`)

        // Log the webhook (optional)
        try {
            await supabase.from('webhook_logs').insert({
                operation,
                table_name: table,
                target_table: targetTable,
                tenant_id,
                success: true,
                duration_ms: Date.now() - startTime,
            })
        } catch (e) {
            console.error('Failed to log webhook:', e)
        }

        return {
            received: true,
            duration_ms: Date.now() - startTime
        }
    } catch (error: any) {
        console.error('Webhook error:', error)

        // Log error if possible
        try {
            const body = JSON.parse(rawBody || '{}')
            const targetTable = TABLE_MAPPING[body.table]

            await supabase.from('webhook_logs').insert({
                operation: body.operation,
                table_name: body.table,
                target_table: targetTable,
                tenant_id: body.tenant_id,
                success: false,
                error_message: error.message,
                duration_ms: Date.now() - startTime,
            })
        } catch (e) { }

        throw createError({
            statusCode: 500,
            message: error.message
        })
    }
})
