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
      ? 'var(--danger)'
      : variant === 'secondary'
      ? 'var(--surface-muted)'
      : 'var(--accent)'
  const color = variant === 'secondary' ? 'var(--ink)' : 'white'

  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={{ background: bg, color }}
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      {isPending ? pendingLabel : isConfirming ? confirmingLabel : label}
    </button>
  )
}
