import { ConnectKitButton } from 'connectkit'
import { ExternalLink, ArrowRight, Check, X } from 'lucide-react'
import { ARC_TESTNET_EXPLORER, METERED_ESCROW } from '@/contract'

const serif = 'Instrument Serif, Georgia, serif'
const sans  = 'Inter, DM Sans, sans-serif'
const mono  = 'JetBrains Mono, Menlo, monospace'

const C = {
  bg:     '#fafaf9',
  bgAlt:  '#f5f4f0',
  bgDark: '#111110',
  border: '#e8e6e0',
  ink:    '#111110',
  ink2:   '#3d3c38',
  muted:  '#78776e',
  subtle: '#a8a49c',
  blue:   '#1d4ed8',
  purple: '#5b21b6',
  amber:  '#92400e',
  green:  '#15803d',
  red:    '#991b1b',
}

function Divider({ style }: { style?: React.CSSProperties }) {
  return <div style={{ height: 1, background: C.border, ...style }} />
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: mono, fontSize: 10, letterSpacing: '0.1em',
      textTransform: 'uppercase' as const, color: C.muted,
      padding: '3px 8px', border: `1px solid ${C.border}`,
      borderRadius: 4, display: 'inline-block',
    }}>{children}</span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
      <div style={{ width: 24, height: 1, background: C.subtle }} />
      <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', color: C.muted, textTransform: 'uppercase' as const }}>{children}</span>
    </div>
  )
}

