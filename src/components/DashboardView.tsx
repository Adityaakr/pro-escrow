import { useEffect, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { parseAbiItem } from 'viem'
import { METERED_ESCROW, ARC_TESTNET_CHAIN_ID } from '@/contract'
import { fmtUSDC, decodeStreamType, getStreamType, type StreamType } from '@/streams'
import { Briefcase, TrendingUp, Flag, ArrowRight, Plus, TrendingDown } from 'lucide-react'

const TYPE_ICON: Record<StreamType, React.ReactNode> = {
  payroll: <Briefcase size={16} />,
  vesting: <TrendingUp size={16} />,
  escrow:  <Flag size={16} />,
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

interface RecentStream {
  dealId: bigint
  type: StreamType
  deposit: bigint
  buyer: string
  seller: string
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
        const head = await publicClient.getBlockNumber()
        const fromBlock = head > 200000n ? head - 200000n : 0n
        const logs = await publicClient.getLogs({
          address: METERED_ESCROW.address,
          event: parseAbiItem('event DealFunded(uint256 indexed dealId, address indexed buyer, address indexed seller, address payee, uint256 deposit, bytes32 termsHash)'),
          fromBlock, toBlock: 'latest',
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
            collected.push({ dealId: id, type: decodeStreamType(id), deposit: log.args.deposit ?? 0n, buyer: log.args.buyer ?? '', seller: log.args.seller ?? '' })
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
    <div style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Stat cards — responsive: 1 col on mobile, 3 on desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {[
          {
            label: 'Total locked',
            value: fmtUSDC(totalLocked),
            sub: `across ${streams.length} stream${streams.length !== 1 ? 's' : ''}`,
            icon: <TrendingDown size={16} />,
            color: 'var(--ink)',
            bg: 'var(--surface-muted)',
          },
          {
            label: 'Payroll',
            value: String(byType.payroll),
            sub: 'salary schedules',
            icon: <Briefcase size={16} />,
            color: 'var(--blue)',
            bg: 'var(--blue-light)',
          },
          {
            label: 'Vesting grants',
            value: String(byType.vesting),
            sub: 'USDC grants active',
            icon: <TrendingUp size={16} />,
            color: 'var(--purple)',
            bg: 'var(--purple-light)',
          },
        ].map(({ label, value, sub, icon, color, bg }) => (
          <div key={label} style={{
            background: 'var(--bg-white)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
              </div>
            </div>
            <div style={{ fontFamily: 'Gloock, Georgia, serif', fontSize: 28, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Quick create — responsive */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Create a stream</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {(['payroll', 'vesting', 'escrow'] as StreamType[]).map((type) => {
            const meta = getStreamType(type)
            return (
              <button
                key={type}
                onClick={() => onCreateStream(type)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '14px 16px',
                  background: 'var(--bg-white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', textAlign: 'left',
                  transition: 'box-shadow 0.12s, border-color 0.12s',
                  cursor: 'pointer', minHeight: 44,
                }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.boxShadow = 'var(--shadow-sm)'; el.style.borderColor = 'var(--border-strong)' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.boxShadow = 'none'; el.style.borderColor = 'var(--border)' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: TYPE_BG[type], color: TYPE_COLOR[type], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {TYPE_ICON[type]}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{meta.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{meta.tagline}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recent streams */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Recent streams</h2>
          <button onClick={onViewStreams} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--blue)', fontWeight: 500, minHeight: 44, padding: '0 4px' }}>
            View all <ArrowRight size={13} />
          </button>
        </div>

        {loading && (
          <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>Loading streams...</div>
        )}

        {!loading && streams.length === 0 && (
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <ArrowRight size={20} style={{ color: 'var(--subtle)' }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>No streams yet</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 20px' }}>Create your first payroll, vesting, or milestone stream.</p>
            <button
              onClick={() => onCreateStream()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(to bottom, #f0d09a, #e8c382)', color: '#351e10', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', minHeight: 44, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 12px rgba(232,195,130,0.2)' }}
            >
              <Plus size={14} /> Create first stream
            </button>
          </div>
        )}

        {!loading && streams.length > 0 && (
          <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {streams.slice(0, 8).map((s, i) => {
              const meta = getStreamType(s.type)
              const isBuyer = s.buyer.toLowerCase() === address?.toLowerCase()
              return (
                <div key={String(s.dealId)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderTop: i > 0 ? '1px solid var(--border)' : undefined, minHeight: 56 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: TYPE_BG[s.type], color: TYPE_COLOR[s.type], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {TYPE_ICON[s.type]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{meta.label}</span>
                      <span className={`badge badge-${s.type}`}>{isBuyer ? 'Payer' : 'Recipient'}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                      #{String(s.dealId).slice(-10)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{fmtUSDC(s.deposit)}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>locked</div>
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
