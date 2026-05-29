"use client";

interface Props {
  words: string[];
  onPick: (word: string) => void;
}

export default function WordSelect({ words, onPick }: Props) {
  const colors = ["bg-pop-green", "bg-pop-cyan", "bg-pop-pink", "bg-pop-orange"];
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 rounded-xl bg-ink/30 backdrop-blur-sm">
      <p className="-rotate-1 rounded-xl border-[3px] border-ink bg-pop-yellow px-4 py-2 text-lg font-bold text-ink shadow-pop">
        ✏️ Odaberi riječ za crtanje
      </p>
      <div className="flex flex-wrap justify-center gap-3 px-4">
        {words.map((w, i) => (
          <button
            key={w}
            onClick={() => onPick(w)}
            className={`btn-pop px-5 py-3 text-lg ${colors[i % colors.length]}`}
          >
            {w}
          </button>
        ))}
      </div>
      <p className="rounded-lg border-2 border-ink bg-white px-3 py-1 text-xs font-semibold text-ink/60">
        Ako predugo čekaš, automatski bira prvu riječ.
      </p>
    </div>
  );
}
