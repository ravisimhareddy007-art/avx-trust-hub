import React, { useState } from 'react';
import { usePersona, Persona } from '@/context/PersonaContext';
import { useNav } from '@/context/NavigationContext';
import {
  LayoutDashboard, Search, Package, Shield, Activity,
  Atom, ChevronDown, ChevronRight, Users, Eye,
  Zap, Link2, BarChart3, ExternalLink, Lock, Bell, FileText,
  RefreshCw, RotateCcw, Key, Settings, ClipboardList,
  BookOpen, AlertTriangle, Group, ScrollText, Cog
} from 'lucide-react';

interface NavChild {
  id: string;
  label: string;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ElementType;
  children?: NavChild[];
  page?: string; // direct page link (no children)
}

const navSections: NavSection[] = [
  { id: 'insights', label: 'INSIGHTS', icon: Eye, page: 'dashboards' },
  { id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard, page: 'dashboards' },
  {
    id: 'asset-actions', label: 'ASSET ACTIONS', icon: Shield, children: [
      { id: 'enroll', label: 'Enroll Certificate' },
      { id: 'renew', label: 'Renew Certificate' },
      { id: 'rotate', label: 'Rotate Keys' },
      { id: 'revoke', label: 'Revoke' },
    ]
  },
  {
    id: 'inventory-section', label: 'INVENTORY', icon: Package, children: [
      { id: 'inventory', label: 'All Assets' },
      { id: 'inventory-tls', label: 'TLS Certificates' },
      { id: 'inventory-ssh', label: 'SSH Keys' },
      { id: 'inventory-codesign', label: 'Code Signing' },
      { id: 'inventory-k8s', label: 'K8s Workload Certs' },
      { id: 'inventory-keys', label: 'Encryption Keys' },
    ]
  },
  {
    id: 'automation-section', label: 'AUTOMATION', icon: Zap, children: [
      { id: 'automation', label: 'Workflows' },
      { id: 'integrations', label: 'Integrations' },
    ]
  },
  {
    id: 'discovery-section', label: 'DISCOVERY', icon: Search, children: [
      { id: 'discovery', label: 'Discovery' },
      { id: 'discovery-rules', label: 'Rules' },
    ]
  },
  {
    id: 'alerts-section', label: 'ALERTS & LOGS', icon: Bell, children: [
      { id: 'trustops', label: 'TrustOps Center' },
      { id: 'audit-log', label: 'Audit Log' },
    ]
  },
  {
    id: 'policies-section', label: 'POLICIES', icon: ScrollText, children: [
      { id: 'policy-builder', label: 'Policy Builder' },
      { id: 'quantum', label: 'Quantum Posture' },
    ]
  },
  {
    id: 'admin-section', label: 'ADMINISTRATION', icon: Cog, children: [
      { id: 'user-management', label: 'User Management' },
      { id: 'licenses', label: 'Licenses' },
      { id: 'reporting', label: 'Reports' },
      { id: 'self-service', label: 'Self-Service Portal' },
    ]
  },
];

const personaOptions: { value: Persona; label: string }[] = [
  { value: 'security-admin', label: 'Security Admin' },
  { value: 'compliance-officer', label: 'Compliance Officer' },
  { value: 'pki-engineer', label: 'PKI Engineer' },
];

export default function AppSidebar() {
  const { persona, setPersona } = usePersona();
  const { currentPage, setCurrentPage } = useNav();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['inventory-section', 'discovery-section']);
  const [personaOpen, setPersonaOpen] = useState(false);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const isActive = (id: string) => {
    if (id.startsWith('inventory-') && id !== 'inventory-section') {
      return currentPage === id || currentPage === 'inventory';
    }
    return currentPage === id;
  };

  const handleNavClick = (id: string) => {
    // Map inventory sub-items to inventory page with type filter
    const inventoryMap: Record<string, string> = {
      'inventory-tls': 'TLS Certificate',
      'inventory-ssh': 'SSH Key',
      'inventory-codesign': 'Code-Signing Certificate',
      'inventory-k8s': 'K8s Workload Cert',
      'inventory-keys': 'Encryption Key',
    };
    if (inventoryMap[id]) {
      setCurrentPage('inventory');
      // Type filter will be handled by InventoryPage
      return;
    }
    // Enroll/Renew/Rotate/Revoke actions go to inventory with action context
    if (['enroll', 'renew', 'rotate', 'revoke'].includes(id)) {
      setCurrentPage('inventory');
      return;
    }
    if (id === 'discovery-rules') {
      setCurrentPage('discovery');
      return;
    }
    setCurrentPage(id);
  };

  const isChildActive = (section: NavSection) => {
    return section.children?.some(c => isActive(c.id));
  };

  return (
    <div className="w-60 min-h-screen bg-navy flex flex-col border-r border-navy-lighter flex-shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-navy-lighter">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center">
            <Lock className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <span className="text-primary-foreground font-bold text-sm">AVX</span>
            <span className="text-sidebar-foreground font-light text-sm ml-1">Trust</span>
          </div>
        </div>
      </div>

      {/* Module label */}
      <div className="px-4 py-2.5 border-b border-navy-lighter">
        <span className="text-xs font-bold text-primary-foreground tracking-wider">CERT+</span>
        <span className="text-[10px] text-muted-foreground ml-2">Module</span>
      </div>

      {/* Persona Switcher */}
      <div className="px-3 py-2 border-b border-navy-lighter">
        <div className="relative">
          <button
            onClick={() => setPersonaOpen(!personaOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-md bg-navy-light text-sidebar-foreground text-xs hover:bg-navy-lighter transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber/20 flex items-center justify-center">
                <Users className="w-3 h-3 text-amber" />
              </div>
              <span className="text-[11px]">{personaOptions.find(p => p.value === persona)?.label}</span>
            </div>
            <ChevronDown className="w-3 h-3" />
          </button>
          {personaOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-navy-light border border-navy-lighter rounded-md shadow-lg z-50">
              {personaOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setPersona(opt.value); setPersonaOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-navy-lighter transition-colors ${persona === opt.value ? 'text-teal' : 'text-sidebar-foreground'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto scrollbar-thin">
        {navSections.map(section => (
          <div key={section.id} className="mb-0.5">
            {section.children ? (
              <>
                <button
                  onClick={() => toggleGroup(section.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                    isChildActive(section) ? 'text-primary-foreground' : 'text-sidebar-foreground hover:text-primary-foreground'
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{section.label}</span>
                  {expandedGroups.includes(section.id) ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
                {expandedGroups.includes(section.id) && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-navy-lighter pl-3">
                    {section.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => handleNavClick(child.id)}
                        className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1 ${
                          isActive(child.id)
                            ? 'bg-teal/10 text-teal font-medium'
                            : 'text-sidebar-foreground hover:bg-navy-light hover:text-primary-foreground'
                        }`}
                      >
                        {child.label}
                        {child.id !== child.label && <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => handleNavClick(section.page || section.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                  currentPage === (section.page || section.id)
                    ? 'text-teal'
                    : 'text-sidebar-foreground hover:text-primary-foreground'
                }`}
              >
                <section.icon className="w-4 h-4" />
                <span>{section.label}</span>
              </button>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
