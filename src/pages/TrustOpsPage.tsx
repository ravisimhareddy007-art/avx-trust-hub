import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { trustOpsActions, workflows } from '@/data/mockData';
import { SeverityBadge, StatusBadge, Modal } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import { Sparkles, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function TrustOpsPage() {
  const { filters } = useNav();
  const [actionModal, setActionModal] = useState<typeof trustOpsActions[0] | null>(null);
  const [actionStep, setActionStep] = useState(1);
  const [aiPrioritized, setAiPrioritized] = useState(true);
  const [workflowDetail, setWorkflowDetail] = useState<typeof workflows[0] | null>(null);

  const moduleChips = [
    { id: 'all', label: 'All' },
    { id: 'CLM', label: 'CLM/PKI' },
    { id: 'SSH', label: 'SSH' },
    { id: 'Kube', label: 'Kubernetes' },
    { id: 'Sign', label: 'Code Signing' },
    { id: 'QTH', label: 'QTH', status: 'dev' },
    { id: 'Eos', label: 'Eos', status: 'planned' },
  ];

  const [moduleFilter, setModuleFilter] = useState('all');

  const filteredActions = trustOpsActions.filter(a => {
    if (moduleFilter !== 'all' && a.module !== moduleFilter) return false;
    if (filters.priority && a.priority !== filters.priority) return false;
    return true;
  });

  const sortedActions = aiPrioritized
    ? [...filteredActions].sort((a, b) => a.priority.localeCompare(b.priority))
    : filteredActions;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">TrustOps Center</h1>
        <button onClick={() => toast.info('Creating new action...')} className="px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">New Action</button>
      </div>

      {/* Module filter chips */}
      <div className="flex gap-1.5">
        {moduleChips.map(chip => (
          <button
            key={chip.id}
            onClick={() => chip.status ? toast.info(`${chip.label} — ${chip.status === 'dev' ? 'In development' : 'Planned Dec 2026'}`) : setModuleFilter(chip.id)}
            className={`px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
              chip.status === 'dev' ? 'bg-amber/10 text-amber border border-amber/20' :
              chip.status === 'planned' ? 'bg-purple/10 text-purple border border-dashed border-purple/30' :
              moduleFilter === chip.id ? 'bg-teal text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {chip.status && '🔒 '}{chip.label}
            {chip.status === 'dev' && ' (In development)'}
            {chip.status === 'planned' && ' (Dec 2026)'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Action Queue - Left 60% */}
        <div className="col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Action Queue</h2>
            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
              <Sparkles className="w-3 h-3 text-teal" />
              AI prioritized
              <button onClick={() => setAiPrioritized(!aiPrioritized)} className={`w-7 h-3.5 rounded-full transition-colors relative ${aiPrioritized ? 'bg-teal' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-card shadow transition-transform ${aiPrioritized ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
              </button>
            </label>
          </div>

          {sortedActions.map(action => (
            <div key={action.id} className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={action.priority} size="md" />
                  <div>
                    <p className="text-xs font-semibold">{action.asset}</p>
                    <p className="text-[10px] text-muted-foreground">{action.type} · {action.reason}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${action.module === 'CLM' ? 'bg-teal/10 text-teal' : action.module === 'SSH' ? 'bg-purple/10 text-purple' : 'bg-amber/10 text-amber'}`}>
                  {action.module}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold">{action.assigneeAvatar}</div>
                    {action.assignee}
                  </div>
                  <span>·</span>
                  <span className={action.dueDate <= '2026-04-15' ? 'text-coral font-medium' : ''}>Due: {action.dueDate}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toast.info(`Reassigning ${action.asset}`)} className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted">Reassign</button>
                  <button onClick={() => { setActionModal(action); setActionStep(1); }} className="text-[10px] px-3 py-1 rounded bg-teal text-primary-foreground hover:bg-teal-light">Take action</button>
                </div>
              </div>
              {aiPrioritized && (
                <p className="text-[10px] text-teal mt-2 flex items-center gap-1"><Sparkles className="w-3 h-3" /> {action.aiRisk}</p>
              )}
            </div>
          ))}
        </div>

        {/* Workflow Tracker - Right 40% */}
        <div className="col-span-2 space-y-3">
          <h2 className="text-sm font-semibold">Workflow Tracker</h2>
          {workflows.map(wf => (
            <div key={wf.id} className="bg-card rounded-lg border border-border p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setWorkflowDetail(wf)}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium">{wf.name}</p>
                <StatusBadge status={wf.status} />
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">{wf.type} · Triggered by: {wf.triggeredBy}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-teal rounded-full transition-all" style={{ width: `${wf.progress}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{wf.progress}%</span>
              </div>
            </div>
          ))}

          <h3 className="text-sm font-semibold mt-6">Recent Activity</h3>
          <div className="bg-card rounded-lg border border-border p-3 space-y-2">
            {[
              { actor: 'Sarah Chen', asset: 'api.internal cert', action: 'Renewed via DigiCert', outcome: 'Success', time: '1h ago' },
              { actor: 'System', asset: 'envoy-sidecar.api.svc', action: 'Auto-renewed', outcome: 'Success', time: '2h ago' },
              { actor: 'Mike Rodriguez', asset: 'bastion-host-key', action: 'SSH key rotated', outcome: 'Success', time: '4h ago' },
              { actor: 'Automation', asset: 'istio-ingress cert', action: 'Auto-renewed', outcome: 'Success', time: '6h ago' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0 text-[10px]">
                <CheckCircle className="w-3 h-3 text-teal flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">{item.actor}</span> · {item.action} · <span className="text-muted-foreground">{item.asset}</span>
                </div>
                <span className="text-muted-foreground">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Modal */}
      <Modal open={!!actionModal} onClose={() => setActionModal(null)} title={`${actionModal?.action} — Step ${actionStep} of 3`}>
        {actionModal && (
          <div className="space-y-4">
            <div className="flex gap-1 mb-2">
              {['Review', 'Configure', 'Confirm'].map((s, i) => (
                <div key={s} className={`flex-1 h-1 rounded-full ${i + 1 <= actionStep ? 'bg-teal' : 'bg-muted'}`} />
              ))}
            </div>

            {actionStep === 1 && (
              <div className="space-y-3">
                <div className="text-xs space-y-1.5">
                  <p><span className="text-muted-foreground">Asset:</span> {actionModal.asset}</p>
                  <p><span className="text-muted-foreground">Type:</span> {actionModal.type}</p>
                  <p><span className="text-muted-foreground">Action:</span> {actionModal.action}</p>
                  <p><span className="text-muted-foreground">Reason:</span> {actionModal.reason}</p>
                </div>
                <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
                  <p className="text-[10px] font-medium text-teal mb-1">✦ AI Risk Assessment</p>
                  <p className="text-[10px] text-muted-foreground">{actionModal.aiRisk}</p>
                </div>
              </div>
            )}

            {actionStep === 2 && (
              <div className="space-y-3 text-xs">
                <div><label className="text-muted-foreground">Renewal Period</label><select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg"><option>90 days</option><option>180 days</option><option>365 days</option></select></div>
                <div><label className="text-muted-foreground">Certificate Authority</label><select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg"><option>DigiCert Global G2</option><option>Entrust L1K</option><option>Let's Encrypt R3</option></select></div>
                <div><label className="text-muted-foreground">Schedule</label><select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg"><option>Immediately</option><option>Next maintenance window (02:00 AM)</option><option>Custom</option></select></div>
              </div>
            )}

            {actionStep === 3 && (
              <div className="bg-muted rounded-lg p-4 text-xs space-y-2">
                <p className="font-semibold">Action Summary</p>
                <p className="text-muted-foreground">{actionModal.action} {actionModal.asset} via DigiCert Global G2, scheduled immediately.</p>
                <p className="text-muted-foreground">This will affect associated applications and services.</p>
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => actionStep > 1 ? setActionStep(actionStep - 1) : setActionModal(null)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">{actionStep === 1 ? 'Cancel' : 'Back'}</button>
              <button onClick={() => { if (actionStep < 3) setActionStep(actionStep + 1); else { setActionModal(null); toast.success(`${actionModal.action} completed for ${actionModal.asset}`); } }} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">{actionStep === 3 ? 'Approve' : 'Next'}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Workflow Detail Modal */}
      <Modal open={!!workflowDetail} onClose={() => setWorkflowDetail(null)} title={workflowDetail?.name || ''}>
        {workflowDetail && (
          <div className="space-y-3">
            <div className="text-xs space-y-1">
              <p><span className="text-muted-foreground">Type:</span> {workflowDetail.type}</p>
              <p><span className="text-muted-foreground">Triggered by:</span> {workflowDetail.triggeredBy}</p>
              <p><span className="text-muted-foreground">Status:</span> {workflowDetail.status}</p>
            </div>
            <div className="space-y-2">
              {workflowDetail.steps.map((step, i) => {
                const stepDone = (i / workflowDetail.steps.length) * 100 < workflowDetail.progress;
                const stepCurrent = Math.floor((workflowDetail.progress / 100) * workflowDetail.steps.length) === i;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${stepDone ? 'bg-teal text-primary-foreground' : stepCurrent ? 'bg-amber text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {stepDone ? <CheckCircle className="w-3 h-3" /> : stepCurrent ? <Clock className="w-3 h-3" /> : <span className="text-[10px]">{i + 1}</span>}
                    </div>
                    <span className={`text-xs ${stepDone ? 'text-foreground' : stepCurrent ? 'text-amber font-medium' : 'text-muted-foreground'}`}>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
