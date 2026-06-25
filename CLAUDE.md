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

## API Routes

- `GET  /api/groups` — list groups the current user belongs to (with member count)
- `POST /api/groups` — create a group (body: `{ name }`)
- `GET  /api/groups/[id]` — group details + members with profiles
- `POST /api/groups/[id]/members` — add a member by email (body: `{ email }`)
- `GET  /api/groups/[id]/expenses` — list group expenses with splits, category, payer
- `GET  /api/groups/[id]/balances` — calculated balances and simplified debts for a group
- `POST /api/expenses` — create expense with splits atomically (body: `{ groupId, paidBy, categoryId, amountToman, description, expenseDate, splits }`)
- `GET  /api/expenses/[id]` — single expense with splits, category, payer
- `POST /api/settlements` — record a settlement (body: `{ groupId, fromUser, toUser, amountToman }`)
- `GET  /api/categories` — list all categories

## Business Logic

- `lib/balance.ts` — pure functions for balance calculation (`calculateBalances`, `simplifyDebts`, `calculateGroupDebts`) and splitting (`splitEqually`, `splitByPercentage`). Zero side effects, tested with node:test.
- `lib/expense-service.ts` — `createExpenseWithSplits()` handles atomic expense + splits insertion with manual rollback on failure.

## Design System

Neubrutalist visual language: hard ink borders (`2px solid #0D0D0D`), offset box-shadows (`4px 4px 0px #0D0D0D`), press-effect on hover/active, rounded-lg corners.

- **Fonts:** Space Grotesk (display/headings/amounts), Inter (body) — loaded via Google Fonts in `globals.css`
- **Colors:** warm off-white bg (`#FFFDF7`), yellow primary (`#FFD600`), green positive (`#00C566`), red negative (`#FF3B3B`), ink (`#0D0D0D`) — defined as CSS vars via `@theme inline` in `globals.css`
- **Icons:** `lucide-react` — category icons mapped in `lib/category-icons.ts`
- **Avatars:** deterministic color from user ID hash — `lib/avatar-colors.ts`
- **Amounts:** Latin numerals with comma formatting, currency label "تومان" — `lib/format.ts`

### Component Library (`components/`)

- `ui/` — Button (primary/secondary/ghost/danger), Card, Input, Drawer (bottom sheet), Avatar, Badge, AmountDisplay, EmptyState, SkeletonCard
- `layout/` — BottomNav (4 tabs), PageHeader (sticky top bar), FAB (floating action button)
- `shared/` — CategoryPicker, SplitTypeSelector

### App Routes (under `(app)/` route group with BottomNav)

- `/dashboard` — overview: net balance, group list, recent debts, FAB → add expense
- `/groups` — group list with create drawer
- `/groups/[id]` — group detail with tabs (expenses, balances, members)
- `/balances` — all debts across groups with settle-up flow
- `/profile` — user info + sign out

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in values. Never commit `.env.local`.
