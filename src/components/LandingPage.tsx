import { ConnectKitButton } from 'connectkit'
import { ExternalLink, ArrowRight, Check, Shield, Zap, Lock, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { ARC_TESTNET_EXPLORER, METERED_ESCROW } from '@/contract'

// ── Design tokens (self-contained for landing) ────────────────────────────────
const C = {
  bg:       '#070707',
  bgAlt:    '#0f0f0f',
  bgCard:   'rgba(255,255,255,0.03)',
  border:   'rgba(255,255,255,0.08)',
  borderHi: 'rgba(255,255,255,0.16)',
  ink:      '#f4f4f0',
  ink2:     '#c8c6be',
  muted:    '#888580',
  subtle:   '#4e4c47',
  gold:     '#e8c382',
  goldDim:  'rgba(232,195,130,0.15)',
  goldFg:   '#351e10',
  blue:     '#60a5fa',
  purple:   '#c084fc',
  amber:    '#fbbf24',
  green:    '#4ade80',
}

const gloock = 'Gloock, Georgia, serif'
const manrope = 'Manrope, sans-serif'
const mono = 'JetBrains Mono, Menlo, monospace'

// ── Tiny atoms ────────────────────────────────────────────────────────────────
function Rule({ style }: { style?: React.CSSProperties }) {
  return <div style={{ height: 1, background: C.border, ...style }} />
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: mono,
      fontSize: 10,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      color: C.gold,
      background: C.goldDim,
      border: `1px solid rgba(232,195,130,0.25)`,
      borderRadius: 4,
      padding: '3px 9px',
      display: 'inline-block',
    }}>
      {children}
    </span>
  )
}

