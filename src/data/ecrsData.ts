// ECRS data model - drivers, breakdown, trend deltas, compliance mapping

export const SCORE = 64;
export const SCORE_DELTA_7D = -6;

export type Urgency = 'immediate' | 'near-term' | 'aging';

export const urgencyMeta: Record<Urgency, { label: string; hsl: string; window: string }> = {
  'immediate': { label: 'Immediate', hsl: 'hsl(var(--coral))', window: '0–7d' },
  'near-term': { label: 'Near-term', hsl: 'hsl(var(--amber))', window: '7–30d' },
  'aging':     { label: 'Aging',     hsl: 'hsl(var(--purple))', window: '>30d overdue' },
};

export interface RiskDriver {
  id: string;
  name: string;
  impact: number;           // pts contribution to ERS
  assets: number;           // affected count
  tier1Pct: number;         // % of Tier-1 systems affected
  prodPct: number;          // % of production systems affected
  systems: string[];        // top impacted apps/services
  envs: ('Production' | 'Non-prod')[];
  urgency: Urgency;
  compliance: string[];     // standards violated
  page: string;
  filters?: Record<string, string>;
}

export const drivers: RiskDriver[] = [
  {
    id: 'weak-algos',
    name: 'Weak algorithms (RSA-1024, SHA-1)',
    impact: 12,
    assets: 6_398,
    tier1Pct: 28,
    prodPct: 19,
    systems: ['payments-api', 'auth-svc', 'billing-gateway'],
    envs: ['Production'],
    urgency: 'immediate',
    compliance: ['NIST SP 800-131A', 'PCI-DSS 4.0 §4.2.1'],
    page: 'quantum',
  },
  {
    id: 'expiring-certs',
    name: 'Expired & expiring certificates',
    impact: 9,
    assets: 13_189,
    tier1Pct: 14,
    prodPct: 22,
    systems: ['edge-cdn', 'internal-api-gw', 'partner-mtls'],
    envs: ['Production', 'Non-prod'],
    urgency: 'immediate',
    compliance: ['Internal CLM Policy v3', 'CA/B Forum BR'],
    page: 'inventory',
    filters: { status: 'Expiring' },
  },
  {
    id: 'non-rotated-secrets',
    name: 'Non-rotated secrets (>90 days)',
    impact: 7,
    assets: 42_180,
    tier1Pct: 11,
    prodPct: 34,
    systems: ['data-platform', 'ml-pipelines', 'analytics'],
    envs: ['Production', 'Non-prod'],
    urgency: 'near-term',
    compliance: ['NIST SP 800-57 Pt1 §5.3', 'SOC 2 CC6.1'],
    page: 'remediation',
    filters: { module: 'secrets', filter: 'rotation' },
  },
  {
    id: 'non-hsm-keys',
    name: 'Non-HSM stored keys',
    impact: 6,
    assets: 14_720,
    tier1Pct: 9,
    prodPct: 12,
    systems: ['signing-svc', 'document-vault'],
    envs: ['Production'],
    urgency: 'aging',
    compliance: ['FIPS 140-3 L3', 'Internal Key Storage Std'],
    page: 'inventory',
    filters: { storage: 'non-hsm' },
  },
  {
    id: 'overpriv-ai-tokens',
    name: 'Over-privileged AI agent tokens',
    impact: 5,
    assets: 179_000,
    tier1Pct: 6,
    prodPct: 41,
    systems: ['langchain-pipelines', 'copilot-svc', 'rag-search'],
    envs: ['Production', 'Non-prod'],
    urgency: 'near-term',
    compliance: ['NIST AI RMF GV-3.2', 'Internal NHI Policy'],
    page: 'remediation',
    filters: { module: 'ai-agents' },
  },
];

export const distribution = [
  { label: 'Critical', count: 184_320,  pct: 3.5,  contribPct: 42, color: 'hsl(var(--coral))' },
  { label: 'High',     count: 521_400,  pct: 10.0, contribPct: 28, color: 'hsl(15 72% 62%)' },
  { label: 'Medium',   count: 942_180,  pct: 18.1, contribPct: 18, color: 'hsl(var(--amber))' },
  { label: 'Low',      count: 1_412_000,pct: 27.2, contribPct: 9,  color: 'hsl(var(--purple))' },
  { label: 'Compliant',count: 2_140_100,pct: 41.2, contribPct: 3,  color: 'hsl(var(--teal))' },
];

