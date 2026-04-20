import React from 'react';
import { PersonaProvider, usePersona } from '@/context/PersonaContext';
import { NavigationProvider, useNav } from '@/context/NavigationContext';
import { IntegrationsProvider, useIntegrations } from '@/context/IntegrationsContext';
import { InventoryRegistryProvider } from '@/context/InventoryRegistryContext';
import { RiskProvider } from '@/context/RiskContext';
import { AgentProvider } from '@/context/AgentContext';
import AppSidebar from '@/components/AppSidebar';
import TopBar from '@/components/TopBar';
import InfinityAIDrawer from '@/components/InfinityAIDrawer';
import SecurityAdminDashboard from '@/components/dashboards/SecurityAdminDashboard';
import ComplianceDashboard from '@/components/dashboards/ComplianceDashboard';
import PKIEngineerDashboard from '@/components/dashboards/PKIEngineerDashboard';
import InventoryPage from '@/pages/InventoryPage';
import PolicyBuilderPage from '@/pages/PolicyBuilderPage';
import TrustOpsPage from '@/pages/TrustOpsPage';
import QuantumPosturePage from '@/pages/QuantumPosturePage';
import DiscoveryPage from '@/pages/DiscoveryPage';
import CoreServicesPage from '@/pages/CoreServicesPage';
import SettingsPage from '@/pages/SettingsPage';
import RemediationPage from '@/pages/RemediationPage';
import TicketManagementPage from '@/pages/TicketManagementPage';
import IntegrationsPage from '@/pages/IntegrationsPage';
import ViolationsPage from '@/pages/ViolationsPage';

function DashboardPage() {
  const { persona } = usePersona();
  return (
    <div>
      {persona === 'security-admin' && <SecurityAdminDashboard />}
      {persona === 'compliance-officer' && <ComplianceDashboard />}
      {persona === 'pki-engineer' && <PKIEngineerDashboard />}
    </div>
  );
}

function PageRouter() {
  const { currentPage } = useNav();

  const pages: Record<string, React.ReactNode> = {
    'dashboards': <DashboardPage />,
    'discovery': <DiscoveryPage />,
    'inventory': <InventoryPage />,
    'policy-builder': <PolicyBuilderPage />,
    'remediation': <RemediationPage />,
    'violations': <ViolationsPage />,
    'tickets': <TicketManagementPage />,
    'integrations': <IntegrationsPage />,
    'integrations-sources': <IntegrationsPage />,
    'integrations-targets': <IntegrationsPage />,
    'core-services': <CoreServicesPage />,
    'trustops': <TrustOpsPage />,
    'quantum': <QuantumPosturePage />,
    'quantum-posture': <QuantumPosturePage />,
  };

  return (
    <div className="flex-1 overflow-auto p-6 scrollbar-thin">
      {pages[currentPage] || <DashboardPage />}
    </div>
  );
}

function AgentBoundary({ children }: { children: React.ReactNode }) {
  const { connected } = useIntegrations();
  // Pass connected CA / Cloud connectors to the agent so it knows what it can call
  const connectorNames = connected
    .filter(c => c.integrationType === 'CA' || c.integrationType === 'Cloud' || c.integrationType === 'Vault')
    .map(c => c.name);
  return <AgentProvider connectedConnectors={connectorNames}>{children}</AgentProvider>;
}

function AppShell() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <PageRouter />
      </div>
      <InfinityAIDrawer />
    </div>
  );
}

export default function Index() {
  return (
    <PersonaProvider>
      <NavigationProvider>
        <IntegrationsProvider>
          <InventoryRegistryProvider>
            <RiskProvider>
              <AgentBoundary>
                <AppShell />
              </AgentBoundary>
            </RiskProvider>
          </InventoryRegistryProvider>
        </IntegrationsProvider>
      </NavigationProvider>
    </PersonaProvider>
  );
}
