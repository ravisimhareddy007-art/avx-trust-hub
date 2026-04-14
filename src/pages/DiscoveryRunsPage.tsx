import React from 'react';
import { discoveryRuns } from '@/data/mockData';
import { StatusBadge } from '@/components/shared/UIComponents';
import { toast } from 'sonner';

export default function DiscoveryRunsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Discovery Runs</h1>
        <button onClick={() => toast.info('Starting new run...')} className="px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light">New Run</button>
      </div>
      {/* Active run */}
      <div className="bg-teal/5 border border-teal/20 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div><p className="text-xs font-semibold">Production Full Scan</p><p className="text-[10px] text-muted-foreground">4 sources · Started 3 min ago</p></div>
          <button onClick={() => toast.info('Run cancelled')} className="text-[10px] px-2 py-1 rounded border border-coral/30 text-coral hover:bg-coral/10">Cancel</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-teal rounded-full animate-pulse" style={{ width: '35%' }} /></div>
          <span className="text-[10px] text-teal">35% · 109 assets found · ~12 min remaining</span>
        </div>
      </div>
      {/* Runs table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50"><tr className="border-b border-border">
            {['Run ID', 'Profile', 'Started By', 'Start Time', 'Duration', 'Sources', 'Discovered', 'New', 'Changed', 'Errors', 'Status'].map(h => (
              <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {discoveryRuns.map(run => (
              <tr key={run.id} className="border-b border-border hover:bg-muted/30 cursor-pointer" onClick={() => toast.info(`Viewing run ${run.id} details`)}>
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
    </div>
  );
}
