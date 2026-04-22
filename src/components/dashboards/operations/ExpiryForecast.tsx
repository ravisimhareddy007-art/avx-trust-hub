import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ESTATE_SUMMARY, mockAssets } from '@/data/mockData';
import { useNav } from '@/context/NavigationContext';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ExpiryForecast() {
  const { setCurrentPage } = useNav();

  const { chartData, atRiskTotal } = useMemo(() => {
    const today = new Date();
    const todayDow = today.getDay();
    const certs = mockAssets.filter((asset) => asset.type.includes('Certificate'));
    const scale = Math.max(1, Math.round(ESTATE_SUMMARY.certificates / Math.max(certs.length, 1)));

    const days = Array.from({ length: 7 }, (_, i) => {
      const label =
        i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_NAMES[(todayDow + i) % 7];

      const assets = certs.filter(a => a.daysToExpiry === i);
      const safe = assets.filter(a => a.autoRenewal).length * scale;
      const atRisk = (assets.length - assets.filter(a => a.autoRenewal).length) * scale;

      return { label, safe, atRisk };
    });

    const atRiskTotal = days.reduce((s, d) => s + d.atRisk, 0);
    return { chartData: days, atRiskTotal };
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Expiry Forecast — Next 7 Days
        </h3>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal inline-block" />
            <span className="text-muted-foreground">Auto-renewal covered</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-coral inline-block" />
            <span className="text-muted-foreground">Needs action</span>
          </span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barCategoryGap="20%">
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(220 15% 55%)', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(220 15% 55%)', fontSize: 11 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(225 30% 14%)',
              border: '1px solid hsl(225 20% 20%)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: 'hsl(220 20% 90%)' }}
            itemStyle={{ padding: 0 }}
          />
          <Bar dataKey="safe" stackId="a" fill="hsl(160 70% 37%)" radius={[0, 0, 0, 0]} name="Auto-renewal" />
          <Bar dataKey="atRisk" stackId="a" fill="hsl(15 72% 52%)" radius={[4, 4, 0, 0]} name="Needs action" />
        </BarChart>
      </ResponsiveContainer>

      {/* Warning */}
      {atRiskTotal > 0 && (
        <button
          onClick={() => setCurrentPage('remediation')}
          className="mt-3 text-xs text-coral hover:text-coral-light transition-colors"
        >
          ⚠ {atRiskTotal} credentials expiring this week have no renewal plan.
        </button>
      )}
    </div>
  );
}
