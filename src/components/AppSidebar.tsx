import React, { useState } from 'react';
import { usePersona, Persona } from '@/context/PersonaContext';
import { useNav } from '@/context/NavigationContext';
import {
  LayoutDashboard, Search, Globe, Package, Shield, Activity,
  Atom, Settings, ChevronDown, ChevronRight, Cog, Users, FileText,
  ClipboardList, Zap, Link2, BarChart3, ExternalLink, Lock, BookOpen
} from 'lucide-react';

const navItems = [
  { id: 'dashboards', label: 'Dashboards', icon: LayoutDashboard },
  {
    id: 'discovery', label: 'Discovery', icon: Search, children: [
      { id: 'discovery-profiles', label: 'Discovery Profiles' },
      { id: 'discovery-runs', label: 'Discovery Runs' },
    ]
  },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'policy-builder', label: 'Policy Builder', icon: Shield },
  { id: 'trustops', label: 'TrustOps Center', icon: Activity },
  { id: 'quantum', label: 'Quantum Posture', icon: Atom },
  {
    id: 'core-services', label: 'Core Services', icon: Cog, children: [
      { id: 'automation', label: 'Automation Engine' },
      { id: 'integrations', label: 'Integration Hub' },
      { id: 'reporting', label: 'Reporting & Insights' },
      { id: 'self-service', label: 'Self-Service Portals' },
    ]
  },
  {
    id: 'settings', label: 'Settings', icon: Settings, children: [
      { id: 'user-management', label: 'User Management & RBAC' },
      { id: 'licenses', label: 'Licenses' },
      { id: 'audit-log', label: 'Audit Log' },
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
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['discovery', 'core-services', 'settings']);
  const [personaOpen, setPersonaOpen] = useState(false);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const isActive = (id: string) => currentPage === id;
  const isChildActive = (item: any) => item.children?.some((c: any) => currentPage === c.id);

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
            <span className="text-sidebar-foreground font-light text-sm ml-1">ONE</span>
          </div>
        </div>
      </div>

      {/* Persona Switcher */}
      <div className="px-3 py-3 border-b border-navy-lighter">
        <div className="relative">
          <button
            onClick={() => setPersonaOpen(!personaOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-navy-light text-sidebar-foreground text-xs hover:bg-navy-lighter transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-teal/20 flex items-center justify-center">
                <Users className="w-3 h-3 text-teal" />
              </div>
              <span>{personaOptions.find(p => p.value === persona)?.label}</span>
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
      <nav className="flex-1 px-3 py-2 overflow-y-auto scrollbar-thin">
        {navItems.map(item => (
          <div key={item.id} className="mb-0.5">
            {item.children ? (
              <>
                <button
                  onClick={() => toggleGroup(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${isChildActive(item) ? 'text-teal' : 'text-sidebar-foreground hover:bg-navy-light hover:text-sidebar-accent-foreground'}`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {expandedGroups.includes(item.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {expandedGroups.includes(item.id) && (
                  <div className="ml-6 mt-0.5 space-y-0.5">
                    {item.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => setCurrentPage(child.id)}
                        className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors ${isActive(child.id) ? 'bg-teal/10 text-teal font-medium' : 'text-sidebar-foreground hover:bg-navy-light hover:text-sidebar-accent-foreground'}`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${isActive(item.id) ? 'bg-teal/10 text-teal' : 'text-sidebar-foreground hover:bg-navy-light hover:text-sidebar-accent-foreground'}`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
