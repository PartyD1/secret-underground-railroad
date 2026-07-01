-- Phase 2: Chameleon game MVP (config/assignment/reveal only, no
-- in-app voting — see CLAUDE.md Section 6.3).

create table game_sessions (
  room_code text primary key references rooms(code) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  assignments jsonb not null default '{}'::jsonb,
  phase text not null default 'pending',
  submissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table game_sessions enable row level security;

-- No policies for anon/authenticated: default-deny. `assignments` (and
-- for Chameleon, `config.word`) must never be directly queryable by
-- any client — see CLAUDE.md Section 4 hard rule. All reads go through
-- server actions that verify the caller's own player identity first
-- and return only that player's slice.
