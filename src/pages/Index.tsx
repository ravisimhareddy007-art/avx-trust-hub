import React from 'react';
import { PersonaProvider, usePersona } from '@/context/PersonaContext';
import { NavigationProvider, useNav } from '@/context/NavigationContext';
import { IntegrationsProvider } from '@/context/IntegrationsContext';
import AppSidebar from '@/components/AppSidebar';
import TopBar from '@/components/TopBar';
import QuantumBanner from '@/components/QuantumBanner';
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
    'tickets': <TicketManagementPage />,
    'integrations': <IntegrationsPage />,
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

function AppShell() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <PageRouter />
      </div>
    </div>
  );
}

export default function Index() {
  return (
    <PersonaProvider>
      <NavigationProvider>
        <IntegrationsProvider>
          <AppShell />
        </IntegrationsProvider>
      </NavigationProvider>
    </PersonaProvider>
  );
}
