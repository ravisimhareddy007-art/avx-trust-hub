import React from 'react';
import { Globe, Server, Boxes, Shield, Bot, ArrowRight, TrendingUp, TrendingDown, Eye, Lock, User } from 'lucide-react';
import { useNav } from '@/context/NavigationContext';

interface GapRow {
  icon: React.ComponentType<{ className?: string }>;
  dimension: string;
  label: string;
  value: string;
  coverageGap: 'unscanned' | 'no-policy' | 'unowned';
}

interface Tile {
  name: string;
  assetType: string;
  icon: React.ComponentType<{ className?: string }>;
  enterpriseTotal: string;
  atRisk: number;
  trend: number;
  gaps: GapRow[];
}

const TILES: Tile[] = [
  {
    name: 'API Gateways',
    assetType: 'API Gateway',
    icon: Globe,
    enterpriseTotal: '1,840',
    atRisk: 22,
    trend: +1.4,
    gaps: [
      { icon: Eye,  dimension: 'Discovery', label: '28% of gateways not scanned by platform', value: '515', coverageGap: 'unscanned' },
      { icon: Lock, dimension: 'Control',   label: '32% not under any active TLS policy',     value: '589', coverageGap: 'no-policy' },
      { icon: User, dimension: 'Ownership', label: '14 gateways with no owner assigned',      value: '14',  coverageGap: 'unowned'   },
    ],
  },
  {
    name: 'Application Servers',
    assetType: 'Application Server',
    icon: Server,
    enterpriseTotal: '12,400',
    atRisk: 18,
    trend: +0.6,
    gaps: [
      { icon: Eye,  dimension: 'Discovery', label: '284 servers never scanned for crypto assets', value: '284',   coverageGap: 'unscanned' },
      { icon: Lock, dimension: 'Control',   label: '18% have no key management policy',           value: '2,232', coverageGap: 'no-policy' },
      { icon: User, dimension: 'Ownership', label: '312 servers with no owner assigned',          value: '312',   coverageGap: 'unowned'   },
    ],
  },
  {
    name: 'Kubernetes Clusters',
    assetType: 'K8s Cluster',
    icon: Boxes,
    enterpriseTotal: '648',
    atRisk: 14,
    trend: -1.2,
    gaps: [
      { icon: Eye,  dimension: 'Discovery', label: '46 clusters not discovered by platform', value: '46',  coverageGap: 'unscanned' },
      { icon: Lock, dimension: 'Control',   label: '138 clusters below security baseline',   value: '138', coverageGap: 'no-policy' },
      { icon: User, dimension: 'Ownership', label: '22 clusters without owner assigned',     value: '22',  coverageGap: 'unowned'   },
    ],
  },
  {
    name: 'Vault Servers',
    assetType: 'Vault Server',
    icon: Shield,
    enterpriseTotal: '284',
    atRisk: 26,
    trend: +2.1,
    gaps: [
      { icon: Eye,  dimension: 'Discovery', label: '8 Vault instances not connected to platform', value: '8',  coverageGap: 'unscanned' },
      { icon: Lock, dimension: 'Control',   label: '24 Vault servers with no governance policy',  value: '24', coverageGap: 'no-policy' },
      { icon: User, dimension: 'Ownership', label: '12 Vault instances with no owner assigned',   value: '12', coverageGap: 'unowned'   },
    ],
  },
  {
    name: 'AI Platforms',
    assetType: 'AI Platform',
    icon: Bot,
    enterpriseTotal: '486',
    atRisk: 32,
    trend: +4.8,
    gaps: [
      { icon: Eye,  dimension: 'Discovery', label: '22% of AI agents not in platform inventory',  value: '107', coverageGap: 'unscanned' },
      { icon: Lock, dimension: 'Control',   label: '40% of agent tokens under no policy control', value: '194', coverageGap: 'no-policy' },
      { icon: User, dimension: 'Ownership', label: '52 AI platforms without human sponsor',       value: '52',  coverageGap: 'unowned'   },
    ],
  },
];

const TOTAL_OUTSIDE_PERIMETER = 487;

const DIM_COLOR: Record<string, string> = {
  Discovery: 'text-purple-light',
  Control:   'text-amber',
  Ownership: 'text-coral',
};

const DIM_DOT: Record<string, string> = {
  Discovery: 'bg-purple',
  Control:   'bg-amber',
  Ownership: 'bg-coral',
};

export default function InfrastructurePostureStrip() {
  const { setCurrentPage, setFilters } = useNav();

  const navTile = (assetType: string) => {
    setFilters({ type: assetType, tab: 'infrastructure' });
    setCurrentPage('inventory');
  };

  const navGap = (assetType: string, coverageGap: string) => {
    setFilters({ type: assetType, coverageGap, tab: 'infrastructure' });
    setCurrentPage('inventory');
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Infrastructure Coverage Spotlight</h2>
          <p className="text-[10px] text-muted-foreground">
            Discovery, Control, and Ownership gaps across your infrastructure — click any row to drill into the affected assets
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {TOTAL_OUTSIDE_PERIMETER} assets outside trust perimeter
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {TILES.map(tile => {
          const Icon = tile.icon;
          const TrendIcon = tile.trend >= 0 ? TrendingUp : TrendingDown;
          const trendColor = tile.trend > 0.5 ? 'text-coral' : tile.trend < -0.5 ? 'text-teal' : 'text-muted-foreground';

          return (
            <div key={tile.name} className="bg-secondary/30 hover:bg-secondary/50 rounded-lg border border-transparent hover:border-border transition-all flex flex-col">
              <button
                onClick={() => navTile(tile.assetType)}
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
                {tile.gaps.map(g => {
                  const GapIcon = g.icon;
                  return (
                    <button
                      key={g.dimension}
                      onClick={() => navGap(tile.assetType, g.coverageGap)}
                      className="w-full flex items-center gap-2 px-1.5 py-1 rounded hover:bg-background/60 transition-colors text-left group/row"
                      title={`${g.dimension} gap: ${g.label}`}
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${DIM_DOT[g.dimension]}`} />
                      <GapIcon className={`w-2.5 h-2.5 flex-shrink-0 ${DIM_COLOR[g.dimension]}`} />
                      <span className="text-[10.5px] text-foreground/90 leading-tight flex-1 truncate">{g.label}</span>
                      <span className={`text-[10.5px] font-semibold tabular-nums ${DIM_COLOR[g.dimension]}`}>{g.value}</span>
                      <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover/row:opacity-60 text-teal transition-opacity flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
