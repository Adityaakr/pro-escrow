import { ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import { ARC_TESTNET_EXPLORER } from '@/contract'

interface TxReceiptProps {
  hash?: string
  isSuccess?: boolean
  isError?: boolean
  error?: Error | null
  label?: string
}

export function TxReceipt({ hash, isSuccess, isError, error, label = 'Transaction' }: TxReceiptProps) {
  if (!isSuccess && !isError) return null
  return (
    <div
      className="mt-3 rounded-2xl p-4"
      style={{
        background: isSuccess ? 'rgba(26,128,71,0.08)' : 'rgba(186,43,76,0.08)',
        border: `1px solid ${isSuccess ? 'rgba(26,128,71,0.2)' : 'rgba(186,43,76,0.2)'}`,
      }}
    >
      <div className="flex items-center gap-2">
        {isSuccess ? (
          <CheckCircle className="size-4" style={{ color: 'var(--success)' }} />
        ) : (
          <XCircle className="size-4" style={{ color: 'var(--danger)' }} />
        )}
        <span className="text-sm font-semibold" style={{ color: isSuccess ? 'var(--success)' : 'var(--danger)' }}>
          {isSuccess ? `${label} confirmed` : `${label} failed`}
        </span>
      </div>
      {isSuccess && hash && (
        <a
          href={`${ARC_TESTNET_EXPLORER}/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--muted)' }}
        >
          View on explorer <ExternalLink className="size-3" />
        </a>
      )}
      {isError && error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
          {error.message.slice(0, 120)}
        </p>
      )}
    </div>
  )
}
