-- Phase 1: rooms, players, lobby.
-- game_sessions / assignments / submissions land in Phase 2+ when game
-- logic is actually built (see CLAUDE.md Section 8 build phases).

create extension if not exists pgcrypto;

create table rooms (
  code text primary key,
  host_id uuid,
  status text not null default 'lobby'
    check (status in ('lobby', 'setup', 'in_progress', 'reveal', 'complete')),
  game_type text not null
    check (game_type in ('mafia', 'empire', 'chameleon')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(code) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  connection_status text not null default 'connected'
    check (connection_status in ('connected', 'disconnected'))
);

alter table rooms
  add constraint rooms_host_id_fkey
  foreign key (host_id) references players(id) on delete set null;

-- Per-player secret, issued once at create/join time and stored in an
-- httpOnly cookie on that player's device. Proves "this is my own
-- player row" for later self-service actions (rename, leave) and for
-- host authorization (host_id + matching secret_token) without a full
-- auth system. Never exposed to any other client.
create table player_secrets (
  player_id uuid primary key references players(id) on delete cascade,
  secret_token uuid not null default gen_random_uuid()
);

alter table rooms enable row level security;
alter table players enable row level security;
alter table player_secrets enable row level security;

-- Public, non-sensitive: needed for room lookup and the live lobby list.
create policy "rooms are publicly readable" on rooms
  for select using (true);

create policy "players are publicly readable" on players
  for select using (true);

-- No policies on player_secrets for anon or authenticated: default-deny.
-- Only the service role (used exclusively in server-side Next.js code)
-- can read or write it.

-- All writes (create room, join, kick, rename, start game) go through
-- server-side code using the service role key, which bypasses RLS by
-- design. The anon key is read-only for these tables.

create index players_room_code_idx on players(room_code);

-- Live lobby list / room status rely on Supabase Realtime.
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;

-- DELETE payloads only carry primary-key columns by default, so a
-- Realtime filter on room_code (a non-PK column) silently drops kick
-- events without this. Full row needed on delete for the filter to match.
alter table players replica identity full;

-- Hourly sweep for the 24h room expiry policy. Requires the pg_cron
-- extension (enable it in Supabase Dashboard -> Database -> Extensions
-- if this fails when running the migration).
create extension if not exists pg_cron;

select cron.schedule(
  'delete-expired-rooms',
  '0 * * * *',
  $$ delete from rooms where expires_at < now(); $$
);
