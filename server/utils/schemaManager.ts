/**
 * Schema Manager using Drizzle ORM
 *
 * Manages customer data schemas in Supabase for data transfer feature.
 * Uses Drizzle's db.execute() for DDL and DML operations.
 * Uses raw pgClient for INSERT operations for better error handling.
 */

import { sql } from 'drizzle-orm'
import { db, pgClient } from '../../lib/db'
import type { MySqlColumn } from './mysqlTypeMapping'
import { generateCreateTableSql, generateFixSequenceSql, normalizeName } from './mysqlTypeMapping'

/**
 * Check if a value is a MySQL "zero date" that PostgreSQL cannot handle
 * MySQL allows dates like '0000-00-00 00:00:00' which PostgreSQL rejects
 */
function isZeroDate(val: any): boolean {
    if (val instanceof Date) {
        // Invalid Date (NaN time) or year 0
        return isNaN(val.getTime()) || val.getFullYear() === 0
    }
    if (typeof val === 'string') {
        return val.startsWith('0000-00-00')
    }
    return false
}

// Regex to match ISO 8601 date strings from MySQL: YYYY-MM-DDTHH:MM:SS.sssZ
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/

/**
 * Convert an ISO date string to PostgreSQL-compatible timestamp format
 * MySQL returns dates as "2016-09-13T06:14:36.000Z", PostgreSQL expects "2016-09-13 06:14:36"
 */
function formatDateForPostgres(val: string): string {
    // Replace T with space and remove Z and milliseconds
    return val.replace('T', ' ').replace(/\.\d{3}Z?$/, '').replace('Z', '')
}

/**
 * Convert MySQL SET value to PostgreSQL text[] array literal
 * MySQL returns SET as comma-separated string like "Deleted Scenes,Behind the Scenes"
 * PostgreSQL expects array format like {"Deleted Scenes","Behind the Scenes"}
 */
