# CLAUDE.md — SigmaSkribbl

Guidance for Claude Code (and humans) working in this repository.

## What this is
A real-time, multiplayer **draw-and-guess** game (skribbl.io style). The web UI
is a Next.js app deployed on **Vercel**; all real-time game traffic runs through
a **PartyKit** server (one stateful instance per room). Full spec lives in
[`docs/SSD.md`](docs/SSD.md).

## Architecture (read this first)
```
Browser (Next.js + Canvas)  ──HTTP──►  Vercel  (serves the app)
        │
        └──WebSocket (wss)──►  PartyKit  (authoritative game server, 1 per room)
```
- **The PartyKit server is the source of truth.** It owns game state, the secret
  word, the timer, and scoring. Clients send *intents* and render *state/events*.
- **The secret word is never broadcast** to non-drawers. It is sent only to the
  drawer (`yourWord`) and revealed at `turnEnd`. Preserve this when editing —
  there is a smoke-test assertion for it.
- Why split hosting? Vercel serverless cannot hold persistent WebSocket
  connections; PartyKit (Cloudflare Durable Objects) can.

## Key files
| Path | Role |
|------|------|
| `shared/types.ts` | **Single source of the wire protocol.** Shared by client + server. Edit here first; both sides import it. Framework-agnostic — no React, no PartyKit imports. |
| `party/server.ts` | Authoritative game state machine (phases, rounds, scoring, draw/chat relay, disconnect handling). |
| `party/words.ts` | Word bank + `pickWords`. |
| `lib/usePartyGame.ts` | Client hook: owns the WebSocket, exposes state + actions + a canvas event subscription. |
| `components/Canvas.tsx` | HTML5 canvas; local drawing (drawer) + applying remote strokes. Coordinates are normalized 0..1; brush size is in fixed 900×600 internal pixels. |
| `components/GameRoom.tsx` | Orchestrates the in-room layout (players / canvas / chat / overlays). |
| `app/page.tsx` | Home: create/join a room. |
| `app/room/[roomId]/page.tsx` | Nickname gate → renders `GameRoom`. |

## Commands
```bash
npm run dev          # runs `next dev` + `partykit dev` together (concurrently)
npm run dev:next     # just the Next.js app  (http://localhost:3000)
npm run dev:party    # just the PartyKit server (127.0.0.1:1999)
npm run build        # production build of the web app
npx tsc --noEmit     # type-check EVERYTHING incl. party/ (next build only checks the app graph)
npm run deploy:party # deploy the PartyKit server (needs `npx partykit login` once)
```
> When changing `party/server.ts`, run `npx tsc --noEmit` — `next build` does not
> fully type-check the PartyKit server on its own.

## Conventions
- **TypeScript strict**, no `any` on the wire — all messages are typed unions in
  `shared/types.ts` (`ClientMessage` / `ServerMessage`).
- Add a new client→server action: extend `ClientMessage`, handle it in
  `onMessage` switch in `party/server.ts`, expose a method from `usePartyGame`.
- Add a new server→client event: extend `ServerMessage`, emit it from the server,
  handle it in the `onMessage` listener inside `usePartyGame`.
- Drawing data must stay **small and batched** (normalized points, throttled via
  `requestAnimationFrame`). Never send full image frames.
- Styling is Tailwind; keep the dark theme tokens defined in `tailwind.config.ts`.

## Environment
- `NEXT_PUBLIC_PARTYKIT_HOST` — host the browser connects to over WS.
  - Local: `127.0.0.1:1999` (the default).
  - Prod: your deployed `sigmaskribbl.<user>.partykit.dev`.
  - See `.env.example`. It is `NEXT_PUBLIC_` so it is inlined into the client bundle.

## Testing the realtime loop
There is no persistent test suite, but the game loop can be smoke-tested by
connecting two WebSocket clients to a running `partykit dev` instance
(`ws://127.0.0.1:1999/parties/main/<room>`), joining, starting, choosing a word,
and guessing. Assert: 3 word choices reach only the drawer, the secret word never
appears in state sent to guessers, a correct guess produces a `correct` chat +
`turnEnd`, and the guesser's score increases.

## Deployment
See [`README.md`](README.md) → Deployment. Short version: `npx partykit deploy`
for the server, import the repo into Vercel for the app, and set
`NEXT_PUBLIC_PARTYKIT_HOST` in Vercel to the PartyKit host.

---

## Working with Claude Code on this repo (course concepts)
This project is also a demonstration of Claude Code workflow concepts. How they map here:

- **CLAUDE.md (this file):** the always-loaded project brief. Keep it short and
  current — architecture, key files, commands, and the invariants that are easy
  to break (e.g. "never leak the secret word"). It steers every future session.
- **Subagents:** for fan-out work, delegate to a subagent so the main thread stays
  focused — e.g. an `Explore` agent to locate where a message type is handled, or
  a `Plan` agent to design a feature (progressive hints, custom word packs) before
  editing. Good first candidates: a "balance the scoring formula" investigation,
  or "audit every place the secret word is referenced."
- **Skills:** reusable, invocable procedures. Natural fits here: a `verify` skill
  to run the two-client realtime smoke test, a `code-review` pass before a PR, and
  a `run` skill to launch `npm run dev` and open a room.
- **MCP servers:** connect external tools. Useful here: a GitHub MCP for PRs/issues
  on `SigmaGrindset/skribbl`, or a Vercel MCP to read deploy status/logs. Add them
  per-project so deployment and issue triage happen without leaving the session.
- **Agent teams:** for larger features, split roles — one agent owns the PartyKit
  server protocol, another owns the React/Canvas client, coordinating through the
  shared contract in `shared/types.ts`. The shared types file is deliberately the
  contract boundary that lets that parallelism work without conflicts.
