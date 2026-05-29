"use client";

import type { RankEntry, ScoreDelta } from "@/shared/types";

export function TurnEndOverlay({
  word,
  deltas,
}: {
  word: string;
  deltas: ScoreDelta[];
}) {
  const scored = [...deltas].sort((a, b) => b.delta - a.delta);
  return (
    <Backdrop>
      <p className="text-sm uppercase tracking-widest text-slate-400">The word was</p>
      <p className="mb-4 text-3xl font-black text-white">{word}</p>
      {scored.length === 0 ? (
        <p className="text-slate-400">Nobody guessed it 😬</p>
      ) : (
        <ul className="w-64 space-y-1">
          {scored.map((d) => (
            <li key={d.playerId} className="flex justify-between text-slate-200">
              <span className="truncate">{d.name}</span>
              <span className="font-semibold text-emerald-400">+{d.delta}</span>
            </li>
          ))}
        </ul>
      )}
    </Backdrop>
  );
}

export function GameEndOverlay({
  ranking,
  isHost,
  onPlayAgain,
}: {
  ranking: RankEntry[];
  isHost: boolean;
  onPlayAgain: () => void;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <Backdrop>
      <p className="mb-1 text-sm uppercase tracking-widest text-slate-400">Final scores</p>
      <p className="mb-4 text-3xl font-black text-white">Game over!</p>
      <ul className="mb-6 w-72 space-y-1.5">
        {ranking.map((r, i) => (
          <li
            key={r.playerId}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
              i === 0 ? "bg-amber-500/20" : "bg-white/5"
            }`}
          >
            <span className="truncate">
              {medals[i] ?? `${i + 1}.`} {r.name}
            </span>
            <span className="font-semibold tabular-nums text-slate-200">{r.score}</span>
          </li>
        ))}
      </ul>
      {isHost ? (
        <button
          onClick={onPlayAgain}
          className="rounded-lg bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark"
        >
          Play again
        </button>
      ) : (
        <p className="text-sm text-slate-400">Waiting for the host to restart…</p>
      )}
    </Backdrop>
  );
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-xl bg-slate-900/90 p-6 text-center backdrop-blur animate-pop">
      {children}
    </div>
  );
}
