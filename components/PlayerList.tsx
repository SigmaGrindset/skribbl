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
    <div className="flex h-full flex-col overflow-hidden card-pop">
      <h2 className="border-b-[3px] border-ink bg-pop-blue px-4 py-2.5 text-sm font-bold text-white">
        👥 Igrači · {state.players.length}
      </h2>
      <ul className="scroll-thin flex-1 space-y-1.5 overflow-y-auto p-2">
        {players.map((p, i) => {
          const isDrawer = inGame && p.id === state.currentDrawerId;
          const isYou = p.id === youId;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 ${
                isYou
                  ? "border-ink bg-pop-yellow"
                  : "border-ink/15 bg-white"
              } ${isDrawer ? "ring-2 ring-pop-green ring-offset-1" : ""}`}
            >
              <span className="w-5 text-center text-xs font-bold text-ink/40">{i + 1}</span>
              <span className="flex-1 truncate font-bold">
                {p.name}
                {isYou && <span className="font-medium text-ink/50"> (ti)</span>}
                {p.isHost && <span title="domaćin"> 👑</span>}
              </span>
              {isDrawer && <span title="crta">✏️</span>}
              {inGame && p.hasGuessed && !isDrawer && <span title="pogodio">✅</span>}
              <span className="w-12 text-right font-bold tabular-nums text-sm">
                {p.score}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
