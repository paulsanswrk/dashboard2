import { defineEventHandler } from 'h3'
import { AuthHelper } from '../../utils/authHelper'
import { getOptiqoflowSchema } from '../../utils/optiqoflowQuery'

/**
 * GET /api/reporting/optiqoflow-schema
 * 
 * Returns the schema (tables, columns, PKs, FKs) of the optiqoflow Supabase schema
 * for use as an internal data source.
 */
export default defineEventHandler(async (event) => {
    // Require authentication
    await AuthHelper.requireAuthContext(event)

    try {
        const schema = await getOptiqoflowSchema()

        return {
            success: true,
            schema,
            dbmsVersion: 'PostgreSQL 15' // Supabase uses PostgreSQL 15
        }
    } catch (error: any) {
        console.error('[optiqoflow-schema] Error:', error?.message || error)
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to load optiqoflow schema: ${error?.message || 'Unknown error'}`
        })
    }
})
