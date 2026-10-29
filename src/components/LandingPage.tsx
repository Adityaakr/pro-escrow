import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { ArrowRight, ExternalLink, Check, X, Menu, ChevronDown } from 'lucide-react'
import { ARC_TESTNET_EXPLORER, METERED_ESCROW } from '@/contract'

// ── Exact reference constants ─────────────────────────────────────────────────
const C = {
  bg:        '#070707',
  ink:       '#ffffff',
  ink2:      '#f4f4f0',
  muted:     '#a1a1aa',   // zinc-400
  subtle:    '#71717a',   // zinc-500
  border:    'rgba(255,255,255,0.10)',
  borderHi:  'rgba(255,255,255,0.20)',
  gold:      '#e8c382',
  goldDim:   'rgba(232,195,130,0.12)',
  goldBorder:'rgba(232,195,130,0.35)',
  blue:      '#60a5fa',
  green:     '#4ade80',
  amber:     '#fbbf24',
  purple:    '#c084fc',
}

// ── Type helpers ──────────────────────────────────────────────────────────────
const serif  = 'Gloock, Georgia, serif'
const sans   = 'Manrope, ui-sans-serif, sans-serif'
const mono   = 'JetBrains Mono, Menlo, monospace'

// ── Reusable atoms ────────────────────────────────────────────────────────────
function Rule({ style }: { style?: React.CSSProperties }) {
  return <div style={{ height: 1, background: C.border, ...style }} />
}

// Reference tag chip: uppercase, tracked, tiny mono-style
function Tag({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: sans,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      color: gold ? C.gold : C.muted,
      background: gold ? C.goldDim : 'rgba(255,255,255,0.04)',
      border: `1px solid ${gold ? C.goldBorder : C.border}`,
      borderRadius: 5,
      padding: '3px 10px',
    }}>{children}</span>
  )
}

// Ghost button (reference: linear-gradient rgba 0.08→0.025, inset highlights)
function GhostBtn({ children, onClick, style }: {
  children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: 8,
        height: 40,
        padding: '0 16px',
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0.025))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.85)',
        fontFamily: sans,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: '#d4d4d8',
        cursor: 'pointer',
        transition: 'border-color 0.15s, color 0.15s',
        whiteSpace: 'nowrap' as const,
        ...style,
      }}
    >{children}</button>
  )
}

// Gold CTA (FlowPay accent)
function GoldBtn({ children, onClick, style }: {
  children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: 8,
        height: 44,
        padding: '0 22px',
        borderRadius: 8,
        border: `1px solid ${C.goldBorder}`,
        background: 'linear-gradient(to bottom, #f0d09a, #e8c382)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.25), 0 4px 20px rgba(232,195,130,0.30)',
        fontFamily: sans,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: '#351e10',
        cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
        ...style,
      }}
    >{children}</button>
  )
}

