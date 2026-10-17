import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSignTypedData, useSwitchChain } from 'wagmi'
import { erc20Abi, type Address } from 'viem'
import { METERED_ESCROW, USDC_ADDRESS, ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER } from '@/contract'
import { TxButton } from './TxButton'
import { TxReceipt } from './TxReceipt'
import { parseAmount, formatUnitsFixed } from '@/onchain-money'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Info, ExternalLink } from 'lucide-react'
import { type ServiceTemplate } from '@/services'

type Step = 'form' | 'seller-sign' | 'buyer-sign' | 'approve' | 'fund' | 'done'

const STEP_LABELS: Step[] = ['form', 'seller-sign', 'buyer-sign', 'approve', 'fund', 'done']
const STEP_NAMES = ['Terms', 'Seller sign', 'Buyer sign', 'Approve', 'Fund', 'Done']

interface NewDealProps {
  onCreated: (dealId: bigint) => void
  onCancel?: () => void
  template?: ServiceTemplate
}

function Field({
  label, value, onChange, placeholder, hint, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--muted)', letterSpacing: '0.07em' }}>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
        style={{ background: 'var(--surface-muted)', color: 'var(--ink)', border: '1px solid var(--border)' }}
      />
      {hint && <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>{hint}</p>}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{value}</span>
    </div>
  )
}

