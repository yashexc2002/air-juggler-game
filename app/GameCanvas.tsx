"use client";

import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
} from "@mediapipe/tasks-vision";

let globalHandLandmarker: HandLandmarker | null = null;

export default function GameCanvas() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);

  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const gameState = useRef({
    ballX: 320,
    ballY: 100,
    speedX: 5,
    speedY: 5,
    radius: 15,
    score: 0,
    isGameOver: false,
  });

  const restartGame = () => {
    gameState.current = {
      ballX: 320,
      ballY: 100,
      speedX: 5,
      speedY: 5,
      radius: 15,
      score: 0,
      isGameOver: false,
    };

    setScore(0);
    setIsGameOver(false);
  };

  useEffect(() => {
    const setupAI = async () => {
      if (
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia
      ) {
        try {
          const stream =
            await navigator.mediaDevices.getUserMedia({
              video: { width: 640, height: 480 },
            });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Camera error!", err);
        }
      }

      if (typeof window !== "undefined") {
        // @ts-ignore
        if (window.handLandmarkerInstance) {
          detectHands();
          return;
        }

        // @ts-ignore
        if (window.isAILoading) return;

        // @ts-ignore
        window.isAILoading = true;
      }

      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const instance =
          await HandLandmarker.createFromOptions(
            vision,
            {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                delegate: "GPU",
              },
              runningMode: "VIDEO",
              numHands: 1,
            }
          );

        if (typeof window !== "undefined") {
          // @ts-ignore
          window.handLandmarkerInstance = instance;
        }

        detectHands();
      } catch (error) {
        console.error("AI error:", error);
      } finally {
        if (typeof window !== "undefined") {
          // @ts-ignore
          window.isAILoading = false;
        }
      }
    };

    const detectHands = async () => {
      // @ts-ignore
      const model = window.handLandmarkerInstance;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const video = videoRef.current;
      const state = gameState.current;

      if (
        video &&
        video.readyState === 4 &&
        model &&
        ctx &&
        canvas
      ) {
        ctx.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        if (state.isGameOver) {
          requestRef.current =
            requestAnimationFrame(detectHands);
          return;
        }

        state.ballX += state.speedX;
        state.ballY += state.speedY;

        if (
          state.ballX - state.radius <= 0 ||
          state.ballX + state.radius >= canvas.width
        ) {
          state.speedX *= -1;
        }

        if (state.ballY - state.radius <= 0) {
          state.speedY *= -1;
        }

        if (
          state.ballY + state.radius >=
          canvas.height
        ) {
          state.isGameOver = true;
          setIsGameOver(true);
        }

        const results = model.detectForVideo(
          video,
          performance.now()
        );

        let handX = -100;
        let handY = -100;

        if (
          results.landmarks &&
          results.landmarks.length > 0
        ) {
          const palm = results.landmarks[0][9];

          handX =
            (1 - palm.x) * canvas.width;

          handY =
            palm.y * canvas.height;

          ctx.beginPath();
          ctx.arc(
            handX,
            handY,
            35,
            0,
            2 * Math.PI
          );

          ctx.fillStyle =
            "rgba(6, 182, 212, 0.4)";
          ctx.fill();

          ctx.lineWidth = 3;
          ctx.strokeStyle = "#06b6d4";
          ctx.stroke();

          const dx =
            state.ballX - handX;

          const dy =
            state.ballY - handY;

          const distance = Math.sqrt(
            dx * dx + dy * dy
          );

          if (
            distance <
              state.radius + 35 &&
            state.speedY > 0
          ) {
            state.speedY =
              -Math.abs(state.speedY);

            state.speedX =
              dx * 0.15;

            state.score += 1;

            setScore(state.score);

            state.speedY -= 0.5;
          }
        }

        ctx.beginPath();
        ctx.arc(
          state.ballX,
          state.ballY,
          state.radius,
          0,
          2 * Math.PI
        );

        ctx.fillStyle = "#ec4899";
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = "#fbcfe8";
        ctx.stroke();
      }

      requestRef.current =
        requestAnimationFrame(detectHands);
    };

    setupAI();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <div className="relative mt-8 rounded-xl overflow-hidden border-4 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)] bg-black w-[640px] h-[480px]">
      <div className="absolute top-4 left-4 z-20 bg-black/60 px-4 py-2 rounded-lg border border-cyan-500">
        <p className="text-2xl font-bold text-cyan-300">
          Score: {score}
        </p>
      </div>

      {isGameOver && (
        <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <h2 className="text-5xl font-bold text-pink-500 mb-2 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]">
            GAME OVER
          </h2>

          <p className="text-xl text-white mb-6">
            Final Score: {score}
          </p>

          <button
            onClick={restartGame}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-full transition-all shadow-[0_0_15px_rgba(6,182,212,0.5)]"
          >
            Play Again
          </button>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width={640}
        height={480}
        className="absolute inset-0 transform -scale-x-100 z-0"
      />

      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="absolute inset-0 z-10"
      />
    </div>
  );
}