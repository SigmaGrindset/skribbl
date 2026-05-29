# 🎨 SigmaSkribbl

A room-wide, real-time **draw-and-guess** game (skribbl.io style). One player
draws a secret word; everyone else races to guess it in chat. Built to deploy
**for free** on Vercel (web app) + PartyKit (realtime server).

> Full specification: [`docs/SSD.md`](docs/SSD.md) · Contributor guide: [`CLAUDE.md`](CLAUDE.md)

## Features
- 🟢 Create / join private rooms with a shareable code & link
- ✏️ Real-time shared canvas (colors, brush sizes, eraser, clear)
- 💬 Chat-based guessing with automatic correct-answer detection ("close!" hints)
- ⏱️ Turn-based rounds with word selection, countdown timer, and live scoring
- 🏆 Per-turn reveals and a final scoreboard, then "play again"
- 🔌 Resilient to disconnects (host reassignment, drawer-left handling)
- 🔒 Server-authoritative: the secret word is never sent to guessers

## Tech stack
- **Next.js (App Router) + React + TypeScript** — UI, deployed on Vercel
- **PartyKit** (`partysocket`) — stateful per-room WebSocket server on Cloudflare
- **Tailwind CSS** — styling
- **HTML5 Canvas 2D** — drawing

## Architecture
```
Browser (Next.js + Canvas) ──HTTP──► Vercel (app shell)
        │
        └── WebSocket (wss) ──► PartyKit (one authoritative game instance per room)
```
Vercel serverless can't hold persistent WebSocket connections, so all real-time
traffic goes to a PartyKit room instance that owns the game state. See
[`docs/SSD.md`](docs/SSD.md) §6.

## Run locally
Requirements: Node 18+ (developed on Node 22).

```bash
npm install
cp .env.example .env       # default host 127.0.0.1:1999 works for local dev
npm run dev                # starts BOTH the Next.js app and the PartyKit server
```
- App: http://localhost:3000
- PartyKit dev server: http://127.0.0.1:1999

Open the app in **two browser windows** (or share your local network URL), create
a room in one, join with the code in the other, and start playing.

Useful single-process scripts:
```bash
npm run dev:next     # only the web app
npm run dev:party    # only the realtime server
npx tsc --noEmit     # type-check everything (incl. the PartyKit server)
```

## Deployment (free)

### 1. Deploy the realtime server (PartyKit)
```bash
npx partykit login         # one-time, opens GitHub auth
npm run deploy:party       # = npx partykit deploy
```
This prints a host like `sigmaskribbl.<your-username>.partykit.dev`. Note it.

### 2. Deploy the web app (Vercel)
1. Push this repo to GitHub (`git@github.com:SigmaGrindset/skribbl.git`).
2. In Vercel: **New Project → Import** the repo (framework auto-detected as Next.js).
3. Add an Environment Variable:
   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_PARTYKIT_HOST` | `sigmaskribbl.<your-username>.partykit.dev` |
4. **Deploy.** Every push to `main` redeploys automatically.

> The PartyKit host is read on the client (`NEXT_PUBLIC_…`), so it must be set at
> build time in Vercel — redeploy after changing it.

### Environments at a glance
| | Web app | PartyKit host |
|--|--|--|
| Local | `next dev` (`:3000`) | `partykit dev` (`127.0.0.1:1999`) |
| Prod  | Vercel | `*.partykit.dev` |

## Project layout
```
app/                 Next.js routes (home + /room/[roomId])
components/          React UI (Canvas, Chat, PlayerList, Lobby, overlays…)
lib/usePartyGame.ts  Client WebSocket hook (state + actions)
party/server.ts      Authoritative PartyKit game server
party/words.ts       Word bank
shared/types.ts      Wire protocol shared by client + server
docs/SSD.md          Software Specification Document
```

## Notes
- The remaining `npm audit` findings are dev-only (`miniflare`/`undici` inside the
  PartyKit local emulator); they do not ship to production. The production-facing
  Next.js advisory is resolved by pinning a patched 15.x.
- No database in this version — scores live in the room instance for the duration
  of a game. Persistence/leaderboards are listed as future work in the SSD.

## License
MIT (for coursework/demo use).
