import fs from 'fs'
import path from 'path'
import { isDebugMode } from '~/server/utils/debugConfig'

interface ConnectionExample {
  description: string
  version: string
  connection: {
    internalName: string
    databaseName: string
    databaseType: string
    host: string
    username: string
    password: string
    port: string
    jdbcParams: string
    serverTime: string
    useSshTunneling: boolean
    sshAuthMethod: string | null
    sshPort: string | null
    sshUser: string | null
    sshHost: string | null
    sshPassword: string | null
    sshPrivateKey: string | null
    storageLocation: string
  }
  notes?: Record<string, string>
}

export default defineEventHandler(async (event) => {
  try {
    // Only allow in debug mode
    if (!isDebugMode()) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Connection examples are only available in debug mode'
      })
    }

    // Read connection examples directory
    const connectionsDir = path.join(process.cwd(), 'docs', 'examples', 'connections')

    if (!fs.existsSync(connectionsDir)) {
      return {
        success: false,
        message: 'Connection examples directory not found',
        examples: []
      }
    }

    const files = fs.readdirSync(connectionsDir)
    const jsonFiles = files.filter(file => file.endsWith('.json'))

    const examples: Array<{ filename: string, description: string, config: ConnectionExample }> = []

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(connectionsDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const config: ConnectionExample = JSON.parse(content)

        examples.push({
          filename: file,
          description: config.description || file.replace('.json', ''),
          config
        })
      } catch (error) {
        console.error(`Error parsing connection example ${file}:`, error)
        // Continue with other files
      }
    }

    return {
      success: true,
      message: `Found ${examples.length} connection examples`,
      examples: examples.map(({ filename, description }) => ({
        filename,
        description
      }))
    }

  } catch (error: any) {
    console.error('Connection examples API error:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to load connection examples'
    })
  }
})
