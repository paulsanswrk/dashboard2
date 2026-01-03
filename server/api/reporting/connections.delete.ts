import { defineEventHandler, getQuery } from 'h3'
import { db } from '~/lib/db'
import { charts, dashboardFilters, dashboardWidgets, dataConnections, datasourceSync, syncQueue } from '~/lib/db/schema'
import { eq, inArray, sql } from 'drizzle-orm'
import { AuthHelper } from '~/server/utils/authHelper'

export interface DeleteConnectionResult {
  success: boolean
  deletedCharts: number
  deletedWidgets: number
  clearedFilters: number
  schemaDropped: boolean
}

export default defineEventHandler(async (event): Promise<DeleteConnectionResult> => {
  const { id, cascadeDelete } = getQuery(event) as { id: string; cascadeDelete?: string }
  const connectionId = Number(id)
  const shouldCascade = cascadeDelete === 'true'

  if (!connectionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  }

  // Verify user has write access to this connection
  const connection = await AuthHelper.requireConnectionAccess(event, connectionId, {
    requireWrite: true,
    columns: 'id, organization_id'
  })

  // Get current user profile for role check
  const ctx = await AuthHelper.requireAuthContext(event)
  const isAdminOrSuperadmin = ctx.role === 'ADMIN' || ctx.role === 'SUPERADMIN'

  // Check if connection is used
  const chartsUsingConnection = await db
    .select({ id: charts.id })
    .from(charts)
    .where(eq(charts.dataConnectionId, connectionId))

  const filtersUsingConnection = await db
    .select({ id: dashboardFilters.id })
    .from(dashboardFilters)
    .where(eq(dashboardFilters.connectionId, connectionId))

  const isUsed = chartsUsingConnection.length > 0 || filtersUsingConnection.length > 0

  // If connection is used and cascade not requested, block deletion
  if (isUsed && !shouldCascade) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Connection is in use. Set cascadeDelete=true to delete with dependencies.'
    })
  }

  // Only admins can cascade delete
  if (shouldCascade && !isAdminOrSuperadmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only Admins and Superadmins can cascade delete connections in use.'
    })
  }

  let deletedCharts = 0
  let deletedWidgets = 0
  let clearedFilters = 0
  let schemaDropped = false

  // Cascade delete if requested
  if (shouldCascade && chartsUsingConnection.length > 0) {
    const chartIds = chartsUsingConnection.map(c => c.id)

    // First, count widgets that will be deleted (for reporting)
    const widgetsToDelete = await db
      .select({ id: dashboardWidgets.id })
      .from(dashboardWidgets)
      .where(inArray(dashboardWidgets.chartId, chartIds))

    deletedWidgets = widgetsToDelete.length

    // Delete charts (widgets cascade via FK ON DELETE CASCADE)
    await db.delete(charts).where(inArray(charts.id, chartIds))
    deletedCharts = chartIds.length
  }

  // Filters will have connection_id set to NULL via FK ON DELETE SET NULL
  // But let's count them for the report
  clearedFilters = filtersUsingConnection.length

  // Clean up data transfer records and schema
  try {
    // Get the sync record to find the schema name
    const [syncRecord] = await db
      .select({ id: datasourceSync.id, targetSchemaName: datasourceSync.targetSchemaName })
      .from(datasourceSync)
      .where(eq(datasourceSync.connectionId, connectionId))
      .limit(1)

    if (syncRecord) {
      // Delete sync queue entries first (foreign key constraint)
      await db.delete(syncQueue).where(eq(syncQueue.syncId, syncRecord.id))

      // Delete the sync record
      await db.delete(datasourceSync).where(eq(datasourceSync.id, syncRecord.id))

      // Drop the PostgreSQL schema with all tables
      if (syncRecord.targetSchemaName) {
        console.log(`🗑️ [CLEANUP] Dropping schema: ${syncRecord.targetSchemaName}`)
        await db.execute(sql.raw(`DROP SCHEMA IF EXISTS "${syncRecord.targetSchemaName}" CASCADE`))
        schemaDropped = true
        console.log(`✅ [CLEANUP] Schema dropped: ${syncRecord.targetSchemaName}`)
      }
    }
  } catch (error: any) {
    console.error(`⚠️ [CLEANUP] Error cleaning up sync data:`, error.message)
    // Continue with connection deletion even if cleanup fails
  }

  // Now delete the connection
  await db
    .delete(dataConnections)
    .where(eq(dataConnections.id, connectionId))

  return {
    success: true,
    deletedCharts,
    deletedWidgets,
    clearedFilters,
    schemaDropped
  }
})