function GoldBtn({ children, onClick, style }: {
  children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '12px 22px',
        borderRadius: 8,
        background: 'linear-gradient(to bottom, #f0d09a, #e8c382)',
        color: C.goldFg,
        fontFamily: manrope,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase' as const,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 20px rgba(232,195,130,0.25)',
        cursor: 'pointer',
        border: 'none',
        minHeight: 44,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick, style }: {
  children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '11px 20px',
        borderRadius: 8,
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
        color: C.ink2,
        fontFamily: manrope,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase' as const,
        border: `1px solid ${C.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.5)',
        cursor: 'pointer',
        minHeight: 44,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <rect width="30" height="30" rx="9" fill="rgba(232,195,130,0.10)" />
      <rect width="30" height="30" rx="9" fill="none" stroke="rgba(232,195,130,0.3)" strokeWidth="1" />
      <path d="M8.5 15 C8.5 10.5 11.2 8 15 8 C18.8 8 21.5 10.5 21.5 15"
        stroke="#e8c382" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M15 19 L15 15" stroke="#e8c382" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="15" cy="20.5" r="1.6" fill="#e8c382" />
    </svg>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 120,
      padding: '20px',
      background: C.bgCard,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      textAlign: 'center' as const,
    }}>
      <div style={{
        fontFamily: gloock,
        fontSize: 'clamp(26px, 3.5vw, 42px)',
        color: C.gold,
        lineHeight: 1,
        marginBottom: 6,
      }}>{value}</div>
      <div style={{ fontFamily: manrope, fontSize: 12, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>{label}</div>
    </div>
  )
}

// ── Stream type card ──────────────────────────────────────────────────────────
function StreamCard({ title, color, desc, items, tag }: {
  title: string; color: string; desc: string; items: string[]; tag: string
}) {
  return (
    <div style={{
      background: C.bgCard,
      border: `1px solid ${C.border}`,
      borderTop: `2px solid ${color}`,
      borderRadius: 10,
      padding: '24px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <div>
        <Tag>{tag}</Tag>
        <h3 style={{ fontFamily: gloock, fontSize: 22, color: C.ink, margin: '10px 0 0', fontWeight: 400, letterSpacing: '-0.01em' }}>{title}</h3>
      </div>
      <p style={{ fontFamily: manrope, fontSize: 13, lineHeight: 1.7, color: C.muted, margin: 0 }}>{desc}</p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => (
          <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            <Check size={13} style={{ color: C.gold, marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontFamily: manrope, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── FAQ item ──────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 0',
          fontFamily: manrope,
          fontSize: 14,
          fontWeight: 600,
          color: C.ink2,
          textAlign: 'left' as const,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          gap: 12,
        }}
      >
        <span>{q}</span>
        <span style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: C.muted,
          fontSize: 16,
          lineHeight: 1,
        }}>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <p style={{
          fontFamily: manrope,
          fontSize: 13,
          lineHeight: 1.8,
          color: C.muted,
          margin: '0 0 18px',
          paddingRight: 32,
        }}>{a}</p>
      )}
    </div>
  )
}

// ── Nav link ──────────────────────────────────────────────────────────────────
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 18px',
        height: '100%',
        borderRight: `1px solid ${C.border}`,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: C.muted,
        fontFamily: manrope,
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget).style.color = C.ink }}
      onMouseLeave={e => { (e.currentTarget).style.color = C.muted }}
    >
      {children}
    </a>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div style={{
      background: C.bg,
      color: C.ink,
      fontFamily: manrope,
      minHeight: '100dvh',
      overflowX: 'hidden',
    }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        borderBottom: `1px solid ${C.border}`,
        background: 'rgba(7,7,7,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: 72,
        }}>
          {/* Brand */}
          <a href="#" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            position: 'relative',
            paddingRight: 20,
            borderRight: `1px solid ${C.border}`,
          }}>
            <span style={{ position: 'absolute', top: 8, left: -4, width: 6, height: 6, background: C.subtle }} />
            <span style={{ position: 'absolute', bottom: 8, right: -4, width: 6, height: 6, background: C.subtle }} />
            <Logo size={30} />
            <div>
              <div style={{ fontFamily: gloock, fontSize: 16, color: C.ink, lineHeight: 1.1 }}>FlowPay</div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.subtle }}>Spec console</div>
            </div>
          </a>

          {/* Desktop nav */}
          <nav style={{ display: 'none', alignItems: 'stretch', height: '100%' }} className="hidden lg:flex">
            <NavLink href="#streams">Streams</NavLink>
            <NavLink href="#protocol">Protocol</NavLink>
            <NavLink href="#security">Security</NavLink>
            <NavLink href="#faq">FAQ</NavLink>
          </nav>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 20, borderLeft: `1px solid ${C.border}` }} className="hidden lg:flex">
            <a
              href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                borderRadius: 8,
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
                border: `1px solid ${C.border}`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.5)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: C.ink2,
                fontFamily: manrope,
              }}
            >
              Explorer <ExternalLink size={11} />
            </a>
            <ConnectKitButton />
          </div>

          {/* Mobile menu btn */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              style={{
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
                color: C.muted,
              }}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div style={{
            borderTop: `1px solid ${C.border}`,
            padding: '16px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {[
              { href: '#streams', label: 'Streams' },
              { href: '#protocol', label: 'Protocol' },
              { href: '#security', label: 'Security' },
              { href: '#faq', label: 'FAQ' },
            ].map(link => (
              <a key={link.href} href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase' as const,
                  color: C.muted,
                  border: `1px solid transparent`,
                }}
                onMouseEnter={e => { (e.currentTarget).style.color = C.ink; (e.currentTarget).style.borderColor = C.border }}
                onMouseLeave={e => { (e.currentTarget).style.color = C.muted; (e.currentTarget).style.borderColor = 'transparent' }}
              >
                {link.label}
              </a>
            ))}
            <div style={{ marginTop: 8 }}>
              <ConnectKitButton />
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: 'clamp(64px, 8vw, 120px) 20px clamp(48px, 6vw, 80px)',
      }}>
        <div style={{ maxWidth: 760 }}>
          <div style={{ marginBottom: 24 }}>
            <Tag>On-chain payment streams</Tag>
          </div>

          <h1 style={{
            fontFamily: gloock,
            fontSize: 'clamp(44px, 6vw, 84px)',
            fontWeight: 400,
            lineHeight: 1.04,
            letterSpacing: '-0.025em',
            color: C.ink,
            margin: '0 0 28px',
          }}>
            Payroll, vesting, and<br />
            <span style={{ color: C.gold }}>milestone payments</span><br />
            built on USDC.
          </h1>

          <p style={{
            fontFamily: manrope,
            fontSize: 'clamp(15px, 1.6vw, 18px)',
            lineHeight: 1.75,
            color: C.muted,
            margin: '0 0 40px',
            maxWidth: '55ch',
          }}>
            FlowPay locks USDC on Arc Testnet and releases it according to signed terms. No intermediaries, no custody risk. Both parties sign before a single token moves.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 56 }}>
            <ConnectKitButton />
            <GhostBtn>
              <a href="#streams" style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: 7 }}>
                How it works <ArrowRight size={14} />
              </a>
            </GhostBtn>
          </div>

          {/* Contract spec card */}
          <div style={{
            display: 'inline-block',
            background: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: '16px 20px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Gold top bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${C.gold}, transparent)` }} />
            <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.subtle, margin: '0 0 10px' }}>Deployed contract</p>
            <a
              href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontFamily: mono,
                fontSize: 12,
                color: C.gold,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {METERED_ESCROW.address.slice(0, 20)}…{METERED_ESCROW.address.slice(-8)}
              <ExternalLink size={11} />
            </a>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              {[
                { label: 'Chain', value: 'Arc Testnet' },
                { label: 'Token', value: 'USDC' },
                { label: 'Sigs', value: 'EIP-712' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.subtle, margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontFamily: manrope, fontSize: 12, fontWeight: 600, color: C.ink2, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Rule />

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(40px, 5vw, 72px) 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <StatCard value="3" label="Stream types" />
          <StatCard value="EIP-712" label="Signed terms" />
          <StatCard value="USDC" label="Native gas on Arc" />
          <StatCard value="Non-custodial" label="Design" />
        </div>
      </section>

      <Rule />

      {/* ── Stream types ─────────────────────────────────────────────── */}
      <section id="streams" style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(56px, 6vw, 96px) 20px' }}>
        <div style={{ marginBottom: 48 }}>
          <Tag>Payment types</Tag>
          <h2 style={{
            fontFamily: gloock,
            fontSize: 'clamp(28px, 3vw, 48px)',
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: C.ink,
            margin: '14px 0 0',
          }}>
            Three ways to move USDC
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <StreamCard
            title="Payroll"
            color={C.blue}
            tag="Monthly"
            desc="Recurring USDC salary streams with a defined pay period and grace window. Set it, fund it, and let the contract handle the schedule."
            items={[
              'Salary locked upfront on Arc Testnet',
              'Per-period release with clawback grace',
              'Both parties sign before tokens move',
            ]}
          />
          <StreamCard
            title="Vesting"
            color={C.purple}
            tag="Tranches"
            desc="Token vesting schedules for founders, employees, and advisors. Define tranches, set the cliff, and the contract enforces the cliff."
            items={[
              'Cliff-based tranche releases',
              'Buyer can reclaim unvested tokens',
              'EIP-712 typed-data commitment',
            ]}
          />
          <StreamCard
            title="Milestones"
            color={C.amber}
            tag="On delivery"
            desc="Escrow-style milestone payments for freelancers and contractors. Funds release only when deliverables are confirmed."
            items={[
              'Funds locked until milestone approved',
              'Recipient and funder both sign terms',
              'Dispute handled off-chain by agreement',
            ]}
          />
        </div>
      </section>

      <Rule />

      {/* ── Protocol flow ────────────────────────────────────────────── */}
      <section id="protocol" style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(56px, 6vw, 96px) 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'center' }}>
          <div>
            <Tag>Protocol</Tag>
            <h2 style={{
              fontFamily: gloock,
              fontSize: 'clamp(26px, 2.8vw, 44px)',
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: C.ink,
              margin: '14px 0 16px',
            }}>
              How a stream<br />gets funded
            </h2>
            <p style={{ fontFamily: manrope, fontSize: 14, lineHeight: 1.8, color: C.muted, margin: '0 0 32px', maxWidth: '46ch' }}>
              Every FlowPay stream follows the same four-step sequence. No trusted third party holds your funds at any step.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { n: '01', title: 'Define terms', body: 'Both parties agree on amount, schedule, and conditions off-chain.' },
              { n: '02', title: 'Recipient signs', body: 'Recipient signs an EIP-712 typed-data commitment to the stream terms.' },
              { n: '03', title: 'Funder signs + approves', body: 'Funder countersigns and approves USDC spend for the contract.' },
              { n: '04', title: 'Stream goes live', body: 'A single transaction creates the deal and locks USDC. Both sigs verified on-chain.' },
            ].map((step, i, arr) => (
              <div key={step.n} style={{
                display: 'flex',
                gap: 16,
                paddingBottom: i < arr.length - 1 ? 28 : 0,
                position: 'relative',
              }}>
                {/* Connector line */}
                {i < arr.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    left: 17,
                    top: 36,
                    bottom: 4,
                    width: 1,
                    background: `linear-gradient(to bottom, ${C.gold}, transparent)`,
                    opacity: 0.25,
                  }} />
                )}
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: C.goldDim,
                  border: `1px solid rgba(232,195,130,0.3)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: mono,
                  fontSize: 10,
                  color: C.gold,
                  letterSpacing: '0.05em',
                  flexShrink: 0,
                }}>
                  {step.n}
                </div>
                <div>
                  <p style={{ fontFamily: manrope, fontSize: 14, fontWeight: 700, color: C.ink, margin: '6px 0 4px' }}>{step.title}</p>
                  <p style={{ fontFamily: manrope, fontSize: 13, lineHeight: 1.7, color: C.muted, margin: 0 }}>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Rule />

      {/* ── Security ─────────────────────────────────────────────────── */}
      <section id="security" style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(56px, 6vw, 96px) 20px' }}>
        <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
          <Tag>Security</Tag>
          <h2 style={{
            fontFamily: gloock,
            fontSize: 'clamp(26px, 2.8vw, 44px)',
            fontWeight: 400,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: C.ink,
            margin: '14px 0 0',
          }}>
            Built for trust
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[
            {
              icon: <Lock size={20} style={{ color: C.gold }} />,
              title: 'Non-custodial',
              body: 'No third party ever holds your USDC. Funds go directly into the on-chain contract and are released by cryptographic proof.',
            },
            {
              icon: <Shield size={20} style={{ color: C.gold }} />,
              title: 'Dual-signature',
              body: 'Both funder and recipient sign EIP-712 typed data before the deal is created. Forged terms cannot be accepted.',
            },
            {
              icon: <Zap size={20} style={{ color: C.gold }} />,
              title: 'USDC on Arc',
              body: 'All transactions run on Arc Testnet where USDC is the native gas token. Fees are stable and predictable, paid in the same asset you transfer.',
            },
            {
              icon: <Check size={20} style={{ color: C.gold }} />,
              title: 'Grace periods',
              body: 'Every stream has a configurable grace window after term end, giving the funder time to settle disputes before reclaiming unlocked funds.',
            },
          ].map(card => (
            <div key={card.title} style={{
              padding: '24px 22px',
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
            }}>
              <div style={{ marginBottom: 12 }}>{card.icon}</div>
              <h3 style={{ fontFamily: gloock, fontSize: 18, fontWeight: 400, color: C.ink, margin: '0 0 10px' }}>{card.title}</h3>
              <p style={{ fontFamily: manrope, fontSize: 13, lineHeight: 1.75, color: C.muted, margin: 0 }}>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* ── Comparison table ─────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(56px, 6vw, 96px) 20px' }}>
        <div style={{ marginBottom: 40 }}>
          <Tag>Why FlowPay</Tag>
          <h2 style={{
            fontFamily: gloock,
            fontSize: 'clamp(26px, 2.8vw, 44px)',
            fontWeight: 400,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: C.ink,
            margin: '14px 0 0',
          }}>
            Different by design
          </h2>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.borderHi}` }}>
                {['Feature', 'FlowPay', 'Bank transfer', 'Crypto escrow'].map((h, i) => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    fontFamily: manrope,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    color: i === 1 ? C.gold : C.muted,
                    textAlign: i === 0 ? ('left' as const) : ('center' as const),
                    background: i === 1 ? C.goldDim : 'transparent',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Non-custodial',     true,  false, false],
                ['Dual-signature',    true,  false, true],
                ['Stable gas fee',    true,  true,  false],
                ['Programmable',      true,  false, false],
                ['Instant settlement',true,  false, false],
                ['Open source',       true,  false, false],
              ].map(([label, fp, bank, esc]) => (
                <tr key={String(label)} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '14px 16px', fontFamily: manrope, fontSize: 13, color: C.ink2 }}>{label}</td>
                  {[fp, bank, esc].map((v, i) => (
                    <td key={i} style={{
                      padding: '14px 16px',
                      textAlign: 'center' as const,
                      background: i === 0 ? C.goldDim : 'transparent',
                    }}>
                      {v
                        ? <Check size={15} style={{ color: i === 0 ? C.gold : C.green, margin: '0 auto', display: 'block' }} />
                        : <X size={15} style={{ color: C.subtle, margin: '0 auto', display: 'block' }} />
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked */}
        <div className="flex md:hidden" style={{ flexDirection: 'column', gap: 10 }}>
          {[
            ['Non-custodial',      true, false, false],
            ['Dual-signature',     true, false, true],
            ['Stable gas fee',     true, true,  false],
            ['Programmable',       true, false, false],
            ['Instant settlement', true, false, false],
          ].map(([label, fp]) => (
            <div key={String(label)} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '13px 16px',
              background: C.bgCard,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
            }}>
              <span style={{ fontFamily: manrope, fontSize: 13, color: C.ink2 }}>{label}</span>
              {fp
                ? <Check size={14} style={{ color: C.gold }} />
                : <X size={14} style={{ color: C.subtle }} />
              }
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(56px, 6vw, 96px) 20px' }}>
        <div style={{ textAlign: 'center' as const, marginBottom: 48 }}>
          <Tag>FAQ</Tag>
          <h2 style={{
            fontFamily: gloock,
            fontSize: 'clamp(26px, 2.8vw, 44px)',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: C.ink,
            margin: '14px 0 0',
          }}>
            Common questions
          </h2>
        </div>
        {[
          {
            q: 'What happens if the recipient does not deliver?',
            a: 'The funder can reclaim unlocked USDC after the grace period expires. Any amount already settled to the recipient stays with them. Both parties should agree on dispute resolution off-chain before signing.',
          },
          {
            q: 'What wallet do I need?',
            a: 'Any EVM wallet that can add a custom network. Click "Connect wallet" and add Arc Testnet when prompted (chain ID 5042002, RPC https://rpc.testnet.arc.io). MetaMask and WalletConnect are both supported.',
          },
          {
            q: 'How does the USDC approval work?',
            a: 'Before the stream is created, you approve the MeteredEscrow contract to spend exactly the locked amount from your wallet. The contract then pulls that exact amount in the same transaction that creates the stream.',
          },
          {
            q: 'Is this on mainnet?',
            a: 'FlowPay currently runs on Arc Testnet only. All USDC used is test USDC with no real-world value. Use the "Get test USDC" button in Arc Studio to fund your wallet.',
          },
          {
            q: 'What is the gas token on Arc?',
            a: 'On Arc, USDC is the native gas token. This means both the transferred amount and the transaction fee come from the same USDC balance, so you never need a separate ETH for gas.',
          },
          {
            q: 'Can I cancel a stream early?',
            a: 'A stream can be settled early if both parties agree off-chain and the buyer calls the settle function. The contract releases earned units to the recipient and returns the remainder to the buyer.',
          },
        ].map(faq => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
      </section>

      <Rule />

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section style={{
        background: `linear-gradient(135deg, rgba(232,195,130,0.07) 0%, transparent 60%)`,
        borderTop: `1px solid rgba(232,195,130,0.15)`,
        padding: 'clamp(56px, 6vw, 96px) 20px',
        textAlign: 'center' as const,
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: gloock,
            fontSize: 'clamp(30px, 3.5vw, 52px)',
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: '-0.025em',
            color: C.ink,
            margin: '0 0 18px',
          }}>
            Start your first stream
          </h2>
          <p style={{ fontFamily: manrope, fontSize: 15, lineHeight: 1.75, color: C.muted, margin: '0 0 36px', maxWidth: '44ch', marginLeft: 'auto', marginRight: 'auto' }}>
            Connect your wallet, fund a stream, and let the contract handle the rest.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <ConnectKitButton />
            <GoldBtn>
              <a
                href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: 7 }}
              >
                View contract <ExternalLink size={13} />
              </a>
            </GoldBtn>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${C.border}`,
        padding: '28px 20px',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={22} />
            <span style={{ fontFamily: gloock, fontSize: 14, color: C.muted }}>FlowPay</span>
            <span style={{ color: C.subtle, fontSize: 10 }}>·</span>
            <span style={{ fontFamily: mono, fontSize: 10, color: C.subtle, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Arc Testnet</span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <a
              href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontFamily: manrope, fontSize: 12, color: C.subtle, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              Contract <ExternalLink size={10} />
            </a>
            <a href="#faq" style={{ fontFamily: manrope, fontSize: 12, color: C.subtle }}>FAQ</a>
            <a href="#streams" style={{ fontFamily: manrope, fontSize: 12, color: C.subtle }}>Docs</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
