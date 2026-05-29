# Software Specification Document (SSD)

**Project:** SigmaSkribbl — Room-wide draw-and-guess game
**Author:** Antonio
**Date:** 2026-05-29
**Version:** 1.0
**Repository:** `git@github.com:SigmaGrindset/skribbl.git`

---

## 1. Overview

SigmaSkribbl is a real-time, multiplayer "draw and guess" web game inspired by
skribbl.io. Players join a shared **room**. Each round, one player is the
**drawer** and is given a secret word to draw on a shared canvas. Everyone else
**guesses** the word by typing in chat. Points are awarded for guessing quickly
and for drawing a word others can guess. After every player has drawn, the game
ends and a final scoreboard is shown.

The game is built to run entirely on **free hosting tiers**: the web UI deploys
to **Vercel**, and the real-time multiplayer server deploys to **PartyKit**
(Cloudflare). No paid services are required.

---

## 2. Goals & Non-Goals

### 2.1 Goals
- Real-time shared drawing synchronized across all players in a room (low latency).
- Chat-based guessing with automatic correct-answer detection.
- Turn-based rounds with a timer, word selection, and live scoring.
- Simple room creation and joining via a shareable link / room code.
- Fully deployable for free (Vercel + PartyKit).
- Serve as a teaching artifact for Claude Code concepts (CLAUDE.md, subagents,
  skills, MCP) — see `CLAUDE.md`.

### 2.2 Non-Goals (v1 / MVP)
- Persistent accounts, authentication, or user profiles.
- Persistent leaderboards / match history (no database in MVP).
- Voice chat, mobile-native apps, moderation/anti-abuse systems.
- Custom word packs, avatars, sound effects (candidate **future** features).

---

## 3. Personas & User Stories

**Persona — "Host"**: starts a game and invites friends.
**Persona — "Player/Guesser"**: joins a room and plays.

| # | As a... | I want to... | So that... |
|---|---------|--------------|------------|
| US-1 | Host | create a room and get a shareable link/code | I can invite friends |
| US-2 | Player | join a room with a code and a nickname | I can play with friends |
| US-3 | Player | see everyone in the room and their scores | I know who is playing/winning |
| US-4 | Host | start the game when enough players have joined | we begin playing |
| US-5 | Drawer | pick 1 of 3 offered words and draw it | others can guess |
| US-6 | Drawer | use brush colors, sizes, clear, and undo | I can draw clearly |
| US-7 | Guesser | type guesses in chat and be told if I'm correct | I earn points |
| US-8 | Player | see a countdown timer for the current round | I feel the pressure |
| US-9 | Player | see the word revealed at round end + points gained | I learn the answer |
| US-10 | Player | see a final scoreboard when the game ends | we know who won |
| US-11 | Player | gracefully handle someone disconnecting | the game keeps going |

---

## 4. Functional Requirements

### 4.1 Rooms & Lobby
- **FR-1** A user can create a room; the system generates a unique room code (URL-safe).
- **FR-2** A user can join an existing room via code/link, providing a nickname.
- **FR-3** The lobby lists all connected players and marks the host.
- **FR-4** The host can configure rounds count, draw time, and start the game.
- **FR-5** A minimum of **2 players** is required to start.

### 4.2 Gameplay
- **FR-6** Each game consists of N **rounds**; in each round every player draws once (a "turn").
- **FR-7** At the start of a turn the drawer is offered **3 random words** and must choose one (auto-pick on timeout).
- **FR-8** Non-drawers see a masked hint (e.g. `_ _ _ _`) and word length; letters may be revealed over time (future).
- **FR-9** The drawer draws on a canvas; strokes are broadcast in near real time to all players.
- **FR-10** The drawer has a tool palette: color, brush size, eraser, clear-all, undo.
- **FR-11** Guessers submit guesses through chat. A correct guess is detected (case-insensitive, trimmed, diacritics-insensitive).
- **FR-12** A correct guess is **not** shown verbatim to others; instead a "X guessed the word!" event is shown.
- **FR-13** The drawer cannot guess; their chat messages are not evaluated as guesses.
- **FR-14** A turn ends when: the timer reaches 0, OR all non-drawers have guessed correctly, OR the drawer disconnects.

### 4.3 Scoring
- **FR-15** Guessers earn points based on remaining time when they guess (earlier = more).
- **FR-16** The drawer earns points scaled by how many players guessed correctly.
- **FR-17** Players who already guessed correctly cannot earn more that turn and their further guesses are hidden.
- **FR-18** Scores accumulate across the whole game; a final scoreboard is shown at game end.

