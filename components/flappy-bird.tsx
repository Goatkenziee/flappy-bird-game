"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Constants ─────────────────────────────────────────────────────────
const CANVAS_W = 400;
const CANVAS_H = 600;
const GRAVITY = 0.45;
const FLAP_VEL = -7.5;
const MAX_VEL = 10;
const PIPE_W = 52;
const PIPE_GAP = 140;
const PIPE_SPEED = 2.8;
const PIPE_SPAWN_INTERVAL = 1400;
const BIRD_RADIUS = 14;
const GROUND_H = 60;

// ─── Types ─────────────────────────────────────────────────────────────
interface Pipe {
  x: number;
  topH: number;
  scored: boolean;
}

// ─── Drawing Helpers ───────────────────────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#4dc9f6");
  sky.addColorStop(1, "#87CEEB");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Clouds
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  const drawCloud = (cx: number, cy: number, s: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy, s * 30, 0, Math.PI * 2);
    ctx.arc(cx + s * 25, cy - s * 8, s * 22, 0, Math.PI * 2);
    ctx.arc(cx + s * 50, cy, s * 28, 0, Math.PI * 2);
    ctx.fill();
  };
  drawCloud(60, 80, 1);
  drawCloud(280, 120, 0.8);
  drawCloud(150, 200, 0.6);

  // Ground
  ctx.fillStyle = "#8B5E3C";
  ctx.fillRect(0, h - GROUND_H, w, GROUND_H);
  ctx.fillStyle = "#6B3F1F";
  ctx.fillRect(0, h - GROUND_H, w, 4);

  // Grass tufts
  ctx.fillStyle = "#4CAF50";
  for (let i = 0; i < w; i += 12) {
    ctx.fillRect(i, h - GROUND_H - 4, 3, 8);
  }
}

