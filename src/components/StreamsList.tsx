import { useState, useEffect, useRef } from 'react'
import { usePublicClient, useAccount } from 'wagmi'
import { parseAbiItem } from 'viem'
import { METERED_ESCROW, ARC_TESTNET_CHAIN_ID } from '@/contract'
import { StreamDetail } from './StreamDetail'
import { decodeStreamType, getStreamType, fmtUSDC, type StreamType } from '@/streams'
import { Loader2, Inbox, Plus, Search, Briefcase, TrendingUp, CheckSquare } from 'lucide-react'

const TYPE_ICON: Record<StreamType, React.ReactNode> = {
  payroll: <Briefcase className="size-4" />,
  vesting: <TrendingUp className="size-4" />,
  escrow:  <CheckSquare className="size-4" />,
}
const TYPE_COLOR: Record<StreamType, string> = {
  payroll: 'var(--blue)',
  vesting: 'var(--purple)',
  escrow:  'var(--amber)',
}

interface StreamsListProps {
  refreshTrigger: number
  onNewStream: (type?: StreamType) => void
}

interface StreamEntry {
  dealId: bigint
  type: StreamType
  deposit: bigint
}

export function StreamsList({ refreshTrigger, onNewStream }: StreamsListProps) {
  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID })
  const [entries, setEntries] = useState<StreamEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [manualId, setManualId] = useState('')
  const [selectedId, setSelectedId] = useState<bigint | null>(null)
  const hasAutoSelected = useRef(false)
  const [filterType, setFilterType] = useState<StreamType | 'all'>('all')

  useEffect(() => {
    if (!address || !publicClient) return
    let cancelled = false
    const go = async () => {
      setLoading(true)
      try {
        const logs = await publicClient.getLogs({
          address: METERED_ESCROW.address,
          event: parseAbiItem('event DealFunded(uint256 indexed dealId, address indexed buyer, address indexed seller, address payee, uint256 deposit, bytes32 termsHash)'),
          fromBlock: 0n, toBlock: 'latest',
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

  return (
    <div className="flex gap-6 min-h-0" style={{ alignItems: 'flex-start' }}>
      {/* ── Left panel: stream list ── */}
      <div className="w-72 shrink-0 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="display text-sm font-semibold" style={{ color: 'var(--ink)' }}>Your streams</h2>
          <button
            onClick={() => onNewStream()}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            <Plus className="size-3" /> New
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
          <Search className="size-3.5 shrink-0" style={{ color: 'var(--subtle)' }} />
          <input
            value={manualId}
            onChange={e => setManualId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addManualId()}
            placeholder="Lookup stream ID…"
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: 'var(--ink)' }}
          />
        </div>

        {/* Type filter */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'payroll', 'vesting', 'escrow'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                background: filterType === t ? 'var(--accent)' : 'var(--bg-white)',
                color: filterType === t ? 'var(--accent-fg)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-3 px-1" style={{ color: 'var(--muted)' }}>
            <Loader2 className="size-3.5 animate-spin" /><span className="text-xs">Loading…</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Inbox className="size-8" style={{ color: 'var(--border-strong)' }} />
            <p className="text-xs" style={{ color: 'var(--muted)' }}>No streams{filterType !== 'all' ? ` of type "${filterType}"` : ''}</p>
            <button onClick={() => onNewStream()} className="mt-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: 'var(--accent)' }}>
              Create one
            </button>
          </div>
        )}

        {filtered.map(entry => {
          const meta = getStreamType(entry.type)
          const color = TYPE_COLOR[entry.type]
          const icon = TYPE_ICON[entry.type]
          const selected = selectedId === entry.dealId
          return (
            <button
              key={String(entry.dealId)}
              onClick={() => setSelectedId(entry.dealId)}
              className="w-full rounded-xl px-3 py-3 text-left transition-all"
              style={{
                background: selected ? 'var(--bg-white)' : 'transparent',
                border: selected ? '1px solid var(--border)' : '1px solid transparent',
                boxShadow: selected ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg shrink-0" style={{ background: color + '14', color }}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{meta.label}</p>
                    <span className={`badge badge-${entry.type}`} style={{ fontSize: '10px' }}>{meta.label}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs mono truncate" style={{ color: 'var(--muted)' }}>#{String(entry.dealId).slice(-8)}</p>
                    {entry.deposit > 0n && (
                      <p className="text-xs font-medium tabular-nums" style={{ color: 'var(--ink-2)' }}>{fmtUSDC(entry.deposit)}</p>
                    )}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Right panel: stream detail ── */}
      <div className="flex-1 min-w-0">
        {selectedId !== null
          ? <StreamDetail dealId={selectedId} />
          : (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-center rounded-xl" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Select a stream to view details</p>
              <button onClick={() => onNewStream()} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>
                + New stream
              </button>
            </div>
          )
        }
      </div>
    </div>
  )
}
