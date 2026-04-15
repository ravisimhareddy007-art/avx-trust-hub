import React, { useState } from 'react';
import { usePersona, Persona } from '@/context/PersonaContext';
import { useNav } from '@/context/NavigationContext';
import {
  LayoutDashboard, Search, Package, Shield,
  ChevronDown, ChevronRight, Users,
  Link2, Lock, ScrollText, Cog, Wrench
} from 'lucide-react';

interface NavChild {
  id: string;
  label: string;
  page?: string;
  type?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  children?: NavChild[];
  page?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard, page: 'dashboards' },
  { id: 'discovery', label: 'DISCOVERY', icon: Search, page: 'discovery' },
  { id: 'inventory', label: 'INVENTORY', icon: Package, page: 'inventory' },
  { id: 'policy-builder', label: 'POLICIES', icon: ScrollText, page: 'policy-builder' },
  { id: 'remediation', label: 'REMEDIATION', icon: Wrench, page: 'remediation' },
  { id: 'integrations', label: 'INTEGRATIONS', icon: Link2, page: 'integrations' },
  { id: 'core-services', label: 'PLATFORM CORE', icon: Cog, page: 'core-services' },
];

const personaOptions: { value: Persona; label: string }[] = [
  { value: 'security-admin', label: 'Security Admin' },
  { value: 'compliance-officer', label: 'Compliance Officer' },
  { value: 'pki-engineer', label: 'PKI Engineer' },
];

export default function AppSidebar() {
  const { persona, setPersona } = usePersona();
  const { setCurrentPage, setFilters } = useNav();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['inventory-section']);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [activeNavId, setActiveNavId] = useState<string>('dashboard');

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleNavClick = (id: string, page?: string, type?: string) => {
    setActiveNavId(id);
    setCurrentPage(page || id);
    setFilters(type && type !== 'All' ? { type } : {});
  };

  const isActive = (id: string) => activeNavId === id;
  const isChildActive = (section: NavItem) => section.children?.some(c => activeNavId === c.id);

  return (
    <div className="w-56 min-h-screen bg-navy flex flex-col border-r border-navy-lighter flex-shrink-0">
      <div className="h-14 flex items-center px-4 border-b border-navy-lighter">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center">
            <Lock className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-primary-foreground font-bold text-sm leading-tight">AVX <span className="text-sidebar-foreground font-light">Trust</span></span>
            <span className="text-[9px] text-muted-foreground leading-tight tracking-wide">CONTROL PLANE</span>
          </div>
        </div>
      </div>


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
                  onClick={() => {
                    setPersona(opt.value);
                    setPersonaOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-navy-lighter transition-colors ${persona === opt.value ? 'text-teal' : 'text-sidebar-foreground'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-2 py-2 overflow-y-auto scrollbar-thin">
        {navItems.map(item => (
          <div key={item.id} className="mb-0.5">
            {item.children ? (
              <>
                <button
                  onClick={() => toggleGroup(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                    isChildActive(item) ? 'text-primary-foreground' : 'text-sidebar-foreground hover:text-primary-foreground'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {expandedGroups.includes(item.id) ? <span className="text-muted-foreground">—</span> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                </button>
                {expandedGroups.includes(item.id) && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-navy-lighter pl-3">
                    {item.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => handleNavClick(child.id, child.page, child.type)}
                        className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors ${
                          isActive(child.id) ? 'bg-teal/10 text-teal font-medium' : 'text-sidebar-foreground hover:bg-navy-light hover:text-primary-foreground'
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => handleNavClick(item.id, item.page)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                  isActive(item.id) ? 'text-teal' : 'text-sidebar-foreground hover:text-primary-foreground'
                }`}
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
