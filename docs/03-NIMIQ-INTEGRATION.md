# 03 — Nimiq Integration (most important file)

Source of truth: https://nimiq.dev/mini-apps/api-reference/nimiq-provider
SDK: `@nimiq/mini-app-sdk` **≥ 0.2.4** (needed for `NimiqProviderError`, `getBalance` support, `getHostNetwork`).

> Every method below is from the official docs. Do not use any other method names.
> Re-check the docs page before building — the SDK is evolving.

## 1. Provider access and the single wallet layer

```ts
// src/lib/nimiq/wallet.ts  (client only)
import { init, NimiqProviderError, getHostNetwork, requestDeviceIdentifier } from '@nimiq/mini-app-sdk'

let providerPromise: ReturnType<typeof init> | null = null
export function provider() {
  providerPromise ??= init()          // throws plain Error if not inside Nimiq Pay (injection timeout)
  return providerPromise
}

export type WalletResult<T> =
  | { ok: true; value: T }
  | { ok: false; kind: 'cancelled' | 'unsupported' | 'invalid' | 'network' | 'unknown_outcome' | 'error'; message: string; raw?: unknown }

export async function call<T>(fn: (n: Awaited<ReturnType<typeof init>>) => Promise<T>): Promise<WalletResult<T>> {
  try {
    const n = await provider()
    return { ok: true, value: await fn(n) }
  } catch (e) {
    if (!NimiqProviderError.is(e)) return { ok: false, kind: 'error', message: String(e), raw: e }
    switch (e.type) {
      case 'PERMISSION_DENIED': return { ok: false, kind: 'cancelled', message: e.message, raw: e }
      case 'UNKNOWN_REQUEST':   return { ok: false, kind: 'unsupported', message: e.message, raw: e }
      case 'INVALID_TRANSACTION':
      case 'INVALID_REQUEST':   return { ok: false, kind: 'invalid', message: e.message, raw: e }
      case 'NETWORK_ERROR':     return { ok: false, kind: 'unknown_outcome', message: e.message, raw: e } // may have been submitted!
      case 'TRANSACTION_OUTCOME_UNKNOWN':
      case 'DUPLICATE_PAYMENT': return { ok: false, kind: 'unknown_outcome', message: e.message, raw: e }
      default:                  return { ok: false, kind: 'error', message: e.message, raw: e }
    }
  }
}
```

**UI handling per kind**
| kind | What the user sees | Can retry? |
|---|---|---|
| cancelled | Nothing alarming; sheet stays open: "No problem — nothing was sent." | Yes |
| unsupported | "Please update Nimiq Pay to use this." | No |
| invalid | Show message + "Check the amount" | Yes, after change |
| unknown_outcome | "Checking…" state; poll chain (see §8). Disable the action. | **No** until resolved |
| error | "Something went wrong" + support link | Yes |

## 2. Methods used by Sprout
| Method | Used for | Confirmation dialog |
|---|---|---|
| `init()` | Wait for provider | – |
| `getHostNetwork()` | mainnet/testnet guard | – |
| `window.nimiqPay?.language` | i18n | – |
| `listAccounts()` | Show wallet addresses (not proof!) | yes (first time) |
| `sign(message)` → `{ publicKey, signature }` (hex) | Sign-in, link address, squad join consent | yes |
| `isConsensusEstablished()`, `getBlockNumber()` | Health + cooldown countdown | no |
| `getBalance(address)` → Luna (number) | Check wallet balance before save (feature-detect!) | no |
| `sendNewStakerTransaction({ delegation, value })` | First save (plant) | yes |
| `sendStakeTransaction({ value })` | Later saves (feed), plant a treat | yes |
| `sendSetActiveStakeTransaction({ newActiveBalance })` | Withdraw step 1 (deactivate) | yes |
| `sendRetireStakeTransaction({ retireStake })` | Withdraw step 2 | yes |
| `sendRemoveStakeTransaction({ value })` | Withdraw step 3 (must be the **whole** retired balance) | yes |
| `sendBasicTransactionWithData({ recipient, value, data })` | Treats (memo ≤ 64 bytes UTF-8) | yes |
| `requestDeviceIdentifier({ reason })` | Optional anti-spam for leaderboard (device ≠ user!) | yes (first time) |
| `sendUpdateStakerTransaction({ newDelegation, reactivateAllStake })` | Stretch S3: change pool | yes |
| `payLightningInvoice({ invoice })` | Stretch S2 only, mainnet only | yes |

