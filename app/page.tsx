"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function randomRoomCode(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  function go(code: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a nickname first.");
      return;
    }
    sessionStorage.setItem("skribbl:name", trimmed);
    router.push(`/room/${code.toLowerCase()}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-12">
      <header className="text-center">
        <h1 className="text-4xl font-black tracking-tight">
          <span className="text-brand">Sigma</span>Skribbl
        </h1>
        <p className="mt-2 text-slate-400">Draw, guess, win. Play with friends in a shared room.</p>
      </header>

      <div className="space-y-5 rounded-2xl bg-slate-800/70 p-6 shadow-xl ring-1 ring-white/10">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">Nickname</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="e.g. Antonio"
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 outline-none focus:border-brand"
          />
        </div>

        <button
          onClick={() => go(randomRoomCode())}
          className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white transition hover:bg-brand-dark"
        >
          Create a private room
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-700" />
          OR JOIN
          <span className="h-px flex-1 bg-slate-700" />
        </div>

        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="room code"
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 outline-none focus:border-brand"
            onKeyDown={(e) => e.key === "Enter" && joinCode.trim() && go(joinCode.trim())}
          />
          <button
            onClick={() => joinCode.trim() && go(joinCode.trim())}
            className="rounded-lg bg-slate-700 px-4 py-2 font-semibold transition hover:bg-slate-600"
          >
            Join
          </button>
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>

      <p className="text-center text-xs text-slate-600">
        Built with Next.js + PartyKit · deploy free on Vercel
      </p>
    </main>
  );
}
