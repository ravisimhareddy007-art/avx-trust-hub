import React from 'react';
import { ArrowRight, ExternalLink, ShieldAlert } from 'lucide-react';
import { mockAssets } from '@/data/mockData';
import { useNav } from '@/context/NavigationContext';

const certAssets = mockAssets.filter(a =>
  a.type === 'TLS Certificate' || a.type === 'Code-Signing Certificate' ||
  a.type === 'K8s Workload Cert' || a.type === 'SSH Certificate'
);

const SIG_BUCKETS: { label: string; algs: string[]; color: string; barColor: string }[] = [
  { label: 'Disallowed', algs: ['RSA-1024', 'SHA-1'], color: 'text-coral', barColor: 'bg-coral' },
  { label: 'Legacy', algs: ['RSA-2048', 'RSA-3072'], color: 'text-amber', barColor: 'bg-amber' },
  { label: 'Approved', algs: ['RSA-4096', 'ECC P-256', 'ECC P-384'], color: 'text-purple-light', barColor: 'bg-purple-light' },
  { label: 'PQC Safe', algs: ['ML-DSA-65', 'ML-KEM-768'], color: 'text-teal', barColor: 'bg-teal' },
];

const KEY_BUCKETS: { label: string; test: (a: typeof certAssets[0]) => boolean; color: string; barColor: string }[] = [
  { label: 'Weak (<2048)', test: a => { const n = parseInt(a.keyLength); return !isNaN(n) && n < 2048; }, color: 'text-coral', barColor: 'bg-coral' },
  { label: 'Legacy (2048)', test: a => a.keyLength === '2048', color: 'text-amber', barColor: 'bg-amber' },
  { label: 'Strong (4096)', test: a => a.keyLength === '4096', color: 'text-teal', barColor: 'bg-teal' },
  { label: 'PQC', test: a => a.algorithm.startsWith('ML-') || a.algorithm.startsWith('SLH-'), color: 'text-purple-light', barColor: 'bg-purple-light' },
];

function StackedBar({ segments }: { segments: { pct: number; barColor: string; onClick?: () => void; actionable?: boolean }[] }) {
  return (
    <div className="flex h-8 rounded-full overflow-hidden w-full">
      {segments.filter(s => s.pct > 0).map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={s.onClick}
          className={`${s.barColor} h-full ${s.actionable ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}`}
          style={{ width: `${s.pct}%` }}
        />
      ))}
    </div>
  );
}

