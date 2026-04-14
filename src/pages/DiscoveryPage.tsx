import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { discoveryProfiles, discoveryRuns } from '@/data/mockData';
import { StatusBadge, Modal } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import { Plus, Play, Pause, Edit, Search, Globe, Server, Cloud, Key, Code, X, ChevronDown } from 'lucide-react';

const sourceIcons: Record<string, React.ElementType> = { CA: Globe, Network: Server, Cloud: Cloud, SSH: Key, 'Source code': Code };
const sourceOptions = ['CA', 'Network', 'Cloud', 'SSH', 'Source code'];
const scheduleOptions = ['Daily at 02:00 AM', 'Every 6 hours', 'Weekly on Sunday', 'Continuous', 'On-demand', 'Daily at 04:00 AM'];
const envOptions = ['All', 'Production', 'Staging', 'Development'];

interface ProfileForm {
  name: string;
  description: string;
  sources: string[];
  schedule: string;
  environment: string;
}

const emptyForm: ProfileForm = { name: '', description: '', sources: [], schedule: 'Daily at 02:00 AM', environment: 'All' };

export default function DiscoveryPage() {
  const { setCurrentPage } = useNav();
  const [tab, setTab] = useState<'profiles' | 'runs'>('profiles');
  const [editingProfile, setEditingProfile] = useState<ProfileForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmRun, setConfirmRun] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [runDetailId, setRunDetailId] = useState<string | null>(null);

  const openNewProfile = () => {
    setEditingProfile({ ...emptyForm });
    setEditingId(null);
  };

  const openEditProfile = (profile: typeof discoveryProfiles[0]) => {
    setEditingProfile({
      name: profile.name,
      description: profile.description,
      sources: [...profile.sources],
      schedule: profile.schedule,
      environment: 'All',
    });
    setEditingId(profile.id);
  };

  const saveProfile = () => {
    if (!editingProfile?.name) { toast.error('Profile name is required'); return; }
    toast.success(editingId ? `Profile "${editingProfile.name}" updated` : `Profile "${editingProfile.name}" created`);
    setEditingProfile(null);
    setEditingId(null);
  };

  const toggleSource = (s: string) => {
    if (!editingProfile) return;
    setEditingProfile(prev => prev ? {
      ...prev,
      sources: prev.sources.includes(s) ? prev.sources.filter(x => x !== s) : [...prev.sources, s]
    } : prev);
  };

  const filteredProfiles = discoveryProfiles.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedRun = discoveryRuns.find(r => r.id === runDetailId);

  // If editing a profile, show the form full-page
  if (editingProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{editingId ? 'Edit Discovery Profile' : 'New Discovery Profile'}</h1>
          <button onClick={() => setEditingProfile(null)} className="p-2 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 space-y-5 max-w-3xl">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Profile Name</label>
            <input
              type="text" value={editingProfile.name}
              onChange={e => setEditingProfile(p => p ? { ...p, name: e.target.value } : p)}
              placeholder="e.g. Production Full Scan"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
            <textarea
              value={editingProfile.description}
              onChange={e => setEditingProfile(p => p ? { ...p, description: e.target.value } : p)}
              rows={2}
              placeholder="What does this profile scan?"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-teal"
            />
          </div>

          {/* Sources */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Discovery Sources</label>
            <div className="flex flex-wrap gap-2">
              {sourceOptions.map(s => {
                const Icon = sourceIcons[s] || Globe;
                const selected = editingProfile.sources.includes(s);
                return (
                  <button key={s} onClick={() => toggleSource(s)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-colors ${selected ? 'bg-teal/10 border-teal text-teal' : 'bg-muted border-border text-muted-foreground hover:border-foreground/30'}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Schedule</label>
            <select
              value={editingProfile.schedule}
              onChange={e => setEditingProfile(p => p ? { ...p, schedule: e.target.value } : p)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal"
            >
              {scheduleOptions.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Environment */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Environment Scope</label>
            <div className="flex gap-2">
              {envOptions.map(e => (
                <button key={e} onClick={() => setEditingProfile(p => p ? { ...p, environment: e } : p)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${editingProfile.environment === e ? 'bg-teal/10 border-teal text-teal' : 'bg-muted border-border text-muted-foreground hover:border-foreground/30'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* AI Suggestion (optional) */}
          <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
            <button onClick={() => toast.info('AI analyzing environment for optimal scan scope...')} className="flex items-center gap-2 text-xs text-teal hover:underline">
              <span className="text-sm">✦</span> Let AI suggest optimal scan scope based on your environment
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button onClick={() => setEditingProfile(null)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Cancel</button>
            <button onClick={saveProfile} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">
              {editingId ? 'Save Changes' : 'Create Profile'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Discovery</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-xs w-56 focus:outline-none focus:ring-1 focus:ring-teal" />
          </div>
          <button onClick={openNewProfile} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">
            <Plus className="w-3 h-3" /> New Profile
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([['profiles', 'Profiles'], ['runs', 'Run History']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'profiles' && (
        <>
          {/* Active run banner */}
          <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <div><span className="text-xs font-semibold">Production Full Scan</span><span className="text-[10px] text-muted-foreground ml-2">4 sources · Started 3 min ago</span></div>
              <button onClick={() => toast.info('Run cancelled')} className="text-[10px] px-2 py-1 rounded border border-coral/30 text-coral hover:bg-coral/10">Cancel</button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-teal rounded-full animate-pulse" style={{ width: '35%' }} /></div>
              <span className="text-[10px] text-teal">35% · 109 assets · ~12 min</span>
            </div>
          </div>

          {/* Profiles table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  {['Profile Name', 'Sources', 'Schedule', 'Last Run', 'Assets Found', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map(profile => (
                  <tr key={profile.id} className="border-b border-border hover:bg-muted/30 cursor-pointer" onClick={() => openEditProfile(profile)}>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold">{profile.name}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">{profile.description}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1">
                        {profile.sources.map(s => {
                          const Icon = sourceIcons[s] || Globe;
                          return <div key={s} className="w-5 h-5 rounded bg-muted flex items-center justify-center" title={s}><Icon className="w-3 h-3 text-muted-foreground" /></div>;
                        })}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{profile.schedule}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{profile.lastRun}</td>
                    <td className="py-2.5 px-3 font-medium">{profile.assetsFound.toLocaleString()}</td>
                    <td className="py-2.5 px-3"><StatusBadge status={profile.status} /></td>
                    <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => setConfirmRun(profile.id)} className="p-1 rounded hover:bg-teal/10 text-teal" title="Run now"><Play className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openEditProfile(profile)} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => toast.success(`Profile ${profile.status === 'Active' ? 'paused' : 'resumed'}`)} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Pause"><Pause className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'runs' && (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                {['Run ID', 'Profile', 'Started By', 'Start Time', 'Duration', 'Sources', 'Discovered', 'New', 'Changed', 'Errors', 'Status'].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {discoveryRuns.map(run => (
                <tr key={run.id} className="border-b border-border hover:bg-muted/30 cursor-pointer" onClick={() => setRunDetailId(run.id)}>
                  <td className="py-2 px-3 font-mono text-[10px]">{run.id}</td>
                  <td className="py-2 px-3">{run.profile}</td>
                  <td className="py-2 px-3 text-muted-foreground">{run.startedBy}</td>
                  <td className="py-2 px-3 text-muted-foreground">{run.startTime}</td>
                  <td className="py-2 px-3 text-muted-foreground">{run.duration}</td>
                  <td className="py-2 px-3">{run.sources}</td>
                  <td className="py-2 px-3 font-medium">{run.assetsDiscovered.toLocaleString()}</td>
                  <td className="py-2 px-3 text-teal">{run.newAssets}</td>
                  <td className="py-2 px-3 text-amber">{run.changedAssets}</td>
                  <td className="py-2 px-3">{run.errors > 0 ? <span className="text-coral">{run.errors}</span> : '0'}</td>
                  <td className="py-2 px-3"><StatusBadge status={run.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm run modal */}
      <Modal open={!!confirmRun} onClose={() => setConfirmRun(null)} title="Confirm Discovery Run">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">This will scan 2,847 endpoints across 4 sources. Estimated time: 18 minutes.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmRun(null)} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted">Cancel</button>
            <button onClick={() => { setConfirmRun(null); toast.success('Discovery run started'); setTab('runs'); }} className="px-4 py-2 text-xs rounded-lg bg-teal text-primary-foreground hover:bg-teal-light">Proceed</button>
          </div>
        </div>
      </Modal>

      {/* Run detail modal */}
      <Modal open={!!runDetailId} onClose={() => setRunDetailId(null)} title={`Run Detail — ${selectedRun?.id || ''}`} wide>
        {selectedRun && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Assets Discovered', value: selectedRun.assetsDiscovered.toLocaleString() },
                { label: 'New Assets', value: selectedRun.newAssets.toString() },
                { label: 'Changed', value: selectedRun.changedAssets.toString() },
                { label: 'Errors', value: selectedRun.errors.toString() },
              ].map(s => (
                <div key={s.label} className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
              <p className="text-[10px] font-medium text-teal mb-1">✦ AI Findings</p>
              <p className="text-[10px] text-muted-foreground">Infinity AI flagged {selectedRun.newAssets} new assets. {selectedRun.errors > 0 ? `${selectedRun.errors} scan errors detected — review recommended.` : 'No anomalies detected in this run.'}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
