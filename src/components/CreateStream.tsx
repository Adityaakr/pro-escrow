import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSignTypedData, useSwitchChain } from 'wagmi'
import { erc20Abi } from 'viem'
import { METERED_ESCROW, USDC_ADDRESS, ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER } from '@/contract'
import { TxButton } from './TxButton'
import { TxReceipt } from './TxReceipt'
import { STREAM_TYPES, encodeStreamId, getStreamType, parseUSDC, fmtUSDC, type StreamType } from '@/streams'
import { toast } from 'sonner'
import { ArrowLeft, Briefcase, TrendingUp, Flag, ExternalLink, ChevronRight, CheckCircle2 } from 'lucide-react'

function getUnixNow() { return Math.floor(Date.now() / 1000) }

const TYPE_ICON: Record<StreamType, React.ReactNode> = {
  payroll: <Briefcase size={18} />,
  vesting: <TrendingUp size={18} />,
  escrow:  <Flag size={18} />,
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

type WizStep = 'type' | 'form' | 'sign-recipient' | 'sign-funder' | 'approve' | 'fund' | 'done'

const STEP_LABELS: Partial<Record<WizStep, string>> = {
  'form': 'Details',
  'sign-recipient': 'Recipient signs',
  'sign-funder': 'Funder signs',
  'approve': 'Approve USDC',
  'fund': 'Fund stream',
  'done': 'Done',
}

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
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 6 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface-muted)', fontSize: 13, color: 'var(--ink)', boxSizing: 'border-box' }}
      />
      {hint && <p style={{ fontSize: 11, color: 'var(--subtle)', margin: '5px 0 0' }}>{hint}</p>}
    </div>
  )
}

const WIZ_STEPS: WizStep[] = ['type', 'form', 'sign-recipient', 'sign-funder', 'approve', 'fund', 'done']

function StepBar({ current, typeColor }: { current: WizStep; typeColor: string }) {
  const steps = WIZ_STEPS.slice(1)
  const idx = steps.indexOf(current)
  if (idx < 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {steps.map((s, i) => {
        const done = i < idx
        const active = i === idx
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: active ? 'auto' : 20, height: 20, minWidth: 20,
              borderRadius: active ? 10 : '50%',
              background: done ? 'var(--green)' : active ? typeColor : 'var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: active ? '0 8px' : 0,
              transition: 'all 0.2s',
            }}>
              {done
                ? <CheckCircle2 size={11} style={{ color: 'white' }} />
                : <span style={{ fontSize: 10, fontWeight: 700, color: active ? 'white' : 'var(--muted)' }}>
                    {active ? STEP_LABELS[s] : i + 1}
                  </span>
              }
            </div>
            {i < steps.length - 1 && <div style={{ width: 16, height: 1, background: done ? 'var(--green)' : 'var(--border)' }} />}
          </div>
        )
      })}
    </div>
  )
}

