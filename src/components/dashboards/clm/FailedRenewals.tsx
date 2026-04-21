import React from 'react';
import { RotateCcw } from 'lucide-react';
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
  { cert: 'vault.internal.acmecorp.com', ca: 'DigiCert', reason: 'DNS validation failed', asset: 'vault-server', failedAt: '4h ago', severity: 'High' },
  { cert: 'mail.acmecorp.com', ca: 'Entrust', reason: 'CSR format invalid', asset: 'mail-server', failedAt: '5h ago', severity: 'Medium' },
  { cert: 'cdn-edge-03.acmecorp.com', ca: "Let's Encrypt", reason: 'Rate limit hit', asset: 'cdn-cluster', failedAt: '6h ago', severity: 'Medium' },
  { cert: 'k8s-ingress.prod', ca: 'MSCA Enterprise', reason: 'Template not found', asset: 'eks-prod-cluster', failedAt: '8h ago', severity: 'High' },
  { cert: 'auth-gateway.acmecorp.com', ca: 'DigiCert', reason: 'Timeout after 30s', asset: 'auth-gateway-01', failedAt: '10h ago', severity: 'Critical' },
  { cert: 'api-gw-prod.acmecorp.com', ca: 'Entrust', reason: 'Policy violation: key length', asset: 'prod-gateway-01', failedAt: '12h ago', severity: 'Critical' },
];

export default function FailedRenewals() {
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
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="py-2 pr-2"><SeverityBadge severity={r.severity} /></td>
                <td className="py-2 pr-2 font-mono text-foreground max-w-[180px] truncate">{r.cert}</td>
                <td className="py-2 pr-2 text-muted-foreground">{r.ca}</td>
                <td className="py-2 pr-2 text-muted-foreground">{r.reason}</td>
                <td className="py-2 pr-2 text-muted-foreground">{r.asset}</td>
                <td className="py-2 pr-2 text-muted-foreground">{r.failedAt}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => toast.success(`Retry initiated for ${r.cert}`)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20 transition-colors text-[10px] font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Retry
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
