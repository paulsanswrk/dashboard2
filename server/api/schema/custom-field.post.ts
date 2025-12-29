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
    const {connectionId, field, isUpdate} = body as {
        connectionId: number
        field: CustomField
        isUpdate?: boolean
    }

    if (!connectionId || !field) {
        throw createError({statusCode: 400, message: 'connectionId and field are required'})
    }

    if (!field.id || !field.name || !field.type) {
        throw createError({statusCode: 400, message: 'field must have id, name, and type'})
    }

    // Validate field type-specific requirements
    if (field.type === 'calculated' && !field.formula) {
        throw createError({statusCode: 400, message: 'Calculated field must have a formula'})
    }

    if (field.type === 'merged' && (!field.sourceFields || field.sourceFields.length < 2)) {
        throw createError({statusCode: 400, message: 'Merged field must have at least 2 source fields'})
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

    let updatedFields: CustomField[]

    if (isUpdate) {
        // Update existing field
        const fieldIndex = existingFields.findIndex(f => f.id === field.id)
        if (fieldIndex === -1) {
            throw createError({statusCode: 404, message: 'Custom field not found'})
        }
        updatedFields = [...existingFields]
        updatedFields[fieldIndex] = field
    } else {
        // Check for duplicate names
        if (existingFields.some(f => f.name.toLowerCase() === field.name.toLowerCase())) {
            throw createError({statusCode: 400, message: 'A custom field with this name already exists'})
        }
        updatedFields = [...existingFields, field]
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
        field,
        totalFields: updatedFields.length
    }
})
