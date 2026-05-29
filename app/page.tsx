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

// Little floating doodles that signal "this is a drawing game" at a glance.
const DOODLES = [
  { emoji: "✏️", className: "left-[8%] top-[18%] -rotate-12 text-5xl" },
  { emoji: "🎨", className: "right-[10%] top-[14%] rotate-12 text-6xl" },
  { emoji: "🖌️", className: "left-[14%] bottom-[12%] rotate-6 text-5xl" },
  { emoji: "✨", className: "right-[14%] bottom-[16%] -rotate-6 text-4xl" },
  { emoji: "💡", className: "left-[44%] top-[6%] text-4xl" },
];

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  function go(code: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Upiši nadimak prvo!");
      return;
    }
    sessionStorage.setItem("skribbl:name", trimmed);
    router.push(`/room/${code.toLowerCase()}`);
  }

  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-12">
      {/* Decorative doodles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {DOODLES.map((d, i) => (
          <span key={i} className={`absolute select-none opacity-80 ${d.className}`}>
            {d.emoji}
          </span>
        ))}
      </div>

      <header className="relative text-center">
        <div className="mx-auto inline-block -rotate-2 rounded-2xl border-[3px] border-ink bg-pop-yellow px-6 py-3 shadow-pop-lg">
          <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Sigma<span className="text-pop-purple">Skribbl</span>
          </h1>
        </div>
        <p className="mt-4 text-lg font-semibold text-ink/70">
          Crtaj 🖍️ · Pogađaj 🤔 · Pobijedi 🏆
        </p>
      </header>

      <div className="relative space-y-5 card-pop p-6">
        <div>
          <label className="mb-1.5 block text-sm font-bold text-ink">Nadimak</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="npr. Antonio"
            className="input-pop w-full"
          />
        </div>

        <button
          onClick={() => go(randomRoomCode())}
          className="btn-pop w-full bg-pop-green px-4 py-3 text-lg"
        >
          🚪 Napravi privatnu sobu
        </button>

        <div className="flex items-center gap-3 text-xs font-bold text-ink/50">
          <span className="h-[3px] flex-1 rounded-full bg-ink/15" />
          ILI SE PRIDRUŽI
          <span className="h-[3px] flex-1 rounded-full bg-ink/15" />
        </div>

        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="kod sobe"
            className="input-pop w-full"
            onKeyDown={(e) => e.key === "Enter" && joinCode.trim() && go(joinCode.trim())}
          />
          <button
            onClick={() => joinCode.trim() && go(joinCode.trim())}
            className="btn-pop shrink-0 bg-pop-cyan px-5 py-2"
          >
            Uđi
          </button>
        </div>

        {error && (
          <p className="rounded-lg border-2 border-ink bg-pop-red px-3 py-1.5 text-sm font-bold text-white">
            {error}
          </p>
        )}
      </div>

      <p className="relative text-center text-xs font-semibold text-ink/40">
        Built with Next.js + PartyKit · deploy free on Vercel
      </p>
    </main>
  );
}
