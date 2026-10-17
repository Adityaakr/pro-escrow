// Service templates for the Proteus marketplace.
// Each template pre-fills the NewDeal form and gives the deal a human-readable name.

export interface ServiceTemplate {
  id: string
  name: string
  description: string
  category: string
  unitLabel: string        // what one "unit" means, e.g. "API call"
  unitPrice: string        // USDC per unit, e.g. "0.01"
  typicalBudget: string    // suggested prepaid amount
  maxUnits: string
  termDays: string
  graceDays: string
  endpoint: string         // example API path
  exampleBody: string      // example JSON body for curl demo
}

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Automated code review: security, style, and correctness. Billed per file reviewed.',
    category: 'Engineering',
    unitLabel: 'file',
    unitPrice: '0.05',
    typicalBudget: '5.00',
    maxUnits: '100',
    termDays: '30',
    graceDays: '3',
    endpoint: 'POST /api/services/code-review/execute',
    exampleBody: '{"file": "src/main.ts", "rules": ["security", "style"]}',
  },
  {
    id: 'document-analysis',
    name: 'Document Analysis',
    description: 'Extract key facts, entities, and summaries from documents. Billed per document.',
    category: 'Data',
    unitLabel: 'document',
    unitPrice: '0.02',
    typicalBudget: '2.00',
    maxUnits: '100',
    termDays: '30',
    graceDays: '3',
    endpoint: 'POST /api/services/document-analysis/execute',
    exampleBody: '{"document_url": "https://example.com/doc.pdf", "extract": ["entities", "summary"]}',
  },
  {
    id: 'data-enrichment',
    name: 'Data Enrichment',
    description: 'Enrich company or contact records with verified data. Billed per enriched record.',
    category: 'Data',
    unitLabel: 'record',
    unitPrice: '0.01',
    typicalBudget: '1.00',
    maxUnits: '100',
    termDays: '30',
    graceDays: '3',
    endpoint: 'POST /api/services/data-enrichment/execute',
    exampleBody: '{"domain": "example.com", "fields": ["industry", "headcount", "funding"]}',
  },
  {
    id: 'translation',
    name: 'Translation',
    description: 'Professional-quality translation between 50+ language pairs. Billed per 1,000 words.',
    category: 'Language',
    unitLabel: '1k words',
    unitPrice: '0.03',
    typicalBudget: '3.00',
    maxUnits: '100',
    termDays: '30',
    graceDays: '3',
    endpoint: 'POST /api/services/translation/execute',
    exampleBody: '{"text": "Hello world", "source": "en", "target": "es"}',
  },
  {
    id: 'summarization',
    name: 'Summarization',
    description: 'Condense long-form content into structured briefs. Billed per summarized item.',
    category: 'Language',
    unitLabel: 'item',
    unitPrice: '0.01',
    typicalBudget: '1.00',
    maxUnits: '100',
    termDays: '30',
    graceDays: '3',
    endpoint: 'POST /api/services/summarization/execute',
    exampleBody: '{"content": "Long article text...", "max_sentences": 3}',
  },
  {
    id: 'vendor-evaluations',
    name: 'Vendor Evaluations',
    description: 'Autonomous due-diligence on vendor proposals using web search and LLM analysis.',
    category: 'Business',
    unitLabel: 'evaluation',
    unitPrice: '0.10',
    typicalBudget: '10.00',
    maxUnits: '100',
    termDays: '30',
    graceDays: '3',
    endpoint: 'POST /api/services/vendor-evaluations/execute',
    exampleBody: '{"vendor": "Acme Corp", "criteria": ["pricing", "security", "track record"]}',
  },
]

export const CATEGORY_COLORS: Record<string, string> = {
  Engineering: 'rgba(1,43,255,0.08)',
  Data: 'rgba(22,163,74,0.08)',
  Language: 'rgba(217,119,6,0.08)',
  Business: 'rgba(147,51,234,0.08)',
}

export const CATEGORY_TEXT: Record<string, string> = {
  Engineering: 'var(--accent)',
  Data: 'var(--success)',
  Language: '#d97706',
  Business: '#9333ea',
}
