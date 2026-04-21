import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(2026, 3, 8 + i);
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return {
    day: label,
    enrolled: 30 + ((i * 7) % 30),
    renewed: 80 + ((i * 13) % 100),
    revoked: 5 + ((i * 3) % 15),
    regenerated: 10 + ((i * 5) % 30),
  };
});

export default function CLMActionTrend() {
  const [range, setRange] = useState<'daily' | 'weekly'>('daily');

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">CLM Action Trend</h3>
        <div className="flex items-center bg-muted rounded-md p-0.5">
          {(['daily', 'weekly'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-[10px] font-medium rounded-md transition-colors ${
                range === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r === 'daily' ? 'Daily' : 'Weekly'}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={30} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '11px',
            }}
          />
          <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
          <Line type="monotone" dataKey="enrolled" stroke="hsl(var(--teal))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="renewed" stroke="hsl(var(--purple))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="revoked" stroke="hsl(var(--coral))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="regenerated" stroke="hsl(var(--amber))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
