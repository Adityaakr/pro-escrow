import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { LayoutDashboard, ArrowRightLeft, Plus, Briefcase, TrendingUp, Flag, ChevronRight } from 'lucide-react'
import { NetworkTenet } from '@web3icons/react'
import { StreamsList } from './components/StreamsList'
import { CreateStream } from './components/CreateStream'
import { DashboardView } from './components/DashboardView'
import { LandingPage } from './components/LandingPage'
import type { StreamType } from './streams'

type View = 'dashboard' | 'streams' | 'create'

// ── Logo mark ────────────────────────────────────────────────────────────────
function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8"
        style={{ fill: 'rgba(232,195,130,0.12)' }} />
      <rect width="28" height="28" rx="8"
        fill="none" stroke="rgba(232,195,130,0.3)" strokeWidth="1" />
      <path d="M8 14 C8 10 10.5 7.5 14 7.5 C17.5 7.5 20 10 20 14"
        stroke="#e8c382" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M14 18 L14 14" stroke="#e8c382" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="14" cy="19.5" r="1.5" fill="#e8c382" />
    </svg>
  )
}

const TYPE_META: Record<StreamType, { icon: React.ReactNode; color: string }> = {
  payroll: { icon: <Briefcase size={13} />, color: 'var(--blue)' },
  vesting: { icon: <TrendingUp size={13} />, color: 'var(--purple)' },
  escrow:  { icon: <Flag size={13} />,      color: 'var(--amber)' },
}
const TYPE_LABELS: Record<StreamType, string> = {
  payroll: 'Payroll',
  vesting: 'Vesting',
  escrow:  'Milestones',
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ view, setView, onCreateStream }: {
  view: View; setView: (v: View) => void; onCreateStream: (t?: StreamType) => void
}) {
  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      background: 'var(--bg-white)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100dvh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{
        padding: '20px 16px 14px',
        borderBottom: '1px solid var(--border)',
      }}>
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, position: 'relative' }}>
          {/* Corner marks like the reference design */}
          <span style={{ position: 'absolute', top: -4, left: -4, width: 6, height: 6, background: 'var(--subtle)' }} />
          <span style={{ position: 'absolute', bottom: -4, right: -4, width: 6, height: 6, background: 'var(--subtle)' }} />
          <Logo size={28} />
          <div>
            <div style={{
              fontFamily: 'Gloock, Georgia, serif',
              fontSize: 15,
              color: 'var(--ink)',
              lineHeight: 1.1,
            }}>FlowPay</div>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--subtle)',
              marginTop: 1,
            }}>USDC streams</div>
          </div>
        </a>

        {/* New stream CTA — gold */}
        <button
          onClick={() => onCreateStream()}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 0',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(to bottom, #f0d09a, #e8c382)',
            color: '#351e10',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase' as const,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.25), 0 4px 12px rgba(232,195,130,0.2)',
            minHeight: 40,
          }}
        >
          <Plus size={13} /> New stream
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: '10px 8px', flex: 1 }}>
        <div style={{ marginBottom: 4 }}>
          {([
            { id: 'dashboard' as View, label: 'Overview',  icon: <LayoutDashboard size={14} /> },
            { id: 'streams'   as View, label: 'Streams',   icon: <ArrowRightLeft size={14} /> },
          ]).map(item => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                  color: active ? 'var(--ink)' : 'var(--muted)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  marginBottom: 2,
                  minHeight: 40,
                  border: active ? '1px solid var(--border)' : '1px solid transparent',
                }}
              >
                <span style={{ color: active ? 'var(--accent)' : 'var(--subtle)', display: 'flex' }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: 'var(--subtle)',
            padding: '0 10px',
            marginBottom: 8,
          }}>
            Stream types
          </div>
          {(['payroll', 'vesting', 'escrow'] as StreamType[]).map(t => (
            <button
              key={t}
              onClick={() => onCreateStream(t)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--muted)',
                fontSize: 13,
                marginBottom: 1,
                minHeight: 38,
              }}
              onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { (e.currentTarget).style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: TYPE_META[t].color, display: 'flex' }}>{TYPE_META[t].icon}</span>
                {TYPE_LABELS[t]}
              </div>
              <ChevronRight size={12} style={{ color: 'var(--subtle)', opacity: 0.5 }} />
            </button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: 10, color: 'var(--subtle)', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Arc Testnet
        </p>
      </div>
    </aside>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ title, onNewStream }: { title: string; onNewStream: () => void }) {
  return (
    <header style={{
      height: 'var(--topbar-h)',
      background: 'rgba(7,7,7,0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <h1 style={{
        fontFamily: 'Gloock, Georgia, serif',
        fontSize: 18,
        color: 'var(--ink)',
        margin: 0,
        fontWeight: 400,
        letterSpacing: '-0.01em',
      }}>
        {title}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Network chip */}
        <div className="hidden sm:flex" style={{
          alignItems: 'center',
          gap: 6,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '5px 10px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: 'var(--muted)',
          textTransform: 'uppercase' as const,
        }}>
          <NetworkTenet variant="branded" size={13} />
          <span>Arc Testnet</span>
        </div>
        <ConnectKitButton />
        <button
          className="flex md:hidden"
          onClick={onNewStream}
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(to bottom, #f0d09a, #e8c382)',
            color: '#351e10',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Plus size={16} />
        </button>
      </div>
    </header>
  )
}

