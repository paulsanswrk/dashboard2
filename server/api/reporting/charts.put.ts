import { defineEventHandler, readBody } from 'h3'
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
  const { id, name, description, state, width, height, thumbnailBase64 } = body || {}
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  const updates: any = { updated_at: new Date().toISOString() }
  if (name != null) updates.name = name
  if (description != null) updates.description = description
  const normalizedWidth = Number.isFinite(Number(width)) ? Math.round(Number(width)) : null
  const normalizedHeight = Number.isFinite(Number(height)) ? Math.round(Number(height)) : null
  if (normalizedWidth !== null) updates.width = normalizedWidth
  if (normalizedHeight !== null) updates.height = normalizedHeight
  if (state != null) {
    // Extract data_connection_id from state and store in dedicated column
    if (state.dataConnectionId != null) {
      updates.data_connection_id = state.dataConnectionId
    }

    const publicKeys = new Set(['appearance', 'chartType'])
    const publicPart: any = {}
    const internalPart: any = {}
    for (const [k, v] of Object.entries(state)) {
      if (publicKeys.has(k)) publicPart[k] = v
      else internalPart[k] = v
    }
    updates.state_json = { ...publicPart, internal: internalPart }
  }
  if (thumbnailBase64) {
    try {
      const thumbnailUrl = await uploadChartThumbnail(thumbnailBase64, organizationName, name || 'chart')
      if (thumbnailUrl) updates.thumbnail_url = thumbnailUrl
    } catch (error: any) {
      throw createError({ statusCode: 500, statusMessage: error?.message || 'Thumbnail upload failed' })
    }
  }
  const { error } = await supabaseAdmin
    .from('charts')
    .update(updates)
    .eq('id', id)
    .eq('owner_email', ownerEmail)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Background task: Update chart dependencies and cache status
  if (state != null) {
    event.waitUntil(
      (async () => {
        try {
          // Extract tables from state
          const tables = extractTablesFromStateJson(state)

          // Update dependencies
          await upsertChartDependencies(
            supabaseAdmin,
            id,
            tables.map(t => ({ name: t }))
          )

          // Check for dynamic filters and update cache status
          const hasDynamic = hasRelativeDateFilters(state)
          const newStatus = hasDynamic ? 'dynamic' : 'unknown'

          await updateChartCacheStatus(
            supabaseAdmin,
            id,
            newStatus,
            hasDynamic
          )
        } catch (e) {
          console.error('Background chart cache update failed:', e)
        }
      })()
    )
  }

  return { success: true }
})
