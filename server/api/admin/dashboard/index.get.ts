import {getAdminDashboardData} from '~/lib/db/queries/admin'

export default defineEventHandler(async (event) => {
    try {
        // Get the authorization header
        const authorization = getHeader(event, 'authorization')
        if (!authorization) {
            setResponseStatus(event, 401)
            return {
                success: false,
                error: 'Authorization header required'
            }
        }

        // Extract token from "Bearer <token>"
        const token = authorization.replace('Bearer ', '')

        // For now, we'll assume the user is authenticated via the token
        // In a production app, you'd validate the token properly
        // Since we're using Supabase, you might want to validate the JWT token

        // Get admin dashboard data using Drizzle queries
        const dashboardData = await getAdminDashboardData()

        return {
            success: true,
            data: dashboardData
        }

    } catch (error: any) {
        console.error('Get admin dashboard error:', error)

        setResponseStatus(event, 500)
        return {
            success: false,
            error: error.message || 'Internal server error'
        }
    }
})
