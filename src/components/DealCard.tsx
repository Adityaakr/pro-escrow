import { useState } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useSignTypedData, useSwitchChain } from 'wagmi'
import { METERED_ESCROW, ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER, type OnchainDeal } from '@/contract'
import { formatUnitsFixed } from '@/onchain-money'
import { TxButton } from './TxButton'
import { TxReceipt } from './TxReceipt'
import { ExternalLink, ChevronDown, ChevronUp, Clock, Zap } from 'lucide-react'
import { toast } from 'sonner'

function getUnixNow(): bigint { return BigInt(Math.trunc(Date.now() / 1000)) }

const STATUS_LABELS: Record<number, string> = { 0: 'Not Found', 1: 'Funded', 2: 'Closed' }
const STATUS_COLORS: Record<number, string> = {
  0: 'var(--muted)',
  1: 'var(--success)',
  2: 'var(--ink-2)',
}

const glass = {
  card: {
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid var(--border)',
    borderRadius: '24px',
  } as React.CSSProperties,
  inner: {
    background: 'var(--surface-muted)',
    borderRadius: '16px',
    border: '1px solid var(--border)',
  } as React.CSSProperties,
}

function fmt(v: bigint) {
  return formatUnitsFixed(v, 6, 2)
}

function fmtAddr(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`
}

function ProgressBar({ deposit, settled, refunded }: { deposit: bigint; settled: bigint; refunded: bigint }) {
  if (deposit === 0n) return null
  const settledPct = Number((settled * 100n) / deposit)
  const refundedPct = Number((refunded * 100n) / deposit)
  return (
    <div className="mt-2">
      <div className="flex h-2 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${settledPct}%`, background: 'var(--success)' }} />
        <div className="h-full transition-all" style={{ width: `${refundedPct}%`, background: 'var(--muted)' }} />
      </div>
      <div className="mt-1 flex gap-3 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
        <span style={{ color: 'var(--success)' }}>{settledPct.toFixed(0)}% settled</span>
        <span>{refundedPct.toFixed(0)}% refunded</span>
        <span>{(100 - settledPct - refundedPct).toFixed(0)}% remaining</span>
      </div>
    </div>
  )
}

