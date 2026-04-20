import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { useAgent } from '@/context/AgentContext';
import { Bell, Infinity as InfinityIcon, User, HelpCircle } from 'lucide-react';
import HelpDrawer from '@/components/help/HelpDrawer';

const breadcrumbMap: Record<string, string> = {
  'dashboards': '',
  'discovery': 'Discovery > Add Discovery',
  'inventory': 'Inventory > All Assets',
  'policy-builder': 'Policies > Policy Builder',
  'trustops': 'Alerts & Logs > TrustOps Center',
  'quantum': 'Policies > Quantum Posture',
  'automation': 'Automation > Workflows',
  'integrations': 'Automation > Integrations',
  'reporting': 'Administration > Reports',
  'self-service': 'Administration > Self-Service Portal',
  'user-management': 'Administration > User Management',
  'licenses': 'Administration > Licenses',
  'audit-log': 'Alerts & Logs > Audit Log',
  'remediation': 'Remediation',
  'tickets': 'Tickets',
};

export default function TopBar() {
  const { currentPage, setCurrentPage } = useNav();
  const { drawerOpen, setDrawerOpen, undoStack } = useAgent();
  const [showNotifications, setShowNotifications] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const activeUndo = undoStack.filter(u => !u.rolledBack).length;

  return (
    <div className="h-14 bg-card border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
      {/* Breadcrumb */}
      <div className="text-sm font-medium text-foreground">
        {breadcrumbMap[currentPage] || currentPage}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Single Infinity Intelligence entry point */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative border ${
            drawerOpen
              ? 'bg-teal/15 text-teal border-teal/40 shadow-[0_0_12px_-2px_hsl(var(--teal)/0.4)]'
              : 'bg-navy/40 text-foreground/80 border-border hover:border-teal/30 hover:text-teal'
          }`}
          title="Infinity Intelligence — single AI entry point"
        >
          <InfinityIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
          Infinity Intelligence
          {activeUndo > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber rounded-full text-[9px] text-background flex items-center justify-center font-bold">{activeUndo}</span>
          )}
        </button>

        {/* Help */}
        <button
          onClick={() => setHelpOpen(true)}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Help & Documentation"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-coral rounded-full text-[10px] text-primary-foreground flex items-center justify-center font-bold">5</span>
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-card border border-border rounded-lg shadow-lg z-50 p-3">
              <h4 className="text-xs font-semibold mb-2">Notifications</h4>
              {[
                { text: '*.payments.acmecorp.com expires in 6 days', page: 'remediation' },
                { text: 'vault.internal cert expires in 3 days', page: 'remediation' },
                { text: 'SSH cert k8s-node expired', page: 'remediation' },
                { text: 'Discovery run completed — 8 new assets', page: 'discovery' },
                { text: 'PQC risk assessment updated', page: 'quantum' },
              ].map((n, i) => (
                <div key={i} onClick={() => { setCurrentPage(n.page); setShowNotifications(false); }} className="py-2 border-b border-border last:border-0 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  {n.text}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-teal/20 flex items-center justify-center">
          <User className="w-4 h-4 text-teal" />
        </div>
      </div>

      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
