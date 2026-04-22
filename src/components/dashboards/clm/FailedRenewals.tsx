import React, { useState } from 'react';
import { ChevronDown, RefreshCw, RotateCcw } from 'lucide-react';
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
  const [renewOpenRow, setRenewOpenRow] = useState<number | null>(null);
  const [revokeOpenRow, setRevokeOpenRow] = useState<number | null>(null);
  const [renewCa, setRenewCa] = useState<Record<number, string>>({});
  const [renewSchedule, setRenewSchedule] = useState<Record<number, string>>({});
  const [revokeReason, setRevokeReason] = useState<Record<number, string>>({});

  const closeMenus = () => {
    setRenewOpenRow(null);
    setRevokeOpenRow(null);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Failed Renewals — Last 24h</h3>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-coral/10 text-coral">
          {rows.length}
        </span>
      </div>

      <div className="overflow-x-auto">
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
            {rows.map((r, i) => {
              const isRenewOpen = renewOpenRow === i;
              const isRevokeOpen = revokeOpenRow === i;
              return (
                <tr key={i} className="relative border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="py-2 pr-2"><SeverityBadge severity={r.severity} /></td>
                  <td className="py-2 pr-2 font-mono text-foreground max-w-[180px] truncate">{r.cert}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{r.ca}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{r.reason}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{r.asset}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{r.failedAt}</td>
                  <td className="py-2 text-right">
                    <div className="relative inline-flex items-center gap-1">
                      <button
                        onClick={() => toast.success(`Retry initiated for ${r.cert}`)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20 transition-colors text-[10px] font-medium"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Retry
                      </button>

                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevokeOpenRow(null);
                            setRenewOpenRow(isRenewOpen ? null : i);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20 transition-colors text-[10px] font-medium"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Renew
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {isRenewOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-border bg-card p-3 shadow-lg"
                          >
                            <div className="space-y-2 text-left">
                              <label className="block text-[10px] text-muted-foreground">
                                <span className="mb-1 block">CA</span>
                                <select
                                  value={renewCa[i] ?? r.ca}
                                  onChange={(e) => setRenewCa((prev) => ({ ...prev, [i]: e.target.value }))}
                                  className="w-full rounded border border-border bg-secondary/30 px-2 py-1 text-[10px] text-foreground outline-none"
                                >
                                  {CA_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                                </select>
                              </label>
                              <label className="block text-[10px] text-muted-foreground">
                                <span className="mb-1 block">Schedule</span>
                                <select
                                  value={renewSchedule[i] ?? 'Immediately'}
                                  onChange={(e) => setRenewSchedule((prev) => ({ ...prev, [i]: e.target.value }))}
                                  className="w-full rounded border border-border bg-secondary/30 px-2 py-1 text-[10px] text-foreground outline-none"
                                >
                                  {SCHEDULE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                                </select>
                              </label>
                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  onClick={() => {
                                    toast.success(`Renewal submitted for ${r.cert}`);
                                    closeMenus();
                                  }}
                                  className="rounded bg-teal px-2 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90"
                                >
                                  Submit
                                </button>
                                <button
                                  onClick={closeMenus}
                                  className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary/40"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenewOpenRow(null);
                            setRevokeOpenRow(isRevokeOpen ? null : i);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-coral transition-colors hover:text-coral/80"
                        >
                          Revoke
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {isRevokeOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-border bg-card p-3 shadow-lg"
                          >
                            <div className="space-y-2 text-left">
                              <label className="block text-[10px] text-muted-foreground">
                                <span className="mb-1 block">Reason</span>
                                <select
                                  value={revokeReason[i] ?? 'Unspecified'}
                                  onChange={(e) => setRevokeReason((prev) => ({ ...prev, [i]: e.target.value }))}
                                  className="w-full rounded border border-border bg-secondary/30 px-2 py-1 text-[10px] text-foreground outline-none"
                                >
                                  {REVOKE_REASONS.map((option) => <option key={option}>{option}</option>)}
                                </select>
                              </label>
                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  onClick={() => {
                                    toast.success('Revocation submitted');
                                    closeMenus();
                                  }}
                                  className="rounded bg-coral px-2 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90"
                                >
                                  Submit
                                </button>
                                <button
                                  onClick={closeMenus}
                                  className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary/40"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