export const breakdown = [
  { cat: 'Algorithm Risk',  pct: 31, color: 'hsl(var(--coral))',     desc: 'Deprecated ciphers, short keys, SHA-1' },
  { cat: 'Lifecycle Risk',  pct: 24, color: 'hsl(var(--amber))',     desc: 'Expiry, missed rotations, stale keys' },
  { cat: 'Exposure Risk',   pct: 19, color: 'hsl(var(--purple))',    desc: 'Non-HSM storage, public surface' },
  { cat: 'Access Risk',     pct: 15, color: 'hsl(15 72% 62%)',       desc: 'Over-privileged tokens, weak scopes' },
  { cat: 'Compliance Risk', pct: 11, color: 'hsl(var(--teal))',      desc: 'Policy & standard violations' },
];

export const trendData: Record<string, { d: string; v: number }[]> = {
  '7d': [
    { d: 'Mon', v: 70 }, { d: 'Tue', v: 71 }, { d: 'Wed', v: 68 },
    { d: 'Thu', v: 67 }, { d: 'Fri', v: 66 }, { d: 'Sat', v: 65 }, { d: 'Sun', v: 64 },
  ],
  '30d': Array.from({ length: 30 }, (_, i) => ({ d: `${i + 1}`, v: 72 - i * 0.27 + Math.sin(i / 3) * 2 })),
  '90d': Array.from({ length: 90 }, (_, i) => ({ d: `${i + 1}`, v: 78 - i * 0.15 + Math.sin(i / 5) * 3 })),
};

export interface TrendDelta {
  pts: number;       // signed
  reason: string;
  page?: string;
  filters?: Record<string, string>;
}

export const trendDeltas: Record<string, TrendDelta[]> = {
  '7d': [
    { pts: +4, reason: '312 new assets onboarded (payments expansion)', page: 'inventory', filters: { added: '7d' } },
    { pts: +3, reason: '47 certificates moved into <30d expiry window',  page: 'inventory', filters: { status: 'Expiring' } },
    { pts: -8, reason: '1,204 weak-algo certs replaced via auto-renewal', page: 'remediation', filters: { module: 'clm' } },
    { pts: -5, reason: '892 secrets rotated via Vault policy run',       page: 'remediation', filters: { module: 'secrets' } },
  ],
  '30d': [
    { pts: +9,  reason: 'New AI agent fleet onboarded (+179K tokens)' },
    { pts: +6,  reason: 'Quarterly cert expiry wave' },
    { pts: -12, reason: 'PQC pilot replaced 3,400 RSA-2048 with ML-KEM' },
    { pts: -7,  reason: '14K keys migrated to HSM (signing-svc)' },
  ],
  '90d': [
    { pts: +14, reason: 'M&A integration brought in legacy crypto inventory' },
    { pts: -9,  reason: 'SHA-1 deprecation campaign completed Phase 1' },
    { pts: -6,  reason: 'Compliance pass on PCI scope reduced exposure' },
  ],
};

export interface ActionOption {
  id: string;
  title: string;
  reduction: number;     // pts
  effort: 'Low' | 'Medium' | 'High';
  durationDays: number;
  count: number;
  urgency: Urgency;
  page: string;
  filters?: Record<string, string>;
}

export const actionOptions: ActionOption[] = [
  { id: 'replace-weak', title: 'Replace weak algorithms (RSA-1024, SHA-1)', reduction: 12, effort: 'High',   durationDays: 21, count: 6_398,  urgency: 'immediate', page: 'quantum' },
  { id: 'rotate-secrets', title: 'Rotate 42K non-rotated secrets',           reduction: 8,  effort: 'Low',    durationDays: 2,  count: 42_180, urgency: 'near-term', page: 'remediation', filters: { module: 'secrets', filter: 'rotation' } },
  { id: 'migrate-hsm',  title: 'Migrate 14,720 keys to HSM',                 reduction: 6,  effort: 'Medium', durationDays: 10, count: 14_720, urgency: 'aging',     page: 'inventory', filters: { storage: 'non-hsm' } },
  { id: 'renew-certs',  title: 'Auto-renew 1,840 certs expiring <7d',        reduction: 5,  effort: 'Low',    durationDays: 1,  count: 1_840,  urgency: 'immediate', page: 'remediation', filters: { module: 'clm', filter: 'expiry' } },
  { id: 'scope-ai',     title: 'Scope-down 12K over-privileged AI tokens',   reduction: 4,  effort: 'Medium', durationDays: 7,  count: 12_000, urgency: 'near-term', page: 'remediation', filters: { module: 'ai-agents' } },
];

export function scoreBand(s: number) {
  if (s >= 80) return { label: 'Critical', hsl: 'hsl(var(--coral))' };
  if (s >= 60) return { label: 'High',     hsl: 'hsl(var(--coral))' };
  if (s >= 40) return { label: 'Medium',   hsl: 'hsl(var(--amber))' };
  if (s >= 20) return { label: 'Low',      hsl: 'hsl(var(--teal))' };
  return         { label: 'Compliant', hsl: 'hsl(var(--teal))' };
}
