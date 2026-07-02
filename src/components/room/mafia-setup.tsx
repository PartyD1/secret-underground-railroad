"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/client";
import { startMafiaGame } from "@/app/room/mafia-actions";
import {
  MIN_MAFIA_PLAYERS,
  ROLE_LABELS,
  suggestMafiaConfig,
  validateMafiaConfig,
  type MafiaConfig,
} from "@/lib/mafia";

const STEPPER_ROLES: (keyof MafiaConfig)[] = ["mafia", "doctor", "detective", "jester"];

export function MafiaSetup({
  roomCode,
  initialPlayerCount,
}: {
  roomCode: string;
  initialPlayerCount: number;
}) {
  const router = useRouter();
  const [playerCount, setPlayerCount] = useState(initialPlayerCount);
  const [override, setOverride] = useState<MafiaConfig | null>(null);
  const [isPending, startTransition] = useTransition();

  // Suggest a fresh default as players join/leave, unless the host has
  // already started tweaking the steppers themselves.
  const config = override ?? suggestMafiaConfig(playerCount);

  useEffect(() => {
    const channel = supabaseBrowser
      .channel(`setup-players-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_code=eq.${roomCode}`,
        },
        () => {
          supabaseBrowser
            .from("players")
            .select("id", { count: "exact", head: true })
            .eq("room_code", roomCode)
            .then(({ count }) => {
              if (count !== null) setPlayerCount(count);
            });
        },
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [roomCode]);

  const canStart = playerCount >= MIN_MAFIA_PLAYERS;
  const validationError = canStart ? validateMafiaConfig(config, playerCount) : null;

  function adjust(role: keyof MafiaConfig, delta: number) {
    setOverride({ ...config, [role]: Math.max(0, config[role] + delta) });
  }

  function handleStart() {
    startTransition(async () => {
      try {
        await startMafiaGame(roomCode, config);
        router.push(`/room/${roomCode}/reveal`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not start the game.");
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="glass-panel flex w-full max-w-md flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Configure roles</h1>
          <p className="text-muted-foreground text-sm">
            {playerCount} player{playerCount === 1 ? "" : "s"} in the room
            {!canStart && ` — need at least ${MIN_MAFIA_PLAYERS} to start`}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {STEPPER_ROLES.map((role) => (
            <div key={role} className="flex items-center justify-between">
              <span className="text-sm font-medium">{ROLE_LABELS[role]}</span>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => adjust(role, -1)}
                  disabled={isPending}
                >
                  −
                </Button>
                <span className="w-4 text-center font-mono">{config[role]}</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => adjust(role, 1)}
                  disabled={isPending}
                >
                  +
                </Button>
              </div>
            </div>
          ))}
        </div>

        {validationError && (
          <p className="text-destructive text-sm">{validationError}</p>
        )}

        <Button
          size="lg"
          className="w-full"
          onClick={handleStart}
          disabled={isPending || !canStart || !!validationError}
        >
          {isPending ? "Starting…" : "Start Game"}
        </Button>

        <Link
          href={`/room/${roomCode}`}
          className="text-muted-foreground text-center text-sm hover:text-foreground"
        >
          Back to lobby
        </Link>
      </div>
    </div>
  );
}
