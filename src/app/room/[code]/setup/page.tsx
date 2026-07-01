import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { verifyHost } from "@/lib/auth";
import { normalizeRoomCode } from "@/lib/room-code";
import { ChameleonSetup } from "@/components/room/chameleon-setup";

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

  // Only Chameleon is built so far (Phase 2) — Mafia/Empire land in
  // Phase 3 on top of this same shared flow.
  if (room.game_type !== "chameleon") redirect(`/room/${code}`);
  if (room.status === "reveal") redirect(`/room/${code}/reveal`);

  const { count } = await supabaseServer
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("room_code", code);

  return <ChameleonSetup roomCode={code} initialPlayerCount={count ?? 0} />;
}
