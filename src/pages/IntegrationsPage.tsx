import React from 'react';
import { connectors } from '@/data/mockData';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { useState } from 'react';

export default function IntegrationsPage() {
  const [search, setSearch] = useState('');

  const categories = {
    'Certificate Authorities': connectors.ca,
    'Cloud / KMS': connectors.cloud,
    'ITSM / Ticketing': connectors.itsm,
    'Infrastructure / ADC': connectors.infrastructure,
    'DevOps / CI-CD': connectors.devops,
    'HSM': connectors.hsm,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Integrations</h1>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search integrations..."
            className="w-full pl-8 pr-3 py-1.5 bg-muted border border-border rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal" />
        </div>
      </div>

      {Object.entries(categories).map(([category, items]) => {
        const filtered = search ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : items;
        if (filtered.length === 0) return null;
        return (
          <div key={category}>
            <h3 className="text-sm font-semibold mb-3">{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(item => (
                <div key={item.name} className="bg-card rounded-lg border border-border p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.status === 'connected' ? 'bg-teal' : 'bg-muted-foreground'}`} />
                    <div>
                      <p className="text-xs font-medium">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">Last sync: {item.lastSync}{item.assets > 0 ? ` · ${item.assets.toLocaleString()} assets` : ''}</p>
                    </div>
                  </div>
                  <button onClick={() => toast.info(`${item.status === 'connected' ? 'Configuring' : 'Connecting'} ${item.name}`)}
                    className={`text-[10px] px-2 py-1 rounded ${item.status === 'connected' ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'bg-teal text-primary-foreground hover:bg-teal-light'}`}>
                    {item.status === 'connected' ? 'Configure' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
