// Shared "one secret, one outlier" primitive (CLAUDE.md 6.3) — kept
// generic so a future theme-hint mode is additive, not a rewrite.

export interface ChameleonConfig {
  word: string;
}

export type ChameleonAssignments = Record<string, { isChameleon: boolean }>;

export const MIN_CHAMELEON_PLAYERS = 3;

export type MyChameleonAssignment =
  | { isChameleon: true }
  | { isChameleon: false; word: string };
