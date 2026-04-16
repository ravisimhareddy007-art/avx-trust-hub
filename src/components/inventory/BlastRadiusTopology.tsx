import React, { useState } from 'react';

interface TopologyNode {
  id: string;
  name: string;
  type: 'asset' | 'crypto';
  ring: 0 | 1 | 2 | 3;
  riskScore?: number;
  daysToExpiry?: number;
  violations?: number;
  sharedObjectCount?: number;
  cryptoType?: string;
}

interface Props {
  nodes: TopologyNode[];
  summary: { directDeps: number; siblingAssets: number; cascadeAssets: number; sentence: string };
  onNodeClick?: (node: TopologyNode) => void;
}

export default function BlastRadiusTopology({ nodes, summary, onNodeClick }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [highlightedRing1, setHighlightedRing1] = useState<string | null>(null);

  const center = nodes.find(n => n.ring === 0);
  const ring1 = nodes.filter(n => n.ring === 1);
  const ring2 = nodes.filter(n => n.ring === 2);
  const ring3 = nodes.filter(n => n.ring === 3);

  const cx = 200, cy = 200;
  const r1 = 70, r2 = 130, r3 = 175;

  function placeNodes(items: TopologyNode[], radius: number) {
    return items.map((node, i) => {
      const angle = (2 * Math.PI * i) / items.length - Math.PI / 2;
      return { ...node, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    });
  }

  const ring1Placed = placeNodes(ring1, r1);
  const ring2Placed = placeNodes(ring2, r2);
  const ring3Placed = placeNodes(ring3, r3);

  const nodeColor = (n: TopologyNode) => {
    if (n.ring === 0) return n.riskScore && n.riskScore > 70 ? 'hsl(15, 72%, 52%)' : 'hsl(160, 70%, 37%)';
    if (n.ring === 1) {
      if (n.daysToExpiry !== undefined && n.daysToExpiry >= 0 && n.daysToExpiry <= 7) return 'hsl(15, 72%, 52%)';
      if (n.violations && n.violations > 0) return 'hsl(38, 78%, 41%)';
      return 'hsl(160, 70%, 37%)';
    }
    if (n.ring === 2) return 'hsl(225, 40%, 50%)';
    return 'hsl(225, 30%, 35%)';
  };

  const isDimmed = (n: TopologyNode) => {
    if (!highlightedRing1) return false;
    if (n.ring === 0 || n.id === highlightedRing1) return false;
    if (n.ring === 1) return n.id !== highlightedRing1;
    // For ring 2/3, not dimmed if related (simplified)
    return true;
  };

  return (
    <div className="space-y-3">
      <svg viewBox="0 0 400 400" className="w-full h-auto max-h-[320px]">
        {/* Ring circles */}
        {[r1, r2, r3].map((r, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="hsl(225, 20%, 20%)" strokeWidth="0.5" strokeDasharray={i === 2 ? '4 4' : 'none'} opacity={0.5} />
        ))}

        {/* Lines from center to ring 1 */}
        {ring1Placed.map(n => (
          <line key={`l-${n.id}`} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke="hsl(225, 20%, 25%)" strokeWidth="0.5" opacity={isDimmed(n) ? 0.15 : 0.4} />
        ))}

        {/* Lines from ring 1 to ring 2 */}
        {ring2Placed.map(n2 => {
          const closest = ring1Placed[0];
          return <line key={`l2-${n2.id}`} x1={closest?.x || cx} y1={closest?.y || cy} x2={n2.x} y2={n2.y} stroke="hsl(225, 20%, 25%)" strokeWidth="0.5" opacity={isDimmed(n2) ? 0.1 : 0.3} />;
        })}

        {/* Center node */}
        {center && (
          <g>
            <circle cx={cx} cy={cy} r={18} fill={nodeColor(center)} opacity={0.2} />
            <circle cx={cx} cy={cy} r={12} fill={nodeColor(center)} opacity={0.8} />
            <text x={cx} y={cy + 3} textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">
              {center.riskScore}
            </text>
            <text x={cx} y={cy + 28} textAnchor="middle" fill="hsl(220, 15%, 55%)" fontSize="5.5">
              {center.name.length > 25 ? center.name.slice(0, 22) + '…' : center.name}
            </text>
          </g>
        )}

        {/* Ring 1 nodes */}
        {ring1Placed.map(n => (
          <g key={n.id} style={{ cursor: 'pointer', opacity: isDimmed(n) ? 0.2 : 1, transition: 'opacity 0.2s' }}
            onMouseEnter={() => setHoveredId(n.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => { setHighlightedRing1(highlightedRing1 === n.id ? null : n.id); onNodeClick?.(n); }}>
            <circle cx={n.x} cy={n.y} r={8} fill={nodeColor(n)} opacity={0.8} />
            {n.violations && n.violations > 0 && (
              <circle cx={n.x + 6} cy={n.y - 6} r={3.5} fill="hsl(15, 72%, 52%)" stroke="hsl(225, 30%, 10%)" strokeWidth="0.5" />
            )}
            {n.violations && n.violations > 0 && (
              <text x={n.x + 6} y={n.y - 4.5} textAnchor="middle" fill="white" fontSize="4" fontWeight="bold">{n.violations}</text>
            )}
            <text x={n.x} y={n.y + 16} textAnchor="middle" fill="hsl(220, 15%, 55%)" fontSize="4.5">
              {n.name.length > 18 ? n.name.slice(0, 15) + '…' : n.name}
            </text>
            {n.daysToExpiry !== undefined && n.daysToExpiry >= 0 && (
              <text x={n.x} y={n.y + 22} textAnchor="middle" fill={n.daysToExpiry <= 7 ? 'hsl(15, 72%, 52%)' : 'hsl(38, 78%, 41%)'} fontSize="4">{n.daysToExpiry}d</text>
            )}
          </g>
        ))}

        {/* Ring 2 nodes */}
        {ring2Placed.map(n => (
          <g key={n.id} style={{ cursor: 'pointer', opacity: isDimmed(n) ? 0.15 : 1, transition: 'opacity 0.2s' }}
            onClick={() => onNodeClick?.(n)}>
            <circle cx={n.x} cy={n.y} r={6} fill={nodeColor(n)} opacity={0.6} />
            <text x={n.x} y={n.y + 13} textAnchor="middle" fill="hsl(220, 15%, 45%)" fontSize="4">
              {n.name.length > 16 ? n.name.slice(0, 13) + '…' : n.name}
            </text>
            {n.sharedObjectCount && (
              <text x={n.x} y={n.y + 18} textAnchor="middle" fill="hsl(220, 15%, 35%)" fontSize="3.5">{n.sharedObjectCount} shared</text>
            )}
          </g>
        ))}

        {/* Ring 3 nodes */}
        {ring3Placed.map(n => (
          <g key={n.id} style={{ opacity: isDimmed(n) ? 0.1 : 0.4, cursor: 'pointer' }}
            onClick={() => onNodeClick?.(n)}>
            <circle cx={n.x} cy={n.y} r={4} fill={nodeColor(n)} opacity={0.4} />
            <text x={n.x} y={n.y + 10} textAnchor="middle" fill="hsl(220, 15%, 35%)" fontSize="3.5">
              {n.name.length > 14 ? n.name.slice(0, 11) + '…' : n.name}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend + Summary */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground px-2">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal" />Healthy</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber" />Warning</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-coral" />Critical</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple opacity-50" />Cascade</span>
      </div>

      <div className="grid grid-cols-3 gap-2 px-2">
        <div className="bg-secondary/50 rounded p-2 text-center">
          <p className="text-lg font-bold text-foreground">{summary.directDeps}</p>
          <p className="text-[10px] text-muted-foreground">Direct deps</p>
        </div>
        <div className="bg-secondary/50 rounded p-2 text-center">
          <p className="text-lg font-bold text-foreground">{summary.siblingAssets}</p>
          <p className="text-[10px] text-muted-foreground">Sibling assets</p>
        </div>
        <div className="bg-secondary/50 rounded p-2 text-center">
          <p className="text-lg font-bold text-foreground">{summary.cascadeAssets}</p>
          <p className="text-[10px] text-muted-foreground">Cascade impact</p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground italic px-2">{summary.sentence}</p>
    </div>
  );
}
