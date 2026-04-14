import React, { useState } from 'react';
import { useNav } from '@/context/NavigationContext';
import { discoveryRuns } from '@/data/mockData';
import { StatusBadge, Modal } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import { Search, Globe, Server, Cloud, Key, Code, RefreshCw, Info, ChevronDown } from 'lucide-react';

const discoveryFromOptions = ['Network', 'CA Connector', 'Cloud Provider', 'SSH Host Scan', 'Endpoint Agent', 'Kubernetes API'];

export default function DiscoveryPage() {
  const { setCurrentPage } = useNav();
  const [tab, setTab] = useState<'add' | 'status'>('add');
  
  // Form state
  const [runType, setRunType] = useState<'on-demand' | 'schedule'>('on-demand');
  const [instanceName, setInstanceName] = useState('');
  const [description, setDescription] = useState('');
  const [discoveryFrom, setDiscoveryFrom] = useState('Network');
  const [networkList, setNetworkList] = useState('');
  const [schedule, setSchedule] = useState('Daily at 02:00 AM');

  const [runDetailId, setRunDetailId] = useState<string | null>(null);
  const selectedRun = discoveryRuns.find(r => r.id === runDetailId);

  const handleDiscover = () => {
    if (!instanceName.trim()) {
      toast.error('Discovery Instance Name is required');
      return;
    }
    toast.success(`Discovery "${instanceName}" started`, { description: `Scanning via ${discoveryFrom}...` });
    setTab('status');
  };

  const handleReset = () => {
    setInstanceName('');
    setDescription('');
    setDiscoveryFrom('Network');
    setNetworkList('');
    setRunType('on-demand');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Discovery : {discoveryFrom} Scan : Add Discovery</h1>
        <button onClick={handleReset} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([['add', 'Add Discovery'], ['status', 'Discovery Status']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'add' && (
        <div className="max-w-3xl space-y-6">
          {/* Discover Details Section */}
          <div>
            <h2 className="text-sm font-semibold text-teal mb-4">Discover Details</h2>
            <div className="space-y-4">
              {/* Discovery Run Type */}
              <div className="flex items-center gap-4">
                <label className="text-xs text-muted-foreground w-40 text-right flex items-center gap-1">
                  <span className="text-coral">*</span> Discovery Run Type
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="radio" name="runType" checked={runType === 'on-demand'} onChange={() => setRunType('on-demand')} className="accent-teal" />
                    On-demand
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="radio" name="runType" checked={runType === 'schedule'} onChange={() => setRunType('schedule')} className="accent-teal" />
                    Schedule
                  </label>
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>

              {/* Schedule (only if scheduled) */}
              {runType === 'schedule' && (
                <div className="flex items-center gap-4">
                  <label className="text-xs text-muted-foreground w-40 text-right flex items-center gap-1">
                    <span className="text-coral">*</span> Schedule
                  </label>
                  <select
                    value={schedule}
                    onChange={e => setSchedule(e.target.value)}
                    className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                  >
                    {['Daily at 02:00 AM', 'Every 6 hours', 'Weekly on Sunday', 'Continuous', 'Daily at 04:00 AM'].map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Discovery Instance Name */}
              <div className="flex items-center gap-4">
                <label className="text-xs text-muted-foreground w-40 text-right flex items-center gap-1">
                  <span className="text-coral">*</span> Discovery Instance Name
                </label>
                <div className="flex-1 max-w-xs flex items-center gap-2">
                  <input
                    type="text"
                    value={instanceName}
                    onChange={e => setInstanceName(e.target.value)}
                    placeholder="Eg - Name"
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                  <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                </div>
              </div>

              {/* Description */}
              <div className="flex items-start gap-4">
                <label className="text-xs text-muted-foreground w-40 text-right pt-2">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional description for this discovery run"
                  className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-teal"
                />
              </div>
            </div>
          </div>

          {/* Discover By Section */}
          <div>
            <h2 className="text-sm font-semibold text-teal mb-4">Discover By</h2>
            <div className="bg-secondary/30 rounded-lg p-4 space-y-4">
              {/* Discovery From */}
              <div className="flex items-center gap-4">
                <label className="text-xs text-muted-foreground w-40 text-right flex items-center gap-1">
                  <span className="text-coral">*</span> Discovery From
                </label>
                <div className="flex-1 max-w-xs flex items-center gap-2">
                  <select
                    value={discoveryFrom}
                    onChange={e => setDiscoveryFrom(e.target.value)}
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                  >
                    {discoveryFromOptions.map(o => <option key={o}>{o}</option>)}
                  </select>
                  <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                </div>
              </div>

              {/* Network List / Target */}
              <div className="flex items-center gap-4">
                <label className="text-xs text-muted-foreground w-40 text-right flex items-center gap-1">
                  <span className="text-coral">*</span> {discoveryFrom === 'Network' ? 'Network List' : 'Target'}
                </label>
                <div className="flex-1 max-w-xs flex items-center gap-2">
                  <input
                    type="text"
                    value={networkList}
                    onChange={e => setNetworkList(e.target.value)}
                    placeholder={discoveryFrom === 'Network' ? '10.0.0.0/24, 192.168.1.0/24' : 'Enter target identifier'}
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                  <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={handleDiscover}
              className="px-6 py-2 rounded-lg bg-purple text-primary-foreground text-xs font-medium hover:bg-purple-light transition-colors"
            >
              Discover
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              Reset
            </button>
          </div>

          {/* AI Suggestion (optional) */}
          <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
            <button onClick={() => toast.info('AI analyzing environment for optimal scan scope...')} className="flex items-center gap-2 text-xs text-teal hover:underline">
              <span className="text-sm">✦</span> Let AI suggest optimal scan scope based on your environment
            </button>
          </div>
        </div>
      )}

      {tab === 'status' && (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-secondary/50">
              <tr className="border-b border-border">
                {['Run ID', 'Profile', 'Started By', 'Start Time', 'Duration', 'Sources', 'Discovered', 'New', 'Changed', 'Errors', 'Status'].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {discoveryRuns.map(run => (
                <tr key={run.id} className="border-b border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setRunDetailId(run.id)}>
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
                <div key={s.label} className="bg-secondary rounded-lg p-3 text-center">
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
