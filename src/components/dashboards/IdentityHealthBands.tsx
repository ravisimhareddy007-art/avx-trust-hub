import React from 'react';
import { useNav } from '@/context/NavigationContext';
import { ESTATE_SUMMARY } from '@/data/mockData';
import { Shield, Key, Bot, Lock, Fingerprint, ArrowRight, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';

interface Band {
  name: string;
  type: string;
  icon: React.ComponentType<{ className?: string }>;
  total: string;
  keyInsight: { label: string; value: string; filter: Record<string, string> };
  atRisk: number;
  trend: string;
  pivotTo?: { label: string; filters: Record<string, string> };
}

// Normalized to the 5 identity categories per spec
const BANDS: Band[] = [
  {
    name: 'Certificates', type: 'TLS Certificate', icon: Shield, total: ESTATE_SUMMARY.certificates.toLocaleString(),
    keyInsight: { label: 'expiring <30d', value: ESTATE_SUMMARY.certsExpiring30d.toLocaleString(), filter: { type: 'TLS Certificate', status: 'Expiring', tab: 'identities' } },
    atRisk: ESTATE_SUMMARY.certsAtRisk,
    trend: ESTATE_SUMMARY.certsTrend,
    pivotTo: { label: 'Hosts using these certs', filters: { tab: 'infrastructure', type: 'Application Server', usesCertExpiring: 'true' } },
  },
  {
    name: 'Secrets & API Keys', type: 'API Key / Secret', icon: Lock, total: ESTATE_SUMMARY.secretsAndAPIKeys.toLocaleString(),
    keyInsight: { label: 'exposed in code', value: ESTATE_SUMMARY.secretsExposedCode.toLocaleString(), filter: { type: 'API Key / Secret', exposure: 'code', tab: 'identities' } },
    atRisk: ESTATE_SUMMARY.secretsAtRisk,
    trend: ESTATE_SUMMARY.secretsTrend,
    pivotTo: { label: 'Affected repositories', filters: { tab: 'infrastructure', type: 'Code Repository', exposed: 'true' } },
  },
  {
    name: 'SSH & Encryption Keys', type: 'SSH Key', icon: Key, total: ESTATE_SUMMARY.sshAndEncryptionKeys.toLocaleString(),
    keyInsight: { label: 'not rotated >90d', value: ESTATE_SUMMARY.sshNotRotated90d.toLocaleString(), filter: { type: 'SSH Key', rotation: 'overdue', tab: 'identities' } },
    atRisk: ESTATE_SUMMARY.sshAtRisk,
    trend: ESTATE_SUMMARY.sshTrend,
    pivotTo: { label: 'Hosts with stale keys', filters: { tab: 'infrastructure', type: 'Application Server', sshStale: 'true' } },
  },
  {
    name: 'AI Agent Tokens', type: 'AI Agent Token', icon: Bot, total: ESTATE_SUMMARY.aiAgentTokens.toLocaleString(),
    keyInsight: { label: 'over-privileged', value: ESTATE_SUMMARY.aiTokensOverPriv.toLocaleString(), filter: { type: 'AI Agent Token', privilege: 'over', tab: 'identities' } },
    atRisk: ESTATE_SUMMARY.aiTokensAtRisk,
    trend: ESTATE_SUMMARY.aiTrend,
    pivotTo: { label: 'Services exposing tokens', filters: { tab: 'infrastructure', type: 'API Gateway', aiToken: 'true' } },
  },
  {
    name: 'Code Signing', type: 'Code Signing', icon: Fingerprint, total: ESTATE_SUMMARY.codeSigning.toLocaleString(),
    keyInsight: { label: 'weak algorithm', value: '24', filter: { type: 'Code Signing', algorithm: 'weak', tab: 'identities' } },
    atRisk: ESTATE_SUMMARY.codeSigningAtRisk,
    trend: ESTATE_SUMMARY.codeSigningTrend,
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
          const trendValue = parseFloat(b.trend);
          const TrendIcon = trendValue >= 0 ? TrendingUp : TrendingDown;
          const trendColor = trendValue > 0.5 ? 'text-coral' : trendValue < -0.5 ? 'text-teal' : 'text-muted-foreground';
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

              <div className="mb-1.5 flex h-1.5 overflow-hidden rounded-full" title={`${b.atRisk}% at risk`}>
                <div style={{ width: `${b.atRisk}%` }} className="bg-coral" />
                <div style={{ width: `${100 - b.atRisk}%` }} className="bg-teal" />
              </div>

              <div className="flex items-center justify-between text-[10px] mb-2">
                <span className="text-coral font-semibold tabular-nums">{b.atRisk}% at risk</span>
                <span className={`flex items-center gap-0.5 tabular-nums ${trendColor}`} title="7-day change in % at risk">
                  <TrendIcon className="w-2.5 h-2.5" />
                  {b.trend}
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
