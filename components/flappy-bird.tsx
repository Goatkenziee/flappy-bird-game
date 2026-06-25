"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────
const CANVAS_W = 400;
const CANVAS_H = 600;
const GRAVITY = 0.45;
const FLAP_VEL = -7.5;
const PIPE_W = 55;
const PIPE_GAP = 160;
const PIPE_SPEED = 2.8;
const GROUND_H = 80;
const BIRD_RADIUS = 14;
const MAX_VEL = 12;
const PIPE_SPAWN_INTERVAL = 1600; // ms

// ─── Types ────────────────────────────────────────────────────────────
interface Pipe {
  x: number;
  topH: number;
  scored: boolean;
}

// ─── Drawing helpers ──────────────────────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h - GROUND_H);
  sky.addColorStop(0, "#1a0a2e");
  sky.addColorStop(0.4, "#2d1b69");
  sky.addColorStop(0.7, "#4a2c8a");
  sky.addColorStop(1, "#87CEEB");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h - GROUND_H);

  // Clouds
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let i = 0; i < 5; i++) {
    const cx = (Date.now() * 0.02 + i * 120) % (w + 100) - 50;
    const cy = 40 + i * 45;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.arc(cx + 25, cy - 10, 22, 0, Math.PI * 2);
    ctx.arc(cx + 45, cy, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant mountains
  ctx.fillStyle = "rgba(30,15,60,0.3)";
  ctx.beginPath();
  ctx.moveTo(0, h - GROUND_H);
  for (let x = 0; x <= w; x += 2) {
    const y = h - GROUND_H - 40 - Math.sin(x * 0.008) * 25 - Math.sin(x * 0.015) * 15;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h - GROUND_H);
  ctx.closePath();
  ctx.fill();

  // Ground
  const grd = ctx.createLinearGradient(0, h - GROUND_H, 0, h);
  grd.addColorStop(0, "#4a7c3f");
  grd.addColorStop(0.3, "#3d6b34");
  grd.addColorStop(1, "#2d4f25");
  ctx.fillStyle = grd;
  ctx.fillRect(0, h - GROUND_H, w, GROUND_H);

  // Ground line
  ctx.strokeStyle = "#5a9c4f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h - GROUND_H);
  ctx.lineTo(w, h - GROUND_H);
  ctx.stroke();

  // Ground texture dashes
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 25) {
    ctx.beginPath();
    ctx.moveTo(x, h - GROUND_H + 10);
    ctx.lineTo(x + 10, h - GROUND_H + 10);
    ctx.stroke();
  }
}

