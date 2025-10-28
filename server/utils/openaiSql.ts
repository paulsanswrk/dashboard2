import OpenAI from 'openai'

export type SqlGenerationInput = {
    schemaJson: unknown
    userPrompt: string
    chartTypesDescription?: string
}

export type SqlGenerationResult = {
    sql: string
    explanation: string
}

const defaultModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'

export async function generateSqlFromPrompt(input: SqlGenerationInput): Promise<SqlGenerationResult> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured')
    }

    const client = new OpenAI({apiKey})

    const system = [
        'You are an expert BI assistant that writes safe, efficient SQL for MySQL-compatible databases.',
        'You are given a database schema (JSON with tables/columns) and a user request describing a report.',
        'Return ONLY a compact JSON object with two fields: sql (string) and explanation (string).',
        'The explanation must be a concise, human-readable description of tables/fields/operations used.',
        'Important SQL constraints:',
        '- Use ANSI SQL compatible with MySQL 8.',
        '- Only reference tables/columns that exist in the provided schema.',
        '- Prefer explicit JOINs with clear join conditions.',
        '- Ensure columns in GROUP BY are valid; aggregate non-grouped metrics.',
        '- Limit result size appropriately if the user did not specify constraints (e.g., LIMIT 100).',
        '- Avoid destructive operations; SELECT-only.',
    ].join('\n')

    const user = JSON.stringify({
        schema: input.schemaJson,
        prompt: input.userPrompt,
        charts: input.chartTypesDescription || '',
    })

    // Use responses API for structured JSON output
    const response = await client.chat.completions.create({
        model: defaultModel,
        max_tokens: 150,
        temperature: 0.2,
        messages: [
            {role: 'system', content: system},
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: [
                            'Produce a strict JSON with shape { "sql": string, "explanation": string }.',
                            'If report is ambiguous, make reasonable defaults and note them in explanation.',
                            'Input payload follows:',
                            user,
                        ].join('\n')
                    }
                ]
            }
        ]
    })

    const content = response.choices?.[0]?.message?.content || ''
    let parsed: any
    try {
        parsed = JSON.parse(content)
    } catch (e) {
        // Try to extract JSON from possible markdown fences
        const match = content.match(/[\{\[].*[\}\]]/s)
        if (!match) throw new Error('Failed to parse OpenAI response as JSON')
        parsed = JSON.parse(match[0])
    }

    if (!parsed || typeof parsed.sql !== 'string' || typeof parsed.explanation !== 'string') {
        throw new Error('OpenAI response missing required fields: sql, explanation')
    }

    return {
        sql: parsed.sql.trim(),
        explanation: parsed.explanation.trim(),
    }
}


