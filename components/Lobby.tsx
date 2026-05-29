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
    <div className="flex flex-col items-center gap-6 rounded-2xl bg-slate-800/70 p-8 text-center ring-1 ring-white/10">
      <div>
        <p className="text-sm text-slate-400">Room code</p>
        <p className="text-3xl font-black tracking-[0.3em] text-brand">{roomId.toUpperCase()}</p>
      </div>

      <button
        onClick={copyLink}
        className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium transition hover:bg-slate-600"
      >
        {copied ? "Link copied ✓" : "Copy invite link"}
      </button>

      {isHost ? (
        <div className="w-full max-w-sm space-y-4">
          <Setting label={`Rounds: ${rounds}`}>
            <input
              type="range"
              min={1}
              max={6}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="w-full accent-brand"
            />
          </Setting>
          <Setting label={`Draw time: ${drawTime}s`}>
            <input
              type="range"
              min={30}
              max={150}
              step={10}
              value={drawTime}
              onChange={(e) => setDrawTime(Number(e.target.value))}
              className="w-full accent-brand"
            />
          </Setting>
          <button
            onClick={() => onStart(rounds, drawTime)}
            disabled={!enough}
            className="w-full rounded-lg bg-brand px-4 py-3 text-lg font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enough ? "Start game" : `Need ${DEFAULTS.minPlayers}+ players`}
          </button>
        </div>
      ) : (
        <p className="text-slate-400">Waiting for the host to start the game…</p>
      )}
    </div>
  );
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-left">
      <span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>
      {children}
    </label>
  );
}
