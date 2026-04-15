import React, { useState } from 'react';
import { discoveryRuns } from '@/data/mockData';
import { StatusBadge, Modal } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import { Search, RefreshCw, Info, Plus, Play, Upload, Database } from 'lucide-react';

const scanTypes = [
  { value: 'Network Scan', label: 'Network Scan', description: 'TCP/TLS handshake scan across IP ranges and ports' },
  { value: 'CA Connector Scan', label: 'CA Connector Scan', description: 'Poll CAs (DigiCert, Entrust, MSCA) for issued certificates' },
  { value: 'Cloud Provider Scan', label: 'Cloud Provider Scan', description: 'AWS ACM, Azure Key Vault, GCP Certificate Manager' },
  { value: 'SSH Host Scan', label: 'SSH Host Scan', description: 'Discover SSH keys and host certificates via SSH handshake' },
  { value: 'Kubernetes API Scan', label: 'Kubernetes API Scan', description: 'cert-manager, Istio Citadel, SPIFFE/SPIRE workload certs' },
  { value: 'Endpoint Agent Scan', label: 'Endpoint Agent Scan', description: 'Agent-based scan of local keystores and file systems' },
  { value: 'CT Log Monitor', label: 'CT Log Monitor', description: 'Monitor Certificate Transparency logs for your domains' },
  { value: 'Source Code Scan', label: 'Source Code Scan', description: 'Scan repos for embedded certs, keys, and secrets' },
  { value: 'CMDB / ETL Import', label: 'CMDB / ETL Import', description: 'Import from Nessus, Tenable, Qualys, or custom CMDB exports' },
];

const cmdbSources = [
  { value: 'nessus', label: 'Tenable Nessus', format: 'CSV / XML export' },
  { value: 'tenable-io', label: 'Tenable.io', format: 'API connector or CSV' },
  { value: 'qualys', label: 'Qualys VMDR', format: 'CSV / XML export' },
  { value: 'servicenow-cmdb', label: 'ServiceNow CMDB', format: 'REST API or CSV' },
  { value: 'rapid7', label: 'Rapid7 InsightVM', format: 'CSV / XML export' },
  { value: 'custom-csv', label: 'Custom CSV / JSON', format: 'Upload file' },
];

const portPresets = ['443', '8443', '636', '993', '995', '22', 'Custom'];

