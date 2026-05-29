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
    <div className="flex h-full flex-col overflow-hidden card-pop">
      <h2 className="border-b-[3px] border-ink bg-pop-pink px-4 py-2.5 text-sm font-bold text-white">
        💬 Chat i pogađanja
      </h2>
      <div className="scroll-thin flex-1 space-y-1 overflow-y-auto p-3 text-sm">
        {messages.map((m) => (
          <ChatLine key={m.id} m={m} />
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 border-t-[3px] border-ink p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={disabled}
          placeholder={disabled ? "Ne možeš pogađati sad" : placeholder}
          className="input-pop w-full text-sm"
        />
        <button
          onClick={submit}
          disabled={disabled}
          className="btn-pop shrink-0 bg-pop-green px-3 py-2 text-sm"
        >
          Pošalji
        </button>
      </div>
    </div>
  );
}

function ChatLine({ m }: { m: ChatMessage }) {
  if (m.kind === "system") {
    return <p className="text-xs font-semibold italic text-ink/45">{m.text}</p>;
  }
  if (m.kind === "correct") {
    return (
      <p className="rounded-md border-2 border-ink bg-pop-green/40 px-2 py-0.5 font-bold text-ink">
        {m.text}
      </p>
    );
  }
  if (m.kind === "hot") {
    return (
      <p className="rounded-md border-2 border-ink bg-pop-orange/60 px-2 py-0.5 font-bold text-ink">
        {m.text}
      </p>
    );
  }
  if (m.kind === "close") {
    return (
      <p className="rounded-md border-2 border-ink bg-pop-yellow/50 px-2 py-0.5 font-bold text-ink">
        {m.text}
      </p>
    );
  }
  return (
    <p>
      <span className="font-bold text-ink">{m.name}: </span>
      <span className="text-ink/80">{m.text}</span>
    </p>
  );
}
