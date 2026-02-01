import { defineEventHandler, readBody } from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { supabaseAdmin } from '../supabase'
import { uploadChartThumbnail } from '../../utils/chartThumbnails'
import { AuthHelper } from '../../utils/authHelper'
import {
  upsertChartDependencies,
  updateChartCacheStatus,
  extractTablesFromStateJson,
  hasRelativeDateFilters
} from '../../utils/chart-cache'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const ownerEmail = user.email || 'unknown'

  const authCtx = await AuthHelper.requireAuthContext(event)
  const organizationName = await (async () => {
    if (!authCtx.organizationId) return null
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', authCtx.organizationId)
      .single()
    if (error || !data) return null
    return data.name as string
  })()
  const body = await readBody(event)
  const { name, description, state, width, height, thumbnailBase64 } = body || {}
  if (!name || !state) {
    throw createError({ statusCode: 400, statusMessage: 'Missing name or state' })
  }
  const ownerId = undefined // optional; set below if we have a user
  function toStoredState(input: any) {
    if (!input || typeof input !== 'object') return input
    const publicKeys = new Set(['appearance', 'chartType'])
    const publicPart: any = {}
    const internalPart: any = {}
    for (const [k, v] of Object.entries(input)) {
      if (publicKeys.has(k)) publicPart[k] = v
      else internalPart[k] = v
    }
    return { ...publicPart, internal: internalPart }
  }

  const payload: any = {
    name,
    description: description || '',
    owner_email: ownerEmail,
    state_json: toStoredState(state)
  }

  const normalizedWidth = Number.isFinite(Number(width)) ? Math.round(Number(width)) : null
  const normalizedHeight = Number.isFinite(Number(height)) ? Math.round(Number(height)) : null
  if (normalizedWidth !== null) payload.width = normalizedWidth
  if (normalizedHeight !== null) payload.height = normalizedHeight

  // Extract data_connection_id from state and store in dedicated column
  if (state.dataConnectionId != null) {
    payload.data_connection_id = state.dataConnectionId
  }

  // Set owner_id from session when available
  if (user?.id) payload.owner_id = user.id

  if (thumbnailBase64) {
    try {
      const thumbnailUrl = await uploadChartThumbnail(thumbnailBase64, organizationName, name)
      if (thumbnailUrl) payload.thumbnail_url = thumbnailUrl
    } catch (error: any) {
      throw createError({ statusCode: 500, statusMessage: error?.message || 'Thumbnail upload failed' })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('charts')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Background task: Update chart dependencies and cache status
  event.waitUntil(
    (async () => {
      try {
        // Extract tables from state
        const tables = extractTablesFromStateJson(state)

        // Update dependencies
        await upsertChartDependencies(
          supabaseAdmin,
          data.id,
          tables.map(t => ({ name: t }))
        )

        // Check for dynamic filters and update cache status
        const hasDynamic = hasRelativeDateFilters(state)
        const newStatus = hasDynamic ? 'dynamic' : 'unknown'

        await updateChartCacheStatus(
          supabaseAdmin,
          data.id,
          newStatus,
          hasDynamic
        )
      } catch (e) {
        console.error('Background chart cache update failed:', e)
      }
    })()
  )

  return { success: true, chartId: data.id }
})
