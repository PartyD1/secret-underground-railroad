"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { verifyHost, verifyPlayer } from "@/lib/auth";
import {
  MIN_CHAMELEON_PLAYERS,
  type ChameleonAssignments,
  type ChameleonConfig,
  type MyChameleonAssignment,
} from "@/lib/chameleon";

const MAX_WORD_LENGTH = 40;

export async function startChameleonGame(roomCode: string, rawWord: string) {
  const host = await verifyHost(roomCode);
  if (!host) throw new Error("Only the host can start the game.");

  const word = rawWord.trim();
  if (!word) throw new Error("Enter a word first.");
  if (word.length > MAX_WORD_LENGTH) {
    throw new Error(`Word must be ${MAX_WORD_LENGTH} characters or fewer.`);
  }

  const { data: players, error: playersError } = await supabaseServer
    .from("players")
    .select("id")
    .eq("room_code", roomCode);
  if (playersError) throw new Error(playersError.message);
  if (!players || players.length < MIN_CHAMELEON_PLAYERS) {
    throw new Error(`Need at least ${MIN_CHAMELEON_PLAYERS} players to start.`);
  }

  const chameleonId = players[Math.floor(Math.random() * players.length)].id;
  const assignments: ChameleonAssignments = Object.fromEntries(
    players.map((p) => [p.id, { isChameleon: p.id === chameleonId }]),
  );
  const config: ChameleonConfig = { word };

  const { error: sessionError } = await supabaseServer
    .from("game_sessions")
    .upsert(
      {
        room_code: roomCode,
        config: config as unknown as Record<string, unknown>,
        assignments: assignments as unknown as Record<string, unknown>,
        phase: "revealing",
      },
      { onConflict: "room_code" },
    );
  if (sessionError) throw new Error(sessionError.message);

  const { error: roomError } = await supabaseServer
    .from("rooms")
    .update({ status: "reveal" })
    .eq("code", roomCode);
  if (roomError) throw new Error(roomError.message);
}

export async function resetChameleonGame(roomCode: string) {
  const host = await verifyHost(roomCode);
  if (!host) throw new Error("Only the host can start a new round.");

  const { error } = await supabaseServer
    .from("rooms")
    .update({ status: "setup" })
    .eq("code", roomCode);
  if (error) throw new Error(error.message);
}

export async function getMyChameleonAssignment(
  roomCode: string,
): Promise<MyChameleonAssignment> {
  const player = await verifyPlayer(roomCode);
  if (!player) throw new Error("Not authorized.");

  const { data: session } = await supabaseServer
    .from("game_sessions")
    .select("config, assignments")
    .eq("room_code", roomCode)
    .maybeSingle();
  if (!session) throw new Error("This round hasn't started yet.");

  const assignments = session.assignments as unknown as ChameleonAssignments;
  const mine = assignments[player.playerId];
  if (!mine) throw new Error("You're not part of this round.");

  if (mine.isChameleon) return { isChameleon: true };

  const config = session.config as unknown as ChameleonConfig;
  return { isChameleon: false, word: config.word };
}