### 4.4 Chat
- **FR-19** Players can chat freely between turns and (as guessers) during turns.
- **FR-20** System messages (joins, leaves, correct guesses, round changes) appear in the chat stream.

### 4.5 Resilience
- **FR-21** If a player disconnects, they are removed from the player list and turn order.
- **FR-22** If the host disconnects, host is reassigned to the next player.
- **FR-23** If the current drawer disconnects mid-turn, the turn ends and play advances.
- **FR-24** Late joiners during an active game enter as spectators until the next turn/round where they're included.

---

## 5. Non-Functional Requirements

- **NFR-1 Latency:** drawing updates should appear to other clients in < 150 ms under normal conditions. Achieved by throttled point batching over WebSocket.
- **NFR-2 Scalability:** each room is an isolated PartyKit "party" (one Durable Object), so rooms scale independently.
- **NFR-3 Cost:** must run on free tiers (Vercel Hobby + PartyKit free).
- **NFR-4 Bandwidth:** drawing data is sent as batched, quantized point arrays, not full-image frames.
- **NFR-5 Browser support:** latest Chrome/Firefox/Edge/Safari, desktop-first, responsive enough for tablets.
- **NFR-6 Accessibility:** keyboard-focusable controls, sufficient color contrast in UI chrome.
- **NFR-7 Security:** server is the source of truth for the secret word and scoring; clients never receive the word until reveal (except the drawer).

---

## 6. System Architecture

```
                ┌────────────────────────┐
                │        Browser          │
                │  Next.js React app      │
                │  - Lobby / Room UI      │
                │  - HTML5 Canvas         │
                │  - PartySocket (WS)     │
                └───────────┬────────────┘
                            │  HTTPS (static + RSC)
              ┌─────────────▼──────────────┐
              │           Vercel            │  (free Hobby tier)
              │   Hosts the Next.js app     │
              └─────────────────────────────┘
                            │  WebSocket (wss://)
              ┌─────────────▼──────────────┐
              │          PartyKit           │  (free tier, Cloudflare)
              │  One "party" instance per   │
              │  room = authoritative game  │
              │  state machine + relay      │
              └─────────────────────────────┘
```

**Why this split?** Vercel serverless functions cannot hold persistent
WebSocket connections. PartyKit provides a stateful, per-room WebSocket server
(backed by Cloudflare Durable Objects) that is a natural fit for an
authoritative game server. The browser talks to Vercel for the app shell and
directly to PartyKit (over `wss://`) for all real-time game traffic.

### 6.1 Authoritative server model
The PartyKit room instance owns all game state. Clients send **intents**
(join, choose word, draw, guess, start) and render **state/events** pushed by
the server. The secret word lives only on the server and on the drawer's
client. This prevents cheating via devtools.

---

## 7. Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js (App Router) + React + TypeScript | Vercel-native, modern DX |
| Styling | Tailwind CSS | fast, consistent UI |
| Realtime | PartyKit + `partysocket` | stateful per-room WS on free tier |
| Drawing | HTML5 Canvas 2D API | simple, performant raster drawing |
| Hosting | Vercel (app) + PartyKit (server) | both free |

---

## 8. Data Model (server-authoritative, in-memory per room)

```ts
type Phase = "lobby" | "choosing" | "drawing" | "turn-end" | "game-end";

interface Player {
  id: string;          // connection id
  name: string;
  score: number;
  isHost: boolean;
  hasGuessed: boolean; // for the current turn
  connected: boolean;
}

interface RoomState {
  phase: Phase;
  players: Player[];
  hostId: string | null;
  round: number;          // 1..totalRounds
  totalRounds: number;
  turnOrder: string[];    // player ids for this round
  currentDrawerId: string | null;
  wordChoices: string[];  // only sent to the drawer during "choosing"
  wordLength: number;     // public hint
  maskedWord: string;     // e.g. "_ _ _ _"
  drawTimeSec: number;
  turnEndsAt: number | null; // epoch ms
  guessedCount: number;
}
```

The full secret `word` is kept in a private server field and never serialized
into broadcast `RoomState`.

---

## 9. Message Protocol (WebSocket JSON)

### 9.1 Client → Server
| type | payload | notes |
|------|---------|-------|
| `join` | `{ name }` | sent on connect |
| `start` | `{ totalRounds, drawTimeSec }` | host only |
| `chooseWord` | `{ word }` | drawer only, during `choosing` |
| `draw` | `{ strokes: Stroke[] }` | drawer only; batched points |
| `clear` | `{}` | drawer only |
| `undo` | `{}` | drawer only |
| `guess` | `{ text }` | non-drawers; also normal chat |