function WizCard({ children, typeColor, step, onBack }: { children: React.ReactNode; typeColor: string; step: WizStep; onBack?: () => void }) {
  return (
    <div style={{ maxWidth: 560, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        {onBack
          ? <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}>
              <ArrowLeft size={14} /> Back
            </button>
          : <div />
        }
        <StepBar current={step} typeColor={typeColor} />
      </div>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px' }}>
        {children}
      </div>
    </div>
  )
}

export function CreateStream({ initialType, onCreated, onBack }: CreateStreamProps) {
  const { address, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const wrongChain = chainId !== ARC_TESTNET_CHAIN_ID

  const [streamType, setStreamType] = useState<StreamType | null>(initialType)
  const [step, setStep] = useState<WizStep>(initialType ? 'form' : 'type')
  const [recipientSig, setRecipientSig] = useState('')
  const [funderSig, setFunderSig]       = useState('')
  const [termsData, setTermsData]       = useState<Record<string, unknown> | null>(null)

  const meta = streamType ? getStreamType(streamType) : null
  const d    = meta?.defaults

  const [form, setForm] = useState(() => {
    const defaults = d ?? getStreamType('escrow').defaults
    return {
      title: defaults.title, recipient: '', payee: '',
      unitPrice: defaults.unitPrice, maxUnits: defaults.maxUnits,
      prepaid: defaults.prepaid, termDays: defaults.termDays, graceDays: defaults.graceDays,
    }
  })

  const { signTypedDataAsync } = useSignTypedData()
  const { writeContract: approveUsdc, data: approveHash, isPending: approvePending } = useWriteContract()
  const { isLoading: approveConfirming, isSuccess: approveSuccess, isError: approveError, error: approveErr } =
    useWaitForTransactionReceipt({ hash: approveHash, chainId: ARC_TESTNET_CHAIN_ID })
  const { writeContract: fundDeal, data: fundHash, isPending: fundPending, isError: fundError, error: fundErr } = useWriteContract()
  const { isLoading: fundConfirming, isSuccess: fundSuccess } = useWaitForTransactionReceipt({ hash: fundHash, chainId: ARC_TESTNET_CHAIN_ID })

  const prepaidMicro  = parseUSDC(form.prepaid)
  const unitPriceMicro = parseUSDC(form.unitPrice)
  const [dealId] = useState(() => streamType ? encodeStreamId(streamType) : encodeStreamId('escrow'))

  const termsTypes = {
    Terms: [
      { name: 'dealId', type: 'uint256' }, { name: 'buyer', type: 'address' },
      { name: 'seller', type: 'address' }, { name: 'payee', type: 'address' },
      { name: 'unitPrice', type: 'uint256' }, { name: 'maxUnits', type: 'uint256' },
      { name: 'prepaid', type: 'uint256' }, { name: 'end', type: 'uint64' },
      { name: 'grace', type: 'uint64' }, { name: 'nonce', type: 'uint256' },
      { name: 'expiry', type: 'uint64' },
    ],
  }
  const domain = { name: 'MeteredEscrow', version: '1', chainId: ARC_TESTNET_CHAIN_ID, verifyingContract: METERED_ESCROW.address }

  async function handleRecipientSign() {
    const now = getUnixNow()
    const t: Record<string, unknown> = {
      dealId, buyer: address, seller: form.recipient,
      payee: form.payee || form.recipient, unitPrice: unitPriceMicro,
      maxUnits: BigInt(form.maxUnits), prepaid: prepaidMicro,
      end: BigInt(now + parseInt(form.termDays) * 86400),
      grace: BigInt(parseInt(form.graceDays) * 86400),
      nonce: 0n, expiry: BigInt(now + 3600),
    }
    setTermsData(t)
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
    // Pass Terms as a strict tuple matching the contract struct field order
    const termsArg = {
      dealId:    t.dealId    as bigint,
      buyer:     t.buyer     as `0x${string}`,
      seller:    t.seller    as `0x${string}`,
      payee:     t.payee     as `0x${string}`,
      unitPrice: t.unitPrice as bigint,
      maxUnits:  t.maxUnits  as bigint,
      prepaid:   t.prepaid   as bigint,
      end:       t.end       as bigint,
      grace:     t.grace     as bigint,
      nonce:     t.nonce     as bigint,
      expiry:    t.expiry    as bigint,
    }
    fundDeal({
      address: METERED_ESCROW.address,
      abi: METERED_ESCROW.abi,
      functionName: 'createAndFundDeal',
      // buyerSig = funder's signature, sellerSig = recipient's signature
      args: [termsArg, funderSig as `0x${string}`, recipientSig as `0x${string}`],
      chainId: ARC_TESTNET_CHAIN_ID,
    })
  }

  // Compute effective wizard step: override 'approve'->'fund' once approval confirmed,
  // and 'fund'->'done' once funding confirmed. This avoids setState-in-render and setState-in-effect.
  const effectiveStep: WizStep = (() => {
    if (step === 'approve' && approveSuccess) return 'fund'
    if (step === 'fund' && fundSuccess) return 'done'
    return step
  })()

  const typeColor = streamType ? TYPE_COLOR[streamType] : 'var(--accent)'

  // TYPE PICKER
  if (effectiveStep === 'type') {
    return (
      <div style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h2 style={{ fontFamily: 'Gloock, Georgia, serif', fontSize: 20, color: 'var(--ink)', margin: 0, fontWeight: 400 }}>Choose a stream type</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STREAM_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => { setStreamType(t.id); setStep('form') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 18px',
                background: 'var(--bg-white)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                textAlign: 'left', cursor: 'pointer',
                transition: 'border-color 0.12s, box-shadow 0.12s',
              }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'var(--border-strong)'; el.style.boxShadow = 'var(--shadow-sm)' }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--border)'; el.style.boxShadow = 'none' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: TYPE_BG[t.id], color: TYPE_COLOR[t.id], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {TYPE_ICON[t.id]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.description}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: 'var(--subtle)', fontFamily: 'JetBrains Mono, monospace' }}>
                  <span>{t.defaults.maxUnits} {t.unitLabel}s</span>
                  <span>${t.defaults.unitPrice}/{t.periodLabel}</span>
                  <span>{t.defaults.termDays}d term</span>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--subtle)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (!meta || !streamType) return null

  // FORM
  if (effectiveStep === 'form') {
    return (
      <WizCard typeColor={typeColor} step={effectiveStep} onBack={() => setStep('type')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: TYPE_BG[streamType], color: typeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {TYPE_ICON[streamType]}
          </div>
          <h2 style={{ fontFamily: 'Gloock, Georgia, serif', fontSize: 18, color: 'var(--ink)', margin: 0, fontWeight: 400 }}>New {meta.label} stream</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Stream title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder={meta.defaults.title} hint="For your reference only, not stored on-chain" />
          <Field label={meta.defaults.recipientLabel} value={form.recipient} onChange={v => setForm(f => ({ ...f, recipient: v }))} placeholder="0x..." />
          <Field label="Payee address (optional)" value={form.payee} onChange={v => setForm(f => ({ ...f, payee: v }))} placeholder="Defaults to recipient" hint="Useful for multi-sig payees" />

          <div className="grid sm:grid-cols-2" style={{ gap: 12 }}>
            <Field
              label={streamType === 'payroll' ? 'Monthly salary (USDC)' : streamType === 'vesting' ? 'Per tranche (USDC)' : 'Per milestone (USDC)'}
              value={form.unitPrice} onChange={v => setForm(f => ({ ...f, unitPrice: v }))} type="number"
            />
            <Field
              label={streamType === 'payroll' ? 'Pay periods' : streamType === 'vesting' ? 'Tranches' : 'Milestones'}
              value={form.maxUnits} onChange={v => setForm(f => ({ ...f, maxUnits: v }))} type="number"
            />
          </div>

          <Field
            label="Total to lock (USDC)"
            value={form.prepaid} onChange={v => setForm(f => ({ ...f, prepaid: v }))} type="number"
            hint={`${form.maxUnits} x $${form.unitPrice} = ${fmtUSDC(parseUSDC(form.unitPrice) * BigInt(parseInt(form.maxUnits) || 0))}`}
          />

          <div className="grid sm:grid-cols-2" style={{ gap: 12 }}>
            <Field label="Term length (days)" value={form.termDays} onChange={v => setForm(f => ({ ...f, termDays: v }))} type="number" />
            <Field label="Grace period (days)" value={form.graceDays} onChange={v => setForm(f => ({ ...f, graceDays: v }))} type="number" hint="Days after term before reclaim" />
          </div>

          {/* Summary */}
          <div style={{ background: 'var(--surface-muted)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--subtle)', margin: '0 0 10px' }}>Summary</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                [meta.defaults.payerLabel.split(' ')[0], address ? address.slice(0, 10) + '...' : 'Not connected'],
                [meta.defaults.recipientLabel.split(' ')[0], form.recipient ? form.recipient.slice(0, 10) + '...' : 'Not set'],
                ['Total locked', fmtUSDC(prepaidMicro)],
                [streamType === 'payroll' ? 'Per month' : streamType === 'vesting' ? 'Per tranche' : 'Per milestone', fmtUSDC(unitPriceMicro)],
                [streamType === 'payroll' ? 'Pay periods' : streamType === 'vesting' ? 'Tranches' : 'Milestones', form.maxUnits],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{k}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <TxButton
            onClick={() => setStep('sign-recipient')}
            disabled={wrongChain || !address || !form.recipient || prepaidMicro === 0n}
            label="Continue"
          />
          {wrongChain && <p style={{ fontSize: 12, textAlign: 'center', color: 'var(--red)' }}>Switch to Arc Testnet to continue</p>}
        </div>
      </WizCard>
    )
  }

  // SIGN RECIPIENT
  if (effectiveStep === 'sign-recipient') {
    return (
      <WizCard typeColor={typeColor} step={effectiveStep} onBack={() => setStep('form')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: typeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>1</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{meta.defaults.recipientLabel} signs the terms</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '3px 0 0' }}>EIP-712 typed signature commits to the stream terms</p>
          </div>
        </div>
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-muted)', fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          In production, the recipient signs first and sends their signature to the funder. You can sign as both parties here for testing.
        </div>
        <TxButton onClick={() => { void handleRecipientSign() }} label={`Sign as ${meta.defaults.recipientLabel.split(' ')[0]}`} />
      </WizCard>
    )
  }

  // SIGN FUNDER
  if (effectiveStep === 'sign-funder') {
    return (
      <WizCard typeColor={typeColor} step={effectiveStep} onBack={() => setStep('sign-recipient')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: typeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>2</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{meta.defaults.payerLabel} signs the terms</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '3px 0 0' }}>Confirms you agree to the stream terms before funding</p>
          </div>
        </div>
        <TxButton onClick={() => { void handleFunderSign() }} label={`Sign as ${meta.defaults.payerLabel.split(' ')[0]}`} />
      </WizCard>
    )
  }

  // APPROVE
  if (effectiveStep === 'approve') {
    return (
      <WizCard typeColor={typeColor} step={effectiveStep}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: typeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>3</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Approve USDC spend</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '3px 0 0' }}>Allow the contract to pull {fmtUSDC(prepaidMicro)} from your wallet</p>
          </div>
        </div>
        <TxButton onClick={() => { void handleApprove() }} isPending={approvePending} isConfirming={approveConfirming} label="Approve USDC" />
        <TxReceipt hash={approveHash} isSuccess={approveSuccess} isError={approveError} error={approveErr} label="Approval" />
      </WizCard>
    )
  }

  // FUND
  if (effectiveStep === 'fund') {
    return (
      <WizCard typeColor={typeColor} step={effectiveStep}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: typeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>4</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Fund the stream</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '3px 0 0' }}>Lock {fmtUSDC(prepaidMicro)} USDC on-chain. Gas is paid in USDC on Arc.</p>
          </div>
        </div>
        <div style={{ background: 'rgba(232,195,130,0.10)', border: '1px solid rgba(232,195,130,0.25)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--accent)' }}>
          MetaMask may show "Network fee: Unavailable" on Arc because gas is USDC. This is normal — tap "Review alert" then confirm to proceed.
        </div>
        <TxButton onClick={() => { void handleFund() }} isPending={fundPending} isConfirming={fundConfirming} label="Fund stream" />
        <TxReceipt hash={fundHash} isSuccess={fundSuccess} isError={fundError} error={fundErr} label="Stream funding" />
      </WizCard>
    )
  }

  // DONE — persist to sessionStorage and notify parent once
  if (effectiveStep === 'done' && termsData && fundHash) {
    if (address && streamType) {
      const localKey = `flowpay:streams:${address.toLowerCase()}`
      try {
        const existing = JSON.parse(sessionStorage.getItem(localKey) ?? '[]') as unknown as Array<{dealId: string; type: string; deposit: string}>
        const newEntry = { dealId: String(termsData.dealId), type: streamType, deposit: String(prepaidMicro) }
        if (!existing.find(e => e.dealId === newEntry.dealId)) {
          existing.unshift(newEntry)
          sessionStorage.setItem(localKey, JSON.stringify(existing))
        }
      } catch { /* ignore */ }
    }
  }
  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} style={{ color: 'var(--green)' }} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)', margin: 0 }}>{meta.label} stream created</p>
            <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted)', margin: '3px 0 0' }}>ID: {String(dealId).slice(-12)}</p>
          </div>
        </div>

        <div style={{ background: 'var(--surface-muted)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 16 }}>
          {[
            ['Locked', fmtUSDC(prepaidMicro)],
            [streamType === 'payroll' ? 'Pay periods' : streamType === 'vesting' ? 'Tranches' : 'Milestones', form.maxUnits],
            [streamType === 'payroll' ? 'Per month' : 'Per unit', fmtUSDC(unitPriceMicro)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>{k}</span>
              <span style={{ fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
            </div>
          ))}
        </div>

        {fundHash && (
          <a href={`${ARC_TESTNET_EXPLORER}/tx/${fundHash}`} target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: 'var(--blue)', marginBottom: 12 }}>
            View on explorer <ExternalLink size={12} />
          </a>
        )}
        <div>
          <button
            onClick={() => termsData && onCreated(termsData.dealId as bigint)}
            style={{ width: '100%', padding: '10px 16px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(to bottom, #f0d09a, #e8c382)', color: '#351e10', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', border: 'none', marginTop: 4, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 14px rgba(232,195,130,0.2)' }}
          >
            View stream
          </button>
        </div>
      </div>
    </div>
  )
}
