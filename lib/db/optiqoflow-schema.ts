/**
 * Drizzle ORM Schema for OptiqoFlow synchronized data
 * 
 * All tables are in the 'optiqoflow' schema - separate from the main 'public' schema.
 * Non-essential fields are optional to handle column-level sync configuration (v1.2.0+).
 */
import {
    pgSchema,
    uuid,
    text,
    timestamp,
    integer,
    boolean,
    numeric,
    jsonb,
    date,
    time,
    bigint,
    smallint,
    index,
    uniqueIndex,
    serial,
} from 'drizzle-orm/pg-core'

// Define the optiqoflow schema
export const optiqoflow = pgSchema('optiqoflow')

// ============================================
// INFRASTRUCTURE TABLES
// ============================================

export const webhookLogs = optiqoflow.table('webhook_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    operation: text('operation'),
    tableName: text('table_name'),
    targetTable: text('target_table'),
    tenantId: uuid('tenant_id'),
    success: boolean('success'),
    errorMessage: text('error_message'),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
    index('idx_webhook_logs_created').on(table.createdAt),
])

export const syncSummary = optiqoflow.table('sync_summary', {
    id: uuid('id').primaryKey().defaultRandom(),
    syncId: uuid('sync_id').notNull(),
    syncType: text('sync_type').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    tableName: text('table_name').notNull(),
    operation: text('operation').notNull(),
    recordCount: integer('record_count').notNull().default(0),
    primaryKeys: uuid('primary_keys').array(),
    primaryKeysOverflow: boolean('primary_keys_overflow').default(false),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    success: boolean('success').default(true),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
    index('idx_sync_summary_sync_id').on(table.syncId),
    index('idx_sync_summary_tenant').on(table.tenantId, table.createdAt),
    index('idx_sync_summary_table').on(table.tableName, table.createdAt),
])

export const tableRelationships = optiqoflow.table('table_relationships', {
    id: serial('id').primaryKey(),
    sourceTable: text('source_table').notNull(),
    sourceColumn: text('source_column').notNull(),
    targetTable: text('target_table').notNull(),
    targetColumn: text('target_column').notNull(),
    relationshipType: text('relationship_type').notNull(),
    description: text('description'),
}, (table) => [
    index('idx_relationships_source').on(table.sourceTable),
    index('idx_relationships_target').on(table.targetTable),
])

// ============================================
// ORGANIZATION
// ============================================

export const tenants = optiqoflow.table('tenants', {
    id: uuid('id').primaryKey(),
    name: text('name'),
})

// ============================================
// OPERATIONS
// ============================================

