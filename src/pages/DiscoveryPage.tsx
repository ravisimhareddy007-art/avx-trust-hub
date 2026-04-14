import React, { useState } from 'react';
import { discoveryRuns } from '@/data/mockData';
import { StatusBadge, Modal } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import { Search, RefreshCw, Info, Plus, Play } from 'lucide-react';

const scanTypes = ['Network Scan', 'CA Connector Scan', 'Cloud Provider Scan', 'SSH Host Scan', 'Kubernetes API Scan', 'Endpoint Agent Scan'];
const portPresets = ['443', '8443', '636', '993', '995', '22', 'Custom'];

export default function DiscoveryPage() {
  const [tab, setTab] = useState<'add' | 'status'>('add');

  // Form state
  const [runType, setRunType] = useState<'on-demand' | 'schedule'>('on-demand');
  const [scanType, setScanType] = useState('Network Scan');
  const [instanceName, setInstanceName] = useState('');
  const [description, setDescription] = useState('');

  // Network-specific
  const [ipRanges, setIpRanges] = useState('');
  const [ports, setPorts] = useState('443, 8443');
  const [excludeIPs, setExcludeIPs] = useState('');
  const [timeout, setTimeout] = useState('30');
  const [threads, setThreads] = useState('10');

  // Schedule
  const [scheduleFreq, setScheduleFreq] = useState('Daily');
  const [scheduleTime, setScheduleTime] = useState('02:00');
  const [scheduleDay, setScheduleDay] = useState('Sunday');

  // Status tab
  const [runDetailId, setRunDetailId] = useState<string | null>(null);
  const selectedRun = discoveryRuns.find(r => r.id === runDetailId);

  const handleDiscover = () => {
    if (!instanceName.trim()) { toast.error('Discovery name is required'); return; }
    if (scanType === 'Network Scan' && !ipRanges.trim()) { toast.error('IP ranges are required for network scan'); return; }
    toast.success(`Discovery "${instanceName}" started`, { description: `${scanType} scanning ${ipRanges || 'targets'}...` });
    setTab('status');
  };

  const handleReset = () => {
    setInstanceName(''); setDescription(''); setScanType('Network Scan');
    setIpRanges(''); setPorts('443, 8443'); setExcludeIPs('');
    setTimeout('30'); setThreads('10'); setRunType('on-demand');
  };

  const isNetworkScan = scanType === 'Network Scan' || scanType === 'SSH Host Scan';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Discovery</h1>
        <button onClick={handleReset} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([['add', 'Add Discovery'], ['status', 'Discovery Runs']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'add' && (
        <div className="max-w-3xl space-y-6">
          {/* Discovery Details */}
          <div>
            <h2 className="text-sm font-semibold text-teal mb-4">Discovery Details</h2>
            <div className="space-y-3">
              <FormRow label="Discovery Run Type" required>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="radio" name="runType" checked={runType === 'on-demand'} onChange={() => setRunType('on-demand')} className="accent-teal" /> On-demand
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="radio" name="runType" checked={runType === 'schedule'} onChange={() => setRunType('schedule')} className="accent-teal" /> Scheduled
                  </label>
                </div>
              </FormRow>

              <FormRow label="Discovery Name" required>
                <input type="text" value={instanceName} onChange={e => setInstanceName(e.target.value)}
                  placeholder="e.g. Production Network Scan"
                  className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
              </FormRow>

              <FormRow label="Scan Type" required>
                <select value={scanType} onChange={e => setScanType(e.target.value)}
                  className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
                  {scanTypes.map(s => <option key={s}>{s}</option>)}
                </select>
              </FormRow>

              <FormRow label="Description">
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  placeholder="Optional description"
                  className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-teal" />
              </FormRow>
            </div>
          </div>

          {/* Schedule Section */}
          {runType === 'schedule' && (
            <div>
              <h2 className="text-sm font-semibold text-teal mb-4">Schedule Configuration</h2>
              <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
                <FormRow label="Frequency" required>
                  <select value={scheduleFreq} onChange={e => setScheduleFreq(e.target.value)}
                    className="max-w-[160px] px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
                    {['Every 6 hours', 'Daily', 'Weekly', 'Monthly'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </FormRow>
                <FormRow label="Time (UTC)" required>
                  <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                    className="max-w-[120px] px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
                </FormRow>
                {scheduleFreq === 'Weekly' && (
                  <FormRow label="Day" required>
                    <select value={scheduleDay} onChange={e => setScheduleDay(e.target.value)}
                      className="max-w-[140px] px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </FormRow>
                )}
              </div>
            </div>
          )}

          {/* Scan Configuration */}
          {isNetworkScan && (
            <div>
              <h2 className="text-sm font-semibold text-teal mb-4">Network Configuration</h2>
              <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
                <FormRow label="IP Ranges / Subnets" required>
                  <textarea value={ipRanges} onChange={e => setIpRanges(e.target.value)} rows={3}
                    placeholder={"10.0.0.0/24\n192.168.1.0/24\n172.16.0.1-172.16.0.254"}
                    className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground font-mono resize-none focus:outline-none focus:ring-1 focus:ring-teal" />
                </FormRow>

                <FormRow label="Exclude IPs">
                  <input type="text" value={excludeIPs} onChange={e => setExcludeIPs(e.target.value)}
                    placeholder="10.0.0.1, 10.0.0.254"
                    className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-teal" />
                </FormRow>

                <FormRow label="Ports" required>
                  <div className="space-y-2 flex-1 max-w-xs">
                    <input type="text" value={ports} onChange={e => setPorts(e.target.value)}
                      placeholder="443, 8443, 636, 22"
                      className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-teal" />
                    <div className="flex gap-1 flex-wrap">
                      {portPresets.filter(p => p !== 'Custom').map(p => (
                        <button key={p} onClick={() => setPorts(prev => prev.includes(p) ? prev : prev ? `${prev}, ${p}` : p)}
                          className="px-2 py-0.5 text-[10px] rounded bg-muted border border-border hover:bg-secondary text-muted-foreground">
                          +{p}
                        </button>
                      ))}
                    </div>
                  </div>
                </FormRow>

                <div className="grid grid-cols-2 gap-4">
                  <FormRow label="Timeout (sec)">
                    <input type="number" value={timeout} onChange={e => setTimeout(e.target.value)} min="5" max="300"
                      className="w-20 px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
                  </FormRow>
                  <FormRow label="Threads">
                    <input type="number" value={threads} onChange={e => setThreads(e.target.value)} min="1" max="50"
                      className="w-20 px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
                  </FormRow>
                </div>
              </div>
            </div>
          )}

          {/* Non-network scan targets */}
          {!isNetworkScan && (
            <div>
              <h2 className="text-sm font-semibold text-teal mb-4">Target Configuration</h2>
              <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
                <FormRow label={scanType.includes('CA') ? 'CA Instance' : scanType.includes('Cloud') ? 'Cloud Account' : scanType.includes('Kubernetes') ? 'Cluster' : 'Target'} required>
                  <input type="text" value={ipRanges} onChange={e => setIpRanges(e.target.value)}
                    placeholder={scanType.includes('CA') ? 'DigiCert CertCentral' : scanType.includes('Cloud') ? 'AWS Account ID' : scanType.includes('Kubernetes') ? 'eks-prod-cluster' : 'Target identifier'}
                    className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
                </FormRow>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button onClick={handleDiscover}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-medium hover:bg-teal-light transition-colors">
              <Play className="w-3.5 h-3.5" /> Start Discovery
            </button>
            <button onClick={handleReset}
              className="px-6 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
              Reset
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
          </div>
        )}
      </Modal>
    </div>
  );
}

function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <label className="text-xs text-muted-foreground w-40 text-right pt-2 flex items-center justify-end gap-1 flex-shrink-0">
        {required && <span className="text-coral">*</span>} {label}
      </label>
      {children}
    </div>
  );
}
