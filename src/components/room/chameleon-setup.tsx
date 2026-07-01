"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/lib/supabase/client";
import { startChameleonGame } from "@/app/room/chameleon-actions";
import { MIN_CHAMELEON_PLAYERS } from "@/lib/chameleon";

export function ChameleonSetup({
  roomCode,
  initialPlayerCount,
}: {
  roomCode: string;
  initialPlayerCount: number;
}) {
  const router = useRouter();
  const [word, setWord] = useState("");
  const [playerCount, setPlayerCount] = useState(initialPlayerCount);
  const [isPending, startTransition] = useTransition();
  const canStart = playerCount >= MIN_CHAMELEON_PLAYERS;

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
        await startChameleonGame(roomCode, word);
        router.push(`/room/${roomCode}/reveal`);
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
          <h1 className="text-2xl font-semibold tracking-tight">Set the word</h1>
          <p className="text-muted-foreground text-sm">
            Everyone but the Chameleon will see this word.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="word">Word</Label>
          <Input
            id="word"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="e.g. Volcano"
            maxLength={40}
            autoFocus
            required
          />
        </div>

        <p className="text-muted-foreground text-sm">
          {playerCount} player{playerCount === 1 ? "" : "s"} in the room
          {!canStart && ` — need at least ${MIN_CHAMELEON_PLAYERS} to start`}
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
