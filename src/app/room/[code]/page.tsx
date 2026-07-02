import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { verifyPlayer } from "@/lib/auth";
import { normalizeRoomCode } from "@/lib/room-code";
import { Lobby } from "@/components/room/lobby";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);

  const { data: room } = await supabaseServer
    .from("rooms")
    .select("code, host_id, status, game_type, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (!room) notFound();

  const player = await verifyPlayer(code);
  if (!player) {
    redirect(`/join?code=${code}`);
  }

  // Stale lobby view after a refresh/direct nav — route back into the
  // right screen for wherever the game actually is.
  if (room.status === "reveal") redirect(`/room/${code}/reveal`);
  if (room.status === "in_progress") redirect(`/room/${code}/submit`);
  if (room.status === "setup" && room.host_id === player.playerId) {
    redirect(`/room/${code}/setup`);
  }

  const { data: players } = await supabaseServer
    .from("players")
    .select("id, display_name, joined_at, connection_status")
    .eq("room_code", code)
    .order("joined_at", { ascending: true });

  return (
    <Lobby
      room={room}
      initialPlayers={players ?? []}
      currentPlayerId={player.playerId}
    />
  );
}
