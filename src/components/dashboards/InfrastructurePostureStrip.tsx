import React from 'react';
import { Server, Globe, Boxes, Shield, Bot, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useNav } from '@/context/NavigationContext';
import { ESTATE_SUMMARY } from '@/data/mockData';

interface ViolationRow {
  label: string;
  value: string;
  severity: 'critical' | 'high' | 'medium';
  navTab: 'identities' | 'infrastructure';
  filters: Record<string, string>;
}

interface Tile {
  name: string;
  assetType: string;
  icon: React.ComponentType<{ className?: string }>;
  enterpriseTotal: string;
  atRisk: number;
  trend: number;
  violations: ViolationRow[];
}

const TILES: Tile[] = [
  {
    name: 'API Gateways',
    assetType: 'API Gateway',
    icon: Globe,
    enterpriseTotal: '1,840',
    atRisk: 22,
    trend: +1.4,
    violations: [
      { label: 'TLS certs expiring in 7 days', value: String(ESTATE_SUMMARY.certsExpiring7d), severity: 'critical', navTab: 'identities', filters: { type: 'TLS Certificate', status: 'Expiring', autoRenewal: 'false', tab: 'identities' } },
      { label: 'Weak algorithm on customer-facing endpoints', value: String(ESTATE_SUMMARY.certsWeakAlgo), severity: 'critical', navTab: 'identities', filters: { type: 'TLS Certificate', algorithm: 'weak', tab: 'identities' } },
      { label: 'AI tokens with admin scope on gateway', value: String(ESTATE_SUMMARY.aiTokensAdminPriv), severity: 'high', navTab: 'identities', filters: { type: 'AI Agent Token', privilege: 'admin', tab: 'identities' } },
      { label: 'Gateways with no policy coverage', value: '14', severity: 'medium', navTab: 'infrastructure', filters: { type: 'API Gateway', tab: 'infrastructure' } },
    ],
  },
  {
    name: 'Application Servers',
    assetType: 'Application Server',
    icon: Server,
    enterpriseTotal: '12,400',
    atRisk: 18,
    trend: +0.6,
    violations: [
      { label: 'Orphaned SSH keys — production hosts', value: String((ESTATE_SUMMARY as any).sshOrphaned ?? 0), severity: 'critical', navTab: 'identities', filters: { type: 'SSH Key', owner: 'Unassigned', tab: 'identities' } },
      { label: 'Expired TLS certs actively serving traffic', value: String(ESTATE_SUMMARY.certsExpired), severity: 'critical', navTab: 'identities', filters: { type: 'TLS Certificate', status: 'Expired', tab: 'identities' } },
      { label: 'SSH keys not rotated in 90+ days', value: String((ESTATE_SUMMARY as any).sshNotRotated90d ?? 0), severity: 'high', navTab: 'identities', filters: { type: 'SSH Key', rotation: 'overdue', tab: 'identities' } },
      { label: 'Servers with no assigned owner', value: '284', severity: 'medium', navTab: 'infrastructure', filters: { type: 'Application Server', tab: 'infrastructure' } },
    ],
  },
  {
    name: 'Kubernetes Clusters',
    assetType: 'K8s Cluster',
    icon: Boxes,
    enterpriseTotal: '648',
    atRisk: 14,
    trend: -1.2,
    violations: [
      { label: 'Workload certs expiring in 24h', value: '284', severity: 'critical', navTab: 'identities', filters: { type: 'K8s Workload Cert', status: 'Expiring', tab: 'identities' } },
      { label: 'SSH certs expiring on cluster nodes', value: '112', severity: 'critical', navTab: 'identities', filters: { type: 'SSH Certificate', status: 'Expiring', tab: 'identities' } },
      { label: 'Namespaces with no mTLS enforced', value: '138', severity: 'high', navTab: 'infrastructure', filters: { type: 'K8s Cluster', tab: 'infrastructure' } },
      { label: 'Clusters below 50% policy coverage', value: '46', severity: 'medium', navTab: 'infrastructure', filters: { type: 'K8s Cluster', tab: 'infrastructure' } },
    ],
  },
  {
    name: 'Vault Servers',
    assetType: 'Vault Server',
    icon: Shield,
    enterpriseTotal: '284',
    atRisk: 26,
    trend: +2.1,
    violations: [
      { label: 'Vault TLS certs expiring — access at risk', value: '18', severity: 'critical', navTab: 'identities', filters: { type: 'TLS Certificate', status: 'Expiring', tab: 'identities' } },
      { label: 'SSH keys on Vault hosts with no owner', value: '32', severity: 'critical', navTab: 'identities', filters: { type: 'SSH Key', owner: 'Unassigned', tab: 'identities' } },
      { label: 'Secrets not rotated in 90+ days', value: String(ESTATE_SUMMARY.secretsUnrotated90d), severity: 'high', navTab: 'identities', filters: { type: 'API Key / Secret', rotation: 'overdue', tab: 'identities' } },
      { label: 'Vault servers with 0% policy coverage', value: '8', severity: 'medium', navTab: 'infrastructure', filters: { type: 'Vault Server', tab: 'infrastructure' } },
    ],
  },
  {
    name: 'AI Platforms',
    assetType: 'AI Platform',
    icon: Bot,
    enterpriseTotal: '486',
    atRisk: 32,
    trend: +4.8,
    violations: [
      { label: 'Admin privilege tokens — not rotated >30d', value: String(ESTATE_SUMMARY.aiTokensAdminPriv), severity: 'critical', navTab: 'identities', filters: { type: 'AI Agent Token', privilege: 'admin', tab: 'identities' } },
      { label: 'AI agents accessing PII data stores', value: String(ESTATE_SUMMARY.aiTokensOverPriv), severity: 'critical', navTab: 'identities', filters: { type: 'AI Agent Token', privilege: 'over', tab: 'identities' } },
      { label: 'Agents with no human sponsor assigned', value: String(ESTATE_SUMMARY.aiTokensNoSponsor), severity: 'high', navTab: 'identities', filters: { type: 'AI Agent Token', owner: 'Unassigned', tab: 'identities' } },
      { label: 'Agent tokens — no rotation policy set', value: String(ESTATE_SUMMARY.aiTokensNoRotationPolicy), severity: 'medium', navTab: 'identities', filters: { type: 'AI Agent Token', rotation: 'none', tab: 'identities' } },
    ],
  },
];

