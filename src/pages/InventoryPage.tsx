import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import ITAssetsTab from '@/components/inventory/ITAssetsTab';
import CryptoObjectsTab from '@/components/inventory/CryptoObjectsTab';
import GroupsTab from '@/components/inventory/GroupsTab';
import PolicyDrawer from '@/components/inventory/PolicyDrawer';
import TicketDrawer from '@/components/inventory/TicketDrawer';
import { Server, Key, LayoutGrid } from 'lucide-react';

const tabs = [
  { key: 'it-assets', label: 'Infrastructure', icon: Server },
  { key: 'crypto-objects', label: 'Identities', icon: Key },
  { key: 'groups', label: 'Groups', icon: LayoutGrid },
] as const;

type TabKey = typeof tabs[number]['key'];

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('it-assets');

  // Policy Drawer state
  const [policyDrawerOpen, setPolicyDrawerOpen] = useState(false);
  const [policyDrawerCtx, setPolicyDrawerCtx] = useState<{ groupId?: string; groupName?: string }>({});

  // Ticket Drawer state
  const [ticketDrawerOpen, setTicketDrawerOpen] = useState(false);
  const [ticketCtx, setTicketCtx] = useState<any>(null);

  const openPolicyDrawer = (groupId: string, groupName: string) => {
    setPolicyDrawerCtx({ groupId, groupName });
    setPolicyDrawerOpen(true);
  };

  const openTicketDrawer = (ctx: any) => {
    setTicketCtx(ctx);
    setTicketDrawerOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top-level tab bar */}
      <div className="flex items-center gap-0 border-b border-border bg-card px-4 flex-shrink-0">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — full replacement */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'it-assets' && <ITAssetsTab onCreateTicket={openTicketDrawer} onOpenPolicyDrawer={openPolicyDrawer} />}
        {activeTab === 'crypto-objects' && <CryptoObjectsTab onCreateTicket={openTicketDrawer} />}
        {activeTab === 'groups' && <GroupsTab onCreateTicket={openTicketDrawer} onOpenPolicyDrawer={openPolicyDrawer} />}
      </div>

      {/* Policy Builder Drawer */}
      <PolicyDrawer
        open={policyDrawerOpen}
        onClose={() => { setPolicyDrawerOpen(false); setPolicyDrawerCtx({}); }}
        groupId={policyDrawerCtx.groupId}
        groupName={policyDrawerCtx.groupName}
      />

      {/* Ticket Drawer */}
      <TicketDrawer
        open={ticketDrawerOpen}
        onClose={() => { setTicketDrawerOpen(false); setTicketCtx(null); }}
        context={ticketCtx}
      />
    </div>
  );
}
