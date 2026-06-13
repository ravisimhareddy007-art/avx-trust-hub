import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, AlertTriangle, Atom, ExternalLink } from 'lucide-react';
import { CryptoAsset } from '@/data/mockData';
import { toast } from 'sonner';
import { addTicket, mockIncidentNumber } from '@/lib/ticketStore';

// ── Ticket draft shape ────────────────────────────────────────────────────────

export interface TicketDraft {
  title: string;
  type: 'Remediation' | 'Change Request' | 'Incident' | 'PQC Migration';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  assignee: string;
  module: string;
  description: string;
  rootCause: string;
  remediationSteps: string[];
  affectedSystems: string;
  complianceImpact: string;
  sla: string;
}

// ── Template engine — deterministic, zero API tokens ─────────────────────────

function daysSince(dateStr: string): number {
  try {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  } catch { return 0; }
}

function caTypeFor(caIssuer: string): string {
  if (/digicert|entrust|let's encrypt|sectigo|globalsign/i.test(caIssuer)) return 'Public CA';
  if (/self.?sign/i.test(caIssuer)) return 'Self-Signed';
  return 'Private / Internal CA';
}

function migrTargetFor(algo: string): string {
  if (/rsa|dh/i.test(algo)) return 'ML-KEM (NIST FIPS 203)';
  if (/ec|ecdsa|ecc/i.test(algo)) return 'ML-DSA (NIST FIPS 204)';
  return 'ML-KEM (NIST FIPS 203)';
}

function complianceFor(tags: string[]): string {
  const maps: Record<string, string> = {
    'pci-dss': 'PCI-DSS v4 Req 4.2.1',
    'hipaa': 'HIPAA §164.312(e)(1)',
    'gdpr': 'GDPR Art.32 – encryption',
    'soc2': 'SOC 2 CC6.7',
    'iso27001': 'ISO 27001 A.10.1',
  };
  const hits = tags.map(t => maps[t]).filter(Boolean);
  return hits.length ? hits.join(', ') : 'Internal Security Policy';
}

export function generateTicketDraft(asset: CryptoAsset, action: string): TicketDraft {
  const isProd = asset.environment === 'Production';
  const expiring = asset.daysToExpiry >= 0 && asset.daysToExpiry <= 30;
  const critical7 = asset.daysToExpiry >= 0 && asset.daysToExpiry <= 7;
  const unowned = asset.owner === 'Unassigned';
  const daysOld = daysSince(asset.lastRotated);
  const compliance = complianceFor(asset.tags ?? []);

  const priority: TicketDraft['priority'] =
    (action === 'pqc' && isProd)         ? 'Critical' :
    (critical7 && isProd)                 ? 'Critical' :
    (expiring && isProd)                  ? 'High' :
    (unowned && isProd)                   ? 'High' :
    (asset.policyViolations > 0 && isProd)? 'High' : 'Medium';

  const sla =
    priority === 'Critical' ? 'Resolve within 24 hours — P1 SLA' :
    priority === 'High'     ? 'Resolve within 72 hours — P2 SLA' : 'Resolve within 7 days — P3 SLA';

  // ── Per-action templates ──────────────────────────────────────────────────

  if (action === 'renew' || action === 'expiry') {
    return {
      title: `Renew ${asset.type} — ${asset.name} (expires in ${asset.daysToExpiry}d)`,
      type: 'Remediation',
      priority,
      assignee: asset.owner !== 'Unassigned' ? asset.owner : asset.team,
      module: asset.type.includes('SSH') ? 'SSH' : 'CLM',
      description:
        `${asset.type} "${asset.name}" expires in ${asset.daysToExpiry} day${asset.daysToExpiry !== 1 ? 's' : ''} ` +
        `on ${asset.expiryDate}. It is used by ${asset.dependencyCount} dependent system${asset.dependencyCount !== 1 ? 's' : ''} ` +
        `in ${asset.environment}. ${asset.autoRenewal ? 'Auto-renewal is configured but has not triggered.' : 'Auto-renewal is NOT configured — manual action required.'} ` +
        `Failure to renew will cause service disruption across all dependent systems.`,
      rootCause:
        asset.autoRenewal
          ? `Auto-renewal is configured but failed to trigger. Root cause: likely CA API issue or misconfigured renewal lead time.`
          : `Certificate was not enrolled in auto-renewal at time of issuance. Manual renewal required before ${asset.expiryDate}.`,
      remediationSteps: [
        `Initiate renewal via ${asset.discoverySource} (CA: ${asset.caIssuer})`,
        `Verify new certificate uses ${asset.algorithm} or stronger algorithm`,
        `Deploy renewed certificate to all ${asset.dependencyCount} dependent systems`,
        `Validate TLS handshake on all endpoints post-deployment`,
        `Configure auto-renewal to prevent recurrence (recommended: 30-day lead time)`,
      ],
      affectedSystems:
        `${asset.dependencyCount} dependent system${asset.dependencyCount !== 1 ? 's' : ''} · Application: ${asset.application} · Infrastructure: ${asset.infrastructure}`,
      complianceImpact: `${compliance} — expired certificates constitute a violation`,
      sla,
    };
  }

  if (action === 'rotate') {
    return {
      title: `Rotate ${asset.type} — ${asset.name} (${daysOld}d since last rotation)`,
      type: 'Remediation',
      priority,
      assignee: asset.owner !== 'Unassigned' ? asset.owner : asset.team,
      module: asset.type.includes('SSH') ? 'SSH' : 'CLM',
      description:
        `${asset.type} "${asset.name}" has not been rotated in ${daysOld} days ` +
        `(policy: ${asset.rotationFrequency}). This exceeds the organization's rotation policy ` +
        `and constitutes a ${compliance} violation. Immediate rotation is required.`,
      rootCause:
        `Rotation policy set to "${asset.rotationFrequency}" but last rotation was ${daysOld} days ago. ` +
        `${asset.autoRenewal ? 'Auto-rotation is configured but may have failed.' : 'Manual rotation required — auto-rotation not configured.'}`,
      remediationSteps: [
        `Generate new ${asset.algorithm} key material`,
        `Update ${asset.application} to use new key`,
        `Verify all ${asset.dependencyCount} dependent systems accept the new key`,
        `Revoke old key after 24h validation window`,
        `Update rotation schedule to enforce ${asset.rotationFrequency} cadence`,
      ],
      affectedSystems:
        `${asset.dependencyCount} dependent system${asset.dependencyCount !== 1 ? 's' : ''} · ${asset.application} · ${asset.infrastructure}`,
      complianceImpact: `${compliance} — rotation policy violation`,
      sla,
    };
  }

  if (action === 'assign') {
    return {
      title: `Assign owner to orphaned ${asset.type} — ${asset.name}`,
      type: 'Remediation',
      priority,
      assignee: asset.team,
      module: asset.type.includes('SSH') ? 'SSH' : 'CLM',
      description:
        `${asset.type} "${asset.name}" has no assigned owner. It was discovered via ${asset.discoverySource} ` +
        `in ${asset.environment} on ${asset.issueDate}. Unowned credentials violate the organization's ` +
        `accountability policy and prevent automated lifecycle management. Last rotated: ${asset.lastRotated} (${daysOld} days ago).`,
      rootCause:
        `Credential was provisioned without owner assignment, or the original owner has left the organization. ` +
        `Discovery source: ${asset.discoverySource}. Team association: ${asset.team}.`,
      remediationSteps: [
        `Identify the team responsible for ${asset.application}`,
        `Assign a named owner in AVX Trust Platform`,
        `Owner to verify credential is still required`,
        `If not required: revoke and delete`,
        `If required: enrol in rotation policy (recommended: ${asset.rotationFrequency || '90 days'})`,
      ],
      affectedSystems: `${asset.application} · ${asset.infrastructure} · Team: ${asset.team}`,
      complianceImpact: `${compliance} — ownership accountability required`,
      sla,
    };
  }

  if (action === 'pqc') {
    const target = migrTargetFor(asset.algorithm);
    return {
      title: `PQC Migration — ${asset.name} — ${asset.algorithm} → ${target}`,
      type: 'PQC Migration',
      priority: isProd ? 'Critical' : 'High',
      assignee: asset.owner !== 'Unassigned' ? asset.owner : asset.team,
      module: 'PQC / Quantum Readiness',
      description:
        `${asset.type} "${asset.name}" uses ${asset.algorithm} which is quantum-vulnerable (NIST classification). ` +
        `It is Internet-facing (Environment: ${asset.environment}) and must be migrated to ${target} ` +
        `before the NIST 2030 deadline. This asset is in Wave 1 of the PQC migration programme due to ` +
        `its HNDL (Harvest Now Decrypt Later) exposure risk. ${asset.dependencyCount} downstream systems depend on it.`,
      rootCause:
        `${asset.algorithm} is vulnerable to Shor's algorithm on a sufficiently large quantum computer. ` +
        `Per NIST FIPS 203/204/205 (finalized August 2024), all RSA and ECC public-key cryptography must ` +
        `be replaced. This asset's long validity period increases its HNDL exposure window.`,
      remediationSteps: [
        `Verify CA support for ${target} (NIST FIPS 203/204/205)`,
        `Generate ${target} key pair in the target CA or KMS`,
        `Test new algorithm compatibility with all ${asset.dependencyCount} dependent systems`,
        `Deploy in hybrid mode (${asset.algorithm} + ${target}) during transition`,
        `Validate all dependent systems handle new key size`,
        `Complete cutover and revoke ${asset.algorithm} key`,
        `Update AVX Trust Platform — mark migration as Complete in Stage 4`,
      ],
      affectedSystems:
        `${asset.dependencyCount} downstream system${asset.dependencyCount !== 1 ? 's' : ''} · ${asset.application} · ${asset.infrastructure}`,
      complianceImpact: `NSA CNSA 2.0, CISA PQC Roadmap 2025, NIST 2030 mandate · ${compliance}`,
      sla: 'Complete by 30 June 2026 — Wave 1 deadline (NSA CNSA 2.0)',
    };
  }

  // Generic / fix
  return {
    title: `Remediate ${asset.type} violation — ${asset.name}`,
    type: 'Remediation',
    priority,
    assignee: asset.owner !== 'Unassigned' ? asset.owner : asset.team,
    module: 'CLM',
    description:
      `${asset.type} "${asset.name}" has ${asset.policyViolations} active policy violation${asset.policyViolations !== 1 ? 's' : ''} ` +
      `in ${asset.environment}. Immediate remediation is required.`,
    rootCause: `Policy violation detected during last scan. Algorithm: ${asset.algorithm}. Status: ${asset.status}.`,
    remediationSteps: [
      'Review active violations in AVX Trust Platform',
      'Identify root cause per violation',
      'Execute remediation steps per violation type',
      'Re-scan to confirm resolution',
    ],
    affectedSystems: `${asset.dependencyCount} dependent systems · ${asset.application}`,
    complianceImpact: compliance,
    sla,
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  asset: CryptoAsset | null;
  action: string;
  onClose: () => void;
  onConfirm: (draft: TicketDraft) => void;
  /** When 'servicenow', show ServiceNow destination treatment and a "Create in ServiceNow" button. */
  destination?: 'default' | 'servicenow';
  /** Default assignment group when destination is 'servicenow'. */
  defaultAssignmentGroup?: string;
}

const PRIORITY_STYLE: Record<string, string> = {
  Critical: 'bg-coral/15 text-coral border-coral/30',
  High:     'bg-amber/15 text-amber border-amber/30',
  Medium:   'bg-purple/15 text-purple-light border-purple/30',
  Low:      'bg-secondary text-muted-foreground border-border',
};

const ACTION_ICON: Record<string, React.ReactNode> = {
  pqc:    <Atom className="w-4 h-4 text-purple-light" />,
  renew:  <Check className="w-4 h-4 text-teal" />,
  rotate: <Check className="w-4 h-4 text-teal" />,
  assign: <AlertTriangle className="w-4 h-4 text-amber" />,
  fix:    <AlertTriangle className="w-4 h-4 text-coral" />,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function TicketDraftModal({ asset, action, onClose, onConfirm, destination = 'default', defaultAssignmentGroup }: Props) {
  const [thinking, setThinking] = useState(true);
  const [draft, setDraft] = useState<TicketDraft | null>(null);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [assignmentGroup, setAssignmentGroup] = useState(defaultAssignmentGroup ?? 'PKI & Cryptography Team');
  const [createdIncident, setCreatedIncident] = useState<string | null>(null);

  useEffect(() => {
    setThinking(true);
    setDraft(null);
    const t = setTimeout(() => {
      if (asset) {
        setDraft(generateTicketDraft(asset, action));
      } else {
        setDraft({
          title: 'Remediate infrastructure asset',
          type: 'Remediation',
          priority: 'High',
          assignee: 'Unassigned',
          module: 'Infrastructure',
          description: 'Review violations and remediation steps for this infrastructure asset.',
          rootCause: 'Policy violations detected during last scan.',
          remediationSteps: [
            'Review active violations on this asset',
            'Identify root cause per violation',
            'Execute remediation steps',
            'Re-scan to confirm resolution',
          ],
          affectedSystems: 'See asset detail',
          complianceImpact: 'Internal Security Policy',
          sla: 'Resolve within 72 hours — P2 SLA',
        });
      }
      setThinking(false);
    }, 1200);
    return () => clearTimeout(t);
  }, [asset, action]);

  // Modal renders for both CryptoAsset and null (IT-asset) cases.

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col mx-4">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
          {ACTION_ICON[action] ?? <Sparkles className="w-4 h-4 text-teal" />}
          <div>
            <p className="text-sm font-semibold text-foreground">TrustOps Ticket — AI Pre-fill</p>
            <p className="text-[10px] text-muted-foreground">{asset?.name ?? 'Infrastructure asset'} · Review and confirm before creating</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {thinking ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal animate-pulse" />
                <span className="text-sm text-muted-foreground">Analysing asset context and generating ticket...</span>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-teal animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : draft ? (
            <div className="p-5 space-y-4">

              {/* Title + priority + type */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${PRIORITY_STYLE[draft.priority]}`}>{draft.priority}</span>
                  <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-secondary">{draft.type}</span>
                  <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-secondary">{draft.module}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{draft.sla}</span>
                </div>
                <input
                  value={draft.title}
                  onChange={e => setDraft({ ...draft, title: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                />
              </div>

              {/* Assignee */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Assignee</label>
                  <input
                    value={draft.assignee}
                    onChange={e => setDraft({ ...draft, assignee: e.target.value })}
                    className="w-full px-3 py-1.5 bg-secondary border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Affected Systems</label>
                  <input
                    value={draft.affectedSystems}
                    onChange={e => setDraft({ ...draft, affectedSystems: e.target.value })}
                    className="w-full px-3 py-1.5 bg-secondary border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  value={draft.description}
                  onChange={e => setDraft({ ...draft, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal resize-none"
                />
              </div>

              {/* Root cause */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Root Cause</label>
                <textarea
                  value={draft.rootCause}
                  onChange={e => setDraft({ ...draft, rootCause: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal resize-none"
                />
              </div>

              {/* Remediation steps */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Remediation Steps</label>
                <div className="space-y-1">
                  {draft.remediationSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground w-5 flex-shrink-0 mt-1.5">{i + 1}.</span>
                      {editingStep === i ? (
                        <input
                          autoFocus
                          value={step}
                          onChange={e => {
                            const steps = [...draft.remediationSteps];
                            steps[i] = e.target.value;
                            setDraft({ ...draft, remediationSteps: steps });
                          }}
                          onBlur={() => setEditingStep(null)}
                          className="flex-1 px-2 py-1 bg-secondary border border-teal/40 rounded text-[11px] text-foreground focus:outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => setEditingStep(i)}
                          className="flex-1 text-left text-[11px] text-muted-foreground px-2 py-1 rounded hover:bg-secondary transition-colors"
                        >
                          {step}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance */}
              <div className="p-3 rounded-lg bg-amber/5 border border-amber/20">
                <p className="text-[10px] font-semibold text-amber mb-0.5">Compliance Impact</p>
                <p className="text-[10px] text-muted-foreground">{draft.complianceImpact}</p>
              </div>

              {/* ServiceNow destination treatment */}
              {destination === 'servicenow' && (
                <div className="p-3 rounded-lg bg-teal/5 border border-teal/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5 text-teal" />
                    <p className="text-[10px] font-semibold text-teal">Destination: ServiceNow ITSM</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Assignment Group</label>
                    <input
                      value={assignmentGroup}
                      onChange={e => setAssignmentGroup(e.target.value)}
                      disabled={!!createdIncident}
                      className="w-full px-3 py-1.5 bg-secondary border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-teal disabled:opacity-60"
                    />
                  </div>
                  {createdIncident && (
                    <div className="mt-2 p-2 rounded bg-teal/10 border border-teal/30 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-teal" />
                      <p className="text-[10.5px] text-foreground">
                        Created in ServiceNow as <span className="font-mono font-semibold text-teal">{createdIncident}</span>
                        <span className="text-muted-foreground"> · assigned to {assignmentGroup}</span>
                      </p>
                    </div>
                  )}
                </div>
              )}


            </div>
          ) : null}
        </div>

        {/* Footer */}
        {!thinking && draft && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-border flex-shrink-0">
            <p className="text-[10px] text-muted-foreground">
              {destination === 'servicenow'
                ? 'Simulated handoff. No live ServiceNow call is made.'
                : 'Review and edit any field before confirming. Ticket will appear in Ticket Management.'}
            </p>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-secondary transition-colors">
                {createdIncident ? 'Close' : 'Cancel'}
              </button>
              {!createdIncident && destination === 'servicenow' && (
                <button
                  onClick={() => {
                    const inc = mockIncidentNumber();
                    setCreatedIncident(inc);
                    addTicket(draft, { destination: 'servicenow', externalId: inc, reporter: 'Quantum Readiness' });
                    onConfirm(draft);
                    toast.success('Created in ServiceNow', {
                      description: `${inc} · ${draft.priority} · ${assignmentGroup}`,
                    });
                  }}
                  className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal/90 font-semibold transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Create in ServiceNow
                </button>
              )}
              {!createdIncident && destination !== 'servicenow' && (
                <button
                  onClick={() => {
                    addTicket(draft);
                    onConfirm(draft);
                    toast.success('Ticket created', {
                      description: `${draft.title} · ${draft.priority} · Assigned to ${draft.assignee}`,
                    });
                    onClose();
                  }}
                  className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal/90 font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Confirm & Create Ticket
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
