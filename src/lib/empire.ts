// Word-submission game (CLAUDE.md 6.2). Submissions are keyed by
// player_id server-side only so we can track progress and dedupe —
// anything sent to a client (including the Host's) must be stripped
// down to a shuffled word list with no id/name attached.

export const CURATED_THEMES = [
  "Countries",
  "Fruits",
  "Movies",
  "'90s Nostalgia",
  "Animals",
  "Landmarks",
] as const;

export const MIN_EMPIRE_PLAYERS = 3;

const MAX_WORD_LENGTH = 40;
const MAX_THEME_LENGTH = 60;

export interface EmpireConfig {
  theme: string;
}

export type EmpireSubmissions = Record<string, string>;

export function normalizeEmpireWord(raw: string): string {
  const word = raw.trim();
  if (!word) throw new Error("Enter a word first.");
  if (word.length > MAX_WORD_LENGTH) {
    throw new Error(`Word must be ${MAX_WORD_LENGTH} characters or fewer.`);
  }
  return word;
}

export function normalizeEmpireTheme(raw: string): string {
  const theme = raw.trim();
  if (!theme) throw new Error("Enter a theme first.");
  if (theme.length > MAX_THEME_LENGTH) {
    throw new Error(`Theme must be ${MAX_THEME_LENGTH} characters or fewer.`);
  }
  return theme;
}
