import {createClient} from '@supabase/supabase-js'
import {serverSupabaseUser} from '#supabase/server'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized'
        })
    }

    const body = await readBody(event)
    const {queueItemId} = body

    if (!queueItemId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing queueItemId'
        })
    }

    // Get Supabase client
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        // Get current queue item
        const {data: queueItem, error: fetchError} = await supabase
            .from('email_queue')
            .select('*')
            .eq('id', queueItemId)
            .single()

        if (fetchError || !queueItem) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Queue item not found'
            })
        }

        // Only allow cancellation for pending items
        if (queueItem.delivery_status !== 'PENDING') {
            throw createError({
                statusCode: 400,
                statusMessage: 'Only pending items can be cancelled'
            })
        }

        // Update to cancelled status
        const {error: updateError} = await supabase
            .from('email_queue')
            .update({
                delivery_status: 'CANCELLED',
                processed_at: new Date().toISOString()
            })
            .eq('id', queueItemId)

        if (updateError) {
            throw updateError
        }

        return {success: true, message: 'Queue item cancelled'}

    } catch (error: any) {
        console.error('Error cancelling queue item:', error)
        throw createError({
            statusCode: 500,
            statusMessage: error.message || 'Failed to cancel queue item'
        })
    }
})
