"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/client";
import { resetChameleonGame } from "@/app/room/chameleon-actions";
import type { MyChameleonAssignment } from "@/lib/chameleon";
import type { RoomStatus } from "@/lib/supabase/types";

export function RevealCard({
  roomCode,
  assignment,
  isHost,
}: {
  roomCode: string;
  assignment: MyChameleonAssignment;
  isHost: boolean;
}) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // If the host starts a new round from another tab/device, everyone
    // still sitting on this reveal screen needs to head back to the
    // lobby to wait for the next word — the host navigates themselves.
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
        await resetChameleonGame(roomCode);
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
            assignment.isChameleon ? (
              <>
                <span className="text-muted-foreground text-sm tracking-wide uppercase">
                  Your role
                </span>
                <span className="text-primary text-3xl font-semibold tracking-tight text-balance">
                  You&apos;re the Chameleon
                </span>
              </>
            ) : (
              <>
                <span className="text-muted-foreground text-sm tracking-wide uppercase">
                  The word is
                </span>
                <span className="text-4xl font-semibold tracking-tight">
                  {assignment.word}
                </span>
              </>
            )
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
