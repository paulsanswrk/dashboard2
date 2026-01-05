import { defineEventHandler, readBody } from 'h3'
import Anthropic from '@anthropic-ai/sdk'
import { loadConnectionConfigFromSupabase } from '../../utils/connectionConfig'
import { withMySqlConnectionConfig } from '../../utils/mysqlClient'
import { AuthHelper } from '../../utils/authHelper'
import { CLAUDE_MODEL } from '../../utils/aiConfig'

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
                `SELECT TABLE_NAME as tableName
                 FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE()`
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

    // Include chart types description to help guide groupings/aggregations
    let chartsDescription = ''
    try {
        const chartsDocPath = new URL('../../../../docs/implementation/charts/charts.md', import.meta.url)
        const fs = await import('fs/promises')
        chartsDescription = await fs.readFile(chartsDocPath, 'utf8')
    } catch { }

    const apiKey = process.env.CLAUDE_AI_KEY
    if (!apiKey) {
        throw createError({ statusCode: 500, statusMessage: 'CLAUDE_AI_KEY is not configured' })
    }

    const client = new Anthropic({ apiKey })

    const systemPrompt = `You are an expert BI assistant that creates complete chart solutions using Apache ECharts for MySQL Sakila database.

You are given a database schema (JSON with tables/columns) and a user request describing a chart/report.

Return ONLY a compact JSON object with FOUR fields:
- "sql": A valid MySQL query string that retrieves the needed data
- "explanation": A concise, human-readable description of what the query does
- "chartConfig": A complete ECharts configuration object for visualizing the data
- "chartType": The type of chart to be rendered (pie, bar, line, etc.)

IMPORTANT SQL CONSTRAINTS:
- Use ANSI SQL compatible with MySQL 8
- Only reference tables/columns that exist in the provided schema
- Prefer explicit JOINs with clear join conditions
- Ensure columns in GROUP BY are valid; aggregate non-grouped metrics
- Limit result size appropriately if the user did not specify constraints (e.g., LIMIT 100)
- Avoid destructive operations; SELECT-only
- Use meaningful column aliases that can be used in charts

ECHARTS CONFIGURATION REQUIREMENTS:
- Create a valid ECharts option object with all necessary properties
- Choose appropriate chart types (pie, bar, line, scatter, etc.) based on the data structure
- Include proper titles, legends, tooltips, and formatting
- Ensure the configuration matches the SQL query output structure
- Use a professional color palette
- Make axis labels and legends meaningful

CHART TYPE GUIDELINES:
- For pie/donut charts: Use when SQL returns 2 columns (name, value) - perfect for categorical distributions
- For bar/line charts: Use when SQL returns category column(s) first, then numeric values
- Include appropriate titles, legends, and styling

IMPORTANT: Always include the "chartType" field in your response to specify the chart type (pie, bar, line, etc.). Example: "chartType": "pie". The chartType value will be automatically injected into the series[0].type field for ECharts compatibility.`

    try {
        const response = await client.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 1024,
            temperature: 0.2,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: `Generate SQL for this request:

User Request: "${body.userPrompt}"

Database Schema:
${JSON.stringify(schemaJson, null, 2)}

Charts Description:
${chartsDescription}

Return JSON with fields: sql, explanation`
                }
            ]
        })

        const content = response.content[0].text

        // Parse the JSON response
        let parsed: any
        try {
            // Try direct JSON parsing first
            parsed = JSON.parse(content)
        } catch (e) {
            console.log('Direct JSON parse failed, trying alternative methods...')
            console.log('Raw content:', content.substring(0, 200) + '...')

            // Try to extract JSON from markdown code blocks or other formatting
            const match = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                content.match(/```\s*([\s\S]*?)\s*```/) ||
                content.match(/\{[\s\S]*\}/)

            if (match) {
                let jsonContent = match[1] || match[0]
                console.log('Extracted JSON content:', jsonContent.substring(0, 200) + '...')

                // Fix single quotes in SQL strings within JSON
                jsonContent = jsonContent.replace(/(\w+):\s*'([^']*)'/g, (match, key, value) => {
                    return `${key}: "${value.replace(/"/g, '\\"')}"`
                })

                try {
                    parsed = JSON.parse(jsonContent)
                } catch (e2) {
                    console.log('JSON parse failed after quote fix, trying manual extraction...')
                    // If still failing, try manual extraction of fields
                    const sqlMatch = jsonContent.match(/"sql":\s*"([^"]*(?:\\.[^"]*)*?)"/)
                    const explanationMatch = jsonContent.match(/"explanation":\s*"([^"]*(?:\\.[^"]*)*?)"/)
                    const chartConfigMatch = jsonContent.match(/"chartConfig":\s*(\{[\s\S]*?\})/)

                    if (sqlMatch && explanationMatch) {
                        parsed = {
                            sql: sqlMatch[1].replace(/\\"/g, '"'),
                            explanation: explanationMatch[1].replace(/\\"/g, '"'),
                            chartConfig: chartConfigMatch ? JSON.parse(chartConfigMatch[1]) : null
                        }
                    } else {
                        throw new Error('Failed to parse Claude response as JSON after all attempts')
                    }
                }
            } else {
                throw new Error('Failed to parse Claude response as JSON')
            }
        }

        if (!parsed || typeof parsed.sql !== 'string' || typeof parsed.explanation !== 'string' || !parsed.chartConfig || !parsed.chartType) {
            throw new Error('Claude response missing required fields: sql, explanation, chartConfig, chartType')
        }

        console.log('Claude response:', parsed)

        // Inject chartType into chartConfig for ECharts compatibility
        const chartConfig = { ...parsed.chartConfig }
        if (parsed.chartType && chartConfig.series && Array.isArray(chartConfig.series) && chartConfig.series.length > 0) {
            chartConfig.series[0].type = parsed.chartType
            chartConfig.chartType = parsed.chartType
        }

        return {
            sql: parsed.sql.trim(),
            explanation: parsed.explanation.trim(),
            chartConfig: chartConfig,
            chartType: parsed.chartType,
            usage: response.usage
        }
    } catch (error) {
        console.error('Error generating SQL:', error)
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to generate SQL: ${error.message}`
        })
    }
})
