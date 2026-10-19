import { useState, useEffect, useRef } from 'react'
import { usePublicClient, useAccount } from 'wagmi'
import { parseAbiItem } from 'viem'
import { METERED_ESCROW, ARC_TESTNET_CHAIN_ID } from '@/contract'
import { StreamDetail } from './StreamDetail'
import { decodeStreamType, getStreamType, fmtUSDC, type StreamType } from '@/streams'
import { Briefcase, TrendingUp, Flag, Plus, Search, Inbox, Loader2, ArrowLeft } from 'lucide-react'

const TYPE_ICON: Record<StreamType, React.ReactNode> = {
  payroll: <Briefcase size={14} />,
  vesting: <TrendingUp size={14} />,
  escrow:  <Flag size={14} />,
}
const TYPE_COLOR: Record<StreamType, string> = {
  payroll: 'var(--blue)',
  vesting: 'var(--purple)',
  escrow:  'var(--amber)',
}
const TYPE_BG: Record<StreamType, string> = {
  payroll: 'var(--blue-light)',
  vesting: 'var(--purple-light)',
  escrow:  'var(--amber-light)',
}

interface StreamEntry { dealId: bigint; type: StreamType; deposit: bigint }

interface StreamsListProps {
  refreshTrigger: number
  onNewStream: (type?: StreamType) => void
}

