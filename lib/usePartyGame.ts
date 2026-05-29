"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PartySocket from "partysocket";
import type {
  ChatMessage,
  ClientMessage,
  RankEntry,
  Reaction,
  RoomState,
  ScoreDelta,
  ServerMessage,
  Stroke,
} from "@/shared/types";

const HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "127.0.0.1:1999";

/**
 * A stable per-tab player id. Survives the WebSocket reconnect that React
 * StrictMode triggers in dev (double-mount) and real network blips, so the
 * server always maps this client to the same player. Scoped to sessionStorage
 * so each tab is its own player (great for local multi-window testing).
 */
function getStablePid(): string {
  if (typeof window === "undefined") return Math.random().toString(36).slice(2);
  let pid = sessionStorage.getItem("skribbl:pid");
  if (!pid) {
    pid =
      (globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    sessionStorage.setItem("skribbl:pid", pid);
  }
  return pid;
}

export type CanvasEvent =
  | { type: "draw"; strokes: Stroke[] }
  | { type: "clear" }
  | { type: "sync"; strokes: Stroke[] };

/** An emoji reaction flung onto the canvas by any player. */
export interface ReactionEvent {
  emoji: Reaction;
  name: string;
}

export interface GameApi {
  connected: boolean;
  youId: string | null;
  state: RoomState | null;
  messages: ChatMessage[];
  /** The secret word, only set when you are the drawer. */
  word: string | null;
  /** Word choices, only set when you are the drawer during "choosing". */
  wordChoices: string[] | null;
  turnEnd: { word: string; deltas: ScoreDelta[]; strokes: Stroke[] } | null;
  ranking: RankEntry[] | null;
  error: string | null;

  isDrawer: boolean;
  isHost: boolean;
  you: RoomState["players"][number] | null;

  join: (name: string) => void;
  start: (totalRounds: number, drawTimeSec: number) => void;
  chooseWord: (word: string) => void;
  sendDraw: (strokes: Stroke[]) => void;
  clearCanvas: () => void;
  guess: (text: string) => void;
  react: (emoji: Reaction) => void;
  playAgain: () => void;

  subscribeCanvas: (cb: (e: CanvasEvent) => void) => () => void;
  subscribeReactions: (cb: (e: ReactionEvent) => void) => () => void;
}

export function usePartyGame(roomId: string, name: string | null): GameApi {
  const socketRef = useRef<PartySocket | null>(null);
  const canvasSubs = useRef<Set<(e: CanvasEvent) => void>>(new Set());
  const reactionSubs = useRef<Set<(e: ReactionEvent) => void>>(new Set());

  const [connected, setConnected] = useState(false);
  const [youId, setYouId] = useState<string | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [word, setWord] = useState<string | null>(null);
  const [wordChoices, setWordChoices] = useState<string[] | null>(null);
  const [turnEnd, setTurnEnd] = useState<{ word: string; deltas: ScoreDelta[]; strokes: Stroke[] } | null>(null);
  const [ranking, setRanking] = useState<RankEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emitCanvas = useCallback((e: CanvasEvent) => {
    canvasSubs.current.forEach((cb) => cb(e));
  }, []);

  const emitReaction = useCallback((e: ReactionEvent) => {
    reactionSubs.current.forEach((cb) => cb(e));
  }, []);

  // Establish the WebSocket connection for this room.
  useEffect(() => {
    if (!name) return;
    const pid = getStablePid();
    setYouId(pid);
    const socket = new PartySocket({ host: HOST, room: roomId, party: "main" });
    socketRef.current = socket;

    const onOpen = () => {
      setConnected(true);
      socket.send(JSON.stringify({ type: "join", name, pid } satisfies ClientMessage));
    };
    const onClose = () => setConnected(false);

    const onMessage = (evt: MessageEvent) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(evt.data) as ServerMessage;
      } catch {
        return;
      }
      switch (msg.type) {
        case "state": {
          setState(msg.state);
          // Clear transient drawer-only / overlay data based on the *current*
          // phase. IMPORTANT: only clear when we are NOT in that phase — the
          // server sends `wordChoices`/`yourWord`/`turnEnd` just before the
          // matching `state`, so clearing on-enter would wipe fresh data.
          const ph = msg.state.phase;
          if (ph !== "choosing") setWordChoices(null);
          if (ph !== "drawing") setWord(null);
          if (ph !== "turn-end") setTurnEnd(null);
          if (ph !== "game-end") setRanking(null);
          break;
        }
        case "chat":
          setMessages((m) => [...m.slice(-199), msg.message]);
          break;
        case "wordChoices":
          setWordChoices(msg.words);
          break;
        case "yourWord":
          setWord(msg.word);
          setWordChoices(null);
          break;
        case "draw":
          emitCanvas({ type: "draw", strokes: msg.strokes });
          break;
        case "clear":
          emitCanvas({ type: "clear" });
          break;
        case "canvasSync":
          emitCanvas({ type: "sync", strokes: msg.strokes });
          break;
        case "reaction":
          emitReaction({ emoji: msg.emoji, name: msg.name });
          break;
        case "turnEnd":
          setTurnEnd({ word: msg.word, deltas: msg.deltas, strokes: msg.strokes });
          break;
        case "gameEnd":
          setRanking(msg.ranking);
          break;
        case "error":
          setError(msg.message);
          setTimeout(() => setError(null), 4000);
          break;
      }
    };

    socket.addEventListener("open", onOpen);
    socket.addEventListener("close", onClose);
    socket.addEventListener("message", onMessage);

    return () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("close", onClose);
      socket.removeEventListener("message", onMessage);
      socket.close();
      socketRef.current = null;
    };
  }, [roomId, name, emitCanvas, emitReaction]);

  const send = useCallback((msg: ClientMessage) => {
    socketRef.current?.send(JSON.stringify(msg));
  }, []);

  const subscribeCanvas = useCallback((cb: (e: CanvasEvent) => void) => {
    canvasSubs.current.add(cb);
    return () => {
      canvasSubs.current.delete(cb);
    };
  }, []);

  const subscribeReactions = useCallback((cb: (e: ReactionEvent) => void) => {
    reactionSubs.current.add(cb);
    return () => {
      reactionSubs.current.delete(cb);
    };
  }, []);

  const you = useMemo(
    () => state?.players.find((p) => p.id === youId) ?? null,
    [state, youId],
  );
  const isDrawer = !!youId && state?.currentDrawerId === youId;
  const isHost = !!you?.isHost;

  return {
    connected,
    youId,
    state,
    messages,
    word,
    wordChoices,
    turnEnd,
    ranking,
    error,
    isDrawer,
    isHost,
    you,
    join: (n) => send({ type: "join", name: n, pid: getStablePid() }),
    start: (totalRounds, drawTimeSec) => send({ type: "start", totalRounds, drawTimeSec }),
    chooseWord: (w) => {
      setWordChoices(null);
      send({ type: "chooseWord", word: w });
    },
    sendDraw: (strokes) => send({ type: "draw", strokes }),
    clearCanvas: () => send({ type: "clear" }),
    guess: (text) => send({ type: "guess", text }),
    react: (emoji) => send({ type: "react", emoji }),
    playAgain: () => send({ type: "playAgain" }),
    subscribeCanvas,
    subscribeReactions,
  };
}
