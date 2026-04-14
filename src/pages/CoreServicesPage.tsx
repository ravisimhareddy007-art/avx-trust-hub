import React, { useState } from 'react';
import { connectors } from '@/data/mockData';
import { StatusBadge } from '@/components/shared/UIComponents';
import { toast } from 'sonner';
import { Zap, Link2, BarChart3, ExternalLink, Plus, Play, Download, FileText, Settings } from 'lucide-react';

export default function CoreServicesPage() {
  const [tab, setTab] = useState<'automation' | 'integrations' | 'reporting' | 'self-service'>('automation');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Core Services</h1>
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'automation' as const, label: 'Automation Engine', icon: Zap },
          { id: 'integrations' as const, label: 'Integration Hub', icon: Link2 },
          { id: 'reporting' as const, label: 'Reporting & Insights', icon: BarChart3 },
          { id: 'self-service' as const, label: 'Self-Service Portals', icon: ExternalLink },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === t.id ? 'border-teal text-teal' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-3 h-3" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'automation' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Workflow Templates</h3>
          <div className="grid grid-cols-2 gap-3">
            {['Certificate Renewal Workflow', 'SSH Key Rotation Workflow', 'Onboarding New Application', 'PQC Migration Batch Workflow'].map(name => (
              <div key={name} className="bg-card rounded-lg border border-border p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => toast.info(`Loading ${name} into canvas`)}>
                <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-teal" /><h4 className="text-xs font-semibold">{name}</h4></div>
                <p className="text-[10px] text-muted-foreground">Click to load into visual workflow builder</p>
              </div>
            ))}
          </div>
          <div className="bg-card rounded-lg border border-border p-8 text-center">
            <div className="border-2 border-dashed border-border rounded-lg p-12"><p className="text-sm text-muted-foreground">Visual Workflow Canvas</p><p className="text-[10px] text-muted-foreground mt-1">Select a template above or drag nodes from the palette to build a workflow</p></div>
          </div>
        </div>
      )}

      {tab === 'integrations' && (
        <div className="space-y-6">
          {Object.entries({ 'Certificate Authorities': connectors.ca, 'Cloud / KMS': connectors.cloud, 'ITSM / Ticketing': connectors.itsm, 'Infrastructure / ADC': connectors.infrastructure, 'DevOps / CI-CD': connectors.devops, 'HSM': connectors.hsm }).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3">{category}</h3>
              <div className="grid grid-cols-3 gap-3">
                {items.map(item => (
                  <div key={item.name} className="bg-card rounded-lg border border-border p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.status === 'connected' ? 'bg-teal' : 'bg-muted-foreground'}`} />
                      <div>
                        <p className="text-xs font-medium">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">Last sync: {item.lastSync}{item.assets > 0 ? ` · ${item.assets.toLocaleString()} assets` : ''}</p>
                      </div>
                    </div>
                    <button onClick={() => toast.info(`${item.status === 'connected' ? 'Configuring' : 'Connecting'} ${item.name}`)} className={`text-[10px] px-2 py-1 rounded ${item.status === 'connected' ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'bg-teal text-primary-foreground hover:bg-teal-light'}`}>
                      {item.status === 'connected' ? 'Configure' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'reporting' && (
        <div className="grid grid-cols-3 gap-4">
          {['Certificate Posture Report', 'SSH Key Audit Report', 'Compliance Evidence Package', 'PQC Readiness Report', 'Executive Summary'].map(name => (
            <div key={name} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-teal" /><h4 className="text-xs font-semibold">{name}</h4></div>
              <p className="text-[10px] text-muted-foreground mb-3">Last generated: 2 days ago</p>
              <div className="flex gap-2">
                <button onClick={() => toast.success(`Generating ${name}...`)} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20"><Download className="w-3 h-3" /> Generate</button>
                <button onClick={() => toast.info('Schedule configured')} className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80">Schedule</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'self-service' && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={() => toast.info('New portal wizard opened')} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal text-primary-foreground text-xs hover:bg-teal-light"><Plus className="w-3 h-3" /> New Portal</button></div>
          <div className="grid grid-cols-3 gap-4">
            {['Certificate Request Portal — Dev Team', 'SSH Key Request — Engineering', 'Application Onboarding'].map(name => (
              <div key={name} className="bg-card rounded-lg border border-border p-4">
                <h4 className="text-xs font-semibold mb-2">{name}</h4>
                <p className="text-[10px] text-muted-foreground mb-3">Published · 124 requests this month</p>
                <div className="flex gap-2">
                  <button onClick={() => toast.info('Opening portal editor')} className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80">Edit</button>
                  <button onClick={() => { navigator.clipboard.writeText('https://portal.avxone.com/' + name.split(' ')[0].toLowerCase()); toast.success('Portal URL copied'); }} className="text-[10px] px-2 py-1 rounded bg-teal/10 text-teal hover:bg-teal/20">Copy URL</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
