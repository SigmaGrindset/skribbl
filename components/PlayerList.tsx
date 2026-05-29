"use client";

import type { RoomState } from "@/shared/types";

interface Props {
  state: RoomState;
  youId: string | null;
}

export default function PlayerList({ state, youId }: Props) {
  const players = [...state.players].sort((a, b) => b.score - a.score);
  const inGame = state.phase !== "lobby";

  return (
    <div className="flex h-full flex-col rounded-xl bg-slate-800/70 ring-1 ring-white/10">
      <h2 className="border-b border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">
        Players · {state.players.length}
      </h2>
      <ul className="scroll-thin flex-1 overflow-y-auto p-2">
        {players.map((p, i) => {
          const isDrawer = inGame && p.id === state.currentDrawerId;
          const isYou = p.id === youId;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                isYou ? "bg-brand/20" : ""
              }`}
            >
              <span className="w-5 text-center text-xs text-slate-500">{i + 1}</span>
              <span className="flex-1 truncate font-medium">
                {p.name}
                {isYou && <span className="text-slate-400"> (you)</span>}
                {p.isHost && <span title="host"> 👑</span>}
              </span>
              {isDrawer && <span title="drawing">✏️</span>}
              {inGame && p.hasGuessed && !isDrawer && <span title="guessed">✅</span>}
              <span className="w-12 text-right tabular-nums text-sm text-slate-300">
                {p.score}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
