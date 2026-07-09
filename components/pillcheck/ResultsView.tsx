"use client";

import { useEffect, useState } from "react";
import type { PillMatch, SearchPillMatchesResponse } from "@/lib/pillcheck/types";
import { SafetyNotice } from "./SafetyNotice";

const feedbackLabels = {
  looks_correct: "Looks correct",
  looks_wrong: "Looks wrong",
  not_sure: "Not sure",
} as const;

export function ResultsView() {
  const [matches, setMatches] = useState<PillMatch[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [correctName, setCorrectName] = useState("");
  const [correctionStatus, setCorrectionStatus] = useState<string | null>(null);
  const [isCorrecting, setIsCorrecting] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = sessionStorage.getItem("pillcheck.results");
      if (!stored) return;
      const parsed = JSON.parse(stored) as SearchPillMatchesResponse;
      setMatches(parsed.matches);
    });
  }, []);

  function saveFeedback(match: PillMatch, value: keyof typeof feedbackLabels) {
    setFeedback((current) => ({ ...current, [match.pill_reference_id]: value }));
    fetch("/api/search-pill-matches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pill_reference_id: match.pill_reference_id,
        feedback_value: value,
      }),
    }).catch(() => undefined);
  }

  async function submitCorrection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lastSearch = JSON.parse(
      sessionStorage.getItem("pillcheck.lastSearch") ?? "{}",
    );
    setIsCorrecting(true);
    setCorrectionStatus(null);

    try {
      const response = await fetch("/api/reference-corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...lastSearch,
          medication_name: correctName.trim(),
        }),
      });

      if (!response.ok) throw new Error("Correction failed");

      const payload = await response.json();
      if (Array.isArray(payload.matches) && payload.matches.length > 0) {
        setMatches(payload.matches);
        sessionStorage.setItem(
          "pillcheck.results",
          JSON.stringify({ matches: payload.matches }),
        );
      }

      setCorrectionStatus(
        payload.reference_saved
          ? "Added an enriched possible match and saved it for future searches."
          : "Added an enriched possible match for this search. Run the Supabase RLS update to persist future corrections.",
      );
    } catch {
      setCorrectionStatus("Could not enrich that correction. Check the spelling or try the generic name.");
    } finally {
      setIsCorrecting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
      <SafetyNotice compact />

      <section>
        <h1 className="text-2xl font-semibold">Possible matches</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Matches are ranked from the edited visual traits. Multiple close
          matches can be valid candidates and must be checked with an official source.
        </p>
      </section>

      {matches.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">No matches found</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            PillCheck AI could not identify a likely candidate. Contact a
            pharmacist, doctor, poison control, the prescription bottle, or an
            official medication source.
          </p>
        </div>
      ) : null}

      <form
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={submitCorrection}
      >
        <h2 className="text-lg font-semibold">Know the correct medication?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter the name from the bottle or pharmacist label. PillCheck will
          enrich it from public drug data and add it as a possible match.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="field"
            value={correctName}
            onChange={(event) => setCorrectName(event.target.value)}
            placeholder="Example: montelukast 10 mg"
            required
          />
          <button className="btn-primary" type="submit" disabled={isCorrecting}>
            {isCorrecting ? "Enriching..." : "Add match"}
          </button>
        </div>
        {correctionStatus ? (
          <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
            {correctionStatus}
          </p>
        ) : null}
      </form>

      <div className="grid gap-4">
        {matches.map((match) => (
          <article key={match.pill_reference_id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{match.medication_name}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {match.strength ?? "Strength unknown"} · {match.manufacturer ?? "Manufacturer unknown"}
                </p>
              </div>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold uppercase text-emerald-800">
                {match.confidence_label}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Meta label="Imprint" value={match.imprint} />
              <Meta label="Shape" value={match.shape} />
              <Meta label="Color" value={match.color} />
              <Meta label="NDC" value={match.ndc} />
              <Meta label="RxCUI" value={match.rxcui} />
              <Meta label="DailyMed" value={match.dailymed_setid} />
            </dl>

            <div className="mt-4 rounded-md bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
              <strong>Why:</strong>{" "}
              {match.match_reasons.length > 0 ? match.match_reasons.join(", ") : "Low-signal visual similarity."}
            </div>

            <p className="mt-4 rounded-md bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-950">
              {match.safety_disclaimer}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(feedbackLabels) as Array<keyof typeof feedbackLabels>).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={feedback[match.pill_reference_id] === value ? "chip-active" : "chip"}
                  onClick={() => saveFeedback(match, value)}
                >
                  {feedbackLabels[value]}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-slate-900">{value ?? "Unknown"}</dd>
    </div>
  );
}
