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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import EnrollCertificateWizard from './actions/EnrollCertificateWizard';
import GenerateCSRModal from './actions/GenerateCSRModal';
import PushToDeviceModal from './actions/PushToDeviceModal';
import { clmCertificates, clmIssues, policyRequestsSeed, sslCheckMock } from './mockData';
import { ClmIssueAction, ClmIssueRow, ClmTab, PolicyActionType, PolicyRequestRow } from './types';

interface Props {
  activeTab: ClmTab;
  onTabChange: (tab: ClmTab) => void;
}

type EnvironmentFilter = 'All' | 'Production' | 'Staging' | 'Development';
type QueueFilter = 'All' | 'Pending' | 'In Progress' | 'Completed' | 'Failed';
type ValidityUnit = 'Days' | 'Months' | 'Years';
type IssueQuickFilter = 'expiringSoon' | 'production' | 'highSeverity' | 'unassigned';

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

const formatCount = (value: number) => new Intl.NumberFormat('en-US').format(value);

const quickFilters: Array<{ id: IssueQuickFilter; label: string }> = [
  { id: 'expiringSoon', label: 'Expiring < 7 days' },
  { id: 'production', label: 'Production' },
  { id: 'highSeverity', label: 'High severity' },
  { id: 'unassigned', label: 'Unassigned owner' },
];

const getUrgencyDays = (row: ClmIssueRow) => {
  if (row.issueType !== 'Expiring / Expired') return null;
  return Math.max(0, row.asset.daysToExpiry);
};

const urgencyBadgeClass = (days: number) => {
  if (days <= 3) return 'bg-coral/10 text-coral';
  if (days <= 7) return 'bg-amber/10 text-amber';
  return 'bg-muted text-muted-foreground';
};

// ── Issues table v2 helpers ──
type DenseFilter = 'all' | 'expired' | 'critical' | 'weak' | 'unassigned';

const expiryCellClass = (row: ClmIssueRow) => {
  if (row.asset.status === 'Expired' || row.asset.daysToExpiry < 0) return 'text-coral';
  if (row.asset.daysToExpiry === 0) return 'text-coral';
  if (row.asset.daysToExpiry <= 7) return 'text-amber';
  if (row.asset.daysToExpiry <= 30) return 'text-amber';
  return 'text-teal';
};

const expiryCellLabel = (row: ClmIssueRow) => {
  if (row.asset.status === 'Expired' || row.asset.daysToExpiry < 0) return 'Expired';
  if (row.asset.daysToExpiry === 0) return 'Today';
  return `${row.asset.daysToExpiry}d`;
};

const isWeakAlgo = (row: ClmIssueRow) =>
  /SHA-1|MD5|1024/i.test(`${row.asset.algorithm} ${row.asset.keyLength}`);

const isStrongAlgo = (row: ClmIssueRow) =>
  /ECC|ECDSA|Ed25519|ML-DSA|ML-KEM|4096/i.test(`${row.asset.algorithm} ${row.asset.keyLength}`);

const algoChipClass = (row: ClmIssueRow) => {
  if (isWeakAlgo(row)) return 'bg-amber/10 text-amber border border-amber/20';
  if (isStrongAlgo(row)) return 'bg-teal/10 text-teal border border-teal/20';
  return 'bg-muted text-foreground border border-border';
};

const keySizeClass = (row: ClmIssueRow) => {
  if (/1024/.test(row.asset.keyLength)) return 'text-amber';
  if (/4096|384|521/.test(row.asset.keyLength)) return 'text-teal';
  return 'text-muted-foreground';
};

const crsBarFill = (score: number) => {
  if (score >= 80) return 'bg-coral';
  if (score >= 60) return 'bg-amber';
  return 'bg-teal';
};

const crsTextClass = (score: number) => {
  if (score >= 80) return 'text-coral';
  if (score >= 60) return 'text-amber';
  return 'text-teal';
};

const isUnassigned = (row: ClmIssueRow) =>
  /unassigned|unknown|none|n\/a/i.test(row.owner);

