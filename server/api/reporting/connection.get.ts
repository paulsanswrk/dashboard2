import {defineEventHandler, getQuery} from 'h3'
import {AuthHelper} from '../../utils/authHelper'
import {supabaseAdmin} from '../supabase'

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event) as any
  const connectionId = Number(id)
  if (!connectionId) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

    const connection = await AuthHelper.requireConnectionAccess(event, connectionId, {columns: '*'})

  const { data, error } = await supabaseAdmin
    .from('data_connections')
    .select('*')
    .eq('id', connectionId)
      .eq('organization_id', connection.organization_id)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})


