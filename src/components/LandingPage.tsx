import { ConnectKitButton } from 'connectkit'
import { Briefcase, TrendingUp, CheckSquare, Shield, Clock, ArrowRight, ExternalLink, Zap, Globe } from 'lucide-react'
import { ARC_TESTNET_EXPLORER, METERED_ESCROW } from '@/contract'

function FlowPayLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#0a2540" />
      <path d="M7 16 Q7 9 16 9 Q25 9 25 16 Q25 23 16 23" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M13 20 L16 23 L19 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-dvh" style={{ background: '#ffffff', color: '#0d0f14' }}>

      {/* ── Nav ── */}
      <nav style={{ borderBottom: '1px solid #e4e6ea' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <FlowPayLogo size={28} />
            <span className="display text-base font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              FlowPay
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {['How it works', 'Stream types', 'Security'].map(l => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                className="text-sm transition-opacity hover:opacity-60"
                style={{ color: '#6b7280', textDecoration: 'none' }}
              >
                {l}
              </a>
            ))}
          </div>
          <ConnectKitButton label="Launch app" />
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium" style={{ background: '#f0f1f4', color: '#6b7280' }}>
            <span className="size-1.5 rounded-full inline-block" style={{ background: '#16a34a' }} />
            Live on Arc Testnet
          </div>

          <h1 className="mb-5 text-5xl font-bold leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.03em', color: '#0d0f14' }}>
            USDC payroll, vesting,<br />
            and escrow on-chain.
          </h1>

          <p className="mb-8 text-lg leading-relaxed" style={{ color: '#6b7280', maxWidth: '540px' }}>
            Lock funds once. Release them as work is delivered, time passes, or milestones are hit.
            No intermediaries. No chargebacks. Every payment is a signed on-chain transaction.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <ConnectKitButton label="Connect wallet to start" />
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ border: '1px solid #e4e6ea', color: '#374151', textDecoration: 'none' }}
            >
              See how it works <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-3 gap-px rounded-xl overflow-hidden" style={{ border: '1px solid #e4e6ea', background: '#e4e6ea' }}>
          {[
            { value: 'Zero fees',     label: 'FlowPay charges nothing. Gas is cents on Arc.' },
            { value: 'Self-custody',  label: 'Funds sit in the contract, not with us.' },
            { value: 'EIP-712',       label: 'Typed signatures — verify terms before signing.' },
          ].map(({ value, label }) => (
            <div key={value} className="px-6 py-5" style={{ background: '#ffffff' }}>
              <p className="text-lg font-bold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#0d0f14' }}>{value}</p>
              <p className="text-sm" style={{ color: '#6b7280' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ background: '#f4f5f7', borderTop: '1px solid #e4e6ea', borderBottom: '1px solid #e4e6ea' }}>
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9ca3af' }}>HOW IT WORKS</p>
            <h2 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.02em', color: '#0d0f14' }}>
              Three steps. That's it.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                n: '01',
                title: 'Both parties sign the terms',
                body: 'The payer and recipient each sign an EIP-712 typed message: amount per unit, maximum units, and the deadline. Nothing is locked until both have signed.',
                icon: <Shield className="size-5" />,
              },
              {
                n: '02',
                title: 'Payer deposits USDC',
                body: "The payer approves the contract to pull USDC and calls fund. Funds are held in the contract — not in a company wallet, not in a multisig you don't control.",
                icon: <Zap className="size-5" />,
              },
              {
                n: '03',
                title: 'Settle as work is delivered',
                body: 'After each pay period, milestone, or vesting tranche, the recipient submits a signed receipt. The contract verifies nonce ordering and releases exactly that amount.',
                icon: <Clock className="size-5" />,
              },
            ].map(({ n, title, body, icon }) => (
              <div key={n} className="rounded-xl p-6" style={{ background: '#ffffff', border: '1px solid #e4e6ea' }}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#e4e6ea' }}>{n}</span>
                  <div className="flex size-8 items-center justify-center rounded-lg" style={{ background: '#f0f1f4', color: '#374151' }}>
                    {icon}
                  </div>
                </div>
                <h3 className="mb-2 text-base font-semibold" style={{ color: '#0d0f14' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stream types ── */}
      <section id="stream-types">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9ca3af' }}>STREAM TYPES</p>
            <h2 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.02em', color: '#0d0f14' }}>
              One contract. Three use cases.
            </h2>
          </div>

          <div className="space-y-px rounded-xl overflow-hidden" style={{ border: '1px solid #e4e6ea' }}>
            {[
              {
                icon: <Briefcase className="size-5" />,
                color: '#2563eb',
                bg: 'rgba(37,99,235,0.07)',
                type: 'Payroll',
                tagline: 'Monthly salary, paid on delivery',
                bullets: [
                  'Lock 3–12 months of salary upfront',
                  'Employee signs a receipt each pay period',
                  'Unused months refund to the employer after grace period',
                  'Works for remote contractors and full-time staff alike',
                ],
                eg: '12 months × $4,000/mo = $48,000 locked',
              },
              {
                icon: <TrendingUp className="size-5" />,
                color: '#7c3aed',
                bg: 'rgba(124,58,237,0.07)',
                type: 'Vesting',
                tagline: 'USDC grants that vest over time',
                bullets: [
                  'Define tranches — e.g. 16 × $6,250 over 4 years',
                  'Beneficiary claims each tranche after its date',
                  'Grantor can stop future tranches; past ones are locked',
                  'Replaces legal vesting agreements for USDC-denominated grants',
                ],
                eg: '$100,000 over 4 years in 16 tranches',
              },
              {
                icon: <CheckSquare className="size-5" />,
                color: '#d97706',
                bg: 'rgba(217,119,6,0.07)',
                type: 'Escrow',
                tagline: 'Milestone-based project payments',
                bullets: [
                  'Client locks full project budget into escrow',
                  'Contractor submits a receipt after each milestone',
                  'Client signs to acknowledge — only signed work is paid',
                  'Remaining balance refunds to client at deadline',
                ],
                eg: '5 milestones × $2,000 = $10,000 project',
              },
            ].map(({ icon, color, bg, type, tagline, bullets, eg }, i) => (
              <div
                key={type}
                className="grid md:grid-cols-2 gap-6 p-6 md:p-8"
                style={{
                  background: '#ffffff',
                  borderTop: i > 0 ? '1px solid #e4e6ea' : undefined,
                }}
              >
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg shrink-0" style={{ background: bg, color }}>
                      {icon}
                    </div>
                    <div>
                      <p className="font-semibold text-base" style={{ color: '#0d0f14' }}>{type}</p>
                      <p className="text-sm" style={{ color: '#6b7280' }}>{tagline}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {bullets.map(b => (
                      <li key={b} className="flex items-start gap-2 text-sm" style={{ color: '#374151' }}>
                        <span className="mt-1.5 size-1.5 rounded-full shrink-0" style={{ background: color }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center">
                  <div className="w-full rounded-lg px-5 py-4" style={{ background: '#f4f5f7', border: '1px solid #e4e6ea' }}>
                    <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: '#9ca3af' }}>Example</p>
                    <p className="text-sm font-medium" style={{ color: '#374151', fontFamily: 'JetBrains Mono, monospace' }}>{eg}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" style={{ background: '#f4f5f7', borderTop: '1px solid #e4e6ea', borderBottom: '1px solid #e4e6ea' }}>
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#9ca3af' }}>SECURITY</p>
            <h2 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.02em', color: '#0d0f14' }}>
              Audited. Minimal. Self-custody.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: <Shield className="size-4" />,
                title: 'No upgradeable proxy',
                body: 'The contract is deployed as plain bytecode. FlowPay cannot change the rules after you sign.',
              },
              {
                icon: <Globe className="size-4" />,
                title: 'Strictly-increasing nonces',
                body: 'Each settlement receipt must carry a nonce higher than the last. Replaying a receipt or skipping one is impossible.',
              },
              {
                icon: <Clock className="size-4" />,
                title: 'Trustless refund after deadline',
                body: 'If the seller never delivers, the buyer can call refund after the grace period. No approval needed from anyone.',
              },
              {
                icon: <Zap className="size-4" />,
                title: 'ReentrancyGuard + Pausable',
                body: 'Standard OpenZeppelin guards. Owner can pause in an emergency; renounceOwnership is disabled.',
              },
            ].map(({ icon, title, body }) => (
              <div key={title} className="flex gap-4 rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid #e4e6ea' }}>
                <div className="flex size-8 items-center justify-center rounded-lg shrink-0 mt-0.5" style={{ background: '#f0f1f4', color: '#374151' }}>
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#0d0f14' }}>{title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4" style={{ background: '#ffffff', border: '1px solid #e4e6ea' }}>
            <div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: '#0d0f14' }}>MeteredEscrow contract</p>
              <p className="text-xs font-mono" style={{ color: '#6b7280' }}>{METERED_ESCROW.address}</p>
            </div>
            <a
              href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: '#2563eb', textDecoration: 'none' }}
            >
              View on explorer <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="mb-4 text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-0.02em', color: '#0d0f14' }}>
            Ready to set up your first stream?
          </h2>
          <p className="mb-8 text-base" style={{ color: '#6b7280' }}>
            Connect your wallet and create a payroll, vesting, or escrow stream in under two minutes.
          </p>
          <ConnectKitButton label="Connect wallet to start" />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid #e4e6ea' }}>
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FlowPayLogo size={20} />
            <span className="text-sm font-semibold" style={{ color: '#374151', fontFamily: 'Space Grotesk, sans-serif' }}>FlowPay</span>
            <span className="text-sm" style={{ color: '#9ca3af' }}>— USDC streams on Arc Testnet</span>
          </div>
          <a
            href={`${ARC_TESTNET_EXPLORER}/address/${METERED_ESCROW.address}`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
            style={{ color: '#9ca3af', textDecoration: 'none' }}
          >
            Contract {METERED_ESCROW.address.slice(0, 10)}…{METERED_ESCROW.address.slice(-6)}
            <ExternalLink className="size-3" />
          </a>
        </div>
      </footer>

    </div>
  )
}
