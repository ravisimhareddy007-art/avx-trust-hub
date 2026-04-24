import React, { useState } from 'react';
import { users, auditLog } from '@/data/mockData';
import { StatusBadge } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import { Plus, Upload, Search } from 'lucide-react';

export default function SettingsPage({ initialTab = 'users' }: { initialTab?: 'users' | 'licenses' | 'audit' }) {
  const [tab, setTab] = useState<'users' | 'licenses' | 'audit'>(initialTab);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'users' as const, label: 'User Management & RBAC' },
          { id: 'licenses' as const, label: 'Licenses' },
          { id: 'audit' as const, label: 'Audit Log' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === t.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={() => toast.info('Invite user modal opened')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light"><Plus className="w-3 h-3" /> Invite User</button></div>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50"><tr className="border-b border-border">
                {['Name', 'Email', 'Role', 'Last Login', 'Status'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
              </tr></thead>
              <tbody>
                {users.map((user, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30 cursor-pointer" onClick={() => toast.info(`Viewing ${user.name}'s profile`)}>
                    <td className="py-2 px-3 font-medium">{user.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{user.email}</td>
                    <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full bg-teal/10 text-teal text-[10px]">{user.role}</span></td>
                    <td className="py-2 px-3 text-muted-foreground">{user.lastLogin}</td>
                    <td className="py-2 px-3"><StatusBadge status={user.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'licenses' && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-sm font-semibold mb-4">License: AVX Trust Enterprise</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div><p className="text-muted-foreground">Tier</p><p className="font-medium">Enterprise</p></div>
              <div><p className="text-muted-foreground">Expiry</p><p className="font-medium">December 31, 2027</p></div>
            </div>
            <h4 className="text-xs font-semibold mt-6 mb-3">Modules</h4>
            <div className="space-y-2">
              {[
                { name: 'CLM/PKI', status: 'Active', usage: 82 }, { name: 'SSH', status: 'Active', usage: 67 },
                { name: 'Kubernetes', status: 'Active', usage: 45 }, { name: 'Code Signing', status: 'Active', usage: 23 },
                { name: 'QTH (Quantum Trust Hub)', status: 'In Development', usage: 0 },
                { name: 'Eos (AI Identity)', status: 'Planned — Dec 2026', usage: 0 },
              ].map(m => (
                <div key={m.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{m.name}</span>
                    <StatusBadge status={m.status === 'Active' ? 'Active' : m.status.includes('Development') ? 'In progress' : 'Scheduled'} />
                  </div>
                  {m.usage > 0 && (
                    <div className="flex items-center gap-2 w-32">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-teal rounded-full" style={{ width: `${m.usage}%` }} /></div>
                      <span className="text-[10px] text-muted-foreground">{m.usage}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => toast.info('Expansion request submitted')} className="mt-4 px-3 py-2 rounded-lg bg-muted text-xs hover:bg-muted/80">Request Expansion</button>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input type="text" placeholder="Search audit log..." className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-xs w-64 focus:outline-none focus:ring-1 focus:ring-teal" /></div>
            <button onClick={() => toast.success('Audit log exported')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted text-xs hover:bg-muted/80"><Upload className="w-3 h-3" /> Export CSV</button>
          </div>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50"><tr className="border-b border-border">
                {['Timestamp', 'User', 'Action', 'Asset', 'IP Address', 'Result'].map(h => <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>)}
              </tr></thead>
              <tbody>
                {auditLog.map((entry, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2 px-3 text-muted-foreground font-mono text-[10px]">{entry.timestamp}</td>
                    <td className="py-2 px-3">{entry.user}</td>
                    <td className="py-2 px-3">{entry.action}</td>
                    <td className="py-2 px-3 text-muted-foreground">{entry.asset}</td>
                    <td className="py-2 px-3 text-muted-foreground font-mono">{entry.ip}</td>
                    <td className="py-2 px-3"><span className="text-teal">{entry.result}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
