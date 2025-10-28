import { defineEventHandler, readBody } from 'h3'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import mysql from 'mysql2/promise'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Hardcoded Sakila connection config for debug purposes
async function getSakilaConnectionConfig() {
  const sakilaConfigPath = resolve(__dirname, '../../docs/examples/connections/sakila.json')
  const sakilaConfigContent = await readFile(sakilaConfigPath, 'utf8')
  const sakilaConfig = JSON.parse(sakilaConfigContent)

  return {
    host: sakilaConfig.connection.host,
    port: parseInt(sakilaConfig.connection.port, 10),
    user: sakilaConfig.connection.username,
    password: sakilaConfig.connection.password,
    database: sakilaConfig.connection.databaseName,
    connectTimeout: 10000
  }
}

export default defineEventHandler(async (event) => {
  const { sql, limit = 1000 } = await readBody<{ sql: string; limit?: number }>(event)

  if (!sql || typeof sql !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid SQL' })
  }

  // Basic safeguards - only allow SELECT queries for debug purposes
  if (!/\bselect\b/i.test(sql.trim())) {
    throw createError({ statusCode: 400, statusMessage: 'Only SELECT queries allowed in debug mode' })
  }

  // Enforce a limit if not present
  let safeSql = sql.trim()
  if (!/\blimit\b/i.test(safeSql)) {
    safeSql = `${safeSql} LIMIT ${Math.min(Math.max(Number(limit), 1), 5000)}`
  }

  // Get Sakila connection config
  const dbConfig = await getSakilaConnectionConfig()

  try {
    const connection = await mysql.createConnection(dbConfig)
    const [rows] = await connection.execute(safeSql)

    // Extract column information
    const columns = rows.length > 0 ? Object.keys(rows[0]).map(key => ({
      key,
      label: key
    })) : []

    await connection.end()

    return {
      columns,
      rows: rows as Record<string, unknown>[]
    }
  } catch (error) {
    console.error('Database query error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Database query failed: ${error.message}`
    })
  }
})
