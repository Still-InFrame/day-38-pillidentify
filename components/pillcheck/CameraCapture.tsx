"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SafetyNotice } from "./SafetyNotice";

type CameraState = "idle" | "starting" | "ready" | "error";

export function CameraCapture() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function startCamera() {
    setError(null);
    setCameraState("starting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("ready");
    } catch {
      setCameraState("error");
      setError(
        "Camera access was blocked or unavailable. You can still upload a photo.",
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    setPreview(dataUrl);
    stopCamera();
  }

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function analyzeImage() {
    if (!preview) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-pill-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: preview }),
      });

      if (!response.ok) {
        throw new Error("Image analysis failed.");
      }

      const analysis = await response.json();
      sessionStorage.setItem("pillcheck.analysis", JSON.stringify(analysis));
      sessionStorage.setItem("pillcheck.photo", preview);
      router.push("/confirm");
    } catch {
      setError("The image could not be analyzed. Try a clearer single-pill photo.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <SafetyNotice />

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="aspect-[4/5] overflow-hidden rounded-md bg-slate-950">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Captured pill preview" className="h-full w-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
            />
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {error ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {!preview && cameraState !== "ready" ? (
            <button className="btn-primary" type="button" onClick={startCamera}>
              {cameraState === "starting" ? "Starting camera..." : "Use camera"}
            </button>
          ) : null}
          {!preview && cameraState === "ready" ? (
            <button className="btn-primary" type="button" onClick={capturePhoto}>
              Capture photo
            </button>
          ) : null}
          {preview ? (
            <button className="btn-primary" type="button" onClick={analyzeImage} disabled={isAnalyzing}>
              {isAnalyzing ? "Analyzing..." : "Analyze traits"}
            </button>
          ) : null}
          <label className="btn-secondary cursor-pointer text-center">
            Upload photo
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleUpload}
            />
          </label>
          {preview ? (
            <button className="btn-secondary" type="button" onClick={() => setPreview(null)}>
              Retake
            </button>
          ) : null}
        </div>
      </section>

      <p className="text-sm leading-6 text-slate-600">
        Photograph one loose pill on a plain surface. Imprints matter most, so
        retake the photo if the letters or numbers are hard to read.
      </p>
    </div>
  );
}
