// Core algorithm for finding join paths between tables based on foreign key relationships
// Based on the specification in docs/requirements/auto-join.md

import { parse, stringify } from 'devalue'
import {
    buildGraph,
    computePathsIndex,
    buildExitPayloads,
    selectJoinTree,
    exportNodeExitsPuml,
    type TableGraph,
    type PathsIndex,
    type ExitPayloads,
    type PathObj,
    type Edge
} from './schemaGraph'

export interface TableInfo {
    tableId: string
    tableName: string
    columns: Array<{
        fieldId: string
        name: string
        label: string
        type: string
    }>
    primaryKey: string[]
    foreignKeys: Array<{
        constraintName: string
        sourceTable: string
        targetTable: string
        columnPairs: Array<{
            position: number
            sourceColumn: string
            targetColumn: string
        }>
    }>
}

export interface JoinEdge {
    from: string
    to: string
    constraintName: string
    columnPairs: Array<{
        sourceColumn: string
        targetColumn: string
    }>
}

export interface JoinPath {
    tables: string[]
    edges: JoinEdge[]
}

export interface JoinResult {
    status: 'ok' | 'disconnected' | 'ambiguous'
    joinGraph: JoinEdge[]
    sql: string
    message: string
    details?: any
}

/**
 * Main function to find join paths between a set of tables
 */
export function findJoinPaths(tables: TableInfo[], selectedTableNames: string[]): JoinResult {
    // Handle edge cases
    if (!selectedTableNames || selectedTableNames.length === 0) {
        return {
            status: 'disconnected',
            joinGraph: [],
            sql: '',
            message: 'No tables selected'
        }
    }

    if (selectedTableNames.length === 1) {
        return {
            status: 'ok',
            joinGraph: [],
            sql: `FROM ${selectedTableNames[0]}`,
            message: `Single table: ${selectedTableNames[0]}`
        }
    }

    // Filter to only tables that exist in our schema
    const availableTables = tables.filter(t => selectedTableNames.includes(t.tableName))
    const missingTables = selectedTableNames.filter(name =>
        !tables.some(t => t.tableName === name)
    )

    if (missingTables.length > 0) {
        return {
            status: 'disconnected',
            joinGraph: [],
            sql: '',
            message: `Tables not found in schema: ${missingTables.join(', ')}`,
            details: { missingTables }
        }
    }

    // Build the sophisticated graph using schemaGraph.ts
    const schemaJson = { schema: { tables } }
    const graph = buildGraph(schemaJson)
    const pathsIndex = computePathsIndex(graph)

    // Use the selectJoinTree function to find optimal join tree
    const joinTreeResult = selectJoinTree(selectedTableNames, graph, pathsIndex)

    if (joinTreeResult.nodes.length === 0) {
        return {
            status: 'disconnected',
            joinGraph: [],
            sql: '',
            message: `Cannot join tables: ${selectedTableNames.join(', ')}`,
            details: { missingTables: selectedTableNames }
        }
    }

    // Convert the join tree edges to JoinEdge format
    const joinGraph = joinTreeResult.edgeIds.map(edgeId => {
        // Find the edge in the adjacency list
        let foundEdge: Edge | undefined
        for (const edges of graph.adj.values()) {
            foundEdge = edges.find(e => e.id === edgeId)
            if (foundEdge) break
        }
        if (!foundEdge) throw new Error(`Edge not found: ${edgeId}`)

        return {
            from: foundEdge.from,
            to: foundEdge.to,
            constraintName: foundEdge.payload.constraintName,
            columnPairs: foundEdge.payload.columnPairs.map(cp => ({
                sourceColumn: cp.sourceColumn,
                targetColumn: cp.targetColumn
            }))
        }
    })

    // Generate the SQL
    const sql = generateJoinSQL(selectedTableNames, joinGraph)

    return {
        status: 'ok',
        joinGraph,
        sql,
        message: `Found join path for ${selectedTableNames.length} tables`
    }
}


/**
 * Generate SQL from join graph using comprehensive path-based algorithm (backup)
 */
