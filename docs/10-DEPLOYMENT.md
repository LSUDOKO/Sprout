# 10 — Deployment

## 1. Environment variables (`.env.example`)
```
# App
NEXT_PUBLIC_APP_URL=https://sprout.example.com
NEXT_PUBLIC_NIMIQ_NETWORK=mainnet          # or testnet
AUTH_SECRET=change-me-32-bytes-base64       # JWT signing key (openssl rand -base64 32)

# Database (Neon)
DATABASE_URL=postgres://user:pass@host/db?sslmode=require

# Nimiq JSON-RPC (server only, never NEXT_PUBLIC)
NIMIQ_RPC_URL=https://your-rpc.example
NIMIQ_RPC_URL_FALLBACK=
NIMIQ_RPC_AUTH=                             # "user:pass" if your RPC needs basic auth

# Validators API
VALIDATORS_API_URL=https://<current mainnet validators-api host>/api/v1/validators

# Optional
PRICE_API_URL=                              # for "≈ ₹" display; hide when empty
DEMO_ENABLED=true
```
Validate with zod in `src/lib/env.ts`; fail fast at boot if anything required is missing.

## 2. Getting a Nimiq RPC endpoint
Options (pick one, document which):
1. Run your own Nimiq node with RPC enabled (see https://nimiq.dev/nodes) — most reliable.
2. Use a community/hosted RPC — ask in the Nimiq builder community (Skool) or Telegram for a mainnet RPC URL for mini-app builders.
Test: `curl -s $NIMIQ_RPC_URL -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"getBlockNumber","params":[]}'`

## 3. Database
1. Create a Neon project (free) → copy `DATABASE_URL`.
2. `npx drizzle-kit generate` → `npx drizzle-kit migrate`.
3. Seed demo data: `npm run seed:demo`.

## 4. Local development on your phone
1. `npm run dev -- --hostname 0.0.0.0` (Next.js) — phone and laptop on the same Wi-Fi.
2. In Nimiq Pay: **Mini Apps → Custom URL** → `http://<laptop-LAN-IP>:3000`.
   Official guide: https://nimiq.dev/mini-apps/development/load-local-mini-app
3. If Nimiq Pay requires HTTPS or your network blocks LAN, use a tunnel (e.g. `cloudflared tunnel --url http://localhost:3000`).
4. Note: the docs have mentioned that mini-app testing may be limited to allowlisted users —
   if Custom URL is unavailable in your Nimiq Pay, ask the Nimiq team in the builder community.

## 5. Production (Vercel)
1. Push to GitHub (public, MIT).
2. Import into Vercel → framework Next.js → add env vars → deploy.
3. Add a custom domain (optional but nicer for deep links).
4. Smoke test `/api/health`, `/demo`, then open in Nimiq Pay via Custom URL.
5. Deep links to share:
   - `https://nimpay.app/miniapps/open/<your-domain>`
   - `nimiqpay://miniapp?url=<your-domain>`
   Opening a URL that isn't in Nimiq Pay's Mini App list shows a warning first — mention this in your README.
6. Ask the Nimiq team how to get listed in the Nimiq Pay Mini App directory.

## 6. CI (GitHub Actions)
`.github/workflows/ci.yml`: install → lint → typecheck → unit tests → build → Playwright (demo) on push/PR.

## 7. Operations
- Logs: Vercel logs; log every wallet error type and RPC failure (no personal data).
- Backups: check Neon's restore window for your plan; export weekly with `pg_dump` once real users are saving.
- Status: `/api/health` checks DB + RPC; show a banner in-app if RPC is down ("Confirmations are delayed").
