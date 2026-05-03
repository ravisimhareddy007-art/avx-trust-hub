import React from 'react';
import { useNav } from '@/context/NavigationContext';
import { ESTATE_SUMMARY, mockAssets } from '@/data/mockData';
import { Shield, Key, Bot, Lock, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface ViolationRow {
  label: string;
  count: number;
  filters: Record<string, string>;
  severity: 'critical' | 'high' | 'medium';
}

interface Band {
  name: string;
  type: string;
  icon: React.ComponentType<{ className?: string }>;
  total: string;
  atRisk: number;
  trend: string;
  topFilter: Record<string, string>;
  violations: ViolationRow[];
}

// ── Single source of truth — predicates AND counts derived from same logic ─
// Enterprise counts (ESTATE_SUMMARY) are used for display.
// Inventory filters use the same field logic so results are consistent.

const BANDS: Band[] = [
  {
    name: 'Certificates',
    type: 'TLS Certificate',
    icon: Shield,
    total: ESTATE_SUMMARY.certificates.toLocaleString(),
    atRisk: ESTATE_SUMMARY.certsAtRisk,
    trend: ESTATE_SUMMARY.certsTrend,
    topFilter: { type: 'TLS Certificate', tab: 'identities' },
    violations: [
      {
        label: 'Expiring in 30 days',
        count: ESTATE_SUMMARY.certsExpiring30d,
        filters: { type: 'TLS Certificate', status: 'Expiring', tab: 'identities' },
        severity: 'critical',
      },
      {
        label: 'Expired certificates',
        count: ESTATE_SUMMARY.certsExpired,
        filters: { type: 'TLS Certificate', status: 'Expired', tab: 'identities' },
        severity: 'critical',
      },
      {
        label: 'Weak algorithm (SHA-1 / RSA-1024)',
        count: ESTATE_SUMMARY.certsWeakAlgo,
        filters: { type: 'TLS Certificate', algorithm: 'weak', tab: 'identities' },
        severity: 'high',
      },
      {
        label: 'Self-signed in production',
        count: ESTATE_SUMMARY.certsSelfSigned,
        filters: { type: 'TLS Certificate', caIssuer: 'Self-Signed', tab: 'identities' },
        severity: 'medium',
      },
    ],
  },
  {
    name: 'SSH & Enc. Keys',
    type: 'SSH Key',
    icon: Key,
    total: ESTATE_SUMMARY.sshAndEncryptionKeys.toLocaleString(),
    atRisk: ESTATE_SUMMARY.sshAtRisk,
    trend: ESTATE_SUMMARY.sshTrend,
    topFilter: { type: 'SSH Key', tab: 'identities' },
    violations: [
      {
        label: 'Orphaned — no owner assigned',
        count: ESTATE_SUMMARY.sshOrphaned,
        filters: { type: 'SSH Key', owner: 'Unassigned', tab: 'identities' },
        severity: 'critical',
      },
      {
        label: 'Suspicious — anomalous login patterns',
        count: ESTATE_SUMMARY.sshSuspicious,
        filters: { type: 'SSH Key', suspicious: 'true', tab: 'identities' },
        severity: 'critical',
      },
      {
        label: 'Rogue — not provisioned by platform',
        count: ESTATE_SUMMARY.sshRogue,
        filters: { type: 'SSH Key', rogue: 'true', tab: 'identities' },
        severity: 'high',
      },
      {
        label: 'Not rotated in 90+ days',
        count: ESTATE_SUMMARY.sshNotRotated90d,
        filters: { type: 'SSH Key', rotation: 'overdue', tab: 'identities' },
        severity: 'medium',
      },
    ],
  },
  {
    name: 'Secrets',
    type: 'API Key / Secret',
    icon: Lock,
    total: ESTATE_SUMMARY.secretsAndAPIKeys.toLocaleString(),
    atRisk: ESTATE_SUMMARY.secretsAtRisk,
    trend: ESTATE_SUMMARY.secretsTrend,
    topFilter: { type: 'API Key / Secret', tab: 'identities' },
    violations: [
      {
        label: 'Exposed in code repositories',
        count: ESTATE_SUMMARY.secretsExposedCode,
        filters: { type: 'API Key / Secret', exposure: 'code', tab: 'identities' },
        severity: 'critical',
      },
      {
        label: 'Hardcoded — detected in last 24h',
        count: ESTATE_SUMMARY.secretsHardcoded,
        filters: { type: 'API Key / Secret', exposure: 'code', tab: 'identities' },
        severity: 'critical',
      },
      {
        label: 'Not rotated in 90+ days',
        count: ESTATE_SUMMARY.secretsUnrotated90d,
        filters: { type: 'API Key / Secret', rotation: 'overdue', tab: 'identities' },
        severity: 'high',
      },
      {
        label: 'Orphaned — owner left org',
        count: ESTATE_SUMMARY.secretsOrphaned,
        filters: { type: 'API Key / Secret', owner: 'Unassigned', tab: 'identities' },
        severity: 'medium',
      },
    ],
  },
  {
    name: 'AI Agent Tokens',
    type: 'AI Agent Token',
    icon: Bot,
    total: ESTATE_SUMMARY.aiAgentTokens.toLocaleString(),
    atRisk: ESTATE_SUMMARY.aiTokensAtRisk,
    trend: ESTATE_SUMMARY.aiTrend,
    topFilter: { type: 'AI Agent Token', tab: 'identities' },
    violations: [
      {
        label: 'Admin privilege — no rotation >30d',
        count: ESTATE_SUMMARY.aiTokensAdminPriv,
        filters: { type: 'AI Agent Token', privilege: 'admin', tab: 'identities' },
        severity: 'critical',
      },
      {
        label: 'Over-privileged — unused scopes',
        count: ESTATE_SUMMARY.aiTokensOverPriv,
        filters: { type: 'AI Agent Token', privilege: 'over', tab: 'identities' },
        severity: 'critical',
      },
      {
        label: 'Expired — still accepting requests',
        count: ESTATE_SUMMARY.aiTokensExpiredActive,
        filters: { type: 'AI Agent Token', status: 'Expired', tab: 'identities' },
        severity: 'high',
      },
      {
        label: 'No rotation policy set',
        count: ESTATE_SUMMARY.aiTokensNoRotationPolicy,
        filters: { type: 'AI Agent Token', rotation: 'none', tab: 'identities' },
        severity: 'medium',
      },
    ],
  },
];

const SEV_DOT: Record<ViolationRow['severity'], string> = {
  critical: 'bg-coral',
  high: 'bg-amber',
  medium: 'bg-muted-foreground/40',
};

const SEV_COUNT: Record<ViolationRow['severity'], string> = {
  critical: 'text-coral',
  high: 'text-amber',
  medium: 'text-muted-foreground',
};

// ── Component ─────────────────────────────────────────────────────────────

export default function IdentityHealthBands() {
  const { setCurrentPage, setFilters } = useNav();

  const nav = (filters: Record<string, string>) => {
    setFilters(filters);
    setCurrentPage('inventory');
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Identity Posture Distribution</h2>
          <p className="text-[10px] text-muted-foreground">
            Click any tile or row to drill into Inventory with filters pre-applied
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground">4 categories · 7d trend</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {BANDS.map(b => {
          const Icon = b.icon;
          const trendValue = parseFloat(b.trend);
          const TrendIcon = trendValue >= 0 ? TrendingUp : TrendingDown;
          const trendColor = trendValue > 0.5
            ? 'text-coral'
            : trendValue < -0.5
            ? 'text-teal'
            : 'text-muted-foreground';

          return (
            <div
              key={b.name}
              className="bg-secondary/30 rounded-lg border border-transparent hover:border-border transition-all flex flex-col"
            >
              {/* ── Tile header ── */}
              <button
                onClick={() => nav(b.topFilter)}
                className="flex items-center justify-between px-3 pt-3 pb-2 text-left w-full group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-3.5 h-3.5 text-foreground flex-shrink-0" />
                  <span className="text-[11.5px] font-semibold text-foreground truncate">{b.name}</span>
                </div>
                <span className="text-[9.5px] text-muted-foreground/60 tabular-nums flex-shrink-0">{b.total}</span>
              </button>

              {/* ── Risk bar ── */}
              <div className="px-3 pb-1.5">
                <div className="flex h-1.5 overflow-hidden rounded-full mb-1">
                  <div style={{ width: `${b.atRisk}%` }} className="bg-coral" />
                  <div style={{ width: `${100 - b.atRisk}%` }} className="bg-teal" />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-coral font-semibold tabular-nums">{b.atRisk}% at risk</span>
                  <span className={`flex items-center gap-0.5 tabular-nums ${trendColor}`}>
                    <TrendIcon className="w-2.5 h-2.5" />
                    {b.trend}
                  </span>
                </div>
              </div>

              {/* ── Violation breakdown rows ── */}
              <div className="border-t border-border/50 mx-3 mb-3 pt-2 flex flex-col gap-0.5">
                {b.violations.map(v => (
                  <button
                    key={v.label}
                    onClick={() => nav(v.filters)}
                    className="w-full flex items-center gap-2 px-1.5 py-1 rounded hover:bg-background/60 transition-colors text-left group/row"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEV_DOT[v.severity]}`} />
                    <span className="text-[10.5px] text-muted-foreground flex-1 leading-tight truncate">
                      {v.label}
                    </span>
                    <span className={`text-[10.5px] font-semibold tabular-nums flex-shrink-0 ${SEV_COUNT[v.severity]}`}>
                      {v.count.toLocaleString()}
                    </span>
                    <ArrowRight className="w-2.5 h-2.5 text-teal opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
