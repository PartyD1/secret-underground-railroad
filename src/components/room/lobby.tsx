"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabaseBrowser } from "@/lib/supabase/client";
import { kickPlayer, renamePlayer } from "@/app/room/actions";
import type { RoomStatus, GameType, ConnectionStatus } from "@/lib/supabase/types";

interface Player {
  id: string;
  display_name: string;
  joined_at: string;
  connection_status: ConnectionStatus;
}

interface Room {
  code: string;
  host_id: string | null;
  status: RoomStatus;
  game_type: GameType;
  expires_at: string;
}

const GAME_LABELS: Record<GameType, string> = {
  mafia: "Mafia",
  empire: "Empire",
  chameleon: "Chameleon",
};

export function Lobby({
  room,
  initialPlayers,
  currentPlayerId,
}: {
  room: Room;
  initialPlayers: Player[];
  currentPlayerId: string;
}) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const isHost = room.host_id === currentPlayerId;

  useEffect(() => {
    const channel = supabaseBrowser
      .channel(`room-players-${room.code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_code=eq.${room.code}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const inserted = payload.new as Player;
            setPlayers((prev) =>
              prev.some((p) => p.id === inserted.id) ? prev : [...prev, inserted],
            );
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Player;
            setPlayers((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p)),
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id;
            if (deletedId === currentPlayerId) {
              toast.error("You were removed from the room.");
              router.push("/");
              return;
            }
            setPlayers((prev) => prev.filter((p) => p.id !== deletedId));
          }
        },
      )
      .subscribe((status) => {
        // Postgres changes that happen while the socket is still
        // handshaking are never replayed, so once the subscription is
        // confirmed live, reconcile against a fresh fetch to catch
        // anything missed in that window (e.g. a player who joined a
        // beat after this page loaded).
        if (status === "SUBSCRIBED") {
          supabaseBrowser
            .from("players")
            .select("id, display_name, joined_at, connection_status")
            .eq("room_code", room.code)
            .then(({ data }) => {
              if (!data) return;
              if (!data.some((p) => p.id === currentPlayerId)) {
                toast.error("You were removed from the room.");
                router.push("/");
                return;
              }
              setPlayers(data);
            });
        }
      });

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [room.code, currentPlayerId, router]);

  function handleCopy() {
    navigator.clipboard.writeText(room.code).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy"), 1500);
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="glass-panel flex flex-col items-center gap-3 p-6 text-center">
          <span className="text-muted-foreground text-sm">Room code</span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-3xl font-semibold tracking-widest">
              {room.code}
            </span>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copyLabel}
            </Button>
          </div>
          <Badge variant="secondary">{GAME_LABELS[room.game_type]}</Badge>
        </div>

        <div className="glass-panel flex flex-col gap-3 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Players</h2>
            <span className="text-muted-foreground text-sm">
              {players.length} joined
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {players.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                isSelf={player.id === currentPlayerId}
                isHostRow={player.id === room.host_id}
                canManage={isHost && player.id !== room.host_id}
                roomCode={room.code}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  isSelf,
  isHostRow,
  canManage,
  roomCode,
}: {
  player: Player;
  isSelf: boolean;
  isHostRow: boolean;
  canManage: boolean;
  roomCode: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(player.display_name);
  const [isPending, startTransition] = useTransition();

  function handleRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === player.display_name) {
      setIsEditing(false);
      setName(player.display_name);
      return;
    }
    startTransition(async () => {
      try {
        await renamePlayer(roomCode, player.id, trimmed);
        setIsEditing(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not rename player.");
        setName(player.display_name);
      }
    });
  }

  function handleKick() {
    if (!confirm(`Remove ${player.display_name} from the room?`)) return;
    startTransition(async () => {
      try {
        await kickPlayer(roomCode, player.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not remove player.");
      }
    });
  }

  return (
    <li className="border-border/60 flex items-center justify-between gap-2 rounded-lg border bg-white/[0.02] px-3 py-2">
      {isEditing ? (
        <input
          className="min-w-0 flex-1 rounded border border-border bg-transparent px-2 py-1 text-sm outline-none focus:border-ring"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setIsEditing(false);
              setName(player.display_name);
            }
          }}
          maxLength={30}
          autoFocus
          disabled={isPending}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm">{player.display_name}</span>
      )}

      <div className="flex shrink-0 items-center gap-1.5">
        {isHostRow && (
          <Badge variant="secondary" className="text-xs">
            Host
          </Badge>
        )}
        {isSelf && (
          <Badge variant="secondary" className="text-xs">
            You
          </Badge>
        )}
        {canManage && !isEditing && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={isPending}
            >
              Rename
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleKick}
              disabled={isPending}
              className="text-destructive hover:text-destructive"
            >
              Remove
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
