import React from 'react';
import { ArrowUpDown, Ticket, Lock } from 'lucide-react';
import { qmBacklog } from '@/lib/risk/qes';
import type { CryptoAsset } from '@/data/mockData';
import ScoreExplainer from '@/components/risk/ScoreExplainer';

type SortKey = 'priority' | 'qoe' | 'lifespanYears';

const sevColor = (q: number) =>
  q >= 80 ? 'bg-coral/15 text-coral'
  : q >= 60 ? 'bg-purple/15 text-purple-light'
  : q >= 30 ? 'bg-amber/15 text-amber'
  : 'bg-teal/15 text-teal';

const statusColor: Record<string, string> = {
  'Not assessed': 'text-coral',
  'In assessment': 'text-amber',
  'Migration planned': 'text-purple-light',
  'In-flight': 'text-teal',
  'Migrated': 'text-muted-foreground',
};

const SENS_W: Record<string, number> = { Restricted: 100, Confidential: 75, Internal: 50, Public: 25 };

interface Props {
  objects?: CryptoAsset[];
  onRaiseTicket: (asset: CryptoAsset) => void;
  onSelect?: (id: string) => void;
}

export default function MigrationPrepBacklog({ objects, onRaiseTicket, onSelect }: Props) {
  const [sortKey, setSortKey] = React.useState<SortKey>('priority');

  const items = React.useMemo(() => {
    const list = qmBacklog(objects);
    if (sortKey === 'priority') return list;
    return [...list].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));
  }, [objects, sortKey]);

  const top = items[0];

  const Header = ({ k, label, num }: { k: SortKey; label: string; num?: boolean }) => (
    <th className={`py-2 px-3 font-medium ${num ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => setSortKey(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${sortKey === k ? 'text-foreground' : ''}`}
      >
        {label}
        <ArrowUpDown className="w-3 h-3 opacity-60" />
      </button>
    </th>
  );

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Migration prep backlog</h3>
        {top && (
          <ScoreExplainer
            title={`Top priority ${top.priority.toFixed(1)}`}
            band={top.qoe >= 80 ? 'Critical' : top.qoe >= 60 ? 'High' : 'Medium'}
            factors={[
              { label: 'Data sensitivity', value: SENS_W[top.sensitivity] ?? 50, weightPct: 100, detail: top.sensitivity },
              { label: 'Lifespan', value: Math.min(100, top.lifespanYears * 10), weightPct: 100, detail: `${top.lifespanYears}y` },
              { label: 'Object exposure (QOE)', value: top.qoe, weightPct: 100 },
            ]}
            why="Ordered so the most harvest-exposed, longest-lived objects are prepared first. Urgency is floored so prioritisation holds after 2030."
            formula="priority = sensitivity · min(1, lifespan/10) · algVuln · max(0.25, (2030−year)/6)"
          />
        )}
      </div>

      <p className="text-[10px] text-muted-foreground px-5 pt-3">
        Prioritised preparation, not execution. Raising a ticket routes the object to your migration program via ServiceNow.
      </p>

      <div className="px-2 pb-3 pt-2 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary/40">
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-2 px-3 font-medium">Object</th>
              <th className="text-left py-2 px-3 font-medium">Algorithm</th>
              <th className="text-left py-2 px-3 font-medium">HNDL</th>
              <Header k="qoe" label="QOE" num />
              <Header k="priority" label="Priority" num />
              <th className="text-left py-2 px-3 font-medium">Stage</th>
              <th className="text-right py-2 px-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 12).map(it => (
              <tr key={it.asset.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                <td className="py-2 px-3">
                  <button
                    type="button"
                    onClick={() => onSelect?.(it.asset.id)}
                    className="flex items-center gap-1.5 min-w-0 text-left hover:text-purple-light transition-colors"
                  >
                    {it.agilityBlocked && <Lock className="w-2.5 h-2.5 text-amber" />}
                    <span className="font-mono text-[11px] truncate max-w-[220px]" title={it.asset.name}>{it.asset.name}</span>
                  </button>
                </td>
                <td className="py-2 px-3 font-mono text-[11px] text-coral">{it.asset.algorithm}</td>
                <td className="py-2 px-3 text-[10px] text-muted-foreground">{it.sensitivity} · {it.lifespanYears}y</td>
                <td className="py-2 px-3 text-right">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${sevColor(it.qoe)}`}>{it.qoe}</span>
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-foreground">{it.priority.toFixed(1)}</td>
                <td className={`py-2 px-3 text-[11px] font-medium ${statusColor[it.qthStatus] ?? 'text-muted-foreground'}`}>{it.qthStatus}</td>
                <td className="py-2 px-3 text-right">
                  <button
                    type="button"
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
        <p className="px-5 pb-3 text-[10px] text-muted-foreground">
          <Lock className="w-2.5 h-2.5 text-amber inline mr-1" />
          Marked objects are agility-blocked: they cannot be swapped without re-architecting.
        </p>
      )}
    </div>
  );
}
