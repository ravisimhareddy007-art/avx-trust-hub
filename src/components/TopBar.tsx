import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { useAgent } from '@/context/AgentContext';
import { usePersona } from '@/context/PersonaContext';
import { useNotifications } from '@/context/NotificationContext';
import { Bell, Infinity as InfinityIcon, User, HelpCircle, AlertTriangle, Shield, X } from 'lucide-react';
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

const sevColor: Record<string, string> = {
  Critical: 'text-coral', High: 'text-amber', Medium: 'text-purple', Low: 'text-teal',
};

export default function TopBar() {
  const { currentPage, setCurrentPage } = useNav();
  const { drawerOpen, setDrawerOpen, undoStack } = useAgent();
  const { persona } = usePersona();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const activeUndo = undoStack.filter(u => !u.rolledBack).length;

  // Escalation notifications relevant to current persona
  const escalationsForMe = notifications.filter(n =>
    (persona === 'security-admin' && n.toPersona === 'security-admin') ||
    (persona === 'compliance-officer' && n.fromPersona === 'compliance-officer')
  );
  const myUnread = escalationsForMe.filter(n => !n.read).length + (persona !== 'compliance-officer' ? 0 : 0);
  const totalUnread = persona === 'security-admin' ? myUnread : unreadCount;

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && myUnread > 0) {
      // mark relevant ones as read after a delay (UX: user can see them first)
    }
  };

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
        {/* Infinity Intelligence */}
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
            onClick={handleBellClick}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Bell className={`w-4 h-4 ${myUnread > 0 && persona === 'security-admin' ? 'text-coral' : 'text-muted-foreground'}`} />
            {(myUnread > 0 || (persona !== 'security-admin' && totalUnread > 0)) && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-coral rounded-full text-[10px] text-primary-foreground flex items-center justify-center font-bold animate-pulse">
                {myUnread > 0 ? myUnread : totalUnread}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 w-96 bg-card border border-border rounded-lg shadow-xl z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h4 className="text-xs font-semibold">Notifications</h4>
                <div className="flex items-center gap-2">
                  {myUnread > 0 && (
                    <button onClick={markAllRead} className="text-[10px] text-teal hover:underline">Mark all read</button>
                  )}
                  <button onClick={() => setShowNotifications(false)}>
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {/* Escalation notifications */}
                {escalationsForMe.length > 0 && (
                  <div>
                    {escalationsForMe.map(n => (
                      <div
                        key={n.id}
                        onClick={() => { markRead(n.id); setShowNotifications(false); setCurrentPage('dashboards'); }}
                        className={`px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors ${!n.read ? 'bg-coral/5' : ''}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${!n.read ? 'bg-coral/15' : 'bg-muted'}`}>
                            <AlertTriangle className={`w-3.5 h-3.5 ${!n.read ? 'text-coral' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {n.type === 'escalation' ? '🚨 Compliance Escalation' : '🎫 New Ticket from Compliance'}
                              </p>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-coral" />}
                                <span className="text-[10px] text-muted-foreground">{n.timestamp}</span>
                              </div>
                            </div>
                            <p className={`text-[10px] font-medium ${sevColor[n.violationSeverity] || 'text-muted-foreground'}`}>
                              [{n.violationSeverity}] {n.violationAsset}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{n.violationRule}</p>
                            {n.comments && (
                              <p className="text-[10px] text-foreground/70 mt-1 italic line-clamp-2">"{n.comments}"</p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {n.violationFramework} · {n.violationBU}
                              {n.ticketId && <span className="ml-2 text-teal font-mono">{n.ticketId}</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Static system notifications when no escalations */}
                {escalationsForMe.length === 0 && (
                  <div className="px-4 py-3 space-y-0">
                    {[
                      { text: '*.payments.acmecorp.com expires in 6 days', page: 'remediation' },
                      { text: 'vault.internal cert expires in 3 days', page: 'remediation' },
                      { text: 'SSH cert k8s-node expired', page: 'remediation' },
                      { text: 'Discovery run completed — 8 new assets', page: 'discovery' },
                      { text: 'PQC risk assessment updated', page: 'quantum' },
                    ].map((n, i) => (
                      <div key={i} onClick={() => { setCurrentPage(n.page); setShowNotifications(false); }}
                        className="py-2 border-b border-border last:border-0 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        {n.text}
                      </div>
                    ))}
                  </div>
                )}

                {escalationsForMe.length === 0 && (
                  <div className="px-4 py-2 text-[10px] text-muted-foreground text-center border-t border-border">
                    No escalations from compliance team yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-teal/20 flex items-center justify-center">
          <User className="w-4 h-4 text-teal" />
        </div>
      </div>

      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} contextPage={currentPage} />
    </div>
  );
}
