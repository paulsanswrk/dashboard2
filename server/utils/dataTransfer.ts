/**
 * Data Transfer Utilities
 *
 * Core logic for transferring data from MySQL to Supabase.
 * Handles schema introspection, table creation, and chunked data transfer.
 */

import type { MySqlConnectionConfig } from './mysqlClient'
import { withMySqlConnectionConfig } from './mysqlClient'
import type { MySqlColumn } from './mysqlTypeMapping'
import { bulkInsert, createCustomerSchema, createTable, generateSchemaName, getTableRowCount, type TableDefinition, truncateTable } from './schemaManager'
import { db } from '../../lib/db'
import { dataConnections, datasourceSync, syncQueue } from '../../lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'

// Default chunk size for data transfer (rows per batch)
const DEFAULT_CHUNK_SIZE = 5000

// Maximum time per cron invocation (4 minutes to be safe within 5-min limit)
const MAX_PROCESSING_TIME_MS = 4 * 60 * 1000

export interface DatabaseSchema {
    tables: TableSchema[]
    foreignKeys: ForeignKeyDef[]
}

export interface TableSchema {
    tableName: string
    columns: MySqlColumn[]
    primaryKeys: string[]
    autoIncrementColumn?: string
    rowCount: number
}

export interface ForeignKeyDef {
    constraintName: string
    sourceTable: string
    targetTable: string
    columnPairs: { sourceColumn: string; targetColumn: string }[]
    updateRule?: string
    deleteRule?: string
}

/**
 * Introspect the entire MySQL database schema
 */
export async function introspectMySqlDatabase(
    config: MySqlConnectionConfig
): Promise<DatabaseSchema> {
    return withMySqlConnectionConfig(config, async (conn) => {
        // Get all tables
        const [tablesResult] = await conn.query(
            `SELECT table_name 
             FROM information_schema.tables 
             WHERE table_schema = DATABASE() 
               AND table_type = 'BASE TABLE'
             ORDER BY table_name`
        ) as any[]

        const tables: TableSchema[] = []
        const foreignKeys: ForeignKeyDef[] = []

        for (const tableRow of tablesResult) {
            const tableName = tableRow.table_name || tableRow.TABLE_NAME

            // Get columns
            const [columnsResult] = await conn.query(
                `SELECT 
                    column_name,
                    data_type,
                    column_type,
                    is_nullable,
                    column_key,
                    column_default,
                    extra
                 FROM information_schema.columns
                 WHERE table_schema = DATABASE()
                   AND table_name = ?
                 ORDER BY ordinal_position`,
                [tableName]
            ) as any[]

            const columns: MySqlColumn[] = columnsResult.map((col: any) => ({
                name: col.column_name || col.COLUMN_NAME,
                type: col.data_type || col.DATA_TYPE,
                columnType: col.column_type || col.COLUMN_TYPE,
                nullable: (col.is_nullable || col.IS_NULLABLE) === 'YES',
                primaryKey: (col.column_key || col.COLUMN_KEY) === 'PRI',
                autoIncrement: (col.extra || col.EXTRA)?.includes('auto_increment'),
                defaultValue: col.column_default || col.COLUMN_DEFAULT,
                extra: col.extra || col.EXTRA,
            }))

            // Get primary keys
            const primaryKeys = columns
                .filter(c => c.primaryKey)
                .map(c => c.name)

            // Get auto-increment column
            const autoIncrementColumn = columns.find(c => c.autoIncrement)?.name

            // Get row count
            const [countResult] = await conn.query(
                `SELECT COUNT(*) as cnt FROM \`${tableName}\``
            ) as any[]
            const rowCount = countResult[0]?.cnt || countResult[0]?.CNT || 0

            tables.push({
                tableName,
                columns,
                primaryKeys,
                autoIncrementColumn,
                rowCount,
            })

            // Get foreign keys for this table
            const [fkResult] = await conn.query(
                `SELECT 
                    rc.constraint_name,
                    kcu.table_name as source_table,
                    kcu.referenced_table_name as target_table,
                    kcu.column_name as source_column,
                    kcu.referenced_column_name as target_column,
                    rc.update_rule,
                    rc.delete_rule
                 FROM information_schema.referential_constraints rc
                 JOIN information_schema.key_column_usage kcu
                   ON rc.constraint_name = kcu.constraint_name
                  AND rc.constraint_schema = kcu.constraint_schema
                 WHERE kcu.table_schema = DATABASE()
                   AND kcu.table_name = ?
                 ORDER BY rc.constraint_name, kcu.ordinal_position`,
                [tableName]
            ) as any[]

            // Group foreign key columns
            const fkMap = new Map<string, ForeignKeyDef>()
            for (const fk of fkResult) {
                const name = fk.constraint_name || fk.CONSTRAINT_NAME
                if (!fkMap.has(name)) {
                    fkMap.set(name, {
                        constraintName: name,
                        sourceTable: fk.source_table || fk.SOURCE_TABLE,
                        targetTable: fk.target_table || fk.TARGET_TABLE,
                        columnPairs: [],
                        updateRule: fk.update_rule || fk.UPDATE_RULE,
                        deleteRule: fk.delete_rule || fk.DELETE_RULE,
                    })
                }
                fkMap.get(name)!.columnPairs.push({
                    sourceColumn: fk.source_column || fk.SOURCE_COLUMN,
                    targetColumn: fk.target_column || fk.TARGET_COLUMN,
                })
            }

            foreignKeys.push(...fkMap.values())
        }

        return { tables, foreignKeys }
    })
}

