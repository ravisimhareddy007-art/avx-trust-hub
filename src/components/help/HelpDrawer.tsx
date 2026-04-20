import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, BookOpen, ArrowLeft } from 'lucide-react';
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  searchHelp,
  getArticle,
  getByCategory,
  type HelpArticle,
} from '@/lib/helpbase';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HelpDrawer({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setQuery('');
      setCategory(null);
      setSelectedId(null);
    }
  }, [open]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    HELP_CATEGORIES.forEach((c) => {
      map[c] = getByCategory(c).length;
    });
    return map;
  }, []);

  const list: HelpArticle[] = useMemo(() => {
    if (query.trim()) return searchHelp(query);
    if (category) return getByCategory(category);
    return HELP_ARTICLES.slice(0, 30);
  }, [query, category]);

  const selected = selectedId ? getArticle(selectedId) : null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex" role="dialog" aria-label="Help & Documentation">
      <div
        className="flex-1 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="w-[680px] max-w-[95vw] bg-card border-l border-border h-full flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal" />
            <h2 className="text-sm font-semibold text-foreground">Help & Documentation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: two panels */}
        <div className="flex-1 flex min-h-0">
          {/* LEFT PANEL */}
          <div className="w-[280px] border-r border-border flex flex-col min-h-0">
            {/* Search */}
            <div className="p-3 border-b border-border flex-shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCategory(null);
                  }}
                  placeholder="Search help…"
                  className="w-full bg-background border border-border rounded-md pl-8 pr-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-teal/50"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="p-3 border-b border-border flex-shrink-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                Categories
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => {
                    setCategory(null);
                    setQuery('');
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    !category && !query
                      ? 'bg-teal/15 text-teal border-teal/40'
                      : 'bg-secondary/50 text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  All
                </button>
                {HELP_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setCategory(c);
                      setQuery('');
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      category === c
                        ? 'bg-teal/15 text-teal border-teal/40'
                        : 'bg-secondary/50 text-muted-foreground border-border hover:text-foreground'
                    }`}
                  >
                    {c} <span className="opacity-60">{categoryCounts[c]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Article list */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {list.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground">No articles found.</div>
              ) : (
                list.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors ${
                      selectedId === a.id
                        ? 'bg-teal/10'
                        : 'hover:bg-secondary/40'
                    }`}
                  >
                    <div className="text-xs font-semibold text-foreground leading-snug mb-0.5">
                      {a.title}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground line-clamp-2 leading-snug">
                      {a.summary}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
            {!selected ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <BookOpen className="w-8 h-8 mb-3 opacity-40" />
                <div className="text-xs">Select an article to read</div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <button
                  onClick={() => setSelectedId(null)}
                  className="md:hidden text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-teal mb-1 font-semibold">
                    {selected.category}
                  </div>
                  <h1 className="text-base font-semibold text-foreground leading-tight mb-2">
                    {selected.title}
                  </h1>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    {selected.summary}
                  </p>
                </div>

                {selected.sections.map((s, i) => (
                  <div key={i} className="space-y-1.5">
                    <h3 className="text-[12px] font-semibold text-foreground">
                      {s.heading}
                    </h3>
                    {s.body.split('\n').filter(Boolean).map((p, j) => (
                      <p key={j} className="text-[12px] text-muted-foreground leading-relaxed">
                        {p}
                      </p>
                    ))}
                  </div>
                ))}

                {selected.regulatoryRefs && selected.regulatoryRefs.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                      Regulatory References
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.regulatoryRefs.map((r) => (
                        <span
                          key={r}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/30"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selected.relatedIds && selected.relatedIds.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                      Related Articles
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.relatedIds.map((id) => {
                        const r = getArticle(id);
                        if (!r) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => setSelectedId(id)}
                            className="text-[10.5px] px-2 py-1 rounded-md bg-secondary/60 text-foreground border border-border hover:border-teal/40 hover:text-teal transition-colors"
                          >
                            {r.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
