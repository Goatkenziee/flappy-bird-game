import FlappyBird from "@/components/flappy-bird";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-white tracking-tight">Flappy Bird</h1>
        <p className="text-slate-400 mt-2 text-sm">
          Click or press <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 text-xs font-mono">Space</kbd> to flap &mdash; avoid the pipes!
        </p>
      </div>
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-700">
        <FlappyBird />
      </div>
      <p className="text-slate-500 text-xs mt-4">
        Built with Next.js &middot; Canvas API
      </p>
    </main>
  );
}
