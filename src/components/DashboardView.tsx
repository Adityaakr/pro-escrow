import { useEffect, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { parseAbiItem } from 'viem'
import { METERED_ESCROW, ARC_TESTNET_CHAIN_ID } from '@/contract'
import { fmtUSDC, decodeStreamType, getStreamType, type StreamType } from '@/streams'
import { Briefcase, TrendingUp, CheckSquare, ArrowRight, Layers } from 'lucide-react'

const TYPE_ICONS: Record<StreamType, React.ReactNode> = {
  payroll: <Briefcase className="size-4" />,
  vesting: <TrendingUp className="size-4" />,
  escrow:  <CheckSquare className="size-4" />,
}
const TYPE_COLOR: Record<StreamType, string> = {
  payroll: 'var(--blue)',
  vesting: 'var(--purple)',
  escrow:  'var(--amber)',
}

interface RecentStream {
  dealId: bigint
  type: StreamType
  deposit: bigint
  buyer: string
  seller: string
  ts: number
}

interface DashboardViewProps {
  onCreateStream: (type?: StreamType) => void
  onViewStreams: () => void
  refreshTick: number
}

export function DashboardView({ onCreateStream, onViewStreams, refreshTick }: DashboardViewProps) {
  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID })
  const [streams, setStreams] = useState<RecentStream[]>([])
  const [loading, setLoading] = useState(false)

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
        const collected: RecentStream[] = []
        for (const log of [...logs].reverse()) {
          const id = log.args.dealId
          if (!id) continue
          const isParty = log.args.buyer?.toLowerCase() === address.toLowerCase() || log.args.seller?.toLowerCase() === address.toLowerCase()
          if (isParty && !seen.has(String(id))) {
            seen.add(String(id))
            collected.push({
              dealId: id,
              type: decodeStreamType(id),
              deposit: log.args.deposit ?? 0n,
              buyer: log.args.buyer ?? '',
              seller: log.args.seller ?? '',
              ts: Number(log.blockNumber ?? 0n),
            })
          }
        }
        if (!cancelled) setStreams(collected.slice(0, 20))
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void go()
    return () => { cancelled = true }
  }, [address, publicClient, refreshTick])

  const totalLocked = streams.reduce((s, r) => s + r.deposit, 0n)
  const byType = streams.reduce<Record<StreamType, number>>((acc, r) => { acc[r.type] = (acc[r.type] ?? 0) + 1; return acc }, { payroll: 0, vesting: 0, escrow: 0 })

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total locked', value: fmtUSDC(totalLocked), sub: `across ${streams.length} stream${streams.length !== 1 ? 's' : ''}`, icon: <Layers className="size-5" />, color: 'var(--blue)' },
          { label: 'Payroll streams', value: String(byType.payroll), sub: 'active salary schedules', icon: <Briefcase className="size-5" />, color: 'var(--blue)' },
          { label: 'Vesting grants', value: String(byType.vesting), sub: 'USDC grants vesting', icon: <TrendingUp className="size-5" />, color: 'var(--purple)' },
        ].map(({ label, value, sub, icon, color }) => (
          <div key={label} className="rounded-xl p-5" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>{label}</p>
              <div className="flex size-8 items-center justify-center rounded-lg" style={{ background: color + '14', color }}>
                {icon}
              </div>
            </div>
            <p className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>{value}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Quick-create buttons */}
      <div>
        <h2 className="display text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Create a stream</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['payroll', 'vesting', 'escrow'] as StreamType[]).map((type) => {
            const meta = getStreamType(type)
            const color = TYPE_COLOR[type]
            const icon = TYPE_ICONS[type]
            return (
              <button
                key={type}
                onClick={() => onCreateStream(type)}
                className="group flex items-start gap-3 rounded-xl p-4 text-left transition-all hover:shadow-sm"
                style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}
              >
                <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg shrink-0" style={{ background: color + '14', color }}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{meta.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{meta.tagline}</p>
                </div>
                <ArrowRight className="size-4 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--muted)' }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Recent streams */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="display text-sm font-semibold" style={{ color: 'var(--ink)' }}>Recent streams</h2>
          <button onClick={onViewStreams} className="text-xs font-medium" style={{ color: 'var(--blue)' }}>
            View all
          </button>
        </div>

        {loading && (
          <div className="rounded-xl p-8 text-center" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading streams…</p>
          </div>
        )}

        {!loading && streams.length === 0 && (
          <div className="rounded-xl p-10 text-center" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
            <div className="flex size-12 items-center justify-center rounded-xl mx-auto mb-3" style={{ background: 'var(--surface-muted)' }}>
              <Layers className="size-6" style={{ color: 'var(--subtle)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>No streams yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Create your first payroll, vesting, or escrow stream.</p>
            <button
              onClick={() => onCreateStream()}
              className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Create first stream
            </button>
          </div>
        )}

        {!loading && streams.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
            {streams.slice(0, 6).map((s, i) => {
              const meta = getStreamType(s.type)
              const color = TYPE_COLOR[s.type]
              const icon = TYPE_ICONS[s.type]
              return (
                <div
                  key={String(s.dealId)}
                  className="flex items-center gap-4 px-5 py-4"
                  style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}
                >
                  <div className="flex size-9 items-center justify-center rounded-lg shrink-0" style={{ background: color + '14', color }}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{meta.label}</p>
                    <p className="text-xs mono" style={{ color: 'var(--muted)' }}>#{String(s.dealId).slice(-8)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{fmtUSDC(s.deposit)}</p>
                    <span className={`badge badge-${s.type}`}>{meta.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
