import { defineEventHandler } from 'h3'
import { promises as fs } from 'fs'
import path from 'path'

export default defineEventHandler(async () => {
  const baseDir = path.join(process.cwd(), 'docs', 'examples', 'connections')
  let files: string[] = []
  try {
    files = await fs.readdir(baseDir)
  } catch {
    return []
  }

  const jsonFiles = files.filter((f) => f.toLowerCase().endsWith('.json'))

  const results = await Promise.all(jsonFiles.map(async (filename) => {
    try {
      const fullPath = path.join(baseDir, filename)
      const raw = await fs.readFile(fullPath, 'utf-8')
      const parsed = JSON.parse(raw)
      const conn = parsed?.connection || {}
      return {
        id: filename.replace(/\.json$/i, ''),
        filename,
        label: conn.internalName || parsed?.description || filename,
        description: parsed?.description || '',
        databaseType: conn.databaseType || null,
        databaseName: conn.databaseName || null
      }
    } catch {
      return null
    }
  }))

  return results.filter(Boolean)
})


