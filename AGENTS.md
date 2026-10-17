# Proteus Escrow

> Built with Arc Studio — metered USDC escrow for agent-to-agent payments

---

## What This App Does

Metered USDC escrow on Arc Testnet. A buyer locks USDC into the contract; a seller delivers work; the buyer signs EIP-712 Acceptances to release payment per unit delivered. Unused USDC is refundable after the term + grace period ends, or after the seller closes the term early.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit, EIP-712 typed signatures
- Contracts: Solidity 0.8.28 + Foundry + OpenZeppelin (EIP712, ReentrancyGuard, Pausable, Ownable)
- Backend: Bun HTTP server (`server/index.ts`) on port 3001, proxied via Vite `/api`
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002)
- Token: USDC (Address: 0x3600000000000000000000000000000000000000, 6 decimals)
- Toasts: Sonner

## Deployed Contracts

| Contract | Network | Address | Explorer |
|---|---|---|---|
| MeteredEscrow | Arc Testnet | `0x2ce551a996d7f0ef113699b7978f060ea5d01a13` | https://explorer.testnet.arc.io/address/0x2ce551a996d7f0ef113699b7978f060ea5d01a13 |

Deploy tx: `0x494e4dff3ed03a0659255c0d4ce3449185329f32b7d6c455e36bf529d3d29a27`

## Key Files

- `src/App.tsx` — Main layout (header, tabs, landing page)
- `src/contract.ts` — ABI + address, chain constants
- `src/components/NewDeal.tsx` — 4-step deal creation (seller sign → buyer sign → approve → fund)
- `src/components/DealCard.tsx` — Per-deal detail (balances, usage submission, acceptance signing, close, refund)
- `src/components/DealsList.tsx` — Event-sourced list of deals for connected wallet
- `src/components/TxButton.tsx` — Reusable transaction button with states
- `src/components/TxReceipt.tsx` — Transaction receipt with explorer link
- `server/index.ts` — Agent endpoint (GET /deals/:id, POST /deals/:id/usage)
- `contracts/MeteredEscrow.sol` — The escrow contract
- `contracts/test/` — Foundry unit + invariant tests

## Environment Variables

- `VITE_METERED_ESCROW_ADDRESS` — deployed contract address (set in .env)
- `RPC_PROXY_BASE_URL` / `RPC_PROXY_TOKEN` / `RPC_PROXY_CHAINS` — Arc Studio RPC proxy (auto-provisioned)

## To Run

```bash
bun install
bun run dev        # Vite on :5173
bun run server     # Agent API on :3001
```

## Contract Tests

```bash
bun run contracts:test
```
