// Shared types and protocol used by BOTH the PartyKit server (party/server.ts)
// and the Next.js client. Keep this framework-agnostic (no React / no PartyKit
// imports) so it can be imported from either side.

export type Phase = "lobby" | "choosing" | "drawing" | "turn-end" | "game-end";

export type ChatKind = "user" | "system" | "correct" | "close";

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  hasGuessed: boolean;
  connected: boolean;
}

/** A batch of drawing input. Points are normalized to 0..1 of the canvas. */
export interface Stroke {
  points: [number, number][];
  color: string;
  size: number;
  erase: boolean;
}

/** Public room snapshot. NEVER contains the secret word for non-drawers. */
export interface RoomState {
  phase: Phase;
  players: Player[];
  hostId: string | null;
  round: number;
  totalRounds: number;
  currentDrawerId: string | null;
  drawTimeSec: number;
  turnEndsAt: number | null; // epoch ms; null when no active timer
  wordLength: number;
  maskedWord: string; // e.g. "_ _ _ _"
  guessedCount: number;
  /** how many turns remain in the whole game (informational) */
  turnsRemaining: number;
}

export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  kind: ChatKind;
}

export interface ScoreDelta {
  playerId: string;
  name: string;
  delta: number;
}

export interface RankEntry {
  playerId: string;
  name: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Client → Server messages
// ---------------------------------------------------------------------------
export type ClientMessage =
  | { type: "join"; name: string; pid: string }
  | { type: "start"; totalRounds: number; drawTimeSec: number }
  | { type: "chooseWord"; word: string }
  | { type: "draw"; strokes: Stroke[] }
  | { type: "clear" }
  | { type: "guess"; text: string }
  | { type: "playAgain" };

// ---------------------------------------------------------------------------
// Server → Client messages
// ---------------------------------------------------------------------------
export type ServerMessage =
  | { type: "state"; state: RoomState }
  | { type: "draw"; strokes: Stroke[] }
  | { type: "clear" }
  | { type: "canvasSync"; strokes: Stroke[] }
  | { type: "chat"; message: ChatMessage }
  | { type: "wordChoices"; words: string[] } // only sent to the drawer
  | { type: "yourWord"; word: string } // only sent to the drawer once chosen
  | { type: "turnEnd"; word: string; deltas: ScoreDelta[] }
  | { type: "gameEnd"; ranking: RankEntry[] }
  | { type: "error"; message: string };

export const DEFAULTS = {
  totalRounds: 3,
  drawTimeSec: 80,
  chooseTimeSec: 15,
  turnEndPauseSec: 6,
  minPlayers: 2,
  wordChoiceCount: 3,
} as const;