export const workOrders = optiqoflow.table('work_orders', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    workOrderNumber: text('work_order_number'),
    title: text('title'),
    description: text('description'),
    status: text('status'),
    priority: text('priority'),
    category: text('category'),
    cleaningCategory: text('cleaning_category'),
    roomId: uuid('room_id'),
    roomName: text('room_name'),
    siteId: uuid('site_id'),
    siteName: text('site_name'),
    assignedUserIds: uuid('assigned_user_ids').array(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    actualDurationMinutes: integer('actual_duration_minutes'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (table) => [
    index('idx_work_orders_tenant').on(table.tenantId),
    index('idx_work_orders_status').on(table.status),
])

export const attendanceEvents = optiqoflow.table('attendance_events', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    personnelId: uuid('personnel_id'),
    personnelName: text('personnel_name'),
    eventType: text('event_type'),
    eventTimestamp: timestamp('event_timestamp', { withTimezone: true }),
    locationId: uuid('location_id'),
    locationName: text('location_name'),
    status: text('status'),
    workTimeMinutes: integer('work_time_minutes'),
    createdAt: timestamp('created_at', { withTimezone: true }),
}, (table) => [
    index('idx_attendance_tenant').on(table.tenantId),
    index('idx_attendance_timestamp').on(table.eventTimestamp),
])

// ============================================
// DEVICES & IOT
// ============================================

export const devices = optiqoflow.table('devices', {
    id: uuid('id').primaryKey(),
    imei: text('imei'),
    deviceType: text('device_type'),
    status: text('status'),
    firmware: text('firmware'),
    batteryPercent: smallint('battery_percent'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (table) => [
    uniqueIndex('idx_devices_imei').on(table.imei),
])

export const deviceMeasurements = optiqoflow.table('device_measurements', {
    id: bigint('id', { mode: 'number' }).primaryKey(),
    deviceId: uuid('device_id').notNull(),
    ts: timestamp('ts', { withTimezone: true }),
    pir: integer('pir'),
    batteryPercent: smallint('battery_percent'),
    rssiDbm: smallint('rssi_dbm'),
    visitorsDay: integer('visitors_day'),
    visitorsWeek: integer('visitors_week'),
    createdAt: timestamp('created_at', { withTimezone: true }),
}, (table) => [
    index('idx_measurements_device').on(table.deviceId),
    index('idx_measurements_ts').on(table.ts),
])

export const deviceMeasurementsDaily = optiqoflow.table('device_measurements_daily', {
    id: uuid('id').primaryKey(),
    deviceId: uuid('device_id').notNull(),
    measurementDate: date('measurement_date'),
    totalPir: integer('total_pir'),
    avgPir: numeric('avg_pir'),
    maxPir: integer('max_pir'),
    measurementCount: integer('measurement_count'),
    createdAt: timestamp('created_at', { withTimezone: true }),
})

// ============================================
// LOCATIONS
// ============================================

export const sites = optiqoflow.table('sites', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    customerId: uuid('customer_id'),
    contractId: uuid('contract_id'),
    name: text('name'),
    address: jsonb('address'),
    geofence: jsonb('geofence'),
    serviceWindows: jsonb('service_windows'),
    accessRequirements: jsonb('access_requirements'),
    siteType: text('site_type'),
    status: text('status'),
    siteCode: text('site_code'),
    parkingInstructions: text('parking_instructions'),
    specialNotes: text('special_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (table) => [
    index('idx_sites_tenant').on(table.tenantId),
])

export const rooms = optiqoflow.table('rooms', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name'),
    roomNumber: text('room_number'),
    floor: text('floor'),
    zoneCategoryId: uuid('zone_category_id'),
    patientStatus: text('patient_status'),
    lastCleanedAt: timestamp('last_cleaned_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (table) => [
    index('idx_rooms_tenant').on(table.tenantId),
])

export const zones = optiqoflow.table('zones', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    siteId: uuid('site_id'),
    name: text('name'),
    zoneType: text('zone_type'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
})

// ============================================
// QUALITY & INSPECTIONS
// ============================================

export const qualityInspections = optiqoflow.table('quality_inspections', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    inspectionNumber: text('inspection_number'),
    siteId: uuid('site_id'),
    contractId: uuid('contract_id'),
    zoneId: uuid('zone_id'),
    inspectorId: uuid('inspector_id'),
    inspectionDate: date('inspection_date'),
    inspectionCategory: text('inspection_category'),
    status: text('status'),
    overallScore: numeric('overall_score'),
    isPassed: boolean('is_passed'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    name: text('name'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (table) => [
    index('idx_quality_inspections_tenant').on(table.tenantId),
])

// ============================================
// USERS & TEAMS
// ============================================

export const profiles = optiqoflow.table('profiles', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id'),
    email: text('email'),
    fullName: text('full_name'),
    role: text('role'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
})

export const teams = optiqoflow.table('teams', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name'),
    teamLeadId: uuid('team_lead_id'),
    isActive: boolean('is_active').default(true),
    activeContracts: integer('active_contracts'), // Note: INTEGER, not uuid[]!
    skills: text('skills').array(),
    coverageAreas: text('coverage_areas').array(),
    schedulePattern: text('schedule_pattern'),
    completionRate: numeric('completion_rate'),
    supervisorProfileId: uuid('supervisor_profile_id'),
    emergencyContactPhone: text('emergency_contact_phone'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (table) => [
    index('idx_teams_tenant').on(table.tenantId),
])

export const teamMembers = optiqoflow.table('team_members', {
    id: uuid('id').primaryKey(),
    teamId: uuid('team_id').notNull(),
    profileId: uuid('profile_id').notNull(),
    role: text('role'),
    createdAt: timestamp('created_at', { withTimezone: true }),
})

// ============================================
// CUSTOMERS & CONTRACTS
// ============================================

export const customers = optiqoflow.table('customers', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name'),
    customerCode: text('customer_code'),
    category: text('category'),
    status: text('status'),
    billingEmail: text('billing_email'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
})

export const contracts = optiqoflow.table('contracts', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    customerId: uuid('customer_id'),
    name: text('name'),
    contractNumber: text('contract_number'),
    contractType: text('contract_type'),
    status: text('status'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
})

// ============================================
// FEEDBACK
// ============================================

export const roomFeedback = optiqoflow.table('room_feedback', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    roomId: uuid('room_id'),
    qrCodeId: uuid('qr_code_id'),
    rating: integer('rating'),
    satisfactionLevel: text('satisfaction_level'),
    feedbackText: text('feedback_text'),
    feedbackCategory: text('feedback_category'),
    photoUrls: text('photo_urls').array(),
    createdWorkOrder: boolean('created_work_order').default(false),
    workOrderId: uuid('work_order_id'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
}, (table) => [
    index('idx_room_feedback_tenant').on(table.tenantId),
])

// ============================================
// HEALTHCARE
// ============================================

export const healthcareMetrics = optiqoflow.table('healthcare_metrics', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    metricDate: date('metric_date'),
    totalRoomsCleaned: integer('total_rooms_cleaned'),
    checkoutCleaningsCompleted: integer('checkout_cleanings_completed'),
    infectionCleaningsCompleted: integer('infection_cleanings_completed'),
    averageCleaningTimeMinutes: integer('average_cleaning_time_minutes'),
    protocolComplianceRate: numeric('protocol_compliance_rate'),
    createdAt: timestamp('created_at', { withTimezone: true }),
})

// ============================================
// SCHEDULING
// ============================================

export const schedules = optiqoflow.table('schedules', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name'),
    scheduleType: text('schedule_type'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
})

export const scheduleAssignments = optiqoflow.table('schedule_assignments', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    scheduleId: uuid('schedule_id'),
    userId: uuid('user_id'),
    roomId: uuid('room_id'),
    siteId: uuid('site_id'),
    assignmentDate: date('assignment_date'),
    startTime: time('start_time'),
    endTime: time('end_time'),
    status: text('status'),
    createdAt: timestamp('created_at', { withTimezone: true }),
}, (table) => [
    index('idx_schedule_assignments_tenant').on(table.tenantId),
    index('idx_schedule_assignments_date').on(table.assignmentDate),
])

// ============================================
// CHECKLISTS
// ============================================

export const checklistCompletions = optiqoflow.table('checklist_completions', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    assignmentId: uuid('assignment_id'),
    roomId: uuid('room_id'),
    completedBy: uuid('completed_by'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }),
})

export const issueReports = optiqoflow.table('issue_reports', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    title: text('title'),
    description: text('description'),
    status: text('status'),
    priority: text('priority'),
    reportedBy: uuid('reported_by'),
    roomId: uuid('room_id'),
    siteId: uuid('site_id'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
})

export const inspectionRooms = optiqoflow.table('inspection_rooms', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    inspectionId: uuid('inspection_id'),
    roomId: uuid('room_id'),
    overallResult: text('overall_result'),
    floorsResult: text('floors_result'),
    fixturesResult: text('fixtures_result'),
    ceilingResult: text('ceiling_result'),
    createdAt: timestamp('created_at', { withTimezone: true }),
})

export const staffAvailability = optiqoflow.table('staff_availability', {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id'),
    date: date('date'),
    status: text('status'),
    startTime: time('start_time'),
    endTime: time('end_time'),
    createdAt: timestamp('created_at', { withTimezone: true }),
})
