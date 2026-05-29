"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import GameRoom from "@/components/GameRoom";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = (params.roomId ?? "").toString();

  const [name, setName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);

  // Pull a previously chosen nickname (set on the home page) if present.
  useEffect(() => {
    const saved = sessionStorage.getItem("skribbl:name");
    if (saved) setName(saved);
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!name) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-bold">
          Join room <span className="text-brand">{roomId.toUpperCase()}</span>
        </h1>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              sessionStorage.setItem("skribbl:name", draft.trim());
              setName(draft.trim());
            }
          }}
          maxLength={20}
          placeholder="Your nickname"
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 outline-none focus:border-brand"
        />
        <button
          onClick={() => {
            if (!draft.trim()) return;
            sessionStorage.setItem("skribbl:name", draft.trim());
            setName(draft.trim());
          }}
          className="rounded-lg bg-brand px-4 py-2.5 font-semibold text-white transition hover:bg-brand-dark"
        >
          Join
        </button>
      </main>
    );
  }

  return <GameRoom roomId={roomId} name={name} />;
}
