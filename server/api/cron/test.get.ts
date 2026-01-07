export default defineEventHandler(async (event) => {
    const startTime = Date.now()

    try {
        // Bypass authentication in local development
        if (import.meta.dev) {
            console.log('🔧 [TEST CRON] Bypassing cron authentication for local development')
        } else {
            // Only allow service role access (for Vercel cron jobs)
            const authHeader = getHeader(event, 'authorization')
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                console.error('❌ [TEST CRON] Missing or invalid authorization header')
                throw createError({
                    statusCode: 401,
                    statusMessage: 'Unauthorized'
                })
            }

            // Verify the authorization header per Vercel docs
            const expectedAuthHeader = `Bearer ${process.env.CRON_SECRET}`

            if (!process.env.CRON_SECRET || authHeader !== expectedAuthHeader) {
                console.error('❌ [TEST CRON] Invalid authorization header')
                throw createError({
                    statusCode: 401,
                    statusMessage: 'Unauthorized'
                })
            }
        }

        // Log the test message
        console.log('🔔 [TEST CRON] Test job run -', new Date().toISOString())

        const duration = Date.now() - startTime

        return {
            success: true,
            message: 'Test job executed successfully',
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`
        }

    } catch (error: any) {
        const duration = Date.now() - startTime
        console.error(`❌ [TEST CRON] Test job failed after ${duration}ms: ${error.message}`)

        throw createError({
            statusCode: 500,
            statusMessage: `Test job failed: ${error.message}`
        })
    }
})
