import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { mockAssets } from '@/data/mockData';

interface Stage {
  label: string;
  count: number;
  color: string;
  stalled?: boolean;
}

const stages: Stage[] = [
  { label: 'Detected expiring', count: 1284, color: 'text-coral' },
  { label: 'Renewal initiated', count: 967, color: 'text-amber', stalled: true },
  { label: 'Submitted to CA', count: 834, color: 'text-purple-light' },
  { label: 'Issued by CA', count: 756, color: 'text-teal' },
  { label: 'Deployed', count: 498, color: 'text-teal' },
];

type RenewalPipelineProps = {
  openModal?: (title: string, certs: any[]) => void;
};

export default function RenewalPipeline({ openModal }: RenewalPipelineProps) {
  const allCerts = mockAssets.filter((a) => a.type.includes('Certificate'));

  const getStageCerts = (label: string) => {
    switch (label) {
      case 'Detected expiring':
        return allCerts.filter((a) => a.daysToExpiry <= 90);
      case 'Renewal initiated':
        return allCerts.filter((a) => a.autoRenewal && a.daysToExpiry <= 90);
      case 'Submitted to CA':
        return allCerts.slice(0, 834);
      case 'Issued by CA':
        return allCerts.slice(0, 756);
      case 'Deployed':
        return allCerts.slice(0, 498);
      default:
        return allCerts;
    }
  };

  const handleOpen = (title: string, certs: any[], count: number) => {
    if (count === 0 || !certs || certs.length === 0) {
      toast.info('No certificates in this category');
      return;
    }
    openModal?.(title, certs);
  };

  const noRenewalPlanCerts = allCerts.filter((a) => !a.autoRenewal);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-foreground">Renewal Pipeline</h3>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal/10 text-teal">Live</span>
      </div>

      <div className="flex items-center gap-1">
        {stages.map((s, i) => {
          const certs = getStageCerts(s.label);
          const isInteractive = s.count > 0;
          return (
            <React.Fragment key={s.label}>
              <div
                onClick={isInteractive ? () => handleOpen(s.label.replace(/(^\w)|\s\w/g, (m) => m.toUpperCase()), certs, s.count) : undefined}
                className={`group flex-1 rounded-lg border border-border bg-secondary/30 p-3 text-center transition-all ${isInteractive ? 'cursor-pointer hover:bg-secondary/40' : 'cursor-default'} ${i === stages.length - 1 ? 'bg-teal/10 border-teal/30' : ''}`}
              >
                <p className="text-[10px] text-muted-foreground mb-1 leading-tight">{s.label}</p>
                <div className="flex items-center justify-center gap-1">
                  <span className={`text-xl font-bold ${s.color}`}>{s.count.toLocaleString()}</span>
                  {s.stalled && <Clock className="w-3 h-3 text-amber" />}
                  {isInteractive ? <ArrowRight className="h-3 w-3 text-teal opacity-0 transition-opacity group-hover:opacity-100" /> : null}
                </div>
              </div>
              {i < stages.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <p
        onClick={() => handleOpen('No Renewal Plan', noRenewalPlanCerts, 786)}
        className="mt-3 inline-flex cursor-pointer items-center gap-1 text-xs text-coral hover:underline"
      >
        ⚠ 786 certs have no renewal plan and are not in this pipeline
      </p>
    </div>
  );
}