/**
 * Initialize data transfer for a connection
 * Creates schema, tables, and queues all tables for data transfer
 * Implements resume logic - skips tables with matching row counts
 */
export async function initializeDataTransfer(connectionId: number): Promise<{
    schemaName: string
    tablesQueued: number
    tablesSkipped?: number
    error?: string
}> {
    // Get connection details
    const [connection] = await db
        .select()
        .from(dataConnections)
        .where(eq(dataConnections.id, connectionId))
        .limit(1)

    if (!connection) {
        return { schemaName: '', tablesQueued: 0, error: 'Connection not found' }
    }

    // Build MySQL config
    const mysqlConfig: MySqlConnectionConfig = {
        host: connection.host,
        port: connection.port,
        user: connection.username,
        password: connection.password,
        database: connection.databaseName,
        useSshTunneling: connection.useSshTunneling,
        ssh: connection.useSshTunneling ? {
            host: connection.sshHost || '',
            port: connection.sshPort || 22,
            user: connection.sshUser || '',
            password: connection.sshPassword || undefined,
            privateKey: connection.sshPrivateKey || undefined,
        } : undefined,
    }

    // Debug logging for SSH tunnel diagnosis
    console.log(`🔧 [SYNC] MySQL Config for connection ${connectionId}:`, {
        host: mysqlConfig.host,
        port: mysqlConfig.port,
        database: mysqlConfig.database,
        useSshTunneling: mysqlConfig.useSshTunneling,
        hasSshConfig: !!mysqlConfig.ssh,
        sshHost: mysqlConfig.ssh?.host,
        sshPort: mysqlConfig.ssh?.port,
        sshUser: mysqlConfig.ssh?.user,
        hasSshPassword: !!mysqlConfig.ssh?.password,
        hasSshPrivateKey: !!mysqlConfig.ssh?.privateKey,
    })

    try {
        // Get or create datasource_sync record
        let [syncRecord] = await db
            .select()
            .from(datasourceSync)
            .where(eq(datasourceSync.connectionId, connectionId))
            .limit(1)

        if (!syncRecord) {
            // Create new sync record
            const [newSync] = await db.insert(datasourceSync)
                .values({
                    connectionId,
                    syncStatus: 'syncing',
                    syncProgress: { stage: 'introspecting', message: 'Analyzing source database...' },
                })
                .returning()
            syncRecord = newSync
        } else {
            // Update existing sync record
            await db.update(datasourceSync)
                .set({
                    syncStatus: 'syncing',
                    syncProgress: { stage: 'introspecting', message: 'Analyzing source database...' },
                    syncError: null,
                    updatedAt: new Date(),
                })
                .where(eq(datasourceSync.id, syncRecord.id))
        }

        // Introspect the source database
        const schema = await introspectMySqlDatabase(mysqlConfig)

        // Generate or reuse schema name
        let schemaName = syncRecord!.targetSchemaName
        if (!schemaName) {
            schemaName = generateSchemaName(connection.databaseName)
        }

        // Store foreign key metadata and schema name
        await db.update(datasourceSync)
            .set({
                targetSchemaName: schemaName,
                foreignKeyMetadata: schema.foreignKeys as any,
                syncProgress: { stage: 'creating_tables', message: 'Creating database structure...' },
                updatedAt: new Date(),
            })
            .where(eq(datasourceSync.id, syncRecord!.id))

        // Create the schema first
        await createCustomerSchema(schemaName)

        // Create tables in Supabase (separate schema per connection)
        const createTableStatements: string[] = []

        for (const table of schema.tables) {
            const tableDef: TableDefinition = {
                tableName: table.tableName,
                columns: table.columns,
                primaryKeys: table.primaryKeys,
                autoIncrementColumn: table.autoIncrementColumn,
            }

            const result = await createTable(schemaName, tableDef)
            createTableStatements.push(result.sql)

            if (!result.success) {
                console.error(`❌ Failed to create table ${table.tableName}:`, result.error)
            }
        }

        // Clear any existing queue items for this sync
        await db.delete(syncQueue)
            .where(eq(syncQueue.syncId, syncRecord!.id))

        // Resume logic: Compare row counts and only queue tables that need syncing
        const tablesToSync: typeof schema.tables = []
        const tablesSkipped: string[] = []

        for (const table of schema.tables) {
            const pgRowCount = await getTableRowCount(schemaName, table.tableName)
            const mysqlRowCount = table.rowCount

            if (pgRowCount === mysqlRowCount && pgRowCount >= 0) {
                // Table already has same row count - skip it
                console.log(`⏭️ [SYNC] Skipping ${table.tableName}: PostgreSQL has ${pgRowCount} rows, MySQL has ${mysqlRowCount} rows (match)`)
                tablesSkipped.push(table.tableName)
            } else {
                // Table needs syncing - row count mismatch or table doesn't exist
                console.log(`📋 [SYNC] Queuing ${table.tableName}: PostgreSQL has ${pgRowCount} rows, MySQL has ${mysqlRowCount} rows (needs sync)`)
                tablesToSync.push(table)
            }
        }

        // Queue only tables that need syncing
        const queueItems = tablesToSync.map((table, index) => ({
            syncId: syncRecord!.id,
            tableName: table.tableName,
            status: 'pending' as const,
            lastRowOffset: 0,
            totalRows: table.rowCount,
            priority: tablesToSync.length - index,
        }))

        if (queueItems.length > 0) {
            await db.insert(syncQueue).values(queueItems)
        }

        // Log summary
        console.log(`📊 [SYNC] Resume logic summary: ${tablesToSync.length} tables to sync, ${tablesSkipped.length} tables skipped (already synced)`)

        // Update sync progress
        await db.update(datasourceSync)
            .set({
                syncProgress: {
                    stage: 'queued',
                    message: `${tablesToSync.length} tables queued for transfer (${tablesSkipped.length} already synced)`,
                    tables_total: schema.tables.length,
                    tables_queued: tablesToSync.length,
                    tables_skipped: tablesSkipped.length,
                    tables_done: tablesSkipped.length, // Count skipped as done
                },
                syncStatus: tablesToSync.length > 0 ? 'queued' : 'synced',
                updatedAt: new Date(),
            })
            .where(eq(datasourceSync.id, syncRecord!.id))

        return { schemaName, tablesQueued: tablesToSync.length, tablesSkipped: tablesSkipped.length }

    } catch (error: any) {
        // Update sync status to error
        await db.update(datasourceSync)
            .set({
                syncStatus: 'error',
                syncError: error.message,
                updatedAt: new Date(),
            })
            .where(eq(datasourceSync.connectionId, connectionId))

        return { schemaName: '', tablesQueued: 0, error: error.message }
    }
}

