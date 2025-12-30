import {defineEventHandler, readBody} from 'h3'
import {computePathsForTables, type Edge, selectJoinTree, type TableGraph} from '../../utils/schemaGraph'
import {AuthHelper} from '../../utils/authHelper'


/**
 * Get suggested joins for a set of tables using the pre-computed auto_join_info graph.
 * This is similar to what the preview API uses internally, but exposed as a separate endpoint
 * for the Edit Join Path modal.
 */
export default defineEventHandler(async (event) => {
    const {connectionId, tableNames} = await readBody(event) as {
        connectionId: number
        tableNames: string[]
    }

    console.log(`[GET_JOINS] Request for connection ${connectionId} with tables:`, tableNames)

    if (!connectionId || !Array.isArray(tableNames) || tableNames.length < 2) {
        return {
            status: 'error',
            joins: [],
            message: 'At least 2 tables are required'
        }
    }

    // Require org-aligned access to the data connection
    const connection = await AuthHelper.requireConnectionAccess(event, connectionId, {
        columns: 'id, organization_id, auto_join_info'
    })

    const aji = (connection as any)?.auto_join_info
    if (!aji?.graph?.nodes || !aji?.graph?.adj) {
        console.error(`[GET_JOINS] Missing auto_join_info for connection ${connectionId}`)
        return {
            status: 'error',
            joins: [],
            message: 'No schema graph available. Please refresh the connection schema.'
        }
    }

    try {
        // Reconstruct TableGraph from stored entries
        const graph: TableGraph = {
            nodes: new Map<string, any>(aji.graph.nodes as [string, any][]),
            adj: new Map<string, Edge[]>(aji.graph.adj as [string, Edge[]][])
        }

        // Compute paths only for the requested tables (O(K²) where K = tables requested)
        const pathsIndex = computePathsForTables(graph, tableNames)

        // Select join tree for requested tables
        const joinTree = selectJoinTree(tableNames, graph, pathsIndex)
        console.log(`[GET_JOINS] Join tree: nodes=${joinTree.nodes.length}, edges=${joinTree.edgeIds.length}`)


        if (joinTree.edgeIds.length === 0) {
            return {
                status: 'disconnected',
                joins: [],
                message: 'No join path found between the selected tables'
            }
        }

        // Build quick edge lookup
        const edgeById = new Map<string, Edge>()
        for (const [, edges] of graph.adj) {
            for (const e of edges) edgeById.set(e.id, e)
        }

        // Resolve edge objects and convert to JoinRef format
        const joins = []
        const baseTable = tableNames[0]
        const includedTables = new Set<string>([baseTable])
        const pendingEdges = new Set(joinTree.edgeIds)
        let madeProgress = true

        // Process edges in dependency order (from base table outward)
        while (pendingEdges.size && madeProgress) {
            madeProgress = false
            for (const edgeId of Array.from(pendingEdges)) {
                const edge = edgeById.get(edgeId)
                if (!edge) {
                    pendingEdges.delete(edgeId)
                    continue
                }

                let sourceTable = edge.from
                let targetTable = edge.to
                let columnPairs = edge.payload.columnPairs || []

                // If target is already included but source isn't, swap direction
                if (includedTables.has(targetTable) && !includedTables.has(sourceTable)) {
                    [sourceTable, targetTable] = [targetTable, sourceTable]
                    columnPairs = columnPairs.map((p: any) => ({
                        position: p.position,
                        sourceColumn: p.targetColumn,
                        targetColumn: p.sourceColumn
                    }))
                }

                // Skip if target already included
                if (includedTables.has(targetTable)) {
                    pendingEdges.delete(edgeId)
                    continue
                }

                // Only add if source is included
                if (includedTables.has(sourceTable)) {
                    joins.push({
                        constraintName: edge.payload.constraintName || edge.id,
                        sourceTable,
                        targetTable,
                        joinType: 'inner',
                        columnPairs: columnPairs.map((p: any) => ({
                            position: p.position || 1,
                            sourceColumn: p.sourceColumn,
                            targetColumn: p.targetColumn
                        })),
                        sourceCardinality: edge.payload.sourceCardinality || 'one',
                        targetCardinality: edge.payload.targetCardinality || 'many'
                    })
                    includedTables.add(targetTable)
                    pendingEdges.delete(edgeId)
                    madeProgress = true
                    console.log(`[GET_JOINS] Added join: ${sourceTable} -> ${targetTable}`)
                }
            }
        }

        console.log(`[GET_JOINS] Returning ${joins.length} joins for connection ${connectionId}`)
        return {
            status: 'ok',
            joins,
            message: `Found ${joins.length} join(s) connecting ${tableNames.length} tables`
        }
    } catch (error) {
        console.error(`[GET_JOINS] Failed to compute joins:`, error)
        return {
            status: 'error',
            joins: [],
            message: 'Failed to compute join paths'
        }
    }
})