export function NewDeal({ onCreated, onCancel, template }: NewDealProps) {
  const { address, chainId } = useAccount()
  const wrongChain = chainId !== ARC_TESTNET_CHAIN_ID
  const { switchChainAsync } = useSwitchChain()

  const [form, setForm] = useState(() => ({
    dealId: String(Date.now()),
    seller: '',
    payee: '',
    unitPrice: template?.unitPrice ?? '0.01',
    maxUnits: template?.maxUnits ?? '100',
    prepaid: template?.typicalBudget ?? '1.00',
    termDays: template?.termDays ?? '30',
    graceDays: template?.graceDays ?? '3',
  }))

  const [step, setStep] = useState<Step>('form')
  const [sellerSig, setSellerSig] = useState('')
  const [buyerSig, setBuyerSig] = useState('')
  const [termsData, setTermsData] = useState<Record<string, unknown> | null>(null)

  const { signTypedDataAsync: signTerms } = useSignTypedData()

  const { writeContract: approveUsdc, data: approveHash, isPending: approvePending } = useWriteContract()
  const { isLoading: approveConfirming, isSuccess: approveSuccess, isError: approveError, error: approveErr } =
    useWaitForTransactionReceipt({ hash: approveHash, chainId: ARC_TESTNET_CHAIN_ID })

  const { writeContract: fundDeal, data: fundHash, isPending: fundPending, isError: fundError, error: fundErr } = useWriteContract()
  const { isLoading: fundConfirming, isSuccess: fundSuccess } = useWaitForTransactionReceipt({ hash: fundHash, chainId: ARC_TESTNET_CHAIN_ID })

  const prepaidMicro = (() => {
    try { return parseAmount(ARC_TESTNET_CHAIN_ID, form.prepaid).raw } catch { return 0n }
  })()
  const unitPriceMicro = (() => {
    try { return parseAmount(ARC_TESTNET_CHAIN_ID, form.unitPrice).raw } catch { return 0n }
  })()

  function set(key: keyof typeof form) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }))
  }

  function buildTerms() {
    const now = Math.floor(Date.now() / 1000)
    return {
      dealId: BigInt(form.dealId),
      buyer: address as Address,
      seller: form.seller as Address,
      payee: (form.payee || form.seller) as Address,
      unitPrice: unitPriceMicro,
      maxUnits: BigInt(form.maxUnits),
      prepaid: prepaidMicro,
      end: BigInt(now + parseInt(form.termDays) * 86400),
      grace: BigInt(parseInt(form.graceDays) * 86400),
      nonce: 0n,
      expiry: BigInt(now + 3600),
    }
  }

  const DOMAIN = { name: 'MeteredEscrow', version: '1', chainId: ARC_TESTNET_CHAIN_ID, verifyingContract: METERED_ESCROW.address }
  const TERMS_TYPES = {
    Terms: [
      { name: 'dealId', type: 'uint256' }, { name: 'buyer', type: 'address' },
      { name: 'seller', type: 'address' }, { name: 'payee', type: 'address' },
      { name: 'unitPrice', type: 'uint256' }, { name: 'maxUnits', type: 'uint256' },
      { name: 'prepaid', type: 'uint256' }, { name: 'end', type: 'uint64' },
      { name: 'grace', type: 'uint64' }, { name: 'nonce', type: 'uint256' },
      { name: 'expiry', type: 'uint64' },
    ],
  }

  async function handleSellerSign() {
    const t = buildTerms()
    setTermsData(t)
    try {
      const sig = await signTerms({ domain: DOMAIN, types: TERMS_TYPES, primaryType: 'Terms', message: t })
      setSellerSig(sig)
      setStep('buyer-sign')
    } catch (e: unknown) {
      if ((e as { code?: number }).code !== 4001) toast.error('Signature failed')
    }
  }

  async function handleBuyerSign() {
    const t = termsData
    if (!t) return
    try {
      const sig = await signTerms({
        domain: DOMAIN, types: TERMS_TYPES, primaryType: 'Terms',
        message: t,
      })
      setBuyerSig(sig)
      setStep('approve')
    } catch (e: unknown) {
      if ((e as { code?: number }).code !== 4001) toast.error('Signature failed')
    }
  }

  async function handleApprove() {
    if (chainId !== ARC_TESTNET_CHAIN_ID) {
      try { await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID }) } catch { return }
    }
    approveUsdc({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [METERED_ESCROW.address, prepaidMicro], chainId: ARC_TESTNET_CHAIN_ID })
  }

  async function handleFund() {
    const t = termsData
    if (!t || !sellerSig || !buyerSig) return
    if (chainId !== ARC_TESTNET_CHAIN_ID) {
      try { await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID }) } catch { return }
    }
    fundDeal({ address: METERED_ESCROW.address, abi: METERED_ESCROW.abi, functionName: 'createAndFundDeal', args: [t, buyerSig as `0x${string}`, sellerSig as `0x${string}`], chainId: ARC_TESTNET_CHAIN_ID })
  }

  if (approveSuccess && step === 'approve') setStep('fund')
  if (fundSuccess && step === 'fund' && termsData) {
    setStep('done')
    onCreated(termsData.dealId as bigint)
  }

  const stepIndex = STEP_LABELS.indexOf(step)
  const unitLabel = template?.unitLabel ?? 'unit'

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-0.5 flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-70"
            style={{ color: 'var(--muted)' }}
          >
            <ArrowLeft className="size-3.5" />
            Back
          </button>
        )}
        <div className="flex-1">
          <h2 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
            {template ? `Buy: ${template.name}` : 'New escrow deal'}
          </h2>
          {template && (
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{template.description}</p>
          )}
        </div>
      </div>

      {/* Step progress */}
      {step !== 'done' && (
        <div className="flex items-center gap-0">
          {STEP_LABELS.slice(0, -1).map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className="flex size-6 items-center justify-center rounded-full text-xs font-bold shrink-0"
                style={{
                  background: i < stepIndex ? 'var(--success)' : i === stepIndex ? 'var(--accent)' : 'var(--surface-muted)',
                  color: i <= stepIndex ? 'white' : 'var(--muted)',
                }}
              >
                {i < stepIndex ? <CheckCircle2 className="size-3.5" /> : i + 1}
              </div>
              <p className="ml-1.5 text-xs font-medium" style={{ color: i === stepIndex ? 'var(--ink)' : 'var(--muted)' }}>
                {STEP_NAMES[i]}
              </p>
              {i < STEP_LABELS.length - 2 && (
                <div className="mx-2 flex-1 h-px" style={{ background: i < stepIndex ? 'var(--success)' : 'var(--border)' }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Step: form ── */}
      {step === 'form' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Deal ID" value={form.dealId} onChange={set('dealId')} placeholder="Unique ID" hint="Auto-generated from timestamp" />
              <Field label={`Price per ${unitLabel} (USDC)`} value={form.unitPrice} onChange={set('unitPrice')} placeholder="0.01" type="number" />
            </div>
            <Field label="Seller address" value={form.seller} onChange={set('seller')} placeholder="0x..." hint="The agent or service provider receiving payment" />
            <Field label="Payee address (optional)" value={form.payee} onChange={set('payee')} placeholder="Defaults to seller" hint="Where USDC is sent on settlement" />
            <div className="grid grid-cols-3 gap-4">
              <Field label={`Max ${unitLabel}s`} value={form.maxUnits} onChange={set('maxUnits')} placeholder="100" type="number" />
              <Field label="Term (days)" value={form.termDays} onChange={set('termDays')} placeholder="30" type="number" />
              <Field label="Grace (days)" value={form.graceDays} onChange={set('graceDays')} placeholder="3" type="number" />
            </div>
            <Field label="Budget (USDC)" value={form.prepaid} onChange={set('prepaid')} placeholder="1.00" hint={`= ${form.maxUnits} ${unitLabel}s × $${form.unitPrice} each`} type="number" />

            <div className="flex items-start gap-2 rounded-lg px-4 py-3" style={{ background: 'var(--surface-muted)' }}>
              <Info className="mt-0.5 size-3.5 shrink-0" style={{ color: 'var(--muted)' }} />
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                In this demo you sign as both seller and buyer. In production, the seller signs first and shares their signature with you.
              </p>
            </div>
          </div>

          <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            <TxButton
              onClick={() => setStep('seller-sign')}
              disabled={wrongChain || !address || !form.seller}
              label="Continue to signing"
            />
          </div>
        </div>
      )}

      {/* ── Step: seller sign ── */}
      {step === 'seller-sign' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Seller signs the terms</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              The seller cryptographically commits to the deal terms before any funds are locked.
            </p>
            {/* Summary */}
            <div className="rounded-lg px-4 py-1" style={{ background: 'var(--surface-muted)' }}>
              <SummaryRow label="Service" value={template?.name ?? 'Custom'} />
              <SummaryRow label="Seller" value={`${form.seller.slice(0, 10)}…${form.seller.slice(-6)}`} />
              <SummaryRow label={`Price per ${unitLabel}`} value={`$${form.unitPrice} USDC`} />
              <SummaryRow label="Budget" value={`$${form.prepaid} USDC`} />
              <SummaryRow label="Term" value={`${form.termDays} days`} />
            </div>
            <TxButton onClick={() => { void handleSellerSign() }} label="Sign as seller" />
          </div>
        </div>
      )}

      {/* ── Step: buyer sign ── */}
      {step === 'buyer-sign' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Buyer confirms the terms</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              You're committing to these deal terms. Signing does not move funds — that happens in the next step.
            </p>
            <div className="rounded-lg px-4 py-1" style={{ background: 'var(--surface-muted)' }}>
              <SummaryRow label="Service" value={template?.name ?? 'Custom'} />
              <SummaryRow label={`Price per ${unitLabel}`} value={`$${form.unitPrice} USDC`} />
              <SummaryRow label="Budget locked" value={`$${form.prepaid} USDC`} />
              <SummaryRow label="Seller signed" value="Yes" />
            </div>
            <TxButton onClick={() => { void handleBuyerSign() }} label="Sign as buyer" />
          </div>
        </div>
      )}

      {/* ── Step: approve ── */}
      {step === 'approve' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Approve USDC spend</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Allow the escrow contract to pull{' '}
              <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                {formatUnitsFixed(prepaidMicro, 6, 2)} USDC
              </span>{' '}
              from your wallet.
            </p>
            <TxButton
              onClick={() => { void handleApprove() }}
              isPending={approvePending}
              isConfirming={approveConfirming}
              label="Approve USDC"
            />
            <TxReceipt hash={approveHash} isSuccess={approveSuccess} isError={approveError} error={approveErr} label="Approval" />
          </div>
        </div>
      )}

      {/* ── Step: fund ── */}
      {step === 'fund' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Fund the escrow</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Lock{' '}
              <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                {formatUnitsFixed(prepaidMicro, 6, 2)} USDC
              </span>{' '}
              into the contract. The seller can only receive funds you explicitly sign for.
            </p>
            <TxButton
              onClick={() => { void handleFund() }}
              isPending={fundPending}
              isConfirming={fundConfirming}
              label="Fund deal"
            />
            <TxReceipt hash={fundHash} isSuccess={fundSuccess} isError={fundError} error={fundErr} label="Deal funding" />
          </div>
        </div>
      )}

      {/* ── Step: done ── */}
      {step === 'done' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-white)', border: '1px solid var(--border)' }}>
          <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
            <div
              className="flex size-12 items-center justify-center rounded-full"
              style={{ background: 'var(--success-light)' }}
            >
              <CheckCircle2 className="size-6" style={{ color: 'var(--success)' }} />
            </div>
            <div>
              <p className="text-base font-bold" style={{ color: 'var(--ink)' }}>Deal funded</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                {template?.name ?? 'Escrow deal'} is active on Arc Testnet.
              </p>
            </div>
            <div className="text-xs mono tabular-nums" style={{ color: 'var(--muted)' }}>
              Deal ID: {form.dealId}
            </div>
            {fundHash && (
              <a
                href={`${ARC_TESTNET_EXPLORER}/tx/${fundHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium"
                style={{ color: 'var(--accent)' }}
              >
                View transaction <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
