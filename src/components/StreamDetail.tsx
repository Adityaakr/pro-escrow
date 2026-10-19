import { useState } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useSignTypedData, useSwitchChain } from 'wagmi'
import { METERED_ESCROW, ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER, type OnchainDeal } from '@/contract'
import { decodeStreamType, getStreamType, fmtUSDC, fmtAddr, fmtDate, progressPct } from '@/streams'
import { TxButton } from './TxButton'
import { TxReceipt } from './TxReceipt'
import { ExternalLink, Clock, Copy, CheckCircle2, Circle, Briefcase, TrendingUp, Flag } from 'lucide-react'
import { toast } from 'sonner'
import type { StreamType } from '@/streams'

function getUnixNow(): bigint { return BigInt(Math.trunc(Date.now() / 1000)) }

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

function CopyBtn({ text }: { text: string }) {
  return (
    <button
      onClick={() => { void navigator.clipboard.writeText(text); toast.success('Copied') }}
      style={{ display: 'inline-flex', marginLeft: 4, opacity: 0.4, cursor: 'pointer' }}
      onMouseEnter={e => { (e.currentTarget).style.opacity = '1' }}
      onMouseLeave={e => { (e.currentTarget).style.opacity = '0.4' }}
    >
      <Copy size={11} />
    </button>
  )
}

type CheckItem = { label: string; sub?: string; done: boolean; href?: string }

