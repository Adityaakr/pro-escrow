import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSignTypedData, useSwitchChain } from 'wagmi'
import { erc20Abi, type Address } from 'viem'
import { METERED_ESCROW, USDC_ADDRESS, ARC_TESTNET_CHAIN_ID, ARC_TESTNET_EXPLORER } from '@/contract'
import { TxButton } from './TxButton'
import { TxReceipt } from './TxReceipt'
import { parseAmount, formatUnitsFixed } from '@/onchain-money'
import { toast } from 'sonner'
import { Info, ExternalLink } from 'lucide-react'

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

type Step = 'form' | 'seller-sign' | 'buyer-sign' | 'approve' | 'fund' | 'done'

export function NewDeal({ onCreated }: { onCreated: (dealId: bigint) => void }) {
  const { address, chainId } = useAccount()
  const wrongChain = chainId !== ARC_TESTNET_CHAIN_ID
  const { switchChainAsync } = useSwitchChain()

  const [form, setForm] = useState(() => ({
    dealId: String(Date.now()),
    seller: '',
    payee: '',
    unitPrice: '0.01',
    maxUnits: '100',
    prepaid: '1.00',
    termDays: '30',
    graceDays: '3',
  }))

  const [step, setStep] = useState<Step>('form')
  const [sellerSig, setSellerSig] = useState<string>('')
  const [buyerSig, setBuyerSig] = useState<string>('')
  const [termsData, setTermsData] = useState<Record<string, unknown> | null>(null)

  const { signTypedDataAsync: signTerms } = useSignTypedData()

  // Approve USDC
  const { writeContract: approveUsdc, data: approveHash, isPending: approvePending } = useWriteContract()
  const { isLoading: approveConfirming, isSuccess: approveSuccess, isError: approveError, error: approveErr } =
    useWaitForTransactionReceipt({ hash: approveHash, chainId: ARC_TESTNET_CHAIN_ID })

  // Fund deal
  const { writeContract: fundDeal, data: fundHash, isPending: fundPending, isError: fundError, error: fundErr } = useWriteContract()
  const { isLoading: fundConfirming, isSuccess: fundSuccess } = useWaitForTransactionReceipt({ hash: fundHash, chainId: ARC_TESTNET_CHAIN_ID })

  const prepaidMicro = (() => {
    try { return parseAmount(ARC_TESTNET_CHAIN_ID, form.prepaid).raw }
    catch { return 0n }
  })()
  const unitPriceMicro = (() => {
    try { return parseAmount(ARC_TESTNET_CHAIN_ID, form.unitPrice).raw }
    catch { return 0n }
  })()

  function buildTerms() {
    const now = Math.floor(Date.now() / 1000)
    const end = BigInt(now + parseInt(form.termDays) * 86400)
    const grace = BigInt(parseInt(form.graceDays) * 86400)
    const expiry = BigInt(now + 3600)
    return {
      dealId: BigInt(form.dealId),
      buyer: address as Address,
      seller: form.seller as Address,
      payee: (form.payee || form.seller) as Address,
      unitPrice: unitPriceMicro,
      maxUnits: BigInt(form.maxUnits),
      prepaid: prepaidMicro,
      end,
      grace,
      nonce: 0n,
      expiry,
    }
  }

  async function handleSellerSign() {
    const t = buildTerms()
    setTermsData(t)
    try {
      const sig = await signTerms({
        domain: {
          name: 'MeteredEscrow',
          version: '1',
          chainId: ARC_TESTNET_CHAIN_ID,
          verifyingContract: METERED_ESCROW.address,
        },
        types: {
          Terms: [
            { name: 'dealId', type: 'uint256' },
            { name: 'buyer', type: 'address' },
            { name: 'seller', type: 'address' },
            { name: 'payee', type: 'address' },
            { name: 'unitPrice', type: 'uint256' },
            { name: 'maxUnits', type: 'uint256' },
            { name: 'prepaid', type: 'uint256' },
            { name: 'end', type: 'uint64' },
            { name: 'grace', type: 'uint64' },
            { name: 'nonce', type: 'uint256' },
            { name: 'expiry', type: 'uint64' },
          ],
        },
        primaryType: 'Terms',
        message: {
          dealId: t.dealId,
          buyer: t.buyer,
          seller: t.seller,
          payee: t.payee,
          unitPrice: t.unitPrice,
          maxUnits: t.maxUnits,
          prepaid: t.prepaid,
          end: t.end,
          grace: t.grace,
          nonce: t.nonce,
          expiry: t.expiry,
        },
      })
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
        domain: {
          name: 'MeteredEscrow',
          version: '1',
          chainId: ARC_TESTNET_CHAIN_ID,
          verifyingContract: METERED_ESCROW.address,
        },
        types: {
          Terms: [
            { name: 'dealId', type: 'uint256' },
            { name: 'buyer', type: 'address' },
            { name: 'seller', type: 'address' },
            { name: 'payee', type: 'address' },
            { name: 'unitPrice', type: 'uint256' },
            { name: 'maxUnits', type: 'uint256' },
            { name: 'prepaid', type: 'uint256' },
            { name: 'end', type: 'uint64' },
            { name: 'grace', type: 'uint64' },
            { name: 'nonce', type: 'uint256' },
            { name: 'expiry', type: 'uint64' },
          ],
        },
        primaryType: 'Terms',
        message: t as {
          dealId: bigint; buyer: `0x${string}`; seller: `0x${string}`; payee: `0x${string}`;
          unitPrice: bigint; maxUnits: bigint; prepaid: bigint; end: bigint; grace: bigint;
          nonce: bigint; expiry: bigint;
        },
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
    approveUsdc({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [METERED_ESCROW.address, prepaidMicro],
      chainId: ARC_TESTNET_CHAIN_ID,
    })
  }

  async function handleFund() {
    const t = termsData
    if (!t || !sellerSig || !buyerSig) return
    if (chainId !== ARC_TESTNET_CHAIN_ID) {
      try { await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID }) } catch { return }
    }
    fundDeal({
      address: METERED_ESCROW.address,
      abi: METERED_ESCROW.abi,
      functionName: 'createAndFundDeal',
      args: [t, buyerSig as `0x${string}`, sellerSig as `0x${string}`],
      chainId: ARC_TESTNET_CHAIN_ID,
    })
  }

  // Advance steps on success
  if (approveSuccess && step === 'approve') setStep('fund')
  if (fundSuccess && step === 'fund' && termsData) {
    setStep('done')
    onCreated((termsData).dealId as bigint)
  }

  const field = (label: string, key: keyof typeof form, hint?: string) => (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
        {label}
      </label>
      <input
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-all focus:ring-2"
        style={{
          background: 'var(--surface-muted)',
          color: 'var(--ink)',
          border: '1px solid var(--border)',
        }}
        placeholder={hint}
      />
    </div>
  )

  return (
    <div className="space-y-4">
      {step === 'form' && (
        <div className="space-y-3 rounded-3xl p-6" style={glass.card}>
          <h2 className="display text-xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
            New Escrow Deal
          </h2>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Both parties sign the terms; USDC is locked until work is accepted.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {field('Deal ID', 'dealId', 'unique number')}
            {field('Unit Price (USDC)', 'unitPrice', '0.01')}
          </div>
          {field('Seller Address', 'seller', '0x...')}
          {field('Payee Address', 'payee', 'defaults to seller')}
          <div className="grid grid-cols-3 gap-3">
            {field('Max Units', 'maxUnits', '100')}
            {field('Term (days)', 'termDays', '30')}
            {field('Grace (days)', 'graceDays', '3')}
          </div>
          {field('Prepaid USDC', 'prepaid', '1.00')}

          <div className="flex items-start gap-2 rounded-xl p-3" style={glass.inner}>
            <Info className="mt-0.5 size-3.5 shrink-0" style={{ color: 'var(--muted)' }} />
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              In this demo, you'll sign as both buyer and seller. In production, the seller signs first and sends their signature to the buyer.
            </p>
          </div>

          <TxButton
            onClick={() => setStep('seller-sign')}
            disabled={wrongChain || !address || !form.seller}
            label="Continue — get seller signature"
          />
        </div>
      )}

      {step === 'seller-sign' && (
        <div className="space-y-4 rounded-3xl p-6" style={glass.card}>
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'var(--accent)' }}>1</div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Seller signs the terms</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Signing as {form.seller.slice(0, 8)}...</p>
            </div>
          </div>
          <TxButton onClick={() => { void handleSellerSign() }} label="Sign as Seller" />
        </div>
      )}

      {step === 'buyer-sign' && (
        <div className="space-y-4 rounded-3xl p-6" style={glass.card}>
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'var(--accent)' }}>2</div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Buyer signs the terms</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Confirm you accept these deal terms</p>
            </div>
          </div>
          <TxButton onClick={() => { void handleBuyerSign() }} label="Sign as Buyer" />
        </div>
      )}

      {step === 'approve' && (
        <div className="space-y-4 rounded-3xl p-6" style={glass.card}>
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'var(--accent)' }}>3</div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Approve USDC spend</p>
              <p className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                Allow escrow contract to pull {formatUnitsFixed(prepaidMicro, 6, 2)} USDC
              </p>
            </div>
          </div>
          <TxButton
            onClick={() => { void handleApprove() }}
            isPending={approvePending}
            isConfirming={approveConfirming}
            label="Approve USDC"
          />
          <TxReceipt hash={approveHash} isSuccess={approveSuccess} isError={approveError} error={approveErr} label="Approval" />
        </div>
      )}

      {step === 'fund' && (
        <div className="space-y-4 rounded-3xl p-6" style={glass.card}>
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'var(--accent)' }}>4</div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Fund the escrow</p>
              <p className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                Lock {formatUnitsFixed(prepaidMicro, 6, 2)} USDC into the contract
              </p>
            </div>
          </div>
          <TxButton
            onClick={() => { void handleFund() }}
            isPending={fundPending}
            isConfirming={fundConfirming}
            label="Fund Deal"
          />
          <TxReceipt hash={fundHash} isSuccess={fundSuccess} isError={fundError} error={fundErr} label="Deal funding" />
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-3 rounded-3xl p-6" style={glass.card}>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full" style={{ background: 'rgba(26,128,71,0.12)' }}>
              <span className="text-sm">✓</span>
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--success)' }}>Deal funded on Arc Testnet</p>
          </div>
          <p className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
            Deal ID: {form.dealId}
          </p>
          {fundHash && (
            <a
              href={`${ARC_TESTNET_EXPLORER}/tx/${fundHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--muted)' }}
            >
              View funding transaction <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
