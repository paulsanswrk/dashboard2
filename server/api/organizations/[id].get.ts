// @ts-ignore Nuxt Supabase helper available at runtime
import { serverSupabaseUser } from '#supabase/server'
import { db } from '~/lib/db'
import { dashboards, organizations, profiles } from '~/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
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
    const countsResult = await db
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

    const counts = countsResult[0]

    // Get organization profiles (users) - use raw SQL subquery for email since Drizzle
    // incorrectly quotes schema-qualified table names ("auth.users" instead of "auth"."users")
    const orgProfiles = await db
      .select({
        userId: profiles.userId,
        email: sql<string>`(SELECT email FROM auth.users WHERE id = ${profiles.userId})`,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        role: profiles.role,
        createdAt: profiles.createdAt
      })
      .from(profiles)
      .where(eq(profiles.organizationId, organizationId))
      .orderBy(profiles.createdAt)

    // Get organization viewers - use raw SQL subquery for email
    const orgViewers = await db
      .select({
        userId: profiles.userId,
        email: sql<string>`(SELECT email FROM auth.users WHERE id = ${profiles.userId})`,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        viewerType: profiles.viewerType,
        groupName: profiles.groupName,
        createdAt: profiles.createdAt
      })
      .from(profiles)
      .where(and(
        eq(profiles.organizationId, organizationId),
        eq(profiles.role, 'VIEWER')
      ))
      .orderBy(profiles.createdAt)

    // Build response with null-safe access
    const profileCount = counts?.profileCount ?? 0
    const viewerCount = counts?.viewerCount ?? 0
    const dashboardCount = counts?.dashboardCount ?? 0

    // Get tenant name if organization has a tenant_id
    let tenantName = null
    if (organization.tenantId) {
      try {
        // Query tenants table directly using pgClient (doesn't require tenant isolation)
        const { pgClient } = await import('~/lib/db')

        const tenantResult = await pgClient.unsafe(
          'SELECT name FROM optiqoflow.tenants WHERE id = $1',
          [organization.tenantId]
        ) as Array<{ name: string }>

        if (tenantResult && tenantResult.length > 0) {
          tenantName = tenantResult[0].name
        }
      } catch (error) {
        console.error('Error fetching tenant name:', error)
        // Continue without tenant name if fetch fails
      }
    }

    const organizationWithCounts = {
      ...organization,
      user_count: profileCount + viewerCount,
      profile_count: profileCount,
      viewer_count: viewerCount,
      dashboards_count: dashboardCount,
      licenses: organization.viewerCount || 0,
      status: 'active',
      profiles: orgProfiles || [],
      viewers: orgViewers || [],
      tenantName: tenantName
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
