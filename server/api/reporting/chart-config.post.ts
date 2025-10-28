import { defineEventHandler, readBody } from 'h3'
import OpenAI from 'openai'

type RequestBody = {
  userPrompt: string
  sqlQuery: string
  dataSample?: any[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<RequestBody>(event)
  if (!body?.userPrompt || !body?.sqlQuery) {
    throw createError({ statusCode: 400, statusMessage: 'Missing userPrompt or sqlQuery' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'OPENAI_API_KEY is not configured' })
  }

  const client = new OpenAI({ apiKey })

  const systemPrompt = `You are an expert in creating Apache ECharts configurations for data visualization.

You will be given:
1. A user request describing the desired chart
2. An SQL query that retrieves the data
3. Optionally, a sample of the data structure

You need to create a complete ECharts configuration object that will properly visualize this data.

Return ONLY a valid JSON object representing the ECharts configuration. No markdown, no explanations, just the JSON.

IMPORTANT REQUIREMENTS:
- Create a valid ECharts option object
- Ensure the configuration matches the data structure from the SQL query
- Choose appropriate chart types (pie, bar, line, scatter, etc.) based on the user request
- Include proper titles, legends, tooltips, and formatting
- Handle different data types appropriately (dates, numbers, categories)
- Use reasonable colors and styling
- Make sure axis labels and legends are meaningful

COMMON CHART PATTERNS:
- Pie/Donut charts: Use for categorical distributions
- Bar/Column charts: Use for comparisons and categories
- Line/Area charts: Use for trends and time series
- Scatter plots: Use for correlations between numeric values
- Tables: Use when detailed data listing is needed

Always ensure your configuration is complete and will render properly with ECharts.`

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      max_tokens: 800,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Create an ECharts configuration for this request:

User Request: "${body.userPrompt}"
SQL Query: "${body.sqlQuery}"
${body.dataSample ? `Data Sample: ${JSON.stringify(body.dataSample.slice(0, 3), null, 2)}` : ''}

Generate a complete ECharts option object.`
        }
      ]
    })

    const content = response.choices?.[0]?.message?.content || ''
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response
    let parsed: any
    try {
      // Try direct JSON parsing first
      parsed = JSON.parse(content)
    } catch (e) {
      // Try to extract JSON from markdown code blocks or other formatting
      const match = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/)
      if (match) {
        parsed = JSON.parse(match[1])
      } else {
        // Try to find JSON-like content
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('Failed to parse OpenAI response as JSON')
        }
      }
    }

    // Validate that it's a proper ECharts configuration
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid ECharts configuration generated')
    }

    return {
      chartConfig: parsed,
      usage: response.usage
    }
  } catch (error) {
    console.error('Error generating chart config:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to generate chart configuration: ${error.message}`
    })
  }
})
