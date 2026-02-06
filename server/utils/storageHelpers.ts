/**
 * Storage Location Helpers
 * 
 * Self-describing predicates for routing queries and caching based on 
 * where connection data is stored.
 * 
 * Storage locations:
 * - 'external': Direct MySQL connection to source database
 * - 'optiqoflow': OptiqoFlow internal PostgreSQL data
 * - 'supabase_synced': MySQL data synced to Supabase PostgreSQL
 */

export type StorageLocation = 'external' | 'optiqoflow' | 'supabase_synced'

/**
 * Data is stored in Supabase PostgreSQL (not external MySQL)
 * Use for: routing queries to internal executor, data transfer eligibility
 */
export function isInternalStorage(loc: string | null | undefined): boolean {
    return loc === 'optiqoflow' || loc === 'supabase_synced'
}

/**
 * Queries should use PostgreSQL syntax (not MySQL)
 * Use for: AI prompt generation, query building
 */
export function isPostgresStorage(loc: string | null | undefined): boolean {
    return loc === 'optiqoflow' || loc === 'supabase_synced'
}

/**
 * Cache is permanent (no auto-invalidation based on table dependencies)
 * External MySQL and synced DBs don't have change detection
 */
export function usePermanentCache(loc: string | null | undefined): boolean {
    return loc === 'external' || loc === 'supabase_synced'
}

/**
 * Requires identifier translation (MySQL backticks → PostgreSQL quotes)
 * Only needed for optiqoflow since queries are built with MySQL syntax
 * but executed in PostgreSQL
 * 
 * Note: supabase_synced does NOT need translation since AI/chart builder
 * now generates native PostgreSQL queries for it
 */
export function requiresIdentifierTranslation(loc: string | null | undefined): boolean {
    return loc === 'optiqoflow'
}

// ============================================================================
// Identifier Wrapping Utilities
// ============================================================================

/**
 * Wrap an identifier for MySQL (using backticks)
 */
export function wrapIdMysql(identifier: string): string {
    return `\`${identifier.replace(/`/g, '``')}\``
}

/**
 * Wrap an identifier for PostgreSQL (using double quotes)
 */
export function wrapIdPostgres(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`
}

/**
 * Wrap an identifier using the appropriate syntax for the storage location.
 * - MySQL/external: backticks (`identifier`)
 * - PostgreSQL/supabase_synced/optiqoflow: double quotes ("identifier")
 * 
 * Use this instead of hardcoded wrapId() functions to generate correct SQL.
 */
export function wrapId(identifier: string, storageLocation: string | null | undefined): string {
    if (isPostgresStorage(storageLocation)) {
        return wrapIdPostgres(identifier)
    }
    return wrapIdMysql(identifier)
}

/**
 * Create a wrapId function bound to a specific storage location.
 * Useful when you need to wrap many identifiers with the same storage location.
 * 
 * @example
 * const wrap = createWrapId('supabase_synced')
 * const sql = `SELECT ${wrap('column')} FROM ${wrap('table')}`
 */
export function createWrapId(storageLocation: string | null | undefined): (identifier: string) => string {
    return (identifier: string) => wrapId(identifier, storageLocation)
}

// ============================================================================
// DBMS Version Helpers
// ============================================================================

/**
 * Check if dbms_version indicates a PostgreSQL database.
 * Use this to determine SQL syntax (identifiers, date functions, etc.)
 */
export function isPostgresDbms(dbmsVersion: string | null | undefined): boolean {
    if (!dbmsVersion) return false
    const normalized = dbmsVersion.toLowerCase()
    return normalized.includes('postgres') || normalized.includes('supabase')
}

/**
 * Determine if SQL should use PostgreSQL syntax based on connection properties.
 * This checks BOTH storage_location and dbms_version:
 * - For supabase_synced/optiqoflow: always PostgreSQL (data runs on Supabase)
 * - For external connections: use dbms_version
 */
export function shouldUsePostgresSyntax(
    storageLocation: string | null | undefined,
    dbmsVersion: string | null | undefined
): boolean {
    // Internal storage always runs on PostgreSQL regardless of source DB version
    if (isPostgresStorage(storageLocation)) {
        return true
    }
    // For external connections, use dbms_version
    return isPostgresDbms(dbmsVersion)
}

/**
 * Create a wrapId function based on connection properties.
 * This is the preferred way to generate SQL with correct identifier quoting.
 * 
 * IMPORTANT: Pass both storageLocation and dbmsVersion to ensure correct syntax,
 * especially for synced connections where dbms_version may be the source database
 * (e.g., MariaDB) but SQL runs on PostgreSQL.
 * 
 * @example
 * const wrap = createWrapIdForDbms('supabase_synced', '10.11.14-MariaDB')
 * const sql = `SELECT ${wrap('column')} FROM ${wrap('table')}`
 * // Uses PostgreSQL double quotes because storage_location is supabase_synced
 */
export function createWrapIdForDbms(
    dbmsVersionOrStorageLocation: string | null | undefined,
    dbmsVersion?: string | null | undefined
): (identifier: string) => string {
    // If only one argument, it could be dbms_version (old behavior) or storage_location
    // Check if first argument is a known storage location
    if (dbmsVersion !== undefined) {
        // Two arguments: first is storageLocation, second is dbmsVersion
        if (shouldUsePostgresSyntax(dbmsVersionOrStorageLocation, dbmsVersion)) {
            return wrapIdPostgres
        }
    } else {
        // One argument: could be either
        // First check if it's a storage location that implies PostgreSQL
        if (isPostgresStorage(dbmsVersionOrStorageLocation)) {
            return wrapIdPostgres
        }
        // Then check if it's a PostgreSQL dbms_version string
        if (isPostgresDbms(dbmsVersionOrStorageLocation)) {
            return wrapIdPostgres
        }
    }
    return wrapIdMysql
}
