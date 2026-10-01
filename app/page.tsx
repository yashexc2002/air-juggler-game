import GameCanvas from "@/app/GameCanvas";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)] mb-4">
        Air Juggler
      </h1>
      <p className="text-xl font-semibold text-cyan-300 tracking-widest uppercase animate-pulse">
        Webcam Gesture-Controlled Game
      </p>
      
      {/* Humara naya Webcam Component */}
      <GameCanvas />
    </main>
  );
}