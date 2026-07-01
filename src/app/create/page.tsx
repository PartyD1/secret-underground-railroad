"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRoom } from "@/app/room/actions";
import type { GameType } from "@/lib/supabase/types";

const GAME_OPTIONS: { value: GameType; label: string }[] = [
  { value: "mafia", label: "Mafia" },
  { value: "empire", label: "Empire" },
  { value: "chameleon", label: "Chameleon" },
];

export default function CreateRoomPage() {
  const [displayName, setDisplayName] = useState("");
  const [gameType, setGameType] = useState<GameType>("chameleon");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createRoom(displayName, gameType);
      } catch (err) {
        unstable_rethrow(err);
        toast.error(err instanceof Error ? err.message : "Could not create room.");
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <form
        onSubmit={handleSubmit}
        className="glass-panel flex w-full max-w-md flex-col gap-6 p-6"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Create Room</h1>
          <p className="text-muted-foreground text-sm">
            You&apos;ll be the host — set your name and pick a game.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="display-name">Your name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            maxLength={30}
            autoFocus
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Game</Label>
          <div className="grid grid-cols-3 gap-2">
            {GAME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setGameType(option.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  gameType === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-secondary-foreground hover:bg-accent/20"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? "Creating…" : "Create Room"}
        </Button>

        <Link
          href="/"
          className="text-muted-foreground text-center text-sm hover:text-foreground"
        >
          Back
        </Link>
      </form>
    </div>
  );
}
