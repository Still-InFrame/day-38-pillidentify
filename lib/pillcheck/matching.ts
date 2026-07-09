import { POSSIBLE_MATCH_WARNING } from "./constants";
import type { PillMatch, PillReference } from "./types";

type SearchInput = {
  imprint: string | null;
  front_imprint?: string | null;
  back_imprint?: string | null;
  shape: string | null;
  color: string | null;
  photo_quality: "poor" | "okay" | "good";
};

function normalizeImprint(value: string | null | undefined) {
  return (value ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function normalizeTrait(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function labelForScore(score: number, hasImprint: boolean): "low" | "medium" | "high" {
  if (!hasImprint) return "low";
  if (score >= 85) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function uniqueImprintVariants(input: SearchInput) {
  const front = normalizeImprint(input.front_imprint);
  const back = normalizeImprint(input.back_imprint);
  const combined = normalizeImprint(input.imprint);
  const candidates = [
    { value: combined, reason: "imprint" },
    { value: [front, back].filter(Boolean).join(""), reason: "front/back imprint" },
    { value: [back, front].filter(Boolean).join(""), reason: "back/front imprint" },
    { value: front, reason: "front-side imprint" },
    { value: back, reason: "back-side imprint" },
  ].filter((candidate) => candidate.value);

  return candidates.filter(
    (candidate, index, all) =>
      all.findIndex((item) => item.value === candidate.value) === index,
  );
}

export function rankPillMatches(
  references: PillReference[],
  input: SearchInput,
): PillMatch[] {
  const imprintVariants = uniqueImprintVariants(input);
  const normalizedInputShape = normalizeTrait(input.shape);
  const normalizedInputColor = normalizeTrait(input.color);
  const hasImprint = imprintVariants.length > 0;

  return references
    .map((reference) => {
      let score = 0;
      const match_reasons: string[] = [];
      const referenceImprint =
        reference.normalized_imprint ?? normalizeImprint(reference.imprint);
      const referenceShape = normalizeTrait(reference.shape);
      const referenceColor = normalizeTrait(reference.color);

      const exactVariant = imprintVariants.find(
        (variant) => referenceImprint === variant.value,
      );
      const partialVariant = imprintVariants.find(
        (variant) =>
          referenceImprint &&
          (referenceImprint.includes(variant.value) ||
            variant.value.includes(referenceImprint)),
      );

      if (exactVariant) {
        score += 60;
        match_reasons.push(`Exact ${exactVariant.reason} match`);
      } else if (partialVariant) {
        score += 35;
        match_reasons.push(`Partial ${partialVariant.reason} match`);
      }

      if (normalizedInputShape && referenceShape === normalizedInputShape) {
        score += 20;
        match_reasons.push("Shape match");
      }

      if (normalizedInputColor && referenceColor === normalizedInputColor) {
        score += 20;
        match_reasons.push("Color match");
      }

      if (
        normalizedInputShape &&
        reference.dosage_form &&
        normalizeTrait(reference.dosage_form).includes(normalizedInputShape)
      ) {
        score += 10;
        match_reasons.push("Dosage form appears consistent");
      }

      if (!hasImprint) {
        score -= 40;
        match_reasons.push("No imprint provided, confidence limited");
      }

      if (input.photo_quality === "poor") {
        score -= 30;
        match_reasons.push("Poor photo quality reduced confidence");
      }

      return {
        pill_reference_id: reference.id,
        medication_name: reference.medication_name,
        generic_name: reference.generic_name,
        brand_name: reference.brand_name,
        strength: reference.strength,
        manufacturer: reference.manufacturer,
        imprint: reference.imprint,
        shape: reference.shape,
        color: reference.color,
        ndc: reference.ndc,
        rxcui: reference.rxcui,
        dailymed_setid: reference.dailymed_setid,
        confidence_score: Math.max(0, Math.min(100, score)),
        confidence_label: labelForScore(score, hasImprint),
        match_reasons,
        safety_disclaimer: POSSIBLE_MATCH_WARNING,
      } satisfies PillMatch;
    })
    .filter((match) => match.confidence_score > 0)
    .sort((a, b) => b.confidence_score - a.confidence_score)
    .slice(0, 8);
}