function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  velocity: number,
  frame: number
) {
  ctx.save();
  ctx.translate(x, y);

  // Tilt based on velocity
  const tilt = Math.max(-0.5, Math.min(0.8, velocity * 0.04));
  ctx.rotate(tilt);

  // Body (gradient)
  const bodyGrd = ctx.createRadialGradient(-3, -3, 2, 0, 0, BIRD_RADIUS + 4);
  bodyGrd.addColorStop(0, "#FFD700");
  bodyGrd.addColorStop(0.6, "#FFA500");
  bodyGrd.addColorStop(1, "#E88600");
  ctx.fillStyle = bodyGrd;
  ctx.beginPath();
  ctx.arc(0, 0, BIRD_RADIUS + 2, 0, Math.PI * 2);
  ctx.fill();

  // Wing (animated flap)
  const wingAngle = Math.sin(frame * 0.15) * 0.6 + 0.3;
  ctx.fillStyle = "#D47500";
  ctx.beginPath();
  ctx.ellipse(-6, 2, 10, 6, wingAngle, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(6, -5, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.arc(8, -5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(9.5, -7, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = "#FF6B35";
  ctx.beginPath();
  ctx.moveTo(14, -1);
  ctx.lineTo(24, 2);
  ctx.lineTo(14, 5);
  ctx.closePath();
  ctx.fill();

  // Tail feathers
  ctx.fillStyle = "#CC6600";
  ctx.beginPath();
  ctx.moveTo(-14, -2);
  ctx.lineTo(-22, -8);
  ctx.lineTo(-18, 0);
  ctx.lineTo(-22, 6);
  ctx.lineTo(-14, 4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawPipe(ctx: CanvasRenderingContext2D, p: Pipe, w: number, h: number) {
  const bottomY = p.topH + PIPE_GAP;

  // ── Top pipe ──
  const topGrd = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
  topGrd.addColorStop(0, "#2d8a4e");
  topGrd.addColorStop(0.3, "#3aa85e");
  topGrd.addColorStop(0.7, "#3aa85e");
  topGrd.addColorStop(1, "#1e6b38");
  ctx.fillStyle = topGrd;
  ctx.fillRect(p.x, 0, PIPE_W, p.topH);

  // Top pipe cap
  ctx.fillStyle = "#3aa85e";
  ctx.fillRect(p.x - 4, p.topH - 22, PIPE_W + 8, 22);
  ctx.strokeStyle = "#1e6b38";
  ctx.lineWidth = 2;
  ctx.strokeRect(p.x - 4, p.topH - 22, PIPE_W + 8, 22);

  // Top pipe highlight
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(p.x + 4, 0, 8, p.topH - 22);

  // Top pipe border
  ctx.strokeStyle = "#1e6b38";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(p.x, 0, PIPE_W, p.topH);

  // ── Bottom pipe ──
  const botGrd = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
  botGrd.addColorStop(0, "#2d8a4e");
  botGrd.addColorStop(0.3, "#3aa85e");
  botGrd.addColorStop(0.7, "#3aa85e");
  botGrd.addColorStop(1, "#1e6b38");
  ctx.fillStyle = botGrd;
  ctx.fillRect(p.x, bottomY, PIPE_W, h - bottomY);

  // Bottom pipe cap
  ctx.fillStyle = "#3aa85e";
  ctx.fillRect(p.x - 4, bottomY, PIPE_W + 8, 22);
  ctx.strokeStyle = "#1e6b38";
  ctx.lineWidth = 2;
  ctx.strokeRect(p.x - 4, bottomY, PIPE_W + 8, 22);

  // Bottom pipe highlight
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(p.x + 4, bottomY + 22, 8, h - bottomY - 22);

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
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBackground(ctx, CANVAS_W, CANVAS_H);

      // Pipes
      for (const p of g.pipes) {
        drawPipe(ctx, p, CANVAS_W, CANVAS_H);
      }

      // Bird (only if alive or start)
      if (gameState !== "dead") {
        drawBird(ctx, CANVAS_W / 2, g.birdY, g.birdVel, g.frame);
      }

      // Score display
      ctx.fillStyle = "white";
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 4;
      ctx.strokeText(String(g.score), CANVAS_W / 2, 60);
      ctx.fillText(String(g.score), CANVAS_W / 2, 60);

      // Start / Dead overlay
      if (gameState === "start") {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.fillStyle = "white";
        ctx.font = "bold 32px monospace";
        ctx.fillText("Flappy Bird", CANVAS_W / 2, CANVAS_H / 2 - 40);

        ctx.font = "16px monospace";
        ctx.fillStyle = "#FFD700";
        ctx.fillText("Tap / Space / Click to start", CANVAS_W / 2, CANVAS_H / 2 + 10);
      }

      if (gameState === "dead") {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.fillStyle = "#FF4444";
        ctx.font = "bold 36px monospace";
        ctx.fillText("Game Over", CANVAS_W / 2, CANVAS_H / 2 - 30);

        ctx.fillStyle = "white";
        ctx.font = "20px monospace";
        ctx.fillText(`Score: ${g.score}`, CANVAS_W / 2, CANVAS_H / 2 + 20);

        ctx.fillStyle = "#FFD700";
        ctx.font = "16px monospace";
        ctx.fillText("Tap / Space / Click to restart", CANVAS_W / 2, CANVAS_H / 2 + 60);
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