export default function DiscoveryPage() {
  const [tab, setTab] = useState<'add' | 'status'>('add');
  const [runType, setRunType] = useState<'on-demand' | 'schedule'>('on-demand');
  const [scanType, setScanType] = useState('Network Scan');
  const [instanceName, setInstanceName] = useState('');
  const [description, setDescription] = useState('');
  const [ipRanges, setIpRanges] = useState('');
  const [ports, setPorts] = useState('443, 8443');
  const [excludeIPs, setExcludeIPs] = useState('');
  const [timeout, setTimeout] = useState('30');
  const [threads, setThreads] = useState('10');
  const [scheduleFreq, setScheduleFreq] = useState('Daily');
  const [scheduleTime, setScheduleTime] = useState('02:00');
  const [scheduleDay, setScheduleDay] = useState('Sunday');
  const [runDetailId, setRunDetailId] = useState<string | null>(null);
  // CMDB state
  const [cmdbSource, setCmdbSource] = useState('nessus');
  const [cmdbFile, setCmdbFile] = useState<string>('');
  const [cmdbApiUrl, setCmdbApiUrl] = useState('');
  const [cmdbMapping, setCmdbMapping] = useState('auto');

  const selectedRun = discoveryRuns.find(r => r.id === runDetailId);

  const handleDiscover = () => {
    if (!instanceName.trim()) { toast.error('Discovery name is required'); return; }
    if (scanType === 'CMDB / ETL Import') {
      toast.success(`CMDB import "${instanceName}" started`, { description: `Importing from ${cmdbSources.find(s => s.value === cmdbSource)?.label}...` });
    } else if (isNetworkScan && !ipRanges.trim()) {
      toast.error('IP ranges are required for network scan'); return;
    } else {
      toast.success(`Discovery "${instanceName}" started`, { description: `${scanType} scanning...` });
    }
    setTab('status');
  };

  const handleReset = () => {
    setInstanceName(''); setDescription(''); setScanType('Network Scan');
    setIpRanges(''); setPorts('443, 8443'); setExcludeIPs('');
    setTimeout('30'); setThreads('10'); setRunType('on-demand');
    setCmdbSource('nessus'); setCmdbFile(''); setCmdbApiUrl('');
  };

  const isNetworkScan = scanType === 'Network Scan' || scanType === 'SSH Host Scan';
  const isCMDB = scanType === 'CMDB / ETL Import';
  const isConnectorScan = ['CA Connector Scan', 'Cloud Provider Scan', 'Kubernetes API Scan', 'CT Log Monitor'].includes(scanType);

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
              <FormRow label="Run Type" required>
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
                <input type="text" value={instanceName} onChange={e => setInstanceName(e.target.value)} placeholder="e.g. Production Network Scan"
                  className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
              </FormRow>

              <FormRow label="Scan Type" required>
                <select value={scanType} onChange={e => setScanType(e.target.value)}
                  className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal">
                  {scanTypes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </FormRow>

              {/* Scan type description */}
              <div className="ml-44">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" /> {scanTypes.find(s => s.value === scanType)?.description}
                </p>
              </div>

              <FormRow label="Description">
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional description"
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
                    className="max-w-[160px] px-3 py-2 bg-muted border border-border rounded text-xs text-foreground">
                    {['Every 6 hours', 'Daily', 'Weekly', 'Monthly'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </FormRow>
                <FormRow label="Time (UTC)" required>
                  <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                    className="max-w-[120px] px-3 py-2 bg-muted border border-border rounded text-xs text-foreground" />
                </FormRow>
                {scheduleFreq === 'Weekly' && (
                  <FormRow label="Day" required>
                    <select value={scheduleDay} onChange={e => setScheduleDay(e.target.value)}
                      className="max-w-[140px] px-3 py-2 bg-muted border border-border rounded text-xs text-foreground">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </FormRow>
                )}
              </div>
            </div>
          )}

          {/* Network Config */}
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
                  <input type="text" value={excludeIPs} onChange={e => setExcludeIPs(e.target.value)} placeholder="10.0.0.1, 10.0.0.254"
                    className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-teal" />
                </FormRow>
                <FormRow label="Ports" required>
                  <div className="space-y-2 flex-1 max-w-xs">
                    <input type="text" value={ports} onChange={e => setPorts(e.target.value)} placeholder="443, 8443, 636, 22"
                      className="w-full px-3 py-2 bg-muted border border-border rounded text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-teal" />
                    <div className="flex gap-1 flex-wrap">
                      {portPresets.filter(p => p !== 'Custom').map(p => (
                        <button key={p} onClick={() => setPorts(prev => prev.includes(p) ? prev : prev ? `${prev}, ${p}` : p)}
                          className="px-2 py-0.5 text-[10px] rounded bg-muted border border-border hover:bg-secondary text-muted-foreground">+{p}</button>
                      ))}
                    </div>
                  </div>
                </FormRow>
                <div className="grid grid-cols-2 gap-4">
                  <FormRow label="Timeout (sec)">
                    <input type="number" value={timeout} onChange={e => setTimeout(e.target.value)} min="5" max="300"
                      className="w-20 px-3 py-2 bg-muted border border-border rounded text-xs text-foreground" />
                  </FormRow>
                  <FormRow label="Threads">
                    <input type="number" value={threads} onChange={e => setThreads(e.target.value)} min="1" max="50"
                      className="w-20 px-3 py-2 bg-muted border border-border rounded text-xs text-foreground" />
                  </FormRow>
                </div>
              </div>
            </div>
          )}

          {/* CMDB / ETL Import Config */}
          {isCMDB && (
            <div>
              <h2 className="text-sm font-semibold text-teal mb-4 flex items-center gap-2"><Database className="w-4 h-4" /> CMDB / ETL Import Configuration</h2>
              <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
                <FormRow label="Data Source" required>
                  <select value={cmdbSource} onChange={e => setCmdbSource(e.target.value)}
                    className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground">
                    {cmdbSources.map(s => <option key={s.value} value={s.value}>{s.label} ({s.format})</option>)}
                  </select>
                </FormRow>

                {(cmdbSource === 'tenable-io' || cmdbSource === 'servicenow-cmdb') ? (
                  <>
                    <FormRow label="API Endpoint" required>
                      <input type="text" value={cmdbApiUrl} onChange={e => setCmdbApiUrl(e.target.value)}
                        placeholder={cmdbSource === 'tenable-io' ? 'https://cloud.tenable.com' : 'https://instance.service-now.com'}
                        className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-teal" />
                    </FormRow>
                    <FormRow label="Auth Method">
                      <select className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground">
                        <option>API Key / Secret</option><option>OAuth 2.0</option><option>Basic Auth</option>
                      </select>
                    </FormRow>
                  </>
                ) : (
                  <>
                    <FormRow label="Upload File" required>
                      <div className="flex-1 max-w-xs">
                        <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-teal/50 transition-colors cursor-pointer">
                          <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                          <p className="text-xs text-muted-foreground">Drop CSV, XML, or JSON file here</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {cmdbSource === 'nessus' && 'Nessus .nessus XML or CSV export'}
                            {cmdbSource === 'qualys' && 'Qualys VMDR CSV or XML export'}
                            {cmdbSource === 'rapid7' && 'InsightVM CSV or XML report'}
                            {cmdbSource === 'custom-csv' && 'Custom CSV or JSON with header mapping'}
                          </p>
                          <input type="file" className="hidden" accept=".csv,.xml,.json,.nessus" />
                        </div>
                      </div>
                    </FormRow>
                  </>
                )}

                <FormRow label="Field Mapping">
                  <select value={cmdbMapping} onChange={e => setCmdbMapping(e.target.value)}
                    className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground">
                    <option value="auto">Auto-detect (recommended)</option>
                    <option value="manual">Manual mapping</option>
                  </select>
                </FormRow>

                <FormRow label="Asset Dedup">
                  <select className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground">
                    <option>Match by CN + Serial</option>
                    <option>Match by Fingerprint</option>
                    <option>Match by IP + Port</option>
                    <option>No deduplication</option>
                  </select>
                </FormRow>

                <div className="bg-teal/5 border border-teal/20 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground">
                    <strong className="text-teal">Note:</strong> Vulnerability scanner data (Nessus, Tenable, Qualys) contains certificate findings from scan results — not from IP range scans. 
                    The import extracts crypto assets from vulnerability assessment data and normalizes them into the unified inventory.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Connector scan targets */}
          {isConnectorScan && (
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

          {/* Source Code / Endpoint Agent */}
          {(scanType === 'Source Code Scan' || scanType === 'Endpoint Agent Scan') && (
            <div>
              <h2 className="text-sm font-semibold text-teal mb-4">Target Configuration</h2>
              <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
                <FormRow label={scanType === 'Source Code Scan' ? 'Repository URL' : 'Agent Group'} required>
                  <input type="text" value={ipRanges} onChange={e => setIpRanges(e.target.value)}
                    placeholder={scanType === 'Source Code Scan' ? 'https://github.com/org/repo' : 'production-agents'}
                    className="flex-1 max-w-xs px-3 py-2 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
                </FormRow>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={handleDiscover}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-teal text-primary-foreground text-xs font-medium hover:bg-teal-light">
              {isCMDB ? <Upload className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isCMDB ? 'Start Import' : 'Start Discovery'}
            </button>
            <button onClick={handleReset} className="px-6 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary">Reset</button>
          </div>
        </div>
      )}

      {tab === 'status' && (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-secondary/50">
              <tr className="border-b border-border">
                {['Run ID', 'Profile / Type', 'Method', 'Started By', 'Start Time', 'Duration', 'Sources', 'Discovered', 'New', 'Changed', 'Errors', 'Status'].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {discoveryRuns.map(run => (
                <tr key={run.id} className="border-b border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setRunDetailId(run.id)}>
                  <td className="py-2 px-3 font-mono text-[10px]">{run.id}</td>
                  <td className="py-2 px-3">{run.profile}</td>
                  <td className="py-2 px-3 text-muted-foreground">{run.scanType || 'Network Scan'}</td>
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
            {selectedRun.scanType && (
              <div className="text-xs text-muted-foreground">
                <p>Scan Type: <span className="text-foreground font-medium">{selectedRun.scanType}</span></p>
                {selectedRun.target && <p>Target: <span className="text-foreground font-medium">{selectedRun.target}</span></p>}
              </div>
            )}
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
