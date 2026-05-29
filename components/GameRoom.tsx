"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePartyGame } from "@/lib/usePartyGame";
import Canvas, { type CanvasHandle } from "./Canvas";
import Toolbar from "./Toolbar";
import Chat from "./Chat";
import PlayerList from "./PlayerList";
import GameHeader from "./GameHeader";
import WordSelect from "./WordSelect";
import Lobby from "./Lobby";
import { GameEndOverlay, TurnEndOverlay } from "./Overlays";

export default function GameRoom({ roomId, name }: { roomId: string; name: string }) {
  const game = usePartyGame(roomId, name);
  const canvasRef = useRef<CanvasHandle>(null);

  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(8);
  const [erase, setErase] = useState(false);

  const { state } = game;

  if (!state || !game.connected) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="card-pop animate-wiggle px-6 py-4 text-lg font-bold">
          {game.connected ? "Učitavam sobu…" : "Spajam se…"}
        </div>
      </div>
    );
  }

  const phase = state.phase;
  const drawing = phase === "drawing";
  const canDraw = game.isDrawer && drawing;

  const guessDisabled =
    (game.isDrawer && drawing) || (drawing && !!game.you?.hasGuessed);

  function handleClear() {
    canvasRef.current?.clearLocal();
    game.clearCanvas();
  }

  // ---- Lobby view ----
  if (phase === "lobby") {
    return (
      <main className="mx-auto grid min-h-screen max-w-5xl grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_280px] md:items-start md:py-10">
        <div className="order-2 md:order-1">
          <Lobby state={state} isHost={game.isHost} roomId={roomId} onStart={game.start} />
        </div>
        <div className="order-1 h-72 md:order-2 md:h-[420px]">
          <PlayerList state={state} youId={game.youId} />
        </div>
        <Toast error={game.error} />
      </main>
    );
  }

  // ---- Game view ----
  return (
    <main className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-3 p-3 lg:grid-cols-[220px_1fr_300px]">
      <header className="lg:col-span-3 flex items-center justify-between">
        <Link
          href="/"
          className="-rotate-2 rounded-xl border-[3px] border-ink bg-pop-yellow px-3 py-1 text-lg font-bold shadow-pop-sm transition-transform hover:rotate-0"
        >
          Sigma<span className="text-pop-purple">Skribbl</span>
        </Link>
        <span className="rounded-lg border-2 border-ink bg-white px-3 py-1 text-xs font-bold tracking-widest">
          SOBA {roomId.toUpperCase()}
        </span>
      </header>

      {/* Left: players */}
      <div className="order-2 h-64 lg:order-1 lg:h-auto">
        <PlayerList state={state} youId={game.youId} />
      </div>

      {/* Center: canvas */}
      <div className="order-1 flex flex-col gap-3 lg:order-2">
        <GameHeader state={state} isDrawer={game.isDrawer} word={game.word} />
        <div className="relative">
          <Canvas
            ref={canvasRef}
            canDraw={canDraw}
            color={color}
            size={size}
            erase={erase}
            subscribeCanvas={game.subscribeCanvas}
            sendDraw={game.sendDraw}
          />
          {game.isDrawer && phase === "choosing" && game.wordChoices && (
            <WordSelect words={game.wordChoices} onPick={game.chooseWord} />
          )}
          {phase === "turn-end" && game.turnEnd && (
            <TurnEndOverlay word={game.turnEnd.word} deltas={game.turnEnd.deltas} />
          )}
          {phase === "game-end" && game.ranking && (
            <GameEndOverlay
              ranking={game.ranking}
              isHost={game.isHost}
              onPlayAgain={game.playAgain}
            />
          )}
        </div>
        {canDraw && (
          <Toolbar
            color={color}
            size={size}
            erase={erase}
            onColor={setColor}
            onSize={setSize}
            onErase={setErase}
            onClear={handleClear}
          />
        )}
      </div>

      {/* Right: chat */}
      <div className="order-3 h-72 lg:h-auto">
        <Chat
          messages={game.messages}
          onGuess={game.guess}
          disabled={guessDisabled}
          placeholder={game.isDrawer ? "You're drawing!" : "Type your guess…"}
        />
      </div>

      <Toast error={game.error} />
    </main>
  );
}

function Toast({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 animate-pop rounded-xl border-[3px] border-ink bg-pop-red px-4 py-2 text-sm font-bold text-white shadow-pop">
      {error}
    </div>
  );
}
