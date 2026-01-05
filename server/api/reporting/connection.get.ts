import { defineEventHandler, getQuery } from 'h3'
import { AuthHelper } from '../../utils/authHelper'
import { supabaseAdmin } from '../supabase'

// Mask value used to indicate a credential exists but hide actual value
const MASKED_VALUE = '********'

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event) as any
  const connectionId = Number(id)
  if (!connectionId) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

  const connection = await AuthHelper.requireConnectionAccess(event, connectionId, { columns: '*' })

  const { data, error } = await supabaseAdmin
    .from('data_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('organization_id', connection.organization_id)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Mask sensitive credentials before returning
  if (data) {
    if (data.password) data.password = MASKED_VALUE
    if (data.ssh_password) data.ssh_password = MASKED_VALUE
    if (data.ssh_private_key) data.ssh_private_key = MASKED_VALUE
  }

  return data
})
