import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { LayoutDashboard, ArrowRightLeft, Plus, Briefcase, TrendingUp, Flag, ChevronRight, ArrowRight } from 'lucide-react'
import { NetworkTenet } from '@web3icons/react'
import { StreamsList } from './components/StreamsList'
import { CreateStream } from './components/CreateStream'
import { DashboardView } from './components/DashboardView'
import { LandingPage } from './components/LandingPage'
import type { StreamType } from './streams'

type View = 'dashboard' | 'streams' | 'create'

// ── Logo mark ────────────────────────────────────────────────────────────────
// Matches reference: 40x40, border border-white/15, inset glow shadow,
// gradient bg from rgba(255,255,255,0.16) to rgba(255,255,255,0.045)
function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <span style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.15)',
      background: 'linear-gradient(to bottom, rgba(255,255,255,0.16), rgba(255,255,255,0.045))',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.90), 0 1rem 2rem rgba(0,0,0,0.35)',
      flexShrink: 0,
    }}>
      {/* FP monogram */}
      <span style={{
        fontFamily: 'Manrope, sans-serif',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: '#fff',
        textShadow: '0 1px 0 rgba(0,0,0,0.8)',
        userSelect: 'none',
      }}>FP</span>
    </span>
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

// ── Sidebar — left-bordered panel, matches reference brand block aesthetic ────
function Sidebar({ view, setView, onCreateStream }: {
  view: View; setView: (v: View) => void; onCreateStream: (t?: StreamType) => void
}) {
  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      background: 'rgba(10,10,10,0.90)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100dvh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
    }}>

      {/* Brand block — exact reference: border-x, corner marks, min-h-20 */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 'var(--topbar-h)',
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Corner pixel marks */}
        <span style={{ position: 'absolute', top: 14, left: -3, width: 6, height: 6, background: '#71717a' }} />
        <span style={{ position: 'absolute', bottom: 14, right: -3, width: 6, height: 6, background: '#71717a' }} />

        <LogoMark size={36} />
        <div style={{ lineHeight: 1 }}>
          <div style={{
            display: 'block',
            fontFamily: 'Gloock, Georgia, serif',
            fontSize: 14,
            fontWeight: 400,
            letterSpacing: '-0.01em',
            color: '#fff',
          }}>FlowPay</div>
          <div style={{
            display: 'block',
            marginTop: 3,
            fontFamily: 'Manrope, sans-serif',
            fontSize: 10,
            fontWeight: 400,
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            color: '#71717a',
          }}>Streams</div>
        </div>
      </div>

      {/* New stream CTA */}
      <div style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => onCreateStream()}
          className="btn-primary"
          style={{ width: '100%', height: 38 }}
        >
          <Plus size={13} />
          New stream
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px', flex: 1 }}>
        {/* Main nav */}
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
                className={`sidebar-item ${active ? 'active' : ''}`}
                style={{ marginBottom: 2 }}
              >
                <span style={{ color: active ? 'var(--accent)' : 'var(--subtle)', display: 'flex' }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Stream types section */}
        <div style={{ marginTop: 16 }}>
          <div style={{
            padding: '0 10px',
            marginBottom: 6,
            fontFamily: 'Manrope, sans-serif',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            color: 'var(--subtle)',
          }}>
            Stream types
          </div>
          {(['payroll', 'vesting', 'escrow'] as StreamType[]).map(t => (
            <button
              key={t}
              onClick={() => onCreateStream(t)}
              className="sidebar-item"
              style={{ justifyContent: 'space-between', marginBottom: 1 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: TYPE_META[t].color, display: 'flex' }}>{TYPE_META[t].icon}</span>
                {TYPE_LABELS[t]}
              </div>
              <ChevronRight size={11} style={{ color: 'var(--subtle)', opacity: 0.5 }} />
            </button>
          ))}
        </div>
      </nav>

      {/* Network badge footer */}
      <div style={{ padding: '10px 10px 14px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 6,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
        }}>
          <NetworkTenet variant="branded" size={12} />
          <span style={{
            fontFamily: 'Manrope, sans-serif',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: 'var(--subtle)',
          }}>Arc Testnet</span>
        </div>
      </div>
    </aside>
  )
}

