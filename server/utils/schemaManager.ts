/**
 * Schema Manager using Drizzle ORM
 *
 * Manages customer data schemas in Supabase for data transfer feature.
 * Uses Drizzle's db.execute() for DDL and DML operations.
 */

import {sql} from 'drizzle-orm'
import {db} from '../../lib/db'
import type {MySqlColumn} from './mysqlTypeMapping'
import {generateCreateTableSql, generateFixSequenceSql, normalizeName} from './mysqlTypeMapping'

/**
 * Generate a unique schema name for a connection
 * Format: conn_{short_uuid}_{normalized_db_name}
 */
export function generateSchemaName(databaseName: string): string {
    const shortUuid = crypto.randomUUID().split('-')[0]  // First 8 chars of UUID
    const normalizedName = normalizeName(databaseName).substring(0, 20)
    return `conn_${shortUuid}_${normalizedName}`
}

/**
 * Create a new schema for customer data
 */
export async function createCustomerSchema(schemaName: string): Promise<void> {
    console.log(`🔨 [SCHEMA] Starting creation of schema: ${schemaName}`)
    const sqlQuery = `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`
    console.log(`📝 [SCHEMA] SQL: ${sqlQuery}`)

    try {
        await db.execute(sql.raw(sqlQuery))
        console.log(`✅ [SCHEMA] Successfully executed schema creation for: ${schemaName}`)

        // Verify existence
        const exists = await schemaExists(schemaName)
        console.log(`🔍 [SCHEMA] Verification check for ${schemaName}: ${exists ? 'EXISTS' : 'NOT FOUND (Error!)'}`)

        if (!exists) {
            throw new Error(`Schema ${schemaName} was created but could not be found during verification`)
        }
    } catch (error: any) {
        console.error(`❌ [SCHEMA] Failed to create schema ${schemaName}:`)
        console.error(`   Error Message: ${error.message}`)
        console.error(`   Error Code: ${error.code}`)
        throw error
    }
}

export interface TableDefinition {
    tableName: string
    columns: MySqlColumn[]
    primaryKeys: string[]
    autoIncrementColumn?: string
}

/**
 * Create a table in the customer schema
 */
export async function createTable(
    schemaName: string,
    tableDef: TableDefinition
): Promise<{ success: boolean; sql: string; error?: string }> {
    const ddlSql = generateCreateTableSql(
        schemaName,
        tableDef.tableName,
        tableDef.columns,
        tableDef.primaryKeys
    )

    console.log(`🔨 [SCHEMA] Creating table: ${schemaName}.${tableDef.tableName}`)

    try {
        await db.execute(sql.raw(ddlSql))
        console.log(`✅ [SCHEMA] Created table: ${schemaName}.${tableDef.tableName}`)
        return {success: true, sql: ddlSql}
    } catch (err: any) {
        console.error(`❌ [SCHEMA] Failed to create table:`, err.message)
        return {success: false, sql: ddlSql, error: err.message}
    }
}

/**
 * Drop an entire customer schema (and all its tables)
 */
