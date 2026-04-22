import React from 'react';
import { FileX, Globe, HelpCircle, Building, AlertTriangle, Unlink, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { mockAssets } from '@/data/mockData';

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
    return { selfSigned: 234, wildcard: 89, unknownCA: 412, rootCAIssued: 67, sanMismatch: 156, unassociated: 43 };
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

type NonStandardCertsProps = {
  openModal?: (title: string, certs: any[]) => void;
};

export default function NonStandardCerts({ openModal }: NonStandardCertsProps) {
  const counts = computeCounts();

  const getTint = (count: number) => {
    if (count > 3) return 'bg-coral/5 border-coral/20';
    if (count >= 1) return 'bg-amber/5 border-amber/20';
    return 'bg-card border-border';
  };

  const getTileCerts = (key: typeof tiles[number]['key']) => {
    switch (key) {
      case 'selfSigned': return certAssets.filter(a => a.caIssuer?.toLowerCase().includes('self') || a.owner === 'Unassigned');
      case 'wildcard': return certAssets.filter(a => a.name.startsWith('*.'));
      case 'unknownCA': return certAssets.filter(a => !a.caIssuer || a.caIssuer === 'Unknown');
      case 'rootCAIssued': return certAssets.filter(a => a.tags?.includes('root-ca'));
      case 'sanMismatch': return certAssets.filter(a => a.policyViolations > 1);
      case 'unassociated': return certAssets.filter(a => a.dependencyCount === 0);
      default: return certAssets;
    }
  };

  const handleTileClick = (label: string, key: typeof tiles[number]['key'], count: number) => {
    if (count === 0) {
      toast.info('No certificates in this category');
      return;
    }

    const certs = getTileCerts(key);
    if (!certs || certs.length === 0) {
      toast.info('No certificates in this category');
      return;
    }

    openModal?.(`Non-Standard: ${label}`, certs);
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
          const isInteractive = count > 0;
          return (
            <div
              key={t.key}
              onClick={isInteractive ? () => handleTileClick(t.label, t.key, count) : undefined}
              className={`group rounded-lg border p-4 ${getTint(count)} ${isInteractive ? 'cursor-pointer hover:bg-secondary/40 transition-all' : 'cursor-default'}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <Icon className="w-4 h-4 text-muted-foreground" />
                {isInteractive ? <ArrowRight className="h-3 w-3 text-teal opacity-0 transition-opacity group-hover:opacity-100" /> : null}
              </div>
              <p className={`text-2xl font-bold ${count > 3 ? 'text-coral' : count >= 1 ? 'text-amber' : 'text-muted-foreground'}`}>{count}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{t.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
