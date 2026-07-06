import React from "react";
import { Server, Package, Database, Globe, Boxes } from "lucide-react";
import { useNav } from "@/context/NavigationContext";
import { mockITAssets } from "@/data/inventoryMockData";

// Infrastructure Coverage. IT assets are carriers of crypto objects, not governed
// entities, so this strip is pure inventory: how many assets of each class we
// have discovered, and how many crypto objects live on them. No ownership or
// policy governance, no violations, no trends (trends need a posture-history
// store, deferred). Presented as a colour-coded "where your crypto lives" view.

interface ClassTile {
  assetClass: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const CLASSES: ClassTile[] = [
  { assetClass: "Host", label: "Hosts", icon: Server, color: "hsl(var(--teal))" },
  { assetClass: "Application", label: "Applications", icon: Package, color: "#7c6bd6" },
  { assetClass: "Database", label: "Databases", icon: Database, color: "hsl(var(--amber))" },
  { assetClass: "API Gateway", label: "API Gateways", icon: Globe, color: "hsl(var(--coral))" },
  { assetClass: "Kubernetes Workload", label: "K8s Workloads", icon: Boxes, color: "#3b82c4" },
];

export default function InfrastructurePostureStrip() {
  const { setCurrentPage, setFilters } = useNav();

  const navTile = (assetClass: string) => {
    setFilters({ type: assetClass, tab: "infrastructure" });
    setCurrentPage("inventory");
  };

  const { stats, totalAssets, totalObjects } = React.useMemo(() => {
    const m: Record<string, { assets: number; objects: number }> = {};
    for (const c of CLASSES) m[c.assetClass] = { assets: 0, objects: 0 };
    let ta = 0;
    let to = 0;
    for (const a of mockITAssets) {
      const bucket = m[a.assetClass];
      if (!bucket) continue;
      bucket.assets += 1;
      bucket.objects += a.cryptoObjectIds.length;
      ta += 1;
      to += a.cryptoObjectIds.length;
    }
    return { stats: m, totalAssets: ta, totalObjects: to };
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      {/* Header */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Infrastructure Coverage</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Where your discovered crypto objects live. Click a class to drill in.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            <span className="text-foreground font-semibold">{totalAssets.toLocaleString()}</span> assets
            <span className="mx-1.5 text-muted-foreground/40">·</span>
            <span className="text-foreground font-semibold">{totalObjects.toLocaleString()}</span> crypto objects
          </span>
        </div>
      </div>

      {/* Segmented distribution bar: crypto objects by asset class */}
      <div className="flex h-2.5 rounded-full overflow-hidden mb-3 gap-[2px]">
        {CLASSES.map((c) => {
          const s = stats[c.assetClass] || { assets: 0, objects: 0 };
          const pct = totalObjects ? (s.objects / totalObjects) * 100 : 0;
          if (pct === 0) return null;
          return (
            <button
              key={c.assetClass}
              onClick={() => navTile(c.assetClass)}
              title={`${c.label}: ${s.objects} crypto objects`}
              className="h-full transition-opacity hover:opacity-80"
              style={{ width: `${pct}%`, background: c.color }}
            />
          );
        })}
      </div>

      {/* Colour-coded class tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {CLASSES.map((tile) => {
          const Icon = tile.icon;
          const s = stats[tile.assetClass] || { assets: 0, objects: 0 };
          const share = totalObjects ? Math.round((s.objects / totalObjects) * 100) : 0;
          return (
            <button
              key={tile.assetClass}
              onClick={() => navTile(tile.assetClass)}
              className="rounded-lg border border-border/60 hover:border-border bg-secondary/20 hover:bg-secondary/40 transition-all flex flex-col text-left p-3 group"
              style={{ borderLeft: `3px solid ${tile.color}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `color-mix(in srgb, ${tile.color} 16%, transparent)` }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-semibold text-foreground truncate">{tile.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-[26px] font-semibold leading-none tabular-nums"
                  style={{ fontFamily: "var(--font-serif, Georgia, serif)", color: tile.color }}
                >
                  {s.assets.toLocaleString()}
                </span>
                <span className="text-[9.5px] text-muted-foreground">assets</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                {s.objects.toLocaleString()} crypto objects
              </span>
              {/* per-class share bar */}
              <div className="mt-2 h-1 rounded-full bg-muted/40 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${share}%`, background: tile.color }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
