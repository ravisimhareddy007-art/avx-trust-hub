import React, { useState } from "react";
import { usePersona, Persona } from "@/context/PersonaContext";
import { remediationPages, policyPages, useNav } from "@/context/NavigationContext";
import {
  LayoutDashboard,
  Search,
  Package,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Users,
  Link2,
  Lock,
  ScrollText,
  Cog,
  Wrench,
  Ticket,
  Cpu,
} from "lucide-react";

interface NavChild {
  id: string;
  label: string;
  page?: string;
  type?: string;
  count?: number;
  icon?: React.ElementType;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  children?: NavChild[];
  page?: string;
}

interface NavSubItemProps {
  label: string;
  count?: number;
  icon?: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}

const NavSubItem = ({ label, count, icon: ItemIcon, isActive, onClick }: NavSubItemProps) => (
  <div
    onClick={onClick}
    className={`flex items-center justify-between gap-2 px-4 py-1.5 cursor-pointer text-xs transition-colors border-l-2 ${
      isActive
        ? "text-teal font-medium border-teal bg-teal/5"
        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5"
    }`}
  >
    <span className="whitespace-nowrap">{label}</span>
    <div className="flex items-center gap-1.5 shrink-0">
      {ItemIcon && <ItemIcon size={10} className="text-amber" />}
      {typeof count === "number" && (
        <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-xs text-muted-foreground">{count}</span>
      )}
    </div>
  </div>
);

const personaOptions: { value: Persona; label: string }[] = [
  { value: "security-admin", label: "Security Admin" },
  { value: "compliance-officer", label: "Compliance Officer" },
  { value: "pki-engineer", label: "CLM Engineer" },
];

