import {bigint, bigserial, boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid} from 'drizzle-orm/pg-core'
import {relations, sql} from 'drizzle-orm'

// Auth users table (referenced by Supabase auth)
export const authUsers = pgTable('auth.users', {
    id: uuid('id').primaryKey(),
    email: text('email'),
    createdAt: timestamp('created_at', { withTimezone: true }),
})

// Organizations table
export const organizations = pgTable('organizations', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    viewerCount: integer('viewer_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
})

// Profiles table
export const profiles = pgTable('profiles', {
    userId: uuid('user_id').primaryKey().references(() => authUsers.id, { onDelete: 'cascade' }),
    firstName: text('first_name'),
    lastName: text('last_name'),
    role: text('role', { enum: ['SUPERADMIN', 'ADMIN', 'EDITOR', 'VIEWER'] }).notNull(),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    avatarUrl: text('avatar_url'),
    viewerType: text('viewer_type'),
    groupName: text('group_name'),
}, (table) => [
    index('idx_profiles_role').on(table.role),
    index('idx_profiles_organization_id').on(table.organizationId),
    check('profiles_organization_check',
        sql`(role = 'SUPERADMIN' AND organization_id IS NULL)
            OR
            (role IN ('ADMIN', 'EDITOR', 'VIEWER') AND organization_id IS NOT NULL)`),
])

// Viewers table

// Charts table
// Data connections table
export const dataConnections = pgTable('data_connections', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    ownerId: uuid('owner_id').notNull(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    internalName: text('internal_name').notNull(),
    databaseName: text('database_name').notNull(),
    databaseType: text('database_type').notNull(),
    host: text('host').notNull(),
    username: text('username').notNull(),
    password: text('password').notNull(),
    port: integer('port').notNull(),
    jdbcParams: text('jdbc_params'),
    serverTime: text('server_time'),
    useSshTunneling: boolean('use_ssh_tunneling').default(false).notNull(),
    sshAuthMethod: text('ssh_auth_method'),
    sshPort: integer('ssh_port'),
    sshUser: text('ssh_user'),
    sshHost: text('ssh_host'),
    sshPassword: text('ssh_password'),
    sshPrivateKey: text('ssh_private_key'),
    storageLocation: text('storage_location'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    schemaJson: jsonb('schema_json'),
    autoJoinInfo: jsonb('auto_join_info'),
    dbmsVersion: text('dbms_version'),
    customViews: jsonb('custom_views').default(sql`'[]'::jsonb`),
    customFields: jsonb('custom_fields').default(sql`'[]'::jsonb`),
}, (table) => [
    index('data_connections_owner_idx').on(table.ownerId),
    index('data_connections_org_idx').on(table.organizationId),
    index('data_connections_schema_json_gin').on(table.schemaJson),
    index('data_connections_internal_name_idx').on(table.internalName),
    uniqueIndex('data_connections_owner_internal_name_idx').on(table.ownerId, table.internalName),
])

// Datasource sync configuration and status
export const datasourceSync = pgTable('datasource_sync', {
    id: uuid('id').primaryKey().defaultRandom(),
    connectionId: bigint('connection_id', {mode: 'number'}).notNull()
        .references(() => dataConnections.id, {onDelete: 'cascade'}),
    targetSchemaName: text('target_schema_name'),
    syncSchedule: jsonb('sync_schedule'),
    lastSyncAt: timestamp('last_sync_at', {withTimezone: true}),
    nextSyncAt: timestamp('next_sync_at', {withTimezone: true}),
    syncStatus: text('sync_status', {
        enum: ['idle', 'queued', 'syncing', 'completed', 'error']
    }).default('idle').notNull(),
    syncProgress: jsonb('sync_progress').default(sql`'{}'::jsonb`),
    foreignKeyMetadata: jsonb('foreign_key_metadata').default(sql`'[]'::jsonb`),
    syncError: text('sync_error'),
    createdAt: timestamp('created_at', {withTimezone: true}).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).defaultNow().notNull(),
}, (table) => [
    uniqueIndex('idx_datasource_sync_connection_id').on(table.connectionId),
    index('idx_datasource_sync_next_sync_at').on(table.nextSyncAt),
    index('idx_datasource_sync_status').on(table.syncStatus),
])

