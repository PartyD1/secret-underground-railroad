import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { verifyPlayer } from "@/lib/auth";
import { normalizeRoomCode } from "@/lib/room-code";
import { EmpireSubmit } from "@/components/room/empire-submit";

export default async function RoomSubmitPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);

  const { data: room } = await supabaseServer
    .from("rooms")
    .select("code, host_id, status, game_type")
    .eq("code", code)
    .maybeSingle();
  if (!room) notFound();

  const player = await verifyPlayer(code);
  if (!player) redirect(`/join?code=${code}`);

  if (room.game_type !== "empire") redirect(`/room/${code}`);
  if (room.status === "reveal") redirect(`/room/${code}/reveal`);
  if (room.status !== "in_progress") redirect(`/room/${code}`);

  const isHost = room.host_id === player.playerId;

  return <EmpireSubmit roomCode={code} isHost={isHost} />;
}
