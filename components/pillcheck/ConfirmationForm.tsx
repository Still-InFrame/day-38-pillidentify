"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PillAnalysis } from "@/lib/pillcheck/types";
import { SafetyNotice } from "./SafetyNotice";

const shapes = ["round", "oval", "capsule", "oblong", "tablet", "square", "triangle", "unknown"];
const colors = ["white", "blue", "brown", "pink", "red", "yellow", "green", "orange", "purple", "gray"];

export function ConfirmationForm() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<PillAnalysis | null>(null);
  const [imprint, setImprint] = useState("");
  const [shape, setShape] = useState("unknown");
  const [color, setColor] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = sessionStorage.getItem("pillcheck.analysis");
      if (!stored) return;

      const parsed = JSON.parse(stored) as PillAnalysis;
      setAnalysis(parsed);
      setImprint(parsed.imprint_text ?? "");
      setShape(parsed.shape);
      setColor(parsed.color ?? "");
    });
  }, []);

  async function findMatches(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch("/api/search-pill-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imprint: imprint.trim() || null,
          shape: shape || null,
          color: color.trim() || null,
          photo_quality: analysis?.photo_quality ?? "okay",
        }),
      });

      if (!response.ok) throw new Error("Search failed");

      const payload = await response.json();
      sessionStorage.setItem("pillcheck.results", JSON.stringify(payload));
      const history = JSON.parse(localStorage.getItem("pillcheck.history") ?? "[]");
      localStorage.setItem(
        "pillcheck.history",
        JSON.stringify([
          {
            created_at: new Date().toISOString(),
            imprint: imprint.trim() || null,
            shape,
            color: color.trim() || null,
            result_count: payload.matches.length,
          },
          ...history,
        ].slice(0, 10)),
      );
      router.push("/results");
    } catch {
      setError("Could not search references. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  if (!analysis) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <SafetyNotice />
        <p className="mt-5 text-slate-700">No scan is ready yet. Start with a photo.</p>
      </div>
    );
  }

  return (
    <form className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6" onSubmit={findMatches}>
      <SafetyNotice />

      {analysis.should_retake_photo ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
          This photo should be retaken before relying on matches. You can still
          review the extracted traits, but confidence will be limited.
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Confirm visible traits</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Edit anything the image model guessed incorrectly. The search uses
          these traits, with imprint weighted highest.
        </p>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-800">
            Imprint text
            <input
              className="field"
              value={imprint}
              onChange={(event) => setImprint(event.target.value)}
              placeholder="Example: I-2"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-800">
            Shape
            <select className="field" value={shape} onChange={(event) => setShape(event.target.value)}>
              {shapes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-800">
            Color
            <input
              className="field"
              list="pill-colors"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              placeholder="Example: white"
            />
            <datalist id="pill-colors">
              {colors.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="mt-5 rounded-md bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
          Photo quality: <strong>{analysis.photo_quality}</strong>.{" "}
          {analysis.warnings.length > 0 ? analysis.warnings.join(" ") : "No model warnings returned."}
        </div>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        <button className="btn-primary mt-5 w-full" type="submit" disabled={isSearching}>
          {isSearching ? "Searching..." : "Find possible matches"}
        </button>
      </section>
    </form>
  );
}
