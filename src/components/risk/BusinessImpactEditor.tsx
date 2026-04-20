import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import type { BusinessImpact } from '@/lib/risk/types';

const OPTIONS: BusinessImpact[] = ['Critical', 'High', 'Moderate', 'Low'];

const STYLE: Record<BusinessImpact, string> = {
  Critical: 'bg-coral/15 text-coral border-coral/30',
  High:     'bg-amber/15 text-amber border-amber/30',
  Moderate: 'bg-purple/15 text-purple-light border-purple/30',
  Low:      'bg-secondary text-muted-foreground border-border',
};

interface Props {
  value: BusinessImpact;
  onChange: (v: BusinessImpact) => void;
  onOpenJustification?: () => void;
  size?: 'sm' | 'md';
}

export default function BusinessImpactEditor({ value, onChange, onOpenJustification, size = 'sm' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const padding = size === 'md' ? 'px-2 py-1' : 'px-1.5 py-0.5';
  const text = size === 'md' ? 'text-[11px]' : 'text-[10px]';

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1 ${padding} ${text} font-semibold rounded border ${STYLE[value]} hover:brightness-125 transition-all`}
      >
        {value}
        <ChevronDown className="w-2.5 h-2.5 opacity-70" />
      </button>
      {onOpenJustification && (
        <button
          onClick={e => { e.stopPropagation(); onOpenJustification(); }}
          className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
          title="Add justification & view audit log"
        >
          <FileText className="w-3 h-3" />
        </button>
      )}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-md shadow-lg py-1 min-w-[120px]">
          {OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-2 py-1 text-[11px] hover:bg-secondary transition-colors ${
                opt === value ? 'text-teal font-semibold' : 'text-foreground'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
