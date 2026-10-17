/**
 * Proteus Escrow — Agent Usage Endpoint
 * POST /deals/:id/usage
 *
 * An AI agent (seller) hits this endpoint with the units it delivered.
 * Returns the current cumulative usage state and the Acceptance payload
 * ready for the buyer to sign and submit to the contract.
 *
 * Usage:
 *   curl -X POST http://localhost:3001/deals/12345/usage \
 *     -H 'Content-Type: application/json' \
 *     -d '{"units": 5, "note": "api calls delivered"}'
 */

import { createPublicClient, http, parseAbi, type Address } from 'viem'
import { arcTestnet } from 'viem/chains'

// Contract address stored in env (VITE_ prefix so frontend reads the same value)
const METERED_ESCROW_ADDRESS = (process.env.VITE_METERED_ESCROW_ADDRESS ?? '') as Address
if (!METERED_ESCROW_ADDRESS) {
  throw new Error('VITE_METERED_ESCROW_ADDRESS is not set in .env')
}

const ABI = parseAbi([
  'function getDeal(uint256 dealId) external view returns (address buyer, address seller, address payee, address buyerRefundTo, bytes32 termsHash, uint256 deposit, uint256 settled, uint256 refunded, uint256 acceptedNonce, uint256 acceptedUnits, uint256 maxUnits, uint64 end, uint64 grace, bool sellerClosed, uint8 status)',
  'function balances(uint256 dealId) external view returns (uint256 deposit, uint256 settled, uint256 refunded, uint256 remaining)',
])

// In-memory nonce tracker (use a persistent DB for production)
const nonceTracker = new Map<string, bigint>()
const cumulativeState = new Map<string, { units: bigint; amount: bigint }>()

// RPC: use the Arc Studio proxy when available, otherwise fall back to the public endpoint
const proxyChains = (process.env.RPC_PROXY_CHAINS ?? '').split(',')
const rpcUrl =
  process.env.RPC_PROXY_BASE_URL && proxyChains.includes('Arc_Testnet')
    ? `${process.env.RPC_PROXY_BASE_URL}/api/rpc/Arc_Testnet?_rpc_token=${process.env.RPC_PROXY_TOKEN}`
    : (() => {
        console.warn('RPC proxy not available for Arc_Testnet — falling back to public RPC. Rate limits are unknown; do not use in production.')
        return arcTestnet.rpcUrls.default.http[0]
      })()

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(rpcUrl),
})

