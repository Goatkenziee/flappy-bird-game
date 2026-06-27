"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playFlap, playScore, playGameOver } from "@/lib/sounds";

// ── Constants ────────────────────────────────────────────
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const GROUND_HEIGHT = 80;
const PIPE_WIDTH = 52;
const PIPE_GAP = 160;
const PIPE_SPEED = 2.5;
const PIPE_SPAWN_INTERVAL = 1600;
const GRAVITY = 0.45;
const FLAP_VELOCITY = -6.5;
const BIRD_X = 80;
const COLORS = {
  sky: { top: "#1e1b4b", bottom: "#312e81" },
  ground: "#312e81",
  groundStripe: "#4338ca",
  pipe: "#22c55e",
  pipeDark: "#16a34a",
  pipeInner: "#86efac",
  bird: "#facc15",
  birdWing: "#eab308",
  birdEye: "#1e293b",
  birdBeak: "#f97316",
};

// ── Types ────────────────────────────────────────────────
interface Bird {
  y: number;
  vy: number;
  width: number;
  height: number;
  rotation: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  width: number;
  scored: boolean;
  passed: boolean;
}

type GameState = "idle" | "playing" | "dead";

// ── Drawing helpers ──────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, COLORS.sky.top);
  grad.addColorStop(1, COLORS.sky.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(79, 70, 229, 0.15)";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.7);
  for (let x = 0; x <= w; x += 40) {
    const y = h * 0.7 - Math.sin(x * 0.03) * 40 - Math.sin(x * 0.07) * 20;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number) {
  const gy = h - GROUND_HEIGHT;
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, gy, w, GROUND_HEIGHT);

  ctx.fillStyle = "#4f46e5";
  ctx.fillRect(0, gy, w, 3);

  ctx.strokeStyle = COLORS.groundStripe;
  ctx.lineWidth = 1;
  for (let x = -offset; x < w; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + 15, h);
    ctx.stroke();
  }
}

function drawPipe(ctx: CanvasRenderingContext2D, p: Pipe, h: number) {
  const gy = h - GROUND_HEIGHT;
  const x = p.x;
  const w = p.width;
  const topH = p.topHeight;
  const bottomY = topH + PIPE_GAP;

  ctx.fillStyle = COLORS.pipe;
  ctx.fillRect(x, 0, w, topH);
  ctx.fillStyle = COLORS.pipeDark;
  ctx.fillRect(x - 4, topH - 20, w + 8, 20);
  ctx.fillStyle = COLORS.pipeInner;
  ctx.fillRect(x + 4, topH - 16, w - 8, 12);

  ctx.fillStyle = COLORS.pipe;
  ctx.fillRect(x, bottomY, w, gy - bottomY);
  ctx.fillStyle = COLORS.pipeDark;
  ctx.fillRect(x - 4, bottomY, w + 8, 20);
  ctx.fillStyle = COLORS.pipeInner;
  ctx.fillRect(x + 4, bottomY + 4, w - 8, 12);
}

