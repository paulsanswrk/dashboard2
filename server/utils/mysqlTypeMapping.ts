/**
 * MySQL to PostgreSQL Type Mapping
 *
 * Maps MySQL data types to their PostgreSQL equivalents for data transfer.
 */

// Type mapping from MySQL to PostgreSQL
const TYPE_MAPPING: Record<string, string> = {
    // Boolean
    'tinyint(1)': 'boolean',
    'bit(1)': 'boolean',

    // Integer types
    'tinyint': 'smallint',
    'smallint': 'smallint',
    'mediumint': 'integer',
    'int': 'integer',
    'integer': 'integer',
    'bigint': 'bigint',

    // Floating point
    'float': 'real',
    'double': 'double precision',
    'double precision': 'double precision',

    // Fixed point (handled specially for precision)
    'decimal': 'numeric',
    'numeric': 'numeric',

    // String types
    'char': 'char',
    'varchar': 'varchar',
    'tinytext': 'text',
    'text': 'text',
    'mediumtext': 'text',
    'longtext': 'text',

    // Binary types
    'binary': 'bytea',
    'varbinary': 'bytea',
    'tinyblob': 'bytea',
    'blob': 'bytea',
    'mediumblob': 'bytea',
    'longblob': 'bytea',

    // Date/time types
    'date': 'date',
    'datetime': 'timestamp',
    'timestamp': 'timestamp with time zone',
    'time': 'time',
    'year': 'smallint',

    // JSON
    'json': 'jsonb',

    // Spatial/special types
    'geometry': 'text',
    'point': 'point',
    'linestring': 'text',
    'polygon': 'text',

    // Set/Enum (need special handling)
    'set': 'text[]',
    'enum': 'text',
}

export interface MySqlColumn {
    name: string
    type: string
    nullable: boolean
    primaryKey: boolean
    autoIncrement: boolean
    defaultValue?: string | null
    extra?: string
    columnType?: string  // Full type with precision, e.g. "varchar(255)"
}

export interface PostgresColumnDef {
    name: string
    type: string
    nullable: boolean
    primaryKey: boolean
    defaultExpression?: string
}

/**
 * Normalize a MySQL column/table name to lowercase
 */
export function normalizeName(name: string): string {
    // Convert to lowercase and replace any problematic characters
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_')
}

/**
 * Parse MySQL column type to extract base type and parameters
 * e.g., "varchar(255)" -> { baseType: "varchar", params: "(255)" }
 */
function parseColumnType(mysqlType: string): { baseType: string; params: string } {
    const match = mysqlType.toLowerCase().match(/^([a-z]+)(\(.+\))?/)
    if (!match) {
        return {baseType: mysqlType.toLowerCase(), params: ''}
    }
    return {
        baseType: match[1] || mysqlType.toLowerCase(),
        params: match[2] ?? ''
    }
}

/**
 * Map a MySQL column type to PostgreSQL
 */
export function mapMySqlTypeToPostgres(mysqlType: string, columnType?: string): string {
    const fullType = (columnType || mysqlType).toLowerCase().trim()
    const {baseType, params} = parseColumnType(fullType)

    // Check for special case: TINYINT(1) is typically boolean
    if (fullType === 'tinyint(1)' || fullType.startsWith('tinyint(1)')) {
        return 'boolean'
    }

    // Check for BIT(1) as boolean
    if (fullType === 'bit(1)') {
        return 'boolean'
    }

    // Look up the base type first
    let pgType = TYPE_MAPPING[baseType]

    // If not found, try the full type
    if (!pgType) {
        pgType = TYPE_MAPPING[fullType]
    }

    // Default to text if unknown
    if (!pgType) {
        console.warn(`Unknown MySQL type: ${mysqlType} (${columnType}), defaulting to text`)
        return 'text'
    }

    // Apply parameters for types that need them
    if (params) {
        switch (baseType) {
            case 'varchar':
            case 'char':
                // Keep the length
                return `${pgType}${params}`
            case 'decimal':
            case 'numeric':
                // Keep precision and scale
                return `numeric${params}`
            case 'float':
            case 'double':
                // PostgreSQL doesn't use precision for float/double
                return pgType
            default:
                // Most other types don't need params
                return pgType
        }
    }

    return pgType
}

