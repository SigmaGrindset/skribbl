"use client";

interface Props {
  words: string[];
  onPick: (word: string) => void;
}

export default function WordSelect({ words, onPick }: Props) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-xl bg-slate-900/85 backdrop-blur">
      <p className="text-lg font-semibold text-slate-200">Pick a word to draw</p>
      <div className="flex flex-wrap justify-center gap-3 px-4">
        {words.map((w) => (
          <button
            key={w}
            onClick={() => onPick(w)}
            className="rounded-xl bg-brand px-5 py-3 text-lg font-bold text-white shadow-lg transition hover:scale-105 hover:bg-brand-dark"
          >
            {w}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">Auto-picks the first word if you wait too long.</p>
    </div>
  );
}
