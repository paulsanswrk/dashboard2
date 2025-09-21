import mysql from 'mysql2/promise'
import { Client } from 'ssh2'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      host, 
      port, 
      username, 
      password, 
      database, 
      jdbcParams = '',
      useSshTunneling = false,
      sshConfig = {}
    } = body

    // Validate required fields
    if (!host || !port || !username || !password || !database) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required connection parameters'
      })
    }

    // Parse port to number
    const portNumber = parseInt(port, 10)
    if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid port number'
      })
    }

    // Handle SSH tunneling
    if (useSshTunneling) {
      return await testConnectionWithSSHTunnel(body)
    }

    // Create connection configuration
    const connectionConfig = {
      host: host.trim(),
      port: portNumber,
      user: username.trim(),
      password: password,
      database: database.trim(),
      connectTimeout: 10000, // 10 seconds timeout
      // timeout: 10000,
      // Parse additional JDBC parameters if provided
      ...(jdbcParams ? parseJdbcParams(jdbcParams) : {})
    }

    // Test the connection
    let connection
    try {
      connection = await mysql.createConnection(connectionConfig)
      
      // Test a simple query to ensure the connection works
        const [rows] = await connection.execute('SELECT 1 as test')
        console.log('SQL query result:', rows)
      
      return {
        success: true,
        message: 'Successfully connected to the database. All credentials are valid.',
        connectionInfo: {
          host: connectionConfig.host,
          port: connectionConfig.port,
          database: connectionConfig.database,
          user: connectionConfig.user
        }
      }
    } catch (dbError: any) {
      console.error('Database connection error:', dbError)
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to connect to the database.'
      
      if (dbError.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused. Please check the host and port.'
      } else if (dbError.code === 'ENOTFOUND') {
        errorMessage = 'Host not found. Please check the host address.'
      } else if (dbError.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timed out. Please check the host and port.'
      } else if (dbError.code === 'ER_ACCESS_DENIED_ERROR') {
        errorMessage = 'Access denied. Please check the username and password.'
      } else if (dbError.code === 'ER_BAD_DB_ERROR') {
        errorMessage = 'Database does not exist. Please check the database name.'
      } else if (dbError.code === 'ER_ACCESS_DENIED_ERROR') {
        errorMessage = 'Access denied. Please check your credentials.'
      } else if (dbError.message) {
        errorMessage = `Database error: ${dbError.message}`
      }
      
      return {
        success: false,
        message: errorMessage,
        error: dbError.code || 'CONNECTION_FAILED',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      }
    } finally {
      // Always close the connection
      if (connection) {
        try {
          await connection.end()
        } catch (closeError) {
          console.error('Error closing connection:', closeError)
        }
      }
    }
  } catch (error: any) {
    console.error('Connection test error:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})

// SSH tunnel connection test function
async function testConnectionWithSSHTunnel(body: any) {
  const { 
    host, 
    port, 
    username, 
    password, 
    database,
    sshConfig = {}
  } = body

  const { 
    port: sshPort, 
    user: sshUser, 
    host: sshHost, 
    password: sshPassword,
    privateKey,
    authMethod 
  } = sshConfig

  // Validate SSH configuration
  if (!sshHost || !sshUser || !sshPort) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SSH host, user, and port are required for SSH tunneling'
    })
  }

  if (authMethod === 'password' && !sshPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SSH password is required for password authentication'
    })
  }

  if (authMethod === 'public-key' && !privateKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SSH private key is required for public key authentication'
    })
  }

  return new Promise((resolve, reject) => {
    const ssh = new Client()

    ssh.on('ready', () => {
      console.log('✅ SSH Connection ready')

      ssh.forwardOut(
        'localhost', // source addr
        parseInt(sshPort) + 1000, // source port (use SSH port + 1000 to avoid conflicts)
        host, // remote DB host (from SSH server's POV)
        parseInt(port), // remote DB port
        async (err, stream) => {
          if (err) {
            console.error('❌ SSH forwardOut error:', err)
            ssh.end()
            reject({
              success: false,
              message: 'Failed to establish SSH tunnel. Please check SSH server details.',
              error: 'SSH_TUNNEL_FAILED'
            })
            return
          }

          try {
            const connection = await mysql.createConnection({
              user: username.trim(),
              password: password,
              database: database.trim(),
              stream, // tell mysql2 to use the SSH tunnel stream
              connectTimeout: 10000
            })

            // Test a simple query to ensure the connection works
            const [rows] = await connection.execute("SELECT 1 as test, NOW() as 'current_time'")
            console.log('✅ MySQL response through SSH tunnel:', rows)

            await connection.end()

            resolve({
              success: true,
              message: 'Successfully connected to the database through SSH tunnel. All credentials are valid.',
              connectionInfo: {
                host: host,
                port: port,
                database: database,
                user: username,
                sshHost: sshHost,
                sshUser: sshUser,
                tunnel: 'SSH tunnel established'
              }
            })
          } catch (dbErr: any) {
            console.error('❌ MySQL connection through SSH tunnel failed:', dbErr)
            
            let errorMessage = 'Failed to connect to MySQL through SSH tunnel.'
            
            if (dbErr.code === 'ER_ACCESS_DENIED_ERROR') {
              errorMessage = 'Access denied. Please check the MySQL username and password.'
            } else if (dbErr.code === 'ER_BAD_DB_ERROR') {
              errorMessage = 'Database does not exist. Please check the database name.'
            } else if (dbErr.message) {
              errorMessage = `MySQL error: ${dbErr.message}`
            }

            reject({
              success: false,
              message: errorMessage,
              error: dbErr.code || 'MYSQL_CONNECTION_FAILED'
            })
          } finally {
            ssh.end()
          }
        }
      )
    })

    ssh.on('error', (err) => {
      console.error('❌ SSH connection error:', err)
      
      let errorMessage = 'Failed to connect to SSH server.'
      
      if (err.message.includes('Authentication failed')) {
        errorMessage = 'SSH authentication failed. Please check your SSH credentials.'
      } else if (err.message.includes('ECONNREFUSED')) {
        errorMessage = 'SSH connection refused. Please check the SSH host and port.'
      } else if (err.message.includes('ENOTFOUND')) {
        errorMessage = 'SSH host not found. Please check the SSH host address.'
      } else if (err.message) {
        errorMessage = `SSH error: ${err.message}`
      }

      reject({
        success: false,
        message: errorMessage,
        error: 'SSH_CONNECTION_FAILED'
      })
    })

    // Prepare SSH connection config
    const sshConnectionConfig: any = {
      host: sshHost,
      port: parseInt(sshPort),
      username: sshUser
    }

    if (authMethod === 'password') {
      sshConnectionConfig.password = sshPassword
    } else if (authMethod === 'public-key' && privateKey) {
      sshConnectionConfig.privateKey = privateKey
    }

    ssh.connect(sshConnectionConfig)
  })
}

// Helper function to parse JDBC URL parameters
function parseJdbcParams(jdbcParams: string): Record<string, any> {
  const params: Record<string, any> = {}
  
  if (!jdbcParams || !jdbcParams.startsWith('?')) {
    return params
  }
  
  const queryString = jdbcParams.substring(1) // Remove the '?'
  const pairs = queryString.split('&')
  
  for (const pair of pairs) {
    const [key, value] = pair.split('=')
    if (key && value) {
      // Convert string values to appropriate types
      if (value === 'true') {
        params[key] = true
      } else if (value === 'false') {
        params[key] = false
      } else if (!isNaN(Number(value))) {
        params[key] = Number(value)
      } else {
        params[key] = value
      }
    }
  }
  
  return params
}
