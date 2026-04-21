import React from 'react';
import { TrendingDown, TrendingUp, Clock, Zap, AlertTriangle, Ghost } from 'lucide-react';
import { useNav } from '@/context/NavigationContext';

interface KPITrend {
  direction: 'up' | 'down' | 'neutral';
  value: string;
}

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle: string;
  trend?: KPITrend;
  color: 'teal' | 'amber' | 'coral';
  tooltip: string;
}

const colorMap = {
  teal: {
    value: 'text-teal',
    icon: 'text-teal',
    bg: 'hover:bg-teal/5',
  },
  amber: {
    value: 'text-amber',
    icon: 'text-amber',
    bg: 'hover:bg-amber/5',
  },
  coral: {
    value: 'text-coral',
    icon: 'text-coral',
    bg: 'hover:bg-coral/5',
  },
};

function KPICard({ icon: Icon, label, value, subtitle, color, tooltip }: KPICardProps) {
  const { setCurrentPage } = useNav();
  const colors = colorMap[color];

  return (
    <div
      title={tooltip}
      onClick={() => setCurrentPage('inventory')}
      className={`flex-1 bg-card rounded-xl border border-border p-4 cursor-pointer transition-colors ${colors.bg}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <Icon className={`w-4 h-4 ${colors.icon}`} />
      </div>
      <div className="space-y-1">
        <div className={`text-2xl font-bold ${colors.value}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
}

export default function OperationsKPIStrip() {
  return (
    <div className="flex gap-4">
      <KPICard
        icon={Clock}
        label="MTTR"
        value="8.2h"
        subtitle="↓ 18% vs last week"
        color="teal"
        tooltip="Average time from violation detection to closure, last 30 days."
      />
      <KPICard
        icon={TrendingDown}
        label="Backlog Burn Rate"
        value="1.4x"
        subtitle="closing faster than opening"
        color="teal"
        tooltip="Violations closed this week divided by violations opened. Above 1.0 means backlog is shrinking."
      />
      <KPICard
        icon={Zap}
        label="Automation Coverage"
        value="67%"
        subtitle="2,847 objects on manual rotation"
        color="amber"
        tooltip="Percentage of eligible credentials enrolled in auto-rotation or auto-renewal."
      />
      <KPICard
        icon={Ghost}
        label="Shadow Credentials"
        value="143"
        subtitle="discovered this week, unregistered"
        color="coral"
        tooltip="Credentials found in scans that have no owner record in the platform."
      />
    </div>
  );
}
