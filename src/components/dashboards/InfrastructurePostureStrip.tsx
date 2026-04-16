import React, { useMemo } from 'react';
import {
  Server, Database, Globe, Boxes, Shield, Cloud, ArrowRight,
} from 'lucide-react';
import { useNav } from '@/context/NavigationContext';
import { mockITAssets } from '@/data/inventoryMockData';
import { useInventoryRegistry } from '@/context/InventoryRegistryContext';

/**
 * Infrastructure-level posture — mirrors the IdentityHealthBands design:
 * one card per asset category, stacked health bar (Critical / High / Medium / Healthy),
 * top issue link. Counts are enterprise-realistic (M/K) not just the seeded mock count.
 */

interface Band {
  name: string;
  type: string;
  icon: React.ComponentType<{ className?: string }>;
  total: string;
  totalRaw: number;
  // Health distribution — must sum to 100
  critical: number; high: number; medium: number; healthy: number;
  topIssue: { label: string; value: string; page: string; filters: Record<string, string> };
}

// Enterprise-scale mock counts. Anchors to mockITAssets where possible
// but represents the full population that discovery would surface across
// a Fortune-500 footprint.
const BANDS: Band[] = [
  {
    name: 'Hosts & Servers', type: 'Application Server', icon: Server,
    total: '184K', totalRaw: 184_320,
    critical: 6, high: 14, medium: 22, healthy: 58,
    topIssue: { label: 'crypto agent missing', value: '24,180', page: 'inventory', filters: { tab: 'infrastructure', type: 'Application Server' } },
  },
  {
    name: 'K8s & Service Mesh', type: 'K8s Cluster', icon: Boxes,
    total: '1,847', totalRaw: 1_847,
    critical: 4, high: 10, medium: 18, healthy: 68,
    topIssue: { label: 'cert-manager unhealthy', value: '147', page: 'inventory', filters: { tab: 'infrastructure', type: 'K8s Cluster' } },
  },
  {
    name: 'Cloud Accounts', type: 'Cloud Account', icon: Cloud,
    total: '521', totalRaw: 521,
    critical: 8, high: 16, medium: 20, healthy: 56,
    topIssue: { label: 'unmanaged KMS keys', value: '3,412', page: 'inventory', filters: { tab: 'infrastructure', type: 'Cloud Account' } },
  },
  {
    name: 'Databases & Stores', type: 'Database Server', icon: Database,
    total: '12.4K', totalRaw: 12_412,
    critical: 5, high: 12, medium: 19, healthy: 64,
    topIssue: { label: 'TLS not enforced', value: '847', page: 'inventory', filters: { tab: 'infrastructure', type: 'Database Server' } },
  },
  {
    name: 'Gateways & Edge', type: 'API Gateway', icon: Globe,
    total: '8.2K', totalRaw: 8_240,
    critical: 3, high: 9, medium: 14, healthy: 74,
    topIssue: { label: 'weak cipher suites', value: '1,284', page: 'inventory', filters: { tab: 'infrastructure', type: 'API Gateway' } },
  },
  {
    name: 'Vaults & HSMs', type: 'HSM', icon: Shield,
    total: '342', totalRaw: 342,
    critical: 2, high: 7, medium: 13, healthy: 78,
    topIssue: { label: 'capacity > 80%', value: '47', page: 'inventory', filters: { tab: 'infrastructure', type: 'HSM' } },
  },
];

export default function InfrastructurePostureStrip() {
  const { setCurrentPage, setFilters } = useNav();
  const { manualITAssets } = useInventoryRegistry();

  const totals = useMemo(() => {
    const totalRaw = BANDS.reduce((s, b) => s + b.totalRaw, 0);
    const blastHotspots = mockITAssets.filter(a => a.cryptoObjectIds.length >= 4 && a.riskScore > 60).length + 184; // scaled
    return { totalRaw, blastHotspots, manualCount: manualITAssets.length };
  }, [manualITAssets]);

  const nav = (page: string, filters?: Record<string, string>) => {
    if (filters) setFilters(filters);
    setCurrentPage(page);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Infrastructure Posture Bands</h2>
          <p className="text-[10px] text-muted-foreground">
            Posture by asset category · {totals.totalRaw.toLocaleString()} assets total · {totals.blastHotspots.toLocaleString()} blast-radius hotspots · click to drill into Inventory
          </p>
        </div>
        {totals.manualCount > 0 && (
          <span className="text-[10px] text-teal">+{totals.manualCount} manual entr{totals.manualCount > 1 ? 'ies' : 'y'}</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {BANDS.map(b => {
          const Icon = b.icon;
          const issuePct = b.critical + b.high;
          return (
            <button
              key={b.name}
              onClick={() => nav('inventory', { tab: 'infrastructure', type: b.type })}
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
