// Three-level risk scoring types — shared by CRS / ARS / ERS / RPS.

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type BusinessImpact = 'Critical' | 'High' | 'Moderate' | 'Low';

// Business Impact multiplier used by RPS (sort key, never displayed as a score).
export const BI_MULTIPLIER: Record<BusinessImpact, number> = {
  Critical: 1.5,
  High:     1.25,
  Moderate: 1.0,
  Low:      0.75,
};

// ECRS-style severity bands (re-used so dashboard + inventory speak one language).
export function severityFor(score: number): Severity {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 30) return 'Medium';
  return 'Low';
}

export function severityHsl(sev: Severity): string {
  switch (sev) {
    case 'Critical': return 'hsl(var(--coral))';
    case 'High':     return 'hsl(15 72% 62%)';
    case 'Medium':   return 'hsl(var(--amber))';
    case 'Low':      return 'hsl(var(--teal))';
  }
}
