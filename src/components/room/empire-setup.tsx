"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/lib/supabase/client";
import { startEmpireGame } from "@/app/room/empire-actions";
import { CURATED_THEMES, MIN_EMPIRE_PLAYERS } from "@/lib/empire";

export function EmpireSetup({
  roomCode,
  initialPlayerCount,
}: {
  roomCode: string;
  initialPlayerCount: number;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState("");
  const [playerCount, setPlayerCount] = useState(initialPlayerCount);
  const [isPending, startTransition] = useTransition();
  const canStart = playerCount >= MIN_EMPIRE_PLAYERS;

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await startEmpireGame(roomCode, theme);
        router.push(`/room/${roomCode}/submit`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not start the game.");
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <form
        onSubmit={handleSubmit}
        className="glass-panel flex w-full max-w-md flex-col gap-6 p-6"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Set the theme</h1>
          <p className="text-muted-foreground text-sm">
            Everyone will privately submit one word that fits.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {CURATED_THEMES.map((t) => (
            <Button
              key={t}
              type="button"
              variant={theme === t ? "default" : "secondary"}
              size="sm"
              onClick={() => setTheme(t)}
            >
              {t}
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="theme">Theme</Label>
          <Input
            id="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. Countries, or write your own"
            maxLength={60}
            required
          />
        </div>

        <p className="text-muted-foreground text-sm">
          {playerCount} player{playerCount === 1 ? "" : "s"} in the room
          {!canStart && ` — need at least ${MIN_EMPIRE_PLAYERS} to start`}
        </p>

        <Button type="submit" size="lg" className="w-full" disabled={isPending || !canStart}>
          {isPending ? "Starting…" : "Start Game"}
        </Button>

        <Link
          href={`/room/${roomCode}`}
          className="text-muted-foreground text-center text-sm hover:text-foreground"
        >
          Back to lobby
        </Link>
      </form>
    </div>
  );
}
