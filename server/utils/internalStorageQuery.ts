/**
 * Internal Storage Query Utility
 * 
 * Executes queries against PostgreSQL internal storage schemas
 * when a connection has storage_location = 'internal'.
 */

import { pgClient } from '../../lib/db'
import { supabaseAdmin } from '../api/supabase'
import { eq } from 'drizzle-orm'
import { db } from '../../lib/db'
import { dataConnections, datasourceSync } from '../../lib/db/schema'

/**
 * Information about a connection's internal storage configuration
 */
export interface InternalStorageInfo {
    useInternalStorage: boolean
    schemaName: string | null
    syncStatus: string | null
}

/**
 * Load internal storage info for a connection with storage_location = 'supabase_synced'
 * 
 * @param connectionId - The data connection ID
 * @returns InternalStorageInfo with schema name if internal storage is configured and synced
 */
export async function loadInternalStorageInfo(connectionId: number): Promise<InternalStorageInfo> {
    // Get connection's storage_location and database_type
    const connection = await db.query.dataConnections.findFirst({
        where: eq(dataConnections.id, connectionId),
        columns: {
            id: true,
            storageLocation: true,
            databaseType: true,
        },
    })

    // Check if this uses internal storage via database_type='internal' or storage_location='supabase_synced'
    const usesInternalStorage = connection?.databaseType === 'internal' || connection?.storageLocation === 'supabase_synced'

    if (!connection || !usesInternalStorage) {
        return { useInternalStorage: false, schemaName: null, syncStatus: null }
    }

    // For database_type='internal', use Optiqo Flow schema (or appropriate schema)
    // For storage_location='supabase_synced', look up the sync record
    if (connection.databaseType === 'internal') {
        // Internal data sources use a specific schema - check for sync record
        const sync = await db.query.datasourceSync.findFirst({
            where: eq(datasourceSync.connectionId, connectionId),
            columns: {
                targetSchemaName: true,
                syncStatus: true,
            },
        })

        if (!sync?.targetSchemaName) {
            console.warn(`[InternalStorage] Connection ${connectionId} has database_type='internal' but no sync record`)
            return { useInternalStorage: true, schemaName: null, syncStatus: sync?.syncStatus ?? null }
        }

        return {
            useInternalStorage: true,
            schemaName: sync.targetSchemaName,
            syncStatus: sync.syncStatus,
        }
    }

    // Get sync info with target schema name for supabase_synced connections
    const sync = await db.query.datasourceSync.findFirst({
        where: eq(datasourceSync.connectionId, connectionId),
        columns: {
            targetSchemaName: true,
            syncStatus: true,
        },
    })

    if (!sync?.targetSchemaName) {
        console.warn(`[InternalStorage] Connection ${connectionId} has storage_location='supabase_synced' but no sync record`)
        return { useInternalStorage: true, schemaName: null, syncStatus: sync?.syncStatus ?? null }
    }

    return {
        useInternalStorage: true,
        schemaName: sync.targetSchemaName,
        syncStatus: sync.syncStatus,
    }
}

/**
 * Wrap an identifier for PostgreSQL (using double quotes)
 */
export function wrapIdPg(identifier: string): string {
    // Escape any double quotes in the identifier
    return `"${identifier.replace(/"/g, '""')}"`
}

/**
 * Convert MySQL-style backtick identifiers to PostgreSQL double quotes
 * This is a simple regex-based approach that handles most cases
 */
