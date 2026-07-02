"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resetEmpireGame } from "@/app/room/empire-actions";
import type { EmpireReveal } from "@/app/room/empire-actions";

export function EmpireRevealCard({
  roomCode,
  reveal,
  isHost,
}: {
  roomCode: string;
  reveal: EmpireReveal;
  isHost: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleNewRound() {
    startTransition(async () => {
      try {
        await resetEmpireGame(roomCode);
        router.push(`/room/${roomCode}/setup`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not start a new round.",
        );
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="glass-panel flex w-full max-w-md flex-col gap-6 p-6">
        <div className="flex flex-col gap-1 text-center">
          <span className="text-muted-foreground text-sm tracking-wide uppercase">
            {reveal.theme}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">The words</h1>
        </div>

        <ul className="flex flex-col gap-2">
          {reveal.words.map((w, i) => (
            <li
              key={i}
              className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-center text-lg font-medium"
            >
              {w}
            </li>
          ))}
        </ul>

        {isHost && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleNewRound}
            disabled={isPending}
          >
            {isPending ? "Starting new round…" : "New Round"}
          </Button>
        )}
      </div>
    </div>
  );
}