export function StreamsList({ refreshTrigger, onNewStream }: StreamsListProps) {
  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID })
  const [entries, setEntries] = useState<StreamEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [manualId, setManualId] = useState('')
  const [selectedId, setSelectedId] = useState<bigint | null>(null)
  const [filterType, setFilterType] = useState<StreamType | 'all'>('all')
  const hasAutoSelected = useRef(false)

  useEffect(() => {
    if (!address || !publicClient) return
    let cancelled = false
    const go = async () => {
      setLoading(true)
      try {
        // Arc Testnet prunes history — never query from block 0.
        // Use current head minus a 200k-block lookback (~7 days at ~3s/block).
        const head = await publicClient.getBlockNumber()
        const fromBlock = head > 200000n ? head - 200000n : 0n
        const logs = await publicClient.getLogs({
          address: METERED_ESCROW.address,
          event: parseAbiItem('event DealFunded(uint256 indexed dealId, address indexed buyer, address indexed seller, address payee, uint256 deposit, bytes32 termsHash)'),
          fromBlock, toBlock: 'latest',
        })
        if (cancelled) return
        const seen = new Set<string>()
        const collected: StreamEntry[] = []
        for (const log of logs) {
          const id = log.args.dealId
          if (!id) continue
          const isParty = log.args.buyer?.toLowerCase() === address.toLowerCase() || log.args.seller?.toLowerCase() === address.toLowerCase()
          if (isParty && !seen.has(String(id))) {
            seen.add(String(id))
            collected.push({ dealId: id, type: decodeStreamType(id), deposit: log.args.deposit ?? 0n })
          }
        }
        // Also pick up any locally-stored streams not yet indexed (optimistic)
        const localKey = `flowpay:streams:${address.toLowerCase()}`
        try {
          const local = JSON.parse(sessionStorage.getItem(localKey) ?? '[]') as unknown as Array<{dealId: string; type: StreamType; deposit: string}>
          for (const l of local) {
            if (!seen.has(l.dealId)) {
              seen.add(l.dealId)
              collected.push({ dealId: BigInt(l.dealId), type: l.type, deposit: BigInt(l.deposit) })
            }
          }
        } catch { /* ignore */ }
        const reversed = collected.reverse()
        setEntries(reversed)
        if (reversed.length > 0 && !hasAutoSelected.current) {
          hasAutoSelected.current = true
          setSelectedId(reversed[0].dealId)
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void go()
    return () => { cancelled = true }
  }, [address, publicClient, refreshTrigger])

  function addManualId() {
    try {
      const id = BigInt(manualId.trim())
      const entry: StreamEntry = { dealId: id, type: decodeStreamType(id), deposit: 0n }
      if (!entries.find(e => e.dealId === id)) setEntries(e => [entry, ...e])
      setSelectedId(id)
      setManualId('')
    } catch { /* invalid */ }
  }

  const filtered = filterType === 'all' ? entries : entries.filter(e => e.type === filterType)
  if (!address) return null

  // On mobile: show either list OR detail, not both side by side
  const showDetail = selectedId !== null

  return (
    <>
      {/* Desktop: side-by-side */}
      <div className="hidden md:flex" style={{ gap: 16, alignItems: 'flex-start' }}>
        <ListPanel
          filtered={filtered} loading={loading} filterType={filterType}
          setFilterType={setFilterType} manualId={manualId} setManualId={setManualId}
          addManualId={addManualId} selectedId={selectedId} setSelectedId={setSelectedId}
          onNewStream={onNewStream}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedId !== null
            ? <StreamDetail dealId={selectedId} />
            : <EmptyDetail onNewStream={onNewStream} />
          }
        </div>
      </div>

      {/* Mobile: single panel, toggle between list and detail */}
      <div className="flex md:hidden" style={{ flexDirection: 'column' }}>
        {showDetail && selectedId !== null ? (
          <div>
            <button
              onClick={() => setSelectedId(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', marginBottom: 16, minHeight: 44, padding: '0 4px' }}
            >
              <ArrowLeft size={14} /> All streams
            </button>
            <StreamDetail dealId={selectedId} />
          </div>
        ) : (
          <ListPanel
            filtered={filtered} loading={loading} filterType={filterType}
            setFilterType={setFilterType} manualId={manualId} setManualId={setManualId}
            addManualId={addManualId} selectedId={selectedId} setSelectedId={setSelectedId}
            onNewStream={onNewStream} fullWidth
          />
        )}
      </div>
    </>
  )
}

function EmptyDetail({ onNewStream }: { onNewStream: () => void }) {
  return (
    <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '80px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>Select a stream to view details</p>
      <button onClick={() => onNewStream()} style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600, minHeight: 44 }}>
        + New stream
      </button>
    </div>
  )
}

function ListPanel({
  filtered, loading, filterType, setFilterType,
  manualId, setManualId, addManualId,
  selectedId, setSelectedId, onNewStream, fullWidth,
}: {
  filtered: StreamEntry[]
  loading: boolean
  filterType: StreamType | 'all'
  setFilterType: (t: StreamType | 'all') => void
  manualId: string
  setManualId: (v: string) => void
  addManualId: () => void
  selectedId: bigint | null
  setSelectedId: (id: bigint) => void
  onNewStream: (type?: StreamType) => void
  fullWidth?: boolean
}) {
  return (
    <div style={{ width: fullWidth ? '100%' : 260, flexShrink: fullWidth ? undefined : 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Your streams</span>
        <button
          onClick={() => onNewStream()}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'white', fontSize: 12, fontWeight: 600, minHeight: 36 }}
        >
          <Plus size={12} /> New
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <Search size={13} style={{ color: 'var(--subtle)', flexShrink: 0 }} />
        <input
          value={manualId}
          onChange={e => setManualId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addManualId()}
          placeholder="Lookup by ID..."
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--ink)', minHeight: 28 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {(['all', 'payroll', 'vesting', 'escrow'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            style={{
              padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: '1px solid var(--border)',
              background: filterType === t ? 'var(--accent)' : 'var(--bg-white)',
              color: filterType === t ? 'white' : 'var(--muted)',
              cursor: 'pointer', minHeight: 32,
            }}
          >
            {t === 'all' ? 'All' : t === 'escrow' ? 'Milestones' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 4px', color: 'var(--muted)', fontSize: 13 }}>
          <Loader2 size={13} className="animate-spin" /> Loading...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Inbox size={28} style={{ color: 'var(--border-strong)', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>
            {filterType !== 'all' ? `No ${filterType} streams` : 'No streams yet'}
          </p>
          <button onClick={() => onNewStream()} style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'white', fontSize: 12, fontWeight: 600, minHeight: 40 }}>
            Create one
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {filtered.map(entry => {
          const meta = getStreamType(entry.type)
          const selected = selectedId === entry.dealId
          return (
            <button
              key={String(entry.dealId)}
              onClick={() => setSelectedId(entry.dealId)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                background: selected ? 'var(--bg-white)' : 'transparent',
                border: selected ? '1px solid var(--border)' : '1px solid transparent',
                boxShadow: selected ? 'var(--shadow-sm)' : 'none',
                textAlign: 'left', cursor: 'pointer', minHeight: 52,
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 7, background: TYPE_BG[entry.type], color: TYPE_COLOR[entry.type], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {TYPE_ICON[entry.type]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{meta.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>#{String(entry.dealId).slice(-8)}</span>
                  {entry.deposit > 0n && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>{fmtUSDC(entry.deposit)}</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
