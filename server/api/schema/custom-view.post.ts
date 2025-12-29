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
    const {connectionId, view, isUpdate} = body as {
        connectionId: number
        view: CustomView
        isUpdate?: boolean
    }

    if (!connectionId || !view) {
        throw createError({statusCode: 400, message: 'connectionId and view are required'})
    }

    if (!view.id || !view.name || !view.sql) {
        throw createError({statusCode: 400, message: 'view must have id, name, and sql'})
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

    let updatedViews: CustomView[]

    if (isUpdate) {
        // Update existing view
        const viewIndex = existingViews.findIndex(v => v.id === view.id)
        if (viewIndex === -1) {
            throw createError({statusCode: 404, message: 'Custom view not found'})
        }
        updatedViews = [...existingViews]
        updatedViews[viewIndex] = view
    } else {
        // Check for duplicate names
        if (existingViews.some(v => v.name.toLowerCase() === view.name.toLowerCase())) {
            throw createError({statusCode: 400, message: 'A custom view with this name already exists'})
        }
        updatedViews = [...existingViews, view]
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
        view,
        totalViews: updatedViews.length
    }
})
