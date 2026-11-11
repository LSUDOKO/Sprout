// Apply drizzle/ migrations to DATABASE_URL (production). PGlite migrates itself on boot.
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.log('DATABASE_URL not set — PGlite migrates automatically on first use. Nothing to do.')
  process.exit(0)
}
const client = postgres(url, { max: 1 })
await migrate(drizzle(client), { migrationsFolder: 'drizzle' })
await client.end()
console.log('Migrations applied.')
