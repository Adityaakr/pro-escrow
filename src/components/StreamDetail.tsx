import { useState } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useSignTypedData, useSwitchChain } from 'wagmi'
import { METERED_ESCROW, ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER, type OnchainDeal } from '@/contract'
import { decodeStreamType, getStreamType, fmtUSDC, fmtAddr, fmtDate, progressPct } from '@/streams'
import { TxButton } from './TxButton'
import { TxReceipt } from './TxReceipt'
import { ExternalLink, Clock, Copy, CheckCircle2, Circle, Briefcase, TrendingUp, CheckSquare } from 'lucide-react'
import { toast } from 'sonner'
import type { StreamType } from '@/streams'

function getUnixNow(): bigint { return BigInt(Math.trunc(Date.now() / 1000)) }

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

function CopyBtn({ text }: { text: string }) {
  return (
    <button onClick={() => { void navigator.clipboard.writeText(text); toast.success('Copied') }} className="ml-1 opacity-40 hover:opacity-90 transition-opacity">
      <Copy className="size-3" />
    </button>
  )
}

type CheckItem = { label: string; sub?: string; done: boolean; href?: string }

function Checklist({ items }: { items: CheckItem[] }) {
  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.label} className="flex items-start gap-2.5">
          {item.done
            ? <CheckCircle2 className="size-4 mt-0.5 shrink-0" style={{ color: 'var(--green)' }} />
            : <Circle className="size-4 mt-0.5 shrink-0" style={{ color: 'var(--border-strong)' }} />
          }
          <div>
            <p className="text-sm font-medium" style={{ color: item.done ? 'var(--ink)' : 'var(--muted)' }}>{item.label}</p>
            {item.sub && (
              <p className="text-xs mt-0.5">
                {item.href
                  ? <a href={item.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5" style={{ color: 'var(--blue)' }}>
                      {item.sub} <ExternalLink className="size-2.5" />
                    </a>
                  : <span style={{ color: 'var(--muted)' }}>{item.sub}</span>}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function MetricBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>{label}</p>
      <p className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--muted)' }}>{sub}</p>}
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>
      {children}
    </p>
  )
}

