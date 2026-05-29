"use client";

import { useState } from "react";
import { DEFAULTS, type RoomState } from "@/shared/types";

interface Props {
  state: RoomState;
  isHost: boolean;
  roomId: string;
  onStart: (totalRounds: number, drawTimeSec: number) => void;
}

export default function Lobby({ state, isHost, roomId, onStart }: Props) {
  const [rounds, setRounds] = useState<number>(DEFAULTS.totalRounds);
  const [drawTime, setDrawTime] = useState<number>(DEFAULTS.drawTimeSec);
  const [copied, setCopied] = useState(false);

  const enough = state.players.length >= DEFAULTS.minPlayers;

  function copyLink() {
    const url = typeof window !== "undefined" ? window.location.href : roomId;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-col items-center gap-6 card-pop p-8 text-center">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-ink/50">Kod sobe</p>
        <p className="-rotate-1 text-4xl font-bold tracking-[0.3em] text-pop-purple">
          {roomId.toUpperCase()}
        </p>
      </div>

      <button onClick={copyLink} className="btn-pop bg-pop-cyan px-4 py-2 text-sm">
        {copied ? "Link kopiran ✓" : "📋 Kopiraj pozivni link"}
      </button>

      {isHost ? (
        <div className="w-full max-w-sm space-y-4">
          <Setting label={`Runde: ${rounds}`}>
            <input
              type="range"
              min={1}
              max={6}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="w-full accent-pop-purple"
            />
          </Setting>
          <Setting label={`Vrijeme crtanja: ${drawTime}s`}>
            <input
              type="range"
              min={30}
              max={150}
              step={10}
              value={drawTime}
              onChange={(e) => setDrawTime(Number(e.target.value))}
              className="w-full accent-pop-purple"
            />
          </Setting>
          <button
            onClick={() => onStart(rounds, drawTime)}
            disabled={!enough}
            className="btn-pop w-full bg-pop-green px-4 py-3 text-lg"
          >
            {enough ? "▶ Pokreni igru" : `Treba ${DEFAULTS.minPlayers}+ igrača`}
          </button>
        </div>
      ) : (
        <p className="font-semibold text-ink/60">Čekamo da domaćin pokrene igru…</p>
      )}
    </div>
  );
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-left">
      <span className="mb-1 block text-sm font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}
