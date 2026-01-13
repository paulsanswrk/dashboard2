/**
 * Dashboard Filter SQL Injection Utility
 * 
 * This module provides functions to inject WHERE clauses into SQL queries
 * based on dashboard filter overrides. It analyzes the SQL to determine
 * which filters apply and injects them before GROUP BY/ORDER BY/LIMIT.
 */

export interface FilterOverride {
    fieldId: string
    table: string
    type: string // 'text', 'numeric', 'date'
    operator: string // 'equals', 'contains', 'starts_with', etc.
    value: any
    values?: any[]
    connectionId?: number
}

export interface FilterInjectionResult {
    sql: string
    appliedFilters: number
    skippedFilters: number
    skippedReasons: string[]
}

/**
 * Extract table names from SQL query using regex.
 * Handles FROM, JOIN, and common table patterns.
 */
export function extractTablesFromSql(sql: string): string[] {
    const tables: Set<string> = new Set()

    // Normalize SQL: remove comments and extra whitespace
    const normalizedSql = sql
        .replace(/--.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .replace(/\s+/g, ' ')
        .trim()

    // Match FROM clause tables
    // FROM table_name, FROM `table_name`, FROM schema.table_name
    const fromPattern = /\bFROM\s+([`"]?[\w.]+[`"]?(?:\s*(?:AS\s+)?[\w]+)?(?:\s*,\s*[`"]?[\w.]+[`"]?(?:\s*(?:AS\s+)?[\w]+)?)*)/gi
    let match

    while ((match = fromPattern.exec(normalizedSql)) !== null) {
        const tableList = match[1]
        // Split by comma and extract table names
        const tableParts = tableList.split(',')
        for (const part of tableParts) {
            const tableName = extractTableName(part.trim())
            if (tableName) tables.add(tableName.toLowerCase())
        }
    }

    // Match JOIN tables
    // JOIN table_name, LEFT JOIN `table_name`, etc.
    const joinPattern = /\b(?:LEFT|RIGHT|INNER|OUTER|CROSS|FULL)?\s*JOIN\s+([`"]?[\w.]+[`"]?)(?:\s+(?:AS\s+)?[\w]+)?/gi

    while ((match = joinPattern.exec(normalizedSql)) !== null) {
        const tableName = extractTableName(match[1])
        if (tableName) tables.add(tableName.toLowerCase())
    }

    return Array.from(tables)
}

/**
 * Extract clean table name from a table reference (removes backticks, schema prefix, alias).
 */
function extractTableName(tableRef: string): string | null {
    if (!tableRef) return null

    // Remove backticks and quotes
    let clean = tableRef.replace(/[`"]/g, '').trim()

    // Handle AS alias: "table AS t" -> "table"
    const asMatch = clean.match(/^([\w.]+)\s+(?:AS\s+)?[\w]+$/i)
    if (asMatch) {
        clean = asMatch[1]
    }

    // Handle schema.table -> table
    if (clean.includes('.')) {
        const parts = clean.split('.')
        clean = parts[parts.length - 1]
    }

    return clean || null
}

/**
 * Check if a filter should be applied to the given SQL.
 * Returns true if the filter's table is found in the SQL.
 */
export function shouldApplyFilter(sql: string, filter: FilterOverride): boolean {
    if (!filter.table) return false

    const tables = extractTablesFromSql(sql)
    const filterTable = filter.table.toLowerCase()

    return tables.some(t => t === filterTable || t.endsWith('.' + filterTable))
}

/**
 * Escape a value for safe use in SQL.
 */
function escapeValue(value: any, type: string): string {
    if (value === null || value === undefined) {
        return 'NULL'
    }

    if (type === 'numeric') {
        const num = Number(value)
        if (!Number.isFinite(num)) {
            throw new Error(`Invalid numeric value: ${value}`)
        }
        return String(num)
    }

    // For text and date types, escape single quotes
    const str = String(value).replace(/'/g, "''")
    return `'${str}'`
}

/**
 * Build a WHERE condition for a single filter.
 * Uses table-qualified column names for proper resolution.
 */
function buildFilterCondition(filter: FilterOverride): string | null {
    const { fieldId, table, type, operator, value, values } = filter

    // Use table-qualified column name
    const column = table ? `\`${table}\`.\`${fieldId}\`` : `\`${fieldId}\``

    // Handle array values (e.g., multi-select)
    const effectiveValues = values && values.length > 0 ? values : (Array.isArray(value) ? value : [value])

    // Skip empty filters
    if (effectiveValues.length === 0 || (effectiveValues.length === 1 && effectiveValues[0] == null)) {
        return null
    }

    switch (operator) {
        case 'equals':
        case 'equal':
            if (effectiveValues.length === 1) {
                return `${column} = ${escapeValue(effectiveValues[0], type)}`
            }
            const inValues = effectiveValues.map(v => escapeValue(v, type)).join(', ')
            return `${column} IN (${inValues})`

        case 'not_equals':
        case 'not_equal':
            if (effectiveValues.length === 1) {
                return `${column} != ${escapeValue(effectiveValues[0], type)}`
            }
            const notInValues = effectiveValues.map(v => escapeValue(v, type)).join(', ')
            return `${column} NOT IN (${notInValues})`

        case 'contains':
        case 'contain':
            return `${column} LIKE ${escapeValue(`%${effectiveValues[0]}%`, 'text')}`

        case 'not_contains':
        case 'not_contain':
            return `${column} NOT LIKE ${escapeValue(`%${effectiveValues[0]}%`, 'text')}`

        case 'starts_with':
        case 'start_with':
            return `${column} LIKE ${escapeValue(`${effectiveValues[0]}%`, 'text')}`

        case 'ends_with':
        case 'end_with':
            return `${column} LIKE ${escapeValue(`%${effectiveValues[0]}`, 'text')}`

        case 'less_than':
        case 'lt':
            return `${column} < ${escapeValue(effectiveValues[0], type)}`

        case 'less_or_equal':
        case 'lte':
            return `${column} <= ${escapeValue(effectiveValues[0], type)}`

        case 'greater_than':
        case 'gt':
            return `${column} > ${escapeValue(effectiveValues[0], type)}`

        case 'greater_or_equal':
        case 'gte':
            return `${column} >= ${escapeValue(effectiveValues[0], type)}`

        case 'between':
            if (effectiveValues.length >= 2) {
                return `${column} BETWEEN ${escapeValue(effectiveValues[0], type)} AND ${escapeValue(effectiveValues[1], type)}`
            }
            return null

        case 'is_null':
            return `${column} IS NULL`

        case 'is_not_null':
            return `${column} IS NOT NULL`

        default:
            console.warn(`[filter-injection] Unknown operator: ${operator}`)
            return null
    }
}

/**
 * Find the position to inject WHERE/AND clause in SQL.
 * Returns the index right before GROUP BY, HAVING, ORDER BY, LIMIT, or end of query.
 */
function findInjectionPoint(sql: string): { index: number; hasWhere: boolean } {
    const upperSql = sql.toUpperCase()

    // Check if WHERE already exists
    const whereMatch = upperSql.match(/\bWHERE\b/)
    const hasWhere = !!whereMatch

    // Find the first occurrence of GROUP BY, HAVING, ORDER BY, LIMIT, or UNION
    const endKeywords = [
        { keyword: 'GROUP BY', pattern: /\bGROUP\s+BY\b/i },
        { keyword: 'HAVING', pattern: /\bHAVING\b/i },
        { keyword: 'ORDER BY', pattern: /\bORDER\s+BY\b/i },
        { keyword: 'LIMIT', pattern: /\bLIMIT\b/i },
        { keyword: 'UNION', pattern: /\bUNION\b/i },
    ]

    let earliestIndex = sql.length

    for (const { pattern } of endKeywords) {
        const match = sql.match(pattern)
        if (match && match.index !== undefined && match.index < earliestIndex) {
            earliestIndex = match.index
        }
    }

    return { index: earliestIndex, hasWhere }
}

/**
 * Inject filter conditions into an SQL query.
 * Injects WHERE/AND clauses before GROUP BY, ORDER BY, LIMIT, etc.
 * 
 * @param sql Original SQL query
 * @param filters Array of filter overrides to apply
 * @param chartConnectionId The connection ID of the chart (for validation)
 * @returns Result with modified SQL and metadata
 */
export function injectFiltersIntoSql(
    sql: string,
    filters: FilterOverride[],
    chartConnectionId?: number
): FilterInjectionResult {
    const result: FilterInjectionResult = {
        sql: sql,
        appliedFilters: 0,
        skippedFilters: 0,
        skippedReasons: []
    }

    if (!filters || filters.length === 0) {
        return result
    }

    const applicableConditions: string[] = []

    for (const filter of filters) {
        // Check connection ID match (if filter has connectionId)
        if (filter.connectionId !== undefined && chartConnectionId !== undefined) {
            if (filter.connectionId !== chartConnectionId) {
                result.skippedFilters++
                result.skippedReasons.push(`Filter "${filter.fieldId}" skipped: different connection`)
                continue
            }
        }

        // Check if filter's table exists in the SQL
        if (!shouldApplyFilter(sql, filter)) {
            result.skippedFilters++
            result.skippedReasons.push(`Filter "${filter.fieldId}" skipped: table "${filter.table}" not in query`)
            continue
        }

        // Build the condition
        const condition = buildFilterCondition(filter)
        if (condition) {
            applicableConditions.push(condition)
            result.appliedFilters++
        }
    }

    // If no conditions apply, return original SQL
    if (applicableConditions.length === 0) {
        return result
    }

    // Find injection point and build the clause
    const { index, hasWhere } = findInjectionPoint(sql)
    const conditionString = applicableConditions.join(' AND ')

    let prefix: string
    if (hasWhere) {
        // Add to existing WHERE with AND
        prefix = ' AND '
    } else {
        // Start new WHERE clause
        prefix = ' WHERE '
    }

    // If there's an existing WHERE, we need to find where it ends (before GROUP BY etc)
    // and append our conditions there
    if (hasWhere) {
        // Insert before the end keyword
        const beforePart = sql.slice(0, index).trimEnd()
        const afterPart = sql.slice(index)
        result.sql = `${beforePart}${prefix}${conditionString} ${afterPart}`
    } else {
        // Insert WHERE before the end keyword
        const beforePart = sql.slice(0, index).trimEnd()
        const afterPart = sql.slice(index)
        result.sql = `${beforePart}${prefix}${conditionString} ${afterPart}`
    }

    console.log(`[filter-injection] Applied ${result.appliedFilters} filters, skipped ${result.skippedFilters}`)

    return result
}