function FlowDiagram() {
  const steps = [
    { label: 'Sign terms',     sub: 'EIP-712' },
    { label: 'Deposit USDC',   sub: 'On-chain' },
    { label: 'Deliver work',   sub: 'Off-chain' },
    { label: 'Settle',         sub: 'On-chain' },
    { label: 'Refund unused',  sub: 'Automatic' },
  ]
  const W = 640, nodeY = 32
  const gap = W / (steps.length - 1)
  return (
    <svg viewBox={`0 0 ${W} 88`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      <line x1={gap * 0.15} y1={nodeY} x2={gap * 0.85} y2={nodeY} stroke={C.border} strokeWidth="1" />
      <line x1={gap * 1.15} y1={nodeY} x2={gap * 1.85} y2={nodeY} stroke={C.border} strokeWidth="1" />
      <line x1={gap * 2.15} y1={nodeY} x2={gap * 2.85} y2={nodeY} stroke={C.border} strokeWidth="1" />
      <line x1={gap * 3.15} y1={nodeY} x2={gap * 3.85} y2={nodeY} stroke={C.border} strokeWidth="1" />
      {steps.map((s, i) => (
        <g key={s.label}>
          <circle cx={i * gap} cy={nodeY} r="7" fill="white" stroke={C.ink2} strokeWidth="1.5" />
          <text x={i * gap} y={nodeY + 4} textAnchor="middle"
            style={{ fontFamily: mono, fontSize: 8, fill: C.ink, letterSpacing: '0.02em', fontWeight: 600 }}>
            {String(i + 1).padStart(2, '0')}
          </text>
          <text x={i * gap} y={nodeY + 26} textAnchor="middle"
            style={{ fontFamily: sans, fontSize: 11, fill: C.ink2, fontWeight: 500 }}>
            {s.label}
          </text>
          <text x={i * gap} y={nodeY + 40} textAnchor="middle"
            style={{ fontFamily: mono, fontSize: 9, fill: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {s.sub}
          </text>
        </g>
      ))}
    </svg>
  )
}

function VestingChart() {
  const months = Array.from({ length: 16 }, (_, i) => ({ m: i + 1, vested: i < 4 ? 0 : i < 8 ? (i - 3) * 0.25 : 1 }))
  const W = 560, H = 80, pad = 4
  const bw = (W - pad * (months.length - 1)) / months.length
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: '100%', display: 'block' }}>
      {months.map(({ m, vested }, i) => {
        const x = i * (bw + pad)
        const bh = Math.max(vested * H, vested > 0 ? 3 : 0)
        const baseH = 3
        return (
          <g key={m}>
            <rect x={x} y={H - baseH} width={bw} height={baseH} rx="1" fill={C.border} />
            {vested > 0 && <rect x={x} y={H - bh} width={bw} height={bh} rx="1" fill={i < 8 ? '#93c5fd' : C.blue} />}
            {m % 4 === 0 && (
              <text x={x + bw / 2} y={H + 16} textAnchor="middle"
                style={{ fontFamily: mono, fontSize: 8, fill: C.muted }}>
                M{m}
              </text>
            )}
          </g>
        )
      })}
      <line x1={(3 + 0.5) * (bw + pad)} y1="0" x2={(3 + 0.5) * (bw + pad)} y2={H}
        stroke={C.amber} strokeWidth="1" strokeDasharray="4 3" />
      <text x={(3 + 0.5) * (bw + pad) + 4} y="12"
        style={{ fontFamily: mono, fontSize: 8, fill: C.amber, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        CLIFF
      </text>
    </svg>
  )
}

export function LandingPage() {
  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: '100dvh', fontFamily: sans }}>

      {/* NAV */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, background: C.bg, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 40px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: serif, fontSize: 20, color: C.ink, letterSpacing: '-0.01em' }}>FlowPay</span>
          <div className="hidden md:flex items-center" style={{ gap: 36 }}>
            {['Protocol', 'Use cases', 'Streams', 'Security'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`}
                style={{ fontFamily: sans, fontSize: 13, color: C.muted, textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
          <ConnectKitButton label="Open app" />
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '0 40px' }}>
        <div style={{ paddingTop: 100, paddingBottom: 72 }}>
          <div className="grid md:grid-cols-12" style={{ gap: 0, alignItems: 'start' }}>
            <div className="md:col-span-7" style={{ paddingRight: 80 }}>
              <div style={{ marginBottom: 32 }}>
                <Tag>Live on Arc Testnet</Tag>
              </div>
              <h1 style={{ fontFamily: serif, fontSize: 'clamp(44px, 5vw, 80px)', fontWeight: 400, lineHeight: 1.04, letterSpacing: '-0.025em', color: C.ink, margin: '0 0 32px' }}>
                On-chain payroll,<br />
                vesting schedules,<br />
                <span style={{ fontStyle: 'italic', color: C.ink2 }}>and milestone payments.</span>
              </h1>
              <p style={{ fontFamily: sans, fontSize: 16, lineHeight: 1.8, color: C.muted, maxWidth: 480, marginBottom: 16 }}>
                FlowPay lets any two parties lock USDC into a smart contract and release it incrementally as obligations are met.
              </p>
              <p style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.8, color: C.muted, maxWidth: 480, marginBottom: 44 }}>
                No intermediary holds the funds. No approval is needed to claim what is already yours. Every payment is a signed, auditable transaction on Arc.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <ConnectKitButton label="Connect wallet to start" />
                <a href="#protocol" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 13, color: C.muted, textDecoration: 'none' }}>
                  How it works <ArrowRight size={13} />
                </a>
              </div>
            </div>
            <div className="hidden md:block md:col-span-5">
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', background: 'white' }}>
                <div style={{ padding: '14px 20px', background: C.bgAlt, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  <span style={{ fontFamily: mono, fontSize: 10, color: C.muted, letterSpacing: '0.08em' }}>CONTRACT LIVE</span>
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
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{k}</span>
                    <span style={{ fontFamily: mono, fontSize: 11, color: C.ink2 }}>{v}</span>
                  </div>
                ))}
                <div style={{ padding: '12px 20px', background: C.bgAlt }}>
                  <a href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: mono, fontSize: 10, color: C.blue, textDecoration: 'none', letterSpacing: '0.04em' }}>
                    {METERED_ESCROW.address.slice(0, 18)}...{METERED_ESCROW.address.slice(-6)}
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <Divider />
        <div className="grid grid-cols-2 md:grid-cols-4">
          {[
            { n: '0%',   label: 'Protocol fees',       sub: 'Gas is cents on Arc' },
            { n: '<1s',  label: 'Transaction finality', sub: 'Arc sub-second blocks' },
            { n: '3',    label: 'Stream instruments',   sub: 'One shared contract' },
            { n: '100%', label: 'Self-custodied',       sub: 'Funds in the contract' },
          ].map(({ n, label, sub }, i) => (
            <div key={label} style={{ padding: '36px 0', paddingLeft: i > 0 ? 40 : 0, borderLeft: i > 0 ? `1px solid ${C.border}` : 'none' }}>
              <p style={{ fontFamily: serif, fontSize: 'clamp(32px, 3.5vw, 52px)', fontWeight: 400, color: C.ink, margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>{n}</p>
              <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: C.ink2, marginTop: 8 }}>{label}</p>
              <p style={{ fontFamily: sans, fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</p>
            </div>
          ))}
        </div>
        <Divider />
      </section>

      {/* PROTOCOL */}
      <section id="protocol" style={{ maxWidth: 1160, margin: '0 auto', padding: '88px 40px' }}>
        <SectionLabel>Protocol</SectionLabel>
        <div className="grid md:grid-cols-12" style={{ gap: 64, alignItems: 'start' }}>
          <div className="md:col-span-4">
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(28px, 2.8vw, 44px)', fontWeight: 400, letterSpacing: '-0.02em', color: C.ink, margin: '0 0 20px', lineHeight: 1.15 }}>
              Atomic.<br />
              <span style={{ fontStyle: 'italic', color: C.ink2 }}>Trustless.</span>
            </h2>
            <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.8, color: C.muted, margin: '0 0 20px' }}>
              Both parties sign EIP-712 typed messages before a single dollar moves.
              Each signature commits to: the deal ID, buyer address, seller address, price per unit, maximum units, term end, and grace period.
            </p>
            <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.8, color: C.muted, margin: 0 }}>
              Settlement receipts carry a strictly increasing nonce. Replaying or skipping a receipt reverts at the EVM level. Unused funds return automatically once the grace period expires.
            </p>
          </div>
          <div className="md:col-span-8">
            <div style={{ marginBottom: 40 }}>
              <FlowDiagram />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: C.border, borderRadius: 10, overflow: 'hidden' }}>
              {[
                { n: '01', title: 'Both parties sign typed terms', body: 'The payer and recipient each call signTypedData on the EIP-712 Terms struct. This commits both parties to the exact price, unit cap, and deadline before any USDC moves.' },
                { n: '02', title: 'Payer approves and deposits USDC', body: 'The payer calls ERC-20 approve then createAndFundDeal on the contract. USDC transfers into the contract address itself, not into any wallet FlowPay controls.' },
                { n: '03', title: 'Recipient submits signed receipts', body: 'After each pay period, tranche, or milestone, the recipient submits an Acceptance struct signed by both parties. The contract verifies nonce order and releases exactly that amount.' },
                { n: '04', title: 'Unused balance returns automatically', body: 'Once the term end plus grace period passes, the payer calls refundUnused. No signature from the seller required. The contract sends the remaining USDC back.' },
              ].map(({ n, title, body }) => (
                <div key={n} style={{ background: 'white', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontFamily: mono, fontSize: 10, color: C.muted, letterSpacing: '0.08em', flexShrink: 0 }}>{n}</span>
                    <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.ink }}>{title}</span>
                  </div>
                  <p style={{ fontFamily: sans, fontSize: 12, lineHeight: 1.72, color: C.muted, margin: 0 }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* USE CASES */}
      <section id="use-cases" style={{ background: C.bgAlt }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '88px 40px' }}>
          <SectionLabel>Use cases</SectionLabel>
          <div className="grid md:grid-cols-2" style={{ gap: 64, marginBottom: 64 }}>
            <div>
              <h2 style={{ fontFamily: serif, fontSize: 'clamp(28px, 2.8vw, 44px)', fontWeight: 400, letterSpacing: '-0.02em', color: C.ink, margin: '0 0 20px', lineHeight: 1.15 }}>
                Where FlowPay<br />
                <span style={{ fontStyle: 'italic', color: C.ink2 }}>replaces trust.</span>
              </h2>
              <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.8, color: C.muted, margin: 0 }}>
                Any situation where one party pays another over time, and both need a guarantee that the contract will be honored, is a candidate for FlowPay.
                No lawyers, no escrow agents, no payment processors.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: C.border, borderRadius: 10, overflow: 'hidden' }}>
              {[
                { who: 'Remote contractor',     what: 'Employer locks 6 months salary. Contractor claims monthly.', tag: 'Payroll' },
                { who: 'Token grant recipient', what: 'Company locks USDC grant. Vesting runs for 4 years with 1-year cliff.', tag: 'Vesting' },
                { who: 'Freelance developer',   what: 'Client locks full project budget. Paid per delivered milestone.', tag: 'Milestone' },
                { who: 'AI agent service',      what: 'API buyer locks a budget. Agent claims per successful call.', tag: 'Milestone' },
                { who: 'DAO contributor',       what: 'DAO locks bounty. Contributor claims on completion, DAO signs off.', tag: 'Milestone' },
                { who: 'Advisor',               what: 'Company locks advisory fee. Advisor claims each quarter.', tag: 'Payroll' },
              ].map(({ who, what, tag }) => (
                <div key={who} style={{ background: 'white', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: C.ink, margin: '0 0 2px' }}>{who}</p>
                    <p style={{ fontFamily: sans, fontSize: 12, color: C.muted, margin: 0 }}>{what}</p>
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.1em', color: tag === 'Payroll' ? C.blue : tag === 'Vesting' ? C.purple : C.amber, border: `1px solid ${tag === 'Payroll' ? '#bfdbfe' : tag === 'Vesting' ? '#ddd6fe' : '#fcd34d'}`, borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                    {tag.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Why not alternatives */}
          <div style={{ background: 'white', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px', borderBottom: `1px solid ${C.border}` }}>
              <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 400, color: C.ink, margin: 0 }}>FlowPay vs. the alternatives</h3>
            </div>
            <div style={{ overflowX: 'auto' as const }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontFamily: sans, fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['', 'FlowPay', 'Bank wire', 'Stripe', 'Legal escrow', 'Multisig'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: i === 0 ? 'left' as const : 'center' as const, fontFamily: mono, fontSize: 10, letterSpacing: '0.08em', color: C.muted, fontWeight: 500, background: C.bgAlt }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Self-custodied funds',      vals: [true, false, false, false, false] },
                    { label: 'No intermediary required',  vals: [true, false, false, false, true] },
                    { label: 'Automatic refund path',     vals: [true, false, false, false, false] },
                    { label: 'Cryptographic release proof', vals: [true, false, false, false, true] },
                    { label: 'Zero platform fees',        vals: [true, false, false, false, true] },
                    { label: 'Permissionless deployment', vals: [true, false, false, false, false] },
                    { label: 'Works globally, instantly', vals: [true, false, true, false, true] },
                  ].map(({ label, vals }, ri) => (
                    <tr key={label} style={{ borderBottom: ri < 6 ? `1px solid ${C.border}` : 'none' }}>
                      <td style={{ padding: '11px 20px', fontFamily: sans, fontSize: 12, color: C.ink2, fontWeight: 500 }}>{label}</td>
                      {vals.map((v, ci) => (
                        <td key={ci} style={{ padding: '11px 20px', textAlign: 'center' as const }}>
                          {v
                            ? <Check size={13} style={{ color: C.green, display: 'inline-block' }} />
                            : <X size={13} style={{ color: '#d1d5db', display: 'inline-block' }} />
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* STREAMS */}
      <section id="streams" style={{ maxWidth: 1160, margin: '0 auto', padding: '88px 40px' }}>
        <SectionLabel>Stream instruments</SectionLabel>
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: serif, fontSize: 'clamp(28px, 2.8vw, 44px)', fontWeight: 400, letterSpacing: '-0.02em', color: C.ink, margin: 0, lineHeight: 1.15 }}>
            One contract,<br />
            <span style={{ fontStyle: 'italic', color: C.ink2 }}>three instruments.</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 1, background: C.border, borderRadius: 12, overflow: 'hidden', marginBottom: 40 }}>
          {[
            {
              n: 'I', type: 'Payroll', sub: 'Recurring salary stream',
              accent: C.blue, accentLight: '#eff6ff', border: '#bfdbfe',
              desc: 'The payer locks a fixed number of pay periods upfront. At the end of each period, the employee submits a signed receipt and claims exactly one unit. Unused periods refund to the payer automatically after the grace window.',
              rows: [
                ['Unit',          '1 pay period'],
                ['Price per unit', 'Monthly salary in USDC'],
                ['Typical cap',    '3 to 12 months'],
                ['Grace period',   '30 days'],
                ['Refund path',    'Automatic after term + grace'],
              ],
              eg: '12 months x $4,000 / mo = $48,000 locked',
            },
            {
              n: 'II', type: 'Vesting', sub: 'Linear USDC grant vesting',
              accent: C.purple, accentLight: '#f5f3ff', border: '#ddd6fe',
              desc: 'The grantor locks the full USDC amount on day one. Vesting runs in tranches over months or years, with an optional cliff before any tranche can be claimed. The beneficiary calls claim after each tranche date. The grantor can halt future tranches at any time without touching already-vested funds.',
              rows: [
                ['Unit',           '1 vesting tranche'],
                ['Price per unit',  'Total grant divided by tranches'],
                ['Typical cap',     '12 to 48 tranches over 1 to 4 years'],
                ['Cliff support',   'Set start date beyond day one'],
                ['Cancellation',   'Grantor can close; past tranches locked'],
              ],
              eg: '$100,000 over 4 years = 16 x $6,250',
            },
            {
              n: 'III', type: 'Milestone Payments', sub: 'Deliverable-gated releases',
              accent: C.amber, accentLight: '#fffbeb', border: '#fcd34d',
              desc: 'The client locks the full project budget before work begins. After each milestone is delivered, the contractor submits a signed receipt and the client co-signs to acknowledge delivery. Only co-signed milestones release funds. The remaining balance refunds to the client at the deadline.',
              rows: [
                ['Unit',            '1 delivered milestone'],
                ['Price per unit',  'Milestone value in USDC'],
                ['Typical cap',     '3 to 10 milestones'],
                ['Release trigger', 'Both parties sign the receipt'],
                ['Refund path',     'Automatic after deadline + grace'],
              ],
              eg: '5 milestones x $2,000 = $10,000 project',
            },
          ].map(({ n, type, sub, accent, accentLight, border, desc, rows, eg }) => (
            <div key={type} style={{ background: 'white', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 13, color: C.muted }}>{n}</span>
                  <span style={{ fontFamily: serif, fontSize: 22, color: C.ink }}>{type}</span>
                </div>
                <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.1em', color: accent, border: `1px solid ${border}`, background: accentLight, borderRadius: 4, padding: '2px 7px' }}>
                  {sub.toUpperCase()}
                </span>
              </div>
              <Divider />
              <p style={{ fontFamily: sans, fontSize: 13, lineHeight: 1.75, color: C.ink2, margin: 0 }}>{desc}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rows.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontFamily: sans, fontSize: 11, color: C.muted }}>{k}</span>
                    <span style={{ fontFamily: mono, fontSize: 11, color: C.ink2, textAlign: 'right' as const }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 14, paddingTop: 2, paddingBottom: 2, background: accentLight, borderRadius: '0 6px 6px 0' }}>
                <span style={{ fontFamily: mono, fontSize: 11, color: C.ink2 }}>{eg}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Vesting chart */}
        <div style={{ background: 'white', borderRadius: 12, border: `1px solid ${C.border}`, padding: '28px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 2px' }}>Vesting schedule visualised</p>
              <p style={{ fontFamily: sans, fontSize: 11, color: C.muted, margin: 0 }}>16-month grant with 4-month cliff then linear vesting</p>
            </div>
            <Tag>CLIFF + LINEAR</Tag>
          </div>
          <VestingChart />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: C.blue }} />
              <span style={{ fontFamily: sans, fontSize: 11, color: C.muted }}>Vested</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 3, background: C.amber, borderRadius: 1 }} />
              <span style={{ fontFamily: sans, fontSize: 11, color: C.muted }}>Cliff date</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: C.border }} />
              <span style={{ fontFamily: sans, fontSize: 11, color: C.muted }}>Locked</span>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* SECURITY */}
      <section id="security" style={{ background: C.bgAlt }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '88px 40px' }}>
          <SectionLabel>Security</SectionLabel>
          <div className="grid md:grid-cols-12" style={{ gap: 64, alignItems: 'start' }}>
            <div className="md:col-span-4">
              <h2 style={{ fontFamily: serif, fontSize: 'clamp(28px, 2.8vw, 44px)', fontWeight: 400, letterSpacing: '-0.02em', color: C.ink, margin: '0 0 20px', lineHeight: 1.15 }}>
                Audited.<br />
                <span style={{ fontStyle: 'italic', color: C.ink2 }}>Self-custody.</span>
              </h2>
              <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.8, color: C.muted, margin: '0 0 20px' }}>
                Deployed as immutable bytecode. FlowPay holds no admin key, runs no upgradeability proxy, and cannot alter the contract after your signatures are recorded on-chain.
              </p>
              <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.8, color: C.muted, margin: 0 }}>
                All guards are standard OpenZeppelin. The pause capability is preserved by disabling renounceOwnership, so an emergency stop is always possible without introducing an upgrade path.
              </p>
            </div>
            <div className="md:col-span-8">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: C.border, borderRadius: 10, overflow: 'hidden' }}>
                {[
                  {
                    code: '01', title: 'No upgradeable proxy',
                    body: 'The contract is deployed as plain bytecode with no EIP-1967 proxy and no admin slot. FlowPay cannot change the settlement logic, fee structure, or refund path after deployment.',
                  },
                  {
                    code: '02', title: 'Strictly-increasing nonces',
                    body: 'Every Acceptance struct carries a nonce that must exceed the previous settlement nonce for that deal. Replay attacks, double-claims, and out-of-order settlements revert at the EVM level before any token transfer occurs.',
                  },
                  {
                    code: '03', title: 'Trustless refund path',
                    body: 'Once term end plus grace period passes, the payer calls refundUnused with no signature from the seller. The function checks block.timestamp, transfers remaining USDC to the buyer, and closes the deal in a single call.',
                  },
                  {
                    code: '04', title: 'ReentrancyGuard on all state-changing functions',
                    body: 'createAndFundDeal, settleAcceptedUsage, sellerCloseTerm, and refundUnused all carry the nonReentrant modifier. Cross-contract re-entrancy during USDC transfers cannot manipulate deal state.',
                  },
                  {
                    code: '05', title: 'Pausable with preserved ownership',
                    body: 'An emergency pause halts all state-changing functions. renounceOwnership is overridden to revert, preventing the owner from accidentally surrendering the pause capability permanently.',
                  },
                ].map(({ code, title, body }) => (
                  <div key={code} style={{ background: 'white', padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'start' }}>
                    <span style={{ fontFamily: mono, fontSize: 10, color: C.muted, letterSpacing: '0.08em', paddingTop: 3, flexShrink: 0 }}>{code}</span>
                    <div>
                      <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 6px' }}>{title}</p>
                      <p style={{ fontFamily: sans, fontSize: 13, lineHeight: 1.7, color: C.muted, margin: 0 }}>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: '16px 20px', background: 'white', border: `1px solid ${C.border}`, borderRadius: 8, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <p style={{ fontFamily: sans, fontSize: 11, color: C.muted, margin: '0 0 4px' }}>FlowPay MeteredEscrow / Arc Testnet</p>
                  <p style={{ fontFamily: mono, fontSize: 11, color: C.ink2, margin: 0 }}>{METERED_ESCROW.address}</p>
                </div>
                <a href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 12, color: C.blue, textDecoration: 'none' }}>
                  View on explorer <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* FAQ */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '88px 40px' }}>
        <SectionLabel>Common questions</SectionLabel>
        <div className="grid md:grid-cols-12" style={{ gap: 64 }}>
          <div className="md:col-span-4">
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(28px, 2.8vw, 44px)', fontWeight: 400, letterSpacing: '-0.02em', color: C.ink, margin: 0, lineHeight: 1.15 }}>
              What you<br />
              <span style={{ fontStyle: 'italic', color: C.ink2 }}>should know.</span>
            </h2>
          </div>
          <div className="md:col-span-8">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: C.border, borderRadius: 10, overflow: 'hidden' }}>
              {[
                {
                  q: 'Can the seller take more than was agreed?',
                  a: 'No. The contract enforces a maximum unit cap. Even if the seller submits a receipt with a higher unit count, the contract reverts. The maximum total payout is unitPrice multiplied by maxUnits, set at signing time.',
                },
                {
                  q: 'What happens if the buyer disappears after funding?',
                  a: 'The seller can close the deal early by calling sellerCloseTerm, which settles all verified usage to date and returns the remainder to the buyer. The seller is never stuck waiting for buyer action to get paid.',
                },
                {
                  q: 'What if the seller never delivers?',
                  a: 'The buyer calls refundUnused after term end plus the grace period. No seller signature needed. The full unspent balance returns to the buyer in one transaction.',
                },
                {
                  q: 'Is the contract audited?',
                  a: 'The contract has been reviewed with Slither static analysis and a balanced security audit covering reentrancy, access control, signature malleability, and nonce ordering. The audit report is available in the repository.',
                },
                {
                  q: 'What is the grace period for?',
                  a: 'The grace period gives the seller time to submit any final receipts after the term ends. Once the grace period expires, the refund path opens. Typical grace periods are 7 to 30 days depending on the stream type.',
                },
                {
                  q: 'Can I use FlowPay on mainnet?',
                  a: 'The contract is currently deployed on Arc Testnet. A mainnet deployment requires an independent security audit and Circle account upgrade. The contract code is the same on both networks.',
                },
              ].map(({ q, a }, i) => (
                <div key={i} style={{ background: 'white', padding: '20px 24px' }}>
                  <p style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 8px' }}>{q}</p>
                  <p style={{ fontFamily: sans, fontSize: 13, lineHeight: 1.72, color: C.muted, margin: 0 }}>{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* CTA */}
      <section style={{ background: C.bgDark }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '96px 40px', textAlign: 'center' as const }}>
          <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>GET STARTED</p>
          <h2 style={{ fontFamily: serif, fontSize: 'clamp(32px, 3.5vw, 56px)', fontWeight: 400, letterSpacing: '-0.025em', color: '#f5f4f0', margin: '0 0 20px', lineHeight: 1.1 }}>
            Set up your first stream<br />
            <span style={{ fontStyle: 'italic', color: 'rgba(245,244,240,0.6)' }}>in two minutes.</span>
          </h2>
          <p style={{ fontFamily: sans, fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 40, maxWidth: 400, margin: '0 auto 40px' }}>
            Connect a wallet, choose a stream type, sign the terms, and lock your USDC.
          </p>
          <ConnectKitButton label="Connect wallet to start" />
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${C.border}`, background: C.bg }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '20px 40px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: serif, fontSize: 15, color: C.ink }}>FlowPay</span>
            <span style={{ width: 1, height: 12, background: C.border, display: 'inline-block' }} />
            <span style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>USDC streams on Arc Testnet</span>
          </div>
          <a href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`} target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: mono, fontSize: 10, color: C.muted, textDecoration: 'none', letterSpacing: '0.04em' }}>
            {METERED_ESCROW.address.slice(0, 10)}...{METERED_ESCROW.address.slice(-6)}
            <ExternalLink size={9} />
          </a>
        </div>
      </footer>

    </div>
  )
}
