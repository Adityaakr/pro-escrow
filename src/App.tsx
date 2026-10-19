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

function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <rect width="26" height="26" rx="7" fill="#0f172a" />
      <path d="M7 13 C7 9.5 9.5 7 13 7 C16.5 7 19 9.5 19 13" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M13 17 L13 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="13" cy="18.5" r="1.5" fill="white" />
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
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
          <Logo size={26} />
          <div>
            <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 15, color: 'var(--ink)', lineHeight: 1 }}>FlowPay</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>USDC streams</div>
          </div>
        </div>
        <button
          onClick={() => onCreateStream()}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: '9px 0', borderRadius: 'var(--radius-sm)',
            background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600,
            minHeight: 44,
          }}
        >
          <Plus size={14} /> New stream
        </button>
      </div>

      <nav style={{ padding: '10px 8px', flex: 1 }}>
        <div style={{ marginBottom: 4 }}>
          {([
            { id: 'dashboard' as View, label: 'Overview',  icon: <LayoutDashboard size={15} /> },
            { id: 'streams'   as View, label: 'Streams',   icon: <ArrowRightLeft size={15} /> },
          ]).map(item => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                  background: active ? 'var(--surface-muted)' : 'transparent',
                  color: active ? 'var(--ink)' : 'var(--muted)',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  marginBottom: 2, minHeight: 40,
                }}
              >
                <span style={{ color: active ? 'var(--blue)' : 'var(--subtle)', display: 'flex' }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--subtle)', padding: '0 10px', marginBottom: 6 }}>
            Stream types
          </div>
          {(['payroll', 'vesting', 'escrow'] as StreamType[]).map(t => (
            <button
              key={t}
              onClick={() => onCreateStream(t)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 8, padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                color: 'var(--muted)', fontSize: 13, marginBottom: 1, minHeight: 40,
              }}
              onMouseEnter={e => { (e.currentTarget).style.background = 'var(--surface-muted)' }}
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
    </aside>
  )
}

function Topbar({ title, onNewStream }: { title: string; onNewStream: () => void }) {
  return (
    <header style={{
      height: 'var(--topbar-h)',
      background: 'var(--bg-white)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px 0 20px',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 17, color: 'var(--ink)', margin: 0, fontWeight: 400 }}>
        {title}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="hidden sm:flex" style={{
          alignItems: 'center', gap: 6,
          background: 'var(--surface-muted)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '4px 10px', fontSize: 12, color: 'var(--muted)',
        }}>
          <NetworkTenet variant="branded" size={13} />
          <span>Arc Testnet</span>
        </div>
        <ConnectKitButton />
        {/* Mobile new stream FAB-style shortcut in topbar */}
        <button
          className="flex md:hidden"
          onClick={onNewStream}
          style={{
            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
            background: 'var(--accent)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Plus size={16} />
        </button>
      </div>
    </header>
  )
}

// Mobile bottom nav
function BottomNav({ view, setView, onNewStream }: {
  view: View; setView: (v: View) => void; onNewStream: () => void
}) {
  return (
    <nav className="flex md:hidden" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: 'var(--bg-white)', borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'stretch', height: 60,
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
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3, fontSize: 10, fontWeight: active ? 600 : 400,
              color: active ? 'var(--ink)' : 'var(--muted)',
              background: 'transparent', borderRadius: 0,
            }}
          >
            <span style={{ color: active ? 'var(--blue)' : 'var(--subtle)' }}>{item.icon}</span>
            {item.label}
          </button>
        )
      })}
      <button
        onClick={onNewStream}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 3, fontSize: 10, fontWeight: 600,
          color: 'var(--accent)', background: 'transparent',
        }}
      >
        <span style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Plus size={16} color="white" />
        </span>
        New
      </button>
    </nav>
  )
}

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
    setRefreshTick(n => n + 1)
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
          padding: '20px 16px',
          paddingBottom: 80, // space for mobile bottom nav
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

        <footer className="hidden md:flex" style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--subtle)' }}>
          <span style={{ fontFamily: 'Instrument Serif, Georgia, serif' }}>FlowPay</span>
          <span>·</span>
          <span>USDC streams on Arc Testnet</span>
        </footer>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav view={view} setView={setView} onNewStream={() => openCreate()} />
    </div>
  )
}
