"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SafetyNotice } from "./SafetyNotice";

type CameraState = "idle" | "starting" | "ready" | "error";
type PillSide = "front" | "back";

const sideLabels: Record<PillSide, string> = {
  front: "front",
  back: "back",
};

export function CameraCapture() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<PillSide>("front");
  const [photos, setPhotos] = useState<Record<PillSide, string | null>>({
    front: null,
    back: null,
  });
  const [backIsBlank, setBackIsBlank] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const preview = photos[activeSide];
  const hasFrontPhoto = Boolean(photos.front);
  const hasBackDecision = Boolean(photos.back) || backIsBlank;

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
    setCameraState("idle");
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
    savePhoto(activeSide, dataUrl);
    stopCamera();
  }

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => savePhoto(activeSide, String(reader.result));
    reader.readAsDataURL(file);
  }

  function savePhoto(side: PillSide, dataUrl: string) {
    setPhotos((current) => ({ ...current, [side]: dataUrl }));
    if (side === "back") {
      setBackIsBlank(false);
    }
  }

  function selectSide(side: PillSide) {
    stopCamera();
    setError(null);
    setActiveSide(side);
  }

  function retakeSide(side: PillSide) {
    stopCamera();
    setPhotos((current) => ({ ...current, [side]: null }));
    if (side === "back") {
      setBackIsBlank(false);
    }
    setActiveSide(side);
  }

  function markBackBlank() {
    stopCamera();
    setPhotos((current) => ({ ...current, back: null }));
    setBackIsBlank(true);
    setActiveSide("back");
  }

  async function analyzeImage() {
    if (!photos.front) {
      setError("Capture or upload the front side first.");
      return;
    }

    if (!hasBackDecision) {
      setError("Capture the back side, upload it, or mark the back as blank.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-pill-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front_image_url: photos.front,
          back_image_url: photos.back,
          back_is_blank: backIsBlank,
        }),
      });

      if (!response.ok) {
        throw new Error("Image analysis failed.");
      }

      const analysis = await response.json();
      sessionStorage.setItem("pillcheck.analysis", JSON.stringify(analysis));
      sessionStorage.setItem("pillcheck.frontPhoto", photos.front);
      if (photos.back) {
        sessionStorage.setItem("pillcheck.backPhoto", photos.back);
      } else {
        sessionStorage.removeItem("pillcheck.backPhoto");
      }
      sessionStorage.setItem("pillcheck.backIsBlank", String(backIsBlank));
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
        <div className="mb-4 grid grid-cols-2 gap-2">
          {(["front", "back"] as PillSide[]).map((side) => (
            <button
              key={side}
              className={activeSide === side ? "chip-active" : "chip"}
              type="button"
              onClick={() => selectSide(side)}
            >
              {side === "front" ? "Front side" : "Back side"}
              {photos[side] ? " captured" : side === "back" && backIsBlank ? " blank" : ""}
            </button>
          ))}
        </div>

        <div className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
          Capture the {sideLabels[activeSide]} side. If the back side has no
          imprint or markings, use the blank option.
        </div>

        <div className="aspect-[4/5] overflow-hidden rounded-md bg-slate-950">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Captured pill preview" className="h-full w-full object-cover" />
          ) : activeSide === "back" && backIsBlank ? (
            <div className="flex h-full w-full items-center justify-center px-8 text-center text-sm font-medium leading-6 text-white">
              Back side marked blank
            </div>
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
          {!preview && !(activeSide === "back" && backIsBlank) && cameraState !== "ready" ? (
            <button className="btn-primary" type="button" onClick={startCamera}>
              {cameraState === "starting" ? "Starting camera..." : "Use camera"}
            </button>
          ) : null}
          {!preview && !(activeSide === "back" && backIsBlank) && cameraState === "ready" ? (
            <button className="btn-primary" type="button" onClick={capturePhoto}>
              Capture {sideLabels[activeSide]}
            </button>
          ) : null}
          {hasFrontPhoto && hasBackDecision ? (
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
          {activeSide === "back" && !photos.back && !backIsBlank ? (
            <button className="btn-secondary" type="button" onClick={markBackBlank}>
              Back is blank
            </button>
          ) : null}
          {preview || (activeSide === "back" && backIsBlank) ? (
            <button className="btn-secondary" type="button" onClick={() => retakeSide(activeSide)}>
              Retake
            </button>
          ) : null}
          {hasFrontPhoto && !hasBackDecision ? (
            <button className="btn-secondary" type="button" onClick={() => selectSide("back")}>
              Continue to back
            </button>
          ) : null}
        </div>
      </section>

      <p className="text-sm leading-6 text-slate-600">
        Photograph one loose pill on a plain surface. Capture both sides when
        possible because imprints and logos are often split across the pill.
      </p>
    </div>
  );
}
