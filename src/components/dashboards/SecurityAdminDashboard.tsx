import React, { useState, useEffect } from 'react';
import { RefreshCw, LayoutDashboard, Wrench, Zap, AlertTriangle, X, CheckCircle2, Plug, ScanSearch, Shield, ChevronRight, BookOpen } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { useNav } from '@/context/NavigationContext';
import { DashboardProvider } from '@/context/DashboardContext';
import EnterpriseRiskScore from './ers/EnterpriseRiskScore';
import CriticalActionFeed from './CriticalActionFeed';
import IdentityHealthBands from './IdentityHealthBands';
import QTHPostureStrip from './QTHPostureStrip';
import InfrastructurePostureStrip from './InfrastructurePostureStrip';
import OperationsKPIStrip from './operations/OperationsKPIStrip';
import ExpiryForecast from './operations/ExpiryForecast';
import TriageQueue from './operations/TriageQueue';
import CryptoReadinessSummary from './readiness/CryptoReadinessSummary';
import AlgorithmConcentration from './readiness/AlgorithmConcentration';
import PQCMigrationPanel from './readiness/PQCMigrationPanel';

type DashTab = 'posture' | 'operations' | 'readiness';

const TABS: { id: DashTab; label: string; icon: React.ElementType }[] = [
  { id: 'posture',    label: 'Posture',    icon: LayoutDashboard },
  { id: 'operations', label: 'Operations', icon: Wrench },
  { id: 'readiness',  label: 'Readiness',  icon: Zap },
];

