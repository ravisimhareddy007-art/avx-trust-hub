import React from 'react';
import { FileX, Globe, HelpCircle, Building, AlertTriangle, Unlink } from 'lucide-react';
import { mockAssets } from '@/data/mockData';
import { useNav } from '@/context/NavigationContext';

const certAssets = mockAssets.filter(a =>
  a.type === 'TLS Certificate' || a.type === 'Code-Signing Certificate' ||
  a.type === 'K8s Workload Cert' || a.type === 'SSH Certificate'
);

function computeCounts() {
  let selfSigned = certAssets.filter(a => a.caIssuer?.toLowerCase().includes('self') || a.owner === 'Unassigned').length;
  let wildcard = certAssets.filter(a => a.name.startsWith('*.')).length;
  let unknownCA = certAssets.filter(a => !a.caIssuer || a.caIssuer === 'Unknown').length;
  let rootCAIssued = certAssets.filter(a => a.tags?.includes('root-ca')).length;
  let sanMismatch = certAssets.filter(a => a.policyViolations > 1).length;
  let unassociated = certAssets.filter(a => a.dependencyCount === 0).length;

  if (selfSigned + wildcard + unknownCA + rootCAIssued + sanMismatch + unassociated === 0) {
    return { selfSigned: 5, wildcard: 3, unknownCA: 8, rootCAIssued: 3, sanMismatch: 7, unassociated: 4 };
  }
  return { selfSigned, wildcard, unknownCA, rootCAIssued, sanMismatch, unassociated };
}

const tiles = [
  { key: 'selfSigned', label: 'Self-Signed', icon: FileX },
  { key: 'wildcard', label: 'Wildcard', icon: Globe },
  { key: 'unknownCA', label: 'Unknown CA', icon: HelpCircle },
  { key: 'rootCAIssued', label: 'Root CA Issued', icon: Building },
  { key: 'sanMismatch', label: 'SAN Mismatch', icon: AlertTriangle },
  { key: 'unassociated', label: 'Unassociated', icon: Unlink },
] as const;

export default function NonStandardCerts() {
  const { setCurrentPage } = useNav();
  const counts = computeCounts();

  const getTint = (count: number) => {
    if (count > 3) return 'bg-coral/5 border-coral/20';
    if (count >= 1) return 'bg-amber/5 border-amber/20';
    return 'bg-card border-border';
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Non-Standard Certificates</h3>
        <span className="text-[10px] text-muted-foreground">click any tile to investigate</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {tiles.map(t => {
          const count = counts[t.key];
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              onClick={() => setCurrentPage('inventory')}
              className={`rounded-lg border p-4 cursor-pointer hover:brightness-110 transition-all ${getTint(count)}`}
            >
              <Icon className="w-4 h-4 text-muted-foreground mb-2" />
              <p className={`text-2xl font-bold ${count > 3 ? 'text-coral' : count >= 1 ? 'text-amber' : 'text-muted-foreground'}`}>{count}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{t.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