function convertSetToArray(val: string): string {
    if (!val || val === '') {
        return '{}' // Empty array
    }
    // Split by comma, escape double quotes in each value, wrap in quotes, join with comma
    const items = val.split(',').map(item =>
        '"' + item.replace(/"/g, '\\"') + '"'
    )
    return '{' + items.join(',') + '}'
}

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

/**
 * Get row count from a PostgreSQL table in the customer schema
 * Returns -1 if table doesn't exist
 */
export async function getTableRowCount(schemaName: string, tableName: string): Promise<number> {
    const normalizedTable = normalizeName(tableName)
    try {
        const result = await pgClient.unsafe(
            `SELECT COUNT(*) as count FROM "${schemaName}"."${normalizedTable}"`
        )
        return parseInt(result[0]?.count || '0', 10)
    } catch (err: any) {
        // Table doesn't exist or other error
        console.log(`⚠️ [SCHEMA] Could not get row count for ${schemaName}.${normalizedTable}: ${err.message}`)
        return -1
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
        return { success: true, sql: ddlSql }
    } catch (err: any) {
        console.error(`❌ [SCHEMA] Failed to create table:`, err.message)
        return { success: false, sql: ddlSql, error: err.message }
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
        // First check if table exists
        const checkResult = await db.execute(sql.raw(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = '${schemaName}' 
                AND table_name = '${normalizedTable}'
            ) as exists
        `))

        const exists = (checkResult as any)?.[0]?.exists
        if (!exists) {
            console.warn(`⚠️ [SCHEMA] Table ${schemaName}.${normalizedTable} does not exist, skipping truncate`)
            return
        }

        await db.execute(sql.raw(`TRUNCATE TABLE "${schemaName}"."${normalizedTable}" RESTART IDENTITY`))
    } catch (error: any) {
        // Log warning but don't throw - table might not exist
        console.warn(`⚠️ [SCHEMA] Failed to truncate ${schemaName}.${normalizedTable}: ${error.message}`)
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
 * @param columnTypes Optional array of MySQL column types for special handling (e.g., SET -> text[])
 */
export async function bulkInsert(
    schemaName: string,
    tableName: string,
    columns: string[],
    rows: any[][],
    columnTypes?: string[]
): Promise<{ success: boolean; rowsInserted: number; error?: string }> {
    if (rows.length === 0) {
        return { success: true, rowsInserted: 0 }
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
            // Check for MySQL zero-dates that PostgreSQL cannot handle
            if (isZeroDate(val)) {
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
                // Format Date to PostgreSQL-compatible timestamp
                return `'${formatDateForPostgres(val.toISOString())}'`
            }
            if (Buffer.isBuffer(val)) {
                return `'\\x${val.toString('hex')}'`
            }
            if (typeof val === 'object') {
                return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`
            }
            // For strings: check if it's an ISO date string from MySQL
            const strVal = String(val)
            if (ISO_DATE_REGEX.test(strVal)) {
                return `'${formatDateForPostgres(strVal)}'`
            }
            // String value - escape single quotes and backslashes
            const escaped = strVal
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
                const values = row.map((val, colIndex) => {
                    if (val === null || val === undefined) return 'NULL'
                    // Check for MySQL zero-dates that PostgreSQL cannot handle
                    if (isZeroDate(val)) return 'NULL'

                    // Check if this column is a SET type (needs conversion to PostgreSQL array)
                    const colType = columnTypes?.[colIndex]
                    if (colType === 'set') {
                        // Convert MySQL SET comma-separated string to PostgreSQL array literal
                        if (val === '' || val === null) return "'{}'"
                        const arrayLiteral = convertSetToArray(String(val))
                        return `'${arrayLiteral}'`
                    }

                    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
                    if (typeof val === 'number') {
                        if (isNaN(val) || !isFinite(val)) return 'NULL'
                        return val.toString()
                    }
                    if (val instanceof Date) {
                        // Format Date to PostgreSQL-compatible timestamp
                        return `'${formatDateForPostgres(val.toISOString())}'`
                    }
                    if (Buffer.isBuffer(val)) return `'\\x${val.toString('hex')}'`
                    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`
                    // For strings: check if it's an ISO date string from MySQL
                    const strVal = String(val)
                    if (ISO_DATE_REGEX.test(strVal)) {
                        return `'${formatDateForPostgres(strVal)}'`
                    }
                    const escaped = strVal.replace(/\\/g, '\\\\').replace(/'/g, "''")
                    return `'${escaped}'`
                })
                return `(${values.join(', ')})`
            }).join(',\n')

            const batchSql = `INSERT INTO "${schemaName}"."${normalizedTable}" (${normalizedCols}) VALUES\n${batchValuesClauses}`

            // Use raw postgres client for better error handling
            // pgClient.unsafe() gives us access to actual PostgreSQL error properties
            try {
                await pgClient.unsafe(batchSql)
                totalInserted += batchRows.length
            } catch (pgErr: any) {
                // Extract PostgreSQL error details from the raw error
                const errorMessage = pgErr.message || 'Unknown error'
                const errorCode = pgErr.code || ''
                const errorDetail = pgErr.detail || ''
                const errorHint = pgErr.hint || ''
                const errorColumn = pgErr.column || ''
                const errorConstraint = pgErr.constraint || ''

                // Build a clean error message
                let cleanError = errorMessage
                if (errorDetail) cleanError += ` | Detail: ${errorDetail}`
                if (errorHint) cleanError += ` | Hint: ${errorHint}`
                if (errorColumn) cleanError += ` | Column: ${errorColumn}`
                if (errorConstraint) cleanError += ` | Constraint: ${errorConstraint}`

                console.error(`❌ [SYNC] Insert failed on ${schemaName}.${normalizedTable}:`)
                console.error(`   └─ Error: ${errorMessage}`)
                if (errorCode) console.error(`   └─ Code: ${errorCode}`)
                if (errorDetail) console.error(`   └─ Detail: ${errorDetail}`)
                if (errorHint) console.error(`   └─ Hint: ${errorHint}`)

                throw new Error(cleanError)
            }
        }

        console.log(`✅ [SYNC] Inserted ${totalInserted} rows into ${schemaName}.${normalizedTable}`)
        return { success: true, rowsInserted: totalInserted }
    } catch (err: any) {
        // This catches errors from the inner try-catch or any other errors
        const errorMessage = err.message || 'Unknown database error'
        console.error(`❌ [SYNC] Insert operation failed: ${errorMessage}`)
        return { success: false, rowsInserted: 0, error: errorMessage }
    }
}