// ── Header (exact reference structure) ───────────────────────────────────────
function Header({ onConnect }: { onConnect: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header style={{
      position: 'relative',
      zIndex: 20,
      borderBottom: `1px solid ${C.border}`,
      background: 'rgba(9,9,9,0.80)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 16px',
      }}>

        {/* Brand block — reference: border-x, corner marks, min-h-20 */}
        <a href="#" style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 80,
          padding: '0 24px',
          borderLeft: `1px solid ${C.border}`,
          borderRight: `1px solid ${C.border}`,
          textDecoration: 'none',
        }}>
          {/* Corner pixel marks */}
          <span style={{ position: 'absolute', top: 14, left: -3, width: 6, height: 6, background: '#71717a', display: 'block' }} />
          <span style={{ position: 'absolute', bottom: 14, right: -3, width: 6, height: 6, background: '#71717a', display: 'block' }} />

          {/* Logo mark */}
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.16), rgba(255,255,255,0.045))',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.90), 0 1rem 2rem rgba(0,0,0,0.35)',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', textShadow: '0 1px 0 rgba(0,0,0,0.8)', userSelect: 'none' }}>FP</span>
          </span>

          <span style={{ lineHeight: 1 }} className="hidden sm:block">
            <span style={{ display: 'block', fontFamily: sans, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: '#fff' }}>FlowPay</span>
            <span style={{ display: 'block', marginTop: 4, fontFamily: sans, fontSize: 10, fontWeight: 400, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#71717a' }}>USDC streams</span>
          </span>
        </a>

        {/* Primary nav — reference: hidden on mobile, border-r, tracking-widest */}
        <nav style={{ display: 'none', alignItems: 'stretch' }} className="hidden lg:flex">
          {[
            { href: '#protocol', label: 'Protocol' },
            { href: '#streams',  label: 'Streams' },
            { href: '#security', label: 'Security' },
            { href: '#faq',      label: 'FAQ' },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '0 20px',
                borderRight: `1px solid ${C.border}`,
                fontFamily: sans,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                color: C.muted,
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right CTA group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' }}>
          <div className="hidden lg:flex" style={{ gap: 8, alignItems: 'center' }}>
            <ConnectKitButton />
            <GoldBtn onClick={onConnect}>
              Launch app <ArrowRight size={13} />
            </GoldBtn>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex lg:hidden"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.11), rgba(255,255,255,0.035))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.80)',
              color: '#d4d4d8',
            }}
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          padding: '16px',
          borderTop: `1px solid ${C.border}`,
          background: 'rgba(9,9,9,0.98)',
          backdropFilter: 'blur(24px)',
        }}>
          {[
            { href: '#protocol', label: 'Protocol' },
            { href: '#streams',  label: 'Streams' },
            { href: '#security', label: 'Security' },
            { href: '#faq',      label: 'FAQ' },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 4px',
                borderBottom: `1px solid ${C.border}`,
                fontFamily: sans,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                color: C.muted,
                textDecoration: 'none',
              }}
            >{item.label}</a>
          ))}
          <div style={{ marginTop: 16 }}>
            <ConnectKitButton />
          </div>
        </div>
      )}
    </header>
  )
}

