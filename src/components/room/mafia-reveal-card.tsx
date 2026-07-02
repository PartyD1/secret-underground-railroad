"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/client";
import { resetMafiaGame } from "@/app/room/mafia-actions";
import { ROLE_LABELS, type MyMafiaAssignment } from "@/lib/mafia";
import type { RoomStatus } from "@/lib/supabase/types";

export function MafiaRevealCard({
  roomCode,
  assignment,
  isHost,
}: {
  roomCode: string;
  assignment: MyMafiaAssignment;
  isHost: boolean;
}) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [isPending, startTransition] = useTransition();

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
          const status = (payload.new as { status: RoomStatus }).status;
          if (status !== "reveal" && !isHost) {
            router.push(`/room/${roomCode}`);
          }
        },
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [roomCode, isHost, router]);

  function handleNewRound() {
    startTransition(async () => {
      try {
        await resetMafiaGame(roomCode);
        router.push(`/room/${roomCode}/setup`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not start a new round.",
        );
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-10">
        <button
          type="button"
          onClick={() => setRevealed(true)}
          disabled={revealed}
          className="glass-panel flex aspect-3/4 w-full flex-col items-center justify-center gap-4 p-8 text-center transition-all duration-300"
        >
          {revealed ? (
            <>
              <span className="text-muted-foreground text-sm tracking-wide uppercase">
                Your role
              </span>
              <span className="text-primary text-3xl font-semibold tracking-tight text-balance">
                {ROLE_LABELS[assignment.role]}
              </span>
              {assignment.teammates.length > 0 && (
                <div className="flex flex-col gap-1 pt-2">
                  <span className="text-muted-foreground text-xs tracking-wide uppercase">
                    Fellow Mafia
                  </span>
                  <span className="text-lg font-medium">
                    {assignment.teammates.map((t) => t.name).join(", ")}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <span className="text-muted-foreground text-sm tracking-wide uppercase">
                Your Role
              </span>
              <span className="text-lg font-medium">Tap to reveal</span>
            </>
          )}
        </button>

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