function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  vel: number,
  _frame: number
) {
  ctx.save();
  ctx.translate(x, y);

  // Tilt based on velocity
  const tilt = Math.max(-25, Math.min(25, vel * 3));
  ctx.rotate((tilt * Math.PI) / 180);

  // Body
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_RADIUS + 2, BIRD_RADIUS, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing
  ctx.fillStyle = "#FFA500";
  ctx.beginPath();
  ctx.ellipse(-4, 2, 8, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(6, -4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(8, -4, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = "#FF6600";
  ctx.beginPath();
  ctx.moveTo(14, -1);
  ctx.lineTo(22, 2);
  ctx.lineTo(14, 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawPipe(ctx: CanvasRenderingContext2D, p: Pipe, w: number, h: number) {
  const bottomY = p.topH + PIPE_GAP;

  // Top pipe body
  ctx.fillStyle = "#2ecc40";
  ctx.fillRect(p.x, 0, PIPE_W, p.topH);

  // Top pipe cap
  ctx.fillStyle = "#27ae60";
  ctx.fillRect(p.x - 4, p.topH - 24, PIPE_W + 8, 24);
  ctx.fillStyle = "#2ecc40";
  ctx.fillRect(p.x - 2, p.topH - 24, PIPE_W + 4, 20);

  // Bottom pipe body
  ctx.fillStyle = "#2ecc40";
  ctx.fillRect(p.x, bottomY, PIPE_W, h - bottomY - GROUND_H);

  // Bottom pipe cap
  ctx.fillStyle = "#27ae60";
  ctx.fillRect(p.x - 4, bottomY, PIPE_W + 8, 24);
  ctx.fillStyle = "#2ecc40";
  ctx.fillRect(p.x - 2, bottomY + 4, PIPE_W + 4, 20);

  // Pipe highlights
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(p.x + 6, 0, 8, p.topH);
  ctx.fillRect(p.x + 6, bottomY, 8, h - bottomY - GROUND_H);

  // Top pipe border
  ctx.strokeStyle = "#1e6b38";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(p.x, 0, PIPE_W, p.topH);

  // Bottom pipe border
  ctx.strokeStyle = "#1e6b38";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(p.x, bottomY, PIPE_W, h - bottomY);
}

// ─── Game Component ────────────────────────────────────────────────────
export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef({
    birdY: CANVAS_H / 2,
    birdVel: 0,
    pipes: [] as Pipe[],
    score: 0,
    frame: 0,
    lastPipeSpawn: 0,
    animId: 0,
  });

  const [gameState, setGameState] = useState<"start" | "playing" | "dead">("start");
  const [score, setScore] = useState(0);

  const resetGame = useCallback(() => {
    const g = gameRef.current;
    g.birdY = CANVAS_H / 2;
    g.birdVel = 0;
    g.pipes = [];
    g.score = 0;
    g.frame = 0;
    g.lastPipeSpawn = 0;
    setScore(0);
    setGameState("playing");
  }, []);

  const flap = useCallback(() => {
    if (gameState === "start") {
      resetGame();
      return;
    }
    if (gameState === "playing") {
      gameRef.current.birdVel = FLAP_VEL;
    }
  }, [gameState, resetGame]);

  // Handle keyboard and touch
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    const handleTap = (e: TouchEvent) => {
      e.preventDefault();
      flap();
    };
    const handleClick = () => flap();

    window.addEventListener("keydown", handleKey);
    window.addEventListener("touchstart", handleTap, { passive: false });
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("touchstart", handleTap);
      window.removeEventListener("click", handleClick);
    };
  }, [flap]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = 0;

    function loop(time: number) {
      const g = gameRef.current;
      const dt = Math.min((time - lastTime) / 16.667, 3);
      lastTime = time;
      g.frame++;

      // ── Update ──
      if (gameState === "playing") {
        // Gravity
        g.birdVel += GRAVITY * dt;
        g.birdVel = Math.min(g.birdVel, MAX_VEL);
        g.birdY += g.birdVel * dt;

        // Spawn pipes
        if (time - g.lastPipeSpawn > PIPE_SPAWN_INTERVAL) {
          g.lastPipeSpawn = time;
          const minTop = 60;
          const maxTop = CANVAS_H - GROUND_H - PIPE_GAP - 60;
          g.pipes.push({
            x: CANVAS_W,
            topH: minTop + Math.random() * (maxTop - minTop),
            scored: false,
          });
        }

        // Move pipes
        for (const p of g.pipes) {
          p.x -= PIPE_SPEED * dt;
        }

        // Score & remove offscreen pipes
        g.pipes = g.pipes.filter((p) => {
          if (p.x + PIPE_W < 0) return false;
          if (!p.scored && p.x + PIPE_W < CANVAS_W / 2 - BIRD_RADIUS) {
            p.scored = true;
            g.score++;
            setScore(g.score);
          }
          return true;
        });

        // Collision: pipes
        const bx = CANVAS_W / 2;
        const by = g.birdY;
        const br = BIRD_RADIUS;
        for (const p of g.pipes) {
          if (
            bx + br > p.x &&
            bx - br < p.x + PIPE_W &&
            (by - br < p.topH || by + br > p.topH + PIPE_GAP)
          ) {
            setGameState("dead");
            break;
          }
        }

        // Collision: ground / ceiling
        if (g.birdY + br > CANVAS_H - GROUND_H || g.birdY - br < 0) {
          setGameState("dead");
        }
      }

      // ── Draw ──
      // ctx is non-null here — we returned early above if it was null
      const c = ctx!;
      c.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBackground(c, CANVAS_W, CANVAS_H);

      // Pipes
      for (const p of g.pipes) {
        drawPipe(c, p, CANVAS_W, CANVAS_H);
      }

      // Bird (only if alive or start)
      if (gameState !== "dead") {
        drawBird(c, CANVAS_W / 2, g.birdY, g.birdVel, g.frame);
      }

      // Score display
      c.fillStyle = "white";
      c.font = "bold 48px monospace";
      c.textAlign = "center";
      c.strokeStyle = "rgba(0,0,0,0.5)";
      c.lineWidth = 4;
      c.strokeText(String(g.score), CANVAS_W / 2, 60);
      c.fillText(String(g.score), CANVAS_W / 2, 60);

      // Start / Dead overlay
      if (gameState === "start") {
        c.fillStyle = "rgba(0,0,0,0.35)";
        c.fillRect(0, 0, CANVAS_W, CANVAS_H);

        c.fillStyle = "white";
        c.font = "bold 32px monospace";
        c.fillText("Flappy Bird", CANVAS_W / 2, CANVAS_H / 2 - 40);

        c.font = "16px monospace";
        c.fillStyle = "#FFD700";
        c.fillText("Tap / Space / Click to start", CANVAS_W / 2, CANVAS_H / 2 + 10);
      }

      if (gameState === "dead") {
        c.fillStyle = "rgba(0,0,0,0.5)";
        c.fillRect(0, 0, CANVAS_W, CANVAS_H);

        c.fillStyle = "#FF4444";
        c.font = "bold 36px monospace";
        c.fillText("Game Over", CANVAS_W / 2, CANVAS_H / 2 - 30);

        c.fillStyle = "white";
        c.font = "20px monospace";
        c.fillText(`Score: ${g.score}`, CANVAS_W / 2, CANVAS_H / 2 + 20);

        c.fillStyle = "#FFD700";
        c.font = "16px monospace";
        c.fillText("Tap / Space / Click to restart", CANVAS_W / 2, CANVAS_H / 2 + 60);
      }

      g.animId = requestAnimationFrame(loop);
    }

    // Start the loop
    gameRef.current.animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(gameRef.current.animId);
  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a1a]">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="rounded-xl shadow-2xl border-2 border-white/10 cursor-pointer"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
