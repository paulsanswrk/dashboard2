import {defineEventHandler} from 'h3'
import {db} from '~/lib/db'
import {dashboards} from '~/lib/db/schema'
import {eq} from 'drizzle-orm'
import {createHash} from 'crypto'

export default defineEventHandler(async (event) => {
    const dashboardId = getRouterParam(event, 'id')
    if (!dashboardId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Dashboard ID is required'
        })
    }

    // Parse request body
    const body = await readBody(event)
    const {authToken} = body

    if (!authToken) {
        return {
            success: true,
            data: {valid: false}
        }
    }

    // Get dashboard password hash
    const dashboard = await db
        .select({
            password: dashboards.password
        })
        .from(dashboards)
        .where(eq(dashboards.id, dashboardId))
        .limit(1)
        .then(rows => rows[0])

    if (!dashboard || !dashboard.password) {
        return {
            success: true,
            data: {valid: false}
        }
    }

    // Create expected auth token from current password hash
    const expectedToken = createHash('sha256').update(dashboard.password).digest('hex')

    // Verify token matches current password hash
    const isValid = authToken === expectedToken

    return {
        success: true,
        data: {valid: isValid}
    }
})