// ── Mobile bottom nav ─────────────────────────────────────────────────────────
function BottomNav({ view, setView, onNewStream }: {
  view: View; setView: (v: View) => void; onNewStream: () => void
}) {
  return (
    <nav className="flex md:hidden" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: 'rgba(7,7,7,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'stretch',
      height: 64,
    }}>
      {[
        { id: 'dashboard' as View, label: 'Overview', icon: <LayoutDashboard size={18} /> },
        { id: 'streams'   as View, label: 'Streams',  icon: <ArrowRightLeft size={18} /> },
      ].map(item => {
        const active = view === item.id
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              fontSize: 10,
              fontWeight: active ? 700 : 400,
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
              color: active ? 'var(--ink)' : 'var(--subtle)',
              background: 'transparent',
              borderRadius: 0,
            }}
          >
            <span style={{ color: active ? 'var(--accent)' : 'var(--subtle)' }}>{item.icon}</span>
            {item.label}
          </button>
        )
      })}
      {/* Center FAB */}
      <button
        onClick={onNewStream}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          color: '#351e10',
          background: 'transparent',
        }}
      >
        <span style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'linear-gradient(to bottom, #f0d09a, #e8c382)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(232,195,130,0.35)',
        }}>
          <Plus size={16} color="#351e10" />
        </span>
        New
      </button>
    </nav>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { address } = useAccount()
  const [view, setView]               = useState<View>('dashboard')
  const [refreshTick, setRefreshTick] = useState(0)
  const [createType, setCreateType]   = useState<StreamType | null>(null)

  if (!address) return <LandingPage />

  const TITLES: Record<View, string> = {
    dashboard: 'Overview',
    streams:   'Streams',
    create:    'New stream',
  }

  function handleCreated(_id: bigint) {
    setView('streams')
    setTimeout(() => setRefreshTick(n => n + 1), 2000)
  }

  function openCreate(type?: StreamType) {
    setCreateType(type ?? null)
    setView('create')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--bg)' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar view={view} setView={setView} onCreateStream={openCreate} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <Topbar title={TITLES[view]} onNewStream={() => openCreate()} />

        <main style={{
          flex: 1,
          padding: '24px 20px',
          paddingBottom: 80,
          maxWidth: 1160,
          width: '100%',
          boxSizing: 'border-box',
        }}>
          {view === 'dashboard' && (
            <DashboardView
              onCreateStream={openCreate}
              onViewStreams={() => setView('streams')}
              refreshTick={refreshTick}
            />
          )}
          {view === 'streams' && (
            <StreamsList refreshTrigger={refreshTick} onNewStream={openCreate} />
          )}
          {view === 'create' && (
            <CreateStream
              initialType={createType}
              onCreated={handleCreated}
              onBack={() => setView(createType ? 'streams' : 'dashboard')}
            />
          )}
        </main>

        <footer className="hidden md:flex" style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border)',
          alignItems: 'center',
          gap: 10,
          fontSize: 11,
          color: 'var(--subtle)',
          letterSpacing: '0.06em',
        }}>
          <span style={{ fontFamily: 'Gloock, Georgia, serif', fontSize: 13, color: 'var(--muted)' }}>FlowPay</span>
          <span style={{ color: 'var(--subtle)', opacity: 0.4 }}>·</span>
          <span style={{ textTransform: 'uppercase' }}>USDC streams on Arc Testnet</span>
        </footer>
      </div>

      <BottomNav view={view} setView={setView} onNewStream={() => openCreate()} />
    </div>
  )
}
