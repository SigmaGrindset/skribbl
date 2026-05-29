"use client";

import { useEffect, useState } from "react";
import type { RoomState } from "@/shared/types";

interface Props {
  state: RoomState;
  isDrawer: boolean;
  word: string | null;
}

function useCountdown(endsAt: number | null): number | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

export default function GameHeader({ state, isDrawer, word }: Props) {
  const seconds = useCountdown(state.turnEndsAt);
  const drawer = state.players.find((p) => p.id === state.currentDrawerId);

  const display =
    isDrawer && word
      ? word.toUpperCase()
      : state.maskedWord
        ? state.maskedWord.split("").map((c) => (c === " " ? "  " : c)).join(" ")
        : "";

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-800/70 px-4 py-2.5 ring-1 ring-white/10">
      <div className="text-sm font-semibold text-slate-300">
        Round {state.round}/{state.totalRounds}
      </div>

      <div className="flex flex-col items-center">
        {state.phase === "drawing" && (
          <>
            <div className="font-mono text-xl tracking-[0.3em] text-white">{display}</div>
            <div className="text-xs text-slate-400">
              {isDrawer ? "Draw this!" : `${state.wordLength} letters`}
            </div>
          </>
        )}
        {state.phase === "choosing" && (
          <div className="text-sm text-slate-300">
            {isDrawer ? "Choose a word…" : `${drawer?.name ?? "Someone"} is choosing…`}
          </div>
        )}
      </div>

      <div
        className={`min-w-[3ch] text-right font-mono text-xl font-bold tabular-nums ${
          seconds !== null && seconds <= 10 ? "text-rose-400" : "text-slate-200"
        }`}
      >
        {seconds !== null ? `${seconds}s` : "—"}
      </div>
    </div>
  );
}
