import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSignTypedData, useSwitchChain } from 'wagmi'
import { erc20Abi, type Address } from 'viem'
import { METERED_ESCROW, USDC_ADDRESS, ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER } from '@/contract'
import { TxButton } from './TxButton'
import { TxReceipt } from './TxReceipt'
import { STREAM_TYPES, encodeStreamId, getStreamType, parseUSDC, fmtUSDC, type StreamType } from '@/streams'
import { toast } from 'sonner'
import { ArrowLeft, Briefcase, TrendingUp, CheckSquare, ExternalLink, ChevronRight } from 'lucide-react'

const TYPE_ICON: Record<StreamType, React.ReactNode> = {
  payroll: <Briefcase className="size-5" />,
  vesting: <TrendingUp className="size-5" />,
  escrow:  <CheckSquare className="size-5" />,
}
const TYPE_COLOR: Record<StreamType, string> = {
  payroll: 'var(--blue)',
  vesting: 'var(--purple)',
  escrow:  'var(--amber)',
}

type WizStep = 'type' | 'form' | 'sign-recipient' | 'sign-funder' | 'approve' | 'fund' | 'done'

interface CreateStreamProps {
  initialType: StreamType | null
  onCreated: (dealId: bigint) => void
  onBack: () => void
}

function Field({ label, value, onChange, placeholder, type = 'text', hint }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)', letterSpacing: '0.07em' }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="w-full rounded-lg px-3 py-2.5 text-sm font-medium"
        style={{ background: 'var(--surface-muted)', color: 'var(--ink)', border: '1px solid var(--border)' }}
      />
      {hint && <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>{hint}</p>}
    </div>
  )
}

function StepIndicator({ current, steps }: { current: WizStep; steps: WizStep[] }) {
  const idx = steps.indexOf(current)
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className="size-2 rounded-full"
            style={{ background: i < idx ? 'var(--green)' : i === idx ? 'var(--blue)' : 'var(--border-strong)' }}
          />
          {i < steps.length - 1 && <div className="w-4 h-px" style={{ background: 'var(--border)' }} />}
        </div>
      ))}
    </div>
  )
}

const WIZ_STEPS: WizStep[] = ['type', 'form', 'sign-recipient', 'sign-funder', 'approve', 'fund', 'done']