Notes from the docs:
- Nimiq Pay chooses the signing account; `sign()` and send methods have **no address parameter**.
- `listAccounts()` shares addresses but **does not prove ownership**. Verify a signature for identity.
- All values are **Luna** (`number`). 1 NIM = 100,000 Luna.
- Fee is optional; Nimiq Pay picks one (0 if possible). Don't pass a fee.
- `getBalance` exists only on newer hosts: check `typeof nimiq.getBalance === 'function'`.
- `request()` sends non-wallet JSON-RPC to the URL set with `setRPCUrl()` (needs CORS). Sprout does
  chain reads on its **server** instead, so it never calls `setRPCUrl` in production.

## 3. Sign-in and address linking

### 3.1 Flow
1. Client `POST /api/auth/challenge` → `{ challenge, expiresAt }`.
   Challenge text is **ASCII only**, e.g. `Sprout sign-in\nNonce: 8f3a…\nIssued: 2026-11-12T10:00:00Z`.
2. Client `call(n => n.sign(challenge))` → `{ publicKey, signature }`.
3. Client `POST /api/auth/verify { challenge, publicKey, signature }`.
4. Server: challenge exists, unused, unexpired → verify signature (§3.2) → derive address (§3.3)
   → upsert user + `user_addresses` → mark challenge used → set JWT cookie.

### 3.2 Verifying a Nimiq signed message (server)
Nimiq signs `sha256( "\x16Nimiq Signed Message:\n" + message.length + message )` with Ed25519.
(Format documented in the Nimiq Hub API "Sign Message" reference.)

```ts
// src/lib/nimiq/signature.ts
import { ed25519 } from '@noble/curves/ed25519'
import { sha256 } from '@noble/hashes/sha256'
import { hexToBytes, utf8ToBytes } from '@noble/hashes/utils'

const PREFIX = '\x16Nimiq Signed Message:\n'

export function verifyNimiqMessage(message: string, publicKeyHex: string, signatureHex: string): boolean {
  if (!/^[\x20-\x7E\n]+$/.test(message)) return false   // ASCII-only challenges: length is unambiguous
  const data = utf8ToBytes(PREFIX + message.length + message)
  const hash = sha256(data)
  try {
    return ed25519.verify(hexToBytes(signatureHex), hash, hexToBytes(publicKeyHex))
  } catch { return false }
}
```

### 3.3 Public key → address (server)
Address = first 20 bytes of **Blake2b-256(publicKey)**, shown as `NQxx XXXX …` (IBAN-style checksum + Nimiq base32).

```ts
// src/lib/nimiq/address.ts
import { blake2b } from '@noble/hashes/blake2b'
import { hexToBytes } from '@noble/hashes/utils'

const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVXY' // Nimiq base32 (no I, O, W, Z)

function toBase32(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = ''
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}

function ibanCheck(str: string): number {
  const num = str.split('').map(c => {
    const code = c.toUpperCase().charCodeAt(0)
    return code >= 48 && code <= 57 ? c : (code - 55).toString()
  }).join('')
  let tmp = ''
  for (let i = 0; i < Math.ceil(num.length / 6); i++) tmp = (parseInt(tmp + num.substr(i * 6, 6)) % 97).toString()
  return parseInt(tmp)
}

export function addressFromPublicKey(publicKeyHex: string): string {
  const addr = blake2b(hexToBytes(publicKeyHex), { dkLen: 32 }).subarray(0, 20)
  const base32 = toBase32(addr)                                  // 32 chars
  const check = ('00' + (98 - ibanCheck(base32 + 'NQ' + '00'))).slice(-2)
  return ('NQ' + check + base32).replace(/.{4}/g, '$& ').trim()  // "NQ07 0000 …"
}
```

**Mandatory test:** on a real phone, compare `addressFromPublicKey(sign().publicKey)` with the
addresses from `listAccounts()`. They must match one of them. If not, stop and fix before continuing.
Add that pair as a fixed unit-test vector.

