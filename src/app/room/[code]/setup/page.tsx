import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { verifyHost } from "@/lib/auth";
import { normalizeRoomCode } from "@/lib/room-code";
import { ChameleonSetup } from "@/components/room/chameleon-setup";
import { MafiaSetup } from "@/components/room/mafia-setup";

export default async function RoomSetupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);

  const { data: room } = await supabaseServer
    .from("rooms")
    .select("code, status, game_type")
    .eq("code", code)
    .maybeSingle();
  if (!room) notFound();

  const host = await verifyHost(code);
  if (!host) redirect(`/room/${code}`);

  // Empire hasn't landed yet — everything else routes here once its
  // setup screen exists.
  if (room.game_type !== "chameleon" && room.game_type !== "mafia") {
    redirect(`/room/${code}`);
  }
  if (room.status === "reveal") redirect(`/room/${code}/reveal`);

  const { count } = await supabaseServer
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("room_code", code);

  if (room.game_type === "mafia") {
    return <MafiaSetup roomCode={code} initialPlayerCount={count ?? 0} />;
  }

  return <ChameleonSetup roomCode={code} initialPlayerCount={count ?? 0} />;
}
