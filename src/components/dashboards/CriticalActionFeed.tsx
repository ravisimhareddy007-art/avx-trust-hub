import React, { useState, useMemo } from 'react';
import { Shield, Key, Bot, Lock, Fingerprint, Globe, AlertTriangle, Clock, Sparkles, Loader2, Check, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { feedItemToDriver } from '@/context/DashboardContext';

interface WaveInfo {
  waves: number;
  perWave: number;
  totalAffected: number;
  unit: string;
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
  waveInfo?: WaveInfo;
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
    waveInfo: { waves: 4, perWave: 800, totalAffected: 3218, unit: 'keys' },
  },
  {
    id: '4', category: 'Secrets', icon: Lock, severity: 'P1',
    title: '18,420 secrets exposed in code repositories',
    detail: 'GitHub + GitLab scan · 142 hardcoded in last 24h',
    aiPlan: 'Open PRs to replace hardcoded secrets with Vault references. Rotate all 18,420 exposed values. Notify last-author per repo.',
    approveSummary: 'Rotate all 18,420 secrets and open replacement PRs.',
    ageMins: 130,
    waveInfo: { waves: 6, perWave: 3070, totalAffected: 18420, unit: 'secrets' },
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
    aiPlan: 'Stage PQC migration: re-issue 4,218 certs with ML-KEM-768 hybrid via DigiCert. Roll in waves of 200/day. Auto-rollback on TLS handshake failure.',
    approveSummary: 'Begin staged PQC migration of 4,218 certs.',
    ageMins: 240,
    waveInfo: { waves: 21, perWave: 200, totalAffected: 4218, unit: 'certs' },
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
    aiPlan: 'Schedule wave-based rotation of 42,180 API keys (5 waves over 5 days). Notify owning teams 24h before each wave.',
    approveSummary: 'Schedule 5-wave rotation of 42,180 keys.',
    ageMins: 480,
    waveInfo: { waves: 5, perWave: 8436, totalAffected: 42180, unit: 'keys' },
  },
  {
    id: '9', category: 'SSH', icon: Key, severity: 'P3',
    title: '14,720 keys stored outside HSM',
    detail: 'Filesystem & vault keystores · move to Thales/AWS CloudHSM',
    aiPlan: 'Migrate 14,720 keys to AWS CloudHSM. Wrap, transfer, verify, then delete source. Maintenance window required for signing-svc.',
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
    waveInfo: { waves: 4, perWave: 11000, totalAffected: 44000, unit: 'tokens' },
  },
];

const SEV_STYLES: Record<ActionItem['severity'], string> = {
  P1: 'bg-coral/15 text-coral border-coral/30',
  P2: 'bg-amber/15 text-amber border-amber/30',
  P3: 'bg-purple/15 text-purple border-purple/30',
};