### 3.4 Linking extra addresses
Nimiq Pay may sign or pay from a different account than before (builders reported this).
When a tx's sender is not linked, the client asks the user to **re-sign a link challenge**;
the server links the derived address to the same user. Never link by `listAccounts()` alone.

## 4. Network guard
```ts
const net = getHostNetwork() ?? 'mainnet'
if (net !== process.env.NEXT_PUBLIC_NIMIQ_NETWORK) showWrongNetworkScreen(net)
```
`payLightningInvoice` is **mainnet only**.

## 5. Staking rules (validate BEFORE opening a dialog)
From the Nimiq protocol docs (Stakers):
- **Minimum stake: 100 NIM** (10,000,000 Luna). Creating a staker needs ≥ 100 NIM.
- Non-retired balance (active + inactive) must be **0 or ≥ 100 NIM**.
- Total balance (active + inactive + retired) must be **0 or ≥ 100 NIM**.
- Deactivating (set active stake) makes funds **inactive and locked** until the release block
  (≈ one epoch after the next election block; longer if the validator is jailed).
- Only **released** inactive funds can be **retired**. Retire must leave 0 or ≥ 100 NIM non-retired.
- **Remove** must withdraw the **entire** retired balance (no partial removal).
- Activate/deactivate/update take effect at the **next election block**.
- Changing pool requires all stake inactive and released first.

