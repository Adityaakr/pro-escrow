/**
 * FlowPay stream type definitions and helpers.
 * Three stream types are built on top of MeteredEscrow:
 *
 *  PAYROLL  — recurring salary. unit = 1 pay period (monthly).
 *  VESTING  — linear grant vesting. unit = 1 vesting tranche.
 *  ESCROW   — milestone-based project escrow. unit = 1 milestone.
 *
 * The stream type is encoded in the most-significant byte of the dealId so
 * it survives on-chain without any extra contract storage.
 *   dealId = (TYPE_PREFIX << 56) | timestamp_ms_truncated_to_56bits
 */

export type StreamType = 'payroll' | 'vesting' | 'escrow'

export const STREAM_TYPE_PREFIX: Record<StreamType, bigint> = {
  payroll: 1n,
  vesting: 2n,
  escrow:  3n,
}

export function encodeStreamId(type: StreamType): bigint {
  const ts = BigInt(Date.now()) & ((1n << 56n) - 1n)
  return (STREAM_TYPE_PREFIX[type] << 56n) | ts
}

export function decodeStreamType(dealId: bigint): StreamType {
  const prefix = (dealId >> 56n) & 0xFFn
  if (prefix === 1n) return 'payroll'
  if (prefix === 2n) return 'vesting'
  if (prefix === 3n) return 'escrow'
  return 'escrow' // fallback for legacy deals
}

// ── Stream type metadata ───────────────────────────────────────────────────────

export interface StreamTypeMeta {
  id: StreamType
  label: string
  tagline: string
  description: string
  unitLabel: string        // singular, lowercase
  periodLabel: string      // e.g. "month", "tranche", "milestone"
  icon: string             // lucide icon name
  color: string            // css var name without --
  /** Smart defaults when the user picks this type */
  defaults: {
    unitPrice: string      // USDC per unit
    maxUnits: string       // number of units
    prepaid: string        // total locked
    termDays: string       // term length in days
    graceDays: string      // grace before refund
    recipientLabel: string // label for the "seller" field
    payerLabel: string     // label for the "buyer" field
    title: string          // suggested stream title
  }
}

export const STREAM_TYPES: StreamTypeMeta[] = [
  {
    id: 'payroll',
    label: 'Payroll',
    tagline: 'Monthly salary in USDC',
    description: 'Lock a salary budget and release it monthly. Each pay period is claimed by the employee with a signed acknowledgement. Unused months refund to the employer after the grace period.',
    unitLabel: 'pay period',
    periodLabel: 'month',
    icon: 'Briefcase',
    color: 'blue',
    defaults: {
      unitPrice: '2000.00',
      maxUnits: '12',
      prepaid: '24000.00',
      termDays: '365',
      graceDays: '30',
      recipientLabel: 'Employee wallet',
      payerLabel: 'Employer wallet',
      title: 'Monthly salary — 12 months',
    },
  },
  {
    id: 'vesting',
    label: 'Vesting',
    tagline: 'Token grant vesting schedule',
    description: 'Lock a USDC grant and vest it linearly over tranches. Each tranche is claimable by the beneficiary. Unvested balance returns to the grantor if the grant is cancelled.',
    unitLabel: 'tranche',
    periodLabel: 'tranche',
    icon: 'TrendingUp',
    color: 'purple',
    defaults: {
      unitPrice: '5000.00',
      maxUnits: '16',
      prepaid: '80000.00',
      termDays: '1461',    // 4 years
      graceDays: '30',
      recipientLabel: 'Beneficiary wallet',
      payerLabel: 'Grantor wallet',
      title: '4-year USDC vesting grant',
    },
  },
  {
    id: 'escrow',
    label: 'Milestone Payments',
    tagline: 'Pay per deliverable, not upfront',
    description: 'Lock a project budget and release it milestone by milestone. The client signs off each delivery. Remaining funds refund to the client after the deadline plus grace period.',
    unitLabel: 'milestone',
    periodLabel: 'milestone',
    icon: 'CheckSquare',
    color: 'amber',
    defaults: {
      unitPrice: '1000.00',
      maxUnits: '5',
      prepaid: '5000.00',
      termDays: '90',
      graceDays: '14',
      recipientLabel: 'Contractor wallet',
      payerLabel: 'Client wallet',
      title: 'Project milestone payments',
    },
  },
]

export function getStreamType(id: StreamType): StreamTypeMeta {
  return STREAM_TYPES.find(t => t.id === id) ?? STREAM_TYPES[2]
}

// ── Amount helpers ────────────────────────────────────────────────────────────

/** Format a micro-USDC bigint as "$1,234.56" */
export function fmtUSDC(micro: bigint): string {
  const n = Number(micro) / 1_000_000
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

/** Parse a dollar string like "1234.56" to micro-USDC bigint */
export function parseUSDC(s: string): bigint {
  const n = parseFloat(s)
  if (isNaN(n) || n < 0) return 0n
  return BigInt(Math.round(n * 1_000_000))
}

/** Shorten an address to 0x1234…5678 */
export function fmtAddr(a: string): string {
  if (!a || a.length < 10) return a
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

/** Unix timestamp (seconds) -> human date string */
export function fmtDate(ts: bigint | number): string {
  const ms = typeof ts === 'bigint' ? Number(ts) * 1000 : ts * 1000
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Progress percentage 0-100, capped */
export function progressPct(settled: bigint, deposit: bigint): number {
  if (deposit === 0n) return 0
  return Math.min(100, Math.round(Number((settled * 100n) / deposit)))
}
