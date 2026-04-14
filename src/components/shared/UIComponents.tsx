import React, { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  color?: 'teal' | 'coral' | 'amber' | 'purple' | 'default';
  onClick?: () => void;
  subtitle?: string;
}

export function KPICard({ label, value, color = 'default', onClick, subtitle }: KPICardProps) {
  const colorClasses = {
    teal: 'border-l-teal',
    coral: 'border-l-coral',
    amber: 'border-l-amber',
    purple: 'border-l-purple',
    default: 'border-l-border',
  };

  const valueColors = {
    teal: 'text-teal',
    coral: 'text-coral',
    amber: 'text-amber',
    purple: 'text-purple',
    default: 'text-foreground',
  };

  return (
    <button
      onClick={onClick}
      className={`bg-card rounded-lg border border-border border-l-4 ${colorClasses[color]} p-4 text-left hover:shadow-md transition-all cursor-pointer w-full`}
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColors[color]}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </button>
  );
}

interface SeverityBadgeProps {
  severity: string;
  size?: 'sm' | 'md';
}

export function SeverityBadge({ severity, size = 'sm' }: SeverityBadgeProps) {
  const colors: Record<string, string> = {
    'Critical': 'bg-coral/10 text-coral',
    'P1': 'bg-coral/10 text-coral',
    'High': 'bg-amber/10 text-amber',
    'P2': 'bg-amber/10 text-amber',
    'Medium': 'bg-purple/10 text-purple',
    'P3': 'bg-purple/10 text-purple',
    'Low': 'bg-teal/10 text-teal',
    'Safe': 'bg-success/10 text-success',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[severity] || 'bg-muted text-muted-foreground'} ${size === 'md' ? 'text-xs px-3 py-1' : ''}`}>
      {severity}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    'Active': 'bg-teal/10 text-teal',
    'Expiring': 'bg-coral/10 text-coral',
    'Expired': 'bg-coral/20 text-coral',
    'Revoked': 'bg-muted text-muted-foreground',
    'Pending': 'bg-amber/10 text-amber',
    'Orphaned': 'bg-purple/10 text-purple',
    'Production': 'bg-coral/10 text-coral',
    'Staging': 'bg-amber/10 text-amber',
    'Development': 'bg-teal/10 text-teal',
    'Complete': 'bg-teal/10 text-teal',
    'Running': 'bg-teal/10 text-teal',
    'Failed': 'bg-coral/10 text-coral',
    'Cancelled': 'bg-muted text-muted-foreground',
    'In progress': 'bg-amber/10 text-amber',
    'Awaiting approval': 'bg-amber/10 text-amber',
    'Scheduled': 'bg-purple/10 text-purple',
    'Paused': 'bg-muted text-muted-foreground',
    'Draft': 'bg-muted text-muted-foreground',
    'connected': 'bg-teal/10 text-teal',
    'disconnected': 'bg-muted text-muted-foreground',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}

export function EnvBadge({ env }: { env: string }) {
  return <StatusBadge status={env} />;
}

export function PQCBadge({ risk }: { risk: string }) {
  return <SeverityBadge severity={risk} />;
}

export function DaysToExpiry({ days }: { days: number }) {
  if (days < 0) return <span className="text-xs text-muted-foreground">N/A</span>;
  const color = days <= 3 ? 'text-coral font-bold' : days <= 7 ? 'text-coral' : days <= 30 ? 'text-amber' : 'text-teal';
  return <span className={`text-xs ${color}`}>{days}d</span>;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-card rounded-xl border border-border shadow-xl ${wide ? 'w-[720px]' : 'w-[520px]'} max-h-[85vh] overflow-y-auto p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[640px] bg-card border-l border-border shadow-xl h-full overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function AIInsightCard({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <div className="bg-card rounded-lg border border-border border-l-4 border-l-teal p-4 mt-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-teal text-sm">✦</span>
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-foreground mb-1">Infinity AI Insight</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
          {onClick && (
            <button onClick={onClick} className="text-xs text-teal font-medium mt-2 hover:underline">
              Recommended actions →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
