import React from 'react';
import { useNav } from '@/context/NavigationContext';
import { KPICard, SeverityBadge, AIInsightCard } from '@/components/shared/UIComponents';
import { compliancePosture } from '@/data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

const buCompliance = [
  { bu: 'Payments', DORA: 'red', 'PCI-DSS': 'red', 'NIS2': 'amber', HIPAA: 'green', 'FIPS': 'amber' },
  { bu: 'Platform', DORA: 'green', 'PCI-DSS': 'green', 'NIS2': 'green', HIPAA: 'green', 'FIPS': 'amber' },
  { bu: 'Infrastructure', DORA: 'amber', 'PCI-DSS': 'green', 'NIS2': 'amber', HIPAA: 'green', 'FIPS': 'red' },
  { bu: 'AI Engineering', DORA: 'amber', 'PCI-DSS': 'amber', 'NIS2': 'red', HIPAA: 'amber', 'FIPS': 'green' },
  { bu: 'Security Ops', DORA: 'green', 'PCI-DSS': 'green', 'NIS2': 'green', HIPAA: 'green', 'FIPS': 'green' },
];

const heatColors: Record<string, string> = { green: 'bg-teal/20 text-teal', amber: 'bg-amber/20 text-amber', red: 'bg-coral/20 text-coral' };

export default function ComplianceDashboard() {
  const { setCurrentPage, setFilters } = useNav();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">
        <KPICard label="Frameworks Active" value="6" color="teal" subtitle="DORA, PCI-DSS, NIS2, HIPAA, FIPS, FedRAMP" onClick={() => setCurrentPage('policy-builder')} />
        <KPICard label="Open Violations" value="28,412" color="coral" onClick={() => { setFilters({ type: 'compliance' }); setCurrentPage('trustops'); }} />
        <KPICard label="Evidence Packages Ready" value={12} color="teal" onClick={() => toast.success('Downloading evidence packages...')} />
        <KPICard label="Audit Items Due" value={847} color="amber" onClick={() => { setFilters({ type: 'audit' }); setCurrentPage('trustops'); }} />
        <KPICard label="PQC Compliance Gap" value="94%" color="coral" subtitle="4.4M assets non-PQC-ready" onClick={() => setCurrentPage('quantum')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Compliance Posture by Framework</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={compliancePosture}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="framework" tick={{ fontSize: 10 }} stroke="hsl(220, 9%, 46%)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(220, 9%, 46%)" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="compliant" stackId="a" fill="hsl(160, 70%, 37%)" name="Compliant" />
              <Bar dataKey="atRisk" stackId="a" fill="hsl(38, 78%, 41%)" name="At Risk" />
              <Bar dataKey="violated" stackId="a" fill="hsl(15, 72%, 52%)" name="Violated" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Business Unit × Compliance Framework</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium">Business Unit</th>
                {['DORA', 'PCI-DSS', 'NIS2', 'HIPAA', 'FIPS'].map(f => <th key={f} className="text-center py-2 text-muted-foreground font-medium">{f}</th>)}
              </tr>
            </thead>
            <tbody>
              {buCompliance.map(row => (
                <tr key={row.bu} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium">{row.bu}</td>
                  {['DORA', 'PCI-DSS', 'NIS2', 'HIPAA', 'FIPS'].map(f => (
                    <td key={f} className="text-center py-2">
                      <button onClick={() => { setFilters({ team: row.bu, framework: f }); setCurrentPage('inventory'); }} className={`inline-block w-6 h-6 rounded ${heatColors[(row as any)[f === 'FIPS' ? 'FIPS' : f]]}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Compliance Violations</h3>
          <div className="space-y-2 max-h-[250px] overflow-y-auto scrollbar-thin">
            {[
              { framework: 'DORA', asset: 'prod-payments-cert', rule: 'Max 90-day lifetime', severity: 'High' },
              { framework: 'PCI-DSS', asset: '*.payments.acmecorp.com', rule: 'Wildcard in CHD zone', severity: 'Critical' },
              { framework: 'DORA', asset: 'api-gateway-cert', rule: 'Unapproved CA', severity: 'High' },
              { framework: 'FIPS', asset: 'vault-internal', rule: 'Non-FIPS algorithm', severity: 'Critical' },
              { framework: 'HIPAA', asset: 'patient-data-key', rule: 'Missing rotation', severity: 'Medium' },
              { framework: 'DORA', asset: 'k8s-ingress-cert', rule: 'Max 90-day lifetime', severity: 'High' },
            ].map((v, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2 flex-1">
                  <SeverityBadge severity={v.severity} />
                  <div>
                    <p className="text-xs font-medium">{v.asset}</p>
                    <p className="text-[10px] text-muted-foreground">{v.framework} — {v.rule}</p>
                  </div>
                </div>
                <button onClick={() => toast.success('Evidence package generated')} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal font-medium hover:bg-teal/20 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Evidence
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Upcoming Audit Deadlines</h3>
          <div className="space-y-2">
            {[
              { framework: 'DORA RTS', deadline: '2026-06-30', completion: 72, actions: 8 },
              { framework: 'PCI-DSS v4.0', deadline: '2026-09-15', completion: 85, actions: 5 },
              { framework: 'HIPAA Annual', deadline: '2026-12-31', completion: 92, actions: 3 },
              { framework: 'FIPS 140-2', deadline: '2026-07-01', completion: 68, actions: 11 },
            ].map((a, i) => (
              <div key={i} className="py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded px-1" onClick={() => toast.info(`Audit checklist for ${a.framework}`)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{a.framework}</span>
                  <span className="text-[10px] text-muted-foreground">{a.deadline}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-teal rounded-full" style={{ width: `${a.completion}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{a.completion}%</span>
                  <span className="text-[10px] text-amber">{a.actions} remaining</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AIInsightCard>
        Based on your DORA RTS and NIS2 obligations, 3 certificates in the payments environment exceed the maximum 90-day lifetime requirement.
        Auto-generating evidence package for Q2 audit. 847 assets require ML-DSA migration before your Jun 2026 PCI-DSS review.
        AI agent identity governance gaps detected — 38% of agent tokens lack audit trail required by NIS2 Article 21.
      </AIInsightCard>
    </div>
  );
}