// ── Stat strip ────────────────────────────────────────────────────────────────
function StatStrip() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      borderTop: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
    }}>
      {[
        { n: '$0',    label: 'Total locked',    sub: 'testnet' },
        { n: '2',     label: 'Sig verifications', sub: 'per stream' },
        { n: '0%',    label: 'Platform fee',    sub: 'no fee' },
      ].map((s, i) => (
        <div
          key={s.label}
          style={{
            padding: '28px 24px',
            borderRight: i < 2 ? `1px solid ${C.border}` : undefined,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{
            fontFamily: serif,
            fontSize: 'clamp(32px, 4vw, 52px)',
            fontWeight: 400,
            letterSpacing: '-0.03em',
            color: '#fff',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>{s.n}</div>
          <div style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{s.label}</div>
          <div style={{ fontFamily: sans, fontSize: 11, color: C.subtle }}>{s.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ── Protocol flow ─────────────────────────────────────────────────────────────
function ProtocolFlow() {
  const steps = [
    { n: '01', title: 'Define terms',   body: 'Payer sets amount, schedule, grace period, and recipient. Terms are hashed for signing.' },
    { n: '02', title: 'Dual signature', body: 'Both parties sign the EIP-712 typed data off-chain. No gas spent until funding.' },
    { n: '03', title: 'USDC locked',    body: 'Payer calls createAndFundDeal. USDC moves from wallet to contract in one tx.' },
    { n: '04', title: 'Milestone/pay',  body: 'Seller invokes usage proofs. Contract calculates and releases each disbursement.' },
    { n: '05', title: 'Settle',         body: 'On completion or expiry, remaining USDC returns to payer. No intermediary.' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{
            flex: '1 1 200px',
            padding: '28px 24px',
            borderRight: i < steps.length - 1 ? `1px solid ${C.border}` : undefined,
            borderBottom: `1px solid ${C.border}`,
            position: 'relative' as const,
          }}>
            {/* connector dot */}
            {i < steps.length - 1 && (
              <span style={{
                position: 'absolute',
                right: -5,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: C.gold,
                zIndex: 1,
              }} />
            )}
            <div style={{ fontFamily: mono, fontSize: 10, color: C.gold, letterSpacing: '0.1em', marginBottom: 12 }}>{s.n}</div>
            <div style={{ fontFamily: serif, fontSize: 16, color: '#fff', marginBottom: 8 }}>{s.title}</div>
            <div style={{ fontFamily: sans, fontSize: 12, lineHeight: 1.7, color: C.muted }}>{s.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stream type cards ─────────────────────────────────────────────────────────
function StreamCards({ onConnect }: { onConnect: () => void }) {
  const cards = [
    {
      type: 'Payroll',
      color: '#60a5fa',
      colorDim: 'rgba(96,165,250,0.10)',
      colorBorder: 'rgba(96,165,250,0.20)',
      desc: 'Schedule recurring USDC salary disbursements with on-chain verification. Employees claim each period independently.',
      tag: 'Recurring',
    },
    {
      type: 'Vesting',
      color: '#c084fc',
      colorDim: 'rgba(192,132,252,0.10)',
      colorBorder: 'rgba(192,132,252,0.20)',
      desc: 'Lock USDC grants with cliff and linear release. Founders and contractors unlock tranches as milestones are hit.',
      tag: 'Grant',
    },
    {
      type: 'Milestones',
      color: '#fbbf24',
      colorDim: 'rgba(251,191,36,0.10)',
      colorBorder: 'rgba(251,191,36,0.20)',
      desc: 'Pay contractors per deliverable. Each milestone is a discrete unit; partial work earns partial payment.',
      tag: 'Per unit',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 0, borderTop: `1px solid ${C.border}` }}>
      {cards.map((c, i) => (
        <div
          key={c.type}
          style={{
            padding: '32px 28px',
            borderRight: i < cards.length - 1 ? `1px solid ${C.border}` : undefined,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            position: 'relative' as const,
          }}
        >
          {/* Top accent bar */}
          <div style={{ position: 'absolute', top: 0, left: 28, right: 28, height: 2, background: c.color, opacity: 0.7, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />

          {/* Icon + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <div style={{
              width: 36, height: 36,
              borderRadius: 8,
              background: c.colorDim,
              border: `1px solid ${c.colorBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
            </div>
            <span style={{ fontFamily: serif, fontSize: 18, color: '#fff' }}>{c.type}</span>
            <span style={{
              marginLeft: 'auto',
              fontFamily: sans, fontSize: 10, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase' as const,
              color: c.color,
              background: c.colorDim,
              border: `1px solid ${c.colorBorder}`,
              borderRadius: 4,
              padding: '2px 7px',
            }}>{c.tag}</span>
          </div>

          <p style={{ fontFamily: sans, fontSize: 13, lineHeight: 1.75, color: C.muted, margin: 0 }}>{c.desc}</p>

          <button
            onClick={onConnect}
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: sans, fontSize: 11, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              color: c.color,
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            }}
          >
            Create stream <ArrowRight size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Comparison table ──────────────────────────────────────────────────────────
function ComparisonTable() {
  const rows: [string, boolean, boolean, boolean | string][] = [
    ['Non-custodial',        true,  false, false],
    ['Dual-signature',       true,  false, 'optional'],
    ['Stable gas fee',       true,  true,  false],
    ['No platform fee',      true,  false, false],
    ['USDC native',          true,  false, false],
    ['On-chain audit trail', true,  true,  true],
    ['No KYC',               true,  false, false],
  ]
  const headers = ['Feature', 'FlowPay', 'Multisig', 'Stripe']

  return (
    <div style={{ overflowX: 'auto' as const }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontFamily: sans }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {headers.map((h, i) => (
              <th key={h} style={{
                padding: '14px 20px',
                textAlign: i === 0 ? ('left' as const) : ('center' as const),
                fontFamily: sans,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                color: i === 1 ? C.gold : C.muted,
                background: i === 1 ? C.goldDim : 'transparent',
                borderBottom: i === 1 ? `2px solid ${C.goldBorder}` : undefined,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, fp, ms, st]) => (
            <tr
              key={label}
              style={{ borderBottom: `1px solid ${C.border}` }}
            >
              <td style={{ padding: '12px 20px', fontFamily: sans, fontSize: 13, color: C.muted }}>{label}</td>
              {[fp, ms, st].map((v, ci) => (
                <td key={ci} style={{
                  padding: '12px 20px',
                  textAlign: 'center' as const,
                  background: ci === 0 ? C.goldDim : 'transparent',
                }}>
                  {v === true  ? <Check size={16} style={{ color: C.green,  margin: '0 auto' }} /> :
                   v === false ? <X     size={16} style={{ color: C.subtle, margin: '0 auto', opacity: 0.5 }} /> :
                   <span style={{ fontFamily: mono, fontSize: 10, color: C.muted }}>{String(v)}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Security section ──────────────────────────────────────────────────────────
function SecuritySection() {
  const items = [
    { label: 'EIP-712 typed signing',  body: 'All stream terms are committed via typed data signatures before any on-chain state change.' },
    { label: 'No admin keys',          body: 'Once deployed, no owner address can pause, drain, or upgrade the contract.' },
    { label: 'Reentrancy guard',       body: 'All state-mutating paths use check-effects-interactions with a reentrancy lock.' },
    { label: 'Expiry enforcement',     body: 'Signature expiry fields prevent replay. Nonces prevent double-funding.' },
    { label: 'USDC only',              body: 'No ETH, no wrapped tokens. One asset, one approval, one transfer per stream.' },
    { label: 'Open source',            body: 'Contract source verified on Arc Testnet explorer. No proxies, no upgrades.' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 0 }}>
      {items.map((item, i) => (
        <div key={item.label} style={{
          padding: '28px 24px',
          borderRight: (i % 3 !== 2) ? `1px solid ${C.border}` : undefined,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: C.goldDim,
            border: `1px solid ${C.goldBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <Check size={13} style={{ color: C.gold }} />
          </div>
          <div style={{ fontFamily: serif, fontSize: 15, color: '#fff', marginBottom: 8 }}>{item.label}</div>
          <div style={{ fontFamily: sans, fontSize: 12, lineHeight: 1.75, color: C.muted }}>{item.body}</div>
        </div>
      ))}
    </div>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(null)
  const items = [
    {
      q: 'What chains does FlowPay support?',
      a: 'Arc Testnet currently. Arc is Circle\'s EVM chain where USDC is the native gas token — no ETH needed for transactions.',
    },
    {
      q: 'Do both parties need a wallet?',
      a: 'The payer (funder) needs a wallet with USDC. The recipient only needs an address to receive — they can sign with a hardware wallet or any EVM-compatible signer.',
    },
    {
      q: 'What happens if the payer disappears?',
      a: 'After the grace period, the recipient can reclaim the locked USDC proportional to units delivered. No party can indefinitely withhold funds.',
    },
    {
      q: 'Are there fees?',
      a: 'No platform fee. You pay Arc network gas in USDC. There is no fee schedule, percentage cut, or subscription.',
    },
    {
      q: 'Is the contract upgradeable?',
      a: 'No. MeteredEscrow is a fixed-logic contract. There is no proxy, no owner function, no pause mechanism.',
    },
    {
      q: 'How do I verify the contract?',
      a: `The source is verified on Arc Testnet explorer at ${METERED_ESCROW.address.slice(0,10)}...`,
    },
  ]

  return (
    <div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px',
              background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'left' as const,
            }}
          >
            <span style={{ fontFamily: serif, fontSize: 16, color: '#fff', fontWeight: 400 }}>{item.q}</span>
            <ChevronDown
              size={16}
              style={{
                color: C.muted,
                flexShrink: 0,
                marginLeft: 16,
                transform: open === i ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
              }}
            />
          </button>
          {open === i && (
            <div style={{ padding: '0 24px 20px', fontFamily: sans, fontSize: 13, lineHeight: 1.8, color: C.muted }}>
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Contract spec card ────────────────────────────────────────────────────────
function ContractCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 14,
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Tag gold>Live on Arc Testnet</Tag>
        <a
          href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`}
          target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 11, color: C.muted, textDecoration: 'none' }}
        >
          <ExternalLink size={11} /> Explorer
        </a>
      </div>

      {/* Address */}
      <div>
        <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.subtle, marginBottom: 6 }}>Contract</div>
        <div style={{ fontFamily: mono, fontSize: 11, color: C.gold, wordBreak: 'break-all' as const }}>{METERED_ESCROW.address}</div>
      </div>

      <Rule />

      {/* Spec rows */}
      {[
        ['Standard',  'EIP-712 + ERC-20'],
        ['Token',     'USDC (native)'],
        ['Chain ID',  '5042002'],
        ['Upgradeable', 'No'],
        ['Owner key', 'None'],
      ].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{k}</span>
          <span style={{ fontFamily: mono, fontSize: 11, color: '#fff' }}>{v}</span>
        </div>
      ))}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ id, children, noPad }: {
  id?: string; children: React.ReactNode; noPad?: boolean
}) {
  return (
    <section id={id} style={{
      maxWidth: 1280,
      margin: '0 auto',
      padding: noPad ? 0 : '0 24px',
    }}>
      {children}
    </section>
  )
}

function SectionHeader({ tag, title, sub }: { tag: string; title: React.ReactNode; sub?: string }) {
  return (
    <div style={{ padding: '60px 0 40px' }}>
      <Tag>{tag}</Tag>
      <h2 style={{
        fontFamily: serif,
        fontSize: 'clamp(28px, 3vw, 44px)',
        fontWeight: 400,
        letterSpacing: '-0.02em',
        color: '#fff',
        margin: '16px 0 0',
        lineHeight: 1.15,
      }}>{title}</h2>
      {sub && <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.8, color: C.muted, marginTop: 12, maxWidth: 540 }}>{sub}</p>}
    </div>
  )
}

// ── Landing Page root ─────────────────────────────────────────────────────────
export function LandingPage({ onLaunch }: { onLaunch: () => void }) {
  // "Launch app" / "Open app": navigate into the product immediately.
  // Also click the ConnectKit button so the wallet modal opens simultaneously.
  function handleConnect() {
    onLaunch()
    const btn = document.querySelector('[data-testid="connect-button"]') as HTMLButtonElement | null
    if (btn) btn.click()
  }

  return (
    <div style={{ minHeight: '100dvh', color: '#fff', fontFamily: sans }}>
      <Header onConnect={handleConnect} />

      {/* ── HERO ── */}
      <Section id="hero">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,420px)',
          gap: 48,
          padding: '80px 0 60px',
          alignItems: 'center',
        }} className="hero-grid">
          {/* Left */}
          <div>
            <Tag gold>USDC payroll · vesting · milestones</Tag>

            <h1 style={{
              fontFamily: serif,
              fontSize: 'clamp(44px, 6vw, 88px)',
              fontWeight: 400,
              letterSpacing: '-0.03em',
              lineHeight: 1.02,
              color: '#fff',
              margin: '20px 0 28px',
            }}>
              Stream USDC.<br />
              <span style={{ color: C.gold }}>On your terms.</span>
            </h1>

            <p style={{
              fontFamily: sans,
              fontSize: 15,
              lineHeight: 1.8,
              color: C.muted,
              margin: '0 0 36px',
              maxWidth: 520,
            }}>
              FlowPay locks USDC on-chain with dual EIP-712 signatures. Payroll, vesting grants, and milestone contracts settle without intermediaries, custody, or platform fees.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
              <GoldBtn onClick={handleConnect}>
                Launch app <ArrowRight size={14} />
              </GoldBtn>
              <GhostBtn>
                <a
                  href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`}
                  target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'inherit', textDecoration: 'none', fontSize: 11 }}
                >
                  View contract <ExternalLink size={12} />
                </a>
              </GhostBtn>
            </div>
          </div>

          {/* Right — contract card */}
          <div className="hero-card">
            <ContractCard />
          </div>
        </div>
      </Section>

      <Rule />

      {/* ── STAT STRIP ── */}
      <Section noPad>
        <StatStrip />
      </Section>

      {/* ── PROTOCOL ── */}
      <Section id="protocol">
        <SectionHeader
          tag="Protocol"
          title="Five steps. No intermediary."
          sub="Every stream follows the same immutable flow: sign off-chain, fund on-chain, disburse by proof, settle by expiry."
        />
        <ProtocolFlow />
      </Section>

      {/* ── STREAM TYPES ── */}
      <Section id="streams">
        <SectionHeader
          tag="Stream types"
          title="Three payment primitives"
          sub="Each type is a configuration of the same contract. Pick the one that matches your agreement."
        />
        <StreamCards onConnect={handleConnect} />
      </Section>

      {/* ── COMPARISON ── */}
      <Section>
        <SectionHeader
          tag="Compare"
          title="Why not a multisig or Stripe?"
        />
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 60,
        }}>
          <ComparisonTable />
        </div>
      </Section>

      {/* ── SECURITY ── */}
      <Section id="security">
        <SectionHeader
          tag="Security"
          title="Built for adversarial conditions"
          sub="No admin keys. No upgradeability. No wrapping. The contract does one thing and cannot be changed."
        />
        <div style={{
          border: `1px solid ${C.border}`,
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          overflow: 'hidden',
          marginBottom: 60,
        }}>
          <SecuritySection />
        </div>
      </Section>

      {/* ── FAQ ── */}
      <Section id="faq">
        <SectionHeader tag="FAQ" title="Common questions" />
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 80,
        }}>
          <FAQ />
        </div>
      </Section>

      {/* ── DARK CTA ── */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        padding: '80px 24px',
        textAlign: 'center' as const,
        background: 'rgba(255,255,255,0.015)',
      }}>
        <Tag gold>Ready</Tag>
        <h2 style={{
          fontFamily: serif,
          fontSize: 'clamp(32px, 4vw, 60px)',
          fontWeight: 400,
          letterSpacing: '-0.025em',
          color: '#fff',
          margin: '20px 0 16px',
        }}>Start streaming USDC</h2>
        <p style={{ fontFamily: sans, fontSize: 14, color: C.muted, margin: '0 0 36px', lineHeight: 1.8 }}>
          Connect your wallet. No account, no KYC, no fees.
        </p>
        <GoldBtn onClick={handleConnect} style={{ height: 50, padding: '0 28px', fontSize: 12 }}>
          Launch FlowPay <ArrowRight size={14} />
        </GoldBtn>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{
        maxWidth: 1280,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap' as const,
        gap: 16,
        padding: '28px 24px',
        borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: serif, fontSize: 16, color: '#fff' }}>FlowPay</span>
          <span style={{ color: C.subtle }}>·</span>
          <span style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.subtle }}>
            USDC streams on Arc Testnet
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a
            href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`}
            target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: sans, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.subtle, textDecoration: 'none' }}
          >
            Contract <ExternalLink size={11} />
          </a>
          <a
            href="https://github.com/Adityaakr/pro-escrow"
            target="_blank" rel="noreferrer"
            style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.subtle, textDecoration: 'none' }}
          >
            GitHub
          </a>
        </div>
      </footer>

      {/* Hero responsive styles */}
      <style>{`
        @media (max-width: 860px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-card { display: none; }
        }
      `}</style>
    </div>
  )
}
