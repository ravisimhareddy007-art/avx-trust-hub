import React from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ESTATE_SUMMARY, mockAssets } from '@/data/mockData';
import { useNav } from '@/context/NavigationContext';

const allCerts = mockAssets.filter((a) => a.type.includes('Certificate'));

type SignatureHashStrengthProps = {
  openModal?: (title: string, certs: any[]) => void;
};

type BandConfig = {
  title: string;
  highCount: number;
  lowCount: number;
  highPct: number;
  lowPct: number;
  refreshMessage: string;
  lowTitle: string;
  lowCerts: () => typeof allCerts;
  inventoryFilter: Record<string, string>;
};

function StrengthCard({ config, openModal }: { config: BandConfig; openModal?: (title: string, certs: any[]) => void }) {
  const { setCurrentPage, setFilters } = useNav();
  const openInventory = () => {
    setFilters({ type: 'TLS Certificate', ...config.inventoryFilter });
    setCurrentPage('inventory');
  };

  const openLow = () => {
    if (config.lowCount === 0) {
      toast.info('No certificates in this category');
      return;
    }
    const certs = config.lowCerts();
    if (!certs || certs.length === 0) {
      toast.info('No certificates in this category');
      return;
    }
    openModal?.(config.lowTitle, certs);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{config.title}</h3>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>0m ago</span>
          <button type="button" onClick={() => toast.success(config.refreshMessage)} className="transition-colors hover:text-foreground">
            <RefreshCw className="h-3 w-3" />
          </button>
          <Info className="h-3 w-3" />
        </div>
      </div>

      <div className="flex h-6 overflow-hidden rounded-full bg-secondary/40">
        <button type="button" onClick={openInventory} className="h-full cursor-pointer bg-purple-light transition-opacity hover:opacity-80" style={{ width: `${config.highPct}%` }} />
        <button
          type="button"
          onClick={openLow}
          className={`h-full ${config.lowCount > 0 ? 'cursor-pointer bg-teal transition-opacity hover:opacity-80' : 'cursor-default bg-teal/50'}`}
          style={{ width: `${config.lowPct}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-muted-foreground">
        <button type="button" onClick={openInventory} className="group inline-flex items-center gap-1.5 cursor-pointer hover:text-teal transition-colors">
          <span className="h-2.5 w-2.5 rounded-sm bg-purple-light" />
          <span>High({config.highCount.toLocaleString()})</span>
        </button>
        <button type="button" onClick={openLow} className={`group inline-flex items-center gap-1.5 ${config.lowCount > 0 ? 'cursor-pointer hover:text-foreground transition-colors' : 'cursor-default'}`}>
          <span className="h-2.5 w-2.5 rounded-sm bg-teal" />
          <span>Low({config.lowCount.toLocaleString()})</span>
        </button>
      </div>
    </div>
  );
}

export default function SignatureHashStrength({ openModal }: SignatureHashStrengthProps) {
  const signatureWeak = allCerts.filter((a) => a.algorithm.includes('SHA-1') || a.algorithm.includes('MD5'));
  const hashWeak = allCerts.filter((a) => a.policyViolations > 0);

  const cards: BandConfig[] = [
    {
      title: 'Signature Algorithm Strength',
      highCount: Math.round(ESTATE_SUMMARY.certificates * 0.95),
      lowCount: Math.round(ESTATE_SUMMARY.certificates * 0.05),
      highPct: 95,
      lowPct: 5,
      refreshMessage: 'Signature algorithm strength refreshed',
      lowTitle: 'Weak Signature Algorithm',
      lowCerts: () => signatureWeak,
      inventoryFilter: { signatureStrength: 'high' },
    },
    {
      title: 'Hash Algorithm Strength',
      highCount: Math.round(ESTATE_SUMMARY.certificates * 0.93),
      lowCount: Math.round(ESTATE_SUMMARY.certificates * 0.07),
      highPct: 93,
      lowPct: 7,
      refreshMessage: 'Hash algorithm strength refreshed',
      lowTitle: 'Weak Hash Algorithm',
      lowCerts: () => hashWeak,
      inventoryFilter: { hashStrength: 'high' },
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map((card) => (
        <StrengthCard key={card.title} config={card} openModal={openModal} />
      ))}
    </div>
  );
}
