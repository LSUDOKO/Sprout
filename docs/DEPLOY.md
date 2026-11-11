# Deployments

| | Mainnet (real NIM) | Testnet (free test NIM) |
|---|---|---|
| URL | https://sprout-three-neon.vercel.app | https://sprout-testnet.vercel.app |
| Open in Nimiq Pay | Mini Apps → Custom URL → the URL above (Nimiq Pay on **mainnet**) | Same, with Nimiq Pay switched to **testnet** in its settings |
| Vercel project | `sprout` (auto-deploys on push to `main`) | `sprout-testnet` (deploy with `vercel deploy --prod` from a checkout linked to it, or connect the repo in the Vercel dashboard) |
| Database | Neon project `sprout`, default branch | Neon project `sprout`, branch `testnet` |
| RPC | `https://rpc.nimiqwatch.com` | `https://rpc.testnet.nimiqwatch.com` |
| Validators | `https://validators-api-main.je-cf9.workers.dev/api/v1/validators` | `https://validators-api-test.je-cf9.workers.dev/api/v1/validators` |
| Staking contract | `NQ77 0000 0000 0000 0000 0000 0000 0000 0001` (seen in real mainnet txs) | same (seen in real testnet txs) |
| Function region | `pdx1`, next to Neon `us-west-2` (`vercel.json`) | same |

Health check: `GET /api/health` → `{"ok":true,"db":true,"rpc":true,"network":…}`.

## Environment variables (both projects)

`DATABASE_URL`, `AUTH_SECRET`, `NIMIQ_RPC_URL`, `NEXT_PUBLIC_NIMIQ_NETWORK`, `NEXT_PUBLIC_APP_URL`,
`NIMIQ_STAKING_CONTRACT`, `VALIDATORS_API_URL`, `NEXT_PUBLIC_EXPLORER_TX_URL`, `DEMO_ENABLED`, and temporarily
`SPROUT_DEV_PAGES=1` (unlocks `/dev/wallet` for the one-time phone check — remove it afterwards and redeploy).

Migrations run in the Vercel build (`vercel-build` script → `npm run db:migrate`).

## Notes from going live

- The public nimiqwatch RPC is rate-limited (about 20 requests per window). Fine for testing and a demo; for real
  traffic, run your own node (https://nimiq.dev/nodes) and set `NIMIQ_RPC_URL`, keeping nimiqwatch as `NIMIQ_RPC_URL_FALLBACK`.
- Albatross nodes report "not found" inside `error.data`, and stakers carry `inactiveFrom`, not a release block.
  Both are handled in `src/lib/nimiq/chain.ts` and covered by tests with real mainnet responses.
- Functions must run next to the database: from `iad1` the demo seeding took 68 s; from `pdx1` it takes about 7 s.
