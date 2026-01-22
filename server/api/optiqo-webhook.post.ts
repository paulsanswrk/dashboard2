import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'crypto'

// Initialize Supabase client with optiqoflow schema
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        db: { schema: 'optiqoflow' }
    }
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

        console.log(`[Optiqo] ${operation} on ${table} -> optiqoflow.${targetTable || '(unmapped)'}`)

        if (!targetTable) {
            console.log(`Skipping unmapped table: ${table}`)
            return { received: true, skipped: true }
        }

        switch (operation) {
            case 'INSERT':
            case 'UPDATE':
                // Upsert the record
                const { error: upsertError } = await supabase
                    .from(targetTable)
                    .upsert(data, { onConflict: 'id' })

                if (upsertError) throw upsertError
                break

            case 'DELETE':
                const { error: deleteError } = await supabase
                    .from(targetTable)
                    .delete()
                    .eq('id', data.id)

                if (deleteError) throw deleteError
                break

            case 'FULL_SYNC':
                const syncStartTime = new Date()
                let recordCount = 0
                const primaryKeys: string[] = []

                // On first batch, clear existing data for this tenant
                if (batch.offset === 0) {
                    await supabase
                        .from(targetTable)
                        .delete()
                        .eq('tenant_id', tenant_id)
                }

                // Bulk insert
                if (batch.data && batch.data.length > 0) {
                    const { error: bulkError } = await supabase
                        .from(targetTable)
                        .upsert(batch.data, { onConflict: 'id' })

                    if (bulkError) throw bulkError

                    recordCount = batch.data.length
                    // Collect primary keys (max 1000 per table)
                    batch.data.slice(0, 1000).forEach((row: any) => {
                        if (row.id) primaryKeys.push(row.id)
                    })
                }

                // Log to sync_summary for chart update tracking
                if (sync_id) {
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
                    } catch (e) {
                        console.error('Failed to log sync_summary:', e)
                    }
                }
                break

            case 'TEST':
                console.log('Test webhook received:', data)
                break
        }

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
