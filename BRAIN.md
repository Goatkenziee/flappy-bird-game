# BRAIN.md

## What this app does
A Flappy Bird game built with Next.js 14 App Router and Canvas API. The player controls a bird by clicking/tapping/spacebar to navigate through pipes.

## Current state
✅ All verification issues fixed. Production build passes cleanly.

## Tech stack and why
- **Next.js 14** (App Router) — React framework with static generation
- **Canvas API** — 2D game rendering (no extra dependencies)
- **Tailwind CSS** — layout and styling
- **TypeScript** — type safety throughout

## What has been built
- `app/page.tsx` — Full game page with title, instructions, and canvas
- `app/layout.tsx` — Root layout with dark theme
- `app/globals.css` — Tailwind base styles
- `components/flappy-bird.tsx` — Complete game component with:
  - Canvas-based rendering (sky gradient, clouds, ground, grass)
  - Bird with rotation based on velocity, wing, eye, and beak
  - Green pipes with caps and highlights
  - Physics: gravity, flap velocity, pipe collision
  - Score tracking with display
  - Start screen overlay ("Tap / Space / Click to start")
  - Game Over screen with score and restart prompt
  - Keyboard (Space/ArrowUp), touch, and click input
- `components/ui/button.tsx` — shadcn-style button component
- `components/ui/card.tsx` — shadcn-style card component
- `lib/utils.ts` — cn() utility
- Config files: tsconfig, tailwind, postcss, next.config

## Latest verification
- ✅ Build passes: `next build` compiles successfully with zero errors
- ✅ TypeScript: all type checks pass (fixed `ctx` nullability)
- ✅ `app/page.tsx`: full game page with layout, title, instructions (863 chars)
- ✅ `package.json`: `next` properly listed, build runs without `not found` errors

## What's still pending
- Deploy to Vercel for live URL
- Push to GitHub for source control

## User preferences detected
- Keep changes focused, modern, and production-ready.
- Canvas-based game with no external game libraries.

## Run notes
- Last updated: 2026-06-25T08:44:40.698Z
- Autonomous iteration: 0
- Fix run: Fixed 3 verification issues (page.tsx content, ctx nullability, next binary)
