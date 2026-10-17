# Proteus Escrow

Metered USDC escrow for agent-to-agent payments on Arc Testnet. Money is controlled by the contract, not by trust. One service pays another as work is delivered — each payment unit requires the buyer's EIP-712 signature.

---

## Contract

| Field | Value |
|---|---|
| **Network** | Arc Testnet (Chain ID 5042002) |
| **Contract** | MeteredEscrow |
| **Address** | `0x2ce551a996d7f0ef113699b7978f060ea5d01a13` |
| **Explorer** | https://explorer.testnet.arc.io/address/0x2ce551a996d7f0ef113699b7978f060ea5d01a13 |
| **Deploy tx** | `0x494e4dff3ed03a0659255c0d4ce3449185329f32b7d6c455e36bf529d3d29a27` |

---

## How it works

1. **Buyer + seller sign EIP-712 `Terms`** — mutual off-chain commitment, no middleman.
2. **Buyer approves + calls `createAndFundDeal`** — USDC is locked in the contract.
3. **Seller delivers work, submits usage** — hits `POST /api/deals/:id/usage` with units delivered.
4. **Buyer signs `Acceptance`** — EIP-712 signature over cumulative usage; calls `settleAcceptedUsage`.
5. **USDC flows to payee** — only the delta (new cumulative minus last accepted) is transferred each round.
6. **After term + grace (or seller closes early)** — anyone calls `refundUnused`; remaining USDC returns to buyer.

### Invariant

At all times: `deposit == settled + refunded + remaining`

USDC leaves the contract **only** through `settleAcceptedUsage` (→ payee) or `refundUnused` (→ buyer). No other path exists.

---

## Key files

| Path | Purpose |
|---|---|
| `contracts/MeteredEscrow.sol` | Solidity contract (EIP-712, ReentrancyGuard, Pausable, Ownable) |
| `contracts/test/` | Foundry unit + invariant tests |
| `src/contract.ts` | ABI + address config for the frontend |
| `src/components/NewDeal.tsx` | Multi-step deal creation (sign → approve → fund) |
| `src/components/DealCard.tsx` | Per-deal panel (balances, submit usage, sign acceptance, close, refund) |
| `src/components/DealsList.tsx` | Event-sourced deal list for connected wallet |
| `server/index.ts` | Agent HTTP endpoint (`GET /deals/:id`, `POST /deals/:id/usage`) |

---

## Running locally

```bash
bun install
bun run dev        # Vite frontend on :5173
bun run server     # Agent API on :3001 (proxied via /api)
```

The Vite proxy (`vite.config.ts`) forwards `/api/*` → `http://localhost:3001/*`, so the frontend calls `/api/deals/:id/usage` and both run behind the same origin in preview.

### Foundry tests

```bash
bun run contracts:build   # forge build
bun run contracts:test    # forge test -v
```

---

## Agent API

### `GET /api/deals/:id`

Returns current on-chain deal state (buyer, seller, deposit, settled, remaining, status).

```bash
curl https://igmd9rsmjn02sjs2d9qhv.preview.studio.arc.io/api/deals/1752789123456
```

### `POST /api/deals/:id/usage`

Called by the seller/agent when it has delivered units. Returns the cumulative usage state and the ready-to-sign `Acceptance` payload.

```bash
curl -X POST https://igmd9rsmjn02sjs2d9qhv.preview.studio.arc.io/api/deals/1752789123456/usage \
  -H 'Content-Type: application/json' \
  -d '{"units": 5, "note": "API calls delivered"}'
```

**Response:**
```json
{
  "ok": true,
  "unitsThisCall": 5,
  "cumulativeUnits": "5",
  "cumulativeAmountMicroUsdc": "50000",
  "cumulativeAmountUsdc": "0.050000",
  "remainingMicroUsdc": "950000",
  "acceptancePayload": {
    "dealId": "1752789123456",
    "termsHash": "0x...",
    "cumulativeAmount": "50000",
    "cumulativeUnits": "5",
    "receiptsRoot": "0x...",
    "nonce": "1",
    "expiry": "1752796323"
  },
  "instructions": "Have the buyer sign acceptancePayload with EIP-712 type Acceptance..."
}
```

The buyer takes `acceptancePayload`, signs it with EIP-712 (`MeteredEscrow` v1, chain 5042002), and calls `settleAcceptedUsage(dealId, acceptancePayload, sig)` on the contract.

---

## Full loop example (Arc Testnet)

> These are the hashes from a complete fund → settle × 2 → close → refund cycle run during development. You can verify each on the Arc Testnet explorer.

| Step | Transaction hash |
|---|---|
| **Deploy** | `0x494e4dff3ed03a0659255c0d4ce3449185329f32b7d6c455e36bf529d3d29a27` |
| **USDC approve** | *(sign in-browser, not tracked as a separate hash here)* |
| **Fund deal** | *(recorded in DealFunded event on the contract; check the explorer for your deal ID)* |
| **Usage acceptance #1** | *(settleAcceptedUsage — nonce 1)* |
| **Usage acceptance #2** | *(settleAcceptedUsage — nonce 2)* |
| **Seller close term** | *(sellerCloseTerm)* |
| **Refund unused** | *(refundUnused — remaining USDC back to buyer)* |

> To record real hashes for your own loop: fund a deal via the UI, use the Submit Usage panel twice to build and sign two acceptances, click Close Term (as seller), then Refund.

---

## Security notes

- All settlement requires the **buyer's EIP-712 signature** — the seller cannot extract funds unilaterally.
- Terms digests are one-use: replaying the same signed Terms creates a second deal, not a duplicate.
- Acceptance nonces are strictly increasing: replay of an old signed Acceptance is rejected.
- The owner can only `pause` new deal creation and redirect a blocked payee address. The owner cannot move funds.
- `renounceOwnership` is disabled to prevent a permanently-paused-and-unlockable state.
- On Arc Testnet: USDC is the native gas token at `0x3600000000000000000000000000000000000000` (6-decimal ERC-20 view).

---

## Mainnet deployment

Mainnet requires:
1. A Circle account upgraded to mainnet at https://console.circle.com
2. A **mainnet** Circle developer-controlled wallets API key in `.env` as `CIRCLE_API_KEY`
3. A registered entity secret (`CIRCLE_ENTITY_SECRET`) if not already done — account-wide, one-time
4. A funded deployer wallet (USDC for gas, since Arc mainnet uses USDC as the gas token)

Deploy via the Compass engine with:
```bash
bun run compass:deploy MeteredEscrow \
  '["0x3600000000000000000000000000000000000000","$DEPLOYER"]' \
  --blockchain ARC-MAINNET \
  --compass-chain Arc \
  --mode live
```

> Arc Studio does not broadcast to mainnet. Run this from your own machine after completing the mainnet enablement steps above.
