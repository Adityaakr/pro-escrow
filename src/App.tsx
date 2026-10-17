import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { LayoutDashboard, ArrowRightLeft, Briefcase, Settings, ExternalLink, TrendingUp, CheckSquare } from 'lucide-react'
import { NetworkTenet } from '@web3icons/react'
import { ARC_TESTNET_EXPLORER, METERED_ESCROW } from './contract'
import { StreamsList } from './components/StreamsList'
import { CreateStream } from './components/CreateStream'
import { DashboardView } from './components/DashboardView'
import type { StreamType } from './streams'

// ── Logo ──────────────────────────────────────────────────────────────────────
function FlowPayLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#0a2540" />
      {/* Flow arrow */}
      <path d="M7 16 Q7 9 16 9 Q25 9 25 16 Q25 23 16 23" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M13 20 L16 23 L19 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// ── Nav types ─────────────────────────────────────────────────────────────────
type View = 'dashboard' | 'streams' | 'create'

interface NavItem {
  id: View
  label: string
  icon: React.ReactNode
  section?: string
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Overview',   icon: <LayoutDashboard className="size-4" />, section: 'MAIN' },
  { id: 'streams',   label: 'Streams',    icon: <ArrowRightLeft className="size-4" /> },
]

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ view, setView, onCreateStream }: {
  view: View
  setView: (v: View) => void
  onCreateStream: () => void
}) {
  return (
    <aside
      className="hidden md:flex flex-col shrink-0"
      style={{ width: 'var(--sidebar-w)', background: 'var(--bg-white)', borderRight: '1px solid var(--border)', minHeight: '100dvh', position: 'sticky', top: 0 }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <FlowPayLogo size={28} />
        <div>
          <span className="display text-sm font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>FlowPay</span>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>USDC streams</p>
        </div>
      </div>

      {/* Create CTA */}
      <div className="px-3 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={onCreateStream}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          + New stream
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV.map((item) => (
          <div key={item.id}>
            {item.section && (
              <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.09em' }}>
                {item.section}
              </p>
            )}
            <button
              onClick={() => setView(item.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
              style={{
                background: view === item.id ? 'var(--surface-muted)' : 'transparent',
                color: view === item.id ? 'var(--ink)' : 'var(--muted)',
                fontWeight: view === item.id ? 600 : 500,
              }}
            >
              <span style={{ color: view === item.id ? 'var(--blue)' : 'var(--subtle)' }}>{item.icon}</span>
              {item.label}
            </button>
          </div>
        ))}

        {/* Stream type shortcuts */}
        <div>
          <p className="px-3 pt-5 pb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.09em' }}>
            STREAM TYPES
          </p>
          {[
            { label: 'Payroll',   icon: <Briefcase className="size-3.5" />,    color: 'var(--blue)'   },
            { label: 'Vesting',   icon: <TrendingUp className="size-3.5" />,   color: 'var(--purple)' },
            { label: 'Escrow',    icon: <CheckSquare className="size-3.5" />,  color: 'var(--amber)'  },
          ].map(({ label, icon, color }) => (
            <button
              key={label}
              onClick={onCreateStream}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-[--surface-muted]"
              style={{ color: 'var(--muted)' }}
            >
              <span style={{ color }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <button
          onClick={() => setView('dashboard')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
          style={{ color: 'var(--muted)' }}
        >
          <Settings className="size-4" style={{ color: 'var(--subtle)' }} />
          Settings
        </button>
      </div>
    </aside>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ title, sub }: { title: string; sub?: string }) {
  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
      style={{ background: 'var(--bg-white)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3">
        <div className="md:hidden"><FlowPayLogo size={24} /></div>
        <div>
          <h1 className="display text-lg font-semibold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>{title}</h1>
          {sub && <p className="text-xs" style={{ color: 'var(--muted)' }}>{sub}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
          style={{ background: 'var(--surface-muted)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
          <NetworkTenet variant="branded" size={12} />
          Arc Testnet
        </div>
        <ConnectKitButton />
      </div>
    </header>
  )
}

// ── Landing ───────────────────────────────────────────────────────────────────
function Landing() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <FlowPayLogo size={52} />
          <div>
            <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
              FlowPay
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--muted)', lineHeight: '1.6' }}>
              USDC payroll, vesting schedules, and milestone escrow.<br />
              Trustless. On-chain. No intermediaries.
            </p>
          </div>
        </div>

        {/* Stream types */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {[
            { icon: <Briefcase className="size-4" />, color: 'var(--blue)',   label: 'Payroll',  desc: 'Monthly salary — lock and release per pay period' },
            { icon: <TrendingUp className="size-4" />, color: 'var(--purple)', label: 'Vesting',  desc: 'Linear grant vesting over tranches — cliff optional' },
            { icon: <CheckSquare className="size-4" />, color: 'var(--amber)', label: 'Escrow',   desc: 'Milestone-based project payments — client signs off' },
          ].map(({ icon, color, label, desc }, i) => (
            <div
              key={label}
              className="flex items-start gap-3 px-4 py-3.5"
              style={{ background: 'var(--bg-white)', borderTop: i > 0 ? '1px solid var(--border)' : undefined }}
            >
              <div className="mt-0.5 flex size-7 items-center justify-center rounded-lg shrink-0" style={{ background: color + '18', color }}>
                {icon}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{label}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 text-center">
          <ConnectKitButton label="Connect wallet to start" />
          <a
            href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--subtle)' }}
          >
            {METERED_ESCROW.address.slice(0, 10)}…{METERED_ESCROW.address.slice(-6)}
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { address } = useAccount()
  const [view, setView] = useState<View>('dashboard')
  const [refreshTick, setRefreshTick] = useState(0)
  const [createType, setCreateType] = useState<StreamType | null>(null)

  if (!address) return <Landing />

  const VIEW_TITLES: Record<View, { title: string; sub?: string }> = {
    dashboard: { title: 'Overview',     sub: 'Your USDC stream activity' },
    streams:   { title: 'Streams',      sub: 'All active and completed streams' },
    create:    { title: 'New stream',   sub: 'Set up payroll, vesting, or escrow' },
  }

  function handleStreamCreated(_id: bigint) {
    setView('streams')
    setRefreshTick(n => n + 1)
  }

  function openCreate(type?: StreamType) {
    setCreateType(type ?? null)
    setView('create')
  }

  const { title, sub } = VIEW_TITLES[view]

  return (
    <div className="flex min-h-dvh" style={{ background: 'var(--bg)' }}>
      <Sidebar view={view} setView={setView} onCreateStream={() => openCreate()} />

      <div className="flex flex-1 flex-col min-w-0">
        <Topbar title={title} sub={sub} />

        <main className="flex-1 p-6">
          {view === 'dashboard' && (
            <DashboardView
              onCreateStream={openCreate}
              onViewStreams={() => setView('streams')}
              refreshTick={refreshTick}
            />
          )}
          {view === 'streams' && (
            <StreamsList
              refreshTrigger={refreshTick}
              onNewStream={openCreate}
            />
          )}
          {view === 'create' && (
            <CreateStream
              initialType={createType}
              onCreated={handleStreamCreated}
              onBack={() => setView(createType ? 'streams' : 'dashboard')}
            />
          )}
        </main>

        <footer className="px-6 py-3 text-xs flex items-center gap-2" style={{ borderTop: '1px solid var(--border)', color: 'var(--subtle)' }}>
          <span>FlowPay</span>
          <span>·</span>
          <a
            href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
          >
            Contract {METERED_ESCROW.address.slice(0, 10)}…{METERED_ESCROW.address.slice(-6)}
            <ExternalLink className="size-3" />
          </a>
        </footer>
      </div>
    </div>
  )
}
