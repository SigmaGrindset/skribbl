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
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 px-6">
        <h1 className="text-center text-2xl font-bold">
          Pridruži se sobi{" "}
          <span className="inline-block -rotate-2 rounded-lg border-[3px] border-ink bg-pop-yellow px-2 py-0.5 text-pop-purple shadow-pop-sm">
            {roomId.toUpperCase()}
          </span>
        </h1>
        <div className="card-pop space-y-4 p-6">
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
            placeholder="Tvoj nadimak"
            className="input-pop w-full"
          />
          <button
            onClick={() => {
              if (!draft.trim()) return;
              sessionStorage.setItem("skribbl:name", draft.trim());
              setName(draft.trim());
            }}
            className="btn-pop w-full bg-pop-green px-4 py-2.5"
          >
            🚪 Uđi
          </button>
        </div>
      </main>
    );
  }

  return <GameRoom roomId={roomId} name={name} />;
}
