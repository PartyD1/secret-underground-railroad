// Role assignment + private reveal only (CLAUDE.md 6.1 Phase 1 scope).
// The full night/day/vote state machine is a separate, later phase —
// do not extend this file toward that without it being explicitly
// requested and bundled as a single deliverable.

export type MafiaRole = "mafia" | "doctor" | "detective" | "jester" | "town";

export const MIN_MAFIA_PLAYERS = 5;

export interface MafiaConfig {
  mafia: number;
  doctor: number;
  detective: number;
  jester: number;
}

export const ROLE_LABELS: Record<MafiaRole, string> = {
  mafia: "Mafia",
  doctor: "Doctor",
  detective: "Detective",
  jester: "Jester",
  town: "Town",
};

export function suggestMafiaConfig(playerCount: number): MafiaConfig {
  if (playerCount <= 6) return { mafia: 1, doctor: 1, detective: 1, jester: 0 };
  if (playerCount <= 8) return { mafia: 2, doctor: 1, detective: 1, jester: 0 };
  if (playerCount <= 10) return { mafia: 2, doctor: 1, detective: 1, jester: 0 };
  if (playerCount <= 13) return { mafia: 3, doctor: 2, detective: 1, jester: 0 };
  const mafia = Math.floor(playerCount * 0.25);
  const doctor = Math.max(1, Math.floor(mafia * 0.75));
  return { mafia, doctor, detective: 2, jester: 0 };
}

export function validateMafiaConfig(
  config: MafiaConfig,
  playerCount: number,
): string | null {
  if (config.mafia < 1) return "Need at least 1 Mafia.";
  const specialTotal = config.mafia + config.doctor + config.detective + config.jester;
  if (specialTotal > playerCount - 1) {
    return "Too many special roles — need at least 1 Town member left over.";
  }
  return null;
}

export type MafiaAssignments = Record<string, { role: MafiaRole }>;

export interface MyMafiaAssignment {
  role: MafiaRole;
  teammates: { id: string; name: string }[];
}
