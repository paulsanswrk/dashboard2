/**
 * Sanitize Chart State Utility
 * 
 * Strips sensitive and redundant fields from chart state_json before sending to clients.
 * This prevents exposure of raw SQL queries and other internal implementation details.
 */

/**
 * Fields that should be stripped from the chart state for security/privacy.
 * These contain raw SQL or internal implementation details.
 */
const SENSITIVE_FIELDS = [
    'actualExecutedSql',
    'sqlText',
    'actualExecutedSqlParams',
    'sqlParams',
    'overrideSql',
    'useSql',
] as const

/**
 * Fields to keep from the internal object (these are needed for chart rendering).
 */
const KEEP_FROM_INTERNAL = [
    'dataConnectionId',
    'xDimensions',
    'yMetrics',
    'breakdowns',
    'filters',
    'joins',
    'excludeNullsInDimensions',
] as const

/**
 * Sanitizes chart state by removing sensitive fields while preserving
 * fields needed for chart rendering.
 * 
 * @param stateJson - The raw state_json from the charts table
 * @returns Sanitized state safe for client transmission
 */
export function sanitizeChartState(stateJson: Record<string, unknown> | null | undefined): Record<string, unknown> {
    if (!stateJson) {
        return {}
    }

    const result: Record<string, unknown> = {}

    // Copy top-level fields (excluding 'internal')
    for (const [key, value] of Object.entries(stateJson)) {
        if (key === 'internal') continue
        if (SENSITIVE_FIELDS.includes(key as any)) continue
        result[key] = value
    }

    // Extract safe fields from internal object
    const internal = stateJson.internal as Record<string, unknown> | undefined
    if (internal) {
        for (const field of KEEP_FROM_INTERNAL) {
            if (field in internal) {
                result[field] = internal[field]
            }
        }
    }

    return result
}

/**
 * Extracts the data connection ID from chart state.
 * Handles both flattened and nested internal structures.
 */
export function extractDataConnectionId(stateJson: Record<string, unknown> | null | undefined): number | null {
    if (!stateJson) return null

    // Check top-level first
    if (typeof stateJson.dataConnectionId === 'number') {
        return stateJson.dataConnectionId
    }

    // Check internal object
    const internal = stateJson.internal as Record<string, unknown> | undefined
    if (internal && typeof internal.dataConnectionId === 'number') {
        return internal.dataConnectionId
    }

    return null
}

/**
 * Extracts the SQL query from chart state.
 * Used for cache key generation (server-side only).
 */
export function extractSqlFromState(stateJson: Record<string, unknown> | null | undefined): string | null {
    if (!stateJson) return null

    const internal = stateJson.internal as Record<string, unknown> | undefined

    // Prefer actualExecutedSql, fall back to sqlText
    const sql = internal?.actualExecutedSql || internal?.sqlText ||
        stateJson.actualExecutedSql || stateJson.sqlText

    return typeof sql === 'string' ? sql : null
}
