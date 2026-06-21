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

## Design Direction

Simple, modern, minimal. No heavy animations. Mobile-first. Full design system comes in a later stage.

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in values. Never commit `.env.local`.
