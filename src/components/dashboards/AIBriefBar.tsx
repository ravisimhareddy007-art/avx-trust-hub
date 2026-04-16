import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNav } from '@/context/NavigationContext';

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

interface Bullet {
  severity: 'coral' | 'amber' | 'teal';
  impact: string;
  action: string;
  page: string;
  filters?: Record<string, string>;
}

const bullets: Bullet[] = [
  {
    severity: 'coral',
    impact: '3 wildcard certs expire today (14 dependent services, auto-renewal off)',
    action: 'Renew now',
    page: 'remediation',
    filters: { module: 'clm', filter: 'expiry' },
  },
  {
    severity: 'amber',
    impact: 'Unsponsored AI agent tokens up 12% WoW (new LangChain pipeline in payments)',
    action: 'Assign sponsors',
    page: 'inventory',
    filters: { type: 'AI Agent Token', hasOwner: 'false' },
  },
  {
    severity: 'teal',
    impact: 'Replacing weak algorithms across 6,398 assets cuts ECRS by 12 points',
    action: 'Plan PQC migration',
    page: 'quantum',
  },
];

const dotColor: Record<Bullet['severity'], string> = {
  coral: 'bg-coral',
  amber: 'bg-amber',
  teal: 'bg-teal',
};

export default function AIBriefBar() {
  const { setCurrentPage, setFilters } = useNav();
  const nav = (page: string, filters?: Record<string, string>) => {
    if (filters) setFilters(filters);
    setCurrentPage(page);
  };

  return (
    <div className="bg-gradient-to-r from-teal/10 via-purple/5 to-card border border-teal/20 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-teal" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-teal">Infinity AI Brief</span>
            <span className="text-[10px] text-muted-foreground">· {today} · top 3 priorities</span>
          </div>
          <ul className="space-y-1">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-center gap-2 text-[12px] text-foreground">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor[b.severity]}`} />
                <span className="flex-1 min-w-0">{b.impact}</span>
                <button
                  onClick={() => nav(b.page, b.filters)}
                  className="text-[10.5px] text-teal font-semibold hover:underline flex items-center gap-1 flex-shrink-0"
                >
                  {b.action} <ArrowRight className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
