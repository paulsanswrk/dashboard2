import { defineEventHandler, readBody } from 'h3'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { generateSqlFromPrompt } from '../../utils/openaiSql'
import { AuthHelper } from '../../utils/authHelper'

type RequestBody = {
  connectionId: number
  userPrompt: string
  datasetId?: string
  // Optional: allow client to provide in-memory schema to override
  schemaJson?: unknown
}

export default defineEventHandler(async (event) => {
  const body = await readBody<RequestBody>(event)
  if (!body?.connectionId || !body?.userPrompt) {
    throw createError({ statusCode: 400, statusMessage: 'Missing connectionId or userPrompt' })
  }

  const connectionData = await AuthHelper.requireConnectionAccess(event, body.connectionId, {
    columns: 'id, organization_id, schema_json'
  })

  // Load schema: prefer provided schemaJson, then saved schema_json, otherwise live introspection
  let schemaJson: unknown = body.schemaJson || connectionData.schema_json

  if (!schemaJson) {
    const cfg = await loadConnectionConfigFromSupabase(event, body.connectionId)
    const live = await withMySqlConnectionConfig(cfg, async (conn) => {
      const [tables] = await conn.query(
        `SELECT TABLE_NAME as tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`
      )
      // Minimal live schema format similar to docs/examples/ddl
      const tableNames = (tables as any[]).map((r) => String(r.tableName))

      // Get all foreign keys for this database
      const [allFks] = await conn.query(
        `SELECT 
           kcu.TABLE_NAME as sourceTable,
           kcu.COLUMN_NAME as sourceColumn,
           kcu.REFERENCED_TABLE_NAME as targetTable,
           kcu.REFERENCED_COLUMN_NAME as targetColumn
         FROM information_schema.KEY_COLUMN_USAGE kcu
         WHERE kcu.TABLE_SCHEMA = DATABASE()
           AND kcu.REFERENCED_TABLE_NAME IS NOT NULL`
      )

      // Group FKs by table
      const fksByTable: Record<string, any[]> = {}
      for (const fk of allFks as any[]) {
        if (!fksByTable[fk.sourceTable]) {
          fksByTable[fk.sourceTable] = []
        }
        fksByTable[fk.sourceTable].push({
          sourceColumn: fk.sourceColumn,
          targetTable: fk.targetTable,
          targetColumn: fk.targetColumn
        })
      }

      const result: any = { tables: [] as any[] }
      for (const tn of tableNames) {
        const [cols] = await conn.query(
          `SELECT COLUMN_NAME as name, DATA_TYPE as type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
          [tn]
        )
        result.tables.push({
          tableId: tn,
          columns: (cols as any[]).map((c) => ({
            name: c.name,
            type: c.type,
            label: c.name,
            isDate: ['date', 'datetime', 'timestamp', 'year'].includes(String(c.type).toLowerCase()),
            fieldId: c.name,
            isString: ['char', 'varchar', 'text'].includes(String(c.type).toLowerCase()),
            isBoolean: ['tinyint', 'bool', 'boolean'].includes(String(c.type).toLowerCase()),
            isNumeric: !['char', 'varchar', 'text', 'blob'].includes(String(c.type).toLowerCase()),
          })),
          primaryKey: [],
          foreignKeys: fksByTable[tn] || []
        })
      }
      return result
    })
    schemaJson = live
  }

  // Include chart types description to help guide groupings/aggregations
  let chartsDescription = ''
  try {
    const chartsDocPath = new URL('../../../../docs/implementation/charts/charts.md', import.meta.url)
    const fs = await import('fs/promises')
    chartsDescription = await fs.readFile(chartsDocPath, 'utf8')
  } catch { }

  const { sql, explanation } = await generateSqlFromPrompt({
    schemaJson,
    userPrompt: body.userPrompt,
    chartTypesDescription: chartsDescription,
  })

  return { sql, explanation }
})


