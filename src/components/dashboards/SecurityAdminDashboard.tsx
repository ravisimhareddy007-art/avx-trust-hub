import React from 'react';
import { useNav } from '@/context/NavigationContext';
import { RefreshCw } from 'lucide-react';
import EnterpriseCryptoRiskScore from './EnterpriseCryptoRiskScore';
import CriticalActionFeed from './CriticalActionFeed';
import IdentityHealthBands from './IdentityHealthBands';
import AIBriefBar from './AIBriefBar';

export default function SecurityAdminDashboard() {
  const { setCurrentPage } = useNav();

  return (
    <div className="space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin pr-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Posture Overview</h1>
          <p className="text-[11px] text-muted-foreground">What needs you right now · click any item to act</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Refreshed 0m ago</span>
          <button className="p-1 hover:text-foreground"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* AI Brief — narrative, dated */}
      <AIBriefBar />

      {/* Zone 1+2: ECRS (left) + Critical Action Feed (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 min-h-[640px]">
          <EnterpriseCryptoRiskScore onScoreClick={() => setCurrentPage('inventory')} />
        </div>
        <div className="lg:col-span-7 min-h-[640px]">
          <CriticalActionFeed />
        </div>
      </div>

      {/* Zone 3: Identity Health Bands — replaces 6-widget grid */}
      <IdentityHealthBands />
    </div>
  );
}