const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url)

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    // GET /deals/:id — read current on-chain state
    const getMatch = url.pathname.match(/^\/deals\/(\d+)$/)
    if (req.method === 'GET' && getMatch) {
      const dealId = BigInt(getMatch[1])
      try {
        const [deal, bals] = await Promise.all([
          publicClient.readContract({ address: METERED_ESCROW_ADDRESS, abi: ABI, functionName: 'getDeal', args: [dealId] }),
          publicClient.readContract({ address: METERED_ESCROW_ADDRESS, abi: ABI, functionName: 'balances', args: [dealId] }),
        ])
        const d = deal as { buyer: string; seller: string; payee: string; deposit: bigint; settled: bigint; acceptedNonce: bigint; acceptedUnits: bigint; maxUnits: bigint; status: number }
        const b = bals as [bigint, bigint, bigint, bigint]
        return new Response(JSON.stringify({
          dealId: String(dealId),
          buyer: d.buyer,
          seller: d.seller,
          payee: d.payee,
          status: d.status,
          deposit: String(b[0]),
          settled: String(b[1]),
          refunded: String(b[2]),
          remaining: String(b[3]),
          acceptedNonce: String(d.acceptedNonce),
          acceptedUnits: String(d.acceptedUnits),
          maxUnits: String(d.maxUnits),
        }), { headers })
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers })
      }
    }

    // POST /deals/:id/usage — agent submits delivered units
    const usageMatch = url.pathname.match(/^\/deals\/(\d+)\/usage$/)
    if (req.method === 'POST' && usageMatch) {
      const dealId = BigInt(usageMatch[1])
      const key = String(dealId)

      let body: { units?: number; note?: string }
      try {
        body = await req.json() as { units?: number; note?: string }
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers })
      }

      const units = Number(body?.units ?? 0)
      if (!Number.isInteger(units) || units <= 0) {
        return new Response(JSON.stringify({ error: '"units" must be a positive integer' }), { status: 400, headers })
      }

      try {
        const [deal, bals] = await Promise.all([
          publicClient.readContract({ address: METERED_ESCROW_ADDRESS, abi: ABI, functionName: 'getDeal', args: [dealId] }),
          publicClient.readContract({ address: METERED_ESCROW_ADDRESS, abi: ABI, functionName: 'balances', args: [dealId] }),
        ])
        const d = deal as { buyer: string; seller: string; payee: string; deposit: bigint; settled: bigint; acceptedNonce: bigint; acceptedUnits: bigint; maxUnits: bigint; termsHash: string; status: number; sellerClosed: boolean }
        const b = bals as [bigint, bigint, bigint, bigint]

        if (d.status !== 1) {
          return new Response(JSON.stringify({ error: `Deal is not in Funded state (status=${d.status})` }), { status: 409, headers })
        }
        if (d.sellerClosed) {
          return new Response(JSON.stringify({ error: 'Deal has been seller-closed; no further usage accepted' }), { status: 409, headers })
        }

        // Accumulate from on-chain baseline + in-memory deltas
        const prev = cumulativeState.get(key) ?? { units: d.acceptedUnits, amount: d.settled }
        const newCumulativeUnits = prev.units + BigInt(units)
        if (newCumulativeUnits > d.maxUnits) {
          return new Response(JSON.stringify({ error: `Units (${newCumulativeUnits}) would exceed maxUnits (${d.maxUnits})` }), { status: 409, headers })
        }

        // Pro-rata USDC amount; cap at deposit
        const perUnit = d.deposit / d.maxUnits
        const newCumulativeAmount = prev.amount + BigInt(units) * perUnit
        const cappedAmount = newCumulativeAmount > b[0] ? b[0] : newCumulativeAmount

        // Strictly increasing nonce
        const lastNonce = nonceTracker.get(key) ?? d.acceptedNonce
        const newNonce = lastNonce + 1n

        // Receipts root = SHA-256(units || note)
        const enc = new TextEncoder()
        const noteBytes = enc.encode(body.note ?? '')
        const hashInput = new Uint8Array(8 + noteBytes.length)
        new DataView(hashInput.buffer).setBigUint64(0, BigInt(units), false)
        hashInput.set(noteBytes, 8)
        const hashBuf = await crypto.subtle.digest('SHA-256', hashInput)
        const receiptsRoot = '0x' + Array.from(new Uint8Array(hashBuf)).map((n) => n.toString(16).padStart(2, '0')).join('')

        const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600)

        // Persist in-memory state
        cumulativeState.set(key, { units: newCumulativeUnits, amount: cappedAmount })
        nonceTracker.set(key, newNonce)

        return new Response(JSON.stringify({
          ok: true,
          note: body.note,
          unitsThisCall: units,
          cumulativeUnits: String(newCumulativeUnits),
          cumulativeAmountMicroUsdc: String(cappedAmount),
          cumulativeAmountUsdc: (Number(cappedAmount) / 1e6).toFixed(6),
          remainingMicroUsdc: String(b[3]),
          remainingUsdc: (Number(b[3]) / 1e6).toFixed(6),
          acceptancePayload: {
            dealId: String(dealId),
            termsHash: d.termsHash,
            cumulativeAmount: String(cappedAmount),
            cumulativeUnits: String(newCumulativeUnits),
            receiptsRoot,
            nonce: String(newNonce),
            expiry: String(expiry),
          },
          instructions:
            'Have the buyer sign acceptancePayload with EIP-712 type Acceptance (domain: MeteredEscrow v1, chain 5042002, verifyingContract from VITE_METERED_ESCROW_ADDRESS), then call settleAcceptedUsage(dealId, acceptancePayload, buyerSig) on the MeteredEscrow contract.',
        }), { headers })
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers })
      }
    }

    return new Response(
      JSON.stringify({ error: 'Not found', routes: ['GET /deals/:id', 'POST /deals/:id/usage'] }),
      { status: 404, headers }
    )
  },
})

console.log(`Proteus Escrow agent endpoint running on http://localhost:${server.port}`)
console.log('Routes:')
console.log('  GET  /deals/:id            — read deal state')
console.log('  POST /deals/:id/usage      — submit usage units, get acceptance payload')
