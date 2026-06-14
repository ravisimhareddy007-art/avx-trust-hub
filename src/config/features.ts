// Central feature flags. Flip a value to true to re-enable a capability in a
// future release. Code behind a false flag is retained, only hidden, so nothing
// needs to be rebuilt to bring it back.

export const FEATURES = {
  // AI agent identities and the Eos AI Identity module (MCP proxy, agentic-AI
  // governance, AI agent token remediation). Out of scope for the MVP, which
  // covers discovery, visibility, and posture management. Set to true to restore.
  AI_IDENTITY: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}