// Sync queue table for incremental data transfer
export const syncQueue = pgTable('sync_queue', {
    id: uuid('id').primaryKey().defaultRandom(),
    syncId: uuid('sync_id').notNull()
        .references(() => datasourceSync.id, {onDelete: 'cascade'}),
    tableName: text('table_name').notNull(),
    status: text('status', {
        enum: ['pending', 'processing', 'completed', 'error']
    }).notNull().default('pending'),
    lastRowOffset: integer('last_row_offset').default(0),
    totalRows: integer('total_rows'),
    priority: integer('priority').default(0),
    error: text('error'),
    createdAt: timestamp('created_at', {withTimezone: true}).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).defaultNow().notNull(),
}, (table) => [
    index('idx_sync_queue_sync_id').on(table.syncId),
    index('idx_sync_queue_status').on(table.status),
])

// Charts table
export const charts = pgTable('charts', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    ownerEmail: text('owner_email').notNull(),
    ownerId: uuid('owner_id'),
    stateJson: jsonb('state_json').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    dataConnectionId: bigint('data_connection_id', { mode: 'number' }).references(() => dataConnections.id),
    width: integer('width'),
    height: integer('height'),
    thumbnailUrl: text('thumbnail_url'),
}, (table) => [
    index('reporting_reports_owner_email_idx').on(table.ownerEmail),
    index('reporting_reports_owner_id_idx').on(table.ownerId),
    index('idx_charts_data_connection_id').on(table.dataConnectionId),
])

// Dashboards table
export const dashboards = pgTable('dashboards', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    creator: uuid('creator').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
    isPublic: boolean('is_public').default(false).notNull(),
    password: text('password'),
    width: integer('width'),
    height: integer('height'),
    thumbnailUrl: text('thumbnail_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index('idx_dashboards_organization_id').on(table.organizationId),
    index('idx_dashboards_is_public').on(table.isPublic),
])

// Dashboard tabs table
export const dashboardTabs = pgTable('dashboard_tab', {
    id: uuid('id').primaryKey().defaultRandom(),
    dashboardId: uuid('dashboard_id').notNull().references(() => dashboards.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').default(0).notNull(),
    style: jsonb('style').notNull().default(sql`'{}'::jsonb`),
    options: jsonb('options').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index('idx_dashboard_tab_dashboard_id').on(table.dashboardId),
    index('idx_dashboard_tab_position').on(table.dashboardId, table.position),
])

// Unified dashboard widgets (charts, text, images, icons)
export const dashboardWidgets = pgTable('dashboard_widgets', {
    id: uuid('id').primaryKey().defaultRandom(),
    dashboardId: uuid('dashboard_id').notNull().references(() => dashboards.id, { onDelete: 'cascade' }),
    tabId: uuid('tab_id').notNull().references(() => dashboardTabs.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['chart', 'text', 'image', 'icon'] }).notNull(),
    chartId: bigint('chart_id', { mode: 'number' }).references(() => charts.id, { onDelete: 'cascade' }),
    position: jsonb('position').notNull(),
    style: jsonb('style').notNull().default(sql`'{}'::jsonb`),
    configOverride: jsonb('config_override').notNull().default(sql`'{}'::jsonb`),
    zIndex: integer('z_index').notNull().default(0),
    isLocked: boolean('is_locked').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index('dashboard_widgets_tab_idx').on(table.tabId),
    index('dashboard_widgets_dashboard_idx').on(table.dashboardId),
    index('dashboard_widgets_type_idx').on(table.type),
    index('dashboard_widgets_chart_idx').on(table.chartId).where(sql`${table.type} = 'chart'`),
])

