import { useEffect, useRef, useState } from "react";
import * as tmImage from "@teachablemachine/image";
import * as tf from "@tensorflow/tfjs";

type Prediction = {
  className: string;
  probability: number;
};

export function DetectorIA() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [model, setModel] = useState<tmImage.CustomMobileNet | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar modelo desde /public/model/
  useEffect(() => {
    async function loadModel() {
      try {
        await tf.ready();
        const MODEL_URL = "/model/model.json";
        const METADATA_URL = "/model/metadata.json";

        const loadedModel = await tmImage.load(MODEL_URL, METADATA_URL);
        setModel(loadedModel);
        setLoading(false);
      } catch (err) {
        setError(
          "Error cargando el modelo. Verifica que los archivos estén en /public/model/",
        );
        console.error(err);
        setLoading(false);
      }
    }
    loadModel();
  }, []);

  // Iniciar webcam
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationId: number;

    async function startWebcam() {
      if (!model || !videoRef.current || !canvasRef.current) return;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 224 },
            height: { ideal: 224 },
          },
          audio: false,
        });

        videoRef.current.srcObject = stream;

        await new Promise((resolve) => {
          videoRef.current!.addEventListener(
            "loadedmetadata",
            () => {
              resolve(true);
            },
            { once: true },
          );
        });

        await videoRef.current.play();

        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;

        async function predictLoop() {
          if (!model || !videoRef.current) return;

          const ctx = canvasRef.current!.getContext("2d");

          if (ctx) {
            ctx.drawImage(
              videoRef.current,
              0,
              0,
              canvasRef.current!.width,
              canvasRef.current!.height,
            );
          }
          const predictions = await model.predict(canvasRef.current!);
          const formattedPredictions = predictions.map((p) => ({
            className: p.className,
            probability: Math.round(p.probability * 10000) / 100,
          }));
          setPredictions(formattedPredictions);
          animationId = requestAnimationFrame(predictLoop);
        }
        predictLoop();
      } catch (error) {
        setError("Error accediendo a la webcam. Verifica los permisos.");
        console.error(error);
      }
    }
    if (model) {
      startWebcam().catch((err) =>
        console.error("Error iniciando la webcam:", err),
      );
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [model]);

  // Encontrar la predicción dominante
  const dominantPrediction = predictions.reduce(
    (max, pred) => (pred.probability > max.probability ? pred : max),
    predictions[0] || { className: "-", probability: 0 },
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            Cargando modelo de IA...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contenedor de video */}
      <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-lg">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-1/2 object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Predicción dominante */}
      <div className="bg-linear-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <h3 className="text-sm font-medium opacity-90 mb-1">Clase Detectada</h3>
        <p className="text-3xl font-bold">{dominantPrediction.className}</p>
        <p className="text-lg opacity-90">
          {dominantPrediction.probability}% confianza
        </p>
      </div>

      {/* Barras de progreso para todas las clases */}
      <div className="space-y-3">
        {predictions.map((pred) => (
          <div key={pred.className} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {pred.className}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {pred.probability}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  pred.className === dominantPrediction.className
                    ? "bg-linear-to-r from-blue-500 to-purple-600"
                    : "bg-gray-400 dark:bg-gray-500"
                }`}
                style={{ width: `${pred.probability}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