function drawBird(ctx: CanvasRenderingContext2D, b: Bird) {
  ctx.save();
  ctx.translate(BIRD_X + b.width / 2, b.y + b.height / 2);
  ctx.rotate(b.rotation);

  const hw = b.width / 2;
  const hh = b.height / 2;

  ctx.fillStyle = COLORS.bird;
  ctx.beginPath();
  ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.birdWing;
  ctx.beginPath();
  ctx.ellipse(-4, 2, hw * 0.5, hh * 0.55, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(5, -3, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.birdEye;
  ctx.beginPath();
  ctx.ellipse(7, -3, 2.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.birdBeak;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(18, 2);
  ctx.lineTo(10, 6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ── Main Component ──────────────────────────────────────

export default function FlappyBird() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [displayScore, setDisplayScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const birdRef = useRef<Bird>({ y: 0, vy: 0, width: 34, height: 26, rotation: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);
  const stateRef = useRef<GameState>("idle");
  const groundOffsetRef = useRef(0);
  const frameRef = useRef(0);
  const lastPipeSpawnRef = useRef(0);
  const flashTimerRef = useRef(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("flappy-high-score");
      if (saved) {
        highScoreRef.current = parseInt(saved, 10);
        setHighScore(highScoreRef.current);
      }
    } catch { /* noop */ }
  }, []);

  // ── Physics & game loop ────────────────────────────────

  const resetGame = useCallback(() => {
    const b = birdRef.current;
    b.y = CANVAS_HEIGHT / 2 - b.height / 2;
    b.vy = 0;
    b.rotation = 0;
    pipesRef.current = [];
    scoreRef.current = 0;
    setDisplayScore(0);
    lastPipeSpawnRef.current = 0;
    groundOffsetRef.current = 0;
    stateRef.current = "idle";
    setGameState("idle");
  }, []);

  const flap = useCallback(() => {
    if (stateRef.current === "idle") {
      stateRef.current = "playing";
      setGameState("playing");
      const b = birdRef.current;
      b.vy = FLAP_VELOCITY;
      playFlap();
    } else if (stateRef.current === "playing") {
      const b = birdRef.current;
      b.vy = FLAP_VELOCITY;
      playFlap();
    } else if (stateRef.current === "dead") {
      resetGame();
    }
  }, [resetGame]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      flap();
    }
  }, [flap]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    flap();
  }, [flap]);

  const handleTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    flap();
  }, [flap]);

  // ── Responsive sizing ──────────────────────────────────
  useEffect(() => {
    function resize() {
      if (!containerRef.current) return;
      const maxW = Math.min(containerRef.current.clientWidth - 16, CANVAS_WIDTH);
      const maxH = Math.min(window.innerHeight - 40, CANVAS_HEIGHT);
      const scale = Math.min(maxW / CANVAS_WIDTH, maxH / CANVAS_HEIGHT, 1);
      setCanvasSize({ width: Math.round(CANVAS_WIDTH * scale), height: Math.round(CANVAS_HEIGHT * scale) });
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Game loop ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    let lastTime = 0;

    function loop(time: number) {
      const dt = Math.min(time - lastTime, 50);
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const scale = w / CANVAS_WIDTH;
      ctx.save();
      ctx.scale(scale, scale);

      drawBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (stateRef.current === "playing") {
        groundOffsetRef.current = (groundOffsetRef.current + PIPE_SPEED * (dt / 16)) % 30;

        const b = birdRef.current;
        b.vy += GRAVITY * (dt / 16);
        b.vy = Math.min(b.vy, 15);
        b.y += b.vy * (dt / 16);

        b.rotation = Math.min(Math.max(b.vy * 0.06, -0.5), 1.2);

        if (b.y + b.height >= CANVAS_HEIGHT - GROUND_HEIGHT) {
          b.y = CANVAS_HEIGHT - GROUND_HEIGHT - b.height;
          stateRef.current = "dead";
          setGameState("dead");
          playGameOver();
          if (scoreRef.current > highScoreRef.current) {
            highScoreRef.current = scoreRef.current;
            try { localStorage.setItem("flappy-high-score", `${scoreRef.current}`); } catch { /* noop */ }
            setHighScore(highScoreRef.current);
          }
          flashTimerRef.current = 300;
        }

        if (b.y < 0) {
          b.y = 0;
          b.vy = 1;
        }

        frameRef.current += dt;

        pipesRef.current = pipesRef.current.filter((p) => p.x + PIPE_WIDTH > -50);

        if (frameRef.current - lastPipeSpawnRef.current > PIPE_SPAWN_INTERVAL) {
          const minTop = 60;
          const maxTop = CANVAS_HEIGHT - GROUND_HEIGHT - PIPE_GAP - 60;
          const topHeight = Math.random() * (maxTop - minTop) + minTop;
          pipesRef.current.push({ x: CANVAS_WIDTH + 10, topHeight, width: PIPE_WIDTH, scored: false, passed: false });
          lastPipeSpawnRef.current = frameRef.current;
        }

        for (const p of pipesRef.current) {
          p.x -= PIPE_SPEED * (dt / 16);

          if (!p.passed && p.x + PIPE_WIDTH < BIRD_X) {
            p.passed = true;
            if (!p.scored) {
              p.scored = true;
              scoreRef.current += 1;
              setDisplayScore(scoreRef.current);
              playScore();
            }
          }

          const bx = BIRD_X;
          const by = b.y;
          const bw = b.width;
          const bh = b.height;
          const gapTop = p.topHeight;
          const gapBottom = p.topHeight + PIPE_GAP;

          if (
            bx + bw > p.x &&
            bx < p.x + PIPE_WIDTH
          ) {
            if (by < gapTop || by + bh > gapBottom) {
              stateRef.current = "dead";
              setGameState("dead");
              playGameOver();
              if (scoreRef.current > highScoreRef.current) {
                highScoreRef.current = scoreRef.current;
                try { localStorage.setItem("flappy-high-score", `${scoreRef.current}`); } catch { /* noop */ }
                setHighScore(highScoreRef.current);
              }
              flashTimerRef.current = 300;
            }
          }
        }
      }

      for (const p of pipesRef.current) {
        drawPipe(ctx, p, CANVAS_HEIGHT);
      }

      drawGround(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, groundOffsetRef.current);

      if (stateRef.current === "dead" && flashTimerRef.current > 0) {
        flashTimerRef.current -= dt;
        if (flashTimerRef.current % 200 > 100) {
          ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
      }

      drawBird(ctx, birdRef.current);

      // ── Score ──
      ctx.fillStyle = "white";
      ctx.font = "bold 48px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`${scoreRef.current}`, CANVAS_WIDTH / 2, 30);

      // ── Start / Dead overlay ──
      if (stateRef.current === "idle") {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = "white";
        ctx.font = "bold 28px 'Courier New', monospace";
        ctx.fillText("Flappy Bird", CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.25);

        ctx.font = "16px 'Courier New', monospace";
        ctx.fillStyle = "#a5b4fc";
        ctx.fillText("Tap / Space to start", CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.35);

        // Draw bouncing arrow
        const bounceY = Math.sin(Date.now() / 300) * 5;
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.42 + bounceY);
        ctx.lineTo(CANVAS_WIDTH / 2 - 12, CANVAS_HEIGHT * 0.42 - 10 + bounceY);
        ctx.lineTo(CANVAS_WIDTH / 2 + 12, CANVAS_HEIGHT * 0.42 - 10 + bounceY);
        ctx.closePath();
        ctx.fill();
      }

      if (stateRef.current === "dead") {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = "white";
        ctx.font = "bold 28px 'Courier New', monospace";
        ctx.fillText("Game Over", CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.35);

        ctx.font = "18px 'Courier New', monospace";
        ctx.fillStyle = "#facc15";
        ctx.fillText(`Score: ${scoreRef.current}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.45);
        ctx.fillStyle = "#a5b4fc";
        ctx.fillText(`Best: ${highScoreRef.current}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.52);

        ctx.font = "14px 'Courier New', monospace";
        ctx.fillStyle = "#818cf8";
        ctx.fillText("Tap / Space to restart", CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.62);
      }

      ctx.restore();
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ── Events ──────────────────────────────────────────────
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onTouchStart={handleTouch}
      className="select-none touch-none outline-none"
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="rounded-2xl shadow-2xl border border-white/10"
        style={{ background: "#1e1b4b" }}
      />
      {gameState === "dead" && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); resetGame(); }}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold text-sm transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}