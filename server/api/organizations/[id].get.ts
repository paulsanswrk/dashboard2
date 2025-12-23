// @ts-ignore Nuxt Supabase helper available at runtime
import {serverSupabaseUser} from '#supabase/server'
import {db} from '~/lib/db'
import {dashboards, organizations, profiles} from '~/lib/db/schema'
import {eq, sql} from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
      const user = await serverSupabaseUser(event)
      if (!user) {
          throw createError({statusCode: 401, statusMessage: 'Unauthorized'})
    }

      // Get user profile to check role and permissions
      const userProfile = await db
          .select()
          .from(profiles)
          .where(eq(profiles.userId, user.id))
          .limit(1)
          .then(rows => rows[0])

      if (!userProfile) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    // Get organization ID from route
    const organizationId = getRouterParam(event, 'id')
    if (!organizationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Organization ID is required'
      })
    }

      // Check if user can access this organization
      if (userProfile.role !== 'SUPERADMIN' && userProfile.organizationId !== organizationId) {
          throw createError({
              statusCode: 403,
              statusMessage: 'Access denied to this organization'
          })
      }

      // Get organization
      const organization = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, organizationId))
          .limit(1)
          .then(rows => rows[0])

      if (!organization) {
          throw createError({
              statusCode: 404,
              statusMessage: 'Organization not found'
          })
      }

      // Get counts using SQL aggregation
      const [counts] = await db
          .select({
              profileCount: sql<number>`count(distinct
              ${profiles.userId}
              )`,
              viewerCount: sql<number>`count(distinct CASE WHEN ${profiles.role} = 'VIEWER' THEN ${profiles.userId} END)`,
              dashboardCount: sql<number>`count(distinct
              ${dashboards.id}
              )`
          })
          .from(organizations)
          .leftJoin(profiles, eq(organizations.id, profiles.organizationId))
          .leftJoin(dashboards, eq(organizations.id, dashboards.organizationId))
          .where(eq(organizations.id, organizationId))
          .groupBy(organizations.id)

      // Get organization profiles (users)
      const orgProfiles = await db
          .select({
              userId: profiles.userId,
              firstName: profiles.firstName,
              lastName: profiles.lastName,
              role: profiles.role,
              createdAt: profiles.createdAt
          })
          .from(profiles)
          .where(eq(profiles.organizationId, organizationId))
          .orderBy(profiles.createdAt)

      // Get organization viewers
      const orgViewers = await db
          .select({
              userId: profiles.userId,
              firstName: profiles.firstName,
              lastName: profiles.lastName,
              viewerType: profiles.viewerType,
              groupName: profiles.groupName,
              createdAt: profiles.createdAt
          })
          .from(profiles)
          .where(eq(profiles.organizationId, organizationId))
          .where(eq(profiles.role, 'VIEWER'))
          .orderBy(profiles.createdAt)

      // Build response
    const organizationWithCounts = {
      ...organization,
        user_count: (counts?.profileCount || 0) + (counts?.viewerCount || 0),
        profile_count: counts?.profileCount || 0,
        viewer_count: counts?.viewerCount || 0,
        dashboards_count: counts?.dashboardCount || 0,
        licenses: organization.viewerCount || 0,
        status: 'active',
        profiles: orgProfiles || [],
        viewers: orgViewers || []
    }

    return {
      success: true,
      organization: organizationWithCounts
    }

  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to fetch organization'
    })
  }
})
