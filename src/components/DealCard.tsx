import { useState } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useSignTypedData, useSwitchChain } from 'wagmi'
import { METERED_ESCROW, ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER, type OnchainDeal } from '@/contract'
import { formatUnitsFixed } from '@/onchain-money'
import { TxButton } from './TxButton'
import { TxReceipt } from './TxReceipt'
import { ExternalLink, Clock, Zap, Copy, CheckCircle2, Circle, Terminal } from 'lucide-react'
import { toast } from 'sonner'
import { SERVICE_TEMPLATES } from '@/services'

function getUnixNow(): bigint { return BigInt(Math.trunc(Date.now() / 1000)) }

const STATUS_LABELS: Record<number, string> = { 0: 'Not Found', 1: 'Active', 2: 'Closed' }
const STATUS_CLASS: Record<number, string> = { 0: 'badge-closed', 1: 'badge-active', 2: 'badge-closed' }

function fmt(v: bigint) { return formatUnitsFixed(v, 6, 2) }
function fmtAddr(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}` }

function MetricBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <p className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--muted)' }}>{sub}</p>}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  function copy() {
    void navigator.clipboard.writeText(text)
    toast.success('Copied')
  }
  return (
    <button onClick={copy} className="ml-1 opacity-40 hover:opacity-100 transition-opacity">
      <Copy className="size-3" />
    </button>
  )
}

type CheckItem = { label: string; sub?: string; done: boolean; href?: string }

function SetupChecklist({ items }: { items: CheckItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-start gap-2.5">
          {item.done
            ? <CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: 'var(--success)' }} />
            : <Circle className="size-4 mt-0.5 shrink-0" style={{ color: 'var(--border-strong)' }} />
          }
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: item.done ? 'var(--ink)' : 'var(--muted)' }}>
              {item.label}
            </p>
            {item.sub && (
              <p className="text-xs mt-0.5">
                {item.href
                  ? <a href={item.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5" style={{ color: 'var(--accent)' }}>
                      {item.sub} <ExternalLink className="size-2.5" />
                    </a>
                  : <span style={{ color: 'var(--muted)' }}>{item.sub}</span>
                }
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DealCard({ dealId }: { dealId: bigint }) {
  const { address, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
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

  const { writeContract: settle, data: settleHash, isPending: settlePending, isError: settleError, error: settleErr } = useWriteContract()
  const { isLoading: settleConfirming, isSuccess: settleSuccess } = useWaitForTransactionReceipt({ hash: settleHash, chainId: ARC_TESTNET_CHAIN_ID })

  const { writeContract: sellerClose, data: closeHash, isPending: closePending } = useWriteContract()
  const { isLoading: closeConfirming, isSuccess: closeSuccess } = useWaitForTransactionReceipt({ hash: closeHash, chainId: ARC_TESTNET_CHAIN_ID })

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
  const settledPct = deposit > 0n ? Number((settled * 100n) / deposit) : 0
  const acceptedUnits = deal?.acceptedUnits ?? 0n
  const maxUnits = deal?.maxUnits ?? 1n

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
    toast.success('Payload ready — sign as buyer to settle')
  }

  async function handleSign() {
    if (!acceptPayload) return
    if (chainId !== ARC_TESTNET_CHAIN_ID) {
      try { await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID }) } catch { return }
    }
    try {
      const sig = await signTypedDataAsync({
        domain: { name: 'MeteredEscrow', version: '1', chainId: ARC_TESTNET_CHAIN_ID, verifyingContract: METERED_ESCROW.address },
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
    sellerClose({ address: METERED_ESCROW.address, abi: METERED_ESCROW.abi, functionName: 'sellerCloseTerm', args: [dealId], chainId: ARC_TESTNET_CHAIN_ID })
  }

  async function handleRefund() {
    if (chainId !== ARC_TESTNET_CHAIN_ID) {
      try { await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID }) } catch { return }
    }
    refund({ address: METERED_ESCROW.address, abi: METERED_ESCROW.abi, functionName: 'refundUnused', args: [dealId], chainId: ARC_TESTNET_CHAIN_ID })
  }

  // Derive service name from deal ID by checking termsHash prefix patterns (best-effort)
  // We look up the template by matching the unit price stored in the deal
  const unitPrice = deal ? deal.deposit / (deal.maxUnits || 1n) : 0n
  const matchedTemplate = SERVICE_TEMPLATES.find(t => {
    try {
      const tPrice = BigInt(Math.round(parseFloat(t.unitPrice) * 1_000_000))
      return Math.abs(Number(unitPrice - tPrice)) < 1000
    } catch { return false }
  })
  const serviceName = matchedTemplate?.name ?? 'Metered service'
  const unitLabel = matchedTemplate?.unitLabel ?? 'unit'
  const endpoint = matchedTemplate?.endpoint ?? `/api/deals/${String(dealId)}/usage`
  const exampleBody = matchedTemplate?.exampleBody ?? '{"units": 1}'

  // Setup checklist items
  const checklistItems: CheckItem[] = [
    { label: 'Terms signed by both sides', done: !!deal },
    {
      label: 'Escrow funded',
      sub: deposit > 0n ? `${fmtAddr(METERED_ESCROW.address)}` : undefined,
      href: deposit > 0n ? `${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}` : undefined,
      done: deposit > 0n,
    },
    { label: 'Service provisioned', done: deal?.status === 1 },
    { label: 'Acknowledge usage to settle', done: settleSuccess || settled > 0n },
  ]

  if (!deal) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading deal {String(dealId)}…</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
      {/* ── Deal header ── */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[deal.status]}`}>
              {STATUS_LABELS[deal.status]}
            </span>
            {deal.status === 1 && (
              <span className="rounded-md px-2 py-0.5 text-xs font-semibold badge-funded">
                Provisioned
              </span>
            )}
          </div>
          <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
            Deal {String(dealId).slice(-8)}
          </span>
        </div>
        <h2 className="display mt-2 text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
          {serviceName}
        </h2>

        {/* Step breadcrumb */}
        <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
          {['Negotiate', 'Sign and fund', 'Use', 'Receipt'].map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              {i > 0 && <span>/</span>}
              <span style={{ color: i === 2 ? 'var(--ink)' : undefined, fontWeight: i === 2 ? 600 : undefined }}>
                {s}
              </span>
            </span>
          ))}
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Review every metered request and sign usage so the seller is paid from escrow. Unused funds stay yours.
        </p>
      </div>

      {/* ── Two-panel body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3">

        {/* ── Left: main content ── */}
        <div className="lg:col-span-2 p-6 space-y-6" style={{ borderRight: '1px solid var(--border)' }}>

          {/* Metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
            <MetricBox label="Deposited" value={`$${fmt(deposit)}`} />
            <MetricBox label="Used" value={`$${fmt(settled)}`} sub={`${String(acceptedUnits)} of ${String(maxUnits)} ${unitLabel}s`} />
            <MetricBox label="Settled to seller" value={`$${fmt(settled)}`} />
            <MetricBox label="Remaining" value={`$${fmt(remaining)}`} sub="Read from chain" />
          </div>

          {/* Progress bar */}
          {deposit > 0n && (
            <div>
              <div className="flex h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-muted)' }}>
                <div className="h-full rounded-full" style={{ width: `${settledPct}%`, background: 'var(--success)', transition: 'width 0.4s' }} />
              </div>
              <p className="mt-1.5 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                {settledPct.toFixed(0)}% settled
              </p>
            </div>
          )}

          {/* Usage panel */}
          {deal.status === 1 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="display text-base font-semibold" style={{ color: 'var(--ink)' }}>
                  Record delivered {unitLabel}s
                </h3>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Only delivered {unitLabel}s are billable.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>{unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)}s delivered</label>
                  <input
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    placeholder="e.g. 5"
                    type="number"
                    min="1"
                    className="w-full rounded-lg px-3 py-2.5 text-sm font-medium"
                    style={{ background: 'var(--surface-muted)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Note (optional)</label>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Request description"
                    className="w-full rounded-lg px-3 py-2.5 text-sm font-medium"
                    style={{ background: 'var(--surface-muted)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>
              <TxButton
                onClick={handleBuildAndSign}
                disabled={!units}
                label="Build acceptance payload"
                variant="secondary"
              />
            </div>
          )}

          {/* Buyer sign + settle */}
          {acceptPayload && deal.status === 1 && isBuyer && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--accent-light)', border: '1px solid rgba(1,43,255,0.15)' }}>
              <div className="flex items-center gap-2">
                <Zap className="size-4" style={{ color: 'var(--accent)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Buyer: sign and settle</p>
              </div>
              <div className="rounded-lg px-3 py-2.5 text-xs mono tabular-nums" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--ink-2)', wordBreak: 'break-all' }}>
                cumAmount: {fmt((acceptPayload as { cumulativeAmount: bigint }).cumulativeAmount)} USDC
                {' · '}cumUnits: {String((acceptPayload as { cumulativeUnits: bigint }).cumulativeUnits)}
              </div>
              <TxButton
                onClick={() => { void handleSign() }}
                isPending={settlePending}
                isConfirming={settleConfirming}
                label="Sign and settle payment"
              />
              <TxReceipt hash={settleHash} isSuccess={settleSuccess} isError={settleError} error={settleErr} label="Settlement" />
            </div>
          )}

          {/* Usage history (settled so far) */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="display text-base font-semibold" style={{ color: 'var(--ink)' }}>Usage</h3>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Every request, newest first.</p>
            </div>
            {settled === 0n ? (
              <p className="text-sm py-4" style={{ color: 'var(--muted)' }}>No usage settled yet.</p>
            ) : (
              <div className="text-sm py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--muted)' }}>Settled onchain so far</span>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>${fmt(settled)} USDC</span>
              </div>
            )}
          </div>

          {/* Seller close + refund actions */}
          {(canClose || (canRefund && remaining > 0n)) && (
            <div className="flex flex-wrap gap-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              {canClose && (
                <TxButton
                  onClick={() => { void handleSellerClose() }}
                  isPending={closePending}
                  isConfirming={closeConfirming}
                  label="Close term early"
                  variant="secondary"
                />
              )}
              {canRefund && remaining > 0n && (
                <TxButton
                  onClick={() => { void handleRefund() }}
                  isPending={refundPending}
                  isConfirming={refundConfirming}
                  label={`Request refund of $${fmt(remaining)} USDC`}
                  variant="secondary"
                />
              )}
            </div>
          )}
          {(closeHash || refundHash) && (
            <div className="flex gap-3 text-xs flex-wrap">
              {closeHash && (
                <a href={`${ARC_TESTNET_EXPLORER}/tx/${closeHash}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                  Close tx <ExternalLink className="size-3" />
                </a>
              )}
              {refundHash && (
                <a href={`${ARC_TESTNET_EXPLORER}/tx/${refundHash}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                  Refund tx <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}

          {deal.status === 1 && !canRefund && refundableAt !== undefined && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
              <Clock className="size-3.5 shrink-0" />
              Unused balance is refundable from {new Date(Number(refundableAt) * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
            </div>
          )}
        </div>

        {/* ── Right: setup sidebar ── */}
        <div className="p-6 space-y-6" style={{ background: 'var(--bg)' }}>

          {/* Setup checklist */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
              SETUP
            </p>
            <SetupChecklist items={checklistItems} />
          </div>

          {/* Credentials */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
              CREDENTIALS
            </p>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Endpoint</p>
                <div className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs mono" style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}>
                  <span className="truncate">{endpoint}</span>
                  <CopyButton text={endpoint} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Terminal className="size-3" style={{ color: 'var(--muted)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Example request</p>
                </div>
                <div
                  className="rounded-lg px-3 py-2.5 text-xs mono"
                  style={{ background: '#0f1117', color: '#e5e7eb', lineHeight: '1.6', wordBreak: 'break-all' }}
                >
                  <span style={{ color: '#9ca3af' }}>curl -X POST \</span><br />
                  <span style={{ color: '#9ca3af' }}>  -H &quot;Content-Type: application/json&quot; \</span><br />
                  <span style={{ color: '#9ca3af' }}>  -d &apos;{exampleBody}&apos; \</span><br />
                  <span style={{ color: '#60a5fa' }}>  {endpoint}</span>
                  <button
                    onClick={() => {
                      const cmd = `curl -X POST -H "Content-Type: application/json" -d '${exampleBody}' ${endpoint}`
                      void navigator.clipboard.writeText(cmd)
                      toast.success('curl command copied')
                    }}
                    className="ml-2 opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <Copy className="size-3 inline" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Balances */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
              BALANCES
            </p>
            <div className="space-y-2">
              {[
                ['Deposit', `$${fmt(deposit)} USDC`],
                ['Settled', `$${fmt(settled)} USDC`],
                ['Refunded', `$${fmt(refunded)} USDC`],
                ['Remaining', `$${fmt(remaining)} USDC`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--muted)' }}>{k}</span>
                  <span className="tabular-nums font-medium" style={{ color: 'var(--ink)' }}>{v}</span>
                </div>
              ))}
            </div>
            <a
              href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs"
              style={{ color: 'var(--accent)' }}
            >
              Escrow on explorer <ExternalLink className="size-3" />
            </a>
          </div>

          {/* Parties */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
              PARTIES
            </p>
            <div className="space-y-2">
              {[
                ['Buyer', deal.buyer],
                ['Seller', deal.seller],
                ['Payee', deal.payee],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--muted)' }}>{k}</span>
                  <span className="mono tabular-nums flex items-center" style={{ color: 'var(--ink-2)' }}>
                    {fmtAddr(v)}
                    <CopyButton text={v} />
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--muted)' }}>Your role</span>
                <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                  {isBuyer ? 'Buyer' : isSeller ? 'Seller' : 'Observer'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
