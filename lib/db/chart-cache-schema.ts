/**
 * Drizzle schema definitions for chart data caching
 * Chart cache and table dependencies
 */

import { pgTable, text, timestamp, uuid, jsonb, index, uniqueIndex, boolean, integer, bigint } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { charts } from './schema'

/**
 * Chart Table Dependencies
 * Tracks which tables each chart queries (for cache invalidation)
 */
export const chartTableDependencies = pgTable('chart_table_dependencies', {
    id: uuid('id').primaryKey().defaultRandom(),
    chartId: bigint('chart_id', { mode: 'number' }).notNull().references(() => charts.id, { onDelete: 'cascade' }),
    tableName: text('table_name').notNull(),
    schemaName: text('schema_name').default('optiqoflow'),
    dependencyType: text('dependency_type').default('query'), // 'query', 'join', 'subquery'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
    index('idx_deps_table').on(table.tableName),
    index('idx_deps_chart').on(table.chartId),
    index('idx_deps_schema_table').on(table.schemaName, table.tableName),
    uniqueIndex('idx_deps_chart_table_schema').on(table.chartId, table.tableName, table.schemaName),
])

/**
 * Chart Data Cache
 * Stores pre-computed chart query results
 */
export const chartDataCache = pgTable('chart_data_cache', {
    id: uuid('id').primaryKey().defaultRandom(),
    chartId: bigint('chart_id', { mode: 'number' }).notNull().references(() => charts.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),
    cacheKey: text('cache_key').notNull(),       // Hash of query parameters + filters
    cachedData: jsonb('cached_data').notNull(),  // The actual chart data
    rowCount: integer('row_count'),

    // Cache validity
    cachedAt: timestamp('cached_at', { withTimezone: true }).defaultNow().notNull(),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    isValid: boolean('is_valid').default(true),

    // Dependencies for invalidation
    sourceTables: text('source_tables').array().notNull(),
    lastDataPushAt: timestamp('last_data_push_at', { withTimezone: true }),

    // Metadata
    queryDurationMs: integer('query_duration_ms'),
    compressed: boolean('compressed').default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
    index('idx_cache_chart_tenant').on(table.chartId, table.tenantId),
    index('idx_cache_valid').on(table.isValid),
    index('idx_cache_tenant').on(table.tenantId),
    uniqueIndex('idx_cache_chart_tenant_key').on(table.chartId, table.tenantId, table.cacheKey),
])

// Relations
export const chartTableDependenciesRelations = relations(chartTableDependencies, ({ one }) => ({
    chart: one(charts, {
        fields: [chartTableDependencies.chartId],
        references: [charts.id],
    }),
}))

export const chartDataCacheRelations = relations(chartDataCache, ({ one }) => ({
    chart: one(charts, {
        fields: [chartDataCache.chartId],
        references: [charts.id],
    }),
}))
