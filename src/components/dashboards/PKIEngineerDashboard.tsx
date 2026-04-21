import React, { useState } from 'react';
import { RefreshCw, LayoutDashboard, Wrench, ShieldCheck, ChevronDown, Clock } from 'lucide-react';
import CLMKPIStrip from './clm/CLMKPIStrip';
import CAHealthStrip from './clm/CAHealthStrip';
import ExpiryCalendar from './clm/ExpiryCalendar';
import RenewalPipeline from './clm/RenewalPipeline';
import CLMActionTrend from './clm/CLMActionTrend';
import FailedRenewals from './clm/FailedRenewals';
import NonStandardCerts from './clm/NonStandardCerts';
import AlgorithmStrength from './clm/AlgorithmStrength';
import SLCCompliance from './clm/SLCCompliance';
import ScanCoverage from './clm/ScanCoverage';
import SLCDashboard from './clm/SLCDashboard';

type CLMTab = 'overview' | 'operations' | 'risk' | 'slc';

const CERT_TYPES = ['All Certificates', 'TLS / SSL', 'Code Signing', 'K8s Workload', 'SSH Certificate'];
const CA_FILTERS = ['All CAs', 'DigiCert', 'Entrust', "Let's Encrypt", 'MSCA Enterprise'];

const TABS: { id: CLMTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',    label: 'Overview',      icon: LayoutDashboard },
  { id: 'operations', label: 'Operations',     icon: Wrench },
  { id: 'risk',       label: 'Risk & Crypto',  icon: ShieldCheck },
  { id: 'slc', label: 'Short-Lived Certs', icon: Clock },
];

export default function PKIEngineerDashboard() {
  const [tab, setTab]           = useState<CLMTab>('overview');
  const [certType, setCertType] = useState('All Certificates');
  const [caFilter, setCaFilter] = useState('All CAs');

  return (
    <div className="space-y-0 max-h-[calc(100vh-120px)] flex flex-col">

      {/* Header */}
      <div className="flex items-end justify-between pt-1 pb-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Certificate Lifecycle Management
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Cert type filter */}
          <div className="relative">
            <select
              value={certType}
              onChange={e => setCertType(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal cursor-pointer"
            >
              {CERT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          {/* CA filter */}
          <div className="relative">
            <select
              value={caFilter}
              onChange={e => setCaFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal cursor-pointer"
            >
              {CA_FILTERS.map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          <span className="text-xs text-muted-foreground">Refreshed 0m ago</span>
          <button className="p-1 hover:text-foreground text-muted-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

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

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-4 pr-1">
            <CLMKPIStrip />
            <CLMActionTrend />
            <CAHealthStrip />
          </div>
        )}

        {/* OPERATIONS */}
        {tab === 'operations' && (
          <div className="space-y-4 pr-1">
            <RenewalPipeline />
            <ExpiryCalendar />
            <FailedRenewals />
          </div>
        )}

        {/* RISK & CRYPTO */}
        {tab === 'risk' && (
          <div className="space-y-4 pr-1">
            <NonStandardCerts />
            <AlgorithmStrength />
            <SLCCompliance />
            <ScanCoverage />
          </div>
        )}
        
        {/* SHORT LIVED CERTS */}
        {tab === 'slc' && <SLCDashboard />}

      </div>
    </div>
  );
}
