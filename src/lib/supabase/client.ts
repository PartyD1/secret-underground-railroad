import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Browser client, uses the anon key. RLS restricts it to public reads
// on rooms/players only — see supabase/migrations/0001_init.sql.
export const supabaseBrowser = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
