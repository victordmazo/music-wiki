# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
npm run dev        # start dev server (http://localhost:3000)
npm run build      # production build
npm test           # run all tests (vitest)
npx vitest run __tests__/api/auth.test.ts   # run a single test file
```

## Environment setup

Copy `.env.example` to `.env.local` and fill in your Supabase credentials before running the app. The register route needs admin-level access (`SUPABASE_SERVICE_ROLE_KEY`, or the newer `SUPABASE_SECRET_KEY`); the login route works with a lower-privilege key (`SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`). Both naming schemes are supported — `lib/supabase.ts` checks the legacy names first, falling back to the current publishable/secret names. Both `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` are read — either prefix works.

Run `supabase/schema.sql` in the Supabase SQL editor before using anything past auth/profile — it creates every other table (wiki entries, change requests, discussions, posts) and their RLS policies. After running it, promote your own account to moderator directly in the SQL editor (see the comment at the top of that file); there's no API route for creating the first moderator.

## Architecture

This is a Next.js 14 App Router project with Tailwind CSS and Supabase auth.

**Request flow for auth:**
1. Client pages (`app/login/page.tsx`, `app/register/page.tsx`) are `'use client'` forms that POST to the API routes via `fetch`.
2. API routes (`app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`) call `getSupabaseClient()` from `lib/supabase.ts` and delegate to the Supabase JS SDK.
3. `lib/supabase.ts` — `getSupabaseClient()` returns `null` when env vars are missing; both routes guard against this and return a 500.

**Key design decisions:**
- Register uses `supabase.auth.admin.createUser` (admin-level key required), so registration bypasses email confirmation.
- Login returns the full Supabase session object under the `session` key (so the access token is at `session.session.access_token`, not `session.access_token`).
- `getSupabaseClient` creates a new client per call with `persistSession: false` — there is no singleton or shared state.

**Content routes (entries, requests, discussions, posts, user moderation):**
- All non-auth routes under `app/api/` call `authenticate(request)` from `lib/api-auth.ts` to resolve the caller's Supabase user and their `myapp_profile` row (role, status).
- These routes run with the same admin-level key as register, which bypasses Row Level Security — so every permission check RLS would normally enforce (ownership, moderator-only actions, suspended/banned accounts) is re-checked in the route handler itself via `isActiveNow()` / `isModerator()`.
- Approving or denying a change request goes through the `myapp_review_request` Postgres function (via `.rpc(...)`), not a plain update, so the entry change and its edit-log row are applied atomically.
- See `supabase/schema.sql` for the full schema/RLS/triggers, and `http/api.rest` for a manual, click-through walkthrough of every route against a live dev server.

**Tests (`__tests__/api/*.test.ts`):**
- Vitest with `environment: 'node'`.
- `lib/supabase` is fully mocked via `vi.mock`; tests import the route handler functions directly and call them with `new Request(...)`.
- `__tests__/api/test-utils.ts` has a reusable fake Supabase client (chainable query builder + a per-test queue of results) for routes that make multiple `.from()`/`.rpc()` calls.
- Tests live in `__tests__/` and are matched by the glob `__tests__/**/*.test.ts`.
