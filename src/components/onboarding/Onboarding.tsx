// Canonical onboarding implementation lives in OnboardingStrip.tsx.

// This module re-exports it so any import path resolves to the same code.

export {
  OnboardingProvider,
  useOnboarding,
  OnboardingStrip,
  STAGE_ORDER,
  default,
} from './OnboardingStrip';

export type { StageId, StageStatus, EstateChoice, ConcernChoice } from './OnboardingStrip';