function ageLabel(mins: number) {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

export default function CriticalActionFeed() {
  const { hoveredDriver, resolvedFeedItems, resolvingFeedItems, resolveFeedItem } = useDashboard();
  const [expanded, setExpanded] = useState<string | null>(null);

  // Soft narrative wiring: only highlight matching items, do NOT dim others
  const items = useMemo(() => {
    return FEED.map(item => ({
      ...item,
      highlighted: hoveredDriver != null && feedItemToDriver[item.id] === hoveredDriver,
    }));
  }, [hoveredDriver]);

  return (
    <div className="bg-card rounded-xl border border-border h-full flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-coral" />
            <h2 className="text-sm font-semibold text-foreground">Critical Action Feed</h2>
            <span className="text-[10px] text-muted-foreground">· ranked by impact × urgency · AI-executable</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{FEED.length} items</span>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <ul className="divide-y divide-border">
          {items.map(item => {
            const Icon = item.icon;
            const isExpanded = expanded === item.id;
            const isResolving = resolvingFeedItems.has(item.id);
            const isResolved = resolvedFeedItems.has(item.id);

            return (
              <li
                key={item.id}
                className={`px-5 py-3 transition-all border-l-2 ${
                  isResolved
                    ? 'bg-teal/5 border-l-teal/40'
                    : item.highlighted
                      ? 'bg-coral/[0.03] border-l-coral'
                      : 'border-l-transparent hover:bg-secondary/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isResolved ? 'bg-teal/20' : 'bg-secondary/60'
                  }`}>
                    {isResolved ? <Check className="w-3.5 h-3.5 text-teal" /> : <Icon className="w-3.5 h-3.5 text-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${SEV_STYLES[item.severity]}`}>{item.severity}</span>
                      <span className="text-[9.5px] text-muted-foreground">{item.category}</span>
                      <span className="text-[9.5px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {ageLabel(item.ageMins)} ago
                      </span>
                      {item.waveInfo && (
                        <span className="text-[9.5px] text-purple-light flex items-center gap-0.5">
                          <Layers className="w-2.5 h-2.5" /> {item.waveInfo.waves}-wave plan
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] font-medium text-foreground leading-snug">{item.title}</p>
                    <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug">{item.detail}</p>
                  </div>

                  {/* Right-side action */}
                  {isResolved ? (
                    <span className="flex-shrink-0 text-[10px] font-semibold px-2.5 py-1.5 rounded-md bg-teal/15 text-teal flex items-center gap-1">
                      <Check className="w-3 h-3" /> Deployed
                    </span>
                  ) : isResolving ? (
                    <span className="flex-shrink-0 text-[10px] font-semibold px-2.5 py-1.5 rounded-md bg-teal/10 text-teal flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Renewing…
                    </span>
                  ) : (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : item.id)}
                      className="flex-shrink-0 text-[10.5px] font-semibold px-2.5 py-1.5 rounded-md bg-teal text-primary-foreground hover:bg-teal-light transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> AI: Fix this
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {/* Expanded AI execution panel */}
                {isExpanded && !isResolving && !isResolved && (
                  <div className="mt-2.5 ml-10 rounded-md bg-secondary/40 border border-teal/20 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-[9px] uppercase tracking-wider text-teal font-semibold mb-1 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> What AI will do
                    </p>
                    <p className="text-[11px] text-foreground leading-snug mb-2">{item.aiPlan}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">You're approving</p>
                    <p className="text-[11px] text-foreground leading-snug mb-2.5">{item.approveSummary}</p>

                    {item.waveInfo && (
                      <div className="mb-2.5 rounded bg-purple/10 border border-purple/30 px-2.5 py-1.5">
                        <p className="text-[9px] uppercase tracking-wider text-purple-light font-semibold mb-0.5 flex items-center gap-1">
                          <Layers className="w-2.5 h-2.5" /> Wave plan scope
                        </p>
                        <p className="text-[10.5px] text-foreground tabular-nums">
                          Wave 1 of {item.waveInfo.waves} · {item.waveInfo.perWave.toLocaleString()} {item.waveInfo.unit} · today
                          <span className="text-muted-foreground"> ({item.waveInfo.totalAffected.toLocaleString()} total over {item.waveInfo.waves} waves)</span>
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => { resolveFeedItem(item.id); setExpanded(null); }}
                        className="flex-1 text-[11px] font-semibold py-1.5 rounded-md bg-teal text-primary-foreground hover:bg-teal-light"
                      >
                        {item.waveInfo ? 'Approve wave plan →' : 'Approve & Execute'}
                      </button>
                      <button
                        onClick={() => setExpanded(null)}
                        className="text-[11px] font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                      >
                        Review manually
                      </button>
                    </div>
                  </div>
                )}

                {/* Live status after approve */}
                {isResolved && (
                  <p className="mt-1.5 ml-10 text-[10px] text-teal">
                    {item.waveInfo ? `Wave 1/${item.waveInfo.waves} executed → next wave scheduled` : 'Renewing → Deployed → Ticket closed'} (#TKT-{1000 + Number(item.id) * 37})
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