function LegendRow({ items }: { items: { label: string; count: number; pct: number; color: string; actionable?: boolean; onClick?: () => void; pattern?: 'modal' | 'inventory' }[] }) {
  return (
    <div className="flex items-center gap-4 mt-2 flex-wrap">
      {items.map(it => {
        const content = (
          <>
            <span className={`font-semibold ${it.color}`}>{it.count}</span>
            <span className="text-muted-foreground">{it.label} ({it.pct}%)</span>
            {it.actionable && it.pattern === 'modal' && <ArrowRight className="h-3 w-3 text-teal opacity-0 transition-opacity group-hover:opacity-100" />}
            {it.actionable && it.pattern === 'inventory' && <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
          </>
        );

        if (!it.actionable) {
          return <div key={it.label} className="flex items-center gap-1.5 text-xs">{content}</div>;
        }

        return (
          <button
            key={it.label}
            type="button"
            onClick={it.onClick}
            className={`group flex items-center gap-1.5 text-xs ${it.pattern === 'modal' ? 'transition-colors hover:text-foreground' : 'cursor-pointer hover:text-teal transition-colors'}`}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

type AlgorithmStrengthProps = {
  openModal?: (title: string, certs: any[]) => void;
};

export default function AlgorithmStrength({ openModal }: AlgorithmStrengthProps) {
  const { setCurrentPage, setFilters } = useNav();
  const total = certAssets.length;

  const openInventory = (extra: Record<string, string> = {}) => {
    setFilters({ type: 'TLS Certificate', ...extra });
    setCurrentPage('inventory');
  };

  const sigCounts = SIG_BUCKETS.map(b => {
    const count = certAssets.filter(a => b.algs.includes(a.algorithm)).length;
    return { ...b, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
  });
  const categorized = sigCounts.reduce((s, b) => s + b.count, 0);
  if (categorized < total) {
    const approvedIdx = sigCounts.findIndex(b => b.label === 'Approved');
    if (approvedIdx >= 0) {
      sigCounts[approvedIdx].count += total - categorized;
      sigCounts[approvedIdx].pct = Math.round((sigCounts[approvedIdx].count / total) * 100);
    }
  }

  const keyCounts = KEY_BUCKETS.map(b => {
    const count = certAssets.filter(b.test).length;
    return { label: b.label, count, pct: total > 0 ? Math.round((count / total) * 100) : 0, color: b.color, barColor: b.barColor };
  });
  const keyCategorized = keyCounts.reduce((s, b) => s + b.count, 0);
  if (keyCategorized < total) {
    const strongIdx = keyCounts.findIndex(b => b.label === 'Strong (4096)');
    if (strongIdx >= 0) {
      keyCounts[strongIdx].count += total - keyCategorized;
      keyCounts[strongIdx].pct = Math.round((keyCounts[strongIdx].count / total) * 100);
    }
  }

  const qvAlgs = ['RSA-1024', 'RSA-2048', 'RSA-3072', 'RSA-4096', 'ECC P-256', 'ECC P-384', 'Ed25519', 'DSA', 'DH'];
  const qvCerts = certAssets.filter(a => qvAlgs.includes(a.algorithm));
  const qvCount = qvCerts.length;

  const handleSignatureClick = (label: string) => {
    if (label === 'Disallowed') {
      openModal?.('Disallowed Algorithms', certAssets.filter(a => ['RSA-1024', 'SHA-1'].includes(a.algorithm)));
      return;
    }
    if (label === 'Legacy') {
      openModal?.('Legacy Algorithms', certAssets.filter(a => ['RSA-2048', 'RSA-3072'].includes(a.algorithm)));
      return;
    }
    if (label === 'Approved') {
      openInventory({ algorithmGroup: 'approved' });
      return;
    }
    openInventory({ algorithmGroup: 'pqc-safe' });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <ShieldAlert className="w-4 h-4 text-purple-light" />
        <h3 className="text-sm font-semibold text-foreground">Algorithm & Key Strength</h3>
      </div>

      <div className="mb-5">
        <p className="text-xs text-muted-foreground mb-2">Signature Algorithm Distribution</p>
        <StackedBar segments={sigCounts.map(s => ({ pct: s.pct, barColor: s.barColor, onClick: () => handleSignatureClick(s.label), actionable: true }))} />
        <LegendRow items={sigCounts.map((item) => ({
          label: item.label,
          count: item.count,
          pct: item.pct,
          color: item.color,
          actionable: true,
          pattern: item.label === 'Disallowed' || item.label === 'Legacy' ? 'modal' : 'inventory',
          onClick: () => handleSignatureClick(item.label),
        }))} />
        {qvCount > 0 && (
          <button
            type="button"
            onClick={() => openModal?.('Quantum-Vulnerable Certs', qvCerts)}
            className="group mt-2 inline-flex items-center gap-1 text-xs text-amber transition-colors hover:text-foreground"
          >
            <span>⚠ {qvCount} of {total} certs use quantum-vulnerable algorithms (RSA/ECC)</span>
            <ArrowRight className="h-3 w-3 text-teal opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}
      </div>

      <div className="border-t border-border my-4" />

      <div>
        <p className="text-xs text-muted-foreground mb-2">Key Length Distribution</p>
        <StackedBar segments={keyCounts.map(s => ({ pct: s.pct, barColor: s.barColor }))} />
        <LegendRow items={keyCounts} />
      </div>
    </div>
  );
}