// ── Topbar — exact reference header structure ─────────────────────────────────
function Topbar({ title, onNewStream }: { title: string; onNewStream: () => void }) {
  return (
    <header style={{
      height: 'var(--topbar-h)',      /* min-h-20 = 80px */
      background: 'rgba(9,9,9,0.80)', /* neutral-950/80 */
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 20,
    }}>
      {/* Title block — matches reference brand block */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        borderRight: '1px solid var(--border)',
        position: 'relative',
        minWidth: 0,
      }}>
        <h1 style={{
          fontFamily: 'Gloock, Georgia, serif',
          fontSize: 18,
          fontWeight: 400,
          letterSpacing: '-0.01em',
          color: '#fff',
          margin: 0,
          whiteSpace: 'nowrap',
        }}>{title}</h1>
      </div>

      {/* Right nav links (reference style: border-r, tracking-widest, text-xs) */}
      <nav style={{ display: 'flex', alignItems: 'stretch', flex: 1 }} className="hidden lg:flex">
        {/* Network pill — acts as a nav item */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 20px',
          borderRight: '1px solid var(--border)',
          fontFamily: 'Manrope, sans-serif',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          color: 'var(--muted)',
        }}>
          <NetworkTenet variant="branded" size={13} />
          Arc Testnet
        </div>
      </nav>

      {/* CTA group — matches reference right-side buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 16px',
        borderLeft: '1px solid var(--border)',
      }}>
        {/* Desktop: connect wallet ghost-style, new stream primary */}
        <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 8 }}>
          <ConnectKitButton />
          <button
            onClick={onNewStream}
            className="btn-primary"
          >
            New stream
            <ArrowRight size={13} />
          </button>
        </div>
        {/* Mobile: just the + fab */}
        <button
          className="flex lg:hidden btn-gold"
          onClick={onNewStream}
          style={{ height: 38, width: 38, padding: 0, borderRadius: 8 }}
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
    <nav className="flex lg:hidden" style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 50,
      height: 64,
      background: 'rgba(7,7,7,0.92)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'stretch',
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
              fontFamily: 'Manrope, sans-serif',
              fontSize: 10,
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: active ? '#fff' : 'var(--muted)',
              borderRight: '1px solid var(--border)',
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
          fontFamily: 'Manrope, sans-serif',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          color: '#351e10',
        }}
      >
        <span style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'linear-gradient(to bottom, #f0d09a, #e8c382)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(232,195,130,0.4)',
        }}>
          <Plus size={15} color="#351e10" />
        </span>
        <span style={{ color: 'var(--accent)' }}>New</span>
      </button>
    </nav>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { address } = useAccount()
  const [showApp, setShowApp]         = useState(false)
  const [view, setView]               = useState<View>('dashboard')
  const [refreshTick, setRefreshTick] = useState(0)
  const [createType, setCreateType]   = useState<StreamType | null>(null)

  // Derive effective visibility: show app if user clicked Launch OR wallet connected.
  // showApp tracks the user's explicit intent; address tracks auto-connect on page load.
  const appVisible = showApp || !!address

  if (!appVisible) return <LandingPage onLaunch={() => setShowApp(true)} />

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
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar view={view} setView={setView} onCreateStream={openCreate} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <Topbar title={TITLES[view]} onNewStream={() => openCreate()} />

        <main style={{
          flex: 1,
          padding: '24px 24px',
          paddingBottom: 80,
          maxWidth: 1200,
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

        {/* Desktop footer */}
        <footer className="hidden lg:flex" style={{
          padding: '14px 28px',
          borderTop: '1px solid var(--border)',
          alignItems: 'center',
          gap: 12,
          fontFamily: 'Manrope, sans-serif',
          fontSize: 11,
          letterSpacing: '0.08em',
        }}>
          <span style={{ fontFamily: 'Gloock, Georgia, serif', fontSize: 13, color: 'var(--muted)' }}>FlowPay</span>
          <span style={{ color: 'var(--subtle)', fontSize: 10 }}>·</span>
          <span style={{ textTransform: 'uppercase', color: 'var(--subtle)' }}>USDC streams on Arc Testnet</span>
        </footer>
      </div>

      <BottomNav view={view} setView={setView} onNewStream={() => openCreate()} />
    </div>
  )
}
