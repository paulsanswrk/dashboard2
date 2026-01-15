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

// Table mapping from Optiqo tables to your optiqoflow schema tables
// Note: Table names are simpler since they're in the optiqoflow schema
const TABLE_MAPPING: Record<string, string> = {
    // Operations
    'adhoc_work_orders': 'work_orders',
    'attendance_events': 'attendance_events',
    'checklist_completions': 'checklist_completions',
    'issue_reports': 'issue_reports',
    // Scheduling
    'schedules': 'schedules',
    'schedule_assignments': 'schedule_assignments',
    'staff_availability': 'staff_availability',
    // Devices
    'devices': 'devices',
    'device_measurements': 'device_measurements',
    'device_measurements_daily': 'device_measurements_daily',
    // Locations
    'sites': 'sites',
    'rooms': 'rooms',
    'zone_categories': 'zones',
    // Feedback
    'room_feedback': 'room_feedback',
    // Quality
    'quality_inspections': 'quality_inspections',
    'inspection_rooms': 'inspection_rooms',
    // Healthcare
    'healthcare_metrics': 'healthcare_metrics',
    // Users
    'profiles': 'profiles',
    'teams': 'teams',
    'team_members': 'team_members',
    // Customers & Contracts
    'customers': 'customers',
    'contracts': 'contracts',
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

        const { operation, table, tenant_id, data, old_data, batch } = body
        const targetTable = TABLE_MAPPING[table]

        console.log(`[Optiqo] ${operation} on ${table} -> optiqoflow.${targetTable}`)

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
                // On first batch, clear existing data for this tenant
                if (batch.offset === 0) {
                    await supabase
                        .from(targetTable)
                        .delete()
                        .eq('tenant_id', tenant_id)
                }

                // Bulk insert
                if (batch.data.length > 0) {
                    const { error: bulkError } = await supabase
                        .from(targetTable)
                        .upsert(batch.data, { onConflict: 'id' })

                    if (bulkError) throw bulkError
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
            const rawBody = await readRawBody(event)
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
