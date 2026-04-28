import React, { useMemo, useState } from 'react';
import { CheckCircle2, PlayCircle, RefreshCw, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNav } from '@/context/NavigationContext';
import { useCertificateWorkflow } from '@/context/CertificateWorkflowContext';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function statusBadgeClass(status: string) {
  if (status === 'Completed') return 'bg-teal/10 text-teal';
  if (status === 'Approved') return 'bg-info/10 text-info';
  if (status === 'Push-Review In Progress') return 'bg-amber/10 text-amber';
  if (status === 'Push Failed') return 'bg-muted text-muted-foreground';
  return 'bg-purple/10 text-purple';
}

export default function WorkOrderStatus() {
  const { filters } = useNav();
  const { getOperationByRequestId, getCertificateById } = useCertificateWorkflow();
  const operation = getOperationByRequestId(filters.requestId);
  const certificate = getCertificateById(filters.certificateId);
  const [tab, setTab] = useState<'request' | 'workorder'>('request');
  const [selectedStep, setSelectedStep] = useState('Certificate Push Request');

  const steps = useMemo(() => {
    if (!operation) return [];
    return [
      {
        name: 'Certificate Push Request',
        state: operation.workflow.submit ? 'done' : 'pending',
        fields: [
          ['Certificate UUID', operation.certificateId],
          ['Common Name', operation.commonName],
          ['Certificate Authority', certificate?.caIssuer || 'DigiCert'],
          ['CA Account', 'Account-01'],
          ['Certificate Type', operation.details.certificateType],
          ['Policy Level Approval', operation.workflow.approve ? 'true' : 'false'],
          ['SAN', `www.${operation.commonName.replace(/^\*\./, '')}, api.${operation.commonName.replace(/^\*\./, '')}`],
          ['Hash Function', 'SHA256'],
          ['Key Type', 'RSA'],
          ['Bit Length', '3072'],
        ],
      },
      {
        name: 'Push Submission',
        state: operation.status === 'Push Failed' ? 'failed' : operation.workflow.implement ? 'done' : operation.workflow.submit ? 'pending' : 'pending',
        fields: [
          ['Certificate UUID', operation.certificateId],
          ['Common Name', operation.commonName],
          ['Certificate Authority', certificate?.caIssuer || 'DigiCert'],
          ['CA Account', 'Account-01'],
          ['Certificate Type', operation.details.certificateType],
          ['Policy Level Approval', operation.workflow.approve ? 'true' : 'false'],
          ['SAN', `www.${operation.commonName.replace(/^\*\./, '')}, api.${operation.commonName.replace(/^\*\./, '')}`],
          ['Hash Function', 'SHA256'],
          ['Key Type', 'RSA'],
          ['Bit Length', '3072'],
        ],
      },
    ];
  }, [certificate?.caIssuer, operation]);

  if (!operation) {
    return <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Select a work order from Process Explorer.</div>;
  }

  const currentStep = steps.find((step) => step.name === selectedStep) || steps[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Server Certificate &gt; <span className="font-mono">{operation.commonName}</span> &gt; View Work Order Status</div>
          <h1 className="mt-1 text-xl font-semibold text-foreground">Work Order Status</h1>
        </div>
        <button type="button" onClick={() => toast.success('Work order refreshed.')} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-background/40 p-1">
        <button type="button" onClick={() => setTab('request')} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', tab === 'request' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Request View</button>
        <button type="button" onClick={() => setTab('workorder')} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', tab === 'workorder' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Workorder View</button>
      </div>

      {tab === 'request' ? (
        <div className="grid gap-4 lg:grid-cols-[30%_70%]">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="space-y-2">
              {steps.map((step) => {
                const Icon = step.state === 'done' ? CheckCircle2 : step.state === 'failed' ? StopCircle : PlayCircle;
                return (
                  <button key={step.name} type="button" onClick={() => setSelectedStep(step.name)} className={cn('flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left', selectedStep === step.name ? 'border-teal/30 bg-teal/5' : 'border-transparent hover:bg-background/30')}>
                    <Icon className={cn('h-4 w-4', step.state === 'done' ? 'text-teal' : step.state === 'failed' ? 'text-coral' : 'text-amber')} />
                    <span className="text-sm font-medium text-foreground">{step.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-base font-semibold text-foreground">{currentStep.name}</h2>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', statusBadgeClass(operation.status))}>{operation.status}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {currentStep.fields.map(([label, value]) => (
                <div key={label} className="space-y-2">
                  <label className="text-xs text-muted-foreground">{label}</label>
                  <Input value={value} readOnly className="bg-muted font-mono text-xs text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {operation.auditTrail.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-b-0 hover:bg-background/30">
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.timestamp}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{row.actor}</td>
                  <td className="px-4 py-3"><span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', statusBadgeClass(row.status))}>{row.status}</span></td>
                  <td className="px-4 py-3 text-sm text-foreground">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
