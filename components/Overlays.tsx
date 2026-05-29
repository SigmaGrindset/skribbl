"use client";

import type { RankEntry, ScoreDelta, Stroke } from "@/shared/types";
import ReplayCanvas from "./ReplayCanvas";

export function TurnEndOverlay({
  word,
  deltas,
  strokes,
}: {
  word: string;
  deltas: ScoreDelta[];
  strokes: Stroke[];
}) {
  const scored = [...deltas].sort((a, b) => b.delta - a.delta);
  return (
    <Backdrop>
      <p className="text-sm font-bold uppercase tracking-widest text-ink/50">Riječ je bila</p>
      <p className="mb-3 -rotate-1 rounded-xl border-[3px] border-ink bg-pop-yellow px-5 py-2 text-3xl font-bold text-ink shadow-pop">
        {word}
      </p>
      {strokes.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-ink/40">
            🎬 Kako je nastalo
          </p>
          <ReplayCanvas strokes={strokes} />
        </div>
      )}
      {scored.length === 0 ? (
        <p className="font-bold text-ink/60">Nitko nije pogodio 😬</p>
      ) : (
        <ul className="w-64 space-y-1.5">
          {scored.map((d) => (
            <li
              key={d.playerId}
              className="flex justify-between rounded-lg border-2 border-ink bg-white px-3 py-1.5 font-bold text-ink"
            >
              <span className="truncate">{d.name}</span>
              <span className="text-pop-green">+{d.delta}</span>
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
      <p className="mb-1 text-sm font-bold uppercase tracking-widest text-ink/50">Konačni rezultat</p>
      <p className="mb-4 -rotate-2 rounded-xl border-[3px] border-ink bg-pop-pink px-5 py-2 text-3xl font-bold text-white shadow-pop">
        Kraj igre! 🎉
      </p>
      <ul className="mb-6 w-72 space-y-2">
        {ranking.map((r, i) => (
          <li
            key={r.playerId}
            className={`flex items-center justify-between rounded-lg border-2 border-ink px-3 py-2 font-bold text-ink ${
              i === 0 ? "bg-pop-yellow shadow-pop-sm" : "bg-white"
            }`}
          >
            <span className="truncate">
              {medals[i] ?? `${i + 1}.`} {r.name}
            </span>
            <span className="tabular-nums">{r.score}</span>
          </li>
        ))}
      </ul>
      {isHost ? (
        <button onClick={onPlayAgain} className="btn-pop bg-pop-green px-6 py-2.5 text-lg">
          🔄 Igraj ponovno
        </button>
      ) : (
        <p className="font-semibold text-ink/60">Čekamo da domaćin ponovno pokrene…</p>
      )}
    </Backdrop>
  );
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex animate-pop flex-col items-center justify-center gap-1 overflow-y-auto rounded-xl bg-ink/30 p-4 text-center backdrop-blur-sm">
      {children}
    </div>
  );
}
