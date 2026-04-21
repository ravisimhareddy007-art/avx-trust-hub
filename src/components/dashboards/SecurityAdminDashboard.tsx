import React, { useState } from 'react';
import { RefreshCw, LayoutDashboard, Wrench, Zap } from 'lucide-react';
import { DashboardProvider } from '@/context/DashboardContext';
import EnterpriseRiskScore from './ers/EnterpriseRiskScore';
import CriticalActionFeed from './CriticalActionFeed';
import IdentityHealthBands from './IdentityHealthBands';
import QTHPostureStrip from './QTHPostureStrip';
import InfrastructurePostureStrip from './InfrastructurePostureStrip';
import OperationsKPIStrip from './operations/OperationsKPIStrip';
import ExpiryForecast from './operations/ExpiryForecast';
import TriageQueue from './operations/TriageQueue';

type DashTab = 'posture' | 'operations' | 'readiness';

const TABS: { id: DashTab; label: string; icon: React.ElementType }[] = [
  { id: 'posture',    label: 'Posture',    icon: LayoutDashboard },
  { id: 'operations', label: 'Operations', icon: Wrench },
  { id: 'readiness',  label: 'Readiness',  icon: Zap },
];

export default function SecurityAdminDashboard() {
  const [tab, setTab] = useState<DashTab>('posture');

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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5 min-h-[680px]">
                  <EnterpriseRiskScore />
                </div>
                <div className="lg:col-span-7 min-h-[680px]">
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
              {/* Placeholder -- new components go here */}
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <p className="text-sm font-semibold text-foreground mb-1">
                  Readiness
                </p>
                <p className="text-xs text-muted-foreground">
                  Algorithm Concentration · Crypto Agility · PQC Migration · 
                  7-day Forecast · Hardcoded Systems
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardProvider>
  );
}
