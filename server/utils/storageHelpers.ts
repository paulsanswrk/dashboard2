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