```ts
// src/lib/nimiq/invariants.ts
export const MIN_STAKE = 10_000_000 // Luna (100 NIM)
export type Staker = { balance: number; inactiveBalance: number; inactiveRelease?: number; inactiveFrom?: number | null; retiredBalance: number; delegation: string }

export function canCreateStaker(valueLuna: number, walletLuna?: number) {
  if (valueLuna < MIN_STAKE) return err('Minimum to start is 100 NIM')
  if (walletLuna !== undefined && valueLuna > walletLuna) return err('Not enough NIM in wallet')
  return ok()
}
export function canAddStake(s: Staker, valueLuna: number, walletLuna?: number) {
  if (valueLuna < 100_000) return err('Minimum save is 1 NIM')
  const nonRetired = s.balance + s.inactiveBalance + valueLuna
  if (nonRetired < MIN_STAKE) return err('Total must reach 100 NIM')
  if (walletLuna !== undefined && valueLuna > walletLuna) return err('Not enough NIM in wallet')
  return ok()
}
export function canDeactivate(s: Staker, amountLuna: number) {
  if (amountLuna <= 0 || amountLuna > s.balance) return err('Invalid amount')
  return ok() // new active = s.balance - amountLuna; inactive grows
}
export function canRetire(s: Staker, amountLuna: number, currentBlock: number) {
  if (!s.inactiveRelease || currentBlock < s.inactiveRelease) return err('Still cooling down')
  if (amountLuna > s.inactiveBalance) return err('Amount exceeds released balance')
  const remainingNonRetired = s.balance + s.inactiveBalance - amountLuna
  if (remainingNonRetired !== 0 && remainingNonRetired < MIN_STAKE) return err('Leave 0 or at least 100 NIM staked')
  return ok()
}
export function removeValue(s: Staker) { return s.retiredBalance } // must be the whole retired balance
```
(Field names `inactiveRelease`/`inactiveFrom` come from the Nimiq web-client `PlainStaker` type;
confirm against your RPC's `getStakerByAddress` response and adapt in `chain.ts`.)

## 6. Choosing a pool (validator)
- Source: **Nimiq Validators API** (`/api/v1/validators`), repo https://github.com/nimiq/validators-api
  (mainnet dashboard https://validators-api-mainnet.pages.dev — confirm the current API base URL in the repo README).
- Server caches the list for 10 minutes (`/api/validators`).
- Default recommendation (neutral, explainable, never paid placement):
  1. active / producing, not jailed or retired
  2. pays out by **restaking** (compounding into the stake) — so "grew overnight" is provable from stake balance
  3. highest trust score, then lowest fee
- Show name, logo, fee, payout type, and trust score. User can pick any.
- If the API shape differs (field names for payout type/fee/score), map it in one adapter function.

## 7. Earnings ("grew overnight")
Validators distribute rewards off-chain. Two pool types:
- **Restaking pools:** rewards are added to the staker's balance → visible in stake.
- **Direct-payout pools:** rewards arrive as normal incoming transactions to the wallet.

Formula (server, per user, across linked addresses):
```
earned = currentStakerTotal(active+inactive+retired)
       + totalRemoved                      // NIM the user already withdrew
       − totalDeposited                    // verified new-staker + add-stake values (incl. planted treats)
       + directPayoutsReceived             // incoming txs from the pool's reward address (if known)
```
If any input is unavailable → return `earned: null` and show "Not known yet". Never estimate.

## 8. Verifying a transaction (server)
JSON-RPC methods used (server allowlist): `getTransactionByHash`, `getTransactionsByAddress`,
`getStakerByAddress`, `getBlockNumber`, `getAccountByAddress`.
Method reference: https://nimiq.dev/rpc/methods (RPC responses wrap results in `{ data, metadata }`).

Checks for a save (`kind: plant | feed`):
1. tx found; `executionResult === true`; confirmations ≥ 2.
2. `from` ∈ user's linked addresses (else return `needs_link`).
3. `to` = the staking contract address (verify the exact address on testnet first; commonly
   `NQ77 0000 0000 0000 0000 0000 0000 0001` — confirm with a real staking tx in an explorer).
4. `value` equals the claimed value.
5. Re-read `getStakerByAddress(from)` and confirm stake increased accordingly.
6. tx hash not already credited (unique index).

Checks for a treat:
1. executed; `from` ∈ sender's linked addresses; `to` = recipient's primary address;
2. `value ≥ 100_000` Luna; recipient/sender data equals `sprout:t:<squadId>` (decode hex → UTF-8);
3. sender and recipient are both members of that squad.

Status machine for `saves` rows: `pending → confirmed | failed | needs_link`; `checking` is a
client-only display state for `unknown_outcome` until the server finds (or times out finding) the tx.
For unknown outcome **without a hash**: poll `getTransactionsByAddress(primaryAddress)` for a new
staking tx with the same value in the last 10 minutes before allowing another attempt.

Log a raw RPC response for each tx kind once in development and update field names in
`chain.ts` if they differ (`from`/`to`/`value`/`executionResult`/`recipientData`/`confirmations`).

## 9. Withdraw flow (3 approvals, honest copy)
1. **Stop earning:** `sendSetActiveStakeTransaction({ newActiveBalance: active - amount })`.
   Show cooldown ends at block `inactiveRelease` → convert to time (1 block ≈ 1 second; show "about X hours").
2. **Unlock:** when `currentBlock ≥ inactiveRelease`: `sendRetireStakeTransaction({ retireStake: amount })`
   (or all non-retired if the remainder would be < 100 NIM — explain this).
3. **Back to wallet:** `sendRemoveStakeTransaction({ value: retiredBalance })` (entire retired balance).
Each step is a separate button; the app remembers where the user is from chain state, not local state.

## 10. Treats
```ts
await call(n => n.sendBasicTransactionWithData({
  recipient: friendPrimaryAddress,
  value: amountLuna,
  data: `sprout:t:${squadId}`,   // ≤ 64 bytes; squadId is a short base62 id (≤ 10 chars)
}))
```
Memos are public on-chain — never include names or messages from users in `data`.
The optional thank-you message is stored in Sprout's DB, not on-chain.

## 11. Deep links
- Open app: `https://nimpay.app/miniapps/open/<your-domain>` or `nimiqpay://miniapp?url=<your-domain>`
- Squad invite: `https://nimpay.app/miniapps/open/<your-domain>/join/<code>` — test this exact format on a
  phone; if paths aren't preserved, use `?join=<code>` on the root instead and document it.
- Outside Nimiq Pay, the join page shows the squad name, a "Open in Nimiq Pay" button, and store links.

## 12. Demo / mock wallet
`mockWallet.ts` implements the same functions as `wallet.ts`:
- generates an Ed25519 keypair in memory, signs using the exact Nimiq message format (so server verify works),
- fakes tx hashes and a fake chain stored in the demo DB namespace (`demo_` user flag),
- **only active on `/demo` routes**; production APIs reject demo sessions for real-money endpoints.
