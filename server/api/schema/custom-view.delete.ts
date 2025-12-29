import {createError, defineEventHandler, readBody} from 'h3'
import {AuthHelper} from '../../utils/authHelper'
import {db} from '~/lib/db'
import {dataConnections} from '~/lib/db/schema'
import {eq} from 'drizzle-orm'

interface CustomView {
    id: string
    name: string
    sql: string
    columns: { name: string; type: string }[]
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const {connectionId, viewId} = body as {
        connectionId: number
        viewId: string
    }

    if (!connectionId || !viewId) {
        throw createError({statusCode: 400, message: 'connectionId and viewId are required'})
    }

    // Verify access to connection
    await AuthHelper.requireConnectionAccess(event, connectionId)

    // Get the connection
    const [connection] = await db
        .select()
        .from(dataConnections)
        .where(eq(dataConnections.id, connectionId))
        .limit(1)

    if (!connection) {
        throw createError({statusCode: 404, message: 'Connection not found'})
    }

    // Get existing custom views
    const existingViews: CustomView[] = (connection.customViews as CustomView[]) || []

    // Filter out the view to delete
    const updatedViews = existingViews.filter(v => v.id !== viewId)

    if (updatedViews.length === existingViews.length) {
        throw createError({statusCode: 404, message: 'Custom view not found'})
    }

    // Save to database
    await db
        .update(dataConnections)
        .set({
            customViews: updatedViews,
            updatedAt: new Date()
        })
        .where(eq(dataConnections.id, connectionId))

    return {
        success: true,
        deletedViewId: viewId,
        remainingViews: updatedViews.length
    }
})
