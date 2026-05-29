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
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-800/70 p-3 ring-1 ring-white/10">
      <div className="flex flex-wrap gap-1.5">
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => {
              onColor(c);
              onErase(false);
            }}
            aria-label={`color ${c}`}
            className={`h-6 w-6 rounded ring-2 transition ${
              color === c && !erase ? "ring-white" : "ring-black/20"
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
            aria-label={`brush ${s}`}
            className={`flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 ring-1 transition ${
              size === s ? "ring-brand" : "ring-slate-700"
            }`}
          >
            <span
              className="rounded-full bg-slate-200"
              style={{ width: s / 1.4, height: s / 1.4 }}
            />
          </button>
        ))}
      </div>

      <button
        onClick={() => onErase(!erase)}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition ${
          erase ? "bg-brand text-white ring-brand" : "bg-slate-900 ring-slate-700 hover:bg-slate-700"
        }`}
      >
        Eraser
      </button>

      <button
        onClick={onClear}
        className="ml-auto rounded-lg bg-rose-600/90 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-600"
      >
        Clear
      </button>
    </div>
  );
}
