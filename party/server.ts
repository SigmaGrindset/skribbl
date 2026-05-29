import type * as Party from "partykit/server";
import {
  DEFAULTS,
  REACTIONS,
  type ChatMessage,
  type ClientMessage,
  type Player,
  type RankEntry,
  type Reaction,
  type RoomState,
  type ScoreDelta,
  type ServerMessage,
  type Stroke,
} from "../shared/types";
import { pickWords } from "./words";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lowercase, trim, strip diacritics, collapse whitespace. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/\s+/g, " ");
}

/** Levenshtein distance, capped early for performance. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = tmp;
    }
  }
  return dp[m];
}

function maskWord(word: string): string {
  return word
    .split("")
    .map((c) => (c === " " ? " " : "_"))
    .join("");
}

function letterCount(word: string): number {
  return word.replace(/\s/g, "").length;
}

let chatSeq = 0;
function chat(name: string, text: string, kind: ChatMessage["kind"]): ChatMessage {
  return { id: `c${Date.now()}_${chatSeq++}`, name, text, kind };
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export default class SkribblServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  // --- public-ish room state ---
  // Players are keyed by a STABLE client-supplied id (`pid`), NOT the transient
  // WebSocket connection id. This survives reconnects and React StrictMode's
  // dev-mode double-connect, so the drawer/host always map to a live client.
  private phase: RoomState["phase"] = "lobby";
  private players = new Map<string, Player>(); // pid -> Player
  private order: string[] = []; // pids, in join order, for stable drawer rotation
  private connToPid = new Map<string, string>(); // connection.id -> pid
  private pidToConn = new Map<string, Party.Connection>(); // pid -> live connection
  private hostId: string | null = null;
  private round = 0;
  private totalRounds: number = DEFAULTS.totalRounds;
  private drawTimeSec: number = DEFAULTS.drawTimeSec;
  private currentDrawerId: string | null = null;
  private turnEndsAt: number | null = null;

  // --- private (server-only) turn state ---
  private secretWord = "";
  private wordChoices: string[] = [];
  private usedWords = new Set<string>();
  private drawnThisRound = new Set<string>();
  private guessedThisTurn = new Set<string>();
  private guessFractions: number[] = [];
  private eligibleGuessers = 0;
  private turnDeltas = new Map<string, number>();
  private canvasStrokes: Stroke[] = [];
  private lastReactAt = new Map<string, number>(); // pid -> epoch ms (spam guard)

  // --- scheduling ---
  // PartyKit runs on Cloudflare Workers (workerd), where `setTimeout` is NOT a
  // reliable wall-clock timer. We use the Durable Object Alarms API instead.
  // Only one alarm can be pending at a time, so we record what it's for.
  private pendingAction: "autopick" | "turnEnd" | "nextTurn" | null = null;

  // =========================================================================
  // Connection lifecycle
  // =========================================================================

  onConnect(conn: Party.Connection) {
    // The player record is created once they send `join` (which carries the pid).
    this.send(conn, { type: "state", state: this.snapshot() });
  }

  /** Durable Object alarm — our reliable wall-clock scheduler. */
  onAlarm() {
    const action = this.pendingAction;
    this.pendingAction = null;
    switch (action) {
      case "autopick":
        if (this.phase === "choosing" && this.wordChoices.length) {
          this.startDrawing(this.wordChoices[0]);
        }
        break;
      case "turnEnd":
        if (this.phase === "drawing") this.endTurn();
        break;
      case "nextTurn":
        if (this.phase === "turn-end") this.beginNextTurn();
        break;
    }
  }

  /** Schedule a single future transition (replaces any pending one). */
  private schedule(action: "autopick" | "turnEnd" | "nextTurn", delayMs: number) {
    this.pendingAction = action;
    void this.room.storage.setAlarm(Date.now() + delayMs);
  }

  private clearTimers() {
    this.pendingAction = null;
    void this.room.storage.deleteAlarm();
  }

  onClose(conn: Party.Connection) {
    const pid = this.connToPid.get(conn.id);
    this.connToPid.delete(conn.id);
    if (!pid) return;
    // Ignore a stale close if this pid has already reconnected on a newer socket.
    if (this.pidToConn.get(pid)?.id !== conn.id) return;
    this.pidToConn.delete(pid);

    const player = this.players.get(pid);
    if (!player) return;
    const name = player.name;
    this.players.delete(pid);
    this.order = this.order.filter((id) => id !== pid);
    this.drawnThisRound.delete(pid);
    this.guessedThisTurn.delete(pid);

    this.broadcastChat(chat(name, `${name} left`, "system"));

    // Reassign host if needed.
    if (this.hostId === pid) {
      this.hostId = this.order[0] ?? null;
      const newHost = this.hostId ? this.players.get(this.hostId) : null;
      if (newHost) {
        newHost.isHost = true;
        this.broadcastChat(chat("", `${newHost.name} is now the host`, "system"));
      }
    }

    const active = this.phase === "choosing" || this.phase === "drawing";

    // If too few players, abort back to lobby.
    if (active && this.connectedCount() < DEFAULTS.minPlayers) {
      this.resetToLobby("Not enough players — back to lobby");
      return;
    }

    // If the current drawer left mid-turn, end the turn.
    if (active && this.currentDrawerId === pid) {
      this.broadcastChat(chat("", "The drawer left. Ending turn.", "system"));
      this.endTurn();
      return;
    }

    // If everyone remaining has guessed, end the turn early.
    if (this.phase === "drawing" && this.allGuessersDone()) {
      this.endTurn();
      return;
    }

    this.broadcastState();
  }

  /** Resolve the stable player id for a connection. */
  private pidOf(conn: Party.Connection): string | undefined {
    return this.connToPid.get(conn.id);
  }

  onMessage(raw: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case "join":
        return this.handleJoin(sender, msg.name, msg.pid);
      case "start":
        return this.handleStart(sender, msg.totalRounds, msg.drawTimeSec);
      case "chooseWord":
        return this.handleChooseWord(sender, msg.word);
      case "draw":
        return this.handleDraw(sender, msg.strokes);
      case "clear":
        return this.handleClear(sender);
      case "guess":
        return this.handleGuess(sender, msg.text);
      case "react":
        return this.handleReact(sender, msg.emoji);
      case "playAgain":
        return this.handlePlayAgain(sender);
    }
  }

  // =========================================================================
  // Message handlers
  // =========================================================================

  private handleJoin(conn: Party.Connection, rawName: string, rawPid: string) {
    const name = (rawName || "Player").toString().slice(0, 20).trim() || "Player";
    const pid = (rawPid || "").toString().slice(0, 40);
    if (!pid) return this.err(conn, "Missing player id.");

    // Bind this connection to the stable pid (replacing any previous socket).
    this.connToPid.set(conn.id, pid);
    this.pidToConn.set(pid, conn);

    const existing = this.players.get(pid);
    if (existing) {
      // Reconnect (or StrictMode re-mount): keep score/host, just refresh name.
      existing.name = name;
      existing.connected = true;
    } else {
      const isHost = this.players.size === 0;
      if (isHost) this.hostId = pid;
      this.players.set(pid, {
        id: pid,
        name,
        score: 0,
        isHost,
        hasGuessed: false,
        connected: true,
      });
      this.order.push(pid);
      this.broadcastChat(chat(name, `${name} joined`, "system"));
    }

    // Late joiner / reconnect during an active turn: sync the canvas so far.
    if (this.canvasStrokes.length > 0) {
      this.send(conn, { type: "canvasSync", strokes: this.canvasStrokes });
    }
    // If this client is the current drawer (e.g. reconnected), re-send the word.
    if (this.phase === "drawing" && this.currentDrawerId === pid && this.secretWord) {
      this.send(conn, { type: "yourWord", word: this.secretWord });
    } else if (this.phase === "choosing" && this.currentDrawerId === pid && this.wordChoices.length) {
      this.send(conn, { type: "wordChoices", words: this.wordChoices });
    }
    this.broadcastState();
  }

  private handleStart(conn: Party.Connection, totalRounds: number, drawTimeSec: number) {
    if (this.pidOf(conn) !== this.hostId) return this.err(conn, "Only the host can start.");
    if (this.phase !== "lobby" && this.phase !== "game-end")
      return this.err(conn, "Game already in progress.");
    if (this.connectedCount() < DEFAULTS.minPlayers)
      return this.err(conn, `Need at least ${DEFAULTS.minPlayers} players.`);

    this.totalRounds = Math.min(Math.max(Math.floor(totalRounds) || 3, 1), 10);
    this.drawTimeSec = Math.min(Math.max(Math.floor(drawTimeSec) || 80, 30), 180);
    for (const p of this.players.values()) p.score = 0;
    this.usedWords.clear();
    this.round = 1;
    this.drawnThisRound.clear();
    this.broadcastChat(chat("", `Game started — ${this.totalRounds} rounds!`, "system"));
    this.beginNextTurn();
  }

  private handleChooseWord(conn: Party.Connection, word: string) {
    if (this.phase !== "choosing") return;
    if (this.pidOf(conn) !== this.currentDrawerId) return;
    if (!this.wordChoices.includes(word)) return this.err(conn, "Invalid word choice.");
    this.startDrawing(word);
  }

  private handleDraw(conn: Party.Connection, strokes: Stroke[]) {
    if (this.phase !== "drawing" || this.pidOf(conn) !== this.currentDrawerId) return;
    if (!Array.isArray(strokes) || strokes.length === 0) return;
    // Persist for late joiners and relay to everyone except the drawer.
    this.canvasStrokes.push(...strokes);
    this.broadcast({ type: "draw", strokes }, [conn.id]);
  }

  private handleClear(conn: Party.Connection) {
    if (this.phase !== "drawing" || this.pidOf(conn) !== this.currentDrawerId) return;
    this.canvasStrokes = [];
    this.broadcast({ type: "clear" }, [conn.id]);
  }

  private handleGuess(conn: Party.Connection, rawText: string) {
    const pid = this.pidOf(conn);
    const player = pid ? this.players.get(pid) : undefined;
    if (!pid || !player) return;
    const text = (rawText || "").toString().slice(0, 100).trim();
    if (!text) return;

    const isDrawer = pid === this.currentDrawerId;
    const inDrawing = this.phase === "drawing";

    // The drawer must not leak the word through chat while drawing.
    if (inDrawing && isDrawer) return;

    // Players who already guessed correctly chat only among themselves (hidden).
    if (inDrawing && this.guessedThisTurn.has(pid)) return;

    if (inDrawing) {
      const guess = normalize(text);
      const answer = normalize(this.secretWord);
      if (guess === answer) {
        this.registerCorrectGuess(player);
        return;
      }
      // Hot/cold hint — private to the guesser only, so it never leaks the
      // word to the room. Graded by edit distance to the answer.
      const dist = editDistance(guess, answer);
      if (dist === 1) {
        this.send(conn, {
          type: "chat",
          message: chat("", `🔥 '${text}' je vruće — skoro!`, "hot"),
        });
      } else if (dist === 2) {
        this.send(conn, {
          type: "chat",
          message: chat("", `🌤️ '${text}' je blizu`, "close"),
        });
      }
    }

    // Otherwise it's a normal visible chat / wrong guess.
    this.broadcastChat(chat(player.name, text, "user"));
  }

  private handlePlayAgain(conn: Party.Connection) {
    if (this.phase !== "game-end") return;
    if (this.pidOf(conn) !== this.hostId) return this.err(conn, "Only the host can restart.");
    this.resetToLobby("Back to lobby — start a new game!");
  }

  private handleReact(conn: Party.Connection, emoji: Reaction) {
    const pid = this.pidOf(conn);
    const player = pid ? this.players.get(pid) : undefined;
    if (!pid || !player) return;
    // Only a fixed set of emoji, and only while there's something to react to.
    if (!REACTIONS.includes(emoji)) return;
    if (this.phase !== "drawing" && this.phase !== "turn-end") return;
    // Light per-player throttle so the canvas can't be flooded.
    const now = Date.now();
    if (now - (this.lastReactAt.get(pid) ?? 0) < 350) return;
    this.lastReactAt.set(pid, now);
    this.broadcast({ type: "reaction", emoji, name: player.name });
  }

  // =========================================================================
  // Turn / round state machine
  // =========================================================================

  private beginNextTurn() {
    this.clearTimers();

    // Find the next drawer in join order who hasn't drawn this round.
    let drawerId = this.order.find(
      (id) => this.players.has(id) && !this.drawnThisRound.has(id),
    );

    // No one left this round → advance round or end the game.
    if (!drawerId) {
      if (this.round < this.totalRounds) {
        this.round += 1;
        this.drawnThisRound.clear();
        this.broadcastChat(chat("", `Round ${this.round} of ${this.totalRounds}`, "system"));
        drawerId = this.order.find((id) => this.players.has(id));
      }
      if (!drawerId) {
        this.endGame();
        return;
      }
    }

    this.drawnThisRound.add(drawerId);
    this.currentDrawerId = drawerId;
    this.phase = "choosing";
    this.secretWord = "";
    this.canvasStrokes = [];
    this.guessedThisTurn.clear();
    this.guessFractions = [];
    this.turnDeltas.clear();
    this.turnEndsAt = null;
    for (const p of this.players.values()) p.hasGuessed = false;

    // Clear everyone's canvas for the new turn.
    this.broadcast({ type: "clear" });

    // Offer word choices to the drawer only.
    this.wordChoices = pickWords(DEFAULTS.wordChoiceCount, this.usedWords);
    const drawer = this.players.get(drawerId)!;
    this.broadcastChat(chat("", `${drawer.name} is choosing a word…`, "system"));
    this.sendToId(drawerId, { type: "wordChoices", words: this.wordChoices });
    this.broadcastState();

    // Auto-pick the first word if the drawer dawdles.
    this.schedule("autopick", DEFAULTS.chooseTimeSec * 1000);
  }

  private startDrawing(word: string) {
    this.clearTimers();
    this.secretWord = word;
    this.usedWords.add(word);
    this.phase = "drawing";
    this.guessedThisTurn.clear();
    this.guessFractions = [];
    this.eligibleGuessers = Math.max(0, this.connectedCount() - 1);
    this.turnEndsAt = Date.now() + this.drawTimeSec * 1000;
    for (const p of this.players.values()) p.hasGuessed = false;

    const drawerId = this.currentDrawerId!;
    this.sendToId(drawerId, { type: "yourWord", word });
    const drawer = this.players.get(drawerId);
    this.broadcastChat(chat("", `${drawer?.name ?? "Someone"} is drawing!`, "system"));
    this.broadcastState();

    this.schedule("turnEnd", this.drawTimeSec * 1000);
  }

  private registerCorrectGuess(player: Player) {
    if (this.guessedThisTurn.has(player.id)) return;
    this.guessedThisTurn.add(player.id);
    player.hasGuessed = true;

    const now = Date.now();
    const totalMs = this.drawTimeSec * 1000;
    const timeLeft = Math.max(0, (this.turnEndsAt ?? now) - now);
    const frac = Math.max(0, Math.min(1, timeLeft / totalMs));
    this.guessFractions.push(frac);

    const isFirst = this.guessedThisTurn.size === 1;
    let pts = Math.round(frac * 300) + 50;
    if (isFirst) pts += 50;
    player.score += pts;
    this.turnDeltas.set(player.id, (this.turnDeltas.get(player.id) ?? 0) + pts);

    this.broadcastChat(chat("", `${player.name} guessed the word! (+${pts})`, "correct"));
    this.broadcastState();

    if (this.allGuessersDone()) this.endTurn();
  }

  private endTurn() {
    this.clearTimers();
    if (this.phase === "turn-end" || this.phase === "game-end") return;
    this.phase = "turn-end";
    this.turnEndsAt = null;

    // Award the drawer based on how well guessers did.
    const drawer = this.currentDrawerId ? this.players.get(this.currentDrawerId) : null;
    if (drawer && this.guessFractions.length > 0 && this.eligibleGuessers > 0) {
      const avgFrac =
        this.guessFractions.reduce((a, b) => a + b, 0) / this.guessFractions.length;
      const reach = this.guessFractions.length / this.eligibleGuessers;
      const drawerPts = Math.round(reach * avgFrac * 300);
      drawer.score += drawerPts;
      this.turnDeltas.set(drawer.id, (this.turnDeltas.get(drawer.id) ?? 0) + drawerPts);
    }

    const deltas: ScoreDelta[] = [];
    for (const [id, delta] of this.turnDeltas) {
      const p = this.players.get(id);
      deltas.push({ playerId: id, name: p?.name ?? "?", delta });
    }

    // Include the full stroke list so every client can replay the drawing.
    this.broadcast({ type: "turnEnd", word: this.secretWord, deltas, strokes: this.canvasStrokes });
    this.broadcastChat(chat("", `The word was: ${this.secretWord}`, "system"));
    this.broadcastState();

    this.schedule("nextTurn", DEFAULTS.turnEndPauseSec * 1000);
  }

  private endGame() {
    this.clearTimers();
    this.phase = "game-end";
    this.currentDrawerId = null;
    this.turnEndsAt = null;
    const ranking: RankEntry[] = [...this.players.values()]
      .map((p) => ({ playerId: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);
    this.broadcast({ type: "gameEnd", ranking });
    const winner = ranking[0];
    if (winner) this.broadcastChat(chat("", `🏆 ${winner.name} wins with ${winner.score} points!`, "system"));
    this.broadcastState();
  }

  private resetToLobby(reason: string) {
    this.clearTimers();
    this.phase = "lobby";
    this.round = 0;
    this.currentDrawerId = null;
    this.secretWord = "";
    this.wordChoices = [];
    this.canvasStrokes = [];
    this.turnEndsAt = null;
    this.drawnThisRound.clear();
    this.guessedThisTurn.clear();
    this.usedWords.clear();
    for (const p of this.players.values()) p.hasGuessed = false;
    this.broadcast({ type: "clear" });
    this.broadcastChat(chat("", reason, "system"));
    this.broadcastState();
  }

  // =========================================================================
  // Utilities
  // =========================================================================

  private allGuessersDone(): boolean {
    // True when every connected non-drawer has guessed correctly.
    const nonDrawers = [...this.players.values()].filter(
      (p) => p.id !== this.currentDrawerId,
    );
    if (nonDrawers.length === 0) return false;
    return nonDrawers.every((p) => this.guessedThisTurn.has(p.id));
  }

  private connectedCount(): number {
    return this.players.size;
  }

  private snapshot(): RoomState {
    const turnsRemaining =
      this.phase === "lobby" || this.phase === "game-end"
        ? 0
        : (this.totalRounds - this.round) * this.players.size +
          [...this.order].filter((id) => this.players.has(id) && !this.drawnThisRound.has(id))
            .length;
    return {
      phase: this.phase,
      players: this.order
        .map((id) => this.players.get(id))
        .filter((p): p is Player => !!p),
      hostId: this.hostId,
      round: this.round,
      totalRounds: this.totalRounds,
      currentDrawerId: this.currentDrawerId,
      drawTimeSec: this.drawTimeSec,
      turnEndsAt: this.turnEndsAt,
      wordLength: letterCount(this.secretWord),
      maskedWord: this.secretWord ? maskWord(this.secretWord) : "",
      guessedCount: this.guessedThisTurn.size,
      turnsRemaining,
    };
  }

  // --- send helpers ---
  private send(conn: Party.Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }
  /** Send to a specific player by their stable pid (drawer-only messages). */
  private sendToId(pid: string, msg: ServerMessage) {
    const conn = this.pidToConn.get(pid);
    if (conn) conn.send(JSON.stringify(msg));
  }
  private broadcast(msg: ServerMessage, exclude?: string[]) {
    this.room.broadcast(JSON.stringify(msg), exclude);
  }
  private broadcastChat(message: ChatMessage) {
    this.broadcast({ type: "chat", message });
  }
  private broadcastState() {
    this.broadcast({ type: "state", state: this.snapshot() });
  }
  private err(conn: Party.Connection, message: string) {
    this.send(conn, { type: "error", message });
  }
}
