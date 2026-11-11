// One Drizzle database, two drivers: Postgres when DATABASE_URL is set (production / Neon),
// embedded PGlite otherwise (zero-setup dev, tests, Playwright). Same schema + migrations.
import 'server-only'
import path from 'node:path'
import type { PgliteDatabase } from 'drizzle-orm/pglite'
import * as schema from './schema'

export type Db = PgliteDatabase<typeof schema>
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export { schema }

const MIGRATIONS = path.join(process.cwd(), 'drizzle')

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim()
  if (url) {
    const { drizzle } = await import('drizzle-orm/postgres-js')
    const postgres = (await import('postgres')).default
    const client = postgres(url, { max: 5, prepare: false })
    // postgres-js and PGlite expose the same PgDatabase query API.
    return drizzle(client, { schema }) as unknown as Db
  }
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const { migrate } = await import('drizzle-orm/pglite/migrator')
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), '.data', 'pglite')
  const client = dir === 'memory' ? new PGlite() : new PGlite(dir)
  const db = drizzle(client, { schema })
  await migrate(db, { migrationsFolder: MIGRATIONS })
  return db
}

const g = globalThis as unknown as { __sproutDb?: Promise<Db> }

/** Lazily connected singleton (survives Next dev hot reloads). */
export function getDb(): Promise<Db> {
  g.__sproutDb ??= connect().catch((e) => {
    g.__sproutDb = undefined
    throw e
  })
  return g.__sproutDb
}
