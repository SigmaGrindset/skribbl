"use client";

const PALETTE = [
  "#000000", "#6b7280", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#78350f", "#ffffff",
];

const SIZES = [4, 8, 16, 28];

interface Props {
  color: string;
  size: number;
  erase: boolean;
  onColor: (c: string) => void;
  onSize: (s: number) => void;
  onErase: (e: boolean) => void;
  onClear: () => void;
}

export default function Toolbar({
  color,
  size,
  erase,
  onColor,
  onSize,
  onErase,
  onClear,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 card-pop p-3">
      <div className="flex flex-wrap gap-1.5">
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => {
              onColor(c);
              onErase(false);
            }}
            aria-label={`boja ${c}`}
            className={`h-7 w-7 rounded-md border-2 border-ink transition-transform hover:-translate-y-0.5 ${
              color === c && !erase ? "ring-2 ring-ink ring-offset-1" : ""
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => onSize(s)}
            aria-label={`kist ${s}`}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 border-ink bg-white transition ${
              size === s ? "bg-pop-yellow" : "hover:bg-paper"
            }`}
          >
            <span
              className="rounded-full bg-ink"
              style={{ width: s / 1.4, height: s / 1.4 }}
            />
          </button>
        ))}
      </div>

      <button
        onClick={() => onErase(!erase)}
        className={`btn-pop px-3 py-1.5 text-sm ${erase ? "bg-pop-purple text-white" : "bg-white"}`}
      >
        🧽 Gumica
      </button>

      <button onClick={onClear} className="btn-pop ml-auto bg-pop-red px-3 py-1.5 text-sm text-white">
        🗑️ Očisti
      </button>
    </div>
  );
}
