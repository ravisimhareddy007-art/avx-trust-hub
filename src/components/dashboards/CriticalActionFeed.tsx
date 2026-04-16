import React, { useState, useMemo } from 'react';
import { useNav } from '@/context/NavigationContext';
import { Shield, Key, Bot, Lock, Fingerprint, Globe, AlertTriangle, Clock, ArrowRight } from 'lucide-react';

type Category = 'All' | 'Certs' | 'SSH' | 'AI' | 'Secrets' | 'Code Sign' | 'K8s';

interface ActionItem {
  id: string;
  category: Exclude<Category, 'All'>;
  icon: React.ComponentType<{ className?: string }>;
  severity: 'P1' | 'P2' | 'P3';
  title: string;
  detail: string;
  cta: string;
  page: string;
  filters?: Record<string, string>;
  ageMins: number;
}

const FEED: ActionItem[] = [
  { id: '1', category: 'Certs', icon: Shield, severity: 'P1', title: '*.payments.acmecorp.com expires in 6 days', detail: 'Wildcard cert · 7 dependent services · auto-renewal off', cta: 'Renew via DigiCert', page: 'remediation', filters: { module: 'clm', filter: 'expiry' }, ageMins: 12 },
  { id: '2', category: 'AI', icon: Bot, severity: 'P1', title: 'gpt-orchestrator-token is over-privileged', detail: '14,200 actions/day · 6 services · OpenAI + S3 + Slack write', cta: 'Right-size scope', page: 'remediation', filters: { module: 'ai-agents' }, ageMins: 47 },
  { id: '3', category: 'SSH', icon: Key, severity: 'P1', title: '3,218 orphaned SSH keys with shell access', detail: 'No assigned owner · last used >180d ago', cta: 'Bulk revoke', page: 'remediation', filters: { module: 'ssh', filter: 'orphaned' }, ageMins: 95 },
  { id: '4', category: 'Secrets', icon: Lock, severity: 'P1', title: '18,420 secrets exposed in code repositories', detail: 'GitHub + GitLab scan · 142 hardcoded in last 24h', cta: 'View exposures', page: 'remediation', filters: { module: 'secrets', filter: 'hardcoded' }, ageMins: 130 },
  { id: '5', category: 'K8s', icon: Globe, severity: 'P2', title: '1,247 K8s workload cert renewals failing', detail: 'cert-manager errors · payments + api namespaces', cta: 'Inspect failures', page: 'trustops', ageMins: 180 },
  { id: '6', category: 'Certs', icon: Shield, severity: 'P2', title: '4,218 certificates use weak algorithms', detail: 'RSA-1024 / SHA-1 · NIST PQC migration required', cta: 'Plan migration', page: 'quantum', ageMins: 240 },
  { id: '7', category: 'Code Sign', icon: Fingerprint, severity: 'P2', title: '142 unsigned production builds detected', detail: 'Pipeline bypass · last 7 days · 3 release branches', cta: 'Block & alert', page: 'remediation', filters: { module: 'codesign' }, ageMins: 320 },
  { id: '8', category: 'Secrets', icon: Lock, severity: 'P2', title: '42,180 API keys not rotated >90 days', detail: 'Vault + AWS Secrets Manager · production scope', cta: 'Schedule rotation', page: 'remediation', filters: { module: 'secrets', filter: 'rotation' }, ageMins: 480 },
  { id: '9', category: 'SSH', icon: Key, severity: 'P3', title: '14,720 keys stored outside HSM', detail: 'Filesystem & vault keystores · move to Thales/AWS CloudHSM', cta: 'View assets', page: 'inventory', filters: { storage: 'non-hsm' }, ageMins: 720 },
  { id: '10', category: 'AI', icon: Bot, severity: 'P3', title: '44K AI agent tokens have no human sponsor', detail: 'Compliance violation · SOC2 control CC6.1', cta: 'Assign sponsors', page: 'inventory', filters: { type: 'AI Agent Token', hasOwner: 'false' }, ageMins: 1100 },
];

const CATEGORIES: Category[] = ['All', 'Certs', 'SSH', 'AI', 'Secrets', 'Code Sign', 'K8s'];

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
  const { setCurrentPage, setFilters } = useNav();
  const [active, setActive] = useState<Category>('All');

  const items = useMemo(() => active === 'All' ? FEED : FEED.filter(i => i.category === active), [active]);

  const nav = (page: string, filters?: Record<string, string>) => {
    if (filters) setFilters(filters);
    setCurrentPage(page);
  };

  return (
    <div className="bg-card rounded-xl border border-border h-full flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-coral" />
            <h2 className="text-sm font-semibold text-foreground">Critical Action Feed</h2>
            <span className="text-[10px] text-muted-foreground">· ranked by impact × urgency</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{items.length} items</span>
        </div>
        {/* Category chips */}
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map(c => {
            const count = c === 'All' ? FEED.length : FEED.filter(i => i.category === c).length;
            const isActive = active === c;
            return (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`text-[10.5px] px-2.5 py-1 rounded-full border transition-colors ${isActive ? 'bg-teal/15 text-teal border-teal/40' : 'bg-secondary/40 text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/70'}`}
              >
                {c} <span className="opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <ul className="divide-y divide-border">
          {items.map(item => {
            const Icon = item.icon;
            return (
              <li key={item.id} className="px-5 py-3 hover:bg-secondary/20 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-secondary/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${SEV_STYLES[item.severity]}`}>{item.severity}</span>
                      <span className="text-[9.5px] text-muted-foreground">{item.category}</span>
                      <span className="text-[9.5px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {ageLabel(item.ageMins)} ago
                      </span>
                    </div>
                    <p className="text-[12px] font-medium text-foreground leading-snug">{item.title}</p>
                    <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug">{item.detail}</p>
                  </div>
                  <button
                    onClick={() => nav(item.page, item.filters)}
                    className="flex-shrink-0 text-[10.5px] font-semibold px-2.5 py-1.5 rounded-md bg-teal text-primary-foreground hover:bg-teal-light transition-colors flex items-center gap-1"
                  >
                    {item.cta} <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </li>
            );
          })}
          {items.length === 0 && (
            <li className="px-5 py-12 text-center text-[11px] text-muted-foreground">
              No critical items in this category. ✓
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
