"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { CanvasEvent } from "@/lib/usePartyGame";
import type { Stroke } from "@/shared/types";

// Fixed internal resolution. All points are stored normalized (0..1) and brush
// sizes are in these internal pixels, so the drawing looks identical on every
// screen regardless of the rendered CSS size.
const W = 900;
const H = 600;

export interface CanvasHandle {
  clearLocal: () => void;
}

interface Props {
  canDraw: boolean;
  color: string;
  size: number;
  erase: boolean;
  subscribeCanvas: (cb: (e: CanvasEvent) => void) => () => void;
  sendDraw: (strokes: Stroke[]) => void;
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.size;
  const pts = s.points;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0] * W, pts[0][1] * H, Math.max(0.5, s.size / 2), 0, Math.PI * 2);
    ctx.fill();
  } else if (pts.length > 1) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * W, pts[0][1] * H);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * W, pts[i][1] * H);
    ctx.stroke();
  }
  ctx.restore();
}

const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(
  { canDraw, color, size, erase, subscribeCanvas, sendDraw },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Live-drawing mutable state (kept in refs to avoid re-renders mid-stroke).
  const drawing = useRef(false);
  const lastSent = useRef<[number, number] | null>(null);
  const pending = useRef<[number, number][]>([]);
  const rafScheduled = useRef(false);
  // Latest tool settings, mirrored into refs for use inside event handlers.
  const tool = useRef({ color, size, erase });
  tool.current = { color, size, erase };

  const clearLocal = () => {
    const ctx = ctxRef.current;
    if (ctx) ctx.clearRect(0, 0, W, H);
  };
  useImperativeHandle(ref, () => ({ clearLocal }), []);

  // Init the 2D context once.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    ctxRef.current = canvas.getContext("2d");
  }, []);

  // Apply remote canvas events (draw / clear / full sync).
  useEffect(() => {
    return subscribeCanvas((e) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (e.type === "clear") {
        ctx.clearRect(0, 0, W, H);
      } else if (e.type === "sync") {
        ctx.clearRect(0, 0, W, H);
        for (const s of e.strokes) drawStroke(ctx, s);
      } else if (e.type === "draw") {
        for (const s of e.strokes) drawStroke(ctx, s);
      }
    });
  }, [subscribeCanvas]);

  // ----- Local drawing (drawer only) -----
  function toNorm(ev: React.PointerEvent): [number, number] {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;
    const y = (ev.clientY - rect.top) / rect.height;
    return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
  }

  function flush() {
    rafScheduled.current = false;
    const pts = pending.current;
    if (pts.length === 0) return;
    const connected = lastSent.current ? [lastSent.current, ...pts] : pts;
    const stroke: Stroke = {
      points: connected,
      color: tool.current.color,
      size: tool.current.size,
      erase: tool.current.erase,
    };
    sendDraw([stroke]);
    lastSent.current = pts[pts.length - 1];
    pending.current = [];
  }

  function scheduleFlush() {
    if (rafScheduled.current) return;
    rafScheduled.current = true;
    requestAnimationFrame(flush);
  }

  function onPointerDown(ev: React.PointerEvent) {
    if (!canDraw) return;
    ev.preventDefault();
    (ev.target as Element).setPointerCapture(ev.pointerId);
    drawing.current = true;
    const p = toNorm(ev);
    lastSent.current = p;
    pending.current = [];
    const ctx = ctxRef.current!;
    // Dot for a single tap; also broadcast it.
    const dot: Stroke = { points: [p], color: tool.current.color, size: tool.current.size, erase: tool.current.erase };
    drawStroke(ctx, dot);
    sendDraw([dot]);
  }

  function onPointerMove(ev: React.PointerEvent) {
    if (!canDraw || !drawing.current) return;
    const p = toNorm(ev);
    const ctx = ctxRef.current!;
    // Draw locally right away for zero-latency feedback.
    const prev = pending.current[pending.current.length - 1] ?? lastSent.current;
    if (prev) {
      drawStroke(ctx, {
        points: [prev, p],
        color: tool.current.color,
        size: tool.current.size,
        erase: tool.current.erase,
      });
    }
    pending.current.push(p);
    scheduleFlush();
  }

  function endStroke() {
    if (!drawing.current) return;
    drawing.current = false;
    flush();
    lastSent.current = null;
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border-[3px] border-ink bg-white shadow-pop">
      <canvas
        ref={canvasRef}
        className={`block aspect-[3/2] w-full no-touch-action ${canDraw ? "cursor-crosshair" : "cursor-not-allowed"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
      />
    </div>
  );
});

export default Canvas;