function Checklist({ items }: { items: CheckItem[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          {item.done
            ? <CheckCircle2 size={15} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />
            : <Circle size={15} style={{ color: 'var(--border-strong)', flexShrink: 0, marginTop: 1 }} />
          }
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: item.done ? 'var(--ink)' : 'var(--muted)', margin: 0 }}>{item.label}</p>
            {item.sub && (
              <p style={{ fontSize: 11, margin: '2px 0 0' }}>
                {item.href
                  ? <a href={item.href} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      {item.sub} <ExternalLink size={9} />
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

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', fontFamily: mono ? 'JetBrains Mono, monospace' : undefined, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--subtle)', margin: '0 0 12px' }}>{children}</p>
}

export function StreamDetail({ dealId }: { dealId: bigint }) {
  const { address, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const [units, setUnits]   = useState('')
  const [note, setNote]     = useState('')
  const [acceptPayload, setAcceptPayload] = useState<Record<string, unknown> | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'settle' | 'manage'>('overview')

  const streamType = decodeStreamType(dealId)
  const meta = getStreamType(streamType)
  const typeColor = TYPE_COLOR[streamType]

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

  if (settleSuccess || closeSuccess || refundSuccess) { void refetchDeal(); void refetchBal() }

  const isBuyer  = address?.toLowerCase() === deal?.buyer?.toLowerCase()
  const isSeller = address?.toLowerCase() === deal?.seller?.toLowerCase()
  const canClose  = isSeller && deal?.status === 1 && !deal?.sellerClosed
  const canRefund = deal?.status === 1 && (deal?.sellerClosed || (refundableAt !== undefined && getUnixNow() >= (refundableAt as bigint)))
  const remaining = deposit - settled - refunded
  const pct = progressPct(settled, deposit)
  const acceptedUnits = deal?.acceptedUnits ?? 0n
  const maxUnits = deal?.maxUnits ?? 1n
  const STATUS_LABEL: Record<number, string> = { 0: 'Pending', 1: 'Active', 2: 'Closed' }
  const status = deal?.status ?? 0

  function handleBuildPayload() {
    if (!deal) return
    const n = parseInt(units)
    if (isNaN(n) || n <= 0) { toast.error(`Enter a valid number of ${meta.unitLabel}s`); return }
    const newCumUnits = acceptedUnits + BigInt(n)
    const newCumAmount = deal.settled + BigInt(n) * (deposit / (maxUnits || 1n))
    const receiptsRoot = `0x${Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')}`
    setAcceptPayload({
      dealId, termsHash: deal.termsHash,
      cumulativeAmount: newCumAmount > deposit ? deposit : newCumAmount,
      cumulativeUnits:  newCumUnits  > maxUnits ? maxUnits : newCumUnits,
      receiptsRoot, nonce: (deal.acceptedNonce ?? 0n) + 1n,
      expiry: getUnixNow() + 3600n,
    })
    toast.success('Payload ready — sign as payer to release funds')
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

  const checklist: CheckItem[] = [
    { label: 'Terms signed by both parties', done: !!deal },
    { label: 'Stream funded', done: deposit > 0n, sub: deposit > 0n ? `${fmtUSDC(deposit)} locked` : undefined, href: deposit > 0n ? `${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}` : undefined },
    { label: streamType === 'payroll' ? 'Payroll active' : streamType === 'vesting' ? 'Vesting active' : 'Project in progress', done: deal?.status === 1 },
    { label: streamType === 'payroll' ? 'First payment made' : streamType === 'vesting' ? 'First tranche claimed' : 'First milestone paid', done: settled > 0n },
    { label: canRefund ? 'Reclaim available' : 'Stream complete', done: deal?.status === 2 || canRefund },
  ]

  if (!deal) {
    return (
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Loading stream {String(dealId).slice(-8)}...</p>
      </div>
    )
  }

  const roleLabel = isBuyer ? meta.defaults.payerLabel.split(' ')[0] : isSeller ? meta.defaults.recipientLabel.split(' ')[0] : 'Observer'

  return (
    <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: TYPE_BG[streamType], color: typeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {TYPE_ICON[streamType]}
          </div>
          <span className={`badge badge-${streamType}`}>{meta.label}</span>
          <span className={`badge badge-${status === 1 ? 'active' : status === 0 ? 'pending' : 'closed'}`}>{STATUS_LABEL[status]}</span>
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted)' }}>#{String(dealId).slice(-10)}</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Your role:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: typeColor }}>{roleLabel}</span>
        </div>

        {/* Metric strip — 2x2 on mobile, 4-col on desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }} className="sm:grid-cols-4">
          {[
            { label: 'Locked', value: fmtUSDC(deposit) },
            { label: streamType === 'payroll' ? 'Paid out' : streamType === 'vesting' ? 'Vested' : 'Released', value: fmtUSDC(settled) },
            { label: 'Remaining', value: fmtUSDC(remaining) },
            { label: 'Progress', value: `${pct}%` },
          ].map(({ label, value }, i) => (
            <div key={label} style={{ padding: '12px 16px', borderLeft: i % 2 !== 0 ? '1px solid var(--border)' : undefined, borderTop: i >= 2 ? '1px solid var(--border)' : undefined }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--subtle)', margin: '0 0 4px' }}>{label}</p>
              <p style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 20, color: 'var(--ink)', margin: 0, lineHeight: 1, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {deposit > 0n && (
          <div style={{ padding: '8px 16px 0' }}>
            <div style={{ height: 3, background: 'var(--surface-muted)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: typeColor, borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
        {([
          { id: 'overview' as const, label: 'Overview' },
          { id: 'settle'   as const, label: deal.status === 1 ? (streamType === 'payroll' ? 'Claim pay' : streamType === 'vesting' ? 'Claim tranche' : 'Release milestone') : 'Settle' },
          { id: 'manage'   as const, label: 'Manage' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 16px 11px',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--ink)' : 'var(--muted)',
              borderBottom: activeTab === tab.id ? `2px solid ${typeColor}` : '2px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — single col on mobile, 2-col on desktop */}
      <div className="block md:grid" style={{ gridTemplateColumns: '1fr 280px' }}>

        {/* Main content */}
        <div style={{ padding: '20px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>

          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Timeline */}
              {deal.end > 0n && (
                <div>
                  <SectionTitle>Timeline</SectionTitle>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    {[
                      { label: 'Started', value: fmtDate(Number(deal.end) - parseInt(meta.defaults.termDays) * 86400), done: true },
                      { label: streamType === 'payroll' ? 'Term ends' : streamType === 'vesting' ? 'Fully vested' : 'Deadline', value: fmtDate(deal.end), done: getUnixNow() >= deal.end },
                      { label: 'Reclaim from', value: fmtDate(deal.end + deal.grace), done: canRefund },
                    ].map((node, i) => (
                      <div key={node.label} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: node.done ? typeColor : 'var(--border-strong)' }} />
                        </div>
                        <div style={{ paddingLeft: 8, paddingRight: 16 }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{node.label}</p>
                          <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{node.value}</p>
                        </div>
                        {i < 2 && <div style={{ flex: 1, height: 1, background: 'var(--border)', marginRight: 8 }} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Balances */}
              <div>
                <SectionTitle>Balances</SectionTitle>
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  {[
                    ['Locked', fmtUSDC(deposit), false],
                    [streamType === 'payroll' ? 'Paid out' : streamType === 'vesting' ? 'Vested' : 'Released', fmtUSDC(settled), false],
                    ['Refunded', fmtUSDC(refunded), false],
                    ['Remaining', fmtUSDC(remaining), true],
                  ].map(([k, v, bold], i) => (
                    <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: i > 0 ? '1px solid var(--border)' : undefined, background: bold ? 'var(--surface-muted)' : 'white' }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{k}</span>
                      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <a href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 12, color: 'var(--blue)' }}>
                  View on explorer <ExternalLink size={11} />
                </a>
              </div>

              {/* Parties */}
              <div>
                <SectionTitle>Parties</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  {[
                    [meta.defaults.payerLabel.split(' ')[0], deal.buyer],
                    [meta.defaults.recipientLabel.split(' ')[0], deal.seller],
                    ['Payee', deal.payee],
                  ].map(([k, v], i) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{k}</span>
                      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-2)', display: 'flex', alignItems: 'center' }}>
                        {fmtAddr(v)}<CopyBtn text={v} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {deal.status !== 1 ? (
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {deal.status === 0 ? 'Stream is not yet funded.' : 'Stream is closed.'}
                </p>
              ) : (
                <>
                  <div>
                    <SectionTitle>
                      {streamType === 'payroll' ? 'Claim pay period' : streamType === 'vesting' ? 'Claim vesting tranche' : 'Release milestone payment'}
                    </SectionTitle>
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 14px' }}>
                      {String(maxUnits - acceptedUnits)} {meta.unitLabel}{Number(maxUnits - acceptedUnits) !== 1 ? 's' : ''} remaining to claim.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 6 }}>
                          {meta.unitLabel.charAt(0).toUpperCase() + meta.unitLabel.slice(1)}s to claim
                        </label>
                        <input
                          value={units}
                          onChange={e => setUnits(e.target.value)}
                          placeholder="1"
                          type="number"
                          min="1"
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface-muted)', fontSize: 13, color: 'var(--ink)' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 6 }}>
                          {streamType === 'payroll' ? 'Period note' : streamType === 'vesting' ? 'Tranche note' : 'Milestone description'} (optional)
                        </label>
                        <input
                          value={note}
                          onChange={e => setNote(e.target.value)}
                          placeholder={streamType === 'payroll' ? 'e.g. October salary' : streamType === 'vesting' ? 'e.g. Q4 2026 tranche' : 'e.g. Design mockups delivered'}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface-muted)', fontSize: 13, color: 'var(--ink)' }}
                        />
                      </div>
                      <TxButton onClick={handleBuildPayload} disabled={!units} label={`Build ${meta.unitLabel} claim`} variant="secondary" />
                    </div>
                  </div>

                  {acceptPayload && isBuyer && (
                    <div style={{ borderRadius: 'var(--radius-sm)', padding: 16, background: 'var(--accent-light)', border: '1px solid rgba(15,23,42,0.12)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Sign to release payment</p>
                      <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.04)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-2)', wordBreak: 'break-all' }}>
                        Release {fmtUSDC((acceptPayload as { cumulativeAmount: bigint }).cumulativeAmount - (deal?.settled ?? 0n))} USDC
                        {' / '}{String((acceptPayload as { cumulativeUnits: bigint }).cumulativeUnits)} {meta.unitLabel}s cumulative
                      </div>
                      <TxButton onClick={() => { void handleSign() }} isPending={settlePending} isConfirming={settleConfirming} label="Sign and release" />
                      <TxReceipt hash={settleHash} isSuccess={settleSuccess} isError={settleError} error={settleErr} label="Payment" />
                    </div>
                  )}

                  {settled > 0n && (
                    <div>
                      <SectionTitle>Payment history</SectionTitle>
                      <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Total released on-chain</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{fmtUSDC(settled)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'manage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <SectionTitle>Schedule</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <Row label="Term ends" value={deal.end > 0n ? fmtDate(deal.end) : 'Not set'} />
                  <Row label="Reclaim from" value={refundableAt !== undefined ? fmtDate(refundableAt as bigint) : 'Not available'} />
                  <Row label={`${meta.unitLabel.charAt(0).toUpperCase() + meta.unitLabel.slice(1)}s total`} value={String(maxUnits)} />
                  <Row label={`${meta.unitLabel.charAt(0).toUpperCase() + meta.unitLabel.slice(1)}s claimed`} value={String(acceptedUnits)} />
                </div>
              </div>

              {deal.status === 1 && !canRefund && refundableAt !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-muted)', fontSize: 12, color: 'var(--muted)' }}>
                  <Clock size={13} style={{ flexShrink: 0 }} />
                  Unused balance reclaimable from {fmtDate(refundableAt as bigint)}.
                </div>
              )}

              {(canClose || (canRefund && remaining > 0n)) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <SectionTitle>Actions</SectionTitle>
                  {canClose && (
                    <>
                      <TxButton onClick={() => { void handleClose() }} isPending={closePending} isConfirming={closeConfirming}
                        label={streamType === 'payroll' ? 'End payroll early' : streamType === 'vesting' ? 'Cancel vesting' : 'Close project'}
                        variant="secondary" />
                      {closeHash && <TxReceipt hash={closeHash} isSuccess={closeSuccess} isError={false} error={null} label="Close" />}
                    </>
                  )}
                  {canRefund && remaining > 0n && (
                    <>
                      <TxButton onClick={() => { void handleRefund() }} isPending={refundPending} isConfirming={refundConfirming}
                        label={`Reclaim ${fmtUSDC(remaining)}`}
                        variant="secondary" />
                      {refundHash && <TxReceipt hash={refundHash} isSuccess={refundSuccess} isError={false} error={null} label="Reclaim" />}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ padding: '20px', background: 'var(--bg)' }}>
          <SectionTitle>Progress</SectionTitle>
          <Checklist items={checklist} />

          <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 20 }}>
            <SectionTitle>Stream ID</SectionTitle>
            <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-2)', wordBreak: 'break-all', margin: 0 }}>
              {String(dealId)}
              <CopyBtn text={String(dealId)} />
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
