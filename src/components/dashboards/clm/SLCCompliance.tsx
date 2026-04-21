import React from 'react';
import { Clock } from 'lucide-react';
import { mockAssets } from '@/data/mockData';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const certAssets = mockAssets.filter(a =>
  a.type === 'TLS Certificate' || a.type === 'Code-Signing Certificate' ||
  a.type === 'K8s Workload Cert' || a.type === 'SSH Certificate'
);

export default function SLCCompliance() {
  const shortLived = certAssets.filter(a => a.daysToExpiry >= 0 && a.daysToExpiry <= 90);
  const total = shortLived.length;
  const compliant = shortLived.filter(a => a.autoRenewal === true).length;
  const complianceScore = total > 0 ? Math.round((compliant / total) * 100) : 0;
  const under30 = shortLived.filter(a => a.daysToExpiry <= 30).length;
  const thirtyTo90 = shortLived.filter(a => a.daysToExpiry > 30 && a.daysToExpiry <= 90).length;

  const donutData = [
    { name: '≤ 30 days', value: under30 },
    { name: '31–90 days', value: thirtyTo90 },
  ];
  const COLORS = ['hsl(var(--coral))', 'hsl(var(--amber))'];

  const scoreColor = complianceScore > 80 ? 'text-teal' : complianceScore >= 60 ? 'text-amber' : 'text-coral';

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Short-Lived Cert Compliance</h3>
      </div>

      <div className="flex gap-6">
        {/* Donut */}
        <div className="w-[40%] relative">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                dataKey="value"
                strokeWidth={0}
              >
                {donutData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-foreground">{total}</span>
            <span className="text-[9px] text-muted-foreground">short-lived certs</span>
          </div>
        </div>

        {/* Stats */}
        <div className="w-[60%] flex flex-col justify-center gap-3">
          <div>
            <span className={`text-3xl font-bold ${scoreColor}`}>{complianceScore}%</span>
            <p className="text-xs text-muted-foreground mt-0.5">SLC Compliance</p>
          </div>
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground">
              Auto-renewal enabled: <span className="text-foreground font-medium">{compliant} of {total} certs</span>
            </p>
            <p className={under30 > 0 ? 'text-coral' : 'text-muted-foreground'}>
              Expiring in &lt; 30 days: <span className="font-medium">{under30} certs</span>
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            CA/Browser Forum mandates 90-day maximum TLS cert validity from 2025
          </p>
        </div>
      </div>
    </div>
  );
}
