import React from 'react';
import { useNav } from '@/context/NavigationContext';
import { Shield, Key, Bot, Lock, Fingerprint, Globe, ArrowRight } from 'lucide-react';

interface Band {
  name: string;
  type: string; // for inventory filter
  icon: React.ComponentType<{ className?: string }>;
  total: string;
  totalRaw: number;
  // health distribution (must sum to 100)
  critical: number; high: number; medium: number; healthy: number;
  topIssue: { label: string; value: string; page: string; filters: Record<string, string> };
}

const BANDS: Band[] = [
  { name: 'Certificates', type: 'TLS Certificate', icon: Shield, total: '1.8M', totalRaw: 1_800_000,
    critical: 4, high: 12, medium: 18, healthy: 66,
    topIssue: { label: 'Expiring <30d', value: '12,847', page: 'inventory', filters: { type: 'TLS Certificate', status: 'Expiring', tab: 'identities' } } },
  { name: 'SSH & Encryption Keys', type: 'SSH Key', icon: Key, total: '1.4M', totalRaw: 1_400_000,
    critical: 2, high: 8, medium: 15, healthy: 75,
    topIssue: { label: 'Not rotated >90d', value: '8,412', page: 'remediation', filters: { module: 'ssh', filter: 'rotation' } } },
  { name: 'AI Agent Tokens', type: 'AI Agent Token', icon: Bot, total: '472K', totalRaw: 472_000,
    critical: 8, high: 30, medium: 22, healthy: 40,
    topIssue: { label: 'Over-privileged', value: '179K', page: 'remediation', filters: { module: 'ai-agents' } } },
  { name: 'Secrets & API Keys', type: 'API Key / Secret', icon: Lock, total: '812K', totalRaw: 812_000,
    critical: 5, high: 18, medium: 19, healthy: 58,
    topIssue: { label: 'Exposed in code', value: '18,420', page: 'remediation', filters: { module: 'secrets' } } },
  { name: 'Code Signing', type: 'Code Signing', icon: Fingerprint, total: '48K', totalRaw: 48_000,
    critical: 3, high: 10, medium: 14, healthy: 73,
    topIssue: { label: 'Weak algorithm', value: '2,180', page: 'inventory', filters: { type: 'Code Signing', algorithm: 'weak', tab: 'identities' } } },
  { name: 'K8s & Service Mesh', type: 'K8s Certificate', icon: Globe, total: '342K', totalRaw: 342_000,
    critical: 1, high: 6, medium: 12, healthy: 81,
    topIssue: { label: 'Failed renewals', value: '1,247', page: 'trustops', filters: {} } },
];

export default function IdentityHealthBands() {
  const { setCurrentPage, setFilters } = useNav();

  const nav = (page: string, filters?: Record<string, string>) => {
    if (filters) setFilters(filters);
    setCurrentPage(page);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Identity Health Bands</h2>
          <p className="text-[10px] text-muted-foreground">Posture by category · click to drill into Inventory</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {BANDS.map(b => {
          const Icon = b.icon;
          const issuePct = b.critical + b.high;
          return (
            <button
              key={b.name}
              onClick={() => nav('inventory', { type: b.type, tab: 'identities' })}
              className="text-left bg-secondary/30 hover:bg-secondary/60 rounded-lg p-3 border border-transparent hover:border-border transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-foreground" />
                  <span className="text-[11.5px] font-semibold text-foreground">{b.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">{b.total}</span>
              </div>

              {/* Stacked health bar */}
              <div className="flex h-1.5 rounded-full overflow-hidden mb-2">
                <div style={{ width: `${b.critical}%` }} className="bg-coral" title={`Critical: ${b.critical}%`} />
                <div style={{ width: `${b.high}%` }} className="bg-coral/60" title={`High: ${b.high}%`} />
                <div style={{ width: `${b.medium}%` }} className="bg-amber" title={`Medium: ${b.medium}%`} />
                <div style={{ width: `${b.healthy}%` }} className="bg-teal" title={`Healthy: ${b.healthy}%`} />
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <span className="text-coral font-semibold tabular-nums">{issuePct}% at risk</span>
                <span
                  onClick={(e) => { e.stopPropagation(); nav(b.topIssue.page, b.topIssue.filters); }}
                  className="text-muted-foreground hover:text-teal flex items-center gap-1 cursor-pointer"
                >
                  {b.topIssue.value} {b.topIssue.label}
                  <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
