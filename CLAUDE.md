# Expense Splitter

A mobile-first expense-splitting and simple debt-tracking web app for a small private friend group (~10-30 users). Think Splitwise but simpler. Single currency: Iranian Toman, integer amounts only (no decimals).

## Tech Stack

- **Framework:** Next.js (App Router) with TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Backend:** Supabase (Postgres + Auth with Google sign-in) — not wired up yet
- **Deployment:** Vercel

## Folder Structure

- `app/` — Next.js App Router routes and layouts
- `components/` — Shared, reusable UI components
- `lib/` — Utility functions and service clients (e.g., Supabase client)
- `types/` — Shared TypeScript type definitions
- `public/` — Static assets

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — Run ESLint

## Database Schema

7 tables: `profiles`, `groups`, `group_members`, `categories`, `expenses`, `expense_splits`, `settlements`. Full schema in `supabase/schema.sql`.

- All monetary amounts are integers (Iranian Toman, no decimals)
- `expenses.group_id` is nullable — null means a quick loan between two people
- RLS enabled on every table. Policies use a `SECURITY DEFINER` function `is_group_member(group_id, user_id)` to check group membership without infinite recursion on `group_members`
- A trigger on `auth.users` auto-creates a `profiles` row on sign-up
- Supabase clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server)

## Authentication

- Auth is handled by Supabase Auth + Google OAuth
- Callback route: `app/auth/callback/route.ts` exchanges the OAuth code for a session
- `middleware.ts` protects all routes — unauthenticated users are redirected to `/login`
- Session is cookie-based (Supabase SSR pattern via `lib/supabase/middleware.ts`)
- User profile data lives in the `profiles` table (auto-created by trigger on sign-up); display metadata also available via `session.user.user_metadata`

## Design Direction

Simple, modern, minimal. No heavy animations. Mobile-first. Full design system comes in a later stage.

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in values. Never commit `.env.local`.
