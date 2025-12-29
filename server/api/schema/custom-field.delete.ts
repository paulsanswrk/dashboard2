import {createError, defineEventHandler, readBody} from 'h3'
import {AuthHelper} from '../../utils/authHelper'
import {db} from '~/lib/db'
import {dataConnections} from '~/lib/db/schema'
import {eq} from 'drizzle-orm'

interface CustomField {
    id: string
    name: string
    type: 'calculated' | 'merged'
    formula?: string
    sourceFields?: { tableName: string; fieldName: string }[]
    joinType?: string
    resultType?: string
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const {connectionId, fieldId} = body as {
        connectionId: number
        fieldId: string
    }

    if (!connectionId || !fieldId) {
        throw createError({statusCode: 400, message: 'connectionId and fieldId are required'})
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

    // Get existing custom fields
    const existingFields: CustomField[] = (connection.customFields as CustomField[]) || []

    // Filter out the field to delete
    const updatedFields = existingFields.filter(f => f.id !== fieldId)

    if (updatedFields.length === existingFields.length) {
        throw createError({statusCode: 404, message: 'Custom field not found'})
    }

    // Save to database
    await db
        .update(dataConnections)
        .set({
            customFields: updatedFields,
            updatedAt: new Date()
        })
        .where(eq(dataConnections.id, connectionId))

    return {
        success: true,
        deletedFieldId: fieldId,
        remainingFields: updatedFields.length
    }
})