export function DealCard({ dealId }: { dealId: bigint }) {
  const { address, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const [expanded, setExpanded] = useState(false)
  const [units, setUnits] = useState('')
  const [note, setNote] = useState('')
  const [acceptPayload, setAcceptPayload] = useState<Record<string, unknown> | null>(null)

  const { data: rawDeal, refetch: refetchDeal } = useReadContract({
    address: METERED_ESCROW.address,
    abi: METERED_ESCROW.abi,
    functionName: 'getDeal',
    args: [dealId],
    chainId: ARC_TESTNET_CHAIN_ID,
  })

  const { data: balanceData, refetch: refetchBal } = useReadContract({
    address: METERED_ESCROW.address,
    abi: METERED_ESCROW.abi,
    functionName: 'balances',
    args: [dealId],
    chainId: ARC_TESTNET_CHAIN_ID,
  })

  const { data: refundableAt } = useReadContract({
    address: METERED_ESCROW.address,
    abi: METERED_ESCROW.abi,
    functionName: 'refundableAt',
    args: [dealId],
    chainId: ARC_TESTNET_CHAIN_ID,
  })

  const { signTypedDataAsync } = useSignTypedData()

  // settle
  const { writeContract: settle, data: settleHash, isPending: settlePending, isError: settleError, error: settleErr } = useWriteContract()
  const { isLoading: settleConfirming, isSuccess: settleSuccess } = useWaitForTransactionReceipt({ hash: settleHash, chainId: ARC_TESTNET_CHAIN_ID })

  // sellerClose
  const { writeContract: sellerClose, data: closeHash, isPending: closePending } = useWriteContract()
  const { isLoading: closeConfirming, isSuccess: closeSuccess } = useWaitForTransactionReceipt({ hash: closeHash, chainId: ARC_TESTNET_CHAIN_ID })

  // refund
  const { writeContract: refund, data: refundHash, isPending: refundPending } = useWriteContract()
  const { isLoading: refundConfirming, isSuccess: refundSuccess } = useWaitForTransactionReceipt({ hash: refundHash, chainId: ARC_TESTNET_CHAIN_ID })

  const deal = rawDeal as OnchainDeal | undefined
  const [deposit, settled, refunded] = balanceData as [bigint, bigint, bigint, bigint] ?? [0n, 0n, 0n, 0n]

  if (settleSuccess || closeSuccess || refundSuccess) {
    void refetchDeal()
    void refetchBal()
  }

  const isBuyer = address?.toLowerCase() === deal?.buyer?.toLowerCase()
  const isSeller = address?.toLowerCase() === deal?.seller?.toLowerCase()
  const canClose = isSeller && deal?.status === 1 && !deal?.sellerClosed
  const canRefund = deal?.status === 1 && (
    deal?.sellerClosed ||
    (refundableAt !== undefined && getUnixNow() >= (refundableAt as bigint))
  )
  const remaining = deposit - settled - refunded

  function handleBuildAndSign() {
    if (!deal) return
    const unitsN = parseInt(units)
    if (isNaN(unitsN) || unitsN <= 0) { toast.error('Enter valid units'); return }
    const newCumulativeUnits = (deal.acceptedUnits ?? 0n) + BigInt(unitsN)
    const newCumulativeAmount = deal.settled + BigInt(unitsN) * (deposit / (deal.maxUnits || 1n))

    const receiptsRoot = `0x${Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')}`
    const acceptance = {
      dealId,
      termsHash: deal.termsHash as `0x${string}`,
      cumulativeAmount: newCumulativeAmount > deposit ? deposit : newCumulativeAmount,
      cumulativeUnits: newCumulativeUnits > deal.maxUnits ? deal.maxUnits : newCumulativeUnits,
      receiptsRoot,
      nonce: (deal.acceptedNonce ?? 0n) + 1n,
      expiry: BigInt(Math.trunc(Date.now() / 1000) + 3600),
    }
    setAcceptPayload(acceptance)
    toast.success('Usage payload ready — sign as buyer to settle')
  }

  async function handleSign() {
    if (!acceptPayload) return
    if (chainId !== ARC_TESTNET_CHAIN_ID) {
      try { await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID }) } catch { return }
    }
    try {
      const sig = await signTypedDataAsync({
        domain: {
          name: 'MeteredEscrow',
          version: '1',
          chainId: ARC_TESTNET_CHAIN_ID,
          verifyingContract: METERED_ESCROW.address,
        },
        types: {
          Acceptance: [
            { name: 'dealId', type: 'uint256' },
            { name: 'termsHash', type: 'bytes32' },
            { name: 'cumulativeAmount', type: 'uint256' },
            { name: 'cumulativeUnits', type: 'uint256' },
            { name: 'receiptsRoot', type: 'bytes32' },
            { name: 'nonce', type: 'uint256' },
            { name: 'expiry', type: 'uint64' },
          ],
        },
        primaryType: 'Acceptance',
        message: acceptPayload as {
          dealId: bigint; termsHash: `0x${string}`; cumulativeAmount: bigint;
          cumulativeUnits: bigint; receiptsRoot: `0x${string}`; nonce: bigint; expiry: bigint;
        },
      })

      settle({
        address: METERED_ESCROW.address,
        abi: METERED_ESCROW.abi,
        functionName: 'settleAcceptedUsage',
        args: [dealId, acceptPayload, sig],
        chainId: ARC_TESTNET_CHAIN_ID,
      })
    } catch (e: unknown) {
      if ((e as { code?: number }).code !== 4001) toast.error('Signing failed')
    }
  }

  async function handleSellerClose() {
    if (chainId !== ARC_TESTNET_CHAIN_ID) {
      try { await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID }) } catch { return }
    }
    sellerClose({
      address: METERED_ESCROW.address,
      abi: METERED_ESCROW.abi,
      functionName: 'sellerCloseTerm',
      args: [dealId],
      chainId: ARC_TESTNET_CHAIN_ID,
    })
  }

  async function handleRefund() {
    if (chainId !== ARC_TESTNET_CHAIN_ID) {
      try { await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID }) } catch { return }
    }
    refund({
      address: METERED_ESCROW.address,
      abi: METERED_ESCROW.abi,
      functionName: 'refundUnused',
      args: [dealId],
      chainId: ARC_TESTNET_CHAIN_ID,
    })
  }

  return (
    <div className="rounded-3xl" style={glass.card}>
      {/* Header */}
      <button
        className="flex w-full items-center justify-between px-5 py-4"
        onClick={() => setExpanded((x) => !x)}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-2xl font-bold text-white text-sm" style={{ background: 'var(--accent)' }}>
            #{String(dealId).slice(-4)}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
              Deal {String(dealId)}
            </p>
            <p className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
              {deal ? `${fmt(deposit)} USDC locked` : 'Loading...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {deal && (
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: `${STATUS_COLORS[deal.status]}22`, color: STATUS_COLORS[deal.status] }}
            >
              {STATUS_LABELS[deal.status]}
            </span>
          )}
          {expanded ? <ChevronUp className="size-4" style={{ color: 'var(--muted)' }} /> : <ChevronDown className="size-4" style={{ color: 'var(--muted)' }} />}
        </div>
      </button>

      {expanded && deal && (
        <div className="border-t px-5 pb-5 space-y-4" style={{ borderColor: 'var(--border)' }}>
          {/* Balances */}
          <div className="pt-4">
            <div className="flex items-baseline gap-1 mb-1">
              <span className="display text-3xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                {fmt(deposit)}
              </span>
              <span className="text-base font-medium" style={{ color: 'var(--subtle)' }}>USDC</span>
            </div>
            <ProgressBar deposit={deposit} settled={settled} refunded={refunded} />
          </div>

          {/* Deal details */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl p-4" style={glass.inner}>
            {[
              ['Buyer', fmtAddr(deal.buyer)],
              ['Seller', fmtAddr(deal.seller)],
              ['Payee', fmtAddr(deal.payee)],
              ['Max Units', String(deal.maxUnits)],
              ['Units Accepted', String(deal.acceptedUnits ?? 0n)],
              ['Seller Closed', deal.sellerClosed ? 'Yes' : 'No'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{k}</p>
                <p className="text-xs font-medium tabular-nums mono" style={{ color: 'var(--ink)' }}>{v}</p>
              </div>
            ))}
          </div>

          {/* Provider panel — submit usage */}
          {deal.status === 1 && (
            <div className="space-y-3 rounded-2xl p-4" style={glass.inner}>
              <div className="flex items-center gap-2">
                <Zap className="size-4" style={{ color: 'var(--accent)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Submit Usage</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  placeholder="Units delivered"
                  type="number"
                  min="1"
                  className="rounded-xl px-3 py-2.5 text-sm font-medium outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                />
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="rounded-xl px-3 py-2.5 text-sm font-medium outline-none"
                  style={{ background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                />
              </div>
              <TxButton onClick={handleBuildAndSign} disabled={!units} label="Build Acceptance Payload" variant="secondary" />
            </div>
          )}

          {/* Buyer sign panel */}
          {acceptPayload && deal.status === 1 && isBuyer && (
            <div className="space-y-3 rounded-2xl p-4" style={{ ...glass.inner, borderColor: 'rgba(1,43,255,0.2)', background: 'rgba(1,43,255,0.04)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Buyer: Sign & Settle</p>
              <div className="rounded-xl p-3 text-xs font-mono tabular-nums" style={{ background: 'var(--surface-muted)', color: 'var(--muted)', wordBreak: 'break-all' }}>
                cumAmount: {fmt((acceptPayload as { cumulativeAmount: bigint }).cumulativeAmount)} USDC
                {' | '}cumUnits: {String((acceptPayload as { cumulativeUnits: bigint }).cumulativeUnits)}
              </div>
              <TxButton
                onClick={() => { void handleSign() }}
                isPending={settlePending}
                isConfirming={settleConfirming}
                label="Sign & Settle Payment"
              />
              <TxReceipt hash={settleHash} isSuccess={settleSuccess} isError={settleError} error={settleErr} label="Settlement" />
            </div>
          )}

          {/* Seller close */}
          {canClose && (
            <TxButton
              onClick={() => { void handleSellerClose() }}
              isPending={closePending}
              isConfirming={closeConfirming}
              label="Close Term Early (Seller)"
              variant="secondary"
            />
          )}
          {closeHash && (
            <a href={`${ARC_TESTNET_EXPLORER}/tx/${closeHash}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
              Close tx <ExternalLink className="size-3" />
            </a>
          )}

          {/* Refund */}
          {canRefund && remaining > 0n && (
            <TxButton
              onClick={() => { void handleRefund() }}
              isPending={refundPending}
              isConfirming={refundConfirming}
              label={`Refund ${fmt(remaining)} USDC to buyer`}
              variant="secondary"
            />
          )}
          {refundHash && (
            <a href={`${ARC_TESTNET_EXPLORER}/tx/${refundHash}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
              Refund tx <ExternalLink className="size-3" />
            </a>
          )}

          {deal.status === 1 && !canRefund && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface-muted)' }}>
              <Clock className="size-3.5" style={{ color: 'var(--muted)' }} />
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Refund available at:{' '}
                {refundableAt !== undefined
                  ? new Date(Number(refundableAt) * 1000).toLocaleString()
                  : '—'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
