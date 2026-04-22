import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowRight,
  Atom,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Download,
  ExternalLink,
  FileCode,
  FilePlus,
  Info,
  KeyRound,
  Lock,
  MoreVertical,
  RotateCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  Upload,
  UserPlus,
  XCircle,
} from 'lucide-react';
import CertDeploymentsView from '@/components/remediation/CertDeploymentsView';
import { Modal } from '@/components/shared/UIComponents';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import EnrollCertificateWizard from './actions/EnrollCertificateWizard';
import GenerateCSRModal from './actions/GenerateCSRModal';
import PushToDeviceModal from './actions/PushToDeviceModal';
import { clmCertificates, clmIssueFilters, clmIssues, policyRequestsSeed, sslCheckMock } from './mockData';
import { ClmIssueAction, ClmIssueFilter, ClmIssueRow, ClmTab, PolicyActionType, PolicyRequestRow } from './types';

interface Props {
  activeTab: ClmTab;
  onTabChange: (tab: ClmTab) => void;
}

type EnvironmentFilter = 'All' | 'Production' | 'Staging' | 'Development';
type QueueFilter = 'All' | 'Pending' | 'In Progress' | 'Completed' | 'Failed';
type ValidityUnit = 'Days' | 'Months' | 'Years';

const proactiveCards = [
  {
    id: 'enroll',
    title: 'Enroll Certificate',
    description: 'Request a new certificate from a CA',
    cta: 'Start Enrollment',
    icon: FilePlus,
  },
  {
    id: 'push',
    title: 'Push to Device',
    description: 'Deploy an existing cert to an endpoint',
    cta: 'Push',
    icon: Upload,
  },
  {
    id: 'csr',
    title: 'Generate CSR',
    description: 'Generate a Certificate Signing Request',
    cta: 'Generate',
    icon: FileCode,
  },
  {
    id: 'ssl',
    title: 'SSL Checker',
    description: 'Diagnose certificate chain for a hostname',
    cta: 'Run Check',
    icon: ShieldCheck,
  },
] as const;

const actionMeta: Record<ClmIssueAction, { icon: React.ElementType; className: string }> = {
  Renew: { icon: RotateCw, className: 'bg-teal/10 text-teal hover:bg-teal/20' },
  Regenerate: { icon: FileCode, className: 'bg-muted text-foreground hover:bg-secondary' },
  Reissue: { icon: FilePlus, className: 'bg-muted text-foreground hover:bg-secondary' },
  Revoke: { icon: XCircle, className: 'bg-coral/10 text-coral hover:bg-coral/20' },
  'CA Switch': { icon: Shuffle, className: 'bg-amber/10 text-amber hover:bg-amber/20' },
  'Revocation Check - OCSP': { icon: ShieldCheck, className: 'bg-muted text-foreground hover:bg-secondary' },
  Migrate: { icon: Atom, className: 'bg-purple/10 text-purple hover:bg-purple/20' },
};

const queueStatuses: QueueFilter[] = ['All', 'Pending', 'In Progress', 'Completed', 'Failed'];
const caTemplates = ['Public TLS OV', 'Public TLS EV', 'Internal Server TLS', 'Client Auth', 'Code Signing'];
const certificateCategories = ['TLS', 'Code Signing', 'Client'];
const certTypes = ['DV', 'OV', 'EV'];
const csrLocations = ['AppViewX', 'Endpoint'];
const deviceTypes = ['Windows IIS', 'Apache', 'Nginx', 'Tomcat', 'MSSQL', 'Linux Server'];
const ownerOptions = ['Sarah Chen', 'Mike Rodriguez', 'Lisa Park', 'James Wilson', 'Security Team'];
const caList = ['DigiCert Global G2', 'Entrust L1K', "Let's Encrypt", 'MSCA Enterprise'];
const groupOptions = ['Payments', 'Platform', 'Security', 'Identity', 'Infrastructure'];

const getIssueCounts = () => ({
  all: clmIssues.length,
  expiring: clmIssues.filter((item) => item.issueCategory === 'expiring').length,
  pqc: clmIssues.filter((item) => item.issueCategory === 'pqc').length,
  orphaned: clmIssues.filter((item) => item.issueCategory === 'orphaned').length,
  policy: clmIssues.filter((item) => item.issueCategory === 'policy').length,
  codesigning: 3,
});

