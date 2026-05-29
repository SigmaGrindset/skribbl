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
    <div className="flex items-center justify-between gap-4 card-pop px-4 py-2.5">
      <div className="rounded-lg border-2 border-ink bg-pop-orange px-2.5 py-1 text-sm font-bold text-white">
        Runda {state.round}/{state.totalRounds}
      </div>

      <div className="flex flex-col items-center">
        {state.phase === "drawing" && (
          <>
            <div className="font-mono text-xl font-bold tracking-[0.3em] text-ink">{display}</div>
            <div className="text-xs font-semibold text-ink/50">
              {isDrawer ? "Nacrtaj ovo!" : `${state.wordLength} slova`}
            </div>
          </>
        )}
        {state.phase === "choosing" && (
          <div className="text-sm font-bold text-ink/70">
            {isDrawer ? "Odaberi riječ…" : `${drawer?.name ?? "Netko"} bira riječ…`}
          </div>
        )}
      </div>

      <div
        className={`min-w-[3.5ch] rounded-lg border-2 border-ink px-2.5 py-1 text-center font-mono text-xl font-bold tabular-nums text-white ${
          seconds !== null && seconds <= 10 ? "animate-wiggle bg-pop-red" : "bg-pop-purple"
        }`}
      >
        {seconds !== null ? `${seconds}s` : "—"}
      </div>
    </div>
  );
}
