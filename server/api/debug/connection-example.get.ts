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
        statusMessage: 'Connection example details are only available in debug mode'
      })
    }

    const query = getQuery(event)
    const filename = query.filename as string

    if (!filename) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Filename parameter is required'
      })
    }

    if (!filename.endsWith('.json')) {
      filename += '.json'
    }

    // Read specific connection example file
    const connectionsDir = path.join(process.cwd(), 'docs', 'examples', 'connections')
    const filePath = path.join(connectionsDir, filename)

    if (!fs.existsSync(filePath)) {
      throw createError({
        statusCode: 404,
        statusMessage: `Connection example '${filename}' not found`
      })
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const config: ConnectionExample = JSON.parse(content)

    return {
      success: true,
      filename,
      config: config.connection,
      notes: config.notes
    }

  } catch (error: any) {
    console.error('Connection example API error:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to load connection example'
    })
  }
})
