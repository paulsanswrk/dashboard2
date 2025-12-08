import {drizzle} from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Create the PostgreSQL connection string
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
    throw new Error('Missing DATABASE_URL environment variable')
}

// For server-side operations with service role access
const queryClient = postgres(connectionString, {
    max: 10,
    idle_timeout: 30000, // 30 seconds
    connect_timeout: 10000, // 10 seconds
})

export const db = drizzle(queryClient, {schema})

// Export types for use in queries
export type Database = typeof db
