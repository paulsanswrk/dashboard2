import { createClient } from '@supabase/supabase-js'
import { db } from '../../../lib/db'
import { sql } from 'drizzle-orm'

/**
 * POST /api/optiqoflow-sync/config
 * Create or update a sync config for a tenant
 * Only accessible by SUPERADMIN
 */
export default defineEventHandler(async (event) => {
    try {
        const supabaseUrl = process.env.SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            throw createError({
                statusCode: 500,
                statusMessage: 'Missing Supabase configuration'
            })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const authorization = getHeader(event, 'authorization')
        if (!authorization) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Authorization header required'
            })
        }

        const token = authorization.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid or expired token'
            })
        }

        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (profileError || profileData.role !== 'SUPERADMIN') {
            throw createError({
                statusCode: 403,
                statusMessage: 'Only superadmins can manage sync configuration'
            })
        }

        const body = await readBody(event)
        const {
            id,
            tenant_id,
            webhook_url,
            webhook_secret,
            tables_to_sync,
            columns_to_sync,
            is_active,
            sync_deletes
        } = body

        if (id) {
            // UPDATE existing config
            await db.execute(sql`
                UPDATE "optiqoflow-demo-source".tenant_data_sync_configs
                SET 
                    webhook_url = ${webhook_url || ''},
                    webhook_secret = ${webhook_secret || null},
                    tables_to_sync = ${sql.raw(`ARRAY[${(tables_to_sync || []).map((t: string) => `'${t}'`).join(',')}]::text[]`)},
                    columns_to_sync = ${JSON.stringify(columns_to_sync || {})}::jsonb,
                    is_active = ${is_active ?? false},
                    sync_deletes = ${sync_deletes ?? true},
                    updated_at = NOW()
                WHERE id = ${id}
            `)

            return { success: true, action: 'updated' }
        } else {
            // CREATE new config
            if (!tenant_id) {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'tenant_id is required for creating a new config'
                })
            }

            await db.execute(sql`
                INSERT INTO "optiqoflow-demo-source".tenant_data_sync_configs 
                    (tenant_id, webhook_url, webhook_secret, tables_to_sync, columns_to_sync, is_active, sync_deletes)
                VALUES (
                    ${tenant_id},
                    ${webhook_url || ''},
                    ${webhook_secret || null},
                    ${sql.raw(`ARRAY[${(tables_to_sync || []).map((t: string) => `'${t}'`).join(',')}]::text[]`)},
                    ${JSON.stringify(columns_to_sync || {})}::jsonb,
                    ${is_active ?? false},
                    ${sync_deletes ?? true}
                )
            `)

            return { success: true, action: 'created' }
        }

    } catch (error: any) {
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.message || 'Failed to save sync config'
        })
    }
})
