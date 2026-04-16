import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNav } from '@/context/NavigationContext';

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

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
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-teal">Infinity AI Brief</span>
            <span className="text-[10px] text-muted-foreground">· {today}</span>
          </div>
          <p className="text-[12.5px] text-foreground leading-relaxed">
            Risk score <span className="font-bold text-teal">improved 6 points</span> this week. <span className="font-semibold text-coral">3 wildcard certs expire today</span> covering 14 dependent services — auto-renewal is off.
            Unsponsored AI agent tokens are <span className="font-semibold text-amber">up 12% WoW</span>, driven by a new LangChain pipeline in payments.
            Replacing weak algorithms across 6,398 assets would cut your score by another <span className="font-semibold text-teal">12 points</span>.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => nav('remediation', { module: 'clm', filter: 'expiry' })} className="text-[10.5px] text-teal font-semibold hover:underline flex items-center gap-1">
              Renew expiring certs <ArrowRight className="w-3 h-3" />
            </button>
            <span className="text-muted-foreground text-[10px]">·</span>
            <button onClick={() => nav('inventory', { type: 'AI Agent Token', hasOwner: 'false' })} className="text-[10.5px] text-teal font-semibold hover:underline flex items-center gap-1">
              Assign AI sponsors <ArrowRight className="w-3 h-3" />
            </button>
            <span className="text-muted-foreground text-[10px]">·</span>
            <button onClick={() => nav('quantum')} className="text-[10.5px] text-teal font-semibold hover:underline flex items-center gap-1">
              Plan PQC migration <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
