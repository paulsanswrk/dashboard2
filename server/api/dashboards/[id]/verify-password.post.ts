import {defineEventHandler} from 'h3'
import {db} from '~/lib/db'
import {dashboards} from '~/lib/db/schema'
import {eq} from 'drizzle-orm'
import {verifyPassword} from '~/server/utils/password'
import {createHash} from 'crypto'
import {requireRecaptcha} from '../../../utils/recaptchaUtils'

export default defineEventHandler(async (event) => {
    const dashboardId = getRouterParam(event, 'id')
    if (!dashboardId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Dashboard ID is required'
        })
    }

    // Get dashboard to check password
    const dashboard = await db
        .select({
            id: dashboards.id,
            isPublic: dashboards.isPublic,
            password: dashboards.password
        })
        .from(dashboards)
        .where(eq(dashboards.id, dashboardId))
        .limit(1)
        .then(rows => rows[0])

    if (!dashboard) {
        throw createError({statusCode: 404, statusMessage: 'Dashboard not found'})
    }

    if (!dashboard.isPublic) {
        throw createError({statusCode: 403, statusMessage: 'Dashboard is not public'})
    }

    if (!dashboard.password) {
        throw createError({statusCode: 400, statusMessage: 'Dashboard is not password protected'})
    }

    // Parse request body
    const body = await readBody(event)
    const {password, recaptchaToken} = body

    if (!password) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Password is required'
        })
    }

    // Verify reCAPTCHA if token provided
    if (recaptchaToken) {
        await requireRecaptcha(recaptchaToken, 'dashboard_access')
    }

    // Verify password
    const isValid = await verifyPassword(password, dashboard.password)

    if (isValid) {
        // Create auth token (hash of the dashboard password)
        const authToken = createHash('sha256').update(dashboard.password).digest('hex')
        return {
            success: true,
            authToken
        }
    }

    return {
        success: false
    }
})