/**
 * Convert a MySQL column definition to PostgreSQL
 */
export function convertColumn(col: MySqlColumn): PostgresColumnDef {
    const pgType = mapMySqlTypeToPostgres(col.type, col.columnType)
    const name = normalizeName(col.name)

    let defaultExpression: string | undefined

    // Handle auto_increment
    if (col.autoIncrement) {
        // For auto-increment, we'll use a sequence (handled separately)
        defaultExpression = undefined
    } else if (col.defaultValue !== undefined && col.defaultValue !== null) {
        // Convert MySQL default values to PostgreSQL
        const mysqlDefault = col.defaultValue

        if (mysqlDefault === 'CURRENT_TIMESTAMP' || mysqlDefault === 'current_timestamp()') {
            defaultExpression = 'now()'
        } else if (pgType === 'boolean') {
            // Convert 0/1 to false/true
            defaultExpression = mysqlDefault === '1' || mysqlDefault === 'true' ? 'true' : 'false'
        } else if (mysqlDefault === 'NULL') {
            defaultExpression = 'NULL'
        } else if (pgType.startsWith('varchar') || pgType === 'text' || pgType.startsWith('char')) {
            // String default
            defaultExpression = `'${mysqlDefault.replace(/'/g, "''")}'`
        } else {
            // Numeric or other defaults
            defaultExpression = mysqlDefault
        }
    }

    return {
        name,
        type: pgType,
        nullable: col.nullable,
        primaryKey: col.primaryKey,
        defaultExpression,
    }
}

/**
 * Generate PostgreSQL CREATE TABLE statement from MySQL columns
 */
export function generateCreateTableSql(
    schemaName: string,
    tableName: string,
    columns: MySqlColumn[],
    primaryKeys: string[]
): string {
    const normalizedTable = normalizeName(tableName)
    const qualifiedName = `"${schemaName}"."${normalizedTable}"`

    const pgColumns = columns.map(col => convertColumn(col))

    const columnDefs = pgColumns.map(col => {
        let def = `    "${col.name}" ${col.type}`

        if (!col.nullable) {
            def += ' NOT NULL'
        }

        if (col.defaultExpression) {
            def += ` DEFAULT ${col.defaultExpression}`
        }

        return def
    })

    // Add primary key constraint if any
    if (primaryKeys.length > 0) {
        const pkCols = primaryKeys.map(pk => `"${normalizeName(pk)}"`).join(', ')
        columnDefs.push(`    PRIMARY KEY (${pkCols})`)
    }

    return `CREATE TABLE ${qualifiedName} (\n${columnDefs.join(',\n')}\n);`
}

/**
 * Generate SQL to fix sequences after data insert (for auto-increment columns)
 */
export function generateFixSequenceSql(
    schemaName: string,
    tableName: string,
    autoIncrementColumn: string
): string {
    const normalizedTable = normalizeName(tableName)
    const normalizedCol = normalizeName(autoIncrementColumn)
    const seqName = `${normalizedTable}_${normalizedCol}_seq`

    return `
-- Create sequence if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = '${schemaName}' AND sequencename = '${seqName}') THEN
        CREATE SEQUENCE "${schemaName}"."${seqName}";
    END IF;
END $$;

-- Set sequence value to max of column
SELECT setval(
    '"${schemaName}"."${seqName}"',
    COALESCE((SELECT MAX("${normalizedCol}") FROM "${schemaName}"."${normalizedTable}"), 1)
);

-- Set column default to use sequence
ALTER TABLE "${schemaName}"."${normalizedTable}" 
    ALTER COLUMN "${normalizedCol}" SET DEFAULT nextval('"${schemaName}"."${seqName}"');
`
}

/**
 * Generate CREATE INDEX statements for common query patterns
 */
export function generateIndexSql(
    schemaName: string,
    tableName: string,
    columns: string[],
    indexName?: string
): string {
    const normalizedTable = normalizeName(tableName)
    const normalizedCols = columns.map(c => `"${normalizeName(c)}"`).join(', ')
    const name = indexName || `idx_${normalizedTable}_${columns.map(normalizeName).join('_')}`

    return `CREATE INDEX IF NOT EXISTS "${name}" ON "${schemaName}"."${normalizedTable}" (${normalizedCols});`
}
