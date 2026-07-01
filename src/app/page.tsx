import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="flex w-full max-w-md flex-col items-center gap-10 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            Secret Underground Railroad
          </h1>
          <p className="text-muted-foreground text-balance">
            Setup and logistics for in-person party games. No one has to sit
            out to run it.
          </p>
        </div>

        <div className="glass-panel flex w-full flex-col gap-3 p-6">
          <Button
            render={<Link href="/create" />}
            nativeButton={false}
            size="lg"
            className="w-full"
          >
            Create Room
          </Button>
          <Button
            render={<Link href="/join" />}
            nativeButton={false}
            size="lg"
            variant="secondary"
            className="w-full"
          >
            Join Room
          </Button>
        </div>
      </div>
    </div>
  );
}
