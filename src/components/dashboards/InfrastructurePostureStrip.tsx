import React, { useMemo } from 'react';
import { Server, AlertTriangle, GitBranch, FileEdit, ArrowRight } from 'lucide-react';
import { useNav } from '@/context/NavigationContext';
import { mockITAssets } from '@/data/inventoryMockData';
import { useInventoryRegistry } from '@/context/InventoryRegistryContext';

/**
 * Infrastructure-level posture metrics — complements the identity-centric
 * Health Bands. Read directly from the inventory + registry so manually-added
 * assets count immediately.
 */
export default function InfrastructurePostureStrip() {
  const { setCurrentPage, setFilters } = useNav();
  const { manualITAssets } = useInventoryRegistry();

  const stats = useMemo(() => {
    const all = [...mockITAssets, ...manualITAssets];
    const total = all.length;
    const critical = all.filter(a => a.riskScore > 70).length;
    const moderate = all.filter(a => a.riskScore > 40 && a.riskScore <= 70).length;

    // Blast-radius hotspots: assets sharing 3+ identities with another asset.
    const hotspots = all.filter(a => a.cryptoObjectIds.length >= 4 && a.riskScore > 60).length;

    // Policy coverage avg
    const avgCoverage = Math.round(all.reduce((s, a) => s + (a.policyCoverage || 0), 0) / Math.max(all.length, 1));

    // Manual entries
    const manualCount = manualITAssets.length;

    return { total, critical, moderate, hotspots, avgCoverage, manualCount };
  }, [manualITAssets]);

  const nav = (page: string, filters: Record<string, string> = {}) => {
    setFilters(filters);
    setCurrentPage(page);
  };

  return (
    <div className="bg-card rounded-xl border border-border border-l-4 border-l-teal/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Server className="w-3.5 h-3.5 text-teal" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-teal">Infrastructure Posture</h2>
        <span className="text-[10px] text-muted-foreground">· health of hosts, clusters, gateways · click any tile to drill in</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <Tile
          label="Total assets"
          value={stats.total.toLocaleString()}
          sub={stats.manualCount > 0 ? `+${stats.manualCount} manual` : 'discovered'}
          tone="default"
          onClick={() => nav('inventory', { tab: 'infrastructure' })}
        />
        <Tile
          label="Critical risk"
          value={stats.critical.toString()}
          sub="risk score > 70"
          tone="coral"
          icon={<AlertTriangle className="w-3 h-3" />}
          onClick={() => nav('inventory', { tab: 'infrastructure', risk: 'critical' })}
        />
        <Tile
          label="Moderate risk"
          value={stats.moderate.toString()}
          sub="risk 40–70"
          tone="amber"
          onClick={() => nav('inventory', { tab: 'infrastructure', risk: 'moderate' })}
        />
        <Tile
          label="Blast-radius hotspots"
          value={stats.hotspots.toString()}
          sub="shared identities ≥ 4"
          tone="purple"
          icon={<GitBranch className="w-3 h-3" />}
          onClick={() => nav('inventory', { tab: 'infrastructure', view: 'blast-radius' })}
        />
        <Tile
          label="Policy coverage"
          value={`${stats.avgCoverage}%`}
          sub="avg across assets"
          tone="teal"
          onClick={() => nav('policy-builder')}
        />
      </div>

      {stats.manualCount > 0 && (
        <div className="mt-3 rounded-md border border-teal/25 bg-teal/5 px-3 py-1.5 flex items-center gap-2 text-[10.5px]">
          <FileEdit className="w-3 h-3 text-teal" />
          <span className="text-muted-foreground">
            <span className="text-foreground font-medium">{stats.manualCount}</span> asset{stats.manualCount > 1 ? 's' : ''} added via Manual Entry · awaiting auto-merge with discovery
          </span>
          <button
            onClick={() => nav('inventory', { tab: 'infrastructure' })}
            className="ml-auto text-teal hover:underline flex items-center gap-1"
          >
            View <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function Tile({
  label, value, sub, tone, icon, onClick,
}: {
  label: string;
  value: string;
  sub: string;
  tone: 'default' | 'coral' | 'amber' | 'purple' | 'teal';
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  const tones: Record<string, string> = {
    default: 'text-foreground',
    coral: 'text-coral',
    amber: 'text-amber',
    purple: 'text-purple-light',
    teal: 'text-teal',
  };
  return (
    <button
      onClick={onClick}
      className="text-left bg-secondary/30 hover:bg-secondary/60 rounded-lg p-2.5 border border-transparent hover:border-border transition-all group"
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        {icon}{label}
      </div>
      <div className={`text-lg font-bold tabular-nums leading-none ${tones[tone]}`}>{value}</div>
      <div className="text-[9.5px] text-muted-foreground mt-0.5">{sub}</div>
    </button>
  );
}
