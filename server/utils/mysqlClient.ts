import mysql from 'mysql2/promise'
import { Client as SSHClient } from 'ssh2'

export interface MySqlConnectionConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  useSshTunneling?: boolean
  ssh?: {
    host: string
    port: number
    user: string
    password?: string
    privateKey?: string
  }
}

export async function withMySqlConnectionConfig<T>(cfg: MySqlConnectionConfig, fn: (conn: mysql.Connection) => Promise<T>): Promise<T> {
  if (!cfg.useSshTunneling) {
    const conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      connectTimeout: 30000
    })
    try {
      return await fn(conn)
    } finally {
      await conn.end().catch(() => {
      })
    }
  }

  // SSH tunnel path
  if (!cfg.ssh) {
    throw new Error('SSH tunneling enabled but SSH config missing')
  }
  const ssh = new SSHClient()
  const sshConfig: any = {
    host: cfg.ssh.host,
    port: cfg.ssh.port,
    username: cfg.ssh.user
  }
  if (cfg.ssh.privateKey) sshConfig.privateKey = cfg.ssh.privateKey
  if (cfg.ssh.password) sshConfig.password = cfg.ssh.password

  return new Promise<T>((resolve, reject) => {
    ssh.on('ready', () => {
      ssh.forwardOut('127.0.0.1', 0, cfg.host, cfg.port, async (err, stream) => {
        if (err) {
          ssh.end()
          reject(err)
          return
        }
        let conn: mysql.Connection | null = null
          ; (async () => {
            try {
              conn = await mysql.createConnection({
                user: cfg.user,
                password: cfg.password,
                database: cfg.database,
                stream,
                connectTimeout: 30000
              })
              const result = await fn(conn)
              resolve(result)
            } catch (e) {
              reject(e)
            } finally {
              try { await conn?.end() } catch { }
              ssh.end()
            }
          })()
      })
    })
    ssh.on('error', (e) => reject(e))
    ssh.connect(sshConfig)
  })
}


