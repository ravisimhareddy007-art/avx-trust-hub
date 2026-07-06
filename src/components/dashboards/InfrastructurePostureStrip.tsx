import React from "react";
import { Server, Package, Database, Globe, Boxes } from "lucide-react";
import { useNav } from "@/context/NavigationContext";
import { mockITAssets } from "@/data/inventoryMockData";

// Infrastructure Coverage. IT assets are carriers of crypto objects, not governed
// entities, so this strip is pure inventory: how many assets of each class we
// have discovered, and how many crypto objects live on them. No ownership or
// policy governance, no violations, no trends (trends need a posture-history
// store, deferred).

interface ClassTile {
  assetClass: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CLASSES: ClassTile[] = [
  { assetClass: "Host", label: "Hosts", icon: Server },
  { assetClass: "Application", label: "Applications", icon: Package },
  { assetClass: "Database", label: "Databases", icon: Database },
  { assetClass: "API Gateway", label: "API Gateways", icon: Globe },
  { assetClass: "Kubernetes Workload", label: "Kubernetes Workloads", icon: Boxes },
];

export default function InfrastructurePostureStrip() {
  const { setCurrentPage, setFilters } = useNav();

  const navTile = (assetClass: string) => {
    setFilters({ type: assetClass, tab: "infrastructure" });
    setCurrentPage("inventory");
  };

  const stats = React.useMemo(() => {
    const m: Record<string, { assets: number; objects: number }> = {};
    for (const c of CLASSES) m[c.assetClass] = { assets: 0, objects: 0 };
    for (const a of mockITAssets) {
      const bucket = m[a.assetClass];
      if (!bucket) continue;
      bucket.assets += 1;
      bucket.objects += a.cryptoObjectIds.length;
    }
    return m;
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Infrastructure Coverage</h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Where your discovered crypto objects live. Click any class to see the assets and the objects on them.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {CLASSES.map((tile) => {
          const Icon = tile.icon;
          const s = stats[tile.assetClass] || { assets: 0, objects: 0 };
          return (
            <button
              key={tile.assetClass}
              onClick={() => navTile(tile.assetClass)}
              className="bg-secondary/30 hover:bg-secondary/50 rounded-lg border border-transparent hover:border-border transition-all flex flex-col items-start text-left px-3 py-3 group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                <span className="text-[11.5px] font-semibold text-foreground truncate">{tile.label}</span>
              </div>
              <span
                className="text-[26px] font-semibold text-foreground leading-none tabular-nums"
                style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
              >
                {s.assets.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground mt-1.5 tabular-nums">
                {s.objects.toLocaleString()} crypto objects
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
