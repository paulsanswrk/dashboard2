/**
 * Optiqoflow Query Utility
 * 
 * Executes queries against the Supabase optiqoflow schema
 * for internal data source connections.
 * 
 * Supports per-tenant role-based isolation:
 * - When tenantId is provided, queries execute with SET ROLE
 * - Role's default search_path is the tenant's schema
 * - Enables unqualified table names in queries
 */

import { pgClient } from '../../lib/db'

const OPTIQOFLOW_SCHEMA = 'optiqoflow'

/**
 * Wrap an identifier for PostgreSQL (using double quotes)
 */
function wrapPgIdentifier(identifier: string): string {
    // Escape any double quotes in the identifier
    return `"${identifier.replace(/"/g, '""')}"`
}

/**
 * Convert MySQL-style backtick identifiers to PostgreSQL double quotes
 */
export function translateIdentifiers(sql: string): string {
    // Note: This function name matches internalStorageQuery.ts intentionally
    // Nuxt auto-imports will deduplicate - either version works the same
    return sql.replace(/`([^`]+)`/g, '"$1"')
}

/**
 * Get the tenant's role name from the database
 */
async function getTenantRoleName(tenantId: string): Promise<string | null> {
    try {
        const result = await pgClient.unsafe(
            `SELECT tenants.get_tenant_role($1) as role_name`,
            [tenantId]
        ) as Array<{ role_name: string | null }>
        return result[0]?.role_name || null
    } catch (error) {
        console.error(`[OptiqoflowQuery] Error getting tenant role:`, error)
        return null
    }
}

/**
 * Execute a query against the optiqoflow PostgreSQL schema with tenant isolation
 * 
 * @param sql - The SQL query (can have MySQL-style backtick identifiers)
 * @param params - Query parameters (optional)
 * @param tenantId - Tenant ID for role-based isolation (REQUIRED)
 * @returns Array of result rows
 * 
 * Security: Always uses SET ROLE for tenant isolation
 * - Uses SET ROLE to switch to tenant's role
 * - Role's search_path is set to tenant's schema
 * - Allows unqualified table names (e.g., SELECT * FROM work_orders)
 */
export async function executeOptiqoflowQuery(
    sql: string,
    params: any[] = [],
    tenantId?: string
): Promise<any[]> {
    // Translate MySQL backticks to PostgreSQL double quotes
    let pgSql = translateIdentifiers(sql)

    // Convert ? placeholders to numbered placeholders ($1, $2, etc.)
    let paramIndex = 0
    const numberedSql = pgSql.replace(/\?/g, () => `$${++paramIndex}`)

    if (!tenantId) {
        throw new Error('tenantId is required for query execution. User must be associated with an organization that has a tenant_id set.')
    }

    console.log(`[OptiqoflowQuery] Executing query with tenant isolation for tenant ${tenantId}`)
    console.log(`[OptiqoflowQuery] SQL: ${numberedSql.substring(0, 200)}...`)

    try {
        // Use a transaction to ensure role and query run on the same connection
        const result = await pgClient.begin(async (tx) => {
            // Get tenant's role name
            const roleName = await getTenantRoleName(tenantId)
            if (!roleName) {
                throw new Error(`Tenant ${tenantId} not found or missing role`)
            }

            // SET ROLE switches to tenant role
            await tx.unsafe(`SET LOCAL ROLE ${roleName}`)
            console.log(`[OptiqoflowQuery] Set role to ${roleName}`)

            // Get the tenant's short name from the role name
            const tenantShortName = roleName.replace('tenant_', '').replace('_role', '')

            // Set search_path to include both tenant schema and optiqoflow
            // This allows access to tenant-specific views AND base tables
            await tx.unsafe(`SET LOCAL search_path TO tenant_${tenantShortName}, optiqoflow, public`)
            console.log(`[OptiqoflowQuery] Set search_path to tenant_${tenantShortName}, optiqoflow, public`)

            // Execute the query on the same connection
            const rows = await tx.unsafe(numberedSql, params)

            return rows as any[]
        })

        return result
    } catch (error: any) {
        console.error(`[OptiqoflowQuery] Query error:`, error?.message || error)
        throw error
    }
}

/**
 * Get the list of tables in the optiqoflow schema
 */
export async function getOptiqoflowTables(): Promise<Array<{ tableName: string, rowCount: number }>> {
    const sql = `
    SELECT 
      table_name as "tableName",
      (SELECT COUNT(*) FROM "${OPTIQOFLOW_SCHEMA}"."" || table_name || "") as "rowCount"
    FROM information_schema.tables
    WHERE table_schema = $1
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `

    // This query won't work directly due to dynamic table name, so let's use a simpler approach
    const tablesSql = `
    SELECT table_name as "tableName"
    FROM information_schema.tables
    WHERE table_schema = $1
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `

    try {
        const tables = await pgClient.unsafe(tablesSql, [OPTIQOFLOW_SCHEMA]) as Array<{ tableName: string }>
        return tables.map(t => ({ tableName: t.tableName, rowCount: 0 }))
    } catch (error: any) {
        console.error(`[OptiqoflowQuery] Error getting tables:`, error?.message || error)
        throw error
    }
}

/**
 * Fetch foreign key relationships from optiqoflow.table_relationships
 * These are business-level relationships pushed by the Optiqo Flow sync pipeline.
 */
export async function getTableRelationships(): Promise<Array<{
    sourceTable: string
    sourceColumn: string
    targetTable: string
    targetColumn: string
    relationshipType: string
    description?: string
}>> {
    const sql = `
        SELECT 
            source_table,
            source_column,
            target_table,
            target_column,
            relationship_type,
            description
        FROM optiqoflow.table_relationships
        ORDER BY source_table, source_column
    `

    try {
        const rows = await pgClient.unsafe(sql) as Array<{
            source_table: string
            source_column: string
            target_table: string
            target_column: string
            relationship_type: string
            description?: string
        }>

        console.log(`[OptiqoflowQuery] Loaded ${rows.length} table relationships`)

        return rows.map(r => ({
            sourceTable: r.source_table,
            sourceColumn: r.source_column,
            targetTable: r.target_table,
            targetColumn: r.target_column,
            relationshipType: r.relationship_type,
            description: r.description
        }))
    } catch (error: any) {
        console.error(`[OptiqoflowQuery] Error fetching table_relationships:`, error?.message || error)
        // Return empty array if table doesn't exist or other error
        return []
    }
}

/**
 * Get schema info for optiqoflow (tables, columns, types)
 * Returns structure compatible with existing schema_json format
 * Merges FK relationships from both information_schema and table_relationships
 */
export async function getOptiqoflowSchema(tenantId?: string): Promise<{
    tables: Array<{
        tableId: string
        tableName: string
        columns: Array<{
            name: string
            type: string
            label: string
            fieldId: string
            isDate: boolean
            isString: boolean
            isBoolean: boolean
            isNumeric: boolean
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
    }>
}> {
    // Always use optiqoflow schema - tables are stored there
    // tenantId is used for access control during query execution, not for schema location
    const schemaName = OPTIQOFLOW_SCHEMA

    // Get all tables
    const tablesSql = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = $1
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `

    // Get all columns
    const columnsSql = `
    SELECT 
      table_name,
      column_name,
      data_type,
      udt_name
    FROM information_schema.columns
    WHERE table_schema = $1
    ORDER BY table_name, ordinal_position
  `

    // Get primary keys
    const pkSql = `
    SELECT 
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = $1
  `

    try {
        const [tablesRows, columnsRows, pksRows] = await Promise.all([
            pgClient.unsafe(tablesSql, [schemaName]) as Promise<Array<{ table_name: string }>>,
            pgClient.unsafe(columnsSql, [schemaName]) as Promise<Array<{ table_name: string, column_name: string, data_type: string, udt_name: string }>>,
            pgClient.unsafe(pkSql, [schemaName]) as Promise<Array<{ table_name: string, column_name: string }>>
        ])

        const tables = tablesRows
        const columns = columnsRows
        const pks = pksRows

        // OptiqoFlow stores FK relationships in table_relationships table, not information_schema
        // We'll merge those later
        const fks: Array<{ source_table: string, target_table: string, source_column: string, target_column: string }> = []

        // Group columns by table
        const columnsByTable: Record<string, typeof columns> = {}
        for (const col of columns) {
            if (!columnsByTable[col.table_name]) {
                columnsByTable[col.table_name] = []
            }
            columnsByTable[col.table_name].push(col)
        }

        // Group PKs by table
        const pksByTable: Record<string, string[]> = {}
        for (const pk of pks) {
            if (!pksByTable[pk.table_name]) {
                pksByTable[pk.table_name] = []
            }
            pksByTable[pk.table_name].push(pk.column_name)
        }

        // FK type matching buildGraph requirements
        interface FKEntry {
            constraintName: string
            sourceTable: string
            targetTable: string
            columnPairs: Array<{ position: number; sourceColumn: string; targetColumn: string }>
        }

        // Group FKs by table (from information_schema)
        const fksByTable: Record<string, FKEntry[]> = {}
        for (const fk of fks) {
            if (!fksByTable[fk.source_table]) {
                fksByTable[fk.source_table] = []
            }
            // Generate synthetic constraint name for info_schema FKs
            const constraintName = `fk_${fk.source_table}_${fk.source_column}`
            fksByTable[fk.source_table].push({
                constraintName,
                sourceTable: fk.source_table,
                targetTable: fk.target_table,
                columnPairs: [{
                    position: 1,
                    sourceColumn: fk.source_column,
                    targetColumn: fk.target_column
                }]
            })
        }

        // Merge FK relationships from table_relationships
        // These are business-level relationships pushed by Optiqo Flow
        const tableRelationships = await getTableRelationships()
        console.log(`[OptiqoflowQuery] Merging ${tableRelationships.length} relationships from table_relationships`)

        for (const rel of tableRelationships) {
            if (!fksByTable[rel.sourceTable]) {
                fksByTable[rel.sourceTable] = []
            }
            // Check for duplicates based on source column + target
            const exists = fksByTable[rel.sourceTable].some(
                fk => fk.columnPairs[0]?.sourceColumn === rel.sourceColumn &&
                    fk.targetTable === rel.targetTable &&
                    fk.columnPairs[0]?.targetColumn === rel.targetColumn
            )
            if (!exists) {
                // Generate synthetic constraint name for table_relationships
                const constraintName = `tr_${rel.sourceTable}_${rel.sourceColumn}`
                fksByTable[rel.sourceTable].push({
                    constraintName,
                    sourceTable: rel.sourceTable,
                    targetTable: rel.targetTable,
                    columnPairs: [{
                        position: 1,
                        sourceColumn: rel.sourceColumn,
                        targetColumn: rel.targetColumn
                    }]
                })
            }
        }

        // Count total FKs for logging
        const totalFks = Object.values(fksByTable).reduce((sum, arr) => sum + arr.length, 0)
        console.log(`[OptiqoflowQuery] Total FK relationships: ${totalFks}`)

        // Build result
        const result = {
            tables: tables.map(t => {
                const tableCols = columnsByTable[t.table_name] || []
                // Table name is as-is from optiqoflow schema
                const displayName = t.table_name

                return {
                    tableId: t.table_name,
                    tableName: displayName,
                    columns: tableCols.map(c => ({
                        name: c.column_name,
                        type: c.data_type,
                        label: c.column_name,
                        fieldId: c.column_name,
                        isDate: ['date', 'timestamp', 'timestamptz', 'timestamp with time zone', 'timestamp without time zone', 'time', 'timetz'].includes(c.data_type.toLowerCase()),
                        isString: ['text', 'varchar', 'char', 'character varying', 'character', 'name'].includes(c.data_type.toLowerCase()),
                        isBoolean: ['boolean', 'bool'].includes(c.data_type.toLowerCase()),
                        isNumeric: ['integer', 'bigint', 'smallint', 'decimal', 'numeric', 'real', 'double precision', 'int4', 'int8', 'int2', 'float4', 'float8'].includes(c.data_type.toLowerCase())
                    })),
                    primaryKey: pksByTable[t.table_name] || [],
                    foreignKeys: fksByTable[t.table_name] || []
                }
            })
        }

        console.log(`[OptiqoflowQuery] Schema loaded: ${result.tables.length} tables`)
        return result
    } catch (error: any) {
        console.error(`[OptiqoflowQuery] Error getting schema:`, error?.message || error)
        throw error
    }
}