const getRecommendationMeta = (row: ClmIssueRow) => {
  const recommended = row.recommended;

  if (recommended.includes('Renew')) {
    return {
      label: 'Renew from CA',
      tooltip: 'Reissue the certificate through the current CA workflow.',
      className: 'bg-teal text-primary-foreground hover:bg-teal-light',
      action: 'Renew' as ClmIssueAction,
    };
  }

  if (recommended.includes('Revoke') || recommended.includes('Reissue')) {
    return {
      label: 'Revoke & Reissue',
      tooltip: 'Revoke the current certificate and issue a clean replacement.',
      className: 'bg-coral/10 text-coral hover:bg-coral/20',
      action: 'Reissue' as ClmIssueAction,
    };
  }

  if (recommended.includes('CA Switch')) {
    return {
      label: 'CA Switch',
      tooltip: 'Move issuance to a different CA profile for policy alignment.',
      className: 'bg-amber/10 text-amber hover:bg-amber/20',
      action: 'CA Switch' as ClmIssueAction,
    };
  }

  return {
    label: recommended,
    tooltip: 'Start the recommended remediation workflow for this certificate.',
    className: 'bg-muted text-foreground hover:bg-secondary',
    action: row.primaryAction,
  };
};

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
            <p className="mt-2 text-xs text-muted-foreground">Recommended path: {row.recommended}</p>
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
            <InfoTile label="Owner" value={row.owner} />
            <InfoTile label="Environment" value={row.environment} />
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

          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">History</p>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${severityBadgeClass(row.severity)}`}>{row.severity}</span>
            </div>
            <div className="mt-3 space-y-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Discovered</span>
                <span className="text-right text-foreground">Discovery scan flagged this certificate for {row.issueType.toLowerCase()}.</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Ownership</span>
                <span className="text-right text-foreground">Current owner: {row.owner}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Recommended next step</span>
                <span className="text-right text-foreground">{row.recommended}</span>
              </div>
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
  onAction: (label: 'Renew' | 'Revoke & Reissue' | 'Export' | 'Assign Owner') => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-30 -mb-2 animate-in slide-in-from-top-2 duration-200 px-5">
      <div className="flex items-center gap-2 overflow-x-auto rounded-lg border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
        <span className="whitespace-nowrap text-sm font-medium text-foreground">{selectedCount} items selected</span>
        {(['Renew', 'Revoke & Reissue', 'Assign Owner', 'Export'] as const).map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => onAction(action)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${action === 'Renew' ? 'bg-teal text-primary-foreground hover:bg-teal-light' : action === 'Revoke & Reissue' ? 'bg-coral/10 text-coral hover:bg-coral/20' : 'bg-muted text-foreground hover:bg-secondary'}`}
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
  const [issueSearch, setIssueSearch] = useState('');
  const [denseFilter, setDenseFilter] = useState<DenseFilter>('all');
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

  const matchesDenseFilter = (row: ClmIssueRow, filter: DenseFilter) => {
    if (filter === 'all') return true;
    if (filter === 'expired')
      return row.asset.status === 'Expired' || row.asset.daysToExpiry <= 0;
    if (filter === 'critical') return row.severity === 'Critical';
    if (filter === 'weak') return isWeakAlgo(row);
    if (filter === 'unassigned') return isUnassigned(row);
    return true;
  };

  const filterCounts = useMemo(() => {
    const total = clmIssues.length;
    return {
      all: total,
      expired: clmIssues.filter((r) => matchesDenseFilter(r, 'expired')).length,
      critical: clmIssues.filter((r) => matchesDenseFilter(r, 'critical')).length,
      weak: clmIssues.filter((r) => matchesDenseFilter(r, 'weak')).length,
      unassigned: clmIssues.filter((r) => matchesDenseFilter(r, 'unassigned')).length,
    };
  }, []);

  const filteredIssues = useMemo(() => {
    return [...clmIssues]
      .filter((row) => {
        const query = issueSearch.toLowerCase();
        const matchesSearch =
          !query ||
          [row.asset.name, row.issueText, row.recommended, row.owner, row.asset.caIssuer, row.asset.algorithm]
            .some((value) => value.toLowerCase().includes(query));
        if (!matchesSearch) return false;
        return matchesDenseFilter(row, denseFilter);
      })
      .sort((a, b) => {
        const aDays = getUrgencyDays(a);
        const bDays = getUrgencyDays(b);
        if (aDays !== null && bDays !== null) return aDays - bDays;
        if (aDays !== null) return -1;
        if (bDays !== null) return 1;
        return a.asset.daysToExpiry - b.asset.daysToExpiry;
      });
  }, [issueSearch, denseFilter]);


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

  const handleBulkAction = (label: 'Renew' | 'Revoke & Reissue' | 'Export' | 'Assign Owner') => {
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
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-teal" />
          <h1 className="text-lg font-semibold text-foreground">Certificates (CLM)</h1>
        </div>
      </div>

      <div className="flex items-center border-b border-border px-6">
        {([
          { id: 'issues', label: 'Issues' },
          { id: 'deployments', label: 'Deployments' },
          { id: 'actions', label: 'Certificate Actions' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? '-mb-px border-b-2 border-teal text-teal' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'issues' && (
          <div>
            {/* Top action strip + inline bulk bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2 rounded-md border border-teal/30 bg-teal/5 px-2.5 py-1">
                    <span className="text-[11px] text-teal">{selectedIds.size} selected</span>
                    <button type="button" onClick={() => handleBulkAction('Renew')}
                      className="rounded border border-teal/30 px-2 py-0.5 text-[10px] text-teal hover:bg-teal/10">
                      Reissue
                    </button>
                    <button type="button" onClick={() => handleBulkAction('Renew')}
                      className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground/40">
                      Regenerate
                    </button>
                    <button type="button" onClick={() => launchPushToDevice()}
                      className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground/40">
                      Push to Device
                    </button>
                    <button type="button" onClick={() => handleBulkAction('Revoke & Reissue')}
                      className="rounded border border-coral/30 px-2 py-0.5 text-[10px] text-coral hover:bg-coral/10">
                      Revoke
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => { onTabChange('actions'); setEnrollOpen(true); }}
                  className="inline-flex items-center gap-1 rounded-md border border-teal/40 bg-teal/10 px-2.5 py-1 text-[11px] font-medium text-teal hover:bg-teal/20">
                  <FilePlus className="h-3 w-3" /> Enroll Certificate
                </button>
                <button type="button" onClick={() => { onTabChange('actions'); setCsrOpen(true); }}
                  className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/40">
                  Generate CSR
                </button>
                <button type="button" onClick={() => launchPushToDevice()}
                  className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/40">
                  Push to Device
                </button>
                <button type="button" onClick={() => { onTabChange('actions'); setSslDrawerOpen(true); }}
                  className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/40">
                  SSL Check
                </button>
                <button type="button" onClick={() => toast.success('Issue export generated.')}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/40">
                  <Download className="h-3 w-3" /> Export
                </button>
              </div>
            </div>

            {/* Toolbar: search + filter pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-2.5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex w-64 items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5 focus-within:border-teal/50">
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    type="text"
                    value={issueSearch}
                    onChange={(event) => setIssueSearch(event.target.value)}
                    placeholder="Search assets, CA, algorithm..."
                    className="w-full bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {([
                    { id: 'all', label: 'All', count: filterCounts.all },
                    { id: 'expired', label: 'Expired', count: filterCounts.expired },
                    { id: 'critical', label: 'Critical', count: filterCounts.critical },
                    { id: 'weak', label: 'Weak Algo', count: filterCounts.weak },
                    { id: 'unassigned', label: 'Unassigned', count: filterCounts.unassigned },
                  ] as Array<{ id: DenseFilter; label: string; count: number }>).map((pill) => {
                    const active = denseFilter === pill.id;
                    return (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => setDenseFilter(pill.id)}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] transition-colors ${active
                          ? 'border-teal/30 bg-teal/10 text-teal'
                          : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                      >
                        {pill.label}
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${active ? 'bg-teal/20 text-teal' : 'bg-muted text-muted-foreground'}`}>
                          {pill.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dense table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-[11px]">
                <thead className="border-b border-border text-left text-[9px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 w-8">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={handleSelectAll}
                        className="h-3 w-3 cursor-pointer accent-teal"
                      />
                    </th>
                    <th className="px-2 py-2.5">Asset</th>
                    <th className="px-2 py-2.5">Expiry</th>
                    <th className="px-2 py-2.5">Algorithm</th>
                    <th className="px-2 py-2.5">Key Size</th>
                    <th className="px-2 py-2.5">Issuer / CA</th>
                    <th className="px-2 py-2.5">Issue</th>
                    <th className="px-2 py-2.5">CRS</th>
                    <th className="px-2 py-2.5">Env</th>
                    <th className="px-2 py-2.5">Severity</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.map((row) => {
                    const PrimaryIcon = actionMeta[row.primaryAction].icon;
                    const recommendation = getRecommendationMeta(row);
                    const crs = deriveCRS(row);
                    const isExpired = row.asset.status === 'Expired' || row.asset.daysToExpiry < 0;
                    const caType = /Internal|MSCA|Citadel|SSH CA|Vault|HSM/i.test(row.asset.caIssuer)
                      ? 'Private CA'
                      : 'Public CA';
                    const isRenew = recommendation.action === 'Renew';
                    return (
                      <tr
                        key={row.id}
                        className={`cursor-pointer border-b border-border/40 hover:bg-muted/30 ${selectedIds.has(row.id) ? 'bg-teal/5' : ''}`}
                        onClick={() => setDetailRow(row)}
                      >
                        <td className="px-4 py-2 align-middle" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => handleSelectRow(row.id)}
                            className="h-3 w-3 cursor-pointer accent-teal"
                          />
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <span className="font-mono text-[11px] text-foreground">{row.asset.name}</span>
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <span className={`text-[11px] font-semibold ${expiryCellClass(row)}`}>
                            {expiryCellLabel(row)}
                          </span>
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-mono ${algoChipClass(row)}`}>
                            {row.asset.algorithm}
                          </span>
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <span className={`text-[10px] ${keySizeClass(row)}`}>{row.asset.keyLength}</span>
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <div className="max-w-[140px]">
                            <div className="truncate text-[10.5px] text-muted-foreground" title={row.asset.caIssuer}>
                              {row.asset.caIssuer}
                            </div>
                            <div className="text-[9px] text-muted-foreground/60">{caType}</div>
                          </div>
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <span className="block max-w-[180px] truncate text-[10px] text-muted-foreground" title={row.issueText}>
                            {row.issueText}
                          </span>
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[11px] font-semibold ${crsTextClass(crs)}`}>{crs}</span>
                            <span className="inline-block h-[3px] w-9 overflow-hidden rounded-full bg-muted">
                              <span
                                className={`block h-full rounded-full ${crsBarFill(crs)}`}
                                style={{ width: `${crs}%` }}
                              />
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-medium ${environmentBadgeClass(row.environment)}`}>
                            {row.environment === 'Production' ? 'Prod' : row.environment === 'Staging' ? 'Stage' : 'Dev'}
                          </span>
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${severityBadgeClass(row.severity)}`}>
                            {row.severity}
                          </span>
                        </td>
                        <td className="px-4 py-2 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAction(recommendation.action, row)}
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${isRenew || isExpired
                                ? 'border-teal/40 bg-teal/10 text-teal hover:bg-teal/20'
                                : 'border-amber/40 bg-amber/10 text-amber hover:bg-amber/20'}`}
                              title={recommendation.tooltip}
                            >
                              <PrimaryIcon className="h-3 w-3" />
                              {recommendation.label}
                            </button>
                            <OverflowMenu row={row} onAction={handleAction} onPush={launchPushToDevice} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredIssues.length === 0 && (
                <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">
                  No certificates match your filter.
                </div>
              )}
            </div>

            {/* Footer summary */}
            <div className="flex items-center justify-between border-t border-border px-6 py-2">
              <span className="text-[10px] text-muted-foreground">
                Showing {filteredIssues.length} of {clmIssues.length} issues
                {filterCounts.expired > 0 && ` — ${filterCounts.expired} expired`}
                {filterCounts.weak > 0 && `, ${filterCounts.weak} weak algo`}
              </span>
            </div>
          </div>
        )}

        {activeTab === 'deployments' && <CertDeploymentsView />}

        {activeTab === 'actions' && (
          <div className="grid items-start gap-4 p-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
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
                      <CardHeader className="space-y-2 p-4 pb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold leading-tight text-foreground">{card.title}</CardTitle>
                          <CardDescription className="mt-1 min-h-[2.75rem] text-sm leading-6 text-muted-foreground">{card.description}</CardDescription>
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
    </div>
  );
}
