/**
 * Chart Cache Utilities
 * 
 * Handles chart data caching, invalidation, and dependency tracking
 */

import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

/**
 * Generates a cache key from chart ID and query parameters
 */
export function generateCacheKey(chartId: number, params: Record<string, unknown>): string {
    const normalized = JSON.stringify(params, Object.keys(params).sort())
    return createHash('sha256').update(`${chartId}:${normalized}`).digest('hex')
}

/**
 * Gets cached chart data if valid
 */
export async function getCachedChartData(
    supabase: ReturnType<typeof createClient>,
    chartId: number,
    tenantId: string,
    cacheKey: string
): Promise<{ data: unknown; hit: boolean } | null> {
    const { data, error } = await supabase
        .from('chart_data_cache')
        .select('cached_data, cached_at')
        .eq('chart_id', chartId)
        .eq('tenant_id', tenantId)
        .eq('cache_key', cacheKey)
        .eq('is_valid', true)
        .maybeSingle()

    if (error || !data) {
        return null
    }

    return { data: data.cached_data, hit: true }
}

/**
 * Stores chart data in cache
 */
export async function setCachedChartData(
    supabase: ReturnType<typeof createClient>,
    chartId: number,
    tenantId: string,
    cacheKey: string,
    data: unknown,
    sourceTables: string[],
    queryDurationMs?: number
): Promise<boolean> {
    const rowCount = Array.isArray(data) ? data.length : 1

    const { error } = await supabase
        .from('chart_data_cache')
        .upsert({
            chart_id: chartId,
            tenant_id: tenantId,
            cache_key: cacheKey,
            cached_data: data,
            row_count: rowCount,
            source_tables: sourceTables,
            query_duration_ms: queryDurationMs,
            cached_at: new Date().toISOString(),
            is_valid: true,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'chart_id,tenant_id,cache_key',
        })

    if (error) {
        console.error('Failed to cache chart data:', error)
        return false
    }

    return true
}

/**
 * Invalidates cache for specific tables and tenant
 */
export async function invalidateCacheForTables(
    supabase: ReturnType<typeof createClient>,
    tenantId: string,
    tableNames: string[]
): Promise<number> {
    // Use the SQL function for efficient invalidation
    const { data, error } = await supabase
        .rpc('invalidate_chart_cache_for_tables', {
            p_tenant_id: tenantId,
            p_table_names: tableNames,
        })

    if (error) {
        console.error('Failed to invalidate cache:', error)
        return 0
    }

    return data ?? 0
}

/**
 * Updates chart cache status
 */
export async function updateChartCacheStatus(
    supabase: ReturnType<typeof createClient>,
    chartId: number,
    status: 'cached' | 'stale' | 'dynamic' | 'unknown',
    hasDynamicFilter?: boolean
): Promise<boolean> {
    const updateData: Record<string, unknown> = { cache_status: status }
    if (hasDynamicFilter !== undefined) {
        updateData.has_dynamic_filter = hasDynamicFilter
    }

    const { error } = await supabase
        .from('charts')
        .update(updateData)
        .eq('id', chartId)

    if (error) {
        console.error('Failed to update chart cache status:', error)
        return false
    }

    return true
}

/**
 * Upserts chart table dependencies
 */
export async function upsertChartDependencies(
    supabase: ReturnType<typeof createClient>,
    chartId: number,
    tables: Array<{ name: string; schema?: string; type?: string }>
): Promise<boolean> {
    // Delete existing dependencies
    await supabase
        .from('chart_table_dependencies')
        .delete()
        .eq('chart_id', chartId)

    // Insert new dependencies
    if (tables.length > 0) {
        const records = tables.map(t => ({
            chart_id: chartId,
            table_name: t.name,
            schema_name: t.schema ?? 'optiqoflow',
            dependency_type: t.type ?? 'query',
        }))

        const { error } = await supabase
            .from('chart_table_dependencies')
            .insert(records)

        if (error) {
            console.error('Failed to upsert chart dependencies:', error)
            return false
        }
    }

    return true
}

/**
 * Gets chart dependencies (tables used by a chart)
 */
export async function getChartDependencies(
    supabase: ReturnType<typeof createClient>,
    chartId: number
): Promise<string[]> {
    const { data, error } = await supabase
        .from('chart_table_dependencies')
        .select('table_name')
        .eq('chart_id', chartId)

    if (error || !data) {
        return []
    }

    return data.map(d => d.table_name)
}

/**
 * Extracts table names from chart stateJson
 */
export function extractTablesFromStateJson(stateJson: Record<string, unknown>): string[] {
    const tables = new Set<string>()

    // Helper to extract from an object at any level
    const extractFromObject = (obj: Record<string, unknown>) => {
        // Extract from selectedColumns
        const selectedColumns = obj.selectedColumns as Array<{ table?: string }> | undefined
        if (Array.isArray(selectedColumns)) {
            selectedColumns.forEach(col => {
                if (col.table) tables.add(col.table)
            })
        }

        // Extract from xDimensions (used in chart builder)
        const xDimensions = obj.xDimensions as Array<{ table?: string }> | undefined
        if (Array.isArray(xDimensions)) {
            xDimensions.forEach(dim => {
                if (dim.table) tables.add(dim.table)
            })
        }

        // Extract from yMetrics (used in chart builder)
        const yMetrics = obj.yMetrics as Array<{ table?: string }> | undefined
        if (Array.isArray(yMetrics)) {
            yMetrics.forEach(metric => {
                if (metric.table) tables.add(metric.table)
            })
        }

        // Extract from breakdowns (used in chart builder)
        const breakdowns = obj.breakdowns as Array<{ table?: string }> | undefined
        if (Array.isArray(breakdowns)) {
            breakdowns.forEach(b => {
                if (b.table) tables.add(b.table)
            })
        }

        // Extract from filters
        const filters = obj.filters as Array<{ table?: string }> | undefined
        if (Array.isArray(filters)) {
            filters.forEach(f => {
                if (f.table) tables.add(f.table)
            })
        }

        // Extract from joins
        const joins = obj.joins as Array<{ leftTable?: string; rightTable?: string }> | undefined
        if (Array.isArray(joins)) {
            joins.forEach(j => {
                if (j.leftTable) tables.add(j.leftTable)
                if (j.rightTable) tables.add(j.rightTable)
            })
        }

        // Extract from table field
        if (typeof obj.table === 'string') {
            tables.add(obj.table)
        }

        // Extract from selectedDatasetId (the primary table)
        if (typeof obj.selectedDatasetId === 'string') {
            tables.add(obj.selectedDatasetId)
        }
    }

    // Extract from top level
    extractFromObject(stateJson)

    // Also extract from internal structure (state_json stores public + internal)
    const internal = stateJson.internal as Record<string, unknown> | undefined
    if (internal && typeof internal === 'object') {
        extractFromObject(internal)
    }

    return Array.from(tables)
}

/**
 * Detects if chart has dynamic (relative date) filters
 */
export function hasRelativeDateFilters(stateJson: Record<string, unknown>): boolean {
    const filters = stateJson.filters as Array<{
        filterType?: string
        operator?: string
        value?: unknown
    }> | undefined

    if (!Array.isArray(filters)) return false

    return filters.some(f => {
        // Check for relative date operators
        if (f.operator && ['last_n_days', 'last_n_weeks', 'last_n_months', 'this_week', 'this_month', 'today', 'yesterday'].includes(f.operator)) {
            return true
        }
        // Check for dynamic filter type
        if (f.filterType === 'relative' || f.filterType === 'dynamic') {
            return true
        }
        return false
    })
}
