import { defineEventHandler, readBody } from 'h3'
import Anthropic from '@anthropic-ai/sdk'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { AuthHelper } from '../../utils/authHelper'
import { CLAUDE_MODEL } from '../../utils/aiConfig'
import { getOptiqoflowSchema } from '../../utils/optiqoflowQuery'
import { db } from '../../../lib/db'
import { organizations } from '../../../lib/db/schema'
import { eq } from 'drizzle-orm'

type RequestBody = {
  connectionId: number
  userPrompt: string
  currentSql?: string
  currentChartType?: string
  currentAppearance?: any
  datasetId?: string
  schemaJson?: unknown
}

export default defineEventHandler(async (event) => {
  const body = await readBody<RequestBody>(event)
  if (!body?.connectionId || !body?.userPrompt) {
    throw createError({ statusCode: 400, statusMessage: 'Missing connectionId or userPrompt' })
  }

  const connectionData = await AuthHelper.requireConnectionAccess(event, body.connectionId, {
    columns: 'id, organization_id, schema_json, dbms_version, database_type, storage_location'
  })

  // Load schema: prefer provided schemaJson, then saved schema_json, otherwise live introspection
  let schemaJson: unknown = body.schemaJson || connectionData.schema_json

  if (!schemaJson) {
    // Check if this is an OptiqoFlow internal data source
    const storageLocation = (connectionData as any).storage_location || 'external'

    if (storageLocation === 'optiqoflow') {
      console.log('[AI Chart Assistant] Using OptiqoFlow data source, fetching schema')

      // Fetch tenantId for the organization
      const org = await db.select({ tenantId: organizations.tenantId })
        .from(organizations)
        .where(eq(organizations.id, (connectionData as any).organization_id))
        .limit(1)
        .then(rows => rows[0])

      const optiqoflowSchemaData = await getOptiqoflowSchema(org?.tenantId || undefined)
      schemaJson = optiqoflowSchemaData
    } else {
      // For MySQL connections, query schema directly
      const cfg = await loadConnectionConfigFromSupabase(event, body.connectionId)
      const live = await withMySqlConnectionConfig(cfg, async (conn) => {
        const [tables] = await conn.query(
          `SELECT TABLE_NAME as tableName
           FROM information_schema.TABLES
           WHERE TABLE_SCHEMA = DATABASE()`
        )
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
            `SELECT COLUMN_NAME as name, DATA_TYPE as type
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?`,
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
  }

  const apiKey = process.env.CLAUDE_AI_KEY
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'CLAUDE_AI_KEY is not configured' })
  }

  // Get DBMS version for SQL dialect guidance
  // For OptiqoFlow and synced sources, use PostgreSQL 15 (Supabase version)
  // Synced MySQL DBs are stored in PostgreSQL, so Claude should generate PG syntax
  const storageLocation = (connectionData as any).storage_location || 'external'
  const dbmsVersion = isPostgresStorage(storageLocation)
    ? 'PostgreSQL 15'
    : (connectionData.dbms_version || 'MySQL 8')

  // All supported chart types
  const supportedChartTypes = [
    'table', 'number', 'column', 'bar', 'stacked', 'line', 'area',
    'pie', 'donut', 'funnel', 'gauge', 'kpi', 'radar', 'scatter',
    'bubble', 'boxplot', 'waterfall', 'treemap', 'sankey', 'pivot', 'wordcloud'
  ]

  const client = new Anthropic({ apiKey })
  const systemPrompt = `You are an expert BI assistant that helps users create and modify data visualizations using Apache ECharts.

You will receive:
1. A user request describing what they want
2. The current SQL query (if any)
3. The current chart type (if any)
4. The current chart configuration (if any)
5. The database schema

Your task is to help the user iteratively build their report by modifying the SQL and chart configuration based on their request.

Return ONLY a compact JSON object with these fields:
- "sql": A valid SQL query string for the data
- "chartConfig": A complete ECharts configuration object
- "title": A short, descriptive title for the chart (max 5-7 words)
- "explanation": A friendly, conversational response explaining what you did (2-3 sentences max)

!!! CRITICAL - STRICT JSON REQUIREMENTS !!!
Your output will be parsed with JSON.parse(). If it contains ANYTHING that is not valid JSON, the entire system will break.

ABSOLUTELY FORBIDDEN - DO NOT USE:
- JavaScript functions (e.g., "symbolSize": function(data) {...} is INVALID)
- Arrow functions (e.g., "formatter": (params) => ... is INVALID)
- Comments (// or /* */)
- Unquoted keys
- Template literals
- Any JavaScript code whatsoever

ONLY these JSON types are allowed: strings, numbers, booleans, arrays, objects, null.

EXAMPLES OF WHAT NOT TO DO:
❌ "symbolSize": function(data) { return Math.sqrt(data[2]); }
❌ "formatter": (params) => params.name
❌ "symbolSize": 10 + 5

CORRECT ALTERNATIVES:
✓ "symbolSize": 10  (use a fixed number)
✓ Omit "formatter" entirely (ECharts has good defaults)
✓ Use "symbolSize": 20 or another reasonable fixed value

SQL CONSTRAINTS:
- Database: ${dbmsVersion}
- Use SQL syntax compatible with the database version above
- Only reference tables/columns that exist in the provided schema
- Prefer explicit JOINs with clear join conditions
- Ensure columns in GROUP BY are valid; aggregate non-grouped metrics
- Limit result size appropriately (e.g., LIMIT 100 for MySQL, FETCH FIRST 100 ROWS for others)
- Avoid destructive operations; SELECT-only
- Use meaningful column aliases that can be used in charts
- If current SQL exists, build upon it based on user's request

AVAILABLE CHART TYPES:
${supportedChartTypes.join(', ')}

CHART TYPE SELECTION - CRITICAL:
When the user explicitly requests a chart type (e.g., "make it a bubble chart", "show as pie"), you MUST use that exact type in series.type.
Our chart types map directly to ECharts series types. Use the EXACT type name from the list above.

IMPORTANT: "bubble" and "scatter" are DIFFERENT chart types in our system:
- "scatter": Use series.type = "scatter" with fixed symbolSize
- "bubble": Use series.type = "bubble" (our system handles this specially)

If user says "bubble chart" → use type: "bubble", NOT type: "scatter"
If user says "scatter chart" → use type: "scatter"

When user doesn't specify a chart type:
- Keep the current chart type if it makes sense for the new data
- Otherwise, choose based on data characteristics:

Chart type guidelines:
- table: Raw data display or detailed breakdowns
- number/kpi: Single aggregated values (e.g., "show total revenue")
- column: Vertical bars comparing categories
- bar: Horizontal bars comparing categories  
- stacked: Composition across categories (stacked bars)
- line/area: Time series and trends
- pie/donut: Proportional distributions (name + value)
- funnel: Conversion/stage progressions
- gauge: Single metrics with min/max ranges
- scatter: X-Y correlations with fixed point sizes
- bubble: X-Y correlations with variable point sizes (3rd dimension)
- radar: Multi-dimensional comparisons
- boxplot: Statistical distributions
- waterfall: Cumulative effect of sequential values
- treemap: Hierarchical data with size encoding
- sankey: Flow/relationship visualization
- pivot: Cross-tabulated data
- wordcloud: Text frequency visualization

ECHARTS CONFIGURATION:
- Create a valid ECharts option object
- For Cartesian charts (column, bar, stacked, line, area, scatter, bubble, boxplot, waterfall): include "xAxis" and "yAxis" with proper "name" properties
- For radial/polar charts (pie, donut, gauge, radar): do NOT include xAxis/yAxis
- For hierarchical charts (treemap, sankey): use appropriate data structures
- Include a "legend" configuration when multiple series exist (e.g., bottom or right aligned)
- Ensure the configuration matches the SQL query output structure
- Use a professional color palette
- If current config exists, modify it based on user's request rather than starting from scratch

CONVERSATIONAL STYLE:
- Be friendly and helpful in your explanation
- Acknowledge what the user asked for
- Mention key changes you made
- Keep it concise (2-3 sentences)`

  try {
    // Build user message with context
    let userMessage = `User Request: "${body.userPrompt}"\n\n`

    if (body.currentSql) {
      userMessage += `Current SQL:\n${body.currentSql}\n\n`
    }

    if (body.currentChartType) {
      userMessage += `Current Chart Type: ${body.currentChartType}\n\n`
    }

    if (body.currentAppearance) {
      userMessage += `Current Chart Appearance:\n${JSON.stringify(body.currentAppearance, null, 2)}\n\n`
    }

    userMessage += `Database Schema:\n${JSON.stringify(schemaJson, null, 2)}\n\n`

    userMessage += `Generate the SQL query and ECharts configuration.`

    console.log('[AI Chart Assistant] User Prompt:', body.userPrompt)
    console.log('[AI Chart Assistant] System Prompt:', systemPrompt)
    console.log('[AI Chart Assistant] User Message:', userMessage)

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    })

    const content = response.content[0].text
    console.log('[AI Chart Assistant] Raw Content:', content)

    // Parse the JSON response
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      console.log('Direct JSON parse failed, trying alternative methods...')

      const match = content.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.match(/```\s*([\s\S]*?)\s*```/) ||
        content.match(/\{[\s\S]*\}/)

      if (match) {
        let jsonContent = match[1] || match[0]
        try {
          parsed = JSON.parse(jsonContent)
        } catch (e2) {
          throw new Error('Failed to parse Claude response as JSON')
        }
      } else {
        throw new Error('Failed to parse Claude response as JSON')
      }
    }

    if (!parsed || typeof parsed.sql !== 'string' || !parsed.chartConfig || typeof parsed.explanation !== 'string') {
      throw new Error('Claude response missing required fields: sql, chartConfig, explanation')
    }

    // Default title if missing
    const chartTitle = parsed.title || 'Chart'

    // Infer chart type from chartConfig
    let chartType = 'table'
    if (parsed.chartConfig.series && Array.isArray(parsed.chartConfig.series) && parsed.chartConfig.series.length > 0) {
      const seriesType = parsed.chartConfig.series[0].type
      if (seriesType) {
        chartType = seriesType === 'doughnut' ? 'donut' : seriesType
      }
    }

    return {
      sql: parsed.sql.trim(),
      chartConfig: parsed.chartConfig,
      chartType: chartType,
      title: chartTitle,
      explanation: parsed.explanation.trim(),
      usage: response.usage
    }
  } catch (error) {
    console.error('Error in AI chart assistant:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to process request: ${error.message}`
    })
  }
})

