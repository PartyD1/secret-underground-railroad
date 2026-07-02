"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { verifyHost, verifyPlayer } from "@/lib/auth";
import {
  MIN_MAFIA_PLAYERS,
  validateMafiaConfig,
  type MafiaAssignments,
  type MafiaConfig,
  type MafiaRole,
  type MyMafiaAssignment,
} from "@/lib/mafia";

export async function startMafiaGame(roomCode: string, config: MafiaConfig) {
  const host = await verifyHost(roomCode);
  if (!host) throw new Error("Only the host can start the game.");

  const { data: players, error: playersError } = await supabaseServer
    .from("players")
    .select("id")
    .eq("room_code", roomCode);
  if (playersError) throw new Error(playersError.message);
  if (!players || players.length < MIN_MAFIA_PLAYERS) {
    throw new Error(`Need at least ${MIN_MAFIA_PLAYERS} players to start.`);
  }

  const validationError = validateMafiaConfig(config, players.length);
  if (validationError) throw new Error(validationError);

  const pool = [...players];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const roleQueue: MafiaRole[] = [
    ...Array(config.mafia).fill("mafia"),
    ...Array(config.doctor).fill("doctor"),
    ...Array(config.detective).fill("detective"),
    ...Array(config.jester).fill("jester"),
  ];

  const assignments: MafiaAssignments = {};
  pool.forEach((player, i) => {
    assignments[player.id] = { role: roleQueue[i] ?? "town" };
  });

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

export async function resetMafiaGame(roomCode: string) {
  const host = await verifyHost(roomCode);
  if (!host) throw new Error("Only the host can start a new round.");

  const { error } = await supabaseServer
    .from("rooms")
    .update({ status: "setup" })
    .eq("code", roomCode);
  if (error) throw new Error(error.message);
}

export async function getMyMafiaAssignment(
  roomCode: string,
): Promise<MyMafiaAssignment> {
  const player = await verifyPlayer(roomCode);
  if (!player) throw new Error("Not authorized.");

  const { data: session } = await supabaseServer
    .from("game_sessions")
    .select("assignments")
    .eq("room_code", roomCode)
    .maybeSingle();
  if (!session) throw new Error("This round hasn't started yet.");

  const assignments = session.assignments as unknown as MafiaAssignments;
  const mine = assignments[player.playerId];
  if (!mine) throw new Error("You're not part of this round.");

  if (mine.role !== "mafia") return { role: mine.role, teammates: [] };

  const teammateIds = Object.entries(assignments)
    .filter(([id, a]) => a.role === "mafia" && id !== player.playerId)
    .map(([id]) => id);

  if (teammateIds.length === 0) return { role: "mafia", teammates: [] };

  const { data: teammates } = await supabaseServer
    .from("players")
    .select("id, display_name")
    .in("id", teammateIds);

  return {
    role: "mafia",
    teammates: (teammates ?? []).map((t) => ({ id: t.id, name: t.display_name })),
  };
}
