"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/shared/types";

interface Props {
  messages: ChatMessage[];
  onGuess: (text: string) => void;
  disabled: boolean;
  placeholder: string;
}

export default function Chat({ messages, onGuess, disabled, placeholder }: Props) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit() {
    const t = text.trim();
    if (!t) return;
    onGuess(t);
    setText("");
  }

  return (
    <div className="flex h-full flex-col rounded-xl bg-slate-800/70 ring-1 ring-white/10">
      <h2 className="border-b border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300">
        Chat & guesses
      </h2>
      <div className="scroll-thin flex-1 space-y-1 overflow-y-auto p-3 text-sm">
        {messages.map((m) => (
          <ChatLine key={m.id} m={m} />
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 border-t border-white/10 p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={disabled}
          placeholder={disabled ? "You can't guess right now" : placeholder}
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50"
        />
        <button
          onClick={submit}
          disabled={disabled}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ChatLine({ m }: { m: ChatMessage }) {
  if (m.kind === "system") {
    return <p className="text-xs italic text-slate-500">{m.text}</p>;
  }
  if (m.kind === "correct") {
    return <p className="font-semibold text-emerald-400">{m.text}</p>;
  }
  if (m.kind === "close") {
    return <p className="font-medium text-amber-400">{m.text}</p>;
  }
  return (
    <p>
      <span className="font-semibold text-slate-300">{m.name}: </span>
      <span className="text-slate-200">{m.text}</span>
    </p>
  );
}
