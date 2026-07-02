"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { verifyHost, verifyPlayer } from "@/lib/auth";
import {
  MIN_EMPIRE_PLAYERS,
  normalizeEmpireTheme,
  normalizeEmpireWord,
  type EmpireConfig,
  type EmpireSubmissions,
} from "@/lib/empire";

export async function startEmpireGame(roomCode: string, rawTheme: string) {
  const host = await verifyHost(roomCode);
  if (!host) throw new Error("Only the host can start the game.");

  const theme = normalizeEmpireTheme(rawTheme);

  const { count, error: playersError } = await supabaseServer
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("room_code", roomCode);
  if (playersError) throw new Error(playersError.message);
  if (!count || count < MIN_EMPIRE_PLAYERS) {
    throw new Error(`Need at least ${MIN_EMPIRE_PLAYERS} players to start.`);
  }

  const config: EmpireConfig = { theme };

  const { error: sessionError } = await supabaseServer
    .from("game_sessions")
    .upsert(
      {
        room_code: roomCode,
        config: config as unknown as Record<string, unknown>,
        assignments: {},
        submissions: {},
        phase: "submitting",
      },
      { onConflict: "room_code" },
    );
  if (sessionError) throw new Error(sessionError.message);

  const { error: roomError } = await supabaseServer
    .from("rooms")
    .update({ status: "in_progress" })
    .eq("code", roomCode);
  if (roomError) throw new Error(roomError.message);
}

export interface EmpireStatus {
  theme: string;
  submittedCount: number;
  totalPlayers: number;
  mySubmitted: boolean;
}

export async function getEmpireStatus(roomCode: string): Promise<EmpireStatus> {
  const player = await verifyPlayer(roomCode);
  if (!player) throw new Error("Not authorized.");

  const { data: session } = await supabaseServer
    .from("game_sessions")
    .select("config, submissions")
    .eq("room_code", roomCode)
    .maybeSingle();
  if (!session) throw new Error("This round hasn't started yet.");

  const { count } = await supabaseServer
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("room_code", roomCode);

  const submissions = session.submissions as unknown as EmpireSubmissions;
  const config = session.config as unknown as EmpireConfig;

  return {
    theme: config.theme,
    submittedCount: Object.keys(submissions).length,
    totalPlayers: count ?? 0,
    mySubmitted: Boolean(submissions[player.playerId]),
  };
}

export async function submitEmpireWord(roomCode: string, rawWord: string) {
  const player = await verifyPlayer(roomCode);
  if (!player) throw new Error("Not authorized.");

  const word = normalizeEmpireWord(rawWord);

  const { data: session } = await supabaseServer
    .from("game_sessions")
    .select("submissions")
    .eq("room_code", roomCode)
    .maybeSingle();
  if (!session) throw new Error("This round hasn't started yet.");

  const submissions: EmpireSubmissions = {
    ...(session.submissions as unknown as EmpireSubmissions),
    [player.playerId]: word,
  };

  const { error } = await supabaseServer
    .from("game_sessions")
    .update({ submissions: submissions as unknown as Record<string, unknown> })
    .eq("room_code", roomCode);
  if (error) throw new Error(error.message);
}

export async function revealEmpireGame(roomCode: string) {
  const host = await verifyHost(roomCode);
  if (!host) throw new Error("Only the host can reveal.");

  const { error } = await supabaseServer
    .from("rooms")
    .update({ status: "reveal" })
    .eq("code", roomCode);
  if (error) throw new Error(error.message);
}

export interface EmpireReveal {
  theme: string;
  words: string[];
}

// Only ever returns a shuffled word list with no id/name attached —
// the submission -> player_id link must not be derivable from
// anything sent to any client, including the Host's (CLAUDE.md 6.2).
export async function getEmpireReveal(roomCode: string): Promise<EmpireReveal> {
  const player = await verifyPlayer(roomCode);
  if (!player) throw new Error("Not authorized.");

  const { data: session } = await supabaseServer
    .from("game_sessions")
    .select("config, submissions")
    .eq("room_code", roomCode)
    .maybeSingle();
  if (!session) throw new Error("This round hasn't started yet.");

  const config = session.config as unknown as EmpireConfig;
  const submissions = session.submissions as unknown as EmpireSubmissions;
  const words = Object.values(submissions);
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }

  return { theme: config.theme, words };
}

export async function resetEmpireGame(roomCode: string) {
  const host = await verifyHost(roomCode);
  if (!host) throw new Error("Only the host can start a new round.");

  const { error } = await supabaseServer
    .from("rooms")
    .update({ status: "setup" })
    .eq("code", roomCode);
  if (error) throw new Error(error.message);
}
