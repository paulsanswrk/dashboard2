import {createError, getQuery} from 'h3'
import {validateRenderContext} from '../utils/renderContext'

export default defineEventHandler((event) => {
    // Only apply to /render routes
    if (!event.node.req.url?.startsWith('/render')) {
        return
    }

    try {
        // Get context token from query parameter
        const query = getQuery(event)
        const contextToken = query.context as string | undefined

        if (!contextToken) {
            console.warn('❌ Render server middleware: Missing context parameter for route:', event.node.req.url)
            throw createError({
                statusCode: 403,
                statusMessage: 'Forbidden: Missing context token'
            })
        }

        // Validate the context token
        if (!validateRenderContext(contextToken)) {
            console.warn('❌ Render server middleware: Invalid context token for route:', event.node.req.url)
            throw createError({
                statusCode: 403,
                statusMessage: 'Forbidden: Invalid context token'
            })
        }

        // Store validated context in event context for use in API handlers
        event.context.renderContext = 'RENDER'
        console.log('✅ Render server middleware: Context validated for route:', event.node.req.url)
    } catch (error: any) {
        // Re-throw if it's already a createError
        if (error.statusCode) {
            throw error
        }
        // Otherwise, wrap in error
        console.error('❌ Render server middleware: Error validating context:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Render service error'
        })
    }
})
