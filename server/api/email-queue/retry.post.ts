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

        // Only allow retry for failed items with less than 3 attempts
        if (queueItem.delivery_status !== 'FAILED' || queueItem.attempt_count >= 3) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Queue item cannot be retried'
            })
        }

        // Reset to pending status
        const {error: updateError} = await supabase
            .from('email_queue')
            .update({
                delivery_status: 'PENDING',
                error_message: null,
                processed_at: null
            })
            .eq('id', queueItemId)

        if (updateError) {
            throw updateError
        }

        return {success: true, message: 'Queue item reset for retry'}

    } catch (error: any) {
        console.error('Error retrying queue item:', error)
        throw createError({
            statusCode: 500,
            statusMessage: error.message || 'Failed to retry queue item'
        })
    }
})
