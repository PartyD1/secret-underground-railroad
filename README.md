# Secret Underground Railroad

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + keys
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Database schema lives in [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) — run it once against your Supabase project via the SQL Editor (Dashboard → SQL Editor → paste → Run).

## What this is

A web app that runs setup/logistics for in-person social deduction party games (Mafia, Empire, Chameleon), so no one has to sit out to run the game. See [CLAUDE.md](CLAUDE.md) for the full spec.
