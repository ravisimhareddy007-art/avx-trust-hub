import React from 'react';
import { PersonaProvider, usePersona } from '@/context/PersonaContext';
import { NavigationProvider, useNav } from '@/context/NavigationContext';
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
import DiscoveryProfilesPage from '@/pages/DiscoveryProfilesPage';
import DiscoveryRunsPage from '@/pages/DiscoveryRunsPage';
import CoreServicesPage from '@/pages/CoreServicesPage';
import SettingsPage from '@/pages/SettingsPage';

function DashboardPage() {
  const { persona } = usePersona();
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">
        {persona === 'security-admin' ? 'Security Admin Dashboard' :
         persona === 'compliance-officer' ? 'Compliance Officer Dashboard' :
         'PKI / Platform Engineer Dashboard'}
      </h1>
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
    'discovery-profiles': <DiscoveryProfilesPage />,
    'discovery-runs': <DiscoveryRunsPage />,
    'inventory': <InventoryPage />,
    'policy-builder': <PolicyBuilderPage />,
    'trustops': <TrustOpsPage />,
    'quantum': <QuantumPosturePage />,
    'automation': <CoreServicesPage initialTab="automation" />,
    'integrations': <CoreServicesPage initialTab="integrations" />,
    'reporting': <CoreServicesPage initialTab="reporting" />,
    'self-service': <CoreServicesPage initialTab="self-service" />,
    'user-management': <SettingsPage initialTab="users" />,
    'licenses': <SettingsPage initialTab="licenses" />,
    'audit-log': <SettingsPage initialTab="audit" />,
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
        <QuantumBanner />
      </div>
    </div>
  );
}

export default function Index() {
  return (
    <PersonaProvider>
      <NavigationProvider>
        <AppShell />
      </NavigationProvider>
    </PersonaProvider>
  );
}