export function CreateStream({ initialType, onCreated, onBack }: CreateStreamProps) {
  const { address, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const wrongChain = chainId !== ARC_TESTNET_CHAIN_ID

  const [streamType, setStreamType] = useState<StreamType | null>(initialType)
  const [step, setStep] = useState<WizStep>(initialType ? 'form' : 'type')
  const [recipientSig, setRecipientSig] = useState('')
  const [funderSig, setFunderSig] = useState('')
  const [termsData, setTermsData] = useState<Record<string, unknown> | null>(null)

  // When initialType changes (user clicks type in sidebar), reset
  useEffect(() => {
    if (initialType) {
      setStreamType(initialType)
      setStep('form')
    }
  }, [initialType])

  const meta = streamType ? getStreamType(streamType) : null
  const d = meta?.defaults

  const [form, setForm] = useState(() => ({
    title: '',
    recipient: '',
    payee: '',
    unitPrice: d?.unitPrice ?? '1000.00',
    maxUnits: d?.maxUnits ?? '12',
    prepaid: d?.prepaid ?? '12000.00',
    termDays: d?.termDays ?? '365',
    graceDays: d?.graceDays ?? '30',
  }))

  // Sync defaults when type changes
  useEffect(() => {
    if (!meta) return
    setForm(f => ({
      ...f,
      unitPrice: meta.defaults.unitPrice,
      maxUnits:  meta.defaults.maxUnits,
      prepaid:   meta.defaults.prepaid,
      termDays:  meta.defaults.termDays,
      graceDays: meta.defaults.graceDays,
      title:     meta.defaults.title,
    }))
  }, [streamType]) // eslint-disable-line react-hooks/exhaustive-deps

  const { signTypedDataAsync } = useSignTypedData()

  const { writeContract: approveUsdc, data: approveHash, isPending: approvePending } = useWriteContract()
  const { isLoading: approveConfirming, isSuccess: approveSuccess, isError: approveError, error: approveErr } =
    useWaitForTransactionReceipt({ hash: approveHash, chainId: ARC_TESTNET_CHAIN_ID })

  const { writeContract: fundDeal, data: fundHash, isPending: fundPending, isError: fundError, error: fundErr } = useWriteContract()
  const { isLoading: fundConfirming, isSuccess: fundSuccess } = useWaitForTransactionReceipt({ hash: fundHash, chainId: ARC_TESTNET_CHAIN_ID })

  const prepaidMicro = parseUSDC(form.prepaid)
  const unitPriceMicro = parseUSDC(form.unitPrice)

  // Compute the deal ID once when we enter form step
  const [dealId] = useState(() => streamType ? encodeStreamId(streamType) : encodeStreamId('escrow'))

  function buildTerms() {
    const now = Math.floor(Date.now() / 1000)
    return {
      dealId,
      buyer:     address as Address,
      seller:    form.recipient as Address,
      payee:     (form.payee || form.recipient) as Address,
      unitPrice: unitPriceMicro,
      maxUnits:  BigInt(form.maxUnits),
      prepaid:   prepaidMicro,
      end:       BigInt(now + parseInt(form.termDays) * 86400),
      grace:     BigInt(parseInt(form.graceDays) * 86400),
      nonce:     0n,
      expiry:    BigInt(now + 3600),
    }
  }

  const termsTypes = {
    Terms: [
      { name: 'dealId',    type: 'uint256' }, { name: 'buyer',    type: 'address' },
      { name: 'seller',    type: 'address' }, { name: 'payee',    type: 'address' },
      { name: 'unitPrice', type: 'uint256' }, { name: 'maxUnits', type: 'uint256' },
      { name: 'prepaid',   type: 'uint256' }, { name: 'end',      type: 'uint64'  },
      { name: 'grace',     type: 'uint64'  }, { name: 'nonce',    type: 'uint256' },
      { name: 'expiry',    type: 'uint64'  },
    ],
  }
  const domain = { name: 'MeteredEscrow', version: '1', chainId: ARC_TESTNET_CHAIN_ID, verifyingContract: METERED_ESCROW.address }

  async function handleRecipientSign() {
    const t = buildTerms(); setTermsData(t)
    try {
      const sig = await signTypedDataAsync({ domain, types: termsTypes, primaryType: 'Terms', message: { ...t } })
      setRecipientSig(sig); setStep('sign-funder')
    } catch (e: unknown) { if ((e as { code?: number }).code !== 4001) toast.error('Signature failed') }
  }

  async function handleFunderSign() {
    if (!termsData) return
    try {
      const sig = await signTypedDataAsync({ domain, types: termsTypes, primaryType: 'Terms', message: termsData })
      setFunderSig(sig); setStep('approve')
    } catch (e: unknown) { if ((e as { code?: number }).code !== 4001) toast.error('Signature failed') }
  }

  async function handleApprove() {
    if (chainId !== ARC_TESTNET_CHAIN_ID) { try { await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID }) } catch { return } }
    approveUsdc({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [METERED_ESCROW.address, prepaidMicro], chainId: ARC_TESTNET_CHAIN_ID })
  }

  async function handleFund() {
    const t = termsData
    if (!t || !recipientSig || !funderSig) return
    if (chainId !== ARC_TESTNET_CHAIN_ID) { try { await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID }) } catch { return } }
    fundDeal({ address: METERED_ESCROW.address, abi: METERED_ESCROW.abi, functionName: 'createAndFundDeal', args: [t, funderSig as `0x${string}`, recipientSig as `0x${string}`], chainId: ARC_TESTNET_CHAIN_ID })
  }

  if (approveSuccess && step === 'approve') setStep('fund')
  if (fundSuccess && step === 'fund' && termsData) {
    setStep('done')
    onCreated(termsData.dealId as bigint)
  }

  const typeColor = streamType ? TYPE_COLOR[streamType] : 'var(--accent)'

  // ── Type picker ───────────────────────────────────────────────────────────────
  if (step === 'type') {
    return (
      <div className="max-w-xl space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="flex items-center gap-1 text-sm" style={{ color: 'var(--muted)' }}>
            <ArrowLeft className="size-4" /> Back
          </button>
          <h2 className="display text-xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>What kind of stream?</h2>
        </div>
        <div className="space-y-3">
          {STREAM_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => { setStreamType(t.id); setStep('form') }}
              className="group w-full flex items-start gap-4 rounded-xl p-5 text-left transition-all hover:shadow-sm"
              style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}
            >
              <div className="flex size-10 items-center justify-center rounded-xl shrink-0" style={{ background: TYPE_COLOR[t.id] + '14', color: TYPE_COLOR[t.id] }}>
                {TYPE_ICON[t.id]}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{t.label}</p>
                  <ChevronRight className="size-4 opacity-30 group-hover:opacity-70 transition-opacity" style={{ color: 'var(--muted)' }} />
                </div>
                <p className="text-xs font-medium mt-0.5" style={{ color: TYPE_COLOR[t.id] }}>{t.tagline}</p>
                <p className="text-xs mt-1.5" style={{ color: 'var(--muted)', lineHeight: '1.5' }}>{t.description}</p>
                <div className="mt-2 flex gap-3 text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
                  <span>Default: {t.defaults.maxUnits} {t.unitLabel}s</span>
                  <span>·</span>
                  <span>${t.defaults.unitPrice}/{t.periodLabel}</span>
                  <span>·</span>
                  <span>{t.defaults.termDays}d term</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (!meta || !streamType) return null

  // ── Form ──────────────────────────────────────────────────────────────────────
  if (step === 'form') {
    return (
      <div className="max-w-2xl space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('type')} className="flex items-center gap-1 text-sm" style={{ color: 'var(--muted)' }}>
            <ArrowLeft className="size-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg" style={{ background: typeColor + '14', color: typeColor }}>
              {TYPE_ICON[streamType]}
            </div>
            <h2 className="display text-xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
              New {meta.label} stream
            </h2>
          </div>
          <div className="ml-auto"><StepIndicator current={step} steps={WIZ_STEPS.slice(1)} /></div>
        </div>

        <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
          <Field label="Stream title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder={meta.defaults.title} hint="For your reference only — not stored on-chain" />
          <Field label={meta.defaults.recipientLabel} value={form.recipient} onChange={v => setForm(f => ({ ...f, recipient: v }))} placeholder="0x…" hint={`The ${meta.unitLabel} recipient's wallet address`} />
          <Field label="Payee address (optional)" value={form.payee} onChange={v => setForm(f => ({ ...f, payee: v }))} placeholder="Defaults to recipient" hint="Where USDC is sent — useful for multi-sig" />

          <div className="grid grid-cols-2 gap-4">
            <Field
              label={streamType === 'payroll' ? 'Monthly salary (USDC)' : streamType === 'vesting' ? 'Per-tranche amount (USDC)' : 'Per-milestone amount (USDC)'}
              value={form.unitPrice}
              onChange={v => setForm(f => ({ ...f, unitPrice: v }))}
              placeholder={meta.defaults.unitPrice}
              type="number"
            />
            <Field
              label={streamType === 'payroll' ? 'Number of pay periods' : streamType === 'vesting' ? 'Number of tranches' : 'Number of milestones'}
              value={form.maxUnits}
              onChange={v => setForm(f => ({ ...f, maxUnits: v }))}
              placeholder={meta.defaults.maxUnits}
              type="number"
            />
          </div>

          <Field
            label="Total locked (USDC)"
            value={form.prepaid}
            onChange={v => setForm(f => ({ ...f, prepaid: v }))}
            placeholder={meta.defaults.prepaid}
            type="number"
            hint={`= ${form.maxUnits} × $${form.unitPrice} = ${fmtUSDC(parseUSDC(form.unitPrice) * BigInt(parseInt(form.maxUnits) || 0))}`}
          />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Term length (days)" value={form.termDays} onChange={v => setForm(f => ({ ...f, termDays: v }))} type="number" />
            <Field label="Grace period (days)" value={form.graceDays} onChange={v => setForm(f => ({ ...f, graceDays: v }))} type="number" hint="Days after term before refund is available" />
          </div>

          {/* Summary */}
          <div className="rounded-lg p-4 space-y-1.5" style={{ background: 'var(--surface-muted)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--subtle)', letterSpacing: '0.08em' }}>STREAM SUMMARY</p>
            {[
              ['Type', meta.label],
              [meta.defaults.payerLabel, address ? address.slice(0, 10) + '…' : '—'],
              [meta.defaults.recipientLabel, form.recipient ? form.recipient.slice(0, 10) + '…' : '(not set)'],
              ['Total locked', fmtUSDC(prepaidMicro)],
              [streamType === 'payroll' ? 'Monthly salary' : streamType === 'vesting' ? 'Per tranche' : 'Per milestone', fmtUSDC(unitPriceMicro)],
              [streamType === 'payroll' ? 'Pay periods' : streamType === 'vesting' ? 'Tranches' : 'Milestones', form.maxUnits],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--muted)' }}>{k}</span>
                <span className="font-medium" style={{ color: 'var(--ink)' }}>{v}</span>
              </div>
            ))}
          </div>

          <TxButton
            onClick={() => setStep('sign-recipient')}
            disabled={wrongChain || !address || !form.recipient || prepaidMicro === 0n}
            label={`Continue — sign as ${meta.defaults.recipientLabel.split(' ')[0].toLowerCase()}`}
          />
          {wrongChain && <p className="text-xs text-center" style={{ color: 'var(--red)' }}>Switch to Arc Testnet to continue</p>}
        </div>
      </div>
    )
  }

  // ── Sign recipient ────────────────────────────────────────────────────────────
  if (step === 'sign-recipient') {
    return (
      <div className="max-w-lg space-y-4">
        <button onClick={() => setStep('form')} className="flex items-center gap-1 text-sm" style={{ color: 'var(--muted)' }}>
          <ArrowLeft className="size-4" /> Back
        </button>
        <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: typeColor }}>1</div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{meta.defaults.recipientLabel} signs</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Commits to the stream terms on-chain via EIP-712</p>
            </div>
          </div>
          <div className="rounded-lg p-3 text-xs" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
            In production, the {meta.defaults.recipientLabel.toLowerCase()} signs first and sends their signature to the {meta.defaults.payerLabel.toLowerCase()}. Here you can sign as both parties for testing.
          </div>
          <TxButton onClick={() => { void handleRecipientSign() }} label={`Sign as ${meta.defaults.recipientLabel.split(' ')[0]}`} />
        </div>
      </div>
    )
  }

  // ── Sign funder ───────────────────────────────────────────────────────────────
  if (step === 'sign-funder') {
    return (
      <div className="max-w-lg space-y-4">
        <button onClick={() => setStep('sign-recipient')} className="flex items-center gap-1 text-sm" style={{ color: 'var(--muted)' }}>
          <ArrowLeft className="size-4" /> Back
        </button>
        <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: typeColor }}>2</div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{meta.defaults.payerLabel} signs</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Confirms you agree to the stream terms</p>
            </div>
          </div>
          <TxButton onClick={() => { void handleFunderSign() }} label={`Sign as ${meta.defaults.payerLabel.split(' ')[0]}`} />
        </div>
      </div>
    )
  }

  // ── Approve ───────────────────────────────────────────────────────────────────
  if (step === 'approve') {
    return (
      <div className="max-w-lg space-y-4">
        <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: typeColor }}>3</div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Approve USDC</p>
              <p className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                Allow the contract to pull {fmtUSDC(prepaidMicro)} from your wallet
              </p>
            </div>
          </div>
          <TxButton onClick={() => { void handleApprove() }} isPending={approvePending} isConfirming={approveConfirming} label="Approve USDC" />
          <TxReceipt hash={approveHash} isSuccess={approveSuccess} isError={approveError} error={approveErr} label="Approval" />
        </div>
      </div>
    )
  }

  // ── Fund ──────────────────────────────────────────────────────────────────────
  if (step === 'fund') {
    return (
      <div className="max-w-lg space-y-4">
        <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: typeColor }}>4</div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Fund the stream</p>
              <p className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                Lock {fmtUSDC(prepaidMicro)} USDC on-chain
              </p>
            </div>
          </div>
          <TxButton onClick={() => { void handleFund() }} isPending={fundPending} isConfirming={fundConfirming} label="Fund stream" />
          <TxReceipt hash={fundHash} isSuccess={fundSuccess} isError={fundError} error={fundErr} label="Stream funding" />
        </div>
      </div>
    )
  }

  // ── Done ──────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg">
      <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full" style={{ background: 'var(--green-light)' }}>
            <CheckSquare className="size-5" style={{ color: 'var(--green)' }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--green)' }}>{meta.label} stream created</p>
            <p className="text-xs mono tabular-nums" style={{ color: 'var(--muted)' }}>Stream ID: {String(dealId).slice(-10)}</p>
          </div>
        </div>
        <div className="rounded-lg p-3 space-y-1.5" style={{ background: 'var(--surface-muted)' }}>
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--muted)' }}>Locked</span>
            <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{fmtUSDC(prepaidMicro)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--muted)' }}>{streamType === 'payroll' ? 'Pay periods' : streamType === 'vesting' ? 'Tranches' : 'Milestones'}</span>
            <span className="font-semibold" style={{ color: 'var(--ink)' }}>{form.maxUnits}</span>
          </div>
        </div>
        {fundHash && (
          <a href={`${ARC_TESTNET_EXPLORER}/tx/${fundHash}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--blue)' }}>
            View funding transaction <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </div>
  )
}
