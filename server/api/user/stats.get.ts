import {count, eq} from 'drizzle-orm'
import {dashboards, dataConnections, reports} from '~/lib/db/schema'
import {db} from '~/lib/db'
// @ts-ignore
import {serverSupabaseUser} from '#supabase/server'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({statusCode: 401, statusMessage: 'Unauthorized'})
    }

    // Parallelize the count queries for better performance
    const [dashboardCount, reportCount, connectionCount] = await Promise.all([
        // Count dashboards created by user
        db
            .select({count: count()})
            .from(dashboards)
            .where(eq(dashboards.creator, user.id)),

        // Count active reports owned by user
        db
            .select({count: count()})
            .from(reports)
            .where(eq(reports.userId, user.id)),

        // Count data connections owned by user
        db
            .select({count: count()})
            .from(dataConnections)
            .where(eq(dataConnections.ownerId, user.id))
    ])

    return {
        success: true,
        stats: {
            dashboards: dashboardCount[0]?.count || 0,
            reports: reportCount[0]?.count || 0,
            connections: connectionCount[0]?.count || 0
        }
    }
})
