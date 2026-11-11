# 02 — Architecture

## 1. Stack
| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router, latest stable) + TypeScript** | One deploy for UI + API; same stack Zamu used successfully |
| Styling | Tailwind CSS + CSS variables for theme tokens | Fast, consistent |
| Animation | Framer Motion (`motion`) + canvas-confetti + lottie-react (optional) | 2D pet rig, celebrations |
| Client state | Zustand (UI state) + TanStack Query (server data) | Simple, cache-aware |
| Wallet | `@nimiq/mini-app-sdk` (≥ 0.2.4) | Official provider + errors + `getHostNetwork` |
| Crypto (server) | `@noble/curves` (ed25519), `@noble/hashes` (sha256, blake2b) | Verify Nimiq signed messages, derive addresses |
| Auth | `jose` (JWT in httpOnly cookie) | Stateless sessions |
| DB | Postgres (Neon free tier) + Drizzle ORM + drizzle-kit migrations | Free, serverless-friendly |
| Share images | `next/og` (ImageResponse) | Server-rendered PNG cards |
| Tests | Vitest (unit), Playwright (E2E at 360px and desktop) | |
| Hosting | Vercel (Hobby is fine) | HTTPS, previews |

No smart contracts. No custody. No cron required (verification happens on demand).

## 2. High-level diagram
```
Nimiq Pay (Android/iOS)
 └─ WebView ── Sprout Next.js client
               │  @nimiq/mini-app-sdk → native wallet dialogs (sign, stake, pay)
               │
               ├─ /api/auth/*     sign-in (challenge → signature verify → JWT cookie)
               ├─ /api/saves/*    register tx hash → verify on chain → update progress
               ├─ /api/stake/*    staker summary, earnings, cooldown status
               ├─ /api/squads/*   squads, members, treats
               ├─ /api/leaderboard
               ├─ /api/validators (cached proxy of Nimiq Validators API)
               └─ /api/share/:id  PNG share card
                      │
                      ├─ Postgres (Neon)
                      └─ Nimiq JSON-RPC (NIMIQ_RPC_URL, server-side only)
```

## 3. Folder structure
```
sprout/
├─ CLAUDE.md, README.md, LICENSE (MIT), CREDITS.md, DECISIONS.md, .env.example
├─ drizzle/                    # migrations
├─ public/
│  ├─ pet/                     # pet parts PNG/SVG per stage (see 07, 08)
│  ├─ bg/                      # garden backgrounds per stage
│  ├─ cosmetics/               # hats, items
│  ├─ sfx/                     # UI sounds (CC0)
│  └─ icons/                   # app icon, PWA icons
├─ src/
│  ├─ app/
│  │  ├─ (app)/page.tsx                 # Home
│  │  ├─ (app)/onboarding/page.tsx
│  │  ├─ (app)/squad/page.tsx, squad/[id]/page.tsx, join/[code]/page.tsx
│  │  ├─ (app)/collection/page.tsx
│  │  ├─ (app)/leaderboard/page.tsx
│  │  ├─ (app)/me/page.tsx              # profile, settings, withdraw entry
│  │  ├─ (app)/withdraw/page.tsx
│  │  ├─ demo/[[...slug]]/page.tsx      # demo mode shell
│  │  ├─ proof/page.tsx                 # public list of verified saves (tx links)
│  │  └─ api/...                        # see 06-DATA-MODEL-API.md
│  ├─ components/
│  │  ├─ pet/Pet.tsx, PetRig.tsx, PetScene.tsx, moods.ts
│  │  ├─ sheets/FeedSheet.tsx, PoolPicker.tsx, TreatSheet.tsx
│  │  ├─ celebrate/SaveSuccess.tsx, Evolution.tsx
│  │  ├─ ui/ (Button, Card, ProgressBar, Toast, TabBar, Skeleton)
│  │  └─ squad/, leaderboard/, collection/
│  ├─ lib/
│  │  ├─ nimiq/
│  │  │  ├─ wallet.ts          # CLIENT: init(), sign, stake, pay — single error-handling layer
│  │  │  ├─ mockWallet.ts      # CLIENT: demo-mode provider with the same interface
│  │  │  ├─ chain.ts           # SERVER: JSON-RPC client (allowlisted methods)
│  │  │  ├─ signature.ts       # SERVER: verify signed message
│  │  │  ├─ address.ts         # SERVER: publicKey → user-friendly address
│  │  │  ├─ invariants.ts      # SHARED: staking rule checks
│  │  │  └─ luna.ts            # SHARED: Luna <-> NIM formatting
│  │  ├─ game/
│  │  │  ├─ growth.ts          # stage + progress from stake + streak (pure)
│  │  │  ├─ mood.ts            # mood rules (pure)
│  │  │  ├─ streak.ts          # ISO week keys, streak calc (pure)
│  │  │  ├─ sparks.ts          # award table (pure)
│  │  │  └─ badges.ts          # badge rules (pure)
│  │  ├─ db/schema.ts, db/index.ts
│  │  ├─ auth/session.ts       # JWT helpers
│  │  ├─ i18n/{en,hi,es}.json, i18n/index.ts
│  │  └─ env.ts                # zod-validated env
│  └─ stores/ui.ts
├─ tests/unit/, tests/e2e/
└─ package.json
```

## 4. Environments
| Env | Nimiq network | Purpose |
|---|---|---|
| Local | testnet (or mock) | Development; open on phone via LAN (see `10`) |
| Preview | testnet | PR previews |
| Production | **mainnet** | The submitted app |

Detect the host network with `getHostNetwork()` from the SDK and **refuse to run a
production build against testnet** (show a clear message) and vice versa.

## 5. Data flow: a save
1. Client: `FeedSheet` → `invariants.checkStake(...)` → `wallet.stake(...)`.
2. Wallet returns tx hash → client `POST /api/saves { txHash, kind, valueLuna }` immediately.
3. Server stores `pending` row, returns id. Client polls `GET /api/saves/:id` every 3s (max 2 min, then every 15s).
4. Each poll: server calls `getTransactionByHash`; when executed with enough confirmations and
   matching sender/amount → mark `confirmed`, recompute week progress, streak, stage, Sparks, badges (one DB transaction).
5. Client shows celebration based on the response diff (e.g. `evolvedTo: "bloom"`).

## 6. Security
- **Auth:** challenge nonce (single use, 5 min expiry) → `sign()` → server verifies → JWT (30 days), httpOnly, Secure, SameSite=Lax.
- **Identity = signer public key/address,** never `listAccounts()` alone (it does not prove ownership).
- **Multiple addresses:** Nimiq Pay may sign from different accounts over time. A user can link
  extra addresses only by signing a fresh challenge from that address (see `03` §3).
- **Tx claims:** a tx is credited only if its sender is one of the user's linked addresses.
- **RPC:** only server-side; allowlist methods; never expose `NIMIQ_RPC_URL` credentials.
- **Rate limits:** per-user limits on `/api/saves` (30/min) and `/api/auth/challenge` (10/min per IP).
- **Memos are public:** never put personal data in tx data.
- **XSS:** pet names and squad names are user input — render as text only.
- **Privacy:** store addresses and Nimiq data only; no emails, no phone numbers, no analytics SDKs.
  Publish a short privacy note in the app.