/**
 * Process the next chunk of data from the sync queue
 * Returns true if more work remains, false if complete
 */
export async function processNextQueueItem(
    chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<{
    processed: boolean
    itemId?: string
    tableName?: string
    rowsTransferred?: number
    complete?: boolean
    error?: string
}> {
    // Get the next pending queue item
    const [nextItem] = await db
        .select()
        .from(syncQueue)
        .where(eq(syncQueue.status, 'pending'))
        .orderBy(syncQueue.priority, syncQueue.createdAt)
        .limit(1)

    if (!nextItem) {
        return { processed: false, complete: true }
    }

    // Mark as processing
    await db.update(syncQueue)
        .set({
            status: 'processing',
            updatedAt: new Date(),
        })
        .where(eq(syncQueue.id, nextItem.id))

    // Get sync record and connection details
    const [syncRecord] = await db
        .select()
        .from(datasourceSync)
        .where(eq(datasourceSync.id, nextItem.syncId))
        .limit(1)

    if (!syncRecord) {
        await db.update(syncQueue)
            .set({
                status: 'error',
                error: 'Sync record not found',
                updatedAt: new Date(),
            })
            .where(eq(syncQueue.id, nextItem.id))
        return {
            processed: true,
            itemId: nextItem.id,
            tableName: nextItem.tableName,
            error: 'Sync record not found'
        }
    }

    const [connection] = await db
        .select()
        .from(dataConnections)
        .where(eq(dataConnections.id, syncRecord.connectionId))
        .limit(1)

    if (!connection) {
        await db.update(syncQueue)
            .set({
                status: 'error',
                error: 'Connection not found',
                updatedAt: new Date(),
            })
            .where(eq(syncQueue.id, nextItem.id))

        return {
            processed: true,
            itemId: nextItem.id,
            tableName: nextItem.tableName,
            error: 'Connection not found'
        }
    }

    const mysqlConfig: MySqlConnectionConfig = {
        host: connection.host,
        port: connection.port,
        user: connection.username,
        password: connection.password,
        database: connection.databaseName,
        useSshTunneling: connection.useSshTunneling,
        ssh: connection.useSshTunneling ? {
            host: connection.sshHost || '',
            port: connection.sshPort || 22,
            user: connection.sshUser || '',
            password: connection.sshPassword || undefined,
            privateKey: connection.sshPrivateKey || undefined,
        } : undefined,
    }

    try {
        // If starting fresh (offset 0), truncate the table first
        if (nextItem.lastRowOffset === 0) {
            await truncateTable(syncRecord.targetSchemaName!, nextItem.tableName)
        }

        // Read chunk from MySQL
        const offset = nextItem.lastRowOffset || 0
        const { columns, rows } = await readMySqlChunk(
            mysqlConfig,
            nextItem.tableName,
            offset,
            chunkSize
        )

        if (rows.length === 0) {
            // Table is done
            await db.update(syncQueue)
                .set({
                    status: 'completed',
                    updatedAt: new Date(),
                })
                .where(eq(syncQueue.id, nextItem.id))

            return {
                processed: true,
                itemId: nextItem.id,
                tableName: nextItem.tableName,
                rowsTransferred: 0,
                complete: true,
            }
        }

        // Insert into Supabase using Drizzle
        const result = await bulkInsert(
            syncRecord.targetSchemaName!,
            nextItem.tableName,
            columns,
            rows
        )

        if (!result.success) {
            throw new Error(result.error || 'Bulk insert failed')
        }

        const newOffset = offset + rows.length
        const isComplete = rows.length < chunkSize

        // Update queue item
        await db.update(syncQueue)
            .set({
                status: isComplete ? 'completed' : 'pending',
                lastRowOffset: newOffset,
                updatedAt: new Date(),
            })
            .where(eq(syncQueue.id, nextItem.id))

        // Update sync progress
        if (isComplete) {
            // Count completed tables
            const completedCount = await db
                .select({
                    count: sql<number>`count
                        (*)`
                })
                .from(syncQueue)
                .where(and(
                    eq(syncQueue.syncId, nextItem.syncId),
                    eq(syncQueue.status, 'completed')
                ))

            const totalCount = await db
                .select({
                    count: sql<number>`count
                        (*)`
                })
                .from(syncQueue)
                .where(eq(syncQueue.syncId, nextItem.syncId))

            const done = Number(completedCount[0]?.count || 0)
            const total = Number(totalCount[0]?.count || 0)

            await db.update(datasourceSync)
                .set({
                    syncProgress: {
                        stage: done === total ? 'completed' : 'transferring',
                        tables_total: total,
                        tables_done: done,
                        current_table: done === total ? null : nextItem.tableName,
                    },
                    syncStatus: done === total ? 'completed' : 'syncing',
                    lastSyncAt: done === total ? new Date() : undefined,
                    updatedAt: new Date(),
                })
                .where(eq(datasourceSync.id, nextItem.syncId))
        }

        return {
            processed: true,
            itemId: nextItem.id,
            tableName: nextItem.tableName,
            rowsTransferred: rows.length,
            complete: isComplete,
        }

    } catch (error: any) {
        await db.update(syncQueue)
            .set({
                status: 'error',
                error: error.message,
                updatedAt: new Date(),
            })
            .where(eq(syncQueue.id, nextItem.id))

        return {
            processed: true,
            itemId: nextItem.id,
            tableName: nextItem.tableName,
            error: error.message,
        }
    }
}

/**
 * Read a chunk of data from MySQL table
 */
async function readMySqlChunk(
    config: MySqlConnectionConfig,
    tableName: string,
    offset: number,
    limit: number
): Promise<{ columns: string[]; rows: any[][] }> {
    return withMySqlConnectionConfig(config, async (conn) => {
        // Get column names
        const [columnsResult] = await conn.query(
            `SELECT column_name 
             FROM information_schema.columns
             WHERE table_schema = DATABASE()
               AND table_name = ?
             ORDER BY ordinal_position`,
            [tableName]
        ) as any[]

        const columns = columnsResult.map((c: any) => c.column_name || c.COLUMN_NAME)

        // Read data chunk
        const [dataResult] = await conn.query(
            `SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`,
            [limit, offset]
        ) as any[]

        // Convert to array of arrays
        const rows = dataResult.map((row: any) =>
            columns.map((col: string) => row[col])
        )

        return { columns, rows }
    })
}

/**
 * Process sync queue items until time limit or completion
 */
export async function processSyncQueue(
    maxTimeMs: number = MAX_PROCESSING_TIME_MS
): Promise<{
    itemsProcessed: number
    rowsTransferred: number
    errors: string[]
    complete: boolean
}> {
    const startTime = Date.now()
    let itemsProcessed = 0
    let rowsTransferred = 0
    const errors: string[] = []

    console.log(`🚀 [SYNC] Starting queue processing (max ${maxTimeMs}ms)...`)

    while (Date.now() - startTime < maxTimeMs) {
        const result = await processNextQueueItem()

        if (!result.processed) {
            // Queue is empty
            console.log(`✅ [SYNC] Queue complete! Processed ${itemsProcessed} items, ${rowsTransferred} rows`)
            return { itemsProcessed, rowsTransferred, errors, complete: true }
        }

        itemsProcessed++
        rowsTransferred += result.rowsTransferred || 0

        console.log(`📊 [SYNC] Processed: ${result.tableName} - ${result.rowsTransferred || 0} rows ${result.complete ? '(DONE)' : '(more chunks)'}`)

        if (result.error) {
            console.error(`❌ [SYNC] Error on ${result.tableName}: ${result.error}`)
            errors.push(`${result.tableName}: ${result.error}`)
        }
    }

    // Time limit reached
    console.log(`⏱️ [SYNC] Time limit reached. Processed ${itemsProcessed} items, ${rowsTransferred} rows`)
    return { itemsProcessed, rowsTransferred, errors, complete: false }
}
