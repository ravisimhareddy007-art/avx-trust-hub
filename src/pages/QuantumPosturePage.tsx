import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { toast } from 'sonner';
import { Download, Sparkles, Bot, ArrowRight } from 'lucide-react';

const stages = ['Discover', 'Assess', 'Plan', 'Migrate', 'Monitor'];
const algoBreakdown = [
  { algo: 'RSA-2048', count: 8420 }, { algo: 'RSA-4096', count: 2100 },
  { algo: 'ECC P-256', count: 1800 }, { algo: 'ECC P-384', count: 340 }, { algo: 'PQC-Ready', count: 187 },
];
const migrationProgress = [
  { month: 'Jan', migrated: 12 }, { month: 'Feb', migrated: 45 }, { month: 'Mar', migrated: 89 },
  { month: 'Apr', migrated: 187 },
];

export default function QuantumPosturePage() {
  const [stage, setStage] = useState(0);
  const { setCurrentPage, setFilters } = useNav();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Quantum Posture</h1>
      {/* Stage tabs */}
      <div className="flex border border-border rounded-lg overflow-hidden">
        {stages.map((s, i) => (
          <button key={s} onClick={() => setStage(i)} className={`flex-1 py-3 text-xs font-medium text-center border-r border-border last:border-0 transition-colors ${stage === i ? 'bg-teal text-primary-foreground' : i < 2 ? 'bg-teal/5 text-teal' : 'bg-card text-muted-foreground hover:bg-muted'}`}>
            Stage {i + 1}: {s}
            <span className="block text-[10px] font-normal mt-0.5">{i === 0 ? 'Complete' : i === 1 ? 'In Progress' : 'Not Started'}</span>
          </button>
        ))}
      </div>

      {stage === 0 && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-3">Algorithm Breakdown — Quantum-Vulnerable Estate</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={algoBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="algo" tick={{ fontSize: 10 }} stroke="hsl(220, 9%, 46%)" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(220, 9%, 46%)" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" fill="hsl(38, 78%, 41%)" name="Assets" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-3">PQC Risk Heatmap — Business Unit × Asset Type</h3>
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground">Business Unit</th>
                {['TLS', 'SSH', 'Code-Sign', 'K8s', 'Keys'].map(t => <th key={t} className="text-center py-2 text-muted-foreground">{t}</th>)}
              </tr></thead>
              <tbody>
                {[
                  { bu: 'Payments', cells: ['red', 'amber', 'green', 'red', 'green'] },
                  { bu: 'Platform', cells: ['amber', 'red', 'green', 'amber', 'green'] },
                  { bu: 'Infrastructure', cells: ['red', 'amber', 'amber', 'green', 'amber'] },
                  { bu: 'AI Engineering', cells: ['amber', 'green', 'green', 'amber', 'green'] },
                ].map(row => (
                  <tr key={row.bu} className="border-b border-border">
                    <td className="py-2 font-medium">{row.bu}</td>
                    {row.cells.map((c, i) => (
                      <td key={i} className="text-center py-2">
                        <button onClick={() => { setFilters({ team: row.bu }); setCurrentPage('inventory'); }} className={`w-6 h-6 rounded ${c === 'red' ? 'bg-coral/20' : c === 'amber' ? 'bg-amber/20' : 'bg-teal/20'}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stage === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-coral">12,847</p>
              <p className="text-xs text-muted-foreground">Total vulnerable assets</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-amber">18 months</p>
              <p className="text-xs text-muted-foreground">Est. migration at current capacity</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-teal">1,361</p>
              <p className="text-xs text-muted-foreground">Days to NIST 2030 deadline</p>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-2">Prioritization Matrix</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-coral/10 rounded-lg p-3 text-center"><p className="font-semibold text-coral">Urgent / High Impact</p><p className="text-[10px] text-muted-foreground mt-1">Payment certs, auth keys (847 assets)</p></div>
              <div className="bg-amber/10 rounded-lg p-3 text-center"><p className="font-semibold text-amber">Plan / High Impact</p><p className="text-[10px] text-muted-foreground mt-1">Core infra, K8s workloads (3,200 assets)</p></div>
              <div className="bg-amber/10 rounded-lg p-3 text-center"><p className="font-semibold text-amber">Urgent / Low Impact</p><p className="text-[10px] text-muted-foreground mt-1">Dev/staging certs (2,100 assets)</p></div>
              <div className="bg-teal/10 rounded-lg p-3 text-center"><p className="font-semibold text-teal">Monitor / Low Impact</p><p className="text-[10px] text-muted-foreground mt-1">Internal tools (6,700 assets)</p></div>
            </div>
          </div>
          <button onClick={() => toast.success('Risk assessment exported as PDF')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted text-xs hover:bg-muted/80"><Download className="w-3 h-3" /> Export Risk Assessment</button>
        </div>
      )}

      {stage === 2 && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-3">Migration Sequence — Gantt Timeline</h3>
            <div className="space-y-2">
              {[
                { group: 'Batch 1: Payment Certs', start: 'May 2026', end: 'Jul 2026', algo: 'ML-DSA', count: 847 },
                { group: 'Batch 2: Auth & Identity', start: 'Jul 2026', end: 'Sep 2026', algo: 'ML-DSA', count: 1200 },
                { group: 'Batch 3: K8s Workloads', start: 'Sep 2026', end: 'Dec 2026', algo: 'ML-KEM', count: 3200 },
                { group: 'Batch 4: SSH Keys', start: 'Jan 2027', end: 'Apr 2027', algo: 'SLH-DSA', count: 4100 },
                { group: 'Batch 5: Remaining', start: 'Apr 2027', end: 'Aug 2027', algo: 'ML-DSA', count: 3500 },
              ].map((batch, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-48 text-xs"><p className="font-medium">{batch.group}</p><p className="text-[10px] text-muted-foreground">{batch.count.toLocaleString()} assets → {batch.algo}</p></div>
                  <div className="flex-1 h-6 bg-muted rounded relative">
                    <div className="absolute h-full rounded bg-teal/30" style={{ left: `${i * 18}%`, width: `${20 + i * 2}%` }} />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-medium">{batch.start} — {batch.end}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
      {/* AI PQC Prioritiser — contextual AI for this page */}
      <div className="bg-card rounded-lg border border-teal/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-teal" />
          <h3 className="text-sm font-semibold">AI PQC Migration Prioritiser</h3>
          <span className="text-[9px] px-1.5 py-0.5 bg-teal/10 text-teal rounded-full">Contextual AI</span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">AI-ranked migration queue: asset × algorithm × target PQC algo × deadline, weighted by harvest risk × business criticality.</p>
        <div className="space-y-2">
          {[
            { rank: 1, group: 'Payment TLS Certs', count: 847, risk: 'CRITICAL', target: 'ML-DSA-65', days: '12 days', reason: 'Harvest risk HIGH — PCI-DSS scope, handles financial data' },
            { rank: 2, group: 'Auth Gateway Certs', count: 312, risk: 'HIGH', target: 'ML-KEM-768', days: '8 days', reason: 'SSO/OAuth tokens — lateral movement vector if compromised' },
            { rank: 3, group: 'K8s Ingress Certs', count: 1247, risk: 'HIGH', target: 'ML-DSA-65', days: '21 days', reason: 'Public-facing endpoints, high blast radius' },
          ].map(item => (
            <div key={item.rank} className="flex items-center gap-3 bg-secondary/30 rounded-lg p-2.5">
              <span className="w-6 h-6 rounded-full bg-teal/10 text-teal text-[10px] font-bold flex items-center justify-center">#{item.rank}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{item.group}</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-coral/10 text-coral rounded">{item.risk}</span>
                  <span className="text-[9px] text-muted-foreground">{item.count.toLocaleString()} assets → {item.target}</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{item.reason}</p>
              </div>
              <button onClick={() => { setFilters({ pqcRisk: 'Critical' }); setCurrentPage('remediation'); }} className="text-[9px] px-2 py-1 rounded bg-teal text-primary-foreground hover:bg-teal-light flex items-center gap-1">
                Migrate <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <button onClick={() => toast.success('AI migration plan generated — optimal sequence computed for 12,847 assets')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light"><Sparkles className="w-3 h-3" /> Generate Full AI Migration Plan</button>
    </div>
  )}

      {stage === 3 && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Migration Progress</h3>
              <span className="text-xs text-teal font-medium">187 / 12,847 migrated (1.5%)</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden mb-4"><div className="h-full bg-teal rounded-full" style={{ width: '1.5%' }} /></div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={migrationProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Area type="monotone" dataKey="migrated" fill="hsl(160, 70%, 37%)" fillOpacity={0.2} stroke="hsl(160, 70%, 37%)" strokeWidth={2} name="PQC-Ready Assets" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <button onClick={() => toast.info('Bulk migration wizard opened')} className="px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">Start Bulk Migration</button>
        </div>
      )}

      {stage === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card rounded-lg border border-border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">NIST 2030</p>
              <p className="text-2xl font-bold text-amber">1,361 days</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">NSA CNSA 2.0</p>
              <p className="text-2xl font-bold text-coral">3,187 days</p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">EU Mandate</p>
              <p className="text-2xl font-bold text-amber">2,044 days</p>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold mb-2">Regression Alerts</h3>
            <p className="text-xs text-muted-foreground">No regressions detected. All PQC-migrated assets remain on approved algorithms.</p>
          </div>
          <button onClick={() => toast.success('Monthly PQC progress report downloaded')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted text-xs hover:bg-muted/80"><Download className="w-3 h-3" /> Download Monthly Report</button>
        </div>
      )}
    </div>
  );
}
