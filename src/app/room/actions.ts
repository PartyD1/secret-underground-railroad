"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { generateRoomCode, normalizeRoomCode } from "@/lib/room-code";
import { setPlayerSession } from "@/lib/session";
import { verifyHost, verifyPlayer } from "@/lib/auth";
import type { GameType } from "@/lib/supabase/types";

const MAX_DISPLAY_NAME_LENGTH = 30;

function assertDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required.");
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new Error(`Name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`);
  }
  return trimmed;
}

export async function createRoom(displayName: string, gameType: GameType) {
  const name = assertDisplayName(displayName);

  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateRoomCode();
    const { error } = await supabaseServer
      .from("rooms")
      .insert({ code: candidate, game_type: gameType });
    if (!error) {
      code = candidate;
      break;
    }
    // 23505 = unique_violation; retry with a new code. Any other error
    // is unexpected and should surface immediately.
    if (error.code !== "23505") throw new Error(error.message);
  }
  if (!code) throw new Error("Could not generate a unique room code, try again.");

  const { data: player, error: playerError } = await supabaseServer
    .from("players")
    .insert({ room_code: code, display_name: name })
    .select("id")
    .single();
  if (playerError || !player) {
    throw new Error(playerError?.message ?? "Failed to create host player.");
  }

  const { data: secret, error: secretError } = await supabaseServer
    .from("player_secrets")
    .insert({ player_id: player.id })
    .select("secret_token")
    .single();
  if (secretError || !secret) {
    throw new Error(secretError?.message ?? "Failed to create session.");
  }

  const { error: hostError } = await supabaseServer
    .from("rooms")
    .update({ host_id: player.id })
    .eq("code", code);
  if (hostError) throw new Error(hostError.message);

  await setPlayerSession(code, {
    playerId: player.id,
    secretToken: secret.secret_token,
  });

  redirect(`/room/${code}`);
}

export async function joinRoom(rawCode: string, displayName: string) {
  const code = normalizeRoomCode(rawCode);
  const name = assertDisplayName(displayName);
  if (!code) throw new Error("Room code is required.");

  const { data: room } = await supabaseServer
    .from("rooms")
    .select("code, status, expires_at")
    .eq("code", code)
    .maybeSingle();
  if (!room) throw new Error("Room not found. Check the code and try again.");
  if (new Date(room.expires_at) < new Date()) {
    throw new Error("This room has expired.");
  }
  if (room.status !== "lobby") {
    throw new Error("This room has already started.");
  }

  const { data: player, error: playerError } = await supabaseServer
    .from("players")
    .insert({ room_code: code, display_name: name })
    .select("id")
    .single();
  if (playerError || !player) {
    throw new Error(playerError?.message ?? "Failed to join room.");
  }

  const { data: secret, error: secretError } = await supabaseServer
    .from("player_secrets")
    .insert({ player_id: player.id })
    .select("secret_token")
    .single();
  if (secretError || !secret) {
    throw new Error(secretError?.message ?? "Failed to create session.");
  }

  await setPlayerSession(code, {
    playerId: player.id,
    secretToken: secret.secret_token,
  });

  redirect(`/room/${code}`);
}

export async function kickPlayer(roomCode: string, targetPlayerId: string) {
  const host = await verifyHost(roomCode);
  if (!host) throw new Error("Only the host can remove players.");
  if (targetPlayerId === host.playerId) {
    throw new Error("The host can't remove themselves.");
  }

  const { error } = await supabaseServer
    .from("players")
    .delete()
    .eq("id", targetPlayerId)
    .eq("room_code", roomCode);
  if (error) throw new Error(error.message);
}

export async function renamePlayer(
  roomCode: string,
  targetPlayerId: string,
  newName: string,
) {
  const name = assertDisplayName(newName);

  const [host, self] = await Promise.all([
    verifyHost(roomCode),
    verifyPlayer(roomCode),
  ]);
  const isAuthorized =
    (host && true) || (self && self.playerId === targetPlayerId);
  if (!isAuthorized) throw new Error("Not authorized to rename this player.");

  const { error } = await supabaseServer
    .from("players")
    .update({ display_name: name })
    .eq("id", targetPlayerId)
    .eq("room_code", roomCode);
  if (error) throw new Error(error.message);
}
