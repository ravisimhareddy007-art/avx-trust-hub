import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { discoveryProfiles, discoveryRuns } from '@/data/mockData';
import { StatusBadge, Modal } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import { Plus, Play, Pause, Edit, Search, Globe, Server, Cloud, Key, Code } from 'lucide-react';

const sourceIcons: Record<string, React.ElementType> = { CA: Globe, Network: Server, Cloud: Cloud, SSH: Key, 'Source code': Code };

export default function DiscoveryProfilesPage() {
  const { setCurrentPage } = useNav();
  const [confirmRun, setConfirmRun] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Discovery Profiles</h1>
        <div className="flex gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input type="text" placeholder="Search profiles..." className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-xs w-64 focus:outline-none focus:ring-1 focus:ring-teal" /></div>
          <button onClick={() => toast.info('New profile wizard opened')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light"><Plus className="w-3 h-3" /> New Profile</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {discoveryProfiles.map(profile => (
          <div key={profile.id} className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => toast.info(`Editing ${profile.name}`)}>
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xs font-semibold">{profile.name}</h3>
              <StatusBadge status={profile.status} />
            </div>
            <p className="text-[10px] text-muted-foreground mb-3 line-clamp-2">{profile.description}</p>
            <div className="flex gap-1.5 mb-3">
              {profile.sources.map(s => { const Icon = sourceIcons[s] || Globe; return <div key={s} className="w-6 h-6 rounded bg-muted flex items-center justify-center" title={s}><Icon className="w-3 h-3 text-muted-foreground" /></div>; })}
            </div>
            <div className="text-[10px] text-muted-foreground space-y-1 mb-3">
              <p>Schedule: {profile.schedule}</p>
              <p>Last run: {profile.lastRun} · {profile.assetsFound.toLocaleString()} assets</p>
            </div>
            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
              <button onClick={() => setConfirmRun(profile.id)} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20"><Play className="w-3 h-3" /> Run now</button>
              <button onClick={() => toast.info(`Editing ${profile.name}`)} className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80"><Edit className="w-3 h-3" /></button>
              <button onClick={() => toast.success(`Profile ${profile.status === 'Active' ? 'paused' : 'resumed'}`)} className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80"><Pause className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!confirmRun} onClose={() => setConfirmRun(null)} title="Confirm Discovery Run">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">This will scan 2,847 endpoints across 4 sources. Estimated time: 18 minutes.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmRun(null)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Cancel</button>
            <button onClick={() => { setConfirmRun(null); toast.success('Discovery run started'); setCurrentPage('discovery-runs'); }} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Proceed</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
