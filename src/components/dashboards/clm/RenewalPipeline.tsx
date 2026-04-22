import React, { useMemo, useState } from 'react';
import { ArrowRight, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { mockAssets } from '@/data/mockData';
import { useNav } from '@/context/NavigationContext';
import type { CertCounts } from './types';

interface Stage {
  key: 'detected' | 'initiated' | 'submitted' | 'issued' | 'deployed' | 'no-plan';
  label: string;
  count: number;
  color: string;
  stalled?: boolean;
  complete?: boolean;
}

type CertRecord = {
  id: string;
  cert: string;
  ca: string;
  daysToExpiry?: number;
  autoRenewal?: boolean;
  stalledReason?: string;
  submittedTime?: string;
  expectedCompletion?: string;
  issuedTime?: string;
  targetDeployment?: string;
  deployedTo?: string;
  deployedTime?: string;
  nextRenewalDate?: string;
};

type RenewalPipelineProps = {
  openModal?: (title: string, certs: any[]) => void;
  certCounts: CertCounts;
};

const stages: Stage[] = [
  { key: 'detected', label: 'Detected expiring', count: 1284, color: 'text-coral' },
  { key: 'initiated', label: 'Renewal initiated', count: 967, color: 'text-amber', stalled: true },
  { key: 'submitted', label: 'Submitted to CA', count: 834, color: 'text-purple-light' },
  { key: 'issued', label: 'Issued by CA', count: 756, color: 'text-teal' },
  { key: 'deployed', label: 'Deployed', count: 498, color: 'text-teal', complete: true },
];

const allCerts = mockAssets.filter((a) => a.type.includes('Certificate'));
const stalledReasons = ['Auth error', 'Timeout', 'CSR validation failed', 'Connector mismatch', 'CA policy check'];
const schedules = ['Immediately', 'Next maintenance window'] as const;
const caOptions = ['DigiCert', 'Entrust', "Let's Encrypt", 'MSCA Enterprise', 'AppViewX PKIaaS'] as const;

function formatDate(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function RenewalPipeline({ certCounts }: RenewalPipelineProps) {
  const { setCurrentPage, setFilters } = useNav();
  const [panelStage, setPanelStage] = useState<Stage['key'] | null>(null);
  const [planFormOpen, setPlanFormOpen] = useState<string | null>(null);
  const [planCa, setPlanCa] = useState<Record<string, string>>({});
  const [planSchedule, setPlanSchedule] = useState<Record<string, string>>({});

  const stageRecords = useMemo<Record<Stage['key'], CertRecord[]>>(() => ({
    detected: allCerts
      .filter((a) => a.daysToExpiry <= 90)
      .slice(0, 24)
      .map((a) => ({ id: a.id, cert: a.name, daysToExpiry: a.daysToExpiry, ca: a.caIssuer, autoRenewal: a.autoRenewal })),
    initiated: allCerts
      .filter((a) => a.autoRenewal && a.daysToExpiry <= 90)
      .slice(0, 20)
      .map((a, index) => ({ id: a.id, cert: a.name, ca: a.caIssuer, stalledReason: stalledReasons[index % stalledReasons.length] })),
    submitted: allCerts
      .slice(0, 18)
      .map((a, index) => ({ id: a.id, cert: a.name, ca: a.caIssuer, submittedTime: `${(index % 6) + 1}h ago`, expectedCompletion: formatDate((index % 4) + 1) })),
    issued: allCerts
      .slice(5, 23)
      .map((a, index) => ({ id: a.id, cert: a.name, ca: a.caIssuer, issuedTime: `${(index % 8) + 1}h ago`, targetDeployment: ['F5 BIG-IP', 'NGINX', 'IIS', 'Kubernetes Ingress'][index % 4] })),
    deployed: allCerts
      .slice(10, 28)
      .map((a, index) => ({ id: a.id, cert: a.name, ca: a.caIssuer, deployedTo: ['F5 BIG-IP', 'NGINX', 'IIS', 'Kubernetes Ingress'][index % 4], deployedTime: `${(index % 12) + 1}h ago`, nextRenewalDate: formatDate((index % 30) + 30) })),
    'no-plan': allCerts
      .filter((a) => !a.autoRenewal)
      .slice(0, 18)
      .map((a) => ({ id: a.id, cert: a.name, ca: a.caIssuer, daysToExpiry: a.daysToExpiry, autoRenewal: a.autoRenewal })),
  }), []);

  const stageMeta: Record<Stage['key'], Stage> = {
    detected: stages[0],
    initiated: stages[1],
    submitted: stages[2],
    issued: stages[3],
    deployed: stages[4],
    'no-plan': { key: 'no-plan', label: 'No Renewal Plan', count: 786, color: 'text-coral' },
  };

  const openStage = (key: Stage['key'], count: number) => {
    if (count === 0) {
      toast.info('No certificates in this stage');
      return;
    }
    setPanelStage(key);
    setPlanFormOpen(null);
  };

  const panelRecords = panelStage ? stageRecords[panelStage] : [];
  const panelInfo = panelStage ? stageMeta[panelStage] : null;

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Renewal Pipeline</h3>
          <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-medium text-teal">Live</span>
        </div>

        <div className="flex items-center gap-1">
          {stages.map((stage, index) => (
            <React.Fragment key={stage.key}>
              <button
                type="button"
                title={stage.stalled ? '634 certs stalled in initiation -- auth errors and timeouts. Click to investigate.' : undefined}
                onClick={() => openStage(stage.key, stage.count)}
                className={`group flex-1 rounded-lg border p-3 text-center transition-all hover:bg-secondary/40 ${stage.stalled ? 'border-amber/40 bg-amber/10' : 'border-border bg-secondary/30'} ${stage.complete ? 'border-teal/30 bg-teal/10' : ''}`}
              >
                <p className="mb-1 text-[10px] leading-tight text-muted-foreground">{stage.label}</p>
                <div className="flex items-center justify-center gap-1">
                  <span className={`text-xl font-bold ${stage.color}`}>{stage.count.toLocaleString()}</span>
                  {stage.stalled ? <Clock className="h-3 w-3 text-amber" /> : null}
                  <ArrowRight className="h-3 w-3 text-teal opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
              {index < stages.length - 1 ? <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : null}
            </React.Fragment>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          <span>Avg renewal time: 2.3 days</span>
          <span>·</span>
          <span>Success rate: 94.2%</span>
          <span>·</span>
          <span className="text-amber">Stalled: 267 certs</span>
          <span>·</span>
          <span>Last updated: 0m ago</span>
        </div>

        <button
          type="button"
          onClick={() => openStage('no-plan', 786)}
          className="mt-3 inline-flex items-center gap-1 text-xs text-coral transition-colors hover:underline"
        >
          ⚠ 786 certs have no renewal plan and are not in this pipeline
        </button>
      </div>

      {panelInfo ? (
        <div className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col border-l border-border bg-card shadow-2xl">
          <div className="flex items-start justify-between border-b border-border px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground">{panelInfo.label}</h4>
                <span className="text-xs text-muted-foreground">{panelInfo.count.toLocaleString()} estate-wide · {panelRecords.length} in detail view</span>
                {panelInfo.stalled ? <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-medium text-amber">Stalled</span> : null}
                {panelInfo.complete ? <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-medium text-teal">Complete</span> : null}
              </div>
            </div>
            <button type="button" onClick={() => setPanelStage(null)} className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-border px-5 py-3">
            {panelStage === 'detected' ? (
              <button type="button" onClick={() => toast.success('Renewal initiated for all visible certificates')} className="rounded bg-teal px-3 py-1.5 text-[10px] font-medium text-primary-foreground hover:opacity-90">Initiate All</button>
            ) : null}
            {panelStage === 'initiated' ? (
              <button type="button" onClick={() => toast.success('Retry initiated for all stalled renewals')} className="rounded bg-amber px-3 py-1.5 text-[10px] font-medium text-primary-foreground hover:opacity-90">Retry All Stalled</button>
            ) : null}
            {panelStage === 'issued' ? (
              <button type="button" onClick={() => toast.success('Deployment initiated for all issued certificates')} className="rounded bg-teal px-3 py-1.5 text-[10px] font-medium text-primary-foreground hover:opacity-90">Deploy All</button>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-3">
              {panelRecords.map((record) => (
                <div key={`${panelStage}-${record.id}`} className="rounded-lg border border-border bg-secondary/20 p-3">
                  {(panelStage === 'detected' || panelStage === 'no-plan') ? (
                    <div className="grid grid-cols-[1.7fr_0.8fr_1fr_1fr_auto] items-center gap-3 text-[10px]">
                      <div>
                        <p className="font-mono text-foreground">{record.cert}</p>
                        <p className="text-muted-foreground">{record.ca}</p>
                      </div>
                      <div className="text-muted-foreground">{record.daysToExpiry}d</div>
                      <div className="text-muted-foreground">{record.ca}</div>
                      <div className="text-muted-foreground">{record.autoRenewal ? 'Enabled' : 'Off'}</div>
                      {panelStage === 'detected' ? (
                        <button type="button" onClick={() => toast.success('Renewal initiated for ' + record.cert)} className="rounded bg-teal px-2 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90">Initiate Renewal</button>
                      ) : (
                        <div className="justify-self-end text-right">
                          <button type="button" onClick={() => setPlanFormOpen(planFormOpen === record.id ? null : record.id)} className="rounded bg-teal px-2 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90">Create Renewal Plan</button>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {panelStage === 'initiated' ? (
                    <div className="grid grid-cols-[1.6fr_1fr_auto] items-center gap-3 text-[10px]">
                      <div>
                        <p className="font-mono text-foreground">{record.cert}</p>
                        <p className="text-muted-foreground">{record.ca}</p>
                      </div>
                      <div className="text-amber">{record.stalledReason}</div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => toast.success('Retry initiated for ' + record.cert)} className="rounded bg-amber px-2 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90">Retry</button>
                        <button type="button" onClick={() => toast.info('Escalated ' + record.cert)} className="rounded border border-border px-2 py-1 text-[10px] text-foreground hover:bg-secondary/40">Escalate</button>
                      </div>
                    </div>
                  ) : null}

                  {panelStage === 'submitted' ? (
                    <div className="grid grid-cols-[1.6fr_1fr_0.9fr_0.9fr_auto] items-center gap-3 text-[10px]">
                      <div className="font-mono text-foreground">{record.cert}</div>
                      <div className="text-muted-foreground">{record.ca}</div>
                      <div className="text-muted-foreground">{record.submittedTime}</div>
                      <div className="text-muted-foreground">{record.expectedCompletion}</div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => toast.info('Checking CA status for ' + record.cert)} className="rounded border border-border px-2 py-1 text-[10px] text-foreground hover:bg-secondary/40">Check Status</button>
                        <button type="button" onClick={() => toast.success('Submission cancelled for ' + record.cert)} className="rounded px-2 py-1 text-[10px] text-coral hover:bg-coral/10">Cancel Submission</button>
                      </div>
                    </div>
                  ) : null}

                  {panelStage === 'issued' ? (
                    <div className="grid grid-cols-[1.5fr_0.8fr_0.8fr_1fr_auto] items-center gap-3 text-[10px]">
                      <div className="font-mono text-foreground">{record.cert}</div>
                      <div className="text-muted-foreground">{record.ca}</div>
                      <div className="text-muted-foreground">{record.issuedTime}</div>
                      <div className="text-muted-foreground">{record.targetDeployment}</div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => toast.success('Deployment initiated for ' + record.cert)} className="rounded bg-teal px-2 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90">Deploy Now</button>
                        <button type="button" onClick={() => toast.info('Deployment scheduled for ' + record.cert)} className="rounded border border-border px-2 py-1 text-[10px] text-foreground hover:bg-secondary/40">Schedule Deployment</button>
                      </div>
                    </div>
                  ) : null}

                  {panelStage === 'deployed' ? (
                    <div className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_auto] items-center gap-3 text-[10px]">
                      <div className="font-mono text-foreground">{record.cert}</div>
                      <div className="text-muted-foreground">{record.deployedTo}</div>
                      <div className="text-muted-foreground">{record.deployedTime}</div>
                      <div className="text-muted-foreground">{record.nextRenewalDate}</div>
                      <button type="button" onClick={() => { setFilters({ type: 'TLS Certificate', commonName: record.cert }); setCurrentPage('inventory'); }} className="justify-self-end rounded border border-border px-2 py-1 text-[10px] text-foreground hover:bg-secondary/40">View Details</button>
                    </div>
                  ) : null}

                  {panelStage === 'no-plan' && planFormOpen === record.id ? (
                    <div className="mt-3 rounded-lg border border-border bg-card p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <label className="text-muted-foreground">
                          <span className="mb-1 block">CA</span>
                          <select value={planCa[record.id] ?? record.ca} onChange={(e) => setPlanCa((prev) => ({ ...prev, [record.id]: e.target.value }))} className="w-full rounded border border-border bg-secondary/30 px-2 py-1 text-foreground outline-none">
                            {caOptions.map((option) => <option key={option}>{option}</option>)}
                          </select>
                        </label>
                        <label className="text-muted-foreground">
                          <span className="mb-1 block">Schedule</span>
                          <select value={planSchedule[record.id] ?? 'Immediately'} onChange={(e) => setPlanSchedule((prev) => ({ ...prev, [record.id]: e.target.value }))} className="w-full rounded border border-border bg-secondary/30 px-2 py-1 text-foreground outline-none">
                            {schedules.map((option) => <option key={option}>{option}</option>)}
                          </select>
                        </label>
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={() => { toast.success('Renewal plan created for ' + record.cert); setPlanFormOpen(null); }} className="rounded bg-teal px-2 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90">Submit</button>
                        <button type="button" onClick={() => setPlanFormOpen(null)} className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary/40">Cancel</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
