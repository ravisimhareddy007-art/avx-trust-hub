import React, { useMemo, useState } from 'react';
import { Key, Lock, Bot, User } from 'lucide-react';
import { mockAssets } from '@/data/mockData';
import { useNav } from '@/context/NavigationContext';

type Severity = 'Critical' | 'High' | 'Medium';

interface TriageItem {
  type: 'orphaned' | 'overprivileged' | 'secret' | 'ssh';
  label: string;
  detail: string;
  severity: Severity;
  action: string;
  page: string;
}

const SEVERITY_ORDER: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2 };

const SEVERITY_COLORS: Record<Severity, string> = {
  Critical: 'bg-coral/15 text-coral',
  High: 'bg-amber/15 text-amber',
  Medium: 'bg-muted text-muted-foreground',
};

const TYPE_ICONS: Record<TriageItem['type'], React.ElementType> = {
  ssh: Key,
  secret: Lock,
  overprivileged: Bot,
  orphaned: User,
};

function buildItems(): TriageItem[] {
  const items: TriageItem[] = [];

  mockAssets.forEach(a => {
    if (a.owner === 'Unassigned' || a.status === 'Orphaned') {
      items.push({ type: 'orphaned', label: a.name, detail: `No owner · ${a.type}`, severity: 'High', action: 'Assign Owner', page: 'remediation' });
    }
    if (a.type === 'AI Agent Token' && a.agentMeta?.permissionRisk === 'Over-privileged') {
      items.push({ type: 'overprivileged', label: a.name, detail: 'Over-privileged · unused scopes detected', severity: 'High', action: 'Review Scopes', page: 'remediation' });
    }
    if (a.type === 'API Key / Secret' && a.policyViolations > 0) {
      items.push({ type: 'secret', label: a.name, detail: 'Policy violation · rotation overdue', severity: 'Critical', action: 'Rotate Now', page: 'remediation' });
    }
    if (a.type === 'SSH Key' && a.daysToExpiry > 90) {
      items.push({ type: 'ssh', label: a.name, detail: 'Not rotated in 90+ days · NIST IR 7966', severity: 'Medium', action: 'Rotate', page: 'remediation' });
    }
  });

  items.sort((a, b) => {
    const sd = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return sd !== 0 ? sd : a.label.localeCompare(b.label);
  });

  return items;
}

export default function TriageQueue() {
  const { setCurrentPage } = useNav();
  const items = useMemo(buildItems, []);
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? items : items.slice(0, 8);
  const remaining = items.length - 8;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Triage Queue</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Sorted by severity · all types</p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-coral/15 text-coral">
          {items.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left pb-2 font-medium w-20">Severity</th>
              <th className="text-left pb-2 font-medium w-10" />
              <th className="text-left pb-2 font-medium">Credential</th>
              <th className="text-left pb-2 font-medium">Detail</th>
              <th className="text-right pb-2 font-medium w-28">Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item, i) => {
              const Icon = TYPE_ICONS[item.type];
              return (
                <tr key={`${item.type}-${i}`} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${SEVERITY_COLORS[item.severity]}`}>
                      {item.severity}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </td>
                  <td className="py-2.5 font-medium text-foreground truncate max-w-[200px]">
                    {item.label}
                  </td>
                  <td className="py-2.5 text-muted-foreground">{item.detail}</td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => setCurrentPage(item.page)}
                      className="px-2.5 py-1 rounded text-[10px] font-medium bg-teal/15 text-teal hover:bg-teal/25 transition-colors"
                    >
                      {item.action}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expand link */}
      {remaining > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 text-xs text-teal hover:text-teal-light transition-colors"
        >
          + {remaining} more
        </button>
      )}
    </div>
  );
}
