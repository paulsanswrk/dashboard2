import {defineEventHandler} from 'h3'
import {supabaseAdmin} from '../supabase'
import {AuthHelper} from '../../utils/authHelper'

export default defineEventHandler(async (event) => {
    const ctx = await AuthHelper.requireAuthContext(event)

    let query = supabaseAdmin
    .from('data_connections')
        .select('id, internal_name, database_name, database_type, host, port, organization_id')
    .order('updated_at', { ascending: false })

    if (ctx.role !== 'SUPERADMIN') {
        query = query.eq('organization_id', ctx.organizationId)
    }

    const {data, error} = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})


