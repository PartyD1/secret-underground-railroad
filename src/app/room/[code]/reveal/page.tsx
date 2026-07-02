import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { verifyPlayer } from "@/lib/auth";
import { normalizeRoomCode } from "@/lib/room-code";
import { getMyChameleonAssignment } from "@/app/room/chameleon-actions";
import { getMyMafiaAssignment } from "@/app/room/mafia-actions";
import { RevealCard } from "@/components/room/reveal-card";
import { MafiaRevealCard } from "@/components/room/mafia-reveal-card";

export default async function RoomRevealPage({
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

  if (room.status !== "reveal") redirect(`/room/${code}`);

  const isHost = room.host_id === player.playerId;

  if (room.game_type === "mafia") {
    const assignment = await getMyMafiaAssignment(code);
    return (
      <MafiaRevealCard roomCode={code} assignment={assignment} isHost={isHost} />
    );
  }

  const assignment = await getMyChameleonAssignment(code);
  return <RevealCard roomCode={code} assignment={assignment} isHost={isHost} />;
}
