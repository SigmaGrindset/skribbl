"use client";

import { useEffect, useRef, useState } from "react";
import { REACTIONS, type Reaction } from "@/shared/types";
import type { ReactionEvent } from "@/lib/usePartyGame";

interface Floating {
  key: number;
  emoji: Reaction;
  left: number; // 0..100 (% of canvas width)
}

/**
 * Overlay that catches reaction events and lets each emoji drift up the canvas
 * before fading out. Sits inside the canvas wrapper; never blocks pointer input.
 */
export function ReactionLayer({
  subscribeReactions,
}: {
  subscribeReactions: (cb: (e: ReactionEvent) => void) => () => void;
}) {
  const [items, setItems] = useState<Floating[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    return subscribeReactions(({ emoji }) => {
      const key = seq.current++;
      const left = 8 + Math.random() * 80;
      setItems((prev) => [...prev, { key, emoji, left }]);
      // Drop it once the float-up animation (2.2s) has finished.
      setTimeout(() => {
        setItems((prev) => prev.filter((it) => it.key !== key));
      }, 2300);
    });
  }, [subscribeReactions]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {items.map((it) => (
        <span
          key={it.key}
          className="absolute bottom-2 animate-float-up text-4xl drop-shadow-[2px_2px_0_rgba(22,17,13,0.35)]"
          style={{ left: `${it.left}%` }}
        >
          {it.emoji}
        </span>
      ))}
    </div>
  );
}

/** Row of emoji buttons anyone can press to fling a reaction onto the canvas. */
export function ReactionBar({ onReact }: { onReact: (emoji: Reaction) => void }) {
  return (
    <div className="flex items-center justify-center gap-1.5 card-pop p-2">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          aria-label={`reagiraj ${emoji}`}
          className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-ink bg-white text-xl transition-transform hover:-translate-y-0.5 hover:bg-pop-yellow active:translate-y-0.5"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
