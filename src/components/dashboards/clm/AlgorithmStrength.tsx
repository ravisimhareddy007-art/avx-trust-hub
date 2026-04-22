import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { mockAssets } from '@/data/mockData';

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

function StackedBar({ segments }: { segments: { pct: number; barColor: string }[] }) {
  return (
    <div className="flex h-8 rounded-full overflow-hidden w-full">
      {segments.filter(s => s.pct > 0).map((s, i) => (
        <div key={i} className={`${s.barColor} h-full`} style={{ width: `${s.pct}%` }} />
      ))}
    </div>
  );
}

function LegendRow({ items }: { items: { label: string; count: number; pct: number; color: string }[] }) {
  return (
    <div className="flex items-center gap-4 mt-2 flex-wrap">
      {items.map(it => (
        <div key={it.label} className="flex items-center gap-1.5 text-xs">
          <span className={`font-semibold ${it.color}`}>{it.count}</span>
          <span className="text-muted-foreground">{it.label} ({it.pct}%)</span>
        </div>
      ))}
    </div>
  );
}

type AlgorithmStrengthProps = {
  openModal?: (title: string, certs: any[]) => void;
};

export default function AlgorithmStrength({ openModal: _openModal }: AlgorithmStrengthProps) {
  const total = certAssets.length;

  // Signature distribution
  const sigCounts = SIG_BUCKETS.map(b => {
    const count = certAssets.filter(a => b.algs.includes(a.algorithm)).length;
    return { ...b, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
  });
  // Assign uncategorized to "Approved"
  const categorized = sigCounts.reduce((s, b) => s + b.count, 0);
  if (categorized < total) {
    const approvedIdx = sigCounts.findIndex(b => b.label === 'Approved');
    if (approvedIdx >= 0) {
      sigCounts[approvedIdx].count += total - categorized;
      sigCounts[approvedIdx].pct = Math.round((sigCounts[approvedIdx].count / total) * 100);
    }
  }

  // Key length distribution
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

  // Quantum vulnerable
  const qvAlgs = ['RSA-1024', 'RSA-2048', 'RSA-3072', 'RSA-4096', 'ECC P-256', 'ECC P-384', 'Ed25519', 'DSA', 'DH'];
  const qvCount = certAssets.filter(a => qvAlgs.includes(a.algorithm)).length;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <ShieldAlert className="w-4 h-4 text-purple-light" />
        <h3 className="text-sm font-semibold text-foreground">Algorithm & Key Strength</h3>
      </div>

      {/* Signature Algorithm */}
      <div className="mb-5">
        <p className="text-xs text-muted-foreground mb-2">Signature Algorithm Distribution</p>
        <StackedBar segments={sigCounts.map(s => ({ pct: s.pct, barColor: s.barColor }))} />
        <LegendRow items={sigCounts} />
        {qvCount > 0 && (
          <p className="text-xs text-amber mt-2">
            ⚠ {qvCount} of {total} certs use quantum-vulnerable algorithms (RSA/ECC)
          </p>
        )}
      </div>

      <div className="border-t border-border my-4" />

      {/* Key Length */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Key Length Distribution</p>
        <StackedBar segments={keyCounts.map(s => ({ pct: s.pct, barColor: s.barColor }))} />
        <LegendRow items={keyCounts} />
      </div>
    </div>
  );
}