/**
 * Execute a simple SELECT query on optiqoflow
 */
export async function queryOptiqoflowTable(
    tableName: string,
    columns: string = '*',
    limit: number = 100
): Promise<{ rows: any[], columns: Array<{ key: string, label: string }> }> {
    const safeTable = wrapPgIdentifier(tableName)
    const safeSchema = wrapPgIdentifier(OPTIQOFLOW_SCHEMA)

    const sql = `SELECT ${columns} FROM ${safeSchema}.${safeTable} LIMIT ${limit}`

    console.log(`[OptiqoflowQuery] Table query: ${sql}`)

    const rows = await pgClient.unsafe(sql) as any[]

    // Extract column info from first row
    const columnInfo = rows.length > 0
        ? Object.keys(rows[0]).map(k => ({ key: k, label: k }))
        : []

    return { rows, columns: columnInfo }
}

/**
 * Get distinct values for a column from optiqoflow
 */
export async function getDistinctValuesOptiqoflow(
    tableName: string,
    columnName: string,
    limit: number = 200
): Promise<string[]> {
    const safeTable = wrapPgIdentifier(tableName)
    const safeSchema = wrapPgIdentifier(OPTIQOFLOW_SCHEMA)
    const safeColumn = wrapPgIdentifier(columnName)

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
