"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  getEmpireStatus,
  revealEmpireGame,
  submitEmpireWord,
  type EmpireStatus,
} from "@/app/room/empire-actions";
import type { RoomStatus } from "@/lib/supabase/types";

const POLL_INTERVAL_MS = 2000;

export function EmpireSubmit({
  roomCode,
  isHost,
}: {
  roomCode: string;
  isHost: boolean;
}) {
  const router = useRouter();
  const [word, setWord] = useState("");
  const [status, setStatus] = useState<EmpireStatus | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRevealing, startReveal] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const next = await getEmpireStatus(roomCode);
        if (!cancelled) setStatus(next);
      } catch {
        // Session not ready yet or round already moved on; next poll
        // or the room-status subscription below will settle it.
      }
    }
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomCode]);

  useEffect(() => {
    const channel = supabaseBrowser
      .channel(`room-status-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${roomCode}`,
        },
        (payload) => {
          const nextStatus = (payload.new as { status: RoomStatus }).status;
          if (nextStatus === "reveal") router.push(`/room/${roomCode}/reveal`);
        },
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [roomCode, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await submitEmpireWord(roomCode, word);
        const next = await getEmpireStatus(roomCode);
        setStatus(next);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not submit your word.");
      }
    });
  }

  function handleReveal() {
    startReveal(async () => {
      try {
        await revealEmpireGame(roomCode);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not reveal.");
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="glass-panel flex w-full max-w-md flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {status?.theme ?? "Loading…"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Submit one word that fits the theme.
          </p>
        </div>

        {status?.mySubmitted ? (
          <p className="text-primary text-sm font-medium">
            Word submitted — waiting on everyone else.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <Label htmlFor="word">Your word</Label>
            <Input
              id="word"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="e.g. Volcano"
              maxLength={40}
              autoFocus
              required
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Submitting…" : "Submit"}
            </Button>
          </form>
        )}

        <p className="text-muted-foreground text-sm">
          {status ? `${status.submittedCount} of ${status.totalPlayers} submitted` : ""}
        </p>

        {isHost && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleReveal}
            disabled={isRevealing}
          >
            {isRevealing ? "Revealing…" : "Reveal Words"}
          </Button>
        )}
      </div>
    </div>
  );
}
