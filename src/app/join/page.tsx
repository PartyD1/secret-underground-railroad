"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { unstable_rethrow, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinRoom } from "@/app/room/actions";

export default function JoinRoomPage() {
  return (
    <Suspense>
      <JoinRoomForm />
    </Suspense>
  );
}

function JoinRoomForm() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code")?.toUpperCase() ?? "");
  const [displayName, setDisplayName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await joinRoom(code, displayName);
      } catch (err) {
        unstable_rethrow(err);
        toast.error(err instanceof Error ? err.message : "Could not join room.");
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
          <h1 className="text-2xl font-semibold tracking-tight">Join Room</h1>
          <p className="text-muted-foreground text-sm">
            Enter the room code from your host and your name.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="room-code">Room code</Label>
          <Input
            id="room-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC-123"
            className="text-center font-mono text-lg tracking-widest uppercase"
            autoFocus
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="display-name">Your name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            maxLength={30}
            required
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? "Joining…" : "Join Room"}
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
