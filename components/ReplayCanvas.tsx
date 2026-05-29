"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Stroke } from "@/shared/types";

// Same fixed internal resolution as the live canvas, so normalized points and
// brush sizes line up exactly.
const W = 900;
const H = 600;
const DURATION_MS = 3000;

function drawPartialStroke(
  ctx: CanvasRenderingContext2D,
  s: Stroke,
  upTo: number,
) {
  const pts = s.points.slice(0, upTo);
  if (pts.length === 0) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.size;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0] * W, pts[0][1] * H, Math.max(0.5, s.size / 2), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * W, pts[0][1] * H);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * W, pts[i][1] * H);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Replays a finished drawing by progressively revealing strokes point-by-point
 * over a fixed duration, so the round ends with a quick "here's how it was made".
 */
export default function ReplayCanvas({ strokes }: { strokes: Stroke[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [nonce, setNonce] = useState(0); // bump to replay again

  const totalPoints = strokes.reduce((n, s) => n + s.points.length, 0);

  const replay = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const start = performance.now();

    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const reveal = Math.round(t * totalPoints);

      ctx.clearRect(0, 0, W, H);
      let consumed = 0;
      for (const s of strokes) {
        if (consumed >= reveal) break;
        const upTo = Math.min(s.points.length, reveal - consumed);
        drawPartialStroke(ctx, s, upTo);
        consumed += s.points.length;
      }

      if (t < 1) rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [strokes, totalPoints, nonce]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-56 overflow-hidden rounded-xl border-[3px] border-ink bg-white shadow-pop sm:w-64">
        <canvas ref={canvasRef} className="block aspect-[3/2] w-full" />
      </div>
      <button
        onClick={replay}
        className="rounded-lg border-2 border-ink bg-white px-3 py-1 text-xs font-bold text-ink transition-transform hover:-translate-y-0.5 hover:bg-pop-yellow active:translate-y-0.5"
      >
        🔁 Pusti ponovno
      </button>
    </div>
  );
}
