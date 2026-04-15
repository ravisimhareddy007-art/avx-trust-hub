import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { Bell, Search, Sparkles, User, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const aiQueries: Record<string, { filters: Record<string, string>; description: string }> = {
  'rsa-2048 certs expiring in production this quarter': { filters: { algorithm: 'RSA-2048', environment: 'Production', expiryRange: 'This Quarter' }, description: 'RSA-2048 certificates expiring in production this quarter' },
  'all ssh keys with no rotation in 90 days': { filters: { type: 'SSH Key', status: 'Orphaned' }, description: 'SSH keys with no rotation in 90+ days' },
  'critical pqc violations in the payments team': { filters: { pqcRisk: 'Critical', team: 'Payments Engineering' }, description: 'Critical PQC violations in Payments team' },
  'certificates from unapproved cas': { filters: { caIssuer: 'Self-Signed' }, description: 'Certificates from unapproved CAs' },
  'ai agent tokens older than 7 days': { filters: { type: 'AI Agent Token' }, description: 'AI agent tokens older than 7 days' },
};

const breadcrumbMap: Record<string, string> = {
  'dashboards': 'Insights',
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
};

export default function TopBar() {
  const { currentPage, setCurrentPage, setFilters } = useNav();
  const [searchValue, setSearchValue] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      const query = searchValue.toLowerCase().trim();
      const match = Object.entries(aiQueries).find(([key]) => query.includes(key) || key.includes(query));
      if (match) {
        setFilters(match[1].filters);
        setCurrentPage('inventory');
        toast.success(`AI Search: Showing ${match[1].description}`);
      } else {
        setCurrentPage('inventory');
        toast.info('Searching inventory for: ' + searchValue);
      }
      setSearchValue('');
    }
  };

  return (
    <div className="h-14 bg-card border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
      {/* Breadcrumb */}
      <div className="text-sm font-medium text-foreground min-w-[180px]">
        {breadcrumbMap[currentPage] || currentPage}
      </div>

      {/* AI Search */}
      <div className="flex-1 max-w-xl mx-auto">
        <div className="relative">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal" />
          <input
            type="text"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            onKeyDown={handleSearch}
            placeholder='Ask AVX Trust anything... e.g. "show me all quantum-vulnerable certs in production" or "orphaned secrets in payments"'
            className="w-full pl-9 pr-4 py-2 bg-muted rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-teal"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
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
                '*.payments.acmecorp.com expires in 6 days',
                'vault.internal cert expires in 3 days',
                'SSH cert k8s-node expired',
                'Discovery run completed — 8 new assets',
                'PQC risk assessment updated',
              ].map((n, i) => (
                <div key={i} className="py-2 border-b border-border last:border-0 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  {n}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quantum Risk Pill */}
        <button
          onClick={() => setCurrentPage('quantum')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber/10 text-amber text-xs font-medium hover:bg-amber/20 transition-colors"
        >
          <AlertTriangle className="w-3 h-3" />
          12,847 PQC-vulnerable
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-teal/20 flex items-center justify-center">
          <User className="w-4 h-4 text-teal" />
        </div>
      </div>
    </div>
  );
}
