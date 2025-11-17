import {createError, getHeader} from 'h3'

export default defineEventHandler((event) => {
    // Only apply to /render routes
    if (!event.node.req.url?.startsWith('/render')) {
        return
    }

    // Get the render secret token from environment (server middleware always runs server-side)
    const expectedToken = process.env.RENDER_SECRET_TOKEN

    if (!expectedToken) {
        console.error('❌ Render server middleware: RENDER_SECRET_TOKEN not configured')
        throw createError({
            statusCode: 500,
            statusMessage: 'Render service not configured'
        })
    }

    // Get token from headers
    const token = getHeader(event, 'render_secret_token') || getHeader(event, 'Render-Secret-Token')

    if (!token) {
        console.warn('❌ Render server middleware: Missing render_secret_token header for route:', event.node.req.url)
        throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden: Missing render token'
        })
    }

    if (token !== expectedToken) {
        console.warn('❌ Render server middleware: Invalid render_secret_token for route:', event.node.req.url)
        throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden: Invalid render token'
        })
    }

    console.log('✅ Render server middleware: Token validated for route:', event.node.req.url)
})
