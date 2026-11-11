// Testnet proof run: a script wallet goes through Sprout's REAL pipeline on testnet:
// signed sign-in → new-staker tx → add-stake tx → each verified on-chain by Sprout's server.
// Usage: node scripts/testnet-proof.mjs [appUrl] [keyFile]
// Testnet only. Never point this at mainnet with a real key.
import * as Nimiq from '@nimiq/core'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { sha256 } from '@noble/hashes/sha2.js'
import { utf8ToBytes } from '@noble/hashes/utils.js'

const APP = process.argv[2] ?? 'https://sprout-testnet.vercel.app'
const KEY_FILE = process.argv[3] ?? '.testnet-proof-key'
const RPC = 'https://rpc.testnet.nimiqwatch.com'
const NETWORK_ID = 5 // testnet
const NIM = 100_000n
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function rpc(method, params = []) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) })
    if (r.status === 429) { await sleep(3000); continue }
    const j = await r.json()
    if (j.error) throw new Error(`${method}: ${j.error.message} ${j.error.data ?? ''}`)
    return j.result?.data ?? j.result
  }
  throw new Error('rate limited')
}

// --- wallet ---
const sk = existsSync(KEY_FILE) ? Nimiq.PrivateKey.fromHex(readFileSync(KEY_FILE, 'utf8').trim()) : Nimiq.PrivateKey.generate()
writeFileSync(KEY_FILE, sk.toHex())
const kp = Nimiq.KeyPair.derive(sk)
const address = kp.toAddress()
const addr = address.toUserFriendlyAddress()
console.log('wallet:', addr)

// --- faucet ---
const balance = async () => BigInt((await rpc('getAccountByAddress', [addr]))?.balance ?? 0)
if ((await balance()) < 1_000n * NIM) {
  const f = await fetch('https://faucet.pos.nimiq-testnet.com/tapit', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ address: addr, amount: '2000' }) })
  console.log('faucet:', (await f.text()).slice(0, 120))
  for (let i = 0; i < 40 && (await balance()) < 1_000n * NIM; i++) await sleep(3000)
}
console.log('balance:', Number(await balance()) / 1e5, 'NIM')

// --- Sprout sign-in (same Nimiq signed-message format Nimiq Pay uses) ---
let cookie = ''
async function api(path, body, method) {
  const r = await fetch(APP + path, { method: method ?? (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined })
  const set = r.headers.get('set-cookie')
  if (set) cookie = set.split(';')[0]
  const text = await r.text()
  if (!r.ok) throw new Error(`${path} ${r.status}: ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : null
}
const signMsg = (m) => {
  const hash = sha256(utf8ToBytes('\x16Nimiq Signed Message:\n' + m.length + m))
  return Nimiq.Signature.create(kp.privateKey, kp.publicKey, hash).toHex()
}
const { challenge } = await api('/api/auth/challenge', { purpose: 'signin' })
const v = await api('/api/auth/verify', { challenge, publicKey: kp.publicKey.toHex(), signature: signMsg(challenge) })
console.log('signed in as', v.user.address, v.isNew ? '(new)' : '')
if (v.isNew) await api('/api/pet', { name: 'Proofy' }, 'PATCH')

// --- staking txs ---
const { pools } = await api('/api/validators')
const pool = pools.find((p) => p.recommended) ?? pools[0]
console.log('pool:', pool.name)

async function send(tx) {
  tx.sign(kp)
  const hash = await rpc('sendRawTransaction', [tx.toHex()])
  return typeof hash === 'string' ? hash : tx.hash()
}
async function saveAndVerify(kind, value, hash) {
  const { id } = await api('/api/saves', { txHash: hash, kind, valueLuna: value.toString() })
  for (let i = 0; i < 60; i++) {
    const s = await api(`/api/saves/${id}`)
    if (s.status !== 'pending') return s
    await sleep(3000)
  }
  throw new Error('verification timed out')
}

const me = await api('/api/me')
const hasStaker = me.stake?.hasStaker
const results = []
if (!hasStaker) {
  const value = 500n * NIM
  const h = await send(Nimiq.TransactionBuilder.newCreateStaker(address, Nimiq.Address.fromString(pool.address), value, 0n, await rpc('getBlockNumber'), NETWORK_ID))
  const r = await saveAndVerify('plant', value, h)
  results.push(['Plant (new staker)', value, h, r.status])
}
const add = 120n * NIM
const h2 = await send(Nimiq.TransactionBuilder.newAddStake(address, address, add, 0n, await rpc('getBlockNumber'), NETWORK_ID))
const r2 = await saveAndVerify('feed', add, h2)
results.push(['Feed (add stake)', add, h2, r2.status])

const staker = await rpc('getStakerByAddress', [addr])
console.log('\nRESULTS')
for (const [label, val, hash, status] of results) console.log(`${label} | ${Number(val) / 1e5} NIM | ${hash} | ${status}`)
console.log('staker balance on chain:', Number(staker.balance) / 1e5, 'NIM · pool', pool.name)