const formatCount = (value: number) => new Intl.NumberFormat('en-US').format(value);

const environmentBadgeClass = (env: ClmIssueRow['environment']) => {
  if (env === 'Production') return 'bg-coral/10 text-coral';
  if (env === 'Staging') return 'bg-amber/10 text-amber';
  return 'bg-muted text-muted-foreground';
};

const severityBadgeClass = (severity: ClmIssueRow['severity']) => {
  if (severity === 'Critical') return 'bg-coral/10 text-coral';
  if (severity === 'High') return 'bg-amber/10 text-amber';
  if (severity === 'Medium') return 'bg-purple/10 text-purple';
  return 'bg-teal/10 text-teal';
};

const requestStatusClass = (status: QueueFilter | PolicyRequestRow['status']) => {
  switch (status) {
    case 'Pending':
      return 'bg-amber/10 text-amber';
    case 'In Progress':
      return 'bg-teal/10 text-teal';
    case 'Completed':
      return 'bg-teal/10 text-teal';
    case 'Failed':
      return 'bg-coral/10 text-coral';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const actionBadgeClass = (action: PolicyActionType) => {
  if (action === 'Enroll') return 'bg-teal/10 text-teal';
  if (action === 'Push to Device') return 'bg-amber/10 text-amber';
  if (action === 'Generate CSR') return 'bg-purple/10 text-purple';
  return 'bg-coral/10 text-coral';
};

const deriveCRS = (row: ClmIssueRow) => {
  let score = 92;
  if (row.asset.daysToExpiry <= 7) score -= 18;
  if (row.asset.status === 'Expired') score -= 22;
  if (row.asset.algorithm.includes('1024')) score -= 20;
  if (row.asset.policyViolations > 0) score -= row.asset.policyViolations * 3;
  if (row.asset.pqcRisk === 'Critical') score -= 10;
  return Math.max(35, score);
};

const getSans = (asset: ClmIssueRow['asset']) => {
  const baseName = asset.commonName.replace(/^\*\./, '');
  return Array.from(
    new Set([
      asset.commonName,
      `www.${baseName}`,
      `${asset.application.toLowerCase().replace(/\s+/g, '-')}.internal.acmecorp.com`,
    ]),
  );
};


const DetailDrawer = ({
  row,
  open,
  onClose,
  onRunAction,
}: {
  row: ClmIssueRow | null;
  open: boolean;
  onClose: () => void;
  onRunAction: (action: ClmIssueAction, row: ClmIssueRow) => void;
}) => {
  if (!open || !row) return null;

  const footerActions = [row.primaryAction, ...row.menuActions];
  const crsScore = deriveCRS(row);

  return (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" className="flex-1 bg-background/60" onClick={onClose} aria-label="Close details" />
      <aside className="w-[480px] border-l border-border bg-card shadow-2xl animate-slide-in-right">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Certificate detail</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">{row.asset.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">
            Close
          </button>
        </div>
        <div className="space-y-5 px-5 py-4 text-sm">
          <div className="rounded-lg border border-coral/20 bg-coral/5 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-coral">Current issue</p>
            <p className="mt-1 text-sm text-foreground">{row.issueText}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoTile label="CN" value={row.asset.commonName} mono />
            <InfoTile label="Serial" value={row.asset.serial} mono />
            <InfoTile label="Issuer" value={row.asset.caIssuer} />
            <InfoTile label="Days remaining" value={String(row.asset.daysToExpiry)} emphasis={row.asset.daysToExpiry <= 7 ? 'coral' : 'teal'} />
            <InfoTile label="Valid From" value={row.asset.issueDate} mono />
            <InfoTile label="Valid To" value={row.asset.expiryDate} mono />
            <InfoTile label="Algorithm" value={row.asset.algorithm} />
            <InfoTile label="Key Size" value={row.asset.keyLength} />
          </div>

          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">CRS score</p>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${crsScore < 60 ? 'bg-coral/10 text-coral' : crsScore < 80 ? 'bg-amber/10 text-amber' : 'bg-teal/10 text-teal'}`}>
                {crsScore}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Derived from expiry pressure, algorithm strength, policy violations, and PQC readiness.</p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">SANs</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {getSans(row.asset).map((san) => (
                <span key={san} className="rounded-md border border-border bg-background/40 px-2 py-1 font-mono text-[11px] text-foreground">
                  {san}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-auto border-t border-border px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {footerActions.map((action) => {
              const meta = actionMeta[action];
              const Icon = meta.icon;
              return (
                <button
                  key={action}
                  type="button"
                  onClick={() => onRunAction(action, row)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${meta.className}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {action}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
};

const ExecutionLogDrawer = ({ request, open, onClose }: { request: PolicyRequestRow | null; open: boolean; onClose: () => void }) => {
  if (!open || !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" className="flex-1 bg-background/60" onClick={onClose} aria-label="Close execution log" />
      <aside className="w-[480px] border-l border-border bg-card shadow-2xl animate-slide-in-right">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{request.id}</p>
            <div className="mt-1 flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">Execution Log</h3>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${actionBadgeClass(request.action)}`}>{request.action}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">
            Close
          </button>
        </div>

        <div className="space-y-5 px-5 py-4 text-sm">
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Certificate subject</p>
            <p className="mt-1 text-sm text-foreground">{request.subject}</p>
            <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Target CA</p>
            <p className="mt-1 text-sm text-foreground">{request.targetCA}</p>
          </div>

          <div className="space-y-4">
            {request.stages.map((stage, index) => (
              <div key={stage.label} className="relative pl-8">
                {index < request.stages.length - 1 && <div className="absolute left-[10px] top-6 h-[calc(100%+0.5rem)] w-px bg-border" />}
                <div className={`absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full border ${stage.status === 'done' ? 'border-teal bg-teal/10 text-teal' : stage.status === 'active' ? 'border-amber bg-amber/10 text-amber' : stage.status === 'failed' ? 'border-coral bg-coral/10 text-coral' : 'border-border bg-muted text-muted-foreground'}`}>
                  {stage.status === 'done' ? <CheckCircle2 className="h-3 w-3" /> : stage.status === 'failed' ? <XCircle className="h-3 w-3" /> : <CircleDot className="h-3 w-3" />}
                </div>
                <div className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{stage.label}</p>
                    <p className="text-[11px] text-muted-foreground">{stage.timestamp}</p>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {stage.details.map((detail) => (
                      <div key={`${stage.label}-${detail.label}`} className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">{detail.label}</span>
                        <span className="text-right text-foreground">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                  {stage.error && <div className="mt-3 rounded-md border border-coral/20 bg-coral/5 p-2 text-xs text-coral">{stage.error}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => toast.info(`Retry queued for ${request.id}`)} className="rounded-md border border-coral/30 px-3 py-2 text-xs font-medium text-coral hover:bg-coral/10">
              Retry
            </button>
            {request.status === 'Completed' && (
              <button type="button" onClick={() => toast.success(`Opening certificate for ${request.subject}`)} className="rounded-md bg-teal px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">
                View Certificate
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

const OverflowMenu = ({ row, onAction, onPush }: { row: ClmIssueRow; onAction: (action: ClmIssueAction, row: ClmIssueRow) => void; onPush: (row: ClmIssueRow) => void }) => {
  const [open, setOpen] = useState(false);
  const actions = row.menuActions;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close action menu" />
          <div className="absolute right-0 top-8 z-50 min-w-[220px] rounded-lg border border-border bg-card p-1 shadow-xl">
            {actions.map((action) => {
              const Icon = actionMeta[action].icon;
              return (
                <button
                  key={action}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onAction(action, row);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-foreground hover:bg-secondary"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {action}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onPush(row);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-foreground hover:bg-secondary"
            >
              <Upload className="h-3.5 w-3.5 text-muted-foreground" />
              Push to Device
            </button>
          </div>
        </>
      )}
    </div>
  );
};

function InfoTile({ label, value, mono, emphasis }: { label: string; value: string; mono?: boolean; emphasis?: 'coral' | 'teal' }) {
  return (
    <div className="rounded-lg border border-border bg-background/30 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm ${mono ? 'font-mono' : ''} ${emphasis === 'coral' ? 'text-coral font-semibold' : emphasis === 'teal' ? 'text-teal font-semibold' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}

function BulkActionBar({
  selectedCount,
  onAction,
}: {
  selectedCount: number;
  onAction: (label: 'Renew' | 'Revoke' | 'CA Switch' | 'Export' | 'Assign Owner') => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 animate-in slide-in-from-bottom-4 duration-200">
      <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-2xl">
        <span className="text-sm font-medium text-foreground">{selectedCount} selected</span>
        {(['Renew', 'Revoke', 'CA Switch', 'Export', 'Assign Owner'] as const).map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => onAction(action)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${action === 'Renew' ? 'bg-teal text-primary-foreground hover:bg-teal-light' : action === 'Revoke' ? 'bg-coral/10 text-coral hover:bg-coral/20' : action === 'CA Switch' ? 'bg-amber/10 text-amber hover:bg-amber/20' : 'bg-muted text-foreground hover:bg-secondary'}`}
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}

function SSLCheckerDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [hostname, setHostname] = useState(sslCheckMock.hostname);
  const [port, setPort] = useState(String(sslCheckMock.port));
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(true);

  const runCheck = () => {
    setLoading(true);
    setHasRun(false);
    window.setTimeout(() => {
      setLoading(false);
      setHasRun(true);
    }, 1500);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" className="flex-1 bg-background/60" onClick={onClose} aria-label="Close SSL checker" />
      <aside className="w-[480px] border-l border-border bg-card shadow-2xl animate-slide-in-right">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Certificate Actions</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">SSL Checker</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">
            Close
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-[1fr_100px_auto] gap-2">
            <Input value={hostname} onChange={(event) => setHostname(event.target.value)} placeholder="Hostname" />
            <Input value={port} onChange={(event) => setPort(event.target.value)} placeholder="Port" />
            <button type="button" onClick={runCheck} className="rounded-md bg-teal px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">
              Run Check
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ) : hasRun ? (
            <div className="space-y-4">
              <div className="space-y-3">
                {sslCheckMock.chain.map((item) => (
                  <div key={item.role} className="rounded-lg border border-border bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.role}</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{item.cn}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${item.daysRemaining < 30 ? 'bg-coral/10 text-coral' : 'bg-teal/10 text-teal'}`}>
                        {item.daysRemaining} days
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Issuer</p>
                        <p className="text-foreground">{item.issuer}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Serial</p>
                        <p className="font-mono text-foreground">{item.serial}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valid From</p>
                        <p className="font-mono text-foreground">{item.validFrom}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valid To</p>
                        <p className="font-mono text-foreground">{item.validTo}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-background/40 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Algorithm + Key Size</p>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${/SHA-1|1024/.test(`${sslCheckMock.algorithm} ${sslCheckMock.keySize}`) ? 'bg-coral/10 text-coral' : 'bg-teal/10 text-teal'}`}>
                    {sslCheckMock.algorithm} · {sslCheckMock.keySize}
                  </span>
                </div>
                <div className="rounded-lg border border-border bg-background/40 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">TLS Version</p>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${sslCheckMock.tlsVersion === 'TLS 1.3' ? 'bg-teal/10 text-teal' : sslCheckMock.tlsVersion === 'TLS 1.2' ? 'bg-amber/10 text-amber' : 'bg-coral/10 text-coral'}`}>
                    {sslCheckMock.tlsVersion}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Vulnerability Flags</p>
                  <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-medium text-teal">CRS {sslCheckMock.crsScore}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sslCheckMock.vulnerabilities.map((item) => (
                    <span key={item.label} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${item.vulnerable ? 'bg-coral/10 text-coral' : 'bg-teal/10 text-teal'}`}>
                      {item.label} · {item.vulnerable ? 'Vulnerable' : 'Clear'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <div className="border-t border-border px-5 py-4">
          <button type="button" onClick={() => toast.success('Certificate added to inventory.')} className="rounded-md border border-teal/30 px-3 py-2 text-xs font-medium text-teal hover:bg-teal/10">
            Add to Inventory
          </button>
        </div>
      </aside>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <FormField label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </FormField>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background/30 px-3 py-2">
      <Label>{label}</Label>
      <button type="button" onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-teal' : 'bg-muted'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export default function CLMRemediationWorkspace({ activeTab, onTabChange }: Props) {
  const [issueFilter, setIssueFilter] = useState<ClmIssueFilter>('all');
  const [issueSearch, setIssueSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailRow, setDetailRow] = useState<ClmIssueRow | null>(null);
  const [actionRow, setActionRow] = useState<ClmIssueRow | null>(null);
  const [actionType, setActionType] = useState<ClmIssueAction | null>(null);
  const [assignOwnerValue, setAssignOwnerValue] = useState(ownerOptions[0]);
  const [policyRequests, setPolicyRequests] = useState<PolicyRequestRow[]>(policyRequestsSeed);
  const [queueSearch, setQueueSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('All');
  const [logRequest, setLogRequest] = useState<PolicyRequestRow | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [csrOpen, setCsrOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const [sslDrawerOpen, setSslDrawerOpen] = useState(false);
  const [pushSeedRow, setPushSeedRow] = useState<ClmIssueRow | null>(null);

  const issueCounts = useMemo(() => getIssueCounts(), []);

  const filteredIssues = useMemo(() => {
    return clmIssues.filter((row) => {
      const matchesFilter = issueFilter === 'all' || row.issueCategory === issueFilter;
      const query = issueSearch.toLowerCase();
      const matchesSearch = !query || [row.asset.name, row.issueText, row.recommended, row.owner].some((value) => value.toLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    });
  }, [issueFilter, issueSearch]);

  const queueRows = useMemo(() => {
    return policyRequests.filter((row) => {
      const matchesStatus = queueFilter === 'All' || row.status === queueFilter;
      const query = queueSearch.toLowerCase();
      const matchesSearch = !query || [row.id, row.certificateTarget, row.requestedBy, row.subject].some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [policyRequests, queueFilter, queueSearch]);

  const allVisibleSelected = filteredIssues.length > 0 && filteredIssues.every((row) => selectedIds.has(row.id));

  const selectedRows = filteredIssues.filter((row) => selectedIds.has(row.id));

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredIssues.map((row) => row.id)));
  };

  const handleSelectRow = (rowId: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const handleAction = (action: ClmIssueAction, row: ClmIssueRow) => {
    setActionType(action);
    setActionRow(row);
  };

  const submitAction = () => {
    if (!actionType || !actionRow) return;
    toast.success(`${actionType} queued for ${actionRow.asset.name}`);
    setActionType(null);
    setActionRow(null);
  };

  const handleBulkAction = (label: 'Renew' | 'Revoke' | 'CA Switch' | 'Export' | 'Assign Owner') => {
    if (label === 'Assign Owner') {
      toast.success(`Owner assignment queued for ${selectedRows.length} certificates.`);
    } else if (label === 'Export') {
      toast.success(`Exported ${selectedRows.length} certificates.`);
    } else {
      toast.success(`${label} queued for ${selectedRows.length} certificates.`);
    }
    setSelectedIds(new Set());
  };

  const launchIssueNewCertificate = () => {
    onTabChange('actions');
    setEnrollOpen(true);
  };

  const launchPushToDevice = (row?: ClmIssueRow) => {
    if (row) setPushSeedRow(row);
    onTabChange('actions');
    setPushOpen(true);
  };

  const addPolicyRequest = (request: PolicyRequestRow) => {
    setPolicyRequests((current) => [request, ...current]);
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center rounded-lg border border-border bg-muted p-1">
        {([
          { id: 'issues', label: 'Issues' },
          { id: 'deployments', label: 'Deployments' },
          { id: 'actions', label: 'Certificate Actions' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Lock className="h-5 w-5 text-teal" />
                Certificates (CLM)
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">{formatCount(clmIssues.length)} items need attention</p>
            </div>
            <button type="button" onClick={launchIssueNewCertificate} className="inline-flex items-center gap-2 self-start rounded-lg bg-teal px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">
              <FilePlus className="h-4 w-4" />
              + Issue New Certificate
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {clmIssueFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => { setIssueFilter(filter.id); setSelectedIds(new Set()); }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${issueFilter === filter.id ? 'border-teal/30 bg-teal/10 text-teal' : 'border-transparent bg-muted text-muted-foreground hover:border-border hover:text-foreground'}`}
              >
                {filter.label} ({issueCounts[filter.id]})
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={issueSearch} onChange={(event) => setIssueSearch(event.target.value)} placeholder="Search certificates or issues" className="pl-8" />
            </div>
            <button type="button" onClick={() => toast.success('Issue export generated.')} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary">
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-sm">
                <thead className="border-b border-border bg-background/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3">
                      <input type="checkbox" checked={allVisibleSelected} onChange={handleSelectAll} className="rounded border-border bg-background" />
                    </th>
                    <th className="px-3 py-3">Severity</th>
                    <th className="px-3 py-3">Asset</th>
                    <th className="px-3 py-3">Issue</th>
                    <th className="px-3 py-3">Owner</th>
                    <th className="px-3 py-3">Env</th>
                    <th className="px-3 py-3">Recommended</th>
                    <th className="px-3 py-3">Action</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.map((row) => {
                    const PrimaryIcon = actionMeta[row.primaryAction].icon;
                    return (
                      <tr key={row.id} className="border-b border-border last:border-b-0 hover:bg-background/30">
                        <td className="px-3 py-3 align-top">
                          <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => handleSelectRow(row.id)} className="rounded border-border bg-background" />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${severityBadgeClass(row.severity)}`}>{row.severity}</span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <button type="button" onClick={() => setDetailRow(row)} className="font-mono text-xs text-foreground hover:text-teal hover:underline">
                            {row.asset.name}
                          </button>
                        </td>
                        <td className="px-3 py-3 align-top text-sm text-foreground">{row.issueText}</td>
                        <td className="px-3 py-3 align-top text-sm text-muted-foreground">{row.owner}</td>
                        <td className="px-3 py-3 align-top">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${environmentBadgeClass(row.environment)}`}>{row.environment}</span>
                        </td>
                        <td className="px-3 py-3 align-top text-sm text-muted-foreground">{row.recommended}</td>
                        <td className="px-3 py-3 align-top">
                          <button type="button" onClick={() => handleAction(row.primaryAction, row)} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${actionMeta[row.primaryAction].className}`}>
                            <PrimaryIcon className="h-3.5 w-3.5" />
                            {row.primaryAction}
                          </button>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <OverflowMenu row={row} onAction={handleAction} onPush={launchPushToDevice} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredIssues.length === 0 && <div className="px-4 py-10 text-center text-sm text-muted-foreground">No issues match the current filters.</div>}
          </div>
        </div>
      )}

      {activeTab === 'deployments' && <CertDeploymentsView />}

      {activeTab === 'actions' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(320px,32%)_minmax(0,68%)]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              {proactiveCards.map((card) => {
                const Icon = card.icon;
                const openCard = () => {
                  if (card.id === 'enroll') setEnrollOpen(true);
                  if (card.id === 'push') launchPushToDevice();
                  if (card.id === 'csr') setCsrOpen(true);
                  if (card.id === 'ssl') setSslDrawerOpen(true);
                };
                return (
                  <Card key={card.id} className="border-border bg-card shadow-none">
                    <CardHeader className="space-y-3 p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal/10 text-teal">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold text-foreground">{card.title}</CardTitle>
                        <CardDescription className="mt-1 text-sm text-muted-foreground">{card.description}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <button type="button" onClick={openCard} className="inline-flex items-center gap-2 rounded-md bg-teal px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">
                        {card.cta}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="rounded-lg border border-border border-l-4 border-l-teal bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10 text-teal">
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Issue-driven actions</p>
                  <p className="mt-1 text-sm text-muted-foreground">Renew, Regenerate, Reissue, Revoke, CA Switch, and Revocation Check are available directly on each certificate row in the Issues tab.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Policy Requests</h2>
              </div>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="relative w-full lg:w-64">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={queueSearch} onChange={(event) => setQueueSearch(event.target.value)} placeholder="Search policy requests" className="pl-8" />
                </div>
                <select value={queueFilter} onChange={(event) => setQueueFilter(event.target.value as QueueFilter)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                  {queueStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-border bg-background/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Request ID</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Certificate / Target</th>
                    <th className="px-4 py-3">Requested By</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {queueRows.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-b-0 hover:bg-background/30">
                      <td className="px-4 py-3 align-top">
                        <button type="button" onClick={() => setLogRequest(row)} className="inline-flex items-center gap-1 font-mono text-xs text-foreground hover:text-teal hover:underline">
                          {row.id}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </td>
                      <td className="px-4 py-3 align-top"><span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${actionBadgeClass(row.action)}`}>{row.action}</span></td>
                      <td className="px-4 py-3 align-top text-sm text-foreground">{row.certificateTarget}</td>
                      <td className="px-4 py-3 align-top text-sm text-muted-foreground">{row.requestedBy}</td>
                      <td className="px-4 py-3 align-top text-sm text-muted-foreground">{row.created}</td>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${requestStatusClass(row.status)}`}>
                          {row.status === 'In Progress' && <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />}
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {queueRows.length === 0 && <div className="px-4 py-10 text-center text-sm text-muted-foreground">No policy requests match the current filter.</div>}
          </div>
        </div>
      )}

      <BulkActionBar selectedCount={selectedIds.size} onAction={handleBulkAction} />

      <DetailDrawer row={detailRow} open={!!detailRow} onClose={() => setDetailRow(null)} onRunAction={handleAction} />
      <ExecutionLogDrawer request={logRequest} open={!!logRequest} onClose={() => setLogRequest(null)} />
      <EnrollCertificateWizard open={enrollOpen} onClose={() => setEnrollOpen(false)} onSubmit={addPolicyRequest} />
      <GenerateCSRModal open={csrOpen} onClose={() => setCsrOpen(false)} onSubmit={addPolicyRequest} />
      <PushToDeviceModal open={pushOpen} onClose={() => { setPushOpen(false); setPushSeedRow(null); }} initialCertificateId={pushSeedRow?.assetId} />
      <SSLCheckerDrawer open={sslDrawerOpen} onClose={() => setSslDrawerOpen(false)} />

      <Modal open={!!actionType && !!actionRow} onClose={() => { setActionType(null); setActionRow(null); }} title={actionType ? `${actionType} Certificate` : 'Certificate Action'}>
        {actionType && actionRow && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-background/40 p-3 text-sm">
              <p className="font-medium text-foreground">{actionRow.asset.name}</p>
              <p className="mt-1 text-muted-foreground">{actionRow.issueText}</p>
            </div>

            {actionType === 'Revocation Check - OCSP' ? (
              <div className="rounded-lg border border-border bg-background/40 p-3 text-sm text-muted-foreground">
                Run an OCSP check against <span className="font-mono text-foreground">{actionRow.asset.serial}</span> and queue the certificate for validation.
              </div>
            ) : actionType === 'CA Switch' ? (
              <FormSelect label="Target CA" value={assignOwnerValue} onChange={setAssignOwnerValue} options={caList} />
            ) : actionType === 'Migrate' ? (
              <FormSelect label="Target algorithm" value={assignOwnerValue} onChange={setAssignOwnerValue} options={['ML-DSA-65', 'Hybrid RSA + ML-DSA', 'ML-KEM-768']} />
            ) : actionType === 'Revoke' ? (
              <FormField label="Revocation reason">
                <Textarea defaultValue="Certificate is no longer trusted and must be revoked." className="min-h-[100px]" />
              </FormField>
            ) : (
              <FormSelect label="Assign owner" value={assignOwnerValue} onChange={setAssignOwnerValue} options={ownerOptions} />
            )}

            <div className="flex justify-end border-t border-border pt-4">
              <button type="button" onClick={submitAction} className="rounded-md bg-teal px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-teal-light">
                Submit
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
