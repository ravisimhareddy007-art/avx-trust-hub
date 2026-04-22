import React from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ESTATE_SUMMARY, mockAssets } from '@/data/mockData';
import { useNav } from '@/context/NavigationContext';
import type { CertCounts } from './types';

const allCerts = mockAssets.filter((a) => a.type.includes('Certificate'));

type OperationsStatusBandsProps = {
  openModal?: (title: string, certs: any[]) => void;
  certCounts: CertCounts;
};

type Segment = {
  label: string;
  count: number;
  pct: number;
  color: string;
  trackClass: string;
  pattern: 'inventory' | 'modal';
  action: () => void;
};

function CompactBandCard({
  title,
  segments,
  refreshMessage,
}: {
  title: string;
  segments: [Segment, Segment];
  refreshMessage: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>0m ago</span>
          <button type="button" onClick={() => toast.success(refreshMessage)} className="transition-colors hover:text-foreground">
            <RefreshCw className="h-3 w-3" />
          </button>
          <Info className="h-3 w-3" />
        </div>
      </div>

      <div className="flex h-6 overflow-hidden rounded-full bg-secondary/40">
        {segments.map((segment) => (
          <button
            key={segment.label}
            type="button"
            onClick={segment.action}
            className={`${segment.trackClass} h-full transition-opacity hover:opacity-80 ${segment.pattern === 'inventory' ? 'cursor-pointer' : 'cursor-pointer'}`}
            style={{ width: `${segment.pct}%` }}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-muted-foreground">
        {segments.map((segment) => (
          <button
            key={segment.label}
            type="button"
            onClick={segment.action}
            className={`group inline-flex items-center gap-1.5 ${segment.pattern === 'inventory' ? 'cursor-pointer hover:text-teal transition-colors' : 'cursor-pointer hover:text-foreground transition-colors'}`}
          >
            <span className={`h-2.5 w-2.5 rounded-sm ${segment.trackClass}`} />
            <span>{segment.label}({segment.count.toLocaleString()})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OperationsStatusBands({ openModal }: OperationsStatusBandsProps) {
  const { setCurrentPage, setFilters } = useNav();

  const openInventory = (filterValue: string) => {
    setFilters({ type: 'TLS Certificate', status: filterValue });
    setCurrentPage('inventory');
  };

  const openGuardedModal = (title: string, certs: typeof allCerts) => {
    if (!certs || certs.length === 0) {
      toast.info('No certificates in this category');
      return;
    }
    openModal?.(title, certs);
  };

  const managedSegments: [Segment, Segment] = [
    {
      label: 'Managed',
      count: Math.round(ESTATE_SUMMARY.certificates * 0.85),
      pct: 85,
      color: 'hsl(var(--purple))',
      trackClass: 'bg-purple-light',
      pattern: 'inventory',
      action: () => openInventory('Managed'),
    },
    {
      label: 'Monitored',
      count: Math.round(ESTATE_SUMMARY.certificates * 0.15),
      pct: 15,
      color: 'hsl(var(--teal))',
      trackClass: 'bg-teal',
      pattern: 'inventory',
      action: () => openInventory('Monitored'),
    },
  ];

  const autoRenewalSegments: [Segment, Segment] = [
    {
      label: 'Automated',
      count: Math.round(ESTATE_SUMMARY.certificates * 0.4),
      pct: 40,
      color: 'hsl(var(--teal))',
      trackClass: 'bg-teal',
      pattern: 'inventory',
      action: () => {
        setFilters({ type: 'TLS Certificate', autoRenewal: 'true' });
        setCurrentPage('inventory');
      },
    },
    {
      label: 'Non Automated',
      count: Math.round(ESTATE_SUMMARY.certificates * 0.6),
      pct: 60,
      color: 'hsl(var(--purple))',
      trackClass: 'bg-purple-light',
      pattern: 'modal',
      action: () => openGuardedModal('Non-Automated Renewals', allCerts.filter((a) => !a.autoRenewal)),
    },
  ];

  const autoPushSegments: [Segment, Segment] = [
    {
      label: 'Automated',
      count: Math.round(ESTATE_SUMMARY.certificates * 0.25),
      pct: 25,
      color: 'hsl(var(--teal))',
      trackClass: 'bg-teal',
      pattern: 'inventory',
      action: () => {
        setFilters({ type: 'TLS Certificate', autoPush: 'true' });
        setCurrentPage('inventory');
      },
    },
    {
      label: 'Non-Automated',
      count: Math.round(ESTATE_SUMMARY.certificates * 0.75),
      pct: 75,
      color: 'hsl(var(--purple))',
      trackClass: 'bg-purple-light',
      pattern: 'modal',
      action: () => openGuardedModal('Auto Push Not Configured', allCerts.filter((a) => !a.autoRenewal)),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      <CompactBandCard title="Managed Status" segments={managedSegments} refreshMessage="Managed status refreshed" />
      <CompactBandCard title="Auto Renewals" segments={autoRenewalSegments} refreshMessage="Auto renewal status refreshed" />
      <CompactBandCard title="Auto Push Configured" segments={autoPushSegments} refreshMessage="Auto push status refreshed" />
    </div>
  );
}