```ts
interface Stroke {
  points: [number, number][]; // normalized 0..1 coordinates
  color: string;
  size: number;
  erase: boolean;
}
```

### 9.2 Server → Client
| type | payload | notes |
|------|---------|-------|
| `state` | `RoomState` | full snapshot on any state change |
| `draw` | `{ strokes }` | relayed to non-drawers |
| `clear` | `{}` | relayed |
| `canvasSync` | `{ strokes: Stroke[] }` | full history to late joiners |
| `chat` | `{ name, text, kind }` | `kind`: `user` \| `system` \| `correct` |
| `wordChoices` | `{ words }` | **only** to the drawer |
| `turnStart` | `{ drawerId, wordLength }` | |
| `turnEnd` | `{ word, scoreDeltas }` | reveals word + points gained |
| `gameEnd` | `{ ranking }` | final standings |
| `error` | `{ message }` | validation/usage errors |

---

## 10. Game Flow (state machine)

```
lobby
  └─(host start, >=2 players)──► choosing
choosing  (drawer picks 1 of 3 words; 15s auto-pick)
  └─(word chosen)──────────────► drawing
drawing   (timer runs; guesses evaluated)
  └─(timeout │ all guessed │ drawer left)──► turn-end
turn-end  (reveal word, show deltas, ~5s)
  ├─(more turns this round / more rounds)──► choosing (next drawer)
  └─(last turn of last round)──────────────► game-end
game-end  (final scoreboard; host can "play again" → lobby)
```

### 10.1 Scoring formulas (MVP)
- Guesser points: `round( (timeLeft / drawTime) * 300 ) + 50` (floor 50, earlier guess → more).
- Drawer points: `round( averageGuesserFraction * 250 )` where fraction is per-guesser timeLeft ratio averaged; scaled by share of players who guessed.
- Order bonus: first correct guesser gets `+50`.

(Exact constants are tunable; the principle is reward speed and successful drawing.)

---

## 11. UI / Screens

1. **Home** — Create room (nickname) / Join room (code + nickname).
2. **Lobby** — player list, room link to copy, host settings (rounds, draw time), Start button.
3. **Game** — three-pane layout:
   - Left: player list + live scores + turn indicator.
   - Center: canvas (+ toolbar for drawer), timer, masked word/hint, round counter.
   - Right: chat / guess input + system messages.
4. **Word picker** — modal overlay for the drawer with 3 word buttons + auto-pick countdown.
5. **Turn-end / Game-end** — overlay showing revealed word, score deltas, and final ranking.

---

## 12. Deployment

### 12.1 PartyKit (real-time server) — free
```bash
npx partykit deploy        # deploys party/server.ts
# → produces a wss URL like https://sigmaskribbl.<user>.partykit.dev
```

### 12.2 Vercel (web app) — free
- Import the GitHub repo `SigmaGrindset/skribbl` into Vercel.
- Set env var `NEXT_PUBLIC_PARTYKIT_HOST` to the PartyKit deployment host.
- Vercel builds and serves the Next.js app on every push to `main`.

### 12.3 Environments
| Env | App | PartyKit host |
|-----|-----|---------------|
| Local | `next dev` (`:3000`) | `partykit dev` (`127.0.0.1:1999`) |
| Prod | Vercel | `*.partykit.dev` |

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| WebSocket not supported on Vercel serverless | Offload realtime to PartyKit |
| Drawing bandwidth too high | Batch + throttle + normalize/quantize points |
| Cheating (reading the word) | Server-authoritative; word withheld from non-drawers |
| Player disconnects mid-turn | Turn-end + host reassignment logic (FR-21..24) |
| Free-tier limits exceeded | Per-room isolation; small JSON messages; demo-scale traffic |

---

## 14. Future Work (post-MVP)
- Database-backed leaderboards & match history (e.g. Supabase/Vercel Postgres).
- Progressive letter hints, custom word packs, multiple languages.
- Avatars, sound effects, emotes, undo/redo stack improvements.
- Anti-abuse: profanity filter, kick/ban, rate limiting.
- Reconnect/resume by stable player token.

---

## 15. Acceptance Criteria (MVP "done")
- [ ] Two+ browsers can join one room and see each other.
- [ ] Drawer's strokes appear on all other screens in near real time.
- [ ] A correct guess is detected, hidden from others, and awards points.
- [ ] Timer ends a turn; word is revealed; play advances through all turns/rounds.
- [ ] Final scoreboard shown at game end.
- [ ] App deployed on Vercel + PartyKit on free tiers and reachable publicly.
