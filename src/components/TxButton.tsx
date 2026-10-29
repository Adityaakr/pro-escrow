import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

interface TxButtonProps {
  onClick: () => void
  disabled?: boolean
  isPending?: boolean
  isConfirming?: boolean
  label: ReactNode
  pendingLabel?: string
  confirmingLabel?: string
  variant?: 'primary' | 'secondary' | 'danger'
  className?: string
}

export function TxButton({
  onClick,
  disabled,
  isPending,
  isConfirming,
  label,
  pendingLabel = 'Confirm in wallet...',
  confirmingLabel = 'Confirming...',
  variant = 'primary',
  className = '',
}: TxButtonProps) {
  const busy = isPending || isConfirming
  const bg =
    variant === 'danger'
      ? 'var(--red)'
      : variant === 'secondary'
      ? 'rgba(255,255,255,0.06)'
      : 'linear-gradient(to bottom, #f0d09a, #e8c382)'
  const color = variant === 'secondary' ? 'var(--ink)' : '#351e10'
  const boxShadow = variant === 'primary'
    ? 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 14px rgba(232,195,130,0.2)'
    : variant === 'secondary'
    ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 0 rgba(0,0,0,0.4)'
    : undefined

  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={{ background: bg, color, boxShadow, border: variant === 'secondary' ? '1px solid var(--border)' : 'none', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'Manrope, sans-serif' }}
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      {isPending ? pendingLabel : isConfirming ? confirmingLabel : label}
    </button>
  )
}
