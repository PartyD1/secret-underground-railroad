import "server-only";
import { getPlayerSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";

// Verifies the session cookie's secret_token against the DB — a cookie
// with a guessed/tampered playerId won't have the matching secret, so
// this is what actually proves "this is my own player row," not just
// the presence of a cookie.
export async function verifyPlayer(
  roomCode: string,
): Promise<{ playerId: string } | null> {
  const session = await getPlayerSession(roomCode);
  if (!session) return null;

  const { data: player } = await supabaseServer
    .from("players")
    .select("id, room_code")
    .eq("id", session.playerId)
    .eq("room_code", roomCode)
    .maybeSingle();
  if (!player) return null;

  const { data: secret } = await supabaseServer
    .from("player_secrets")
    .select("secret_token")
    .eq("player_id", session.playerId)
    .maybeSingle();
  if (!secret || secret.secret_token !== session.secretToken) return null;

  return { playerId: session.playerId };
}

export async function verifyHost(
  roomCode: string,
): Promise<{ playerId: string } | null> {
  const player = await verifyPlayer(roomCode);
  if (!player) return null;

  const { data: room } = await supabaseServer
    .from("rooms")
    .select("host_id")
    .eq("code", roomCode)
    .maybeSingle();
  if (!room || room.host_id !== player.playerId) return null;

  return player;
}
