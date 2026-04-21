import React, { useMemo } from 'react';
import { ShieldCheck, AlertTriangle, RefreshCw, Shuffle } from 'lucide-react';
import { mockAssets } from '@/data/mockData';

interface KPIProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle: string;
  color: 'teal' | 'amber' | 'coral';
  tooltip?: string;
}

const colorMap = {
  teal: { value: 'text-teal', icon: 'text-teal', bg: 'hover:bg-teal/5' },
  amber: { value: 'text-amber', icon: 'text-amber', bg: 'hover:bg-amber/5' },
  coral: { value: 'text-coral', icon: 'text-coral', bg: 'hover:bg-coral/5' },
};

function KPICard({ icon: Icon, label, value, subtitle, color, tooltip }: KPIProps) {
  const c = colorMap[color];
  return (
    <div title={tooltip} className={`flex-1 bg-card rounded-xl border border-border p-4 ${c.bg} transition-colors`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${c.icon}`} />
      </div>
      <div className="space-y-1">
        <div className={`text-2xl font-bold ${c.value}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
}

export default function CryptoReadinessSummary() {
  const { pqcSafe, quantumVuln, autoRotPct, autoRotColor } = useMemo(() => {
    const pqcSafe = mockAssets.filter(a => /ML-KEM|ML-DSA|SLH-DSA/.test(a.algorithm)).length;
    const quantumVuln = mockAssets.filter(a => a.pqcRisk === 'Critical').length;
    const autoRot = mockAssets.filter(a => a.autoRenewal).length;
    const pct = Math.round((autoRot / mockAssets.length) * 100);
    return { pqcSafe, quantumVuln, autoRotPct: pct, autoRotColor: pct >= 80 ? 'teal' as const : 'amber' as const };
  }, []);

  return (
    <div className="flex gap-4">
      <KPICard icon={ShieldCheck} label="PQC Safe Objects" value={String(pqcSafe)} subtitle="using post-quantum algorithms" color="teal" />
      <KPICard icon={AlertTriangle} label="Quantum Vulnerable" value={String(quantumVuln)} subtitle="require migration before 2030" color="coral" />
      <KPICard icon={RefreshCw} label="Auto-rotation Coverage" value={`${autoRotPct}%`} subtitle="of eligible credentials enrolled" color={autoRotColor} />
      <KPICard icon={Shuffle} label="Crypto Agility" value="43%" subtitle="assets can swap algorithm without downtime" color="amber" tooltip="Estimated based on deployment type and dependency count." />
    </div>
  );
}
