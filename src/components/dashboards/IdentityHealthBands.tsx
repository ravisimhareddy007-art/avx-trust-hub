import React from 'react';
import { useNav } from '@/context/NavigationContext';
import { Shield, Key, Bot, Lock, Fingerprint, KeyRound, ArrowRight, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';

interface Band {
  name: string;
  type: string;
  icon: React.ComponentType<{ className?: string }>;
  total: string;
  // health distribution (must sum to 100)
  critical: number; high: number; medium: number; healthy: number;
  // ONE key insight per category — the most relevant signal
  keyInsight: { label: string; value: string; filter: Record<string, string> };
  // lightweight 7d trend (in % at risk)
  trend7d: number; // positive = risk grew, negative = risk shrank
  // cross-layer pivot to infrastructure view
  pivotTo?: { label: string; filters: Record<string, string> };
}

// Normalized to the 5 identity categories per spec
const BANDS: Band[] = [
  {
    name: 'Certificates', type: 'TLS Certificate', icon: Shield, total: '1.8M',
    critical: 4, high: 12, medium: 18, healthy: 66,
    keyInsight: { label: 'expiring <30d', value: '12,847', filter: { type: 'TLS Certificate', status: 'Expiring', tab: 'identities' } },
    trend7d: +1.2,
    pivotTo: { label: 'Hosts using these certs', filters: { tab: 'infrastructure', type: 'Application Server', usesCertExpiring: 'true' } },
  },
  {
    name: 'Secrets & API Keys', type: 'API Key / Secret', icon: Lock, total: '812K',
    critical: 5, high: 18, medium: 19, healthy: 58,
    keyInsight: { label: 'exposed in code', value: '18,420', filter: { type: 'API Key / Secret', exposure: 'code', tab: 'identities' } },
    trend7d: +2.4,
    pivotTo: { label: 'Affected repositories', filters: { tab: 'infrastructure', type: 'Code Repository', exposed: 'true' } },
  },
  {
    name: 'SSH & Encryption Keys', type: 'SSH Key', icon: Key, total: '1.4M',
    critical: 2, high: 8, medium: 15, healthy: 75,
    keyInsight: { label: 'not rotated >90d', value: '8,412', filter: { type: 'SSH Key', rotation: 'overdue', tab: 'identities' } },
    trend7d: -0.8,
    pivotTo: { label: 'Hosts with stale keys', filters: { tab: 'infrastructure', type: 'Application Server', sshStale: 'true' } },
  },
  {
    name: 'AI Agent Tokens', type: 'AI Agent Token', icon: Bot, total: '472K',
    critical: 8, high: 30, medium: 22, healthy: 40,
    keyInsight: { label: 'over-privileged', value: '179K', filter: { type: 'AI Agent Token', privilege: 'over', tab: 'identities' } },
    trend7d: +4.1,
    pivotTo: { label: 'Services exposing tokens', filters: { tab: 'infrastructure', type: 'API Gateway', aiToken: 'true' } },
  },
  {
    name: 'Code Signing', type: 'Code Signing', icon: Fingerprint, total: '48K',
    critical: 3, high: 10, medium: 14, healthy: 73,
    keyInsight: { label: 'weak algorithm', value: '2,180', filter: { type: 'Code Signing', algorithm: 'weak', tab: 'identities' } },
    trend7d: -0.3,
    pivotTo: { label: 'Build pipelines using these', filters: { tab: 'infrastructure', type: 'Application Server', signsArtifacts: 'true' } },
  },
];

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
          <p className="text-[10px] text-muted-foreground">Where your identity risk lives — click any tile to drill into Inventory with the filter pre-applied</p>
        </div>
        <span className="text-[10px] text-muted-foreground">5 categories · 7d trend shown</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
        {BANDS.map(b => {
          const Icon = b.icon;
          const issuePct = b.critical + b.high;
          const TrendIcon = b.trend7d >= 0 ? TrendingUp : TrendingDown;
          const trendColor = b.trend7d > 0.5 ? 'text-coral' : b.trend7d < -0.5 ? 'text-teal' : 'text-muted-foreground';
          return (
            <div
              key={b.name}
              className="bg-secondary/30 hover:bg-secondary/60 rounded-lg p-3 border border-transparent hover:border-border transition-all group flex flex-col"
            >
              {/* Title row — de-emphasized total */}
              <button
                onClick={() => nav({ type: b.type, tab: 'identities' })}
                className="flex items-center justify-between mb-2 text-left w-full"
                title={`View all ${b.name} in Inventory`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-3.5 h-3.5 text-foreground flex-shrink-0" />
                  <span className="text-[11.5px] font-semibold text-foreground truncate">{b.name}</span>
                </div>
                <span className="text-[9.5px] text-muted-foreground/70 tabular-nums font-normal flex-shrink-0">{b.total}</span>
              </button>

              {/* Risk bar */}
              <div className="flex h-1.5 rounded-full overflow-hidden mb-1.5" title={`Critical ${b.critical}% · High ${b.high}% · Medium ${b.medium}% · Healthy ${b.healthy}%`}>
                <div style={{ width: `${b.critical}%` }} className="bg-coral" />
                <div style={{ width: `${b.high}%` }} className="bg-coral/60" />
                <div style={{ width: `${b.medium}%` }} className="bg-amber" />
                <div style={{ width: `${b.healthy}%` }} className="bg-teal" />
              </div>

              {/* % at risk + 7d trend */}
              <div className="flex items-center justify-between text-[10px] mb-2">
                <span className="text-coral font-semibold tabular-nums">{issuePct}% at risk</span>
                <span className={`flex items-center gap-0.5 tabular-nums ${trendColor}`} title="7-day change in % at risk">
                  <TrendIcon className="w-2.5 h-2.5" />
                  {b.trend7d > 0 ? '+' : ''}{b.trend7d.toFixed(1)}%
                </span>
              </div>

              {/* Single key insight — the contextual drill-down */}
              <button
                onClick={() => nav(b.keyInsight.filter)}
                className="text-left text-[10.5px] text-foreground/90 hover:text-teal flex items-start justify-between gap-1 py-1 border-t border-border/40"
                title={`Filter Inventory by: ${b.keyInsight.label}`}
              >
                <span className="leading-tight">
                  <span className="font-semibold tabular-nums">{b.keyInsight.value}</span>{' '}
                  <span className="text-muted-foreground">{b.keyInsight.label}</span>
                </span>
                <ArrowRight className="w-2.5 h-2.5 mt-0.5 flex-shrink-0 opacity-40 group-hover:opacity-100 group-hover:text-teal transition-all" />
              </button>

              {/* Cross-layer pivot to infrastructure */}
              {b.pivotTo && (
                <button
                  onClick={() => nav(b.pivotTo!.filters)}
                  className="mt-1 text-left text-[9.5px] text-muted-foreground hover:text-teal flex items-center gap-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Pivot to infrastructure layer with this filter"
                >
                  <ArrowRightLeft className="w-2.5 h-2.5" />
                  {b.pivotTo.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
