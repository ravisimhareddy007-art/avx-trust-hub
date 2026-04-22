import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { SeverityBadge } from '@/components/shared/UIComponents';

interface FailedRow {
  cert: string;
  ca: string;
  reason: string;
  asset: string;
  failedAt: string;
  severity: string;
}

const rows: FailedRow[] = [
  { cert: 'payments-api.acmecorp.com', ca: 'DigiCert', reason: 'Auth token expired', asset: 'payments-api-prod', failedAt: '2h ago', severity: 'Critical' },
  { cert: '*.internal.acmecorp.com', ca: 'MSCA Enterprise', reason: 'CA quota exceeded', asset: 'internal-lb-01', failedAt: '3h ago', severity: 'High' },
  { cert: 'vault.internal.acmecorp.com', ca: 'AppViewX PKIaaS', reason: 'DNS validation failed', asset: 'vault-server', failedAt: '4h ago', severity: 'High' },
  { cert: 'mail.acmecorp.com', ca: 'Entrust', reason: 'CSR format invalid', asset: 'mail-server', failedAt: '5h ago', severity: 'Medium' },
  { cert: 'cdn-edge-03.acmecorp.com', ca: "Let's Encrypt", reason: 'Rate limit hit', asset: 'cdn-cluster', failedAt: '6h ago', severity: 'Medium' },
  { cert: 'k8s-ingress.prod', ca: 'MSCA Enterprise', reason: 'Template not found', asset: 'eks-prod-cluster', failedAt: '8h ago', severity: 'High' },
  { cert: 'auth-gateway.acmecorp.com', ca: 'DigiCert', reason: 'Timeout after 30s', asset: 'auth-gateway-01', failedAt: '10h ago', severity: 'Critical' },
  { cert: 'api-gw-prod.acmecorp.com', ca: 'Sectigo', reason: 'Policy violation: key length < 2048', asset: 'prod-gateway-01', failedAt: '12h ago', severity: 'Critical' },
];

const CA_OPTIONS = ['DigiCert', 'Entrust', "Let's Encrypt", 'MSCA Enterprise', 'AppViewX PKIaaS'] as const;
const SCHEDULE_OPTIONS = ['Immediately', 'Next maintenance window'] as const;
const REVOKE_REASONS = [
  'Affiliation Changed',
  'Cessation of operation',
  'Key compromise',
  'Superseded',
  'CA Compromise',
  'Privilege Withdrawn',
  'Unspecified',
] as const;

type FailedRenewalsProps = {
  openModal?: (title: string, certs: any[]) => void;
};

