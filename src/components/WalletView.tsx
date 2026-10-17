import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { USDC_ADDRESS, ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER } from '@/contract'
import { formatUnitsFixed } from '@/onchain-money'
import { ConnectKitButton } from 'connectkit'

function copy(text: string, label: string) {
  void navigator.clipboard.writeText(text)
  toast.success(`${label} copied`)
}

export function WalletView() {
  const { address, isConnected } = useAccount()

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: !!address },
  })

  const balance = typeof usdcBalance === 'bigint' ? usdcBalance : 0n
  const fmt = (v: bigint) => formatUnitsFixed(v, 6, 2)

  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Connect your wallet to view balances.</p>
        <ConnectKitButton />
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
          Wallet
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Your connected wallet and on-chain USDC balance.
        </p>
      </div>

      {/* Balance card */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
        <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
            USDC BALANCE
          </p>
          <p className="display text-4xl font-bold tabular-nums" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
            ${fmt(balance)}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            Read from Arc Testnet
          </p>
        </div>

        {/* Address row */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--muted)' }}>Wallet address</p>
            <p className="mono text-sm" style={{ color: 'var(--ink-2)' }}>
              {address.slice(0, 10)}…{address.slice(-8)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => copy(address, 'Address')}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}
            >
              <Copy className="size-3" />
              Copy
            </button>
            <a
              href={`${ARC_TESTNET_EXPLORER}/address/${address}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}
            >
              <ExternalLink className="size-3" />
              Explorer
            </a>
          </div>
        </div>
      </div>

      {/* Faucet info */}
      <div
        className="rounded-xl px-5 py-4 flex items-start gap-3"
        style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}
      >
        <div
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
        >
          $
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Need testnet USDC?</p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
            Use the "Get test USDC" button in the Arc Studio sidebar, or visit the Circle faucet to get testnet funds.
          </p>
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: 'var(--accent)' }}
          >
            faucet.circle.com <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      {/* Contract reference */}
      <div
        className="rounded-xl px-5 py-4 space-y-3"
        style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
          CONTRACTS
        </p>
        {[
          { label: 'USDC (Arc Testnet)', addr: USDC_ADDRESS },
        ].map(({ label, addr }) => (
          <div key={addr} className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--muted)' }}>{label}</span>
            <span className="mono flex items-center gap-1" style={{ color: 'var(--ink-2)' }}>
              {addr.slice(0, 10)}…{addr.slice(-6)}
              <button onClick={() => copy(addr, label)} className="opacity-40 hover:opacity-100 transition-opacity">
                <Copy className="size-3" />
              </button>
              <a href={`${ARC_TESTNET_EXPLORER}/address/${addr}`} target="_blank" rel="noreferrer" className="opacity-40 hover:opacity-100 transition-opacity">
                <ExternalLink className="size-3" />
              </a>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
