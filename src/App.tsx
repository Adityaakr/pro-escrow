import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { WalletBar } from './components/WalletBar'
import { NewDeal } from './components/NewDeal'
import { DealsList } from './components/DealsList'
import { NetworkTenet } from '@web3icons/react'
import { ARC_TESTNET_EXPLORER, METERED_ESCROW } from './contract'
import { ExternalLink } from 'lucide-react'

function ArcLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="arc-grad" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2B2FC2" />
          <stop offset="50%" stopColor="#6B3B8C" />
          <stop offset="100%" stopColor="#A03070" />
        </linearGradient>
      </defs>
      {/* Arch — thick rounded stroke forming the A shape */}
      <path
        d="M18 82 Q18 20 50 12 Q82 20 82 82"
        stroke="url(#arc-grad)"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right foot curl inward */}
      <path
        d="M82 82 Q82 68 66 68"
        stroke="url(#arc-grad)"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

type Tab = 'deals' | 'new'

export default function App() {
  const { address } = useAccount()
  const [tab, setTab] = useState<Tab>('deals')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  function handleDealCreated(_dealId: bigint) {
    setTab('deals')
    setRefreshTrigger((n) => n + 1)
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b px-4 py-3" style={{ background: 'rgba(255,255,255,0.80)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl overflow-hidden" style={{ background: '#0d0f1f' }}>
              <ArcLogo size={22} />
            </div>
            <div>
              <span className="display text-base font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
                Proteus Escrow
              </span>
              <div className="flex items-center gap-1">
                <NetworkTenet variant="branded" size={10} />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Arc Testnet</span>
              </div>
            </div>
          </div>
          <WalletBar />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6">
        {!address ? (
          /* Landing */
          <div className="flex flex-col items-center gap-6 py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-3xl overflow-hidden" style={{ background: '#0d0f1f' }}>
              <ArcLogo size={44} />
            </div>
            <div>
              <h1 className="display text-3xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.04em' }}>
                Proteus Escrow
              </h1>
              <p className="mt-2 text-sm max-w-xs mx-auto" style={{ color: 'var(--muted)' }}>
                Metered USDC escrow for agent-to-agent payments. Money moves as work is delivered — no trust required.
              </p>
            </div>

            <div className="w-full space-y-3 rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid var(--border)', backdropFilter: 'blur(20px)' }}>
              {[
                ['Both parties sign EIP-712 terms', 'Mutual cryptographic commitment, no middleman'],
                ['Buyer signs usage acceptances', 'Pay per unit as work is delivered'],
                ['Automatic refund after grace period', 'Unused USDC returns to buyer, trustlessly'],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-3 rounded-2xl p-3" style={{ background: 'var(--surface-muted)' }}>
                  <div className="mt-0.5 size-2 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{title}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-2">
              <ConnectKitButton label="Connect to start" />
              <a
                href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
                style={{ color: 'var(--muted)' }}
              >
                Contract: {METERED_ESCROW.address.slice(0, 10)}...{METERED_ESCROW.address.slice(-6)}{' '}
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        ) : (
          /* Authenticated */
          <div className="space-y-5">
            {/* Tabs */}
            <div className="flex rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid var(--border)' }}>
              {(['deals', 'new'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 rounded-xl py-2 text-sm font-semibold transition-all"
                  style={{
                    background: tab === t ? 'var(--accent)' : 'transparent',
                    color: tab === t ? 'white' : 'var(--muted)',
                  }}
                >
                  {t === 'new' ? '+ New Deal' : 'My Deals'}
                </button>
              ))}
            </div>

            {tab === 'new' && <NewDeal onCreated={handleDealCreated} />}
            {tab === 'deals' && <DealsList refreshTrigger={refreshTrigger} />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <a
          href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
          style={{ color: 'var(--subtle)' }}
        >
          MeteredEscrow {METERED_ESCROW.address.slice(0, 8)}...{METERED_ESCROW.address.slice(-6)} on Arc Testnet{' '}
          <ExternalLink className="size-3" />
        </a>
      </footer>
    </div>
  )
}
