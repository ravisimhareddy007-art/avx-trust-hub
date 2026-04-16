import React from 'react';
import { Server, Boxes, Cloud, ArrowRight, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { useNav } from '@/context/NavigationContext';

/**
 * Infrastructure Posture Distribution — a "map", not a "to-do list".
 * Mirrors IdentityHealthBands design language: ONE key insight per tile,
 * 7d trend, explicit drill-down, cross-layer pivot to identity view.
 *
 * Per spec: only the 3 infrastructure categories (Hosts & Servers,
 * Kubernetes & Service Mesh, Cloud Accounts) — no mixing with identity types.
 */

interface Band {
  name: string;
  type: string;
  icon: React.ComponentType<{ className?: string }>;
  total: string;
  critical: number; high: number; medium: number; healthy: number;
  keyInsight: { label: string; value: string; filter: Record<string, string> };
  trend7d: number;
  pivotTo?: { label: string; filters: Record<string, string> };
}

const BANDS: Band[] = [
  {
    name: 'Hosts & Servers', type: 'Application Server', icon: Server,
    total: '184K',
    critical: 6, high: 14, medium: 22, healthy: 58,
    keyInsight: { label: 'crypto agent missing', value: '24,180', filter: { tab: 'infrastructure', type: 'Application Server', agent: 'missing' } },
    trend7d: +0.6,
    pivotTo: { label: 'Identities on these hosts', filters: { tab: 'identities', hostScope: 'agent-missing' } },
  },
  {
    name: 'Kubernetes & Service Mesh', type: 'K8s Cluster', icon: Boxes,
    total: '1,847',
    critical: 4, high: 10, medium: 18, healthy: 68,
    keyInsight: { label: 'cert-manager unhealthy', value: '147', filter: { tab: 'infrastructure', type: 'K8s Cluster', certManager: 'unhealthy' } },
    trend7d: -1.2,
    pivotTo: { label: 'Certs in these clusters', filters: { tab: 'identities', type: 'TLS Certificate', scope: 'k8s' } },
  },
  {
    name: 'Cloud Accounts', type: 'Cloud Account', icon: Cloud,
    total: '521',
    critical: 8, high: 16, medium: 20, healthy: 56,
    keyInsight: { label: 'unmanaged KMS keys', value: '3,412', filter: { tab: 'infrastructure', type: 'Cloud Account', kms: 'unmanaged' } },
    trend7d: +2.8,
    pivotTo: { label: 'Secrets in these accounts', filters: { tab: 'identities', type: 'API Key / Secret', scope: 'cloud' } },
  },
];

export default function InfrastructurePostureStrip() {
  const { setCurrentPage, setFilters } = useNav();

  const nav = (filters: Record<string, string>) => {
    setFilters(filters);
    setCurrentPage('inventory');
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Infrastructure Posture Distribution</h2>
          <p className="text-[10px] text-muted-foreground">Where your infrastructure risk lives — click any tile to drill into Inventory with the filter pre-applied</p>
        </div>
        <span className="text-[10px] text-muted-foreground">3 categories · 7d trend shown</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
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
              <button
                onClick={() => nav({ tab: 'infrastructure', type: b.type })}
                className="flex items-center justify-between mb-2 text-left w-full"
                title={`View all ${b.name} in Inventory`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-3.5 h-3.5 text-foreground flex-shrink-0" />
                  <span className="text-[11.5px] font-semibold text-foreground truncate">{b.name}</span>
                </div>
                <span className="text-[9.5px] text-muted-foreground/70 tabular-nums font-normal flex-shrink-0">{b.total}</span>
              </button>

              <div className="flex h-1.5 rounded-full overflow-hidden mb-1.5" title={`Critical ${b.critical}% · High ${b.high}% · Medium ${b.medium}% · Healthy ${b.healthy}%`}>
                <div style={{ width: `${b.critical}%` }} className="bg-coral" />
                <div style={{ width: `${b.high}%` }} className="bg-coral/60" />
                <div style={{ width: `${b.medium}%` }} className="bg-amber" />
                <div style={{ width: `${b.healthy}%` }} className="bg-teal" />
              </div>

              <div className="flex items-center justify-between text-[10px] mb-2">
                <span className="text-coral font-semibold tabular-nums">{issuePct}% at risk</span>
                <span className={`flex items-center gap-0.5 tabular-nums ${trendColor}`} title="7-day change in % at risk">
                  <TrendIcon className="w-2.5 h-2.5" />
                  {b.trend7d > 0 ? '+' : ''}{b.trend7d.toFixed(1)}%
                </span>
              </div>

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

              {b.pivotTo && (
                <button
                  onClick={() => nav(b.pivotTo!.filters)}
                  className="mt-1 text-left text-[9.5px] text-muted-foreground hover:text-teal flex items-center gap-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Pivot to identity layer with this filter"
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
