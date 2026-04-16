import React, { useState, useMemo } from 'react';
import { Shield, Key, Bot, Lock, Fingerprint, Globe, AlertTriangle, Clock, Sparkles, Check, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useDashboard, feedItemToDriver } from '@/context/DashboardContext';
import { useNav } from '@/context/NavigationContext';

interface RemediationGroup {
  ca: string;
  caAccount: string;
  count: number;
  environment: string;
  teams: string[];
  method: 'acme-auto' | 'est-semi' | 'manual';
  requiresApproval: boolean;
  workflowTemplate: string;
}

interface ActionItem {
  id: string;
  category: 'Certs' | 'SSH' | 'AI' | 'Secrets' | 'Code Sign' | 'K8s';
  icon: React.ComponentType<{ className?: string }>;
  severity: 'P1' | 'P2' | 'P3';
  title: string;
  detail: string;
  aiPlan: string;
  approveSummary: string;
  ageMins: number;
  remediationGroups?: RemediationGroup[];
}

const FEED: ActionItem[] = [
  {
    id: '1', category: 'Certs', icon: Shield, severity: 'P1',
    title: '*.payments.acmecorp.com expires in 6 days',
    detail: 'Wildcard cert · 7 dependent services · auto-renewal off',
    aiPlan: 'Renew *.payments.acmecorp.com via DigiCert G2. New cert valid 90 days. Will be deployed to 7 dependent services automatically (payments-api, billing-gw, checkout-fe, settlement-svc, ledger-svc, refund-svc, dispute-svc).',
    approveSummary: 'Renew wildcard cert and roll to 7 services.',
    ageMins: 12,
  },
  {
    id: '2', category: 'AI', icon: Bot, severity: 'P1',
    title: 'gpt-orchestrator-token is over-privileged',
    detail: '14,200 actions/day · 6 services · OpenAI + S3 + Slack write',
    aiPlan: 'Right-size gpt-orchestrator-token scope. Remove S3 write (unused 14d), Slack admin (unused 30d). Keep OpenAI + S3 read. Re-issue token, hot-swap via secret manager.',
    approveSummary: 'Strip 2 unused scopes, rotate token in-place.',
    ageMins: 47,
  },
  {
    id: '3', category: 'SSH', icon: Key, severity: 'P1',
    title: '3,218 orphaned SSH keys with shell access',
    detail: 'No assigned owner · last used >180d ago',
    aiPlan: 'Bulk revoke 3,218 SSH keys (last used >180d, no owner). Quarantine for 30d before deletion. Notify last-known accessing IPs.',
    approveSummary: 'Quarantine 3,218 orphaned keys for 30 days.',
    ageMins: 95,
    remediationGroups: [
      { ca: 'N/A', caAccount: 'ssh-prod', count: 1847, environment: 'Production', teams: ['infra-ops'], method: 'manual', requiresApproval: true, workflowTemplate: 'SSH Key Rotation' },
      { ca: 'N/A', caAccount: 'ssh-staging', count: 1371, environment: 'Staging', teams: ['dev-platform'], method: 'manual', requiresApproval: false, workflowTemplate: 'SSH Key Rotation' },
    ],
  },
  {
    id: '4', category: 'Secrets', icon: Lock, severity: 'P1',
    title: '18,420 secrets exposed in code repositories',
    detail: 'GitHub + GitLab scan · 142 hardcoded in last 24h',
    aiPlan: 'Open PRs to replace hardcoded secrets with Vault references. Rotate all 18,420 exposed values. Notify last-author per repo.',
    approveSummary: 'Rotate all 18,420 secrets and open replacement PRs.',
    ageMins: 130,
    remediationGroups: [
      { ca: 'HashiCorp Vault', caAccount: 'vault-prod', count: 9410, environment: 'Production', teams: ['platform-eng', 'data-eng'], method: 'acme-auto', requiresApproval: true, workflowTemplate: 'Secret Rotation' },
      { ca: 'AWS Secrets Manager', caAccount: 'sm-app', count: 6280, environment: 'Production + Staging', teams: ['app-team'], method: 'acme-auto', requiresApproval: true, workflowTemplate: 'Secret Rotation' },
      { ca: 'Azure Key Vault', caAccount: 'kv-shared', count: 2730, environment: 'Dev + Staging', teams: ['dev-platform'], method: 'acme-auto', requiresApproval: false, workflowTemplate: 'Secret Rotation' },
    ],
  },
  {
    id: '5', category: 'K8s', icon: Globe, severity: 'P2',
    title: '1,247 K8s workload cert renewals failing',
    detail: 'cert-manager errors · payments + api namespaces',
    aiPlan: 'Diagnose cert-manager: ACME challenge failing on 3 ingress paths. Patch ingress annotations + force-renew 1,247 certs.',
    approveSummary: 'Patch ingress and force-renew 1,247 certs.',
    ageMins: 180,
  },
  {
    id: '6', category: 'Certs', icon: Shield, severity: 'P2',
    title: '4,218 certificates use weak algorithms',
    detail: 'RSA-1024 / SHA-1 · NIST PQC migration required',
    aiPlan: 'Stage PQC migration: re-issue 4,218 certs with ML-KEM-768 hybrid. Roll in waves, auto-rollback on TLS handshake failure.',
    approveSummary: 'Begin staged PQC migration of 4,218 certs.',
    ageMins: 240,
    remediationGroups: [
      { ca: 'DigiCert CertCentral', caAccount: 'payments-prod', count: 847, environment: 'Production', teams: ['payments-eng', 'billing-eng'], method: 'acme-auto', requiresApproval: true, workflowTemplate: 'Renew Certificate' },
      { ca: 'Microsoft ADCS', caAccount: 'corp-pki', count: 2103, environment: 'Production + Staging', teams: ['infra-platform'], method: 'est-semi', requiresApproval: true, workflowTemplate: 'Re-enroll Certificate' },
      { ca: "Let's Encrypt", caAccount: 'le-prod', count: 1268, environment: 'Dev + Staging', teams: ['dev-platform'], method: 'acme-auto', requiresApproval: false, workflowTemplate: 'Renew Certificate' },
    ],
  },
  {
    id: '7', category: 'Code Sign', icon: Fingerprint, severity: 'P2',
    title: '142 unsigned production builds detected',
    detail: 'Pipeline bypass · last 7 days · 3 release branches',
    aiPlan: 'Block 142 unsigned artifacts at registry. Alert release engineers. Add policy gate to CI for the 3 affected branches.',
    approveSummary: 'Block unsigned builds and gate CI on 3 branches.',
    ageMins: 320,
  },
  {
    id: '8', category: 'Secrets', icon: Lock, severity: 'P2',
    title: '42,180 API keys not rotated >90 days',
    detail: 'Vault + AWS Secrets Manager · production scope',
    aiPlan: 'Schedule rotation of 42,180 API keys grouped by vault. Notify owning teams 24h before each batch.',
    approveSummary: 'Rotate 42,180 keys grouped by vault.',
    ageMins: 480,
    remediationGroups: [
      { ca: 'HashiCorp Vault', caAccount: 'vault-prod', count: 18420, environment: 'Production', teams: ['platform-eng'], method: 'acme-auto', requiresApproval: true, workflowTemplate: 'API Key Rotation' },
      { ca: 'AWS Secrets Manager', caAccount: 'sm-prod', count: 16280, environment: 'Production', teams: ['cloud-eng'], method: 'acme-auto', requiresApproval: true, workflowTemplate: 'API Key Rotation' },
      { ca: 'Azure Key Vault', caAccount: 'kv-prod', count: 7480, environment: 'Production', teams: ['cloud-eng'], method: 'acme-auto', requiresApproval: false, workflowTemplate: 'API Key Rotation' },
    ],
  },
  {
    id: '9', category: 'SSH', icon: Key, severity: 'P3',
    title: '14,720 keys stored outside HSM',
    detail: 'Filesystem & vault keystores · move to Thales/AWS CloudHSM',
    aiPlan: 'Migrate 14,720 keys to AWS CloudHSM. Wrap, transfer, verify, then delete source. Maintenance window required.',
    approveSummary: 'Migrate 14,720 keys into HSM (windowed).',
    ageMins: 720,
  },
  {
    id: '10', category: 'AI', icon: Bot, severity: 'P3',
    title: '44K AI agent tokens have no human sponsor',
    detail: 'Compliance violation · SOC2 control CC6.1',
    aiPlan: 'Auto-assign sponsors based on token creator + service ownership graph. Send confirmation email to each sponsor with 7d objection window.',
    approveSummary: 'Auto-sponsor 44K tokens with confirmation flow.',
    ageMins: 1100,
    remediationGroups: [
      { ca: 'Okta', caAccount: 'okta-prod', count: 22000, environment: 'Production', teams: ['identity-team'], method: 'acme-auto', requiresApproval: true, workflowTemplate: 'Token Sponsor Assignment' },
      { ca: 'Azure AD', caAccount: 'aad-corp', count: 14000, environment: 'Production', teams: ['identity-team'], method: 'acme-auto', requiresApproval: true, workflowTemplate: 'Token Sponsor Assignment' },
      { ca: 'AWS IAM', caAccount: 'iam-prod', count: 8000, environment: 'Production', teams: ['cloud-eng'], method: 'acme-auto', requiresApproval: false, workflowTemplate: 'Token Sponsor Assignment' },
    ],
  },
];

