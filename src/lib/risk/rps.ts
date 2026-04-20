// Remediation Prioritisation Score (RPS): internal sort key. Not a posture
// score — surfaced as a column / sort order to put high-business-impact
// assets above low-impact ones with the same crypto risk.

import { BI_MULTIPLIER, type BusinessImpact } from './types';

export function computeRPS(ars: number, bi: BusinessImpact): number {
  return Math.round(ars * BI_MULTIPLIER[bi]);
}
