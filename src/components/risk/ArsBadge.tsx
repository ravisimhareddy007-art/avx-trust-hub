import React from 'react';
import { severityFor, severityHsl } from '@/lib/risk/types';

interface Props { score: number; label?: string; size?: 'sm' | 'md'; }

export default function ArsBadge({ score, label = 'ARS', size = 'sm' }: Props) {
  const hsl = severityHsl(severityFor(score));
  const padding = size === 'md' ? 'px-2 py-1' : 'px-1.5 py-0.5';
  const text = size === 'md' ? 'text-[11px]' : 'text-[10px]';
  const hasLabel = Boolean(label?.trim());
  return (
    <span
      className={`inline-flex items-center gap-1 ${padding} ${text} font-semibold rounded`}
      style={{ background: `${hsl}1f`, color: hsl }}
      title={`${hasLabel ? `${label} ` : ''}${score} (${severityFor(score)})`}
    >
      {hasLabel ? `${label} ${score}` : score}
    </span>
  );
}
