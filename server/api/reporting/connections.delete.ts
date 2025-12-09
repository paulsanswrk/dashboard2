import {defineEventHandler, getQuery} from 'h3'
import {supabaseAdmin} from '../supabase'
import {AuthHelper} from '../../utils/authHelper'

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event) as any
  const connectionId = Number(id)
  if (!connectionId) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

    const connection = await AuthHelper.requireConnectionAccess(event, connectionId, {
        requireWrite: true,
        columns: 'id, organization_id'
    })

  const { error } = await supabaseAdmin
    .from('data_connections')
    .delete()
    .eq('id', connectionId)
      .eq('organization_id', connection.organization_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true }
})