export function StreamDetail({ dealId }: { dealId: bigint }) {
  const { address, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const [units, setUnits] = useState('')
  const [note, setNote] = useState('')
  const [acceptPayload, setAcceptPayload] = useState<Record<string, unknown> | null>(null)

  const streamType = decodeStreamType(dealId)
  const meta = getStreamType(streamType)
  const typeColor = TYPE_COLOR[streamType]
  const typeIcon = TYPE_ICON[streamType]

  const { data: rawDeal, refetch: refetchDeal } = useReadContract({
    address: METERED_ESCROW.address, abi: METERED_ESCROW.abi,
    functionName: 'getDeal', args: [dealId], chainId: ARC_TESTNET_CHAIN_ID,
  })
  const { data: balanceData, refetch: refetchBal } = useReadContract({
    address: METERED_ESCROW.address, abi: METERED_ESCROW.abi,
    functionName: 'balances', args: [dealId], chainId: ARC_TESTNET_CHAIN_ID,
  })
  const { data: refundableAt } = useReadContract({
    address: METERED_ESCROW.address, abi: METERED_ESCROW.abi,
    functionName: 'refundableAt', args: [dealId], chainId: ARC_TESTNET_CHAIN_ID,
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
    void refetchDeal(); void refetchBal()
  }

  const isBuyer  = address?.toLowerCase() === deal?.buyer?.toLowerCase()
  const isSeller = address?.toLowerCase() === deal?.seller?.toLowerCase()
  const canClose  = isSeller && deal?.status === 1 && !deal?.sellerClosed
  const canRefund = deal?.status === 1 && (deal?.sellerClosed || (refundableAt !== undefined && getUnixNow() >= (refundableAt as bigint)))
  const remaining = deposit - settled - refunded
  const pct = progressPct(settled, deposit)
  const acceptedUnits = deal?.acceptedUnits ?? 0n
  const maxUnits = deal?.maxUnits ?? 1n

  // Role labels
  const roleLabel  = isBuyer ? meta.defaults.payerLabel.split(' ')[0] : isSeller ? meta.defaults.recipientLabel.split(' ')[0] : 'Observer'

  function handleBuildPayload() {
    if (!deal) return
    const n = parseInt(units)
    if (isNaN(n) || n <= 0) { toast.error('Enter a valid number of ' + meta.unitLabel + 's'); return }
    const newCumUnits = acceptedUnits + BigInt(n)
    const newCumAmount = deal.settled + BigInt(n) * (deposit / (maxUnits || 1n))
    const receiptsRoot = `0x${Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')}`
    setAcceptPayload({
      dealId,
      termsHash: deal.termsHash,
      cumulativeAmount: newCumAmount > deposit ? deposit : newCumAmount,
      cumulativeUnits: newCumUnits > maxUnits ? maxUnits : newCumUnits,
      receiptsRoot,
      nonce: (deal.acceptedNonce ?? 0n) + 1n,
      expiry: getUnixNow() + 3600n,
    })
    toast.success('Payload ready — sign as ' + meta.defaults.payerLabel.split(' ')[0] + ' to release funds')
  }

  async function handleSign() {
    if (!acceptPayload) return
    if (chainId !== ARC_TESTNET_CHAIN_ID) { try { await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID }) } catch { return } }
    try {
      const sig = await signTypedDataAsync({
        domain: { name: 'MeteredEscrow', version: '1', chainId: ARC_TESTNET_CHAIN_ID, verifyingContract: METERED_ESCROW.address },
        types: { Acceptance: [
          { name: 'dealId', type: 'uint256' }, { name: 'termsHash', type: 'bytes32' },
          { name: 'cumulativeAmount', type: 'uint256' }, { name: 'cumulativeUnits', type: 'uint256' },
          { name: 'receiptsRoot', type: 'bytes32' }, { name: 'nonce', type: 'uint256' },
          { name: 'expiry', type: 'uint64' },
        ]},
        primaryType: 'Acceptance',
        message: acceptPayload as { dealId: bigint; termsHash: `0x${string}`; cumulativeAmount: bigint; cumulativeUnits: bigint; receiptsRoot: `0x${string}`; nonce: bigint; expiry: bigint },
      })
      settle({ address: METERED_ESCROW.address, abi: METERED_ESCROW.abi, functionName: 'settleAcceptedUsage', args: [dealId, acceptPayload, sig], chainId: ARC_TESTNET_CHAIN_ID })
    } catch (e: unknown) { if ((e as { code?: number }).code !== 4001) toast.error('Signing failed') }
  }

  async function handleClose() {
    if (chainId !== ARC_TESTNET_CHAIN_ID) { try { await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID }) } catch { return } }
    sellerClose({ address: METERED_ESCROW.address, abi: METERED_ESCROW.abi, functionName: 'sellerCloseTerm', args: [dealId], chainId: ARC_TESTNET_CHAIN_ID })
  }

  async function handleRefund() {
    if (chainId !== ARC_TESTNET_CHAIN_ID) { try { await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID }) } catch { return } }
    refund({ address: METERED_ESCROW.address, abi: METERED_ESCROW.abi, functionName: 'refundUnused', args: [dealId], chainId: ARC_TESTNET_CHAIN_ID })
  }

  // Checklist
  const checklist: CheckItem[] = [
    { label: 'Terms signed by both parties', done: !!deal },
    { label: 'Stream funded', done: deposit > 0n, sub: deposit > 0n ? `${fmtUSDC(deposit)} locked` : undefined, href: deposit > 0n ? `${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}` : undefined },
    { label: streamType === 'payroll' ? 'First pay period active' : streamType === 'vesting' ? 'Vesting active' : 'Work in progress', done: deal?.status === 1 },
    { label: streamType === 'payroll' ? 'First payment claimed' : streamType === 'vesting' ? 'First tranche claimed' : 'First milestone paid', done: settled > 0n },
    { label: canRefund ? 'Refund available' : 'Stream complete', done: deal?.status === 2 || canRefund },
  ]

  const STATUS_LABEL: Record<number, string> = { 0: 'Pending', 1: 'Active', 2: 'Closed' }
  const status = deal?.status ?? 0

  if (!deal) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading stream {String(dealId).slice(-8)}…</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>

      {/* ── Header ── */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <div className="flex size-7 items-center justify-center rounded-lg" style={{ background: typeColor + '14', color: typeColor }}>
            {typeIcon}
          </div>
          <span className={`badge badge-${streamType}`}>{meta.label}</span>
          <span className={`badge badge-${status === 1 ? 'active' : 'closed'}`}>{STATUS_LABEL[status]}</span>
          <span className="text-xs mono" style={{ color: 'var(--muted)' }}>#{String(dealId).slice(-8)}</span>
        </div>

        {/* Step breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: 'var(--muted)' }}>
          {(streamType === 'payroll'
            ? ['Setup', 'Fund', 'Pay periods', 'Complete']
            : streamType === 'vesting'
            ? ['Setup', 'Fund', 'Tranches', 'Complete']
            : ['Setup', 'Fund', 'Milestones', 'Complete']
          ).map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              {i > 0 && <span>/</span>}
              <span style={{ color: i === 2 ? 'var(--ink)' : undefined, fontWeight: i === 2 ? 600 : undefined }}>{s}</span>
            </span>
          ))}
        </div>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{meta.description}</p>

        {/* Role badge */}
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: typeColor + '12', color: typeColor }}>
          Your role: {roleLabel}
        </div>
      </div>

      {/* ── Two-panel body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3">

        {/* ── Left: main ── */}
        <div className="lg:col-span-2 p-6 space-y-6" style={{ borderRight: '1px solid var(--border)' }}>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
            <MetricBox label="Total locked" value={fmtUSDC(deposit)} />
            <MetricBox
              label={streamType === 'payroll' ? 'Paid out' : streamType === 'vesting' ? 'Vested' : 'Released'}
              value={fmtUSDC(settled)}
              sub={`${String(acceptedUnits)} of ${String(maxUnits)} ${meta.unitLabel}s`}
            />
            <MetricBox label="Remaining" value={fmtUSDC(remaining)} sub="Read from chain" />
            <MetricBox label="Progress" value={`${pct}%`} sub={`${String(acceptedUnits)}/${String(maxUnits)} ${meta.periodLabel}s`} />
          </div>

          {/* Progress bar */}
          {deposit > 0n && (
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span style={{ color: 'var(--muted)' }}>{pct}% {streamType === 'payroll' ? 'paid' : streamType === 'vesting' ? 'vested' : 'released'}</span>
                <span style={{ color: 'var(--muted)' }}>{fmtUSDC(remaining)} remaining</span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-muted)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: typeColor }} />
              </div>
            </div>
          )}

          {/* Timeline */}
          {deal.end > 0n && (
            <div>
              <div className="flex items-stretch gap-0">
                {[
                  { label: 'Start', value: fmtDate(Number(deal.end) - parseInt(meta.defaults.termDays) * 86400), done: true },
                  { label: streamType === 'payroll' ? 'Salary end' : streamType === 'vesting' ? 'Fully vested' : 'Deadline', value: fmtDate(deal.end), done: getUnixNow() >= deal.end },
                  { label: 'Refund from', value: fmtDate(deal.end + deal.grace), done: canRefund },
                ].map((node, i) => (
                  <div key={node.label} className="flex items-center gap-2 flex-1">
                    <div className="flex flex-col items-center">
                      <div className="size-2.5 rounded-full" style={{ background: node.done ? typeColor : 'var(--border-strong)' }} />
                    </div>
                    {i < 2 && <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />}
                    <div className="ml-1 mr-2">
                      <p className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{node.label}</p>
                      <p className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{node.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Claim / release panel */}
          {deal.status === 1 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="display text-base font-semibold" style={{ color: 'var(--ink)' }}>
                  {streamType === 'payroll' ? 'Claim pay period' : streamType === 'vesting' ? 'Claim vesting tranche' : 'Release milestone payment'}
                </h3>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {String(maxUnits - acceptedUnits)} {meta.unitLabel}s remaining
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
                    {meta.unitLabel.charAt(0).toUpperCase() + meta.unitLabel.slice(1)}s to claim
                  </label>
                  <input
                    value={units}
                    onChange={e => setUnits(e.target.value)}
                    placeholder="e.g. 1"
                    type="number"
                    min="1"
                    className="w-full rounded-lg px-3 py-2.5 text-sm font-medium"
                    style={{ background: 'var(--surface-muted)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
                    {streamType === 'payroll' ? 'Period note (optional)' : streamType === 'vesting' ? 'Tranche note (optional)' : 'Milestone description'}
                  </label>
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder={streamType === 'payroll' ? 'e.g. October salary' : streamType === 'vesting' ? 'e.g. Q4 2026 tranche' : 'e.g. Design mockups delivered'}
                    className="w-full rounded-lg px-3 py-2.5 text-sm font-medium"
                    style={{ background: 'var(--surface-muted)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>
              <TxButton onClick={handleBuildPayload} disabled={!units} label={`Build ${meta.unitLabel} claim`} variant="secondary" />
            </div>
          )}

          {/* Sign + release */}
          {acceptPayload && deal.status === 1 && isBuyer && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--accent-light)', border: '1px solid rgba(10,37,64,0.15)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {meta.defaults.payerLabel.split(' ')[0]}: sign to release payment
              </p>
              <div className="rounded-lg px-3 py-2.5 text-xs mono tabular-nums" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--ink-2)', wordBreak: 'break-all' }}>
                Release {fmtUSDC((acceptPayload as { cumulativeAmount: bigint }).cumulativeAmount - (deal?.settled ?? 0n))} USDC
                {' · '}{String((acceptPayload as { cumulativeUnits: bigint }).cumulativeUnits)} {meta.unitLabel}s cumulative
              </div>
              <TxButton onClick={() => { void handleSign() }} isPending={settlePending} isConfirming={settleConfirming} label="Sign and release" />
              <TxReceipt hash={settleHash} isSuccess={settleSuccess} isError={settleError} error={settleErr} label="Payment" />
            </div>
          )}

          {/* History */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="display text-base font-semibold" style={{ color: 'var(--ink)' }}>
                {streamType === 'payroll' ? 'Payment history' : streamType === 'vesting' ? 'Claim history' : 'Milestone history'}
              </h3>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>On-chain records</p>
            </div>
            {settled === 0n
              ? <p className="text-sm py-2" style={{ color: 'var(--muted)' }}>No payments released yet.</p>
              : (
                <div className="rounded-lg px-4 py-3 flex items-center justify-between" style={{ background: 'var(--surface-muted)' }}>
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>Total released on-chain</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{fmtUSDC(settled)}</span>
                </div>
              )
            }
          </div>

          {/* Actions */}
          {(canClose || (canRefund && remaining > 0n)) && (
            <div className="flex flex-wrap gap-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              {canClose && (
                <TxButton onClick={() => { void handleClose() }} isPending={closePending} isConfirming={closeConfirming}
                  label={streamType === 'payroll' ? 'End payroll early' : streamType === 'vesting' ? 'Cancel vesting' : 'Close project'}
                  variant="secondary" />
              )}
              {canRefund && remaining > 0n && (
                <TxButton onClick={() => { void handleRefund() }} isPending={refundPending} isConfirming={refundConfirming}
                  label={`Reclaim ${fmtUSDC(remaining)} USDC`}
                  variant="secondary" />
              )}
            </div>
          )}
          {(closeHash || refundHash) && (
            <div className="flex gap-3 text-xs">
              {closeHash && <a href={`${ARC_TESTNET_EXPLORER}/tx/${closeHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1" style={{ color: 'var(--muted)' }}>Close tx <ExternalLink className="size-3" /></a>}
              {refundHash && <a href={`${ARC_TESTNET_EXPLORER}/tx/${refundHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1" style={{ color: 'var(--muted)' }}>Reclaim tx <ExternalLink className="size-3" /></a>}
            </div>
          )}
          {deal.status === 1 && !canRefund && refundableAt !== undefined && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
              <Clock className="size-3.5 shrink-0" />
              Unused balance reclaimable from {fmtDate(refundableAt as bigint)}.
            </div>
          )}
        </div>

        {/* ── Right: sidebar ── */}
        <div className="p-6 space-y-6" style={{ background: 'var(--bg)' }}>
          <div>
            <SectionLabel>PROGRESS</SectionLabel>
            <Checklist items={checklist} />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <SectionLabel>BALANCES</SectionLabel>
            <div className="space-y-2.5">
              {[
                ['Locked', fmtUSDC(deposit)],
                [streamType === 'payroll' ? 'Paid out' : streamType === 'vesting' ? 'Vested' : 'Released', fmtUSDC(settled)],
                ['Refunded', fmtUSDC(refunded)],
                ['Remaining', fmtUSDC(remaining)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--muted)' }}>{k}</span>
                  <span className="tabular-nums font-medium" style={{ color: 'var(--ink)' }}>{v}</span>
                </div>
              ))}
            </div>
            <a href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs" style={{ color: 'var(--blue)' }}>
              View on explorer <ExternalLink className="size-3" />
            </a>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <SectionLabel>PARTIES</SectionLabel>
            <div className="space-y-2.5">
              {[
                [meta.defaults.payerLabel.split(' ')[0], deal.buyer],
                [meta.defaults.recipientLabel.split(' ')[0], deal.seller],
                ['Payee', deal.payee],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--muted)' }}>{k}</span>
                  <span className="mono flex items-center" style={{ color: 'var(--ink-2)' }}>
                    {fmtAddr(v)}<CopyBtn text={v} />
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--muted)' }}>Your role</span>
                <span className="font-semibold" style={{ color: typeColor }}>{roleLabel}</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <SectionLabel>SCHEDULE</SectionLabel>
            <div className="space-y-2">
              {[
                ['Term ends', deal.end > 0n ? fmtDate(deal.end) : '—'],
                ['Refund from', refundableAt !== undefined ? fmtDate(refundableAt as bigint) : '—'],
                [meta.unitLabel.charAt(0).toUpperCase() + meta.unitLabel.slice(1) + 's total', String(maxUnits)],
                [meta.unitLabel.charAt(0).toUpperCase() + meta.unitLabel.slice(1) + 's claimed', String(acceptedUnits)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--muted)' }}>{k}</span>
                  <span className="font-medium tabular-nums" style={{ color: 'var(--ink)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
