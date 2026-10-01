"use client";

import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
} from "@mediapipe/tasks-vision";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const BALL_SPEED = 300;
const HAND_DETECTION_INTERVAL = 1000 / 20;
const HAND_RADIUS = 35;

let globalHandLandmarker: HandLandmarker | null = null;

export default function GameCanvas() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);

  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const gameState = useRef({
    ballX: CANVAS_WIDTH / 2,
    ballY: 100,
    speedX: BALL_SPEED,
    speedY: BALL_SPEED,
    radius: 15,
    score: 0,
    isGameOver: false,
    handX: -100,
    handY: -100,
  });

  const restartGame = () => {
    gameState.current = {
      ballX: CANVAS_WIDTH / 2,
      ballY: 100,
      speedX: BALL_SPEED,
      speedY: BALL_SPEED,
      radius: 15,
      score: 0,
      isGameOver: false,
      handX: -100,
      handY: -100,
    };

    setScore(0);
    setIsGameOver(false);
  };

  useEffect(() => {
    let isMounted = true;
    let cameraStream: MediaStream | null = null;
    let lastFrameTime = performance.now();
    let lastHandDetectionTime = 0;

    const setupAI = async () => {
      if (
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia
      ) {
        try {
          const stream =
            await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: "user",
                width: { ideal: CANVAS_WIDTH },
                height: { ideal: CANVAS_HEIGHT },
                frameRate: { ideal: 30, max: 30 },
              },
            });
          cameraStream = stream;

          if (videoRef.current && isMounted) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Camera error!", err);
        }
      }

      if (globalHandLandmarker) {
        detectHands();
        return;
      }

      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const modelOptions = {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU" as const,
          },
          runningMode: "VIDEO" as const,
          numHands: 1,
        };

        try {
          globalHandLandmarker =
            await HandLandmarker.createFromOptions(
              vision,
              modelOptions
            );
        } catch (gpuError) {
          console.warn(
            "GPU hand tracking unavailable, using CPU.",
            gpuError
          );
          globalHandLandmarker =
            await HandLandmarker.createFromOptions(vision, {
              ...modelOptions,
              baseOptions: {
                ...modelOptions.baseOptions,
                delegate: "CPU",
              },
            });
        }

        detectHands();
      } catch (error) {
        console.error("AI error:", error);
      }
    };

    const detectHands = () => {
      if (!isMounted) {
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const video = videoRef.current;
      const state = gameState.current;
      const now = performance.now();
      const deltaTime = Math.min(
        (now - lastFrameTime) / 1000,
        0.05
      );
      lastFrameTime = now;

      if (
        video &&
        video.readyState === 4 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        globalHandLandmarker &&
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

        state.ballX += state.speedX * deltaTime;
        state.ballY += state.speedY * deltaTime;

        if (
          state.ballX - state.radius <= 0 ||
          state.ballX + state.radius >= canvas.width
        ) {
          state.ballX = Math.max(
            state.radius,
            Math.min(canvas.width - state.radius, state.ballX)
          );
          state.speedX *= -1;
        }

        if (state.ballY - state.radius <= 0) {
          state.ballY = state.radius;
          state.speedY *= -1;
        }

        if (
          state.ballY + state.radius >=
          canvas.height
        ) {
          state.isGameOver = true;
          setIsGameOver(true);
        }

        if (now - lastHandDetectionTime >= HAND_DETECTION_INTERVAL) {
          lastHandDetectionTime = now;
          const results = globalHandLandmarker.detectForVideo(
            video,
            now
          );

          if (results.landmarks?.length) {
            const landmarks = results.landmarks[0];
            const palm = [0, 5, 9, 13, 17].reduce(
              (center, index) => ({
                x: center.x + landmarks[index].x / 5,
                y: center.y + landmarks[index].y / 5,
              }),
              { x: 0, y: 0 }
            );
            const scale = Math.max(
              canvas.width / video.videoWidth,
              canvas.height / video.videoHeight
            );
            const renderedWidth = video.videoWidth * scale;
            const renderedHeight = video.videoHeight * scale;
            const cropX = (renderedWidth - canvas.width) / 2;
            const cropY = (renderedHeight - canvas.height) / 2;
            const detectedHandX =
              canvas.width - palm.x * renderedWidth + cropX;
            const detectedHandY =
              palm.y * renderedHeight - cropY;

            if (state.handX < 0) {
              state.handX = detectedHandX;
              state.handY = detectedHandY;
            } else {
              state.handX +=
                (detectedHandX - state.handX) * 0.35;
              state.handY +=
                (detectedHandY - state.handY) * 0.35;
            }

            const dx = state.ballX - state.handX;
            const dy = state.ballY - state.handY;
            const distance = Math.hypot(dx, dy);

            if (
              distance < state.radius + HAND_RADIUS &&
              state.speedY > 0
            ) {
              state.speedY = -Math.abs(state.speedY);
              state.speedX = Math.max(
                -BALL_SPEED * 1.5,
                Math.min(BALL_SPEED * 1.5, dx * 8)
              );
              state.score += 1;
              setScore(state.score);
              state.speedY -= 30;
            }
          }
        }

        if (state.handX >= 0) {
          ctx.beginPath();
          ctx.arc(
            state.handX,
            state.handY,
            HAND_RADIUS,
            0,
            2 * Math.PI
          );
          ctx.fillStyle = "rgba(6, 182, 212, 0.4)";
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#06b6d4";
          ctx.stroke();
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
      isMounted = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="relative mt-8 aspect-[4/3] w-full max-w-[640px] overflow-hidden rounded-xl border-4 border-cyan-500 bg-black shadow-[0_0_20px_rgba(6,182,212,0.5)]">
      <div className="absolute left-2 top-2 z-20 rounded-lg border border-cyan-500 bg-black/60 px-3 py-1.5 sm:left-4 sm:top-4 sm:px-4 sm:py-2">
        <p className="text-lg font-bold text-cyan-300 sm:text-2xl">
          Score: {score}
        </p>
      </div>

      {isGameOver && (
        <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <h2 className="mb-2 text-3xl font-bold text-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)] sm:text-5xl">
            GAME OVER
          </h2>

          <p className="mb-6 text-base text-white sm:text-xl">
            Final Score: {score}
          </p>

          <button
            onClick={restartGame}
            className="rounded-full bg-cyan-500 px-5 py-2.5 font-bold text-black shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all hover:bg-cyan-400 sm:px-6 sm:py-3"
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
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="absolute inset-0 z-0 h-full w-full -scale-x-100 object-cover"
      />

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="absolute inset-0 z-10 h-full w-full"
      />
    </div>
  );
}