import React from 'react';
import { useNav } from '@/context/NavigationContext';
import { ESTATE_SUMMARY, mockAssets } from '@/data/mockData';
import { Shield, Key, Bot, Lock, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { VIOLATION_FILTERS } from '@/lib/filters/cryptoFilters';

// ── Types ──────────────────────────────────────────────────────────────────

interface ViolationRow {
  id: string;
  label: string;
  enterpriseCount: number;
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
      { ...VIOLATION_FILTERS.cert_expired,      severity: 'critical' },
      { ...VIOLATION_FILTERS.cert_expiring_7d,  severity: 'critical' },
      { ...VIOLATION_FILTERS.cert_expiring_30d, severity: 'high'     },
      { ...VIOLATION_FILTERS.cert_weak_algo,    severity: 'high'     },
      { ...VIOLATION_FILTERS.cert_self_signed,  severity: 'medium'   },
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
      { ...VIOLATION_FILTERS.ssh_suspicious,  severity: 'critical' },
      { ...VIOLATION_FILTERS.ssh_shared_user, severity: 'critical' },
      { ...VIOLATION_FILTERS.ssh_rogue,       severity: 'high'     },
      { ...VIOLATION_FILTERS.ssh_weak_user,   severity: 'high'     },
      { ...VIOLATION_FILTERS.ssh_misplaced,   severity: 'medium'   },
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
      { ...VIOLATION_FILTERS.secret_exposed_code,   severity: 'critical' },
      { ...VIOLATION_FILTERS.secret_hardcoded_24h,  severity: 'critical' },
      { ...VIOLATION_FILTERS.secret_unrotated_90d,  severity: 'high'     },
      { ...VIOLATION_FILTERS.secret_orphaned,       severity: 'medium'   },
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
      { ...VIOLATION_FILTERS.ai_admin_no_rotation,  severity: 'critical' },
      { ...VIOLATION_FILTERS.ai_over_privileged,    severity: 'high'     },
      { ...VIOLATION_FILTERS.ai_no_sponsor,         severity: 'high'     },
      { ...VIOLATION_FILTERS.ai_no_rotation_policy, severity: 'medium'   },
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
    if (process.env.NODE_ENV === 'development') {
      console.log('[AVX Drilldown]', { source: 'IdentityHealthBands', filters });
    }
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
                onClick={() => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[AVX Drilldown] Tile click:', { type: b.type, tab: 'identities' });
                  }
                  setFilters({ type: b.type, tab: 'identities' });
                  setCurrentPage('inventory');
                }}
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
                    onClick={() => {
                      if (process.env.NODE_ENV === 'development') {
                        console.log('[AVX Drilldown] Row click:', { filterId: v.id });
                      }
                      setFilters({ tab: 'identities', filterId: v.id });
                      setCurrentPage('inventory');
                    }}
                    className="w-full flex items-center gap-2 px-1.5 py-1 rounded hover:bg-background/60 transition-colors text-left group/row"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEV_DOT[v.severity]}`} />
                    <span className="text-[10.5px] text-muted-foreground flex-1 leading-tight truncate">
                      {v.label}
                    </span>
                    <span className={`text-[10.5px] font-semibold tabular-nums flex-shrink-0 ${SEV_COUNT[v.severity]}`}>
                      {v.enterpriseCount.toLocaleString()}
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