// Dashboard filters table
export const dashboardFilters = pgTable('dashboard_filters', {
    id: uuid('id').primaryKey().defaultRandom(),
    dashboardId: uuid('dashboard_id').notNull().references(() => dashboards.id, { onDelete: 'cascade' }),
    connectionId: bigint('connection_id', { mode: 'number' }).references(() => dataConnections.id, { onDelete: 'set null' }),
    fieldId: text('field_id').notNull(),
    fieldTable: text('field_table').notNull(),
    fieldType: text('field_type').notNull(),
    filterName: text('filter_name').notNull(),
    isVisible: boolean('is_visible').notNull().default(true),
    position: integer('position').notNull().default(0),
    filterMode: text('filter_mode').notNull().default('values'),
    config: jsonb('config').notNull().default(sql`'{}'::jsonb`),
    currentValue: jsonb('current_value'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index('idx_dashboard_filters_dashboard_id').on(table.dashboardId),
    index('idx_dashboard_filters_connection_id').on(table.connectionId),
    index('idx_dashboard_filters_position').on(table.dashboardId, table.position),
])

// Reports table
export const reports = pgTable('reports', {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
    reportTitle: text('report_title').notNull(),
    recipients: jsonb('recipients').notNull(),
    emailSubject: text('email_subject').notNull(),
    emailMessage: text('email_message'),
    scope: text('scope', { enum: ['Single Chart', 'Dashboard', 'Single Tab'] }).notNull(),
    timeFrame: text('time_frame', {
        enum: ['As On Dashboard', 'Last 7 Days', 'Last 30 Days', 'Last Quarter']
    }).notNull(),
    formats: jsonb('formats').notNull(),
    interval: text('interval', { enum: ['DAILY', 'WEEKLY', 'MONTHLY'] }).notNull(),
    sendTime: text('send_time').notNull(),
    timezone: text('timezone').notNull(),
    dayOfWeek: jsonb('day_of_week'),
    status: text('status', { enum: ['Active', 'Paused', 'Draft'] }).default('Active').notNull(),
    dashboardId: uuid('dashboard_id').references(() => dashboards.id, { onDelete: 'cascade' }),
    tabId: uuid('tab_id').references(() => dashboardTabs.id, { onDelete: 'cascade' }),
    formatsMetadata: jsonb('formats_metadata'),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),
}, (table) => [
    index('idx_reports_user_id').on(table.userId),
    index('idx_reports_status').on(table.status),
    index('idx_reports_interval').on(table.interval),
    index('idx_reports_dashboard_id').on(table.dashboardId),
    index('idx_reports_tab_id').on(table.tabId),
])

// Email queue table
export const emailQueue = pgTable('email_queue', {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    deliveryStatus: text('delivery_status', {
        enum: ['PENDING', 'SENT', 'FAILED', 'CANCELLED']
    }).default('PENDING').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    errorMessage: text('error_message'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
}, (table) => [
    index('idx_email_queue_report_id').on(table.reportId),
    index('idx_email_queue_scheduled_for').on(table.scheduledFor),
    index('idx_email_queue_delivery_status').on(table.deliveryStatus),
    index('idx_email_queue_cron_lookup').on(table.scheduledFor, table.deliveryStatus),
])

// App log table
export const appLog = pgTable('app_log', {
    id: uuid('id').primaryKey().defaultRandom(),
    time: timestamp('time', { withTimezone: true }).defaultNow(),
    level: text('level', { enum: ['error', 'warn', 'debug'] }).default('debug').notNull(),
    module: text('module'),
    stacktrace: text('stacktrace'),
    request: jsonb('request'),
    response: jsonb('response'),
    userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'set null' }),
    url: text('url'),
    tag: text('tag'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
    index('idx_app_log_level').on(table.level),
    index('idx_app_log_time').on(table.time),
    index('idx_app_log_user_id').on(table.userId),
])