export default function SecurityAdminDashboard() {
  const [tab, setTab] = useState<DashTab>('posture');
  const { notifications, markRead, markAllRead } = useNotifications();
  const { setCurrentPage } = useNav();
  const escalations = notifications.filter(n => n.toPersona === 'security-admin');
  const unreadEscalations = escalations.filter(n => !n.read);

  // Onboarding strip — dismissals are session-only so prototype always shows
  // Steps 1/2/3 on refresh. Clear any legacy persisted state too.
  useEffect(() => { try { localStorage.removeItem('avx-onboarding-dismissed'); } catch {} }, []);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const dismiss = (id: string) => {
    setDismissed(prev => [...prev, id]);
  };

  const dismissAll = () => {
    setDismissed(['integrations', 'discovery', 'policy']);
  };

  const showStrip = !['integrations', 'discovery', 'policy'].every(id => dismissed.includes(id));

  const [helpPanel, setHelpPanel] = useState<'integrations' | 'discovery' | 'policy' | null>(null);

  return (
    <DashboardProvider>
      <div className="space-y-0 max-h-[calc(100vh-120px)] flex flex-col">

        {/* Page header */}
        <div className="flex items-end justify-between pt-1 pb-3 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Trust Posture & Risk Intelligence
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Security Admin · Enterprise view
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Refreshed 0m ago</span>
            <button className="p-1 hover:text-foreground">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Getting Started strip */}
        {showStrip && (
          <div className="mb-4 rounded-xl border border-border bg-card/50 p-4 flex-shrink-0">
            {/* Strip header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-semibold text-foreground">Getting Started</span>
                <span className="text-[11px] text-muted-foreground ml-2">
                  — complete these steps to unlock full platform value
                </span>
              </div>
              <button
                onClick={dismissAll}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Dismiss all
              </button>
            </div>

            {/* 3 tiles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Tile 1 — Integrations */}
              {!dismissed.includes('integrations') && (
                <div className="relative rounded-lg border border-border bg-background p-3.5 flex flex-col">
                  <button
                    onClick={() => dismiss('integrations')}
                    className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-4 h-4 rounded-full bg-teal/15 text-teal text-[9px] font-bold flex items-center justify-center">1</span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Step 1</span>
                  </div>
                  <div className="flex items-start gap-2.5 mb-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0">
                      <Plug className="w-4 h-4 text-teal" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground mb-1">
                        Connect your environment
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Connect your CAs, vaults, cloud accounts, and ITSM tools so the platform can find and govern your cryptographic assets.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      onClick={() => setCurrentPage('integrations-sources')}
                      className="flex items-center gap-1 text-[10px] font-medium text-white bg-teal px-3 py-1.5 rounded-lg hover:bg-teal/90 transition-colors"
                    >
                      Go to Integrations
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setHelpPanel('integrations')}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      <BookOpen className="w-3 h-3" />
                      How it works
                    </button>
                  </div>
                </div>
              )}

              {/* Tile 2 — Discovery */}
              {!dismissed.includes('discovery') && (
                <div className="relative rounded-lg border border-border bg-background p-3.5 flex flex-col">
                  <button
                    onClick={() => dismiss('discovery')}
                    className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-4 h-4 rounded-full bg-teal/15 text-teal text-[9px] font-bold flex items-center justify-center">2</span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Step 2</span>
                  </div>
                  <div className="flex items-start gap-2.5 mb-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0">
                      <ScanSearch className="w-4 h-4 text-teal" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground mb-1">
                        Run your first discovery scan
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Scan your network, SSH hosts, vaults, and cloud accounts to build a complete inventory of every cryptographic asset you own.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      onClick={() => setCurrentPage('discovery')}
                      className="flex items-center gap-1 text-[10px] font-medium text-white bg-teal px-3 py-1.5 rounded-lg hover:bg-teal/90 transition-colors"
                    >
                      Start Discovery
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setHelpPanel('discovery')}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      <BookOpen className="w-3 h-3" />
                      How it works
                    </button>
                  </div>
                </div>
              )}

              {/* Tile 3 — Policy */}
              {!dismissed.includes('policy') && (
                <div className="relative rounded-lg border border-border bg-background p-3.5 flex flex-col">
                  <button
                    onClick={() => dismiss('policy')}
                    className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-4 h-4 rounded-full bg-teal/15 text-teal text-[9px] font-bold flex items-center justify-center">3</span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Step 3</span>
                  </div>
                  <div className="flex items-start gap-2.5 mb-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-teal" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground mb-1">
                        Set your first policy
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Define what good looks like — rotation schedules, algorithm standards, expiry thresholds. Describe it in plain English and AI fills the rest.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      onClick={() => setCurrentPage('policy-builder')}
                      className="flex items-center gap-1 text-[10px] font-medium text-white bg-teal px-3 py-1.5 rounded-lg hover:bg-teal/90 transition-colors"
                    >
                      Create a Policy
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setHelpPanel('policy')}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      <BookOpen className="w-3 h-3" />
                      How it works
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex items-center border-b border-border flex-shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-teal text-teal'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin pt-4">

          {/* ── POSTURE TAB ───────────────────────────────────────── */}
          {tab === 'posture' && (
            <div className="space-y-4 pr-1">

              {/* ── ESCALATION ALERTS from Compliance Officer ─────── */}
              {escalations.length > 0 && (
                <div className="space-y-2">
                  {escalations.map(n => (
                    <div key={n.id} className={`rounded-lg border px-4 py-3 flex items-start gap-3 transition-colors ${!n.read ? 'border-coral/40 bg-coral/5' : 'border-border bg-muted/20 opacity-70'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${!n.read ? 'bg-coral/15' : 'bg-muted'}`}>
                        <AlertTriangle className={`w-4 h-4 ${!n.read ? 'text-coral' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-foreground">Compliance Escalation</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            n.violationSeverity === 'Critical' ? 'bg-coral/10 text-coral' :
                            n.violationSeverity === 'High' ? 'bg-amber/10 text-amber' : 'bg-purple/10 text-purple'
                          }`}>{n.violationSeverity}</span>
                          {n.ticketId && <span className="text-[10px] font-mono text-teal">{n.ticketId}</span>}
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />}
                          <span className="text-[10px] text-muted-foreground ml-auto">{n.timestamp}</span>
                        </div>
                        <p className="text-xs font-medium text-foreground">{n.violationAsset}</p>
                        <p className="text-[10px] text-muted-foreground">{n.violationRule} · {n.violationFramework} · {n.violationBU}</p>
                        {n.comments && (
                          <p className="text-[10px] text-foreground/80 mt-1.5 italic bg-muted/40 rounded px-2 py-1">
                            💬 "{n.comments}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!n.read && (
                          <button onClick={() => markRead(n.id)}
                            className="text-[10px] px-2 py-1 bg-teal/10 text-teal rounded hover:bg-teal/20 font-medium whitespace-nowrap">
                            Acknowledge
                          </button>
                        )}
                        {n.read && <CheckCircle2 className="w-4 h-4 text-teal" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-5 lg:h-[420px]">
                  <EnterpriseRiskScore />
                </div>
                <div className="lg:col-span-7 lg:h-[420px] overflow-hidden">
                  <CriticalActionFeed />
                </div>
              </div>
              <QTHPostureStrip />
              <IdentityHealthBands />
              <InfrastructurePostureStrip />
            </div>
          )}

          {/* ── OPERATIONS TAB ────────────────────────────────────── */}
          {tab === 'operations' && (
            <div className="space-y-4 pr-1">
              <OperationsKPIStrip />
              <ExpiryForecast />
              <TriageQueue />
            </div>
          )}

          {/* ── READINESS TAB ─────────────────────────────────────── */}
          {tab === 'readiness' && (
            <div className="space-y-4 pr-1">
              <CryptoReadinessSummary />
              <AlgorithmConcentration />
              <PQCMigrationPanel />
            </div>
          )}

        </div>
      </div>

      {/* Help slide-over panels */}
      {helpPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setHelpPanel(null)}
          />

          {/* Slide-over panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-background border-l border-border z-50 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2.5">
                {helpPanel === 'integrations' && <Plug className="w-4 h-4 text-teal" />}
                {helpPanel === 'discovery' && <ScanSearch className="w-4 h-4 text-teal" />}
                {helpPanel === 'policy' && <Shield className="w-4 h-4 text-teal" />}
                <h2 className="text-sm font-semibold text-foreground">
                  {helpPanel === 'integrations' && 'Connecting your environment'}
                  {helpPanel === 'discovery' && 'How discovery works'}
                  {helpPanel === 'policy' && 'Creating your first policy'}
                </h2>
              </div>
              <button
                onClick={() => setHelpPanel(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {helpPanel === 'integrations' && (
                <>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The platform works with your existing stack — connect once and it stays in sync automatically.
                  </p>
                  {[
                    { title: 'Certificate Authorities', body: "Connect DigiCert, Entrust, GlobalSign, Let's Encrypt, or your internal Microsoft CA. The platform pulls your full certificate inventory and monitors expiry, algorithm, and CA compliance in real time." },
                    { title: 'Vaults & Secret Stores', body: 'Connect HashiCorp Vault, AWS Secrets Manager, or Azure Key Vault. The platform discovers secrets and API keys stored in each vault and applies your rotation policies automatically.' },
                    { title: 'Cloud Accounts', body: 'Connect AWS, Azure, and GCP. Cloud-native certificates and cryptographic assets are discovered alongside your on-prem inventory — one unified view.' },
                    { title: 'ITSM & Notifications', body: 'Connect ServiceNow, Jira, PagerDuty, or Slack. Every remediation action creates a tracked work order. Every policy violation can trigger a notification to the right team.' },
                    { title: 'DevOps & CI/CD', body: 'Connect GitHub Actions, Jenkins, or GitLab. The platform discovers SSH keys and certificates embedded in your pipelines and brings them under governance.' },
                  ].map(item => (
                    <div key={item.title} className="rounded-lg border border-border bg-card/30 p-3">
                      <div className="text-xs font-semibold text-foreground mb-1">{item.title}</div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{item.body}</p>
                    </div>
                  ))}
                  <div className="rounded-lg border border-teal/30 bg-teal/5 p-3">
                    <div className="text-[11px] font-semibold text-teal mb-1">✦ Tip</div>
                    <p className="text-[11px] text-foreground/80 leading-relaxed">
                      Start with your primary CA and one cloud account. You'll have a complete inventory within minutes of your first connection.
                    </p>
                  </div>
                </>
              )}

              {helpPanel === 'discovery' && (
                <>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Discovery finds every cryptographic asset across your environment — automatically, continuously.
                  </p>
                  {[
                    { title: 'Network Scan', body: "Scans IP ranges and hostnames for TLS certificates on any port. Finds certs that were never enrolled through AppViewX — shadow inventory you didn't know existed." },
                    { title: 'SSH Host Scan', body: 'Connects to target hosts and reads authorized_keys and known_hosts files. Discovers every SSH key — managed or rogue — across your Linux and Windows fleet.' },
                    { title: 'Vault & Secret Scan', body: 'Reads secret paths from connected vaults. Classifies each secret by type — API key, OAuth token, database credential — and applies age and rotation checks.' },
                    { title: 'Cloud Discovery', body: 'Pulls certificates and keys from AWS ACM, Azure Key Vault, and GCP Certificate Manager. Also discovers IAM service account keys and cloud-native agent credentials.' },
                    { title: 'AI Agent Discovery', body: 'Discovers AI agent tokens registered in your environment — including MCP server connections, permission scope, and credential age. Powered by the Eos integration.' },
                  ].map(item => (
                    <div key={item.title} className="rounded-lg border border-border bg-card/30 p-3">
                      <div className="text-xs font-semibold text-foreground mb-1">{item.title}</div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{item.body}</p>
                    </div>
                  ))}
                  <div className="rounded-lg border border-teal/30 bg-teal/5 p-3">
                    <div className="text-[11px] font-semibold text-teal mb-1">✦ Tip</div>
                    <p className="text-[11px] text-foreground/80 leading-relaxed">
                      Run a network scan first — it gives you the broadest coverage fastest. SSH and vault scans can run in parallel once integrations are live.
                    </p>
                  </div>
                </>
              )}

              {helpPanel === 'policy' && (
                <>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Policies define what good looks like. The platform measures everything against them — automatically.
                  </p>
                  {[
                    { title: 'What is a policy?', body: 'A policy is a rule that the platform enforces across your inventory. For example: "All production SSH keys must rotate every 90 days." Every asset is checked against every active policy in real time.' },
                    { title: 'Policy types', body: 'You can create policies for Certificates (TLS, Code-Signing, K8s), SSH Keys, Secrets & API Keys, AI Agent Tokens, and Devices. Each type has rules specific to that asset — expiry, algorithm, rotation period, TTL.' },
                    { title: 'Using AI to create policies', body: "You don't need to know every field. Describe what you want in plain English — \"rotate all production SSH keys every 90 days and block RSA-1024\" — and the AI fills the configuration automatically." },
                    { title: 'Out-of-box policies', body: 'The platform ships with pre-built policies for common standards — PCI-DSS, DORA, NIS2, NIST, HIPAA. Enable them with one click. They start flagging violations immediately.' },
                    { title: 'What happens on a violation?', body: 'You choose: alert only, block the action, auto-remediate, create a ticket, or escalate to the owner. Violations appear in the Violations tab and feed into your compliance posture score.' },
                  ].map(item => (
                    <div key={item.title} className="rounded-lg border border-border bg-card/30 p-3">
                      <div className="text-xs font-semibold text-foreground mb-1">{item.title}</div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{item.body}</p>
                    </div>
                  ))}
                  <div className="rounded-lg border border-teal/30 bg-teal/5 p-3">
                    <div className="text-[11px] font-semibold text-teal mb-1">✦ Tip</div>
                    <p className="text-[11px] text-foreground/80 leading-relaxed">
                      Start with the out-of-box policies for your primary compliance framework. Then create one custom policy using AI assist — it takes under a minute.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer CTA */}
            <div className="px-5 py-4 border-t border-border flex-shrink-0">
              <button
                onClick={() => {
                  const target = helpPanel;
                  setHelpPanel(null);
                  if (target === 'integrations') setCurrentPage('integrations-sources');
                  if (target === 'discovery') setCurrentPage('discovery');
                  if (target === 'policy') setCurrentPage('policy-builder');
                }}
                className="w-full bg-teal text-white text-xs font-medium py-2.5 rounded-lg hover:bg-teal/90 transition-colors flex items-center justify-center gap-2"
              >
                {helpPanel === 'integrations' && 'Go to Integrations'}
                {helpPanel === 'discovery' && 'Go to Discovery'}
                {helpPanel === 'policy' && 'Create a Policy'}
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardProvider>
  );
}
