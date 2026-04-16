import React, { useState, useEffect } from 'react';
import { useNav } from '@/context/NavigationContext';
import ITAssetsTab from '@/components/inventory/ITAssetsTab';
import CryptoObjectsTab from '@/components/inventory/CryptoObjectsTab';
import GroupsTab from '@/components/inventory/GroupsTab';
import PolicyDrawer from '@/components/inventory/PolicyDrawer';
import TicketDrawer from '@/components/inventory/TicketDrawer';
import AddResourceModal from '@/components/inventory/AddResourceModal';
import { Server, Key, LayoutGrid, Plus } from 'lucide-react';

const tabs = [
  { key: 'it-assets', label: 'Infrastructure', icon: Server },
  { key: 'crypto-objects', label: 'Identities', icon: Key },
  { key: 'groups', label: 'Groups', icon: LayoutGrid },
] as const;

type TabKey = typeof tabs[number]['key'];

export default function InventoryPage() {
  const { filters } = useNav();
  const [activeTab, setActiveTab] = useState<TabKey>('it-assets');

  // Read tab from navigation filters
  useEffect(() => {
    if (filters.tab === 'identities') setActiveTab('crypto-objects');
    else if (filters.tab === 'infrastructure') setActiveTab('it-assets');
    else if (filters.tab === 'groups') setActiveTab('groups');
  }, [filters]);

  // Policy Drawer state
  const [policyDrawerOpen, setPolicyDrawerOpen] = useState(false);
  const [policyDrawerCtx, setPolicyDrawerCtx] = useState<{ groupId?: string; groupName?: string }>({});

  // Ticket Drawer state
  const [ticketDrawerOpen, setTicketDrawerOpen] = useState(false);
  const [ticketCtx, setTicketCtx] = useState<any>(null);

  // Add Resource Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addInitialKind, setAddInitialKind] = useState<'identity' | 'infrastructure' | undefined>(undefined);

  const openPolicyDrawer = (groupId: string, groupName: string) => {
    setPolicyDrawerCtx({ groupId, groupName });
    setPolicyDrawerOpen(true);
  };

  const openTicketDrawer = (ctx: any) => {
    setTicketCtx(ctx);
    setTicketDrawerOpen(true);
  };

  const openAdd = () => {
    // Pre-select form based on the currently active tab
    if (activeTab === 'it-assets') setAddInitialKind('infrastructure');
    else if (activeTab === 'crypto-objects') setAddInitialKind('identity');
    else setAddInitialKind(undefined);
    setAddOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top-level tab bar */}
      <div className="flex items-center border-b border-border bg-card px-4 flex-shrink-0">
        <div className="flex items-center gap-0">
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
        <button
          onClick={openAdd}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 my-1.5 text-[11px] font-semibold rounded-md bg-teal text-primary-foreground hover:bg-teal-light transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Resource
        </button>
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

      {/* Add Resource Modal */}
      <AddResourceModal
        open={addOpen}
        onClose={() => { setAddOpen(false); setAddInitialKind(undefined); }}
        initialKind={addInitialKind}
      />
    </div>
  );
}
