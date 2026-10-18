import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { ExternalLink, ArrowRight, Check, X, Menu } from 'lucide-react'
import { ARC_TESTNET_EXPLORER, METERED_ESCROW } from '@/contract'

// ── Design tokens (landing-only, self-contained) ──────────────────────────────
const C = {
  bg:      '#fafaf9',
  bgAlt:   '#f4f3ef',
  bgDark:  '#0f1117',
  border:  '#e4e2dc',
  ink:     '#111110',
  ink2:    '#3a3936',
  muted:   '#72716b',
  subtle:  '#a8a49c',
  blue:    '#1d4ed8',
  purple:  '#5b21b6',
  amber:   '#92400e',
  green:   '#15803d',
}

// ── Type scale constants ──────────────────────────────────────────────────────
const serif = 'Instrument Serif, Georgia, serif'
const sans  = 'Inter, system-ui, sans-serif'
const mono  = 'JetBrains Mono, Menlo, monospace'

const T = {
  h1:      { fontFamily: serif, fontSize: 'clamp(40px,5vw,76px)', fontWeight: 400, lineHeight: 1.04, letterSpacing: '-0.025em', color: C.ink },
  h2:      { fontFamily: serif, fontSize: 'clamp(26px,2.8vw,42px)', fontWeight: 400, lineHeight: 1.15, letterSpacing: '-0.02em', color: C.ink },
  h3:      { fontFamily: serif, fontSize: 18, fontWeight: 400, color: C.ink },
  body:    { fontFamily: sans, fontSize: 14, lineHeight: 1.8, color: C.muted },
  bodyLg:  { fontFamily: sans, fontSize: 15, lineHeight: 1.8, color: C.muted },
  label:   { fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', color: C.muted, textTransform: 'uppercase' as const },
  caption: { fontFamily: sans, fontSize: 12, color: C.muted },
  mono:    { fontFamily: mono, fontSize: 11, color: C.ink2 },
}

// ── Reusable atoms ────────────────────────────────────────────────────────────
function Rule({ style }: { style?: React.CSSProperties }) {
  return <div style={{ height: 1, background: C.border, ...style }} />
}

function Tag({ children, color = C.muted, bg = 'transparent', border = C.border }: {
  children: React.ReactNode; color?: string; bg?: string; border?: string
}) {
  return (
    <span style={{ ...T.label, color, background: bg, border: `1px solid ${border}`, borderRadius: 4, padding: '3px 8px', display: 'inline-block' }}>
      {children}
    </span>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
      <div style={{ width: 20, height: 1, background: C.subtle }} />
      <span style={{ ...T.label, color: C.muted }}>{children}</span>
    </div>
  )
}

// Container with consistent 8px-grid gutters
function Wrap({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 clamp(16px, 4vw, 40px)', ...style }}>
      {children}
    </div>
  )
}

// ── SVG diagrams ─────────────────────────────────────────────────────────────
function FlowDiagram() {
  const steps = [
    { n: '01', label: 'Sign terms',    sub: 'EIP-712' },
    { n: '02', label: 'Deposit USDC',  sub: 'On-chain' },
    { n: '03', label: 'Deliver work',  sub: 'Off-chain' },
    { n: '04', label: 'Settle',        sub: 'On-chain' },
    { n: '05', label: 'Refund unused', sub: 'Automatic' },
  ]
  const W = 620; const nodeY = 28; const gap = W / (steps.length - 1)
  return (
    <svg viewBox={`0 0 ${W} 80`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      {steps.slice(0, -1).map((_, i) => (
        <line key={i} x1={i * gap + 10} y1={nodeY} x2={(i + 1) * gap - 10} y2={nodeY} stroke={C.border} strokeWidth="1" />
      ))}
      {steps.map((s, i) => (
        <g key={s.label}>
          <circle cx={i * gap} cy={nodeY} r="8" fill="white" stroke={C.ink2} strokeWidth="1.5" />
          <text x={i * gap} y={nodeY + 4.5} textAnchor="middle" style={{ fontFamily: mono, fontSize: 8.5, fill: C.ink, fontWeight: 600 }}>{s.n}</text>
          <text x={i * gap} y={nodeY + 26} textAnchor="middle" style={{ fontFamily: sans, fontSize: 11, fill: C.ink2, fontWeight: 500 }}>{s.label}</text>
          <text x={i * gap} y={nodeY + 40} textAnchor="middle" style={{ fontFamily: mono, fontSize: 9, fill: C.muted, letterSpacing: '0.06em' }}>{s.sub}</text>
        </g>
      ))}
    </svg>
  )
}

function VestingChart() {
  const months = Array.from({ length: 16 }, (_, i) => ({ m: i + 1, vested: i < 4 ? 0 : i < 8 ? (i - 3) * 0.25 : 1 }))
  const W = 560; const H = 80; const pad = 4
  const bw = (W - pad * (months.length - 1)) / months.length
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: '100%', display: 'block' }}>
      {months.map(({ m, vested }, i) => {
        const x = i * (bw + pad); const bh = Math.max(vested * H, vested > 0 ? 3 : 0)
        return (
          <g key={m}>
            <rect x={x} y={H - 3} width={bw} height={3} rx="1" fill={C.border} />
            {vested > 0 && <rect x={x} y={H - bh} width={bw} height={bh} rx="1" fill={i < 8 ? '#93c5fd' : C.blue} />}
            {m % 4 === 0 && <text x={x + bw / 2} y={H + 16} textAnchor="middle" style={{ fontFamily: mono, fontSize: 8, fill: C.muted }}>M{m}</text>}
          </g>
        )
      })}
      <line x1={(3.5) * (bw + pad)} y1="0" x2={(3.5) * (bw + pad)} y2={H} stroke={C.amber} strokeWidth="1" strokeDasharray="4 3" />
      <text x={(3.5) * (bw + pad) + 4} y="12" style={{ fontFamily: mono, fontSize: 8, fill: C.amber, letterSpacing: '0.06em' }}>CLIFF</text>
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const navLinks = [
    { label: 'Protocol',   href: '#protocol' },
    { label: 'Use cases',  href: '#use-cases' },
    { label: 'Streams',    href: '#streams' },
    { label: 'Security',   href: '#security' },
  ]

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: '100dvh', fontFamily: sans }}>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, background: C.bg, position: 'sticky', top: 0, zIndex: 50 }}>
        <Wrap style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontFamily: serif, fontSize: 20, color: C.ink, letterSpacing: '-0.01em', flexShrink: 0 }}>FlowPay</span>

          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hidden md:flex">
            {navLinks.map(l => (
              <a key={l.label} href={l.href} style={{ ...T.caption, fontWeight: 500, color: C.muted, textDecoration: 'none' }}
                onMouseEnter={e => ((e.target as HTMLAnchorElement).style.color = C.ink)}
                onMouseLeave={e => ((e.target as HTMLAnchorElement).style.color = C.muted)}>
                {l.label}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="hidden md:block">
              <ConnectKitButton label="Open app" />
            </div>
            {/* Mobile hamburger */}
            <button
              className="flex md:hidden"
              onClick={() => setMobileNavOpen(o => !o)}
              style={{ padding: 8, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: mobileNavOpen ? C.bgAlt : 'transparent' }}
              aria-label="Open navigation"
            >
              <Menu size={20} style={{ color: C.ink }} />
            </button>
          </div>
        </Wrap>

        {/* Mobile drawer */}
        {mobileNavOpen && (
          <div className="flex md:hidden" style={{ borderTop: `1px solid ${C.border}`, background: C.bg, flexDirection: 'column' }}>
            {navLinks.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMobileNavOpen(false)}
                style={{ padding: '14px clamp(16px,4vw,40px)', fontSize: 15, fontWeight: 500, color: C.ink2, textDecoration: 'none', borderBottom: `1px solid ${C.border}`, display: 'block', minHeight: 44 }}>
                {l.label}
              </a>
            ))}
            <div style={{ padding: '16px clamp(16px,4vw,40px)' }}>
              <ConnectKitButton label="Open app" />
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section>
        <Wrap style={{ paddingTop: 88, paddingBottom: 72 }}>
          <div className="grid md:grid-cols-12" style={{ alignItems: 'start' }}>
            {/* Left col */}
            <div className="md:col-span-7" style={{ paddingRight: 'clamp(0px,5vw,72px)', paddingBottom: 'clamp(40px,5vw,0px)' }}>
              <div style={{ marginBottom: 28 }}>
                <Tag>Live on Arc Testnet</Tag>
              </div>
              <h1 style={{ ...T.h1, margin: '0 0 28px' }}>
                On-chain payroll,<br />
                vesting schedules,<br />
                <em style={{ fontStyle: 'italic', color: C.ink2 }}>and milestone payments.</em>
              </h1>
              <p style={{ ...T.bodyLg, maxWidth: 480, margin: '0 0 16px' }}>
                FlowPay lets any two parties lock USDC into a smart contract and release it incrementally as obligations are met.
              </p>
              <p style={{ ...T.body, maxWidth: 480, margin: '0 0 40px' }}>
                No intermediary holds the funds. No approval is needed to claim what is already yours. Every payment is a signed, auditable transaction on Arc.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <ConnectKitButton label="Connect wallet to start" />
                <a href="#protocol"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...T.caption, fontWeight: 500, color: C.muted, textDecoration: 'none', minHeight: 44, padding: '0 4px' }}
                  onMouseEnter={e => ((e.target as HTMLAnchorElement).style.color = C.ink)}
                  onMouseLeave={e => ((e.target as HTMLAnchorElement).style.color = C.muted)}>
                  How it works <ArrowRight size={13} />
                </a>
              </div>
            </div>

            {/* Right col: contract card (desktop only) */}
            <div className="hidden md:block md:col-span-5">
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', background: 'white' }}>
                <div style={{ padding: '12px 20px', background: C.bgAlt, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  <span style={{ ...T.label, color: C.muted }}>CONTRACT LIVE</span>
                </div>
                {[
                  ['Contract',    'FlowPay MeteredEscrow'],
                  ['Network',     'Arc Testnet (5042002)'],
                  ['Token',       'USDC / ERC-20 / 6 dec'],
                  ['Signing',     'EIP-712 typed data'],
                  ['Settlement',  'Nonce-ordered receipts'],
                  ['Refund',      'Trustless after grace'],
                  ['Fees',        'None (gas only)'],
                  ['Upgradeable', 'No proxy, immutable'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 20px', borderBottom: `1px solid ${C.border}`, gap: 12 }}>
                    <span style={{ ...T.caption, flexShrink: 0 }}>{k}</span>
                    <span style={{ ...T.mono, textAlign: 'right' as const }}>{v}</span>
                  </div>
                ))}
                <div style={{ padding: '10px 20px', background: C.bgAlt }}>
                  <a href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...T.label, color: C.blue, textDecoration: 'none', letterSpacing: '0.04em' }}>
                    {METERED_ESCROW.address.slice(0, 18)}...{METERED_ESCROW.address.slice(-6)}
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Wrap>

        {/* Stat strip */}
        <Rule />
        <Wrap>
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              { n: '0%',   label: 'Protocol fees',       sub: 'Gas is cents on Arc' },
              { n: '<1s',  label: 'Transaction finality', sub: 'Sub-second blocks' },
              { n: '3',    label: 'Stream instruments',   sub: 'One shared contract' },
              { n: '100%', label: 'Self-custodied',       sub: 'Funds in the contract' },
            ].map(({ n, label, sub }, i) => (
              <div key={label} style={{
                padding: 'clamp(24px,3vw,36px) 0',
                paddingLeft: i % 2 !== 0 ? 'clamp(16px,3vw,40px)' : 0,
                borderLeft: i % 2 !== 0 ? `1px solid ${C.border}` : 'none',
              }}
              className={i >= 2 ? 'border-t md:border-t-0' : ''}
              >
                <p style={{ fontFamily: serif, fontSize: 'clamp(28px,3.5vw,48px)', fontWeight: 400, color: C.ink, margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>{n}</p>
                <p style={{ ...T.caption, fontWeight: 600, color: C.ink2, marginTop: 8, marginBottom: 2 }}>{label}</p>
                <p style={{ ...T.caption, color: C.muted, margin: 0 }}>{sub}</p>
              </div>
            ))}
          </div>
        </Wrap>
        <Rule />
      </section>

      {/* ── PROTOCOL ────────────────────────────────────────────────────────── */}
      <section id="protocol">
        <Wrap style={{ paddingTop: 80, paddingBottom: 80 }}>
          <Eyebrow>Protocol</Eyebrow>
          <div className="grid md:grid-cols-12" style={{ gap: 'clamp(32px,5vw,64px)', alignItems: 'start' }}>

            {/* Left: sticky heading + body */}
            <div className="md:col-span-4" style={{ position: 'sticky', top: 72 }}>
              <h2 style={{ ...T.h2, margin: '0 0 20px' }}>
                Atomic.<br />
                <em style={{ fontStyle: 'italic', color: C.ink2 }}>Trustless.</em>
              </h2>
              <p style={{ ...T.body, margin: '0 0 20px' }}>
                Both parties sign EIP-712 typed messages before a single dollar moves.
                Each signature commits to the deal ID, buyer, seller, price per unit, maximum units, term end, and grace period.
              </p>
              <p style={{ ...T.body, margin: 0 }}>
                Settlement receipts carry a strictly increasing nonce. Replaying or skipping a receipt reverts at the EVM level. Unused funds return automatically once the grace period expires.
              </p>
            </div>

            {/* Right: diagram + step cards */}
            <div className="md:col-span-8">
              <div style={{ marginBottom: 40 }}>
                <FlowDiagram />
              </div>
              {/* 5-step grid matching the diagram */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, background: C.border, borderRadius: 10, overflow: 'hidden' }}>
                {[
                  { n: '01', title: 'Both parties sign typed terms',       body: 'The payer and recipient each call signTypedData on the EIP-712 Terms struct, committing to price, unit cap, and deadline before any USDC moves.' },
                  { n: '02', title: 'Payer approves and deposits USDC',    body: 'The payer calls ERC-20 approve then createAndFundDeal. USDC transfers into the contract itself, not into any wallet FlowPay controls.' },
                  { n: '03', title: 'Recipient delivers and submits proof', body: 'After each pay period, tranche, or milestone the recipient submits a signed Acceptance struct. The contract verifies nonce order before releasing funds.' },
                  { n: '04', title: 'Payer co-signs to release funds',     body: 'For milestone and payroll streams the payer co-signs each Acceptance. The EVM verifies both signatures. Neither party can skip a step.' },
                  { n: '05', title: 'Unused balance returns automatically', body: 'Once term end plus grace period passes, the payer calls refundUnused. No seller signature required. The contract sends remaining USDC back in one call.' },
                ].map(({ n, title, body }) => (
                  <div key={n} style={{ background: 'white', padding: '20px 22px', minHeight: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                      <span style={{ ...T.label, color: C.subtle, flexShrink: 0 }}>{n}</span>
                      <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.ink }}>{title}</span>
                    </div>
                    <p style={{ ...T.caption, lineHeight: 1.72, margin: 0 }}>{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Wrap>
      </section>

      <Rule />

      {/* ── USE CASES ───────────────────────────────────────────────────────── */}
      <section id="use-cases" style={{ background: C.bgAlt }}>
        <Wrap style={{ paddingTop: 80, paddingBottom: 80 }}>
          <Eyebrow>Use cases</Eyebrow>

          {/* Full-width heading + subtext row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 32, marginBottom: 48, alignItems: 'end' }}>
            <h2 style={{ ...T.h2, margin: 0 }}>
              Where FlowPay<br />
              <em style={{ fontStyle: 'italic', color: C.ink2 }}>replaces trust.</em>
            </h2>
            <p style={{ ...T.body, margin: 0, maxWidth: 480 }}>
              Any situation where one party pays another over time, and both need a guarantee the contract will be honored, is a candidate for FlowPay. No lawyers, no escrow agents, no payment processors.
            </p>
          </div>

          {/* Use case rows + comparison side by side on desktop */}
          <div className="grid md:grid-cols-2" style={{ gap: 24, marginBottom: 40 }}>
            {/* Persona rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: C.border, borderRadius: 10, overflow: 'hidden' }}>
              {[
                { who: 'Remote contractor',     what: 'Employer locks 6 months salary. Contractor claims monthly.', tag: 'Payroll', tagColor: C.blue, tagBorder: '#bfdbfe', tagBg: '#eff6ff' },
                { who: 'Token grant recipient', what: 'Company locks USDC grant. Vesting runs 4 years with 1-year cliff.', tag: 'Vesting', tagColor: C.purple, tagBorder: '#ddd6fe', tagBg: '#f5f3ff' },
                { who: 'Freelance developer',   what: 'Client locks full project budget. Paid per delivered milestone.', tag: 'Milestone', tagColor: C.amber, tagBorder: '#fcd34d', tagBg: '#fffbeb' },
                { who: 'AI agent service',      what: 'API buyer locks a budget. Agent claims per successful call.', tag: 'Milestone', tagColor: C.amber, tagBorder: '#fcd34d', tagBg: '#fffbeb' },
                { who: 'DAO contributor',       what: 'DAO locks bounty. Contributor claims on completion; DAO signs off.', tag: 'Milestone', tagColor: C.amber, tagBorder: '#fcd34d', tagBg: '#fffbeb' },
                { who: 'Advisor',               what: 'Company locks advisory fee. Advisor claims each quarter.', tag: 'Payroll', tagColor: C.blue, tagBorder: '#bfdbfe', tagBg: '#eff6ff' },
              ].map(({ who, what, tag, tagColor, tagBorder, tagBg }) => (
                <div key={who} style={{ background: 'white', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 2px' }}>{who}</p>
                    <p style={{ ...T.caption, margin: 0 }}>{what}</p>
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.1em', color: tagColor, border: `1px solid ${tagBorder}`, background: tagBg, borderRadius: 4, padding: '3px 7px', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                    {tag.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>

            {/* Comparison — stacked cards on mobile, mini table on desktop */}
            <div>
              <div style={{ background: 'white', borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                  <h3 style={{ ...T.h3, fontSize: 14, fontWeight: 600, margin: 0 }}>FlowPay vs. the alternatives</h3>
                </div>

                {/* Mobile: stacked comparison cards */}
                <div className="flex md:hidden" style={{ flexDirection: 'column', gap: 1, background: C.border }}>
                  {[
                    { feature: 'Self-custodied funds',         vals: { FlowPay: true,  'Bank wire': false, Stripe: false, 'Legal escrow': false, Multisig: false } },
                    { feature: 'No intermediary',              vals: { FlowPay: true,  'Bank wire': false, Stripe: false, 'Legal escrow': false, Multisig: true  } },
                    { feature: 'Automatic refund path',        vals: { FlowPay: true,  'Bank wire': false, Stripe: false, 'Legal escrow': false, Multisig: false } },
                    { feature: 'Cryptographic release proof',  vals: { FlowPay: true,  'Bank wire': false, Stripe: false, 'Legal escrow': false, Multisig: true  } },
                    { feature: 'Zero platform fees',           vals: { FlowPay: true,  'Bank wire': false, Stripe: false, 'Legal escrow': false, Multisig: true  } },
                    { feature: 'Works globally, instantly',    vals: { FlowPay: true,  'Bank wire': false, Stripe: true,  'Legal escrow': false, Multisig: true  } },
                  ].map(({ feature, vals }) => (
                    <div key={feature} style={{ background: 'white', padding: '12px 20px' }}>
                      <p style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.ink, margin: '0 0 8px' }}>{feature}</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                        {Object.entries(vals).map(([name, v]) => (
                          <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: v ? C.green : C.subtle }}>
                            {v ? <Check size={11} /> : <X size={11} />}
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: full table */}
                <div className="hidden md:block" style={{ overflowX: 'auto' as const }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontFamily: sans, fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {['', 'FlowPay', 'Bank wire', 'Stripe', 'Legal escrow', 'Multisig'].map((h, i) => (
                          <th key={h} style={{ padding: '9px 14px', textAlign: i === 0 ? 'left' as const : 'center' as const, ...T.label, color: C.muted, fontWeight: 600, background: C.bgAlt }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Self-custodied funds',        vals: [true, false, false, false, false] },
                        { label: 'No intermediary required',    vals: [true, false, false, false, true ] },
                        { label: 'Automatic refund path',       vals: [true, false, false, false, false] },
                        { label: 'Cryptographic release proof', vals: [true, false, false, false, true ] },
                        { label: 'Zero platform fees',          vals: [true, false, false, false, true ] },
                        { label: 'Permissionless deployment',   vals: [true, false, false, false, false] },
                        { label: 'Works globally, instantly',   vals: [true, false, true,  false, true ] },
                      ].map(({ label, vals }, ri) => (
                        <tr key={label} style={{ borderBottom: ri < 6 ? `1px solid ${C.border}` : 'none' }}>
                          <td style={{ padding: '10px 14px', fontFamily: sans, fontSize: 12, fontWeight: 500, color: C.ink2 }}>{label}</td>
                          {vals.map((v, ci) => (
                            <td key={ci} style={{ padding: '10px 14px', textAlign: 'center' as const }}>
                              {v ? <Check size={13} style={{ color: C.green, display: 'inline-block' }} /> : <X size={13} style={{ color: '#d1d5db', display: 'inline-block' }} />}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </Wrap>
      </section>

      <Rule />

      {/* ── STREAMS ─────────────────────────────────────────────────────────── */}
      <section id="streams">
        <Wrap style={{ paddingTop: 80, paddingBottom: 80 }}>
          <Eyebrow>Stream instruments</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 24, marginBottom: 16 }}>
            <h2 style={{ ...T.h2, margin: 0 }}>
              One contract,<br />
              <em style={{ fontStyle: 'italic', color: C.ink2 }}>three instruments.</em>
            </h2>
          </div>

          {/* Three stream cards: equal height, aligned rows */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 1, background: C.border, borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            {[
              {
                n: 'I',   type: 'Payroll',             sub: 'RECURRING SALARY STREAM',
                accent: C.blue,   accentLight: '#eff6ff', accentBorder: '#bfdbfe',
                desc: 'The payer locks a fixed number of pay periods upfront. At the end of each period the employee submits a signed receipt and claims exactly one unit. Unused periods refund to the payer automatically after the grace window.',
                rows: [
                  ['Unit',           '1 pay period'],
                  ['Price per unit',  'Monthly salary in USDC'],
                  ['Typical cap',     '3 to 12 months'],
                  ['Grace period',    '30 days'],
                  ['Refund path',     'Auto after term + grace'],
                ],
                eg: '12 months x $4,000/mo = $48,000 locked',
              },
              {
                n: 'II',  type: 'Vesting',             sub: 'LINEAR USDC GRANT',
                accent: C.purple, accentLight: '#f5f3ff', accentBorder: '#ddd6fe',
                desc: 'The grantor locks the full USDC amount on day one. Vesting runs in tranches over months or years, with an optional cliff. The beneficiary claims after each tranche date. The grantor can halt future tranches without touching already-vested funds.',
                rows: [
                  ['Unit',           '1 vesting tranche'],
                  ['Price per unit',  'Grant divided by tranches'],
                  ['Typical cap',     '12 to 48 tranches'],
                  ['Cliff support',   'Set start date beyond day one'],
                  ['Cancellation',   'Grantor can close; past tranches safe'],
                ],
                eg: '$100,000 over 4 years = 16 x $6,250',
              },
              {
                n: 'III', type: 'Milestone Payments',  sub: 'DELIVERABLE-GATED RELEASES',
                accent: C.amber,  accentLight: '#fffbeb', accentBorder: '#fcd34d',
                desc: 'The client locks the full project budget before work begins. After each milestone is delivered, the contractor submits a signed receipt and the client co-signs to acknowledge delivery. Only co-signed milestones release funds.',
                rows: [
                  ['Unit',           '1 delivered milestone'],
                  ['Price per unit',  'Milestone value in USDC'],
                  ['Typical cap',     '3 to 10 milestones'],
                  ['Release trigger', 'Both parties sign receipt'],
                  ['Refund path',     'Auto after deadline + grace'],
                ],
                eg: '5 milestones x $2,000 = $10,000 project',
              },
            ].map(({ n, type, sub, accent, accentLight, accentBorder, desc, rows, eg }) => (
              <div key={type} style={{ background: 'white', padding: '28px 24px', display: 'flex', flexDirection: 'column' }}>
                {/* Title */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 13, color: C.muted }}>{n}</span>
                    <span style={{ fontFamily: serif, fontSize: 21, color: C.ink }}>{type}</span>
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.1em', color: accent, border: `1px solid ${accentBorder}`, background: accentLight, borderRadius: 4, padding: '3px 7px' }}>
                    {sub}
                  </span>
                </div>

                <Rule style={{ marginBottom: 16 }} />

                {/* Description */}
                <p style={{ ...T.caption, lineHeight: 1.75, margin: '0 0 20px', flex: 1 }}>{desc}</p>

                {/* Key-value rows — consistent height across cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: `1px solid ${C.border}`, marginBottom: 16 }}>
                  {rows.map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${C.border}`, minHeight: 36 }}>
                      <span style={{ ...T.caption, flexShrink: 0 }}>{k}</span>
                      <span style={{ fontFamily: mono, fontSize: 10, color: C.ink2, textAlign: 'right' as const, wordBreak: 'break-word' as const }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Example */}
                <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 12, paddingTop: 4, paddingBottom: 4, background: accentLight, borderRadius: '0 6px 6px 0' }}>
                  <span style={{ fontFamily: mono, fontSize: 10, color: C.ink2 }}>{eg}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Vesting chart */}
          <div style={{ background: 'white', borderRadius: 12, border: `1px solid ${C.border}`, padding: '24px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <div>
                <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 2px' }}>Vesting schedule visualised</p>
                <p style={{ ...T.caption, margin: 0 }}>16-month grant with 4-month cliff then linear vesting</p>
              </div>
              <Tag>CLIFF + LINEAR</Tag>
            </div>
            <VestingChart />
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
              {[
                { swatch: <div style={{ width: 12, height: 12, borderRadius: 2, background: C.blue }} />, label: 'Vested' },
                { swatch: <div style={{ width: 12, height: 3, background: C.amber, borderRadius: 1, marginTop: 4 }} />, label: 'Cliff date' },
                { swatch: <div style={{ width: 12, height: 12, borderRadius: 2, background: C.border }} />, label: 'Locked' },
              ].map(({ swatch, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {swatch}
                  <span style={{ ...T.caption }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      <Rule />

      {/* ── SECURITY ────────────────────────────────────────────────────────── */}
      <section id="security" style={{ background: C.bgAlt }}>
        <Wrap style={{ paddingTop: 80, paddingBottom: 80 }}>
          <Eyebrow>Security</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 32, marginBottom: 40, alignItems: 'end' }}>
            <h2 style={{ ...T.h2, margin: 0 }}>
              Audited.<br />
              <em style={{ fontStyle: 'italic', color: C.ink2 }}>Self-custody.</em>
            </h2>
            <div>
              <p style={{ ...T.body, margin: '0 0 16px' }}>
                Deployed as immutable bytecode. FlowPay holds no admin key, runs no upgradeability proxy, and cannot alter the contract after your signatures are recorded on-chain.
              </p>
              <p style={{ ...T.body, margin: 0 }}>
                All guards are standard OpenZeppelin. The pause capability is preserved by disabling renounceOwnership, so an emergency stop is always possible without introducing an upgrade path.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: C.border, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
            {[
              { code: '01', title: 'No upgradeable proxy',                       body: 'The contract is deployed as plain bytecode with no EIP-1967 proxy and no admin slot. FlowPay cannot change the settlement logic, fee structure, or refund path after deployment.' },
              { code: '02', title: 'Strictly-increasing nonces',                  body: 'Every Acceptance struct carries a nonce that must exceed the previous settlement nonce for that deal. Replay attacks, double-claims, and out-of-order settlements revert at the EVM level before any token transfer occurs.' },
              { code: '03', title: 'Trustless refund path',                       body: 'Once term end plus grace period passes, the payer calls refundUnused with no signature from the seller. The function checks block.timestamp, transfers remaining USDC to the buyer, and closes the deal in a single call.' },
              { code: '04', title: 'ReentrancyGuard on all state-changing calls', body: 'createAndFundDeal, settleAcceptedUsage, sellerCloseTerm, and refundUnused all carry the nonReentrant modifier. Cross-contract re-entrancy during USDC transfers cannot manipulate deal state.' },
              { code: '05', title: 'Pausable with preserved ownership',           body: 'An emergency pause halts all state-changing functions. renounceOwnership is overridden to revert, preventing the owner from accidentally surrendering the pause capability permanently.' },
            ].map(({ code, title, body }) => (
              <div key={code} style={{ background: 'white', padding: '18px 22px', display: 'flex', gap: 20, alignItems: 'start' }}>
                <span style={{ ...T.label, color: C.subtle, paddingTop: 2, flexShrink: 0 }}>{code}</span>
                <div>
                  <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 6px' }}>{title}</p>
                  <p style={{ ...T.caption, lineHeight: 1.72, margin: 0 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contract address strip */}
          <div style={{ padding: '14px 20px', background: 'white', border: `1px solid ${C.border}`, borderRadius: 8, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <p style={{ ...T.caption, margin: '0 0 3px' }}>FlowPay MeteredEscrow / Arc Testnet</p>
              <p style={{ fontFamily: mono, fontSize: 11, color: C.ink2, margin: 0, wordBreak: 'break-all' as const }}>{METERED_ESCROW.address}</p>
            </div>
            <a href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...T.caption, fontWeight: 600, color: C.blue, textDecoration: 'none', minHeight: 44, flexShrink: 0 }}>
              View on explorer <ExternalLink size={11} />
            </a>
          </div>
        </Wrap>
      </section>

      <Rule />

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section>
        <Wrap style={{ paddingTop: 80, paddingBottom: 80 }}>
          <Eyebrow>Common questions</Eyebrow>
          {/* Full-width heading row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 32, marginBottom: 40, alignItems: 'end' }}>
            <h2 style={{ ...T.h2, margin: 0 }}>
              What you<br />
              <em style={{ fontStyle: 'italic', color: C.ink2 }}>should know.</em>
            </h2>
            <p style={{ ...T.body, margin: 0 }}>
              Practical answers about fund safety, seller protections, and the contract design.
            </p>
          </div>

          {/* Two-column FAQ grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 1, background: C.border, borderRadius: 10, overflow: 'hidden' }}>
            {[
              { q: 'Can the seller take more than was agreed?',        a: 'No. The contract enforces a maximum unit cap. Even if the seller submits a receipt with a higher unit count, the contract reverts. The maximum total payout is unitPrice multiplied by maxUnits, set at signing time.' },
              { q: 'What happens if the buyer disappears after funding?', a: 'The seller can close the deal early by calling sellerCloseTerm, which settles all verified usage to date and returns the remainder to the buyer. The seller is never stuck waiting for buyer action to get paid.' },
              { q: 'What if the seller never delivers?',               a: 'The buyer calls refundUnused after term end plus the grace period. No seller signature needed. The full unspent balance returns to the buyer in one transaction.' },
              { q: 'Is the contract audited?',                         a: 'The contract has been reviewed with Slither static analysis and a balanced security audit covering reentrancy, access control, signature malleability, and nonce ordering. The audit report is available in the repository.' },
              { q: 'What is the grace period for?',                    a: 'The grace period gives the seller time to submit any final receipts after the term ends. Once the grace period expires, the refund path opens. Typical grace periods are 7 to 30 days depending on the stream type.' },
              { q: 'Can I use FlowPay on mainnet?',                    a: 'The contract is currently deployed on Arc Testnet. A mainnet deployment requires an independent security audit and Circle account upgrade. The contract code is the same on both networks.' },
            ].map(({ q, a }, i) => (
              <div key={i} style={{ background: 'white', padding: '20px 22px' }}>
                <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 8px' }}>{q}</p>
                <p style={{ ...T.caption, lineHeight: 1.72, margin: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </Wrap>
      </section>

      <Rule />

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section style={{ background: C.bgDark }}>
        <Wrap style={{ paddingTop: 88, paddingBottom: 88, textAlign: 'center' as const, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          <span style={{ ...T.label, color: 'rgba(255,255,255,0.4)', marginBottom: 24, display: 'block' }}>GET STARTED</span>
          <h2 style={{ fontFamily: serif, fontSize: 'clamp(30px,3.5vw,54px)', fontWeight: 400, letterSpacing: '-0.025em', color: '#f5f4f0', margin: '0 0 16px', lineHeight: 1.1 }}>
            Set up your first stream<br />
            <em style={{ fontStyle: 'italic', color: 'rgba(245,244,240,0.55)' }}>in two minutes.</em>
          </h2>
          <p style={{ fontFamily: sans, fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 380, margin: '0 0 40px' }}>
            Connect a wallet, choose a stream type, sign the terms, and lock your USDC.
          </p>
          {/* Centered CTA group */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
            <ConnectKitButton label="Connect wallet to start" />
            <a href="#protocol"
              style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', minHeight: 44, display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseEnter={e => ((e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.8)')}
              onMouseLeave={e => ((e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.5)')}>
              How it works <ArrowRight size={13} />
            </a>
          </div>
        </Wrap>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, background: C.bg }}>
        <Wrap style={{ paddingTop: 24, paddingBottom: 24 }}>
          {/* Top row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: serif, fontSize: 16, color: C.ink }}>FlowPay</span>
              <span style={{ width: 1, height: 12, background: C.border, display: 'inline-block' }} />
              <span style={{ ...T.caption, color: C.muted }}>USDC streams on Arc Testnet</span>
            </div>
            {/* Footer links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Protocol', href: '#protocol' },
                { label: 'GitHub', href: 'https://github.com/Adityaakr/pro-escrow', external: true },
                { label: 'Terms', href: '#' },
              ].map(({ label, href, external }) => (
                <a key={label} href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  style={{ ...T.caption, color: C.muted, textDecoration: 'none', minHeight: 44, display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => ((e.target as HTMLAnchorElement).style.color = C.ink)}
                  onMouseLeave={e => ((e.target as HTMLAnchorElement).style.color = C.muted)}>
                  {label}
                </a>
              ))}
            </div>
          </div>
          {/* Bottom row: contract address */}
          <Rule style={{ marginBottom: 12 }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <a href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: mono, fontSize: 10, color: C.subtle, textDecoration: 'none', letterSpacing: '0.04em', minHeight: 40 }}>
              {METERED_ESCROW.address}
              <ExternalLink size={9} />
            </a>
            <span style={{ ...T.caption, color: C.subtle }}>Arc Testnet (5042002)</span>
          </div>
        </Wrap>
      </footer>

    </div>
  )
}