export async function dropCustomerSchema(schemaName: string): Promise<void> {
    console.log(`🗑️ [SCHEMA] Dropping schema: ${schemaName}`)

    try {
        await db.execute(sql.raw(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`))
        console.log(`✅ [SCHEMA] Dropped schema: ${schemaName}`)
    } catch (error: any) {
        console.error(`❌ [SCHEMA] Failed to drop schema:`, error.message)
    }
}

/**
 * Truncate a table in the customer schema (for full sync refresh)
 */
export async function truncateTable(schemaName: string, tableName: string): Promise<void> {
    const normalizedTable = normalizeName(tableName)

    console.log(`🗑️ [SCHEMA] Truncating table: ${schemaName}.${normalizedTable}`)

    try {
        await db.execute(sql.raw(`TRUNCATE TABLE "${schemaName}"."${normalizedTable}" RESTART IDENTITY`))
    } catch (error: any) {
        throw new Error(`Failed to truncate table: ${error.message}`)
    }
}

/**
 * Fix sequence for auto-increment column after data insert
 */
export async function fixSequence(
    schemaName: string,
    tableName: string,
    autoIncrementColumn: string
): Promise<void> {
    const fixSql = generateFixSequenceSql(schemaName, tableName, autoIncrementColumn)

    try {
        await db.execute(sql.raw(fixSql))
    } catch (error: any) {
        console.error('Failed to fix sequence:', error.message)
    }
}

/**
 * Check if a schema exists
 */
export async function schemaExists(schemaName: string): Promise<boolean> {
    try {
        const result = await db.execute(
            sql`SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schemaName})`
        )
        return (result as any)?.[0]?.exists === true
    } catch (error) {
        return false
    }
}

/**
 * Get list of tables in a schema
 */
export async function getTablesInSchema(schemaName: string): Promise<string[]> {
    try {
        const result = await db.execute(
            sql`SELECT table_name FROM information_schema.tables WHERE table_schema = ${schemaName} ORDER BY table_name`
        )
        return (result as any[]).map((row: any) => row.table_name)
    } catch (error) {
        return []
    }
}

/**
 * Bulk insert data into a table using Drizzle
 */
export async function bulkInsert(
    schemaName: string,
    tableName: string,
    columns: string[],
    rows: any[][]
): Promise<{ success: boolean; rowsInserted: number; error?: string }> {
    if (rows.length === 0) {
        return {success: true, rowsInserted: 0}
    }

    const normalizedTable = normalizeName(tableName)
    const normalizedCols = columns.map(c => `"${normalizeName(c)}"`).join(', ')

    console.log(`📥 [SYNC] Inserting ${rows.length} rows into ${schemaName}.${normalizedTable}`)

    // Build values clause with proper escaping
    const valuesClauses = rows.map(row => {
        const values = row.map(val => {
            if (val === null || val === undefined) {
                return 'NULL'
            }
            if (typeof val === 'boolean') {
                return val ? 'TRUE' : 'FALSE'
            }
            if (typeof val === 'number') {
                if (isNaN(val) || !isFinite(val)) {
                    return 'NULL'
                }
                return val.toString()
            }
            if (val instanceof Date) {
                return `'${val.toISOString()}'`
            }
            if (Buffer.isBuffer(val)) {
                return `'\\x${val.toString('hex')}'`
            }
            if (typeof val === 'object') {
                return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`
            }
            // String value - escape single quotes and backslashes
            const escaped = String(val)
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "''")
            return `'${escaped}'`
        })
        return `(${values.join(', ')})`
    }).join(',\n')

    const insertSql = `INSERT INTO "${schemaName}"."${normalizedTable}" (${normalizedCols}) VALUES\n${valuesClauses}`

    try {
        // Insert in batches to avoid memory issues
        const BATCH_SIZE = 2000
        let totalInserted = 0

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batchRows = rows.slice(i, i + BATCH_SIZE)
            const batchValuesClauses = batchRows.map(row => {
                const values = row.map(val => {
                    if (val === null || val === undefined) return 'NULL'
                    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
                    if (typeof val === 'number') {
                        if (isNaN(val) || !isFinite(val)) return 'NULL'
                        return val.toString()
                    }
                    if (val instanceof Date) return `'${val.toISOString()}'`
                    if (Buffer.isBuffer(val)) return `'\\x${val.toString('hex')}'`
                    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`
                    const escaped = String(val).replace(/\\/g, '\\\\').replace(/'/g, "''")
                    return `'${escaped}'`
                })
                return `(${values.join(', ')})`
            }).join(',\n')

            const batchSql = `INSERT INTO "${schemaName}"."${normalizedTable}" (${normalizedCols}) VALUES\n${batchValuesClauses}`

            await db.execute(sql.raw(batchSql))
            totalInserted += batchRows.length
        }

        console.log(`✅ [SYNC] Inserted ${totalInserted} rows into ${schemaName}.${normalizedTable}`)
        return {success: true, rowsInserted: totalInserted}
    } catch (err: any) {
        console.error(`❌ [SYNC] Insert failed:`, err.message)
        return {success: false, rowsInserted: 0, error: err.message}
    }
}