const SEV_DOT: Record<string, string> = {
  critical: 'bg-coral',
  high: 'bg-amber',
  medium: 'bg-muted-foreground/40',
};

const SEV_COUNT: Record<string, string> = {
  critical: 'text-coral',
  high: 'text-amber',
  medium: 'text-muted-foreground',
};

export default function InfrastructurePostureStrip() {
  const { setCurrentPage, setFilters } = useNav();

  const nav = (_navTab: 'identities' | 'infrastructure', filters: Record<string, string>) => {
    setFilters(filters);
    setCurrentPage('inventory');
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Infrastructure Risk Spotlight</h2>
          <p className="text-[10px] text-muted-foreground">
            Cryptographic posture across your key infrastructure — click any row to drill into the affected assets
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground">5 categories · 7d trend</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {TILES.map(tile => {
          const Icon = tile.icon;
          const TrendIcon = tile.trend >= 0 ? TrendingUp : TrendingDown;
          const trendColor = tile.trend > 0.5 ? 'text-coral' : tile.trend < -0.5 ? 'text-teal' : 'text-muted-foreground';

          return (
            <div key={tile.name} className="bg-secondary/30 hover:bg-secondary/50 rounded-lg border border-transparent hover:border-border transition-all flex flex-col">
              <button
                onClick={() => nav('infrastructure', { type: tile.assetType, tab: 'infrastructure' })}
                className="flex items-center justify-between px-3 pt-3 pb-2 text-left w-full group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-3.5 h-3.5 text-foreground flex-shrink-0" />
                  <span className="text-[11.5px] font-semibold text-foreground truncate">{tile.name}</span>
                </div>
                <span className="text-[9.5px] text-muted-foreground/70 tabular-nums flex-shrink-0">{tile.enterpriseTotal}</span>
              </button>

              <div className="px-3 pb-2">
                <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/40 mb-1">
                  <div style={{ width: `${tile.atRisk}%` }} className="bg-coral" />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-coral font-semibold tabular-nums">{tile.atRisk}% at risk</span>
                  <span className={`flex items-center gap-0.5 tabular-nums ${trendColor}`} title="7-day trend">
                    <TrendIcon className="w-2.5 h-2.5" />
                    {tile.trend > 0 ? '+' : ''}{tile.trend.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="px-2 pb-2 border-t border-border/40 pt-1.5 space-y-0.5">
                {tile.violations.map(v => (
                  <button
                    key={v.label}
                    onClick={() => nav(v.navTab, v.filters)}
                    className="w-full flex items-center gap-2 px-1.5 py-1 rounded hover:bg-background/60 transition-colors text-left group/row"
                    title={v.label}
                  >
                    <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEV_DOT[v.severity]}`} />
                    <span className="text-[10.5px] text-foreground/90 leading-tight flex-1 truncate">{v.label}</span>
                    <span className={`text-[10.5px] font-semibold tabular-nums ${SEV_COUNT[v.severity]}`}>{v.value}</span>
                    <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover/row:opacity-60 text-teal transition-opacity flex-shrink-0" />
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
