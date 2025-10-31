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
    // Always available Sakila demo connection for testing
    const sakilaExample = {
      filename: 'sakila.json',
      description: 'sakila demo DB',
      config: {
        description: 'sakila demo DB',
        version: '1.0.0',
        connection: {
          internalName: 'sakila',
          databaseName: 'sakila',
          databaseType: 'mysql',
          host: '13.234.119.243',
          username: 'readonly',
          password: 'Zr0OzD85003u',
          port: '3306',
          jdbcParams: '',
          serverTime: 'GMT+02:00',
          useSshTunneling: false,
          sshAuthMethod: null,
          sshPort: null,
          sshUser: null,
          sshHost: null,
          sshPassword: null,
          sshPrivateKey: null,
          storageLocation: 'remote'
        }
      }
    }

    const examples: Array<{ filename: string, description: string, config: ConnectionExample }> = [sakilaExample]

    // If in debug mode, also load additional examples from filesystem
    if (isDebugMode()) {
      try {
        // Read connection examples directory
        const connectionsDir = path.join(process.cwd(), 'docs', 'examples', 'connections')

        if (fs.existsSync(connectionsDir)) {
          const files = fs.readdirSync(connectionsDir)
          const jsonFiles = files.filter(file => file.endsWith('.json'))

          for (const file of jsonFiles) {
            try {
              const filePath = path.join(connectionsDir, file)
              const content = fs.readFileSync(filePath, 'utf-8')
              const config: ConnectionExample = JSON.parse(content)

              // Avoid duplicate sakila entry
              if (file !== 'sakila.json') {
                examples.push({
                  filename: file,
                  description: config.description || file.replace('.json', ''),
                  config
                })
              }
            } catch (error) {
              console.error(`Error parsing connection example ${file}:`, error)
              // Continue with other files
            }
          }
        }
      } catch (error) {
        console.error('Error loading additional connection examples:', error)
        // Continue without filesystem examples
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
