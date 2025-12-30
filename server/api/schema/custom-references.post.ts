import {createError, defineEventHandler, readBody} from 'h3'
import {AuthHelper} from '../../utils/authHelper'
import {db} from '~/lib/db'
import {dataConnections} from '~/lib/db/schema'
import {eq} from 'drizzle-orm'
import {buildGraph} from '../../utils/schemaGraph'


interface CustomReference {
    id: string
    sourceTable: string
    sourceColumn: string
    targetTable: string
    targetColumn: string
    isCustom: boolean
}

// Save custom references and recompute auto_join_info
export default defineEventHandler(async (event) => {
    const body = await readBody<{ connectionId: number; customReferences: CustomReference[] }>(event)
    const {connectionId, customReferences} = body

    if (!connectionId) {
        throw createError({statusCode: 400, statusMessage: 'Missing connectionId'})
    }

    await AuthHelper.requireConnectionAccess(event, connectionId, {
        requireWrite: true
    })

    // Get the connection
    const [connection] = await db
        .select()
        .from(dataConnections)
        .where(eq(dataConnections.id, connectionId))
        .limit(1)

    if (!connection) {
        throw createError({statusCode: 404, statusMessage: 'Connection not found'})
    }

    // Get existing schema_json and update with custom references
    const schemaJson: any = connection.schemaJson || {tables: []}
    schemaJson.customReferences = customReferences || []

    // Convert custom references to foreign key format for auto_join_info computation
    const tablesWithCustomFKs = (schemaJson.tables || []).map((table: any) => {
        const customFKsForTable = customReferences
            .filter(ref => ref.sourceTable === table.tableName)
            .map(ref => ({
                constraintName: `custom_${ref.id}`,
                sourceTable: ref.sourceTable,
                targetTable: ref.targetTable,
                columnPairs: [{
                    position: 1,
                    sourceColumn: ref.sourceColumn,
                    targetColumn: ref.targetColumn
                }],
                isCustom: true,
                cardinality: '1:N' // Default cardinality for custom references
            }))

        return {
            ...table,
            foreignKeys: [...(table.foreignKeys || []), ...customFKsForTable]
        }
    })

    // Recompute auto_join_info graph with custom references
    let autoJoinInfo: any = null
    try {
        const schemaForGraph = {schema: {tables: tablesWithCustomFKs}}
        const graph = buildGraph(schemaForGraph)

        // Only store the graph - paths are computed on-demand at query time
        autoJoinInfo = {
            graph: {
                nodes: Array.from(graph.nodes.entries()),
                adj: Array.from(graph.adj.entries())
            }
        }
        console.log(`[CUSTOM_REFERENCES] Recomputed graph with ${customReferences.length} custom references`)
    } catch (error: any) {
        console.error('[CUSTOM_REFERENCES] Failed to build graph:', error.message)
    }

    // Update the connection
    const updateData: any = {
        schemaJson: schemaJson,
        updatedAt: new Date()
    }
    if (autoJoinInfo) {
        updateData.autoJoinInfo = autoJoinInfo
    }

    await db
        .update(dataConnections)
        .set(updateData)
        .where(eq(dataConnections.id, connectionId))

    return {success: true, customReferences}
})
