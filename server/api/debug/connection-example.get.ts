import fs from 'fs'
import path from 'path'
import { isDebugMode } from '~/server/utils/debugConfig.dev'
import { AuthHelper } from '~/server/utils/authHelper'

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
    // Only SUPERADMIN can access connection examples
    const ctx = await AuthHelper.requireAuthContext(event)
    if (ctx.role !== 'SUPERADMIN') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only Superadmin users can access connection examples'
      })
    }

    const query = getQuery(event)
    let filename = query.filename as string

    if (!filename) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Filename parameter is required'
      })
    }

    if (!filename.endsWith('.json')) {
      filename += '.json'
    }

    // Handle hardcoded Sakila connection (always available)
    if (filename === 'sakila.json') {
      const sakilaConfig: ConnectionExample = {
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

      return {
        success: true,
        filename: 'sakila.json',
        config: sakilaConfig.connection,
        notes: sakilaConfig.notes
      }
    }

    // Handle hardcoded insta800.net connection (always available for superadmins)
    if (filename === 'insta800.net.json') {
      const insta800Config: ConnectionExample = {
        description: 'insta800.net',
        version: '1.0.0',
        connection: {
          internalName: 'insta800.net',
          databaseName: 'dispotronic_insta_test',
          databaseType: 'mysql',
          host: 'localhost',
          username: 'dispotronic_usr',
          password: 'mfjuEvc382X',
          port: '3306',
          jdbcParams: '',
          serverTime: 'GMT+02:00',
          useSshTunneling: true,
          sshAuthMethod: 'public-key',
          sshPort: '22',
          sshUser: 'mysqlconn',
          sshHost: 'instatest.ksf.kiev.ua',
          sshPassword: '',
          sshPrivateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtz\nc2gtZWQyNTUxOQAAACBvevrIwOxsZj8oykqztu6ld0biHQeMhSLbktV76Y7aTQAA\nALBVCYpWVQmKVgAAAAtzc2gtZWQyNTUxOQAAACBvevrIwOxsZj8oykqztu6ld0bi\nHQeMhSLbktV76Y7aTQAAAEBPdjYDC7vbDAajgXMdq8uTXulzdJFPYf0Im9quxcUU\nPG96+sjA7GxmPyjKSrO27qV3RuIdB4yFItuS1XvpjtpNAAAAIG15c3FsY29ubkBp\nbnN0YXRlc3QyLmtzZi5raWV2LnVhAQIDBAUGBwgJCgsMDQ==\n-----END OPENSSH PRIVATE KEY-----',
          storageLocation: 'remote'
        }
      }

      return {
        success: true,
        filename: 'insta800.net.json',
        config: insta800Config.connection,
        notes: insta800Config.notes
      }
    }

    // For other examples, require debug mode
    if (!isDebugMode()) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Additional connection examples are only available in debug mode'
      })
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
