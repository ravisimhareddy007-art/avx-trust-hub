import React from 'react';
import { Globe, Server, Boxes, Shield, Bot, ArrowRight, TrendingUp, TrendingDown, User, Lock } from 'lucide-react';
import { useNav } from '@/context/NavigationContext';

interface GapRow {
  dimension: 'Ownership' | 'Policy Coverage';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  enterpriseCount: number;
  coverageGap: 'unowned' | 'no-policy';
}

interface Tile {
  name: string;
  assetType: string;
  icon: React.ComponentType<{ className?: string }>;
  enterpriseTotal: string;
  outsidePerimeter: number;
  trend: number;
  gaps: GapRow[];
}

const TILES: Tile[] = [
  {
    name: 'API Gateways',
    assetType: 'API Gateway',
    icon: Globe,
    enterpriseTotal: '1,840',
    outsidePerimeter: 22,
    trend: +1.4,
    gaps: [
      { dimension: 'Ownership',       icon: User, label: 'Gateways with no owner assigned',   enterpriseCount: 14,  coverageGap: 'unowned'   },
      { dimension: 'Policy Coverage', icon: Lock, label: 'Gateways with no active policy',     enterpriseCount: 589, coverageGap: 'no-policy' },
    ],
  },
  {
    name: 'Application Servers',
    assetType: 'Application Server',
    icon: Server,
    enterpriseTotal: '12,400',
    outsidePerimeter: 18,
    trend: +0.6,
    gaps: [
      { dimension: 'Ownership',       icon: User, label: 'Servers with no owner assigned',     enterpriseCount: 312,  coverageGap: 'unowned'   },
      { dimension: 'Policy Coverage', icon: Lock, label: 'Servers with no active policy',       enterpriseCount: 2232, coverageGap: 'no-policy' },
    ],
  },
  {
    name: 'Kubernetes Clusters',
    assetType: 'K8s Cluster',
    icon: Boxes,
    enterpriseTotal: '648',
    outsidePerimeter: 14,
    trend: -1.2,
    gaps: [
      { dimension: 'Ownership',       icon: User, label: 'Clusters with no owner assigned',    enterpriseCount: 22,  coverageGap: 'unowned'   },
      { dimension: 'Policy Coverage', icon: Lock, label: 'Clusters with no active policy',      enterpriseCount: 138, coverageGap: 'no-policy' },
    ],
  },
  {
    name: 'Vault Servers',
    assetType: 'Vault Server',
    icon: Shield,
    enterpriseTotal: '284',
    outsidePerimeter: 26,
    trend: +2.1,
    gaps: [
      { dimension: 'Ownership',       icon: User, label: 'Vault instances with no owner',       enterpriseCount: 12, coverageGap: 'unowned'   },
      { dimension: 'Policy Coverage', icon: Lock, label: 'Vault servers with no active policy', enterpriseCount: 24, coverageGap: 'no-policy' },
    ],
  },
  {
    name: 'AI Platforms',
    assetType: 'AI Platform',
    icon: Bot,
    enterpriseTotal: '486',
    outsidePerimeter: 32,
    trend: +4.8,
    gaps: [
      { dimension: 'Ownership',       icon: User, label: 'AI platforms with no human sponsor',  enterpriseCount: 52,  coverageGap: 'unowned'   },
      { dimension: 'Policy Coverage', icon: Lock, label: 'AI platforms with no active policy',   enterpriseCount: 194, coverageGap: 'no-policy' },
    ],
  },
];

const DIM_COLOR: Record<GapRow['dimension'], string> = {
  'Ownership':       'text-coral',
  'Policy Coverage': 'text-amber',
};

const DIM_DOT: Record<GapRow['dimension'], string> = {
  'Ownership':       'bg-coral',
  'Policy Coverage': 'bg-amber',
};

export default function InfrastructurePostureStrip() {
  const { setCurrentPage, setFilters } = useNav();

  const navTile = (assetType: string) => {
    setFilters({ type: assetType, tab: 'infrastructure' });
    setCurrentPage('inventory');
  };

  const navGap = (assetType: string, coverageGap: string, enterpriseCount: number) => {
    setFilters({
      type: assetType,
      tab: 'infrastructure',
      coverageGap,
      enterpriseCount: String(enterpriseCount),
    });
    setCurrentPage('inventory');
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      {/* Strip header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Infrastructure Governance Coverage</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Assets not yet under ownership or policy governance — click any row to see which ones.
            <span className="ml-2 inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-coral inline-block" />
                Ownership
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber inline-block" />
                Policy Coverage
              </span>
            </span>
          </p>
        </div>
      </div>

      {/* Five tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {TILES.map(tile => {
          const Icon = tile.icon;
          const TrendIcon = tile.trend >= 0 ? TrendingUp : TrendingDown;
          const trendColor = tile.trend > 0.5 ? 'text-coral' : tile.trend < -0.5 ? 'text-teal' : 'text-muted-foreground';

          return (
            <div key={tile.name} className="bg-secondary/30 hover:bg-secondary/50 rounded-lg border border-transparent hover:border-border transition-all flex flex-col">
              {/* Tile header */}
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

              {/* Governance coverage bar */}
              <div className="px-3 pb-2">
                <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/40 mb-1">
                  <div style={{ width: `${tile.outsidePerimeter}%` }} className="bg-coral" />
                  <div style={{ width: `${100 - tile.outsidePerimeter}%` }} className="bg-teal/60" />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-coral font-semibold tabular-nums">
                    {tile.outsidePerimeter}% not governed
                  </span>
                  <span className={`flex items-center gap-0.5 tabular-nums ${trendColor}`} title="7-day trend">
                    <TrendIcon className="w-2.5 h-2.5" />
                    {tile.trend > 0 ? '+' : ''}{tile.trend.toFixed(1)}%
                    <span className="text-muted-foreground text-[9px] ml-0.5">7d</span>
                  </span>
                </div>
              </div>

              {/* Two fixed gap rows */}
              <div className="px-2 pb-2 border-t border-border/40 pt-1.5 space-y-0.5">
                {tile.gaps.map(gap => (
                  <button
                    key={gap.dimension}
                    onClick={() => navGap(tile.assetType, gap.coverageGap, gap.enterpriseCount)}
                    className="w-full flex flex-col px-2 py-1.5 rounded hover:bg-background/60 transition-colors text-left group/row"
                  >
                    <div className="flex items-center justify-between w-full mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DIM_DOT[gap.dimension]}`} />
                        <span className={`text-[9.5px] font-semibold uppercase tracking-wider ${DIM_COLOR[gap.dimension]}`}>
                          {gap.dimension}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-sm font-bold tabular-nums leading-none ${DIM_COLOR[gap.dimension]}`}>
                          {gap.enterpriseCount.toLocaleString()}
                        </span>
                        <ArrowRight className="w-2.5 h-2.5 text-teal opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug pl-3">
                      {gap.label}
                    </p>
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
