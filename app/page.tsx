import GameCanvas from "@/app/GameCanvas";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center overflow-x-hidden p-4 sm:p-8">
      <h1 className="mb-3 text-center text-4xl font-extrabold text-transparent [background-clip:text] bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)] sm:mb-4 sm:text-5xl md:text-7xl">
        Air Juggler
      </h1>
      <p className="text-center text-sm font-semibold uppercase tracking-widest text-cyan-300 animate-pulse sm:text-xl">
        Webcam Gesture-Controlled Game
      </p>
      
      {/* Humara naya Webcam Component */}
      <GameCanvas />
    </main>
  );
}