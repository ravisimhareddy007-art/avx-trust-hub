import React from 'react';
import { ArrowUpDown, Ticket, Lock } from 'lucide-react';
import { qmBacklog, type BacklogItem } from '@/lib/risk/qes';
import type { CryptoAsset } from '@/data/mockData';
import ScoreExplainer from '@/components/risk/ScoreExplainer';

type SortKey = 'priority' | 'qoe' | 'shelfLife';

const sevColor = (q: number) =>
  q >= 80 ? 'bg-coral/15 text-coral' : q >= 60 ? 'bg-purple/15 text-purple-light'
  : q >= 30 ? 'bg-amber/15 text-amber' : 'bg-teal/15 text-teal';

const statusColor: Record<string, string> = {
  'Not assessed': 'text-coral', 'In assessment': 'text-amber',
  'Migration planned': 'text-purple-light', 'In-flight': 'text-teal', 'Migrated': 'text-muted-foreground',
};

interface Props {
  objects?: CryptoAsset[];
  onRaiseTicket: (asset: CryptoAsset) => void;
  onSelect?: (name: string) => void;
}

// Actionable migration prep-backlog: quantum-vulnerable objects ranked by migration
// priority. Each row hands the object into the existing ServiceNow ticketing flow.
// This is preparation and prioritisation, not migration execution.
export default function MigrationPrepBacklog({ objects, onRaiseTicket, onSelect }: Props) {
  const [sortKey, setSortKey] = React.useState<SortKey>('priority');
  const items = React.useMemo<BacklogItem[]>(() => {
    const list = qmBacklog(objects);
    if (sortKey === 'priority') return list; // already priority-sorted
    return [...list].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));
  }, [objects, sortKey]);

  const top = items[0];
  const Header = ({ k, label, num }: { k: SortKey; label: string; num?: boolean }) => (
    <th className={`py-2 px-2 font-medium ${num ? 'text-right' : 'text-left'}`}>
      <button onClick={() => setSortKey(k)} className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${sortKey === k ? 'text-foreground' : ''}`}>
        {label}<ArrowUpDown className="w-3 h-3 opacity-50" />
      </button>
    </th>
  );

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Migration prep backlog</p>
        {top && (
          <ScoreExplainer
            title="Migration priority"
            band={top.qoe >= 80 ? 'Critical' : top.qoe >= 60 ? 'High' : 'Medium'}
            factors={[
              { label: 'Data sensitivity', value: ({ Restricted: 100, Confidential: 75, Internal: 50, Public: 25 } as Record<string, number>)[top.sensitivity], weightPct: 100, detail: top.sensitivity },
              { label: 'Lifespan', value: Math.min(100, top.shelfLife * 10), weightPct: 100, detail: `${top.shelfLife}y` },
              { label: 'Object exposure (QOE)', value: top.qoe, weightPct: 100 },
            ]}
            why="Ordered so the most harvest-exposed, longest-lived objects are prepared first. Urgency is floored so prioritisation holds after 2030."
            formula="priority = sensitivity · min(1, lifespan/10) · algVuln · max(0.25, (2030−year)/6)"
          />
        )}
      </div>
      <p className="text-[9.5px] text-muted-foreground mb-3">Prioritised preparation, not execution. Raising a ticket routes the object to your migration program via ServiceNow.</p>

      <div className="overflow-x-auto">
        <table className="w-full text-[10.5px]">
          <thead className="text-muted-foreground border-b border-border">
            <tr>
              <th className="py-2 px-2 text-left font-medium">Object</th>
              <th className="py-2 px-2 text-left font-medium">Algorithm</th>
              <Header k="shelfLife" label="Data" />
              <Header k="qoe" label="QOE" num />
              <Header k="priority" label="Priority" num />
              <th className="py-2 px-2 text-left font-medium">Stage</th>
              <th className="py-2 px-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 12).map((it) => (
              <tr key={it.asset.id} className="border-b border-border/40 last:border-0">
                <td className="py-2 px-2">
                  <button onClick={() => onSelect?.(it.asset.name)} className="flex items-center gap-1.5 min-w-0 text-left hover:text-purple-light transition-colors">
                    {it.agilityBlocked && <Lock className="w-3 h-3 text-coral shrink-0" />}
                    <span className="font-medium text-foreground truncate max-w-[180px]" title={it.asset.name}>{it.asset.name}</span>
                  </button>
                </td>
                <td className="py-2 px-2 text-muted-foreground">{it.asset.algorithm}</td>
                <td className="py-2 px-2 text-muted-foreground">{it.sensitivity} · {it.shelfLife}y</td>
                <td className="py-2 px-2 text-right">
                  <span className={`tabular-nums px-1.5 py-0.5 rounded ${sevColor(it.qoe)}`}>{it.qoe}</span>
                </td>
                <td className="py-2 px-2 text-right tabular-nums font-semibold text-foreground">{it.priority.toFixed(1)}</td>
                <td className={`py-2 px-2 ${statusColor[it.status] ?? 'text-muted-foreground'}`}>{it.status}</td>
                <td className="py-2 px-2 text-right">
                  <button
                    onClick={() => onRaiseTicket(it.asset)}
                    className="inline-flex items-center gap-1 text-[10px] text-purple-light hover:text-purple-light/80 font-medium transition-colors"
                  >
                    <Ticket className="w-3 h-3" /> Raise ticket
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No quantum-vulnerable objects in the current inventory.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {items.some(i => i.agilityBlocked) && (
        <p className="text-[9px] text-coral mt-3 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Marked objects are agility-blocked: they cannot be swapped without re-architecting.</p>
      )}
    </div>
  );
}
