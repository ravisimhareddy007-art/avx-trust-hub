import React from 'react';
import { useNav } from '@/context/NavigationContext';
import { ExternalLink } from 'lucide-react';

interface CARow {
  name: string;
  status: 'Healthy' | 'Warning' | 'Error';
  issuedToday: number;
  failRate: string;
  quota: number | 'N/A';
}

const caData: CARow[] = [
  { name: 'DigiCert', status: 'Healthy', issuedToday: 42, failRate: '0.3%', quota: 84 },
  { name: 'Entrust', status: 'Healthy', issuedToday: 18, failRate: '0.1%', quota: 52 },
  { name: 'MSCA Enterprise', status: 'Warning', issuedToday: 12, failRate: '2.1%', quota: 67 },
  { name: "Let's Encrypt", status: 'Healthy', issuedToday: 89, failRate: '0.2%', quota: 'N/A' },
];

function StatusDot({ status }: { status: 'Healthy' | 'Warning' | 'Error' }) {
  const colorClasses = {
    Healthy: 'bg-emerald-500',
    Warning: 'bg-amber-500',
    Error: 'bg-coral',
  };
  return <div className={`w-2 h-2 rounded-full ${colorClasses[status]}`} />;
}

function QuotaBar({ quota }: { quota: number | 'N/A' }) {
  if (quota === 'N/A') {
    return <span className="text-xs text-muted-foreground">N/A</span>;
  }

  let barColor = 'bg-teal';
  if (quota >= 90) barColor = 'bg-coral';
  else if (quota >= 70) barColor = 'bg-amber';

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${quota}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8">{quota}%</span>
    </div>
  );
}

export default function CAHealthStrip() {
  const { setCurrentPage } = useNav();

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">CA Health</h3>
        <span className="text-xs text-muted-foreground">4 connected</span>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left py-2 font-medium">Status</th>
            <th className="text-left py-2 font-medium">CA Name</th>
            <th className="text-right py-2 font-medium">Issued Today</th>
            <th className="text-right py-2 font-medium">7-Day Fail Rate</th>
            <th className="text-left py-2 font-medium pl-4">Quota</th>
            <th className="text-right py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {caData.map((ca) => (
            <tr key={ca.name} className="border-b border-border last:border-0 hover:bg-muted/30">
              <td className="py-3">
                <StatusDot status={ca.status} />
              </td>
              <td className="py-3 text-foreground font-medium">{ca.name}</td>
              <td className="py-3 text-right text-muted-foreground">{ca.issuedToday}</td>
              <td className="py-3 text-right text-muted-foreground">{ca.failRate}</td>
              <td className="py-3 pl-4">
                <QuotaBar quota={ca.quota} />
              </td>
              <td className="py-3 text-right">
                <button
                  onClick={() => setCurrentPage('integrations')}
                  className="inline-flex items-center gap-1 text-xs text-teal hover:text-teal/80 transition-colors"
                >
                  <span>Connect</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