function generateJoinSQL_comprehensive(selectedTables: string[], joinGraph: JoinEdge[]): string {
    console.log(`[SQL_GEN] Starting comprehensive SQL generation for tables: ${selectedTables.join(', ')}`)

    if (joinGraph.length === 0) {
        console.log(`[SQL_GEN] No join graph provided, returning empty result`)
        return ''
    }

    // Step 1: Get all involved tables (selected + intermediate)
    const allInvolvedTables = [...new Set(joinGraph.flatMap(edge => [edge.from, edge.to]))]
    console.log(`[SQL_GEN] Step 1 - All involved tables: [${allInvolvedTables.join(', ')}]`)

    if (allInvolvedTables.length === 0) {
        console.log(`[SQL_GEN] No involved tables found, returning empty result`)
        return ''
    }

    // Step 2: Start from a random table of the involved ones
    const startTable = allInvolvedTables[Math.floor(Math.random() * allInvolvedTables.length)]
    console.log(`[SQL_GEN] Step 2 - Starting from random table: ${startTable}`)

    // Step 3: Get paths from start table to all other involved tables
    const pathsToAllTables = getPathsToAllInvolvedTables(startTable, allInvolvedTables, joinGraph)
    console.log(`[SQL_GEN] Step 3 - Found ${pathsToAllTables.length} paths to other tables`)
    pathsToAllTables.forEach(({ target, path }) => {
        console.log(`[SQL_GEN]   Path to ${target}: ${path.map(e => `${e.from}->${e.to}`).join(' -> ')}`)
    })

    // Step 4: Collect all FKs from all paths
    const allFKs = collectFKsFromPaths(pathsToAllTables)
    console.log(`[SQL_GEN] Step 4 - Collected ${allFKs.length} FKs from all paths`)
    allFKs.forEach(fk => {
        console.log(`[SQL_GEN]   FK: ${fk.from}.${fk.columnPairs[0]?.sourceColumn} -> ${fk.to}.${fk.columnPairs[0]?.targetColumn} (${fk.constraintName})`)
    })

    // Step 5: Remove duplicates and build joins
    const uniqueFKs = distinctFKs(allFKs)
    console.log(`[SQL_GEN] Step 5 - After deduplication: ${uniqueFKs.length} unique FKs`)
    uniqueFKs.forEach(fk => {
        console.log(`[SQL_GEN]   Unique FK: ${fk.constraintName}`)
    })

    // Step 6: Build the JOIN SQL
    const sqlResult = buildJoinsFromFKs(startTable, uniqueFKs)
    console.log(`[SQL_GEN] Step 6 - Generated SQL:`)
    console.log(`[SQL_GEN] ${sqlResult}`)

    return sqlResult
}

/**
 * Generate SQL from join graph using simple approach
 */
function generateJoinSQL(selectedTables: string[], joinGraph: JoinEdge[]): string {
    console.log(`[SQL_GEN] Starting simple SQL generation for tables: ${selectedTables.join(', ')}`)

    if (joinGraph.length === 0) {
        console.log(`[SQL_GEN] No join graph provided, returning empty result`)
        return ''
    }

    // Find a starting table (one with no incoming edges in our selection)
    const targetTables = new Set(joinGraph.map(edge => edge.to))
    const startTable = selectedTables.find(table => !targetTables.has(table)) || selectedTables[0]
    console.log(`[SQL_GEN] Using start table: ${startTable}`)

    const sqlParts: string[] = [`FROM ${startTable}`]
    console.log(`[SQL_GEN] Building joins for ${joinGraph.length} join graph edges`)

    // Simple approach: loop through joinGraph items and build joins
    for (const edge of joinGraph) {
        // if (edge.from === startTable || selectedTables.includes(edge.from)) {
        const joinClause = `JOIN ${edge.to} ON ${edge.from}.${edge.columnPairs[0]?.sourceColumn || 'id'} = ${edge.to}.${edge.columnPairs[0]?.targetColumn || 'id'}`
        console.log(`[SQL_GEN] Adding join: ${joinClause}`)
        sqlParts.push(joinClause)
        // }
    }

    const finalSQL = sqlParts.join('\n')
    console.log(`[SQL_GEN] Generated SQL with ${sqlParts.length} parts:`)
    console.log(`[SQL_GEN] ${finalSQL}`)

    return finalSQL
}

/**
 * Generate SQL from join graph using simple approach (backup)
 */
function generateJoinSQL_old(selectedTables: string[], joinGraph: JoinEdge[]): string {
    console.log(`[SQL_GEN] Starting old SQL generation for tables: ${selectedTables.join(', ')}`)

    if (joinGraph.length === 0) {
        console.log(`[SQL_GEN] No join graph provided, returning empty result`)
        return ''
    }

    // Find a starting table (one with no incoming edges in our selection)
    const targetTables = new Set(joinGraph.map(edge => edge.to))
    const startTable = selectedTables.find(table => !targetTables.has(table)) || selectedTables[0]
    console.log(`[SQL_GEN] Using start table: ${startTable}`)

    const sqlParts: string[] = [`FROM ${startTable}`]
    console.log(`[SQL_GEN] Building joins for ${joinGraph.length} join graph edges`)

    // Simple approach: loop through joinGraph items and build joins
    for (const edge of joinGraph) {
        if (edge.from === startTable || selectedTables.includes(edge.from)) {
            const joinClause = `JOIN ${edge.to} ON ${edge.from}.${edge.columnPairs[0]?.sourceColumn || 'id'} = ${edge.to}.${edge.columnPairs[0]?.targetColumn || 'id'}`
            console.log(`[SQL_GEN] Adding join: ${joinClause}`)
            sqlParts.push(joinClause)
        }
    }

    const finalSQL = sqlParts.join('\n')
    console.log(`[SQL_GEN] Generated SQL with ${sqlParts.length} parts:`)
    console.log(`[SQL_GEN] ${finalSQL}`)

    return finalSQL
}

