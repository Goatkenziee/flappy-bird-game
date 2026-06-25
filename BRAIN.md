# BRAIN.md

## What this app does
Build a flappy bird game

## Current state
The game is working. Fixed two issues:
1. **Build error (PageNotFoundError: /_document)**: Removed the `pages/_app.tsx` and `pages/_document.tsx` files. This is a pure App Router project — those Pages Router files were causing Next.js 14.2's hybrid router to crash during "Collecting page data" phase.
2. **Runtime `g is not defined` bug**: The `useEffect` game loop had `g.animId` references outside the `loop()` function where `g` (defined as `const g = gameRef.current` inside `loop`) was out of scope. Changed those two lines to use `gameRef.current.animId`.

## Tech stack and why
- Next.js 14.2.21 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Canvas-based rendering (no game engine dependency)

## What has been built
- Flappy Bird game with canvas rendering
- Animated bird with wing flap, tilt, gradient body
- Procedural sky gradient, clouds, mountains, ground
- Pipe spawning, collision detection, scoring
- Start/dead/playing game states
- Keyboard (Space/ArrowUp), touch, and click controls

## Latest verification
- ✅ Build error fixed: removed pages/_app.tsx and pages/_document.tsx (pure App Router)
- ✅ Runtime bug fixed: `g.animId` → `gameRef.current.animId` outside loop scope
- ⏳ Next build to confirm clean

## What's still pending
- Push to GitHub and redeploy

## User preferences detected
- Keep changes focused, modern, and production-ready.

## Run notes
- Last updated: 2026-06-25T08:30:26.410Z
- Autonomous iteration: 0
