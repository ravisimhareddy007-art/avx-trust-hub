import React from 'react';
import { useNav } from '@/context/NavigationContext';
import { mockAssets } from '@/data/mockData';

interface KPICardProps {
  value: string;
  subtitle: string;
  color: 'teal' | 'coral' | 'amber';
  onClick: () => void;
}

function KPICard({ value, subtitle, color, onClick }: KPICardProps) {
  const colorClasses = {
    teal: 'text-teal',
    coral: 'text-coral',
    amber: 'text-amber',
  };

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-teal/50 transition-colors"
    >
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

export default function CLMKPIStrip() {
  const { setCurrentPage } = useNav();

  // Filter certificate-type assets
  const certAssets = mockAssets.filter(a => 
    a.type === 'TLS Certificate' || 
    a.type === 'Code-Signing Certificate' ||
    a.type === 'K8s Workload Cert' ||
    a.type === 'SSH Certificate'
  );

  // 1. Total Certificates
  const totalCerts = certAssets.length;

  // 2. Expiring Today (daysToExpiry === 0 or daysToExpiry < 0 and status === 'Expiring')
  const expiringToday = certAssets.filter(a => 
    a.daysToExpiry === 0 || (a.daysToExpiry < 0 && a.status === 'Expiring')
  ).length;

  // 3. Renewals In-Flight (status === 'Expiring' and autoRenewal === true)
  const renewalsInFlight = certAssets.filter(a => 
    a.status === 'Expiring' && a.autoRenewal === true
  ).length;

  // 4. Failed Last 24h (hardcoded 127)
  const failedLast24h = 127;

  // 5. Auto-Renewal Coverage
  const autoRenewalCount = certAssets.filter(a => a.autoRenewal === true).length;
  const autoRenewalPercent = Math.round((autoRenewalCount / totalCerts) * 100);
  const notCoveredCount = totalCerts - autoRenewalCount;

  return (
    <div className="grid grid-cols-5 gap-4">
      <KPICard
        value={totalCerts.toString()}
        subtitle="Total Certificates"
        color="teal"
        onClick={() => setCurrentPage('remediation')}
      />
      <KPICard
        value={expiringToday.toString()}
        subtitle="requires immediate action"
        color="coral"
        onClick={() => setCurrentPage('remediation')}
      />
      <KPICard
        value={renewalsInFlight.toString()}
        subtitle="auto-renewal active"
        color="teal"
        onClick={() => setCurrentPage('remediation')}
      />
      <KPICard
        value={failedLast24h.toString()}
        subtitle="renewal failures overnight"
        color="coral"
        onClick={() => setCurrentPage('remediation')}
      />
      <KPICard
        value={`${autoRenewalPercent}%`}
        subtitle={`${notCoveredCount} on manual`}
        color={autoRenewalPercent >= 70 ? 'teal' : 'amber'}
        onClick={() => setCurrentPage('remediation')}
      />
    </div>
  );
}
