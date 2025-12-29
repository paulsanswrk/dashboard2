import { defineEventHandler, readBody } from 'h3'
import { supabaseAdmin } from '../supabase'
import { AuthHelper } from '../../utils/authHelper'
// @ts-ignore createError is provided by h3 runtime
declare const createError: any

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { connectionId } = body || {}

    if (!connectionId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing connectionId' })
    }

    // Require org-aligned access to the data connection
    await AuthHelper.requireConnectionAccess(event, Number(connectionId))

    // Fetch saved schema from data_connections
    const { data: connData, error: connError } = await supabaseAdmin
        .from('data_connections')
        .select('schema_json')
        .eq('id', Number(connectionId))
        .single()

    if (connError || !connData) {
        throw createError({ statusCode: 404, statusMessage: 'Connection not found' })
    }

    const schemaJson = connData.schema_json as { tables?: any[] } | null
    const tables = schemaJson?.tables || []

    // Build response: list of tables with their columns
    const result: {
        tables: Array<{ id: string; name: string }>
        columnsByTable: Record<string, Array<{ fieldId: string; name: string; type: string }>>
    } = {
        tables: [],
        columnsByTable: {}
    }

    for (const table of tables) {
        const tableId = table.tableId || table.name
        const tableName = table.name || table.tableId

        result.tables.push({
            id: tableId,
            name: tableName
        })

        result.columnsByTable[tableId] = (table.columns || []).map((col: any) => ({
            fieldId: col.fieldId || col.name,
            name: col.name || col.fieldId,
            type: col.type || 'varchar'
        }))
    }

    return result
})