export function translateIdentifiers(sql: string): string {
    // Replace backtick-quoted identifiers with double-quoted
    return sql.replace(/`([^`]+)`/g, '"$1"')
}

/**
 * Prefix table names in SQL with the schema name
 * This handles both FROM and JOIN clauses
 * 
 * @param sql - The SQL query
 * @param schemaName - The PostgreSQL schema name
 * @param tableNames - List of table names to prefix (from the schema)
 */
export function prefixTablesWithSchema(sql: string, schemaName: string, tableNames: string[]): string {
    let result = sql
    const schemaPrefix = wrapIdPg(schemaName)

    for (const table of tableNames) {
        // Match table name that's quoted with double quotes
        // Handles: FROM "tablename", JOIN "tablename", etc.
        const quotedPattern = new RegExp(`(?<![."])("${table}")(?!["])`, 'gi')
        result = result.replace(quotedPattern, `${schemaPrefix}.$1`)

        // Match table name that's unquoted (bare word after FROM/JOIN/INTO)
        // Handles: FROM tablename, JOIN tablename, etc.
        const barePattern = new RegExp(`(FROM|JOIN|INTO|UPDATE)\\s+(${table})(?=\\s|$|,)`, 'gi')
        result = result.replace(barePattern, `$1 ${schemaPrefix}.${wrapIdPg(table)}`)
    }

    return result
}

/**
 * Execute a query against internal PostgreSQL storage
 * 
 * @param schemaName - The PostgreSQL schema containing the data
 * @param sql - The SQL query (can have MySQL-style backtick identifiers)
 * @param params - Query parameters (optional)
 * @returns Array of result rows
 */
export async function executeInternalStorageQuery(
    schemaName: string,
    sql: string,
    params: any[] = []
): Promise<any[]> {
    // Translate MySQL backticks to PostgreSQL double quotes
    let pgSql = translateIdentifiers(sql)

    // Convert ? placeholders to numbered placeholders ($1, $2, etc.)
    let paramIndex = 0
    const numberedSql = pgSql.replace(/\?/g, () => `$${++paramIndex}`)

    console.log(`[InternalStorage] Executing query in schema ${schemaName}`)
    console.log(`[InternalStorage] Original SQL: ${sql.substring(0, 200)}...`)
    console.log(`[InternalStorage] Translated SQL: ${numberedSql.substring(0, 200)}...`)

    try {
        // Use a transaction to ensure search_path and query run on the same connection
        // This is critical for connection pooling - without a transaction, 
        // SET search_path and the query could run on different connections
        const result = await pgClient.begin(async (tx) => {
            // Set search_path to include the schema (on THIS connection within the transaction)
            await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`)

            // Execute the query on the same connection
            const rows = await tx.unsafe(numberedSql, params)

            return rows as any[]
        })

        return result
    } catch (error: any) {
        console.error(`[InternalStorage] Query error:`, error?.message || error)
        throw error
    }
}

/**
 * Execute a simple SELECT query on internal storage
 * Convenience function for table preview and distinct values
 * 
 * @param schemaName - The PostgreSQL schema
 * @param tableName - The table to query
 * @param columns - Columns to select (default: *)
 * @param limit - Row limit
 */
export async function queryInternalTable(
    schemaName: string,
    tableName: string,
    columns: string = '*',
    limit: number = 100
): Promise<{ rows: any[], columns: Array<{ key: string, label: string }> }> {
    const safeTable = wrapIdPg(tableName)
    const safeSchema = wrapIdPg(schemaName)

    const sql = `SELECT ${columns} FROM ${safeSchema}.${safeTable} LIMIT ${limit}`

    console.log(`[InternalStorage] Table query: ${sql}`)

    const rows = await pgClient.unsafe(sql) as any[]

    // Extract column info from first row
    const columnInfo = rows.length > 0
        ? Object.keys(rows[0]).map(k => ({ key: k, label: k }))
        : []

    return { rows, columns: columnInfo }
}

/**
 * Get distinct values for a column from internal storage
 */
export async function getDistinctValuesInternal(
    schemaName: string,
    tableName: string,
    columnName: string,
    limit: number = 200
): Promise<string[]> {
    const safeTable = wrapIdPg(tableName)
    const safeSchema = wrapIdPg(schemaName)
    const safeColumn = wrapIdPg(columnName)

    const sql = `
        SELECT DISTINCT ${safeColumn} AS value
        FROM ${safeSchema}.${safeTable}
        WHERE ${safeColumn} IS NOT NULL
        ORDER BY ${safeColumn}
        LIMIT ${limit}
    `

    const rows = await pgClient.unsafe(sql) as { value: unknown }[]
    return rows.map(r => String(r.value))
}