// User groups and memberships
export const userGroups = pgTable('user_groups', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const userGroupMembers = pgTable('user_group_members', {
    groupId: uuid('group_id').notNull().references(() => userGroups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    primaryKey({ columns: [table.groupId, table.userId], name: 'user_group_members_pkey' }),
])

// Dashboard access grants (unified org/user/group)
export const dashboardAccess = pgTable('dashboard_access', {
    id: uuid('id').primaryKey().defaultRandom(),
    dashboardId: uuid('dashboard_id').notNull().references(() => dashboards.id, { onDelete: 'cascade' }),
    targetType: text('target_type', { enum: ['org', 'user', 'group'] }).notNull().default('user'),
    targetUserId: uuid('target_user_id').references(() => authUsers.id, { onDelete: 'cascade' }),
    targetOrgId: uuid('target_org_id').references(() => organizations.id, { onDelete: 'cascade' }),
    targetGroupId: uuid('target_group_id').references(() => userGroups.id, { onDelete: 'cascade' }),
    sharedBy: uuid('shared_by').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
    accessLevel: text('access_level', { enum: ['read', 'edit'] }).notNull().default('read'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index('idx_dashboard_access_dashboard_id').on(table.dashboardId),
    index('idx_dashboard_access_target_user_id').on(table.targetUserId),
    index('idx_dashboard_access_target_org_id').on(table.targetOrgId),
    index('idx_dashboard_access_target_group_id').on(table.targetGroupId),
])

// Relations
export const organizationsRelations = relations(organizations, ({ many, one }) => ({
    profiles: many(profiles),
    createdBy: one(authUsers, {
        fields: [organizations.createdBy],
        references: [authUsers.id],
    }),
}))

export const profilesRelations = relations(profiles, ({ one }) => ({
    organization: one(organizations, {
        fields: [profiles.organizationId],
        references: [organizations.id],
    }),
    user: one(authUsers, {
        fields: [profiles.userId],
        references: [authUsers.id],
    }),
}))


export const dashboardsRelations = relations(dashboards, ({ one, many }) => ({
    creatorUser: one(authUsers, {
        fields: [dashboards.creator],
        references: [authUsers.id],
    }),
    organization: one(organizations, {
        fields: [dashboards.organizationId],
        references: [organizations.id],
    }),
    tabs: many(dashboardTabs),
    filters: many(dashboardFilters),
}))

export const dashboardFiltersRelations = relations(dashboardFilters, ({ one }) => ({
    dashboard: one(dashboards, {
        fields: [dashboardFilters.dashboardId],
        references: [dashboards.id],
    }),
    connection: one(dataConnections, {
        fields: [dashboardFilters.connectionId],
        references: [dataConnections.id],
    }),
}))

export const dashboardTabsRelations = relations(dashboardTabs, ({ one, many }) => ({
    dashboard: one(dashboards, {
        fields: [dashboardTabs.dashboardId],
        references: [dashboards.id],
    }),
    widgets: many(dashboardWidgets),
}))

export const dashboardWidgetsRelations = relations(dashboardWidgets, ({ one }) => ({
    tab: one(dashboardTabs, {
        fields: [dashboardWidgets.tabId],
        references: [dashboardTabs.id],
    }),
    dashboard: one(dashboards, {
        fields: [dashboardWidgets.dashboardId],
        references: [dashboards.id],
    }),
    chart: one(charts, {
        fields: [dashboardWidgets.chartId],
        references: [charts.id],
    }),
}))

export const chartsRelations = relations(charts, ({ many, one }) => ({
    dashboardWidgets: many(dashboardWidgets),
    dataConnection: one(dataConnections, {
        fields: [charts.dataConnectionId],
        references: [dataConnections.id],
    }),
}))

export const reportsRelations = relations(reports, ({ one }) => ({
    user: one(authUsers, {
        fields: [reports.userId],
        references: [authUsers.id],
    }),
    dashboard: one(dashboards, {
        fields: [reports.dashboardId],
        references: [dashboards.id],
    }),
    tab: one(dashboardTabs, {
        fields: [reports.tabId],
        references: [dashboardTabs.id],
    }),
}))

export const datasourceSyncRelations = relations(datasourceSync, ({one, many}) => ({
    connection: one(dataConnections, {
        fields: [datasourceSync.connectionId],
        references: [dataConnections.id],
    }),
    queueItems: many(syncQueue),
}))

export const syncQueueRelations = relations(syncQueue, ({one}) => ({
    sync: one(datasourceSync, {
        fields: [syncQueue.syncId],
        references: [datasourceSync.id],
    }),
}))

export const dataConnectionsRelations = relations(dataConnections, ({many, one}) => ({
    charts: many(charts),
    sync: one(datasourceSync),
}))
