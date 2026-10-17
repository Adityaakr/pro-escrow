import { useState, useEffect, useRef } from 'react'
import { usePublicClient, useAccount } from 'wagmi'
import { parseAbiItem } from 'viem'
import { METERED_ESCROW, ARC_TESTNET_CHAIN_ID } from '@/contract'
import { DealCard } from './DealCard'
import { Loader2, Inbox, Plus, Search } from 'lucide-react'

interface DealsListProps {
  refreshTrigger: number
  onNewDeal: () => void
}

export function DealsList({ refreshTrigger, onNewDeal }: DealsListProps) {
  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID })
  const [dealIds, setDealIds] = useState<bigint[]>([])
  const [loading, setLoading] = useState(false)
  const [manualId, setManualId] = useState('')
  const [selectedId, setSelectedId] = useState<bigint | null>(null)
  const hasAutoSelected = useRef(false)

  useEffect(() => {
    if (!address || !publicClient) return
    let cancelled = false

    const fetchDeals = async () => {
      setLoading(true)
      try {
        const logs = await publicClient.getLogs({
          address: METERED_ESCROW.address,
          event: parseAbiItem('event DealFunded(uint256 indexed dealId, address indexed buyer, address indexed seller, address payee, uint256 deposit, bytes32 termsHash)'),
          fromBlock: 0n,
          toBlock: 'latest',
        })
        if (cancelled) return
        const ids = new Set<string>()
        const collected: bigint[] = []
        for (const log of logs) {
          const id = log.args.dealId
          if (!id) continue
          const isParty =
            log.args.buyer?.toLowerCase() === address.toLowerCase() ||
            log.args.seller?.toLowerCase() === address.toLowerCase()
          if (isParty && !ids.has(String(id))) {
            ids.add(String(id))
            collected.push(id)
          }
        }
        const reversed = collected.reverse()
        setDealIds(reversed)
        if (reversed.length > 0 && !hasAutoSelected.current) {
          hasAutoSelected.current = true
          setSelectedId(reversed[0])
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void fetchDeals()
    return () => { cancelled = true }
  }, [address, publicClient, refreshTrigger])

  function addManualId() {
    try {
      const id = BigInt(manualId.trim())
      if (!dealIds.includes(id)) {
        setDealIds((ids) => [id, ...ids])
        setSelectedId(id)
      } else {
        setSelectedId(id)
      }
      setManualId('')
    } catch {
      // ignore invalid
    }
  }

  if (!address) return null

  return (
    <div className="flex gap-6 min-h-0" style={{ alignItems: 'flex-start' }}>
      {/* ── Left: deal list ── */}
      <div className="w-64 shrink-0 space-y-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="display text-sm font-semibold" style={{ color: 'var(--ink)' }}>Your deals</h2>
          <button
            onClick={onNewDeal}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            <Plus className="size-3" />
            New
          </button>
        </div>

        {/* Search/lookup */}
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
          <Search className="size-3.5 shrink-0" style={{ color: 'var(--subtle)' }} />
          <input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="Look up deal ID…"
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: 'var(--ink)' }}
            onKeyDown={(e) => e.key === 'Enter' && addManualId()}
          />
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-3 px-1" style={{ color: 'var(--muted)' }}>
            <Loader2 className="size-3.5 animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        )}

        {!loading && dealIds.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Inbox className="size-8" style={{ color: 'var(--border-strong)' }} />
            <p className="text-xs" style={{ color: 'var(--muted)' }}>No deals yet</p>
            <button
              onClick={onNewDeal}
              className="mt-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
              style={{ background: 'var(--accent)' }}
            >
              Create first deal
            </button>
          </div>
        )}

        {dealIds.map((id) => (
          <DealListItem
            key={String(id)}
            dealId={id}
            selected={selectedId === id}
            onSelect={() => setSelectedId(id)}
          />
        ))}
      </div>

      {/* ── Right: deal detail ── */}
      <div className="flex-1 min-w-0">
        {selectedId !== null
          ? <DealCard dealId={selectedId} />
          : (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-center rounded-xl" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Select a deal to view details</p>
            </div>
          )
        }
      </div>
    </div>
  )
}

// ── Deal list item ─────────────────────────────────────────────────────────────
function DealListItem({ dealId, selected, onSelect }: { dealId: bigint; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full rounded-lg px-3 py-2.5 text-left transition-colors"
      style={{
        background: selected ? 'var(--bg-white)' : 'transparent',
        border: selected ? '1px solid var(--border)' : '1px solid transparent',
        boxShadow: selected ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold mono" style={{ color: 'var(--ink)' }}>
          #{String(dealId).slice(-6)}
        </span>
        <span className="rounded-md px-1.5 py-0.5 text-xs font-medium badge-active">
          Active
        </span>
      </div>
      <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--muted)' }}>
        Deal {String(dealId)}
      </p>
    </button>
  )
}
