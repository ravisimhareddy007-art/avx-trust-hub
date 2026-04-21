import React, { useMemo } from 'react';
import { mockAssets } from '@/data/mockData';

const BUCKETS = [
  { name: 'PQC Safe', algos: ['ML-KEM-768', 'ML-DSA-65', 'SLH-DSA'], color: 'bg-teal', text: 'text-teal', badge: 'bg-teal/15 text-teal' },
  { name: 'Approved', algos: ['AES-256', 'HMAC-SHA256', 'ECC P-384', 'Ed25519'], color: 'bg-purple', text: 'text-purple', badge: 'bg-purple/15 text-purple' },
  { name: 'Legacy', algos: ['RSA-2048', 'RSA-3072', 'ECC P-256'], color: 'bg-amber', text: 'text-amber', badge: 'bg-amber/15 text-amber' },
  { name: 'Disallowed', algos: ['RSA-1024', 'SHA-1', '3-key TDEA'], color: 'bg-coral', text: 'text-coral', badge: 'bg-coral/15 text-coral' },
] as const;

const QUANTUM_VULNERABLE = new Set(['RSA-2048', 'RSA-3072', 'RSA-1024', 'ECC P-256', 'ECC P-384', 'Ed25519', 'DSA', 'DH']);

function getBucket(alg: string) {
  for (const b of BUCKETS) {
    if (b.algos.some(a => alg.includes(a) || alg === a)) return b;
  }
  return BUCKETS[1]; // default Approved
}

function getNistStatus(alg: string) {
  if (BUCKETS[0].algos.some(a => alg.includes(a))) return 'PQC Safe';
  if (BUCKETS[3].algos.some(a => alg.includes(a))) return 'Disallowed';
  if (BUCKETS[2].algos.some(a => alg.includes(a))) return 'Legacy';
  return 'Approved';
}

export default function AlgorithmConcentration() {
  const { bucketCounts, topAlgos, total } = useMemo(() => {
    const freq: Record<string, number> = {};
    mockAssets.forEach(a => { freq[a.algorithm] = (freq[a.algorithm] || 0) + 1; });

    const bucketCounts = BUCKETS.map(b => {
      const count = Object.entries(freq)
        .filter(([alg]) => b.algos.some(a => alg.includes(a) || alg === a))
        .reduce((s, [, c]) => s + c, 0);
      return { ...b, count };
    });

    // Anything not matched goes to Approved
    const matched = bucketCounts.reduce((s, b) => s + b.count, 0);
    bucketCounts[1].count += mockAssets.length - matched;

    const topAlgos = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([alg, count]) => ({
        alg,
        count,
        bucket: getBucket(alg),
        quantumVulnerable: QUANTUM_VULNERABLE.has(alg),
        nist: getNistStatus(alg),
      }));

    return { bucketCounts, topAlgos, total: mockAssets.length };
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Algorithm Concentration</h3>
        <span className="text-[11px] text-muted-foreground">Based on live inventory</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-8 rounded-lg overflow-hidden mb-3">
        {bucketCounts.map(b => {
          const pct = total > 0 ? (b.count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div key={b.name} className={`${b.color} transition-all`} style={{ width: `${pct}%` }}
              title={`${b.name}: ${b.count} (${Math.round(pct)}%)`} />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {bucketCounts.map(b => {
          const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
          return (
            <div key={b.name} className="flex items-center gap-2 text-[11px]">
              <span className={`w-2.5 h-2.5 rounded-sm ${b.color} inline-block flex-shrink-0`} />
              <span className="text-muted-foreground">{b.name}</span>
              <span className={`font-semibold ${b.text}`}>{b.count}</span>
              <span className="text-muted-foreground">({pct}%)</span>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground border-b border-border">
            <th className="text-left pb-2 font-medium">Algorithm</th>
            <th className="text-left pb-2 font-medium">Count</th>
            <th className="text-left pb-2 font-medium">Bucket</th>
            <th className="text-left pb-2 font-medium">Quantum Vulnerable</th>
            <th className="text-left pb-2 font-medium">NIST Status</th>
          </tr>
        </thead>
        <tbody>
          {topAlgos.map(a => (
            <tr key={a.alg} className="border-b border-border/50 last:border-0">
              <td className="py-2.5 font-medium text-foreground">{a.alg}</td>
              <td className="py-2.5 text-foreground">{a.count}</td>
              <td className="py-2.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${a.bucket.badge}`}>
                  {a.bucket.name}
                </span>
              </td>
              <td className="py-2.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${a.quantumVulnerable ? 'bg-coral/15 text-coral' : 'bg-teal/15 text-teal'}`}>
                  {a.quantumVulnerable ? 'Yes' : 'No'}
                </span>
              </td>
              <td className="py-2.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  a.nist === 'Disallowed' ? 'bg-coral/15 text-coral' :
                  a.nist === 'Legacy' ? 'bg-amber/15 text-amber' :
                  a.nist === 'PQC Safe' ? 'bg-teal/15 text-teal' :
                  'bg-purple/15 text-purple'
                }`}>
                  {a.nist}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
