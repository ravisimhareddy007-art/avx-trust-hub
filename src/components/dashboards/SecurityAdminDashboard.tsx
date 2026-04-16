import React from 'react';
import { RefreshCw } from 'lucide-react';
import { DashboardProvider } from '@/context/DashboardContext';
import EnterpriseCryptoRiskScore from './EnterpriseCryptoRiskScore';
import CriticalActionFeed from './CriticalActionFeed';
import IdentityHealthBands from './IdentityHealthBands';
import QTHPostureStrip from './QTHPostureStrip';
import InfrastructurePostureStrip from './InfrastructurePostureStrip';

export default function SecurityAdminDashboard() {
  return (
    <DashboardProvider>
      <div className="space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin pr-1">
        {/* Primary page header — single entry point, no competing labels */}
        <div className="flex items-end justify-between pt-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Trust Posture & Risk Intelligence</h1>
            <p className="text-xs text-muted-foreground mt-1">High-Impact Recommendations & Active Insights</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Refreshed 0m ago</span>
            <button className="p-1 hover:text-foreground"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {/* Zone 1+2: ECRS (left) + Critical Action Feed (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 min-h-[680px]">
            <EnterpriseCryptoRiskScore />
          </div>
          <div className="lg:col-span-7 min-h-[680px]">
            <CriticalActionFeed />
          </div>
        </div>

        {/* Zone 3: QTH Posture Strip */}
        <QTHPostureStrip />

        {/* Zone 4: Identity Health Bands */}
        <IdentityHealthBands />

        {/* Zone 5 (bottom): Infrastructure Posture Bands */}
        <InfrastructurePostureStrip />
      </div>
    </DashboardProvider>
  );
}
