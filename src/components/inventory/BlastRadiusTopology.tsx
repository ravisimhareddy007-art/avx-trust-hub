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
  compact?: boolean;
}

export default function BlastRadiusTopology({ nodes, summary, onNodeClick, compact = false }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [highlightedRing1, setHighlightedRing1] = useState<string | null>(null);

  const center = nodes.find(n => n.ring === 0);
  const ring1 = nodes.filter(n => n.ring === 1);
  const ring2 = nodes.filter(n => n.ring === 2);
  const ring3 = nodes.filter(n => n.ring === 3);

  // Compact: same viewBox as before. Expanded: larger viewBox with more breathing room.
  const cx = compact ? 200 : 300;
  const cy = compact ? 200 : 250;
  const r1 = compact ? 70 : 90;
  const r2 = compact ? 130 : 165;
  const r3 = compact ? 175 : 220;

  const viewBox = compact ? '0 0 400 400' : '0 0 600 500';

  // Node radii
  const centerR = compact ? 12 : 22;
  const centerHaloR = compact ? 18 : 28;
  const ring1R = compact ? 8 : 14;
  const ring2R = compact ? 6 : 10;
  const ring3R = compact ? 4 : 7;

  // Stroke widths
  const sw1 = compact ? 0.5 : 1;
  const sw23 = compact ? 0.5 : 0.7;

  // Font sizes for expanded labels
  const fsCenterRisk = compact ? 6 : 10;
  const fsRing1 = 8;
  const fsRing2 = 7;
  const fsRing3 = 6;

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
    return true;
  };

  const svgClass = compact ? 'w-full h-auto max-h-[320px]' : 'w-full h-auto max-h-[600px]';

  return (
    <div className="space-y-3 w-full">
      <svg viewBox={viewBox} className={svgClass}>
        {/* Ring circles */}
        {[r1, r2, r3].map((r, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="hsl(225, 20%, 20%)" strokeWidth="0.5" strokeDasharray={i === 2 ? '4 4' : 'none'} opacity={0.5} />
        ))}

        {/* Lines from center to ring 1 */}
        {ring1Placed.map(n => (
          <line key={`l-${n.id}`} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke="hsl(225, 20%, 25%)" strokeWidth={sw1} opacity={isDimmed(n) ? 0.15 : 0.4} />
        ))}

        {/* Lines from ring 1 to ring 2 */}
        {ring2Placed.map(n2 => {
          const closest = ring1Placed[0];
          return <line key={`l2-${n2.id}`} x1={closest?.x || cx} y1={closest?.y || cy} x2={n2.x} y2={n2.y} stroke="hsl(225, 20%, 25%)" strokeWidth={sw23} opacity={isDimmed(n2) ? 0.1 : 0.3} />;
        })}

        {/* Center node */}
        {center && (
          <g>
            <circle cx={cx} cy={cy} r={centerHaloR} fill={nodeColor(center)} opacity={0.2} />
            <circle cx={cx} cy={cy} r={centerR} fill={nodeColor(center)} opacity={0.8} />
            <text x={cx} y={cy + (compact ? 3 : 4)} textAnchor="middle" fill="white" fontSize={fsCenterRisk} fontWeight="bold">
              {center.riskScore}
            </text>
            {!compact && (
              <text x={cx} y={cy + centerHaloR + 14} textAnchor="middle" fill="hsl(220, 15%, 65%)" fontSize={9} fontWeight="600">
                {center.name.length > 30 ? center.name.slice(0, 27) + '…' : center.name}
              </text>
            )}
          </g>
        )}

        {/* Ring 1 nodes */}
        {ring1Placed.map(n => (
          <g key={n.id} style={{ cursor: 'pointer', opacity: isDimmed(n) ? 0.2 : 1, transition: 'opacity 0.2s' }}
            onMouseEnter={() => setHoveredId(n.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => { setHighlightedRing1(highlightedRing1 === n.id ? null : n.id); onNodeClick?.(n); }}>
            <circle cx={n.x} cy={n.y} r={ring1R} fill={nodeColor(n)} opacity={0.8} />
            {n.violations && n.violations > 0 && (
              <circle cx={n.x + ring1R * 0.75} cy={n.y - ring1R * 0.75} r={compact ? 3.5 : 5} fill="hsl(15, 72%, 52%)" stroke="hsl(225, 30%, 10%)" strokeWidth="0.5" />
            )}
            {n.violations && n.violations > 0 && (
              <text x={n.x + ring1R * 0.75} y={n.y - ring1R * 0.75 + (compact ? 1.5 : 2)} textAnchor="middle" fill="white" fontSize={compact ? 4 : 6} fontWeight="bold">{n.violations}</text>
            )}
            {!compact && (
              <>
                <text x={n.x} y={n.y + ring1R + 10} textAnchor="middle" fill="hsl(220, 15%, 60%)" fontSize={fsRing1}>
                  {n.name.length > 22 ? n.name.slice(0, 19) + '…' : n.name}
                </text>
                {n.daysToExpiry !== undefined && n.daysToExpiry >= 0 && (
                  <text x={n.x} y={n.y + ring1R + 19} textAnchor="middle" fill={n.daysToExpiry <= 7 ? 'hsl(15, 72%, 52%)' : 'hsl(38, 78%, 41%)'} fontSize={fsRing1 - 1}>{n.daysToExpiry}d</text>
                )}
              </>
            )}
          </g>
        ))}

        {/* Ring 2 nodes */}
        {ring2Placed.map(n => (
          <g key={n.id} style={{ cursor: 'pointer', opacity: isDimmed(n) ? 0.15 : 1, transition: 'opacity 0.2s' }}
            onClick={() => onNodeClick?.(n)}>
            <circle cx={n.x} cy={n.y} r={ring2R} fill={nodeColor(n)} opacity={0.6} />
            {!compact && (
              <>
                <text x={n.x} y={n.y + ring2R + 9} textAnchor="middle" fill="hsl(220, 15%, 50%)" fontSize={fsRing2}>
                  {n.name.length > 18 ? n.name.slice(0, 15) + '…' : n.name}
                </text>
                {n.sharedObjectCount && (
                  <text x={n.x} y={n.y + ring2R + 17} textAnchor="middle" fill="hsl(220, 15%, 38%)" fontSize={fsRing2 - 1}>{n.sharedObjectCount} shared</text>
                )}
              </>
            )}
          </g>
        ))}

        {/* Ring 3 nodes */}
        {ring3Placed.map(n => (
          <g key={n.id} style={{ opacity: isDimmed(n) ? 0.1 : 0.4, cursor: 'pointer' }}
            onClick={() => onNodeClick?.(n)}>
            <circle cx={n.x} cy={n.y} r={ring3R} fill={nodeColor(n)} opacity={0.4} />
            {!compact && (
              <text x={n.x} y={n.y + ring3R + 8} textAnchor="middle" fill="hsl(220, 15%, 38%)" fontSize={fsRing3}>
                {n.name.length > 16 ? n.name.slice(0, 13) + '…' : n.name}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Legend, stats, and summary — only in expanded mode */}
      {!compact && (
        <>
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
        </>
      )}
    </div>
  );
}
