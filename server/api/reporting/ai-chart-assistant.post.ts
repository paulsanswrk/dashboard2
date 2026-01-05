import { defineEventHandler, readBody } from 'h3'
import Anthropic from '@anthropic-ai/sdk'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { AuthHelper } from '../../utils/authHelper'
import { CLAUDE_MODEL } from '../../utils/aiConfig'

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
    columns: 'id, organization_id, schema_json'
  })

  // Load schema: prefer provided schemaJson, then saved schema_json, otherwise live introspection
  let schemaJson: unknown = body.schemaJson || connectionData.schema_json

  if (!schemaJson) {
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

  const apiKey = process.env.CLAUDE_AI_KEY
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'CLAUDE_AI_KEY is not configured' })
  }

  const client = new Anthropic({ apiKey })

  // Build context-aware system prompt
  const systemPrompt = `You are an expert BI assistant that helps users create and modify data visualizations using Apache ECharts.

You will receive:
1. A user request describing what they want
2. The current SQL query (if any)
3. The current chart configuration (if any)
4. The database schema

Your task is to help the user iteratively build their report by modifying the SQL and chart configuration based on their request.

Return ONLY a compact JSON object with THREE fields:
- "sql": A valid MySQL query string for the data
- "chartConfig": A complete ECharts configuration object
- "title": A short, descriptive title for the chart (max 5-7 words)
- "explanation": A friendly, conversational response explaining what you did (2-3 sentences max)

IMPORTANT SQL CONSTRAINTS:
- Use ANSI SQL compatible with MySQL 8
- Only reference tables/columns that exist in the provided schema
- Prefer explicit JOINs with clear join conditions
- Ensure columns in GROUP BY are valid; aggregate non-grouped metrics
- Limit result size appropriately (e.g., LIMIT 100)
- Avoid destructive operations; SELECT-only
- Use meaningful column aliases that can be used in charts
- If current SQL exists, build upon it based on user's request

ECHARTS CONFIGURATION REQUIREMENTS:
- Create a valid ECharts option object
- Choose appropriate chart types (pie, bar, line, scatter, etc.) based on the data
- Include a "legend" configuration (e.g., bottom or right aligned)
- Include "xAxis" and "yAxis" configurations with proper "name" properties (e.g., "Revenue ($)", "Year")
- Ensure the configuration matches the SQL query output structure
- Use a professional color palette
- If current config exists, modify it based on user's request rather than starting from scratch

CHART TYPE SELECTION:
- pie/donut: For categorical distributions (2 columns: name, value)
- bar/line/area: For trends and comparisons (category columns first, then numeric values)
- scatter: For correlations between numeric values
- gauge: For single KPI values

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