const SEV_STYLES: Record<ActionItem['severity'], string> = {
  P1: 'bg-coral/15 text-coral border-coral/30',
  P2: 'bg-amber/15 text-amber border-amber/30',
  P3: 'bg-purple/15 text-purple border-purple/30',
};

const METHOD_STYLES: Record<RemediationGroup['method'], { label: string; cls: string }> = {
  'acme-auto':  { label: 'ACME auto', cls: 'bg-teal/15 text-teal' },
  'est-semi':   { label: 'EST semi',  cls: 'bg-amber/15 text-amber' },
  'manual':     { label: 'Manual',    cls: 'bg-purple/15 text-purple-light' },
};

function ageLabel(mins: number) {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

export default function CriticalActionFeed() {
  const { hoveredDriver, resolvedFeedItems, resolveFeedItem } = useDashboard();
  const { setCurrentPage } = useNav();
  const [expanded, setExpanded] = useState<string | null>(null);

  // Sort: pending first (preserve original order), queued/resolved at bottom
  const items = useMemo(() => {
    const decorated = FEED.map(item => ({
      ...item,
      highlighted: hoveredDriver != null && feedItemToDriver[item.id] === hoveredDriver,
      isQueued: resolvedFeedItems.has(item.id),
    }));
    return [
      ...decorated.filter(i => !i.isQueued),
      ...decorated.filter(i => i.isQueued),
    ];
  }, [hoveredDriver, resolvedFeedItems]);

  const handleApprove = (item: ActionItem) => {
    resolveFeedItem(item.id);
    setExpanded(null);
    const groupCount = item.remediationGroups?.length ?? 1;
    toast.success(
      groupCount > 1
        ? `${groupCount} workflow requests submitted`
        : 'Submitted to workflow queue',
      {
        description: 'View in Tickets',
        action: { label: 'Open Tickets', onClick: () => setCurrentPage('tickets') },
      },
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border h-full flex flex-col">
      <div className="px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-coral" />
            <h2 className="text-sm font-semibold text-foreground">Critical Action Feed</h2>
            <span className="text-[10px] text-muted-foreground">· ranked by impact × urgency · click row to inspect</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{FEED.length} items</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <ul className="divide-y divide-border">
          {items.map(item => {
            const Icon = item.icon;
            const isExpanded = expanded === item.id;
            const isQueued = item.isQueued;

            return (
              <li
                key={item.id}
                className={`transition-all border-l-2 ${
                  isQueued
                    ? 'bg-secondary/20 border-l-teal/40 opacity-70'
                    : item.highlighted
                      ? 'bg-coral/[0.03] border-l-coral'
                      : 'border-l-transparent hover:bg-secondary/20'
                }`}
              >
                <button
                  onClick={() => !isQueued && setExpanded(isExpanded ? null : item.id)}
                  disabled={isQueued}
                  className="w-full text-left px-5 py-3 flex items-start gap-3 disabled:cursor-default"
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isQueued ? 'bg-teal/20' : 'bg-secondary/60'
                  }`}>
                    {isQueued ? <Check className="w-3.5 h-3.5 text-teal" /> : <Icon className="w-3.5 h-3.5 text-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${SEV_STYLES[item.severity]}`}>{item.severity}</span>
                      <span className="text-[9.5px] text-muted-foreground">{item.category}</span>
                      <span className="text-[9.5px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {ageLabel(item.ageMins)} ago
                      </span>
                      {item.remediationGroups && !isQueued && (
                        <span className="text-[9.5px] text-purple-light flex items-center gap-0.5">
                          <Layers className="w-2.5 h-2.5" /> {item.remediationGroups.length} CA groups
                        </span>
                      )}
                      {isQueued && (
                        <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-teal/15 text-teal flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Queued
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] font-medium text-foreground leading-snug">{item.title}</p>
                    <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug">{item.detail}</p>
                  </div>
                  {!isQueued && (
                    isExpanded
                      ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                      : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                  )}
                </button>

                {/* Expanded AI execution panel */}
                {isExpanded && !isQueued && (
                  <div className="px-5 pb-3 ml-10 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="rounded-md bg-secondary/40 border border-teal/20 p-3">
                      <p className="text-[9px] uppercase tracking-wider text-teal font-semibold mb-1 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> What AI will do
                      </p>
                      <p className="text-[11px] text-foreground leading-snug mb-2">{item.aiPlan}</p>

                      {item.remediationGroups ? (
                        <>
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 mt-2">
                            Remediation groups · one workflow request per row
                          </p>
                          <div className="rounded border border-border overflow-hidden mb-2.5 bg-card">
                            <table className="w-full text-[10px]">
                              <thead className="bg-secondary/40">
                                <tr className="text-muted-foreground">
                                  <th className="text-left px-2 py-1.5 font-medium">CA / Store</th>
                                  <th className="text-left px-2 py-1.5 font-medium">Account</th>
                                  <th className="text-right px-2 py-1.5 font-medium">Count</th>
                                  <th className="text-left px-2 py-1.5 font-medium">Environment</th>
                                  <th className="text-left px-2 py-1.5 font-medium">Teams</th>
                                  <th className="text-left px-2 py-1.5 font-medium">Method</th>
                                  <th className="text-left px-2 py-1.5 font-medium">Approval</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.remediationGroups.map((g, i) => {
                                  const m = METHOD_STYLES[g.method];
                                  return (
                                    <tr key={i} className="border-t border-border">
                                      <td className="px-2 py-1.5 text-foreground font-medium">{g.ca}</td>
                                      <td className="px-2 py-1.5 text-muted-foreground font-mono">{g.caAccount}</td>
                                      <td className="px-2 py-1.5 text-foreground tabular-nums text-right">{g.count.toLocaleString()}</td>
                                      <td className="px-2 py-1.5 text-muted-foreground">{g.environment}</td>
                                      <td className="px-2 py-1.5 text-muted-foreground">{g.teams.join(', ')}</td>
                                      <td className="px-2 py-1.5">
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${m.cls}`}>{m.label}</span>
                                      </td>
                                      <td className="px-2 py-1.5">
                                        {g.requiresApproval
                                          ? <span className="text-[9px] text-coral">Required</span>
                                          : <span className="text-[9px] text-teal">Not required</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(item)}
                              className="flex-1 text-[11px] font-semibold py-1.5 rounded-md bg-teal text-primary-foreground hover:bg-teal-light"
                            >
                              Submit as workflow requests →
                            </button>
                            <button
                              onClick={() => setExpanded(null)}
                              className="text-[11px] font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                            >
                              Review manually
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">You're approving</p>
                          <p className="text-[11px] text-foreground leading-snug mb-2.5">{item.approveSummary}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(item)}
                              className="flex-1 text-[11px] font-semibold py-1.5 rounded-md bg-teal text-primary-foreground hover:bg-teal-light"
                            >
                              Approve & Execute
                            </button>
                            <button
                              onClick={() => setExpanded(null)}
                              className="text-[11px] font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                            >
                              Review manually
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {isQueued && (
                  <p className="px-5 pb-2 ml-10 text-[10px] text-teal">
                    Workflow request submitted · #TKT-{1000 + Number(item.id) * 37} · view in Tickets
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
