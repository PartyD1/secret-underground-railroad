# CLAUDE.md — The Secret Underground Railroad

This file is the source of truth for this project. Reference it before implementing any feature. If a requirement here conflicts with a request in chat, ask the user rather than silently picking one.

---

## 1. Project Summary

A web app that runs setup/logistics for in-person social deduction party games, so no human has to sit out to "run" the game. Players join a shared room from their own phones via a room code. The room creator (referred to as the **Host**) configures and triggers game actions; each player's phone shows only their own private info (role, word, etc.).

Three games in scope: **Mafia**, **Empire**, **Chameleon** (aka Impostor). See Section 6.

---

## 2. Tech Stack (decided — do not deviate without asking)

- **Framework**: Next.js (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Real-time sync / DB**: Supabase (Postgres + Realtime) — *default choice; if the user has set up Firebase instead, defer to what's actually configured in the repo*
- **Hosting**: Vercel
- **Auth**: None. Room code is the only access control. Do not add user accounts/login unless explicitly requested.

---

## 3. Naming & Voice Conventions

**Do not use thematic/in-world copy.** This was tried and explicitly rejected — the app name carries the identity, the UI copy should not. Keep all labels neutral and functional.

- Host role → **"Host"** or **"Organizer"** in UI copy (plain, not an in-world term like "Conductor").
- Primary actions use plain, direct labels: "Create Room," "Join Room," "Start Game," "Your Role." No puns, no flavor text, no renamed standard actions.
- Room codes: short, human-typeable alphanumeric code (e.g. `RAIL-7Q2` or similar). Don't build a themed word-pair generator ("Velvet Tunnel" etc.) — plain codes are sufficient and simpler.
- If in doubt on any copy string, default to the most boring/clear option, not the most flavorful one.

---

## 4. Data Model

```
Room
  code: string (unique, short)
  host_id: string
  status: 'lobby' | 'setup' | 'in_progress' | 'reveal' | 'complete'
  game_type: 'mafia' | 'empire' | 'chameleon'
  created_at: timestamp
  expires_at: timestamp   # default: created_at + 24h

Player
  id: string
  room_code: string (FK -> Room.code)
  display_name: string
  joined_at: timestamp
  connection_status: 'connected' | 'disconnected'

GameSession  (one active per Room)
  room_code: string (FK -> Room.code)
  config: jsonb            # game-specific config, see Section 6
  assignments: jsonb       # map of player_id -> role/word. NEVER sent to clients other than the owning player.
  phase: string             # game-specific state machine value, see Section 6
  submissions: jsonb       # used by Empire only; see 6.2
```

**Hard rule**: `assignments` data must never be queryable/visible to a client for any `player_id` other than the requesting player's own session. Enforce this at the query/API layer, not just in the UI (a player should not be able to find their role by inspecting network requests).

---

## 5. Universal Flow (applies to all 3 games)

1. **Create Room** — Host names the room (or auto-generate) and selects `game_type`.
2. **Lobby** — Players join via code + display name. Host sees live joined-player list. Host can kick/rename entries.
3. **Configure** — game-specific setup screen (Section 6).
4. **Deal/Distribute** — each player privately reveals their role/word on their own device. This is the core UX moment — see Section 7 for design requirements.
5. **Play** — for Phase 2/3 builds (see Section 8), the app gets out of the way here; group plays in person.
6. **Reset/Replay** — one tap to re-shuffle and start a new round without re-entering names.

---

## 6. Game Specs

### 6.1 Mafia

**Roles**

| Role | Required | Default state |
|---|---|---|
| Mafia | Yes | On |
| Doctor / Angel | Yes | On |
| Detective | No | On by default |
| Jester | No | Off by default |

**Auto-config ratio logic** (suggest, but Host can override via steppers):

| Players | Mafia | Doctor | Detective | Jester (optional) |
|---|---|---|---|---|
| 5–6 | 1 | 1 | 1 | 0 |
| 7–8 | 2 | 1 | 1 | 0–1 |
| 9–10 | 2 | 1–2 | 1 | 0–1 |
| 11–13 | 3 | 2 | 1 | 0–1 |
| 14+ | ~25% of players (round down) | scale with size | 1–2 | 0–1 |

Validation rules to enforce in config UI:
- Mafia count ≥ 1, target ≈ 20–25% of total players, rounded down.
- Total special roles (mafia + doctor + detective + jester) must be < total players (need at least 1 unassigned "town" member... actually need town ≥ mafia + 1, warn if violated).
- Mafia members, once assigned, must be able to see each other's identities (not just their own role) — this is a Mafia-specific exception to the "private to self" rule in Section 4.

**Phase 1 build scope**: role assignment + private reveal only. No game-running logic.

**Phase 2 build scope (later milestone — do not start until explicitly requested)**: full state machine —
- Night phase: Mafia select kill target (synced choice across mafia), Doctor selects protect target, Detective selects investigate target + receives result.
- Day phase: reveal death (or "no kill" if saved), discussion timer.
- Voting: each player votes, app tallies, handles ties, announces elimination.
- Win conditions: mafia eliminated → town wins; mafia ≥ town → mafia wins; jester voted out → jester wins (if enabled).
- End-of-game role reveal log.

This phase is a single bundled deliverable — do not ship a partial version (e.g. voting without win-condition checks). A half-built automated game-runner is worse than none, because it removes the human moderator without being able to replace them.

### 6.2 Empire

**Flow**:
1. Host sets theme — free text, or selects from a static curated list (e.g. Countries, Fruits, Movies, '90s Nostalgia, Animals, Landmarks). Static list is sufficient; no AI generation needed.
2. Each player privately submits one word on their own device.
3. Live counter shows submission progress ("4 of 6 submitted").
4. Host triggers reveal: word list shown in **randomized order, with no names attached**.
5. Optional reveal mode: flip-one-at-a-time rather than full list dump (nice-to-have, not blocking).

**Hard rule**: once submissions are collected, the `submission → player_id` link must not be derivable from anything sent to any client, including the Host's. Break the link server-side if possible.

### 6.3 Chameleon (aka Impostor)

**Flow**:
1. Host enters one word. No theme in Phase 1 scope.
2. App randomly assigns exactly one player as Chameleon.
3. Each phone reveals either the shared word, or "You're the Chameleon" messaging.
4. Group plays in person (hints, bluffing, vote) — no in-app voting needed for this game.

**Future extension (not in scope until requested)**: optional theme-hint mode where Chameleon sees the theme but not the word. Build the underlying data model generically enough (single "shared secret, one outlier" primitive) that this is additive, not a rewrite.

---

## 7. Visual/UX Design System

**Direction**: modern, sleek, minimal — a hybrid of clean utilitarian design (Linear, Vercel) and soft glassmorphism (translucent, blurred glass panels, like iOS Control Center). Explicitly **not** decorative, not thematic, not overengineered. The app name carries the identity; the UI does not need to illustrate it. No literal railroad/secret-society motifs, icons, or imagery anywhere in the UI.

**Background**
- Near-black with a warm brown/espresso undertone — very dark, reads as charcoal at a glance, warm on closer inspection. Not a mid-tone or light brown.
- Subtle soft gradient behind content: one or two low-opacity glow shapes diffused across the background. This is functionally necessary, not just decorative — glass/blur panels need visual variation behind them to read as "glass"; a flat solid background makes blur effects invisible.
- Very fine grain/noise texture at low opacity (~3–5%) for depth. Should not be visibly "texture," just subtle richness.

**Color**
- Effectively monochrome: espresso-black background, white/off-white text.
- One accent color used sparingly, for primary actions / active states / key highlights only: warm amber/gold. Do not introduce other colors into the palette.

**Components**
- Cards and panels: glass/blur treatment — translucent fill, backdrop blur, thin subtle border (not a hard outline), soft shadow for lift.
- Buttons/inputs: same restrained glass treatment where sensible; primary CTAs can be solid amber for contrast against glass panels.
- No skeuomorphic detail, no heavy shadows, no gradients on individual components beyond the background glow.

**Typography**
- Clean geometric sans-serif throughout (e.g. Inter), for both headers and body. No serif, no display/decorative font anywhere.

**Layout density**
- Spacious with generous whitespace on simple screens (landing, reveal moments).
- Can be denser on screens that need to show more at once (lobby player list, role config steppers). Density follows function, not a fixed rule across all screens.

**Icons / imagery**
- Thin line icons only, minimal weight. No illustrations, no decorative graphics, no mascots. If an empty state needs visual interest, use a simple abstract shape, not custom illustration.

**Motion**
- Smooth and fast — quick, precise transitions. Not slow/cinematic, not bouncy/playful.

**The private reveal screen** (role/word reveal) is still the emotional centerpiece of the product, but the drama should come from typography, spacing, and the reveal interaction itself — not from decorative animation or thematic embellishment (no wax-seal/stamp effects, no lantern glow, etc.). Simple face-down → tap → reveal, done cleanly.

**Host view vs. Player view**: should still feel like two distinct modes (Host sees more controls/density, Player view is focused/minimal) but through layout and information density, not through different visual themes.

---

## 8. Build Phases

Work through phases in order. Do not start a later phase until the current one is confirmed working and the user has signed off.

- **Phase 1 — Foundation**: room creation/join, lobby, live player list, room codes, base dark theme shell. No game logic.
- **Phase 2 — First Game MVP**: ship one game end-to-end (role/word assignment + private reveal only). Game choice TBD — see Section 9.
- **Phase 3 — Remaining Games**: add the other two games on top of the now-proven shared infra.
- **Phase 4 — Mafia Full Automation**: the complete night/day/vote/win-condition state machine (Section 6.1).
- **Phase 5 — Polish**: theme variety, round history, rematch/reshuffle button, sound/animation polish.

---

## 9. Open Decisions (ask the user before assuming)

These were not yet finalized as of this doc's writing. Check the repo/conversation for resolution before building the related piece; if still unresolved, ask rather than guessing:

1. Which backend: Supabase (default assumption above) vs Firebase.
2. Which game ships first in Phase 2: Mafia vs Empire.
3. Room expiry: default 24h auto-delete vs. persistent "permanent group room."

**Resolved**: copy tone is neutral/functional (Section 3), not thematic. Do not revisit this without the user explicitly requesting it.

**Note on UI reference material**: any UI mockups floating around from earlier design exploration (e.g. Stitch-generated screens) are directional references only, not a source of truth to build pixel-for-pixel — the actual component implementation will use different tooling. Follow the design system in Section 7 as the authority; treat visual mockups as a sanity check, not a spec.

---

## 10. Non-Goals (do not build unless explicitly requested)

- User accounts / authentication / login.
- AI-generated themes for Empire (static curated list is sufficient).
- Chameleon theme-hint mode (future extension only).
- Any monetization, analytics, or third-party tracking.