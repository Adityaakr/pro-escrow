import { ArrowRight, Zap } from 'lucide-react'
import { SERVICE_TEMPLATES, CATEGORY_COLORS, CATEGORY_TEXT, type ServiceTemplate } from '@/services'

interface MarketViewProps {
  onSelect: (template: ServiceTemplate) => void
}

export function MarketView({ onSelect }: MarketViewProps) {
  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
          Service marketplace
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Buy AI agent services on a pay-per-use basis. Funds are held in escrow and released only for delivered results.
        </p>
      </div>

      {/* How it works */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-0 rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        {[
          { step: '1', title: 'Choose a service', desc: 'Pick from verified AI agent services with transparent per-unit pricing.' },
          { step: '2', title: 'Fund escrow', desc: 'Lock USDC in the smart contract. Funds only move when you approve delivered work.' },
          { step: '3', title: 'Pay per result', desc: 'Sign each usage batch. Unused balance is refundable after the grace period.' },
        ].map((item, i) => (
          <div
            key={item.step}
            className="px-5 py-4"
            style={{
              background: 'var(--bg-white)',
              borderRight: i < 2 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div
              className="flex size-6 items-center justify-center rounded-full text-xs font-bold mb-2"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              {item.step}
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{item.title}</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Service grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="size-4" style={{ color: 'var(--accent)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Available services</h3>
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium tabular-nums"
            style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}
          >
            {SERVICE_TEMPLATES.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICE_TEMPLATES.map((svc) => (
            <ServiceCard key={svc.id} svc={svc} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ServiceCard({ svc, onSelect }: { svc: ServiceTemplate; onSelect: (t: ServiceTemplate) => void }) {
  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden transition-shadow hover:shadow-md"
      style={{ background: 'var(--bg-white)', border: '1px solid var(--border)', cursor: 'pointer' }}
      onClick={() => onSelect(svc)}
    >
      {/* Card header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <span
            className="rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{
              background: CATEGORY_COLORS[svc.category] ?? 'var(--surface-muted)',
              color: CATEGORY_TEXT[svc.category] ?? 'var(--muted)',
            }}
          >
            {svc.category}
          </span>
        </div>
        <h3 className="display text-base font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
          {svc.name}
        </h3>
        <p className="mt-1.5 text-xs" style={{ color: 'var(--muted)', lineHeight: '1.5' }}>
          {svc.description}
        </p>
      </div>

      {/* Pricing row */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}
      >
        <div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Per {svc.unitLabel}</p>
          <p className="display text-lg font-bold tabular-nums" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            ${svc.unitPrice}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Typical budget</p>
          <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink-2)' }}>
            ${svc.typicalBudget} USDC
          </p>
        </div>
      </div>

      {/* CTA */}
      <button
        className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold transition-colors hover:opacity-90"
        style={{ background: 'var(--accent)', color: 'white' }}
        onClick={(e) => { e.stopPropagation(); onSelect(svc) }}
      >
        Create deal
        <ArrowRight className="size-4" />
      </button>
    </div>
  )
}
