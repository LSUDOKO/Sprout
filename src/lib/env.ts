// Server env, validated once. Fails fast with a readable message when a required var is wrong.
import 'server-only'
import { z } from 'zod'

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined))

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  NEXT_PUBLIC_NIMIQ_NETWORK: z.enum(['mainnet', 'testnet']).default('mainnet'),
  AUTH_SECRET: optional,
  DATABASE_URL: optional,
  NIMIQ_RPC_URL: optional,
  NIMIQ_RPC_URL_FALLBACK: optional,
  NIMIQ_RPC_AUTH: optional,
  NIMIQ_STAKING_CONTRACT: z.string().default('NQ77 0000 0000 0000 0000 0000 0000 0000 0001'),
  VALIDATORS_API_URL: z.string().default('https://validators-api-main.je-cf9.workers.dev/api/v1/validators'),
  PRICE_API_URL: optional,
  DEMO_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  throw new Error('Invalid environment:\n' + parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n'))
}

const e = parsed.data
if (e.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build' && !e.AUTH_SECRET) {
  throw new Error('AUTH_SECRET is required in production (openssl rand -base64 32)')
}

export const env = {
  ...e,
  // Dev-only fallback so `npm run dev` works with zero setup. Production requires AUTH_SECRET.
  AUTH_SECRET: e.AUTH_SECRET ?? 'dev-only-insecure-secret-change-me-0123456789',
  hasRealChain: !!e.NIMIQ_RPC_URL,
}
