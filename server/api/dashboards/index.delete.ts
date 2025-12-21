import {defineEventHandler, getQuery} from 'h3'
// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {supabaseAdmin} from '../supabase'
import {checkDashboardPermission} from '../../utils/permissions'
import {db} from '../../../lib/db'
import {dashboards, profiles} from '../../../lib/db/schema'
import {eq} from 'drizzle-orm'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const { id } = getQuery(event)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })

    // Check if user has permission to access this dashboard
    const hasPermission = await checkDashboardPermission(id, user.id)
    if (!hasPermission) {
        throw createError({statusCode: 403, statusMessage: 'Access denied to dashboard'})
    }

    // Only dashboard creator or admins can delete dashboards
    const dashboard = await db
        .select({
            creator: dashboards.creator,
            organizationId: dashboards.organizationId
        })
        .from(dashboards)
        .where(eq(dashboards.id, id))
        .limit(1)
        .then(rows => rows[0])

    if (!dashboard) {
    throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })
  }

    // Check if user is creator or admin in the organization
    const profile = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1)
        .then(rows => rows[0])

    const canDelete = dashboard.creator === user.id ||
        (profile && (profile.role === 'SUPERADMIN' || (profile.role === 'ADMIN' && profile.organizationId === dashboard.organizationId)))

    if (!canDelete) {
        throw createError({statusCode: 403, statusMessage: 'Only dashboard creator or admins can delete dashboards'})
    }

  const { error } = await supabaseAdmin
    .from('dashboards')
    .delete()
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})


