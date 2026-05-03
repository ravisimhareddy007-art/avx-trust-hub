import React, { useState, useEffect } from 'react';
import { RefreshCw, LayoutDashboard, Zap, AlertTriangle, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { useNav } from '@/context/NavigationContext';
import { DashboardProvider } from '@/context/DashboardContext';
import EnterpriseRiskScore from './ers/EnterpriseRiskScore';
import CriticalActionFeed from './CriticalActionFeed';
import IdentityHealthBands from './IdentityHealthBands';
import QTHPostureStrip from './QTHPostureStrip';
import InfrastructurePostureStrip from './InfrastructurePostureStrip';
import CryptoReadinessSummary from './readiness/CryptoReadinessSummary';
import AlgorithmConcentration from './readiness/AlgorithmConcentration';
import PQCMigrationPanel from './readiness/PQCMigrationPanel';

type DashTab = 'posture' | 'readiness';

const TABS: { id: DashTab; label: string; icon: React.ElementType }[] = [
  { id: 'posture',    label: 'Posture',    icon: LayoutDashboard },
  { id: 'readiness',  label: 'Readiness',  icon: Zap },
];

export default function SecurityAdminDashboard() {
  const [tab, setTab] = useState<DashTab>('posture');
  const { notifications, markRead, markAllRead } = useNotifications();
  const { setCurrentPage } = useNav();
  const escalations = notifications.filter(n => n.toPersona === 'security-admin');
  const unreadEscalations = escalations.filter(n => !n.read);

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

    </DashboardProvider>
  );
}
