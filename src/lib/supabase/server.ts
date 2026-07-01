import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Server-only client, uses the service role key and bypasses RLS.
// Every write (create room, join, kick, rename, start game) goes
// through this client inside server actions/route handlers — the
// service role key must never reach the browser bundle.
export const supabaseServer = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
