import { useState, useEffect } from 'react'
import { usePublicClient, useAccount } from 'wagmi'
import { parseAbiItem } from 'viem'
import { METERED_ESCROW, ARC_TESTNET_CHAIN_ID } from '@/contract'
import { DealCard } from './DealCard'
import { Loader2, Inbox } from 'lucide-react'

export function DealsList({ refreshTrigger }: { refreshTrigger: number }) {
  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID })
  const [dealIds, setDealIds] = useState<bigint[]>([])
  const [loading, setLoading] = useState(false)
  const [manualId, setManualId] = useState('')

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
        setDealIds(collected.reverse())
      } catch {
        // ignore fetch errors silently
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
      if (!dealIds.includes(id)) setDealIds((ids) => [id, ...ids])
      setManualId('')
    } catch {
      // ignore invalid
    }
  }

  if (!address) return null

  return (
    <div className="space-y-4">
      {/* Manual lookup */}
      <div className="flex gap-2">
        <input
          value={manualId}
          onChange={(e) => setManualId(e.target.value)}
          placeholder="Look up deal by ID..."
          className="flex-1 rounded-2xl px-4 py-2.5 text-sm font-medium outline-none"
          style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid var(--border)', color: 'var(--ink)' }}
          onKeyDown={(e) => e.key === 'Enter' && addManualId()}
        />
        <button
          onClick={addManualId}
          className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'var(--accent)' }}
        >
          Load
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4" style={{ color: 'var(--muted)' }}>
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Loading your deals...</span>
        </div>
      )}

      {!loading && dealIds.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8" style={{ color: 'var(--muted)' }}>
          <Inbox className="size-8 opacity-40" />
          <p className="text-sm">No deals found for your wallet</p>
          <p className="text-xs opacity-70">Create a new deal above or enter an ID to look one up</p>
        </div>
      )}

      {dealIds.map((id) => (
        <DealCard key={String(id)} dealId={id} />
      ))}
    </div>
  )
}