export default function AppSidebar() {
  const { persona, setPersona } = usePersona();
  const { currentPage, setCurrentPage, setFilters } = useNav();

  // Hidden for MVP R1; will be enabled in R2
  const SHOW_REMEDIATION = false;
  const SHOW_MCP_RUNTIME = false;

  const navItems: NavItem[] = [
    { id: "dashboard", label: "DASHBOARD", icon: LayoutDashboard, page: "dashboards" },
    { id: "discovery", label: "DISCOVERY", icon: Search, page: "discovery" },
    { id: "inventory", label: "INVENTORY", icon: Package, page: "inventory" },
    {
      id: "policy-builder",
      label: "POLICIES",
      icon: ScrollText,
      page: "policy-builder",
      children:
        persona === "compliance-officer"
          ? [
              { id: "policy-builder", label: "Policies", page: "policy-builder" },
              { id: "violations", label: "Violations", page: "violations" },
              { id: "policy-exceptions", label: "Exceptions", page: "policy-exceptions" },
            ]
          : [
              { id: "policy-builder", label: "Policies", page: "policy-builder" },
              { id: "policy-exceptions", label: "Exceptions", page: "policy-exceptions" },
            ],
    },
    ...(SHOW_REMEDIATION
      ? [
          {
            id: "remediation",
            label: "REMEDIATION",
            icon: Wrench,
            page: "remediation-clm",
            children: [
              { id: "remediation-clm", label: "Certificates (CLM)", page: "remediation-clm", count: 40 },
              { id: "remediation-ssh", label: "SSH Keys & Certs", page: "remediation-ssh", count: 7 },
              { id: "remediation-ai", label: "AI Agent Tokens", page: "remediation-ai", count: 7 },
              { id: "remediation-secrets", label: "Secrets", page: "remediation-secrets", count: 3, icon: Lock },
            ],
          },
        ]
      : []),
    { id: "tickets", label: "TICKETS", icon: Ticket, page: "tickets" },
    {
      id: "integrations",
      label: "INTEGRATIONS",
      icon: Link2,
      page: "integrations-sources",
      children: [{ id: "integrations-sources", label: "Sources", page: "integrations-sources" }],
    },
    ...(SHOW_MCP_RUNTIME ? [{ id: "mcp-runtime", label: "MCP RUNTIME", icon: Cpu, page: "mcp-runtime" }] : []),
    { id: "core-services", label: "PLATFORM CORE", icon: Cog, page: "core-services" },
  ];

  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "inventory-section",
    ...(remediationPages.includes(currentPage) ? ["remediation"] : []),
    ...(policyPages.includes(currentPage) ? ["policy-builder"] : []),
  ]);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  const handleNavClick = (id: string, page?: string, type?: string) => {
    setCurrentPage(page || id);
    setFilters(type && type !== "All" ? { type } : {});
  };

  const isActive = (id: string, page?: string) => currentPage === (page || id);
  const isChildActive = (section: NavItem) => section.children?.some((c) => currentPage === (c.page || c.id));

  return (
    <div
      className={`${collapsed ? "w-16" : "w-56"} h-screen bg-navy flex flex-col border-r border-navy-lighter flex-shrink-0 transition-[width] duration-200`}
    >
      <div className="h-14 flex items-center px-3 border-b border-navy-lighter gap-2">
        <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center flex-shrink-0">
          <Lock className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col whitespace-nowrap flex-1 min-w-0">
            <span className="text-primary-foreground font-bold text-sm leading-tight">Trust</span>
            <span className="text-[9px] text-muted-foreground leading-tight tracking-wide">CONTROL PLANE</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-1 rounded text-muted-foreground hover:text-primary-foreground hover:bg-navy-light flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <div className="px-2 py-2 border-b border-navy-lighter">
        <div className="relative">
          <button
            onClick={() => !collapsed && setPersonaOpen(!personaOpen)}
            className={`w-full flex items-center ${collapsed ? "justify-center" : "justify-between"} px-2 py-1.5 rounded-md bg-navy-light text-sidebar-foreground text-xs hover:bg-navy-lighter transition-colors`}
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-3 h-3 text-amber" />
              </div>
              {!collapsed && (
                <span className="text-[11px] whitespace-nowrap">
                  {personaOptions.find((p) => p.value === persona)?.label}
                </span>
              )}
            </div>
            {!collapsed && <ChevronDown className="w-3 h-3" />}
          </button>
          {personaOpen && !collapsed && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-navy-light border border-navy-lighter rounded-md shadow-lg z-50">
              {personaOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setPersona(opt.value);
                    setPersonaOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-navy-lighter transition-colors ${persona === opt.value ? "text-teal" : "text-sidebar-foreground"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-2 py-2 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {navItems.map((item) => (
          <div key={item.id} className="mb-0.5">
            {item.children ? (
              <>
                <div
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                    isChildActive(item) ? "text-teal" : "text-sidebar-foreground hover:text-primary-foreground"
                  }`}
                >
                  <button
                    onClick={() => {
                      if (item.page) {
                        handleNavClick(item.children![0].id, item.children![0].page);
                        if (!expandedGroups.includes(item.id)) toggleGroup(item.id);
                      } else {
                        toggleGroup(item.id);
                      }
                    }}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-2 flex-1 text-left ${collapsed ? "justify-center" : ""}`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="flex-1 whitespace-nowrap">{item.label}</span>}
                  </button>
                  {!collapsed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroup(item.id);
                      }}
                      aria-label={expandedGroups.includes(item.id) ? `Collapse ${item.label}` : `Expand ${item.label}`}
                      className="p-0.5 rounded hover:bg-navy-light text-muted-foreground"
                    >
                      {expandedGroups.includes(item.id) ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
                {!collapsed && expandedGroups.includes(item.id) && (
                  <div className="mt-0.5 space-y-0.5">
                    {item.children.map((child) => (
                      <NavSubItem
                        key={child.id}
                        label={child.label}
                        count={child.count}
                        icon={child.icon}
                        isActive={isActive(child.id, child.page)}
                        onClick={() => handleNavClick(child.id, child.page, child.type)}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => handleNavClick(item.id, item.page)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors ${collapsed ? "justify-center" : ""} ${
                  isActive(item.id, item.page) ? "text-teal" : "text-sidebar-foreground hover:text-primary-foreground"
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </button>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
