/**
 * Drizzle schema definitions for tenants schema
 * Multi-tenant data isolation tables
 */

import { pgSchema, pgTable, text, timestamp, uuid, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core'

// Create tenants schema
export const tenantsSchema = pgSchema('tenants')

/**
 * Tenant Column Access
 * Tracks which columns each tenant has access to per table
 */
export const tenantColumnAccess = tenantsSchema.table('tenant_column_access', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    tableName: text('table_name').notNull(),
    columns: text('columns').array().notNull(),
    lastPushAt: timestamp('last_push_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
    index('idx_column_access_tenant').on(table.tenantId),
    index('idx_column_access_table').on(table.tableName),
    uniqueIndex('idx_column_access_tenant_table').on(table.tenantId, table.tableName),
])

/**
 * Tenant Data Push Log
 * Logs data pushes for cache invalidation timing
 */
export const tenantDataPushLog = tenantsSchema.table('tenant_data_push_log', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    pushId: uuid('push_id').notNull(),
    affectedTables: text('affected_tables').array().notNull(),
    pushedAt: timestamp('pushed_at', { withTimezone: true }).notNull(),
    recordCounts: jsonb('record_counts').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
    index('idx_push_log_tenant_time').on(table.tenantId, table.pushedAt),
    index('idx_push_log_push_id').on(table.pushId),
])