export default function FailedRenewals(_: FailedRenewalsProps) {
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);
  const [renewOpenRow, setRenewOpenRow] = useState<string | null>(null);
  const [revokeOpenRow, setRevokeOpenRow] = useState<string | null>(null);
  const [renewCa, setRenewCa] = useState<Record<string, string>>({});
  const [renewSchedule, setRenewSchedule] = useState<Record<string, string>>({});
  const [revokeReason, setRevokeReason] = useState<Record<string, string>>({});
  const [revokeComment, setRevokeComment] = useState<Record<string, string>>({});
  const tableRef = useRef<HTMLDivElement>(null);

  const closeMenus = () => {
    setOpenRowMenu(null);
    setRenewOpenRow(null);
    setRevokeOpenRow(null);
  };

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
        closeMenus();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Failed Renewals — Last 24h</h3>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-coral/10 text-coral">
          {rows.length}
        </span>
      </div>

      <div className="overflow-x-auto" ref={tableRef}>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-2 font-medium">Sev</th>
              <th className="text-left py-2 font-medium">Certificate</th>
              <th className="text-left py-2 font-medium">CA</th>
              <th className="text-left py-2 font-medium">Reason</th>
              <th className="text-left py-2 font-medium">Asset</th>
              <th className="text-left py-2 font-medium">Failed</th>
              <th className="text-right py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isMenuOpen = openRowMenu === r.cert;
              const isRenewOpen = renewOpenRow === r.cert;
              const isRevokeOpen = revokeOpenRow === r.cert;
              return (
                <React.Fragment key={r.cert}>
                  <tr className="relative border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-2"><SeverityBadge severity={r.severity} /></td>
                    <td className="py-2 pr-2 font-mono text-foreground max-w-[180px] truncate">{r.cert}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{r.ca}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{r.reason}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{r.asset}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{r.failedAt}</td>
                    <td className="py-2 text-right">
                      <div className="relative inline-flex">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenewOpenRow(null);
                            setRevokeOpenRow(null);
                            setOpenRowMenu(isMenuOpen ? null : r.cert);
                          }}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                        {isMenuOpen && (
                          <div className="absolute right-0 top-6 z-50 w-40 rounded-lg border border-border bg-card py-1 shadow-lg">
                            <button onClick={() => { toast.success('Retry initiated for ' + r.cert); setOpenRowMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-secondary cursor-pointer">
                              <RotateCcw className="h-3 w-3" />Retry
                            </button>
                            <button onClick={() => { setOpenRowMenu(null); setRevokeOpenRow(null); setRenewOpenRow(isRenewOpen ? null : r.cert); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-teal transition-colors hover:bg-secondary cursor-pointer">
                              <RefreshCw className="h-3 w-3" />Renew
                            </button>
                            <button onClick={() => { setOpenRowMenu(null); setRenewOpenRow(null); setRevokeOpenRow(isRevokeOpen ? null : r.cert); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-coral transition-colors hover:bg-secondary cursor-pointer">
                              <XCircle className="h-3 w-3" />Revoke
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isRenewOpen && (
                    <tr className="border-b border-border bg-secondary/10">
                      <td colSpan={7} className="px-3 py-3">
                        <div onClick={(e) => e.stopPropagation()} className="ml-auto max-w-xs space-y-3 rounded-lg border border-border bg-card p-3">
                          <label className="block text-[10px] text-muted-foreground">
                            <span className="mb-1 block">CA</span>
                            <select value={renewCa[r.cert] ?? r.ca} onChange={(e) => setRenewCa((prev) => ({ ...prev, [r.cert]: e.target.value }))} className="w-full rounded border border-border bg-secondary/30 px-2 py-1 text-[10px] text-foreground outline-none">
                              {CA_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                            </select>
                          </label>
                          <div className="space-y-1 text-[10px] text-muted-foreground">
                            <span className="block">Schedule</span>
                            {SCHEDULE_OPTIONS.map((option) => (
                              <label key={option} className="flex items-center gap-2">
                                <input type="radio" name={`renew-${r.cert}`} checked={(renewSchedule[r.cert] ?? 'Immediately') === option} onChange={() => setRenewSchedule((prev) => ({ ...prev, [r.cert]: option }))} />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { toast.success('Renewal submitted'); closeMenus(); }} className="rounded bg-teal px-2 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90">Submit</button>
                            <button onClick={closeMenus} className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary/40">Cancel</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {isRevokeOpen && (
                    <tr className="border-b border-border bg-secondary/10">
                      <td colSpan={7} className="px-3 py-3">
                        <div onClick={(e) => e.stopPropagation()} className="ml-auto max-w-xs space-y-3 rounded-lg border border-border bg-card p-3">
                          <label className="block text-[10px] text-muted-foreground">
                            <span className="mb-1 block">Reason</span>
                            <select value={revokeReason[r.cert] ?? 'Unspecified'} onChange={(e) => setRevokeReason((prev) => ({ ...prev, [r.cert]: e.target.value }))} className="w-full rounded border border-border bg-secondary/30 px-2 py-1 text-[10px] text-foreground outline-none">
                              {REVOKE_REASONS.map((option) => <option key={option}>{option}</option>)}
                            </select>
                          </label>
                          <label className="block text-[10px] text-muted-foreground">
                            <span className="mb-1 block">Comments</span>
                            <textarea rows={2} value={revokeComment[r.cert] ?? ''} onChange={(e) => setRevokeComment((prev) => ({ ...prev, [r.cert]: e.target.value }))} className="w-full rounded border border-border bg-secondary/30 px-2 py-1 text-[10px] text-foreground outline-none resize-none" />
                          </label>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { toast.success('Revocation submitted'); closeMenus(); }} className="rounded bg-coral px-2 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90">Submit</button>
                            <button onClick={closeMenus} className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary/40">Cancel</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
