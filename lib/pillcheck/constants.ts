export const APP_NAME = "PillCheck AI";

export const POSSIBLE_MATCH_WARNING =
  "Possible match only. Do not take this medication based only on this result. Confirm with a pharmacist, doctor, poison control, prescription bottle, or official medication source.";

export const GENERAL_SAFETY_COPY =
  "PillCheck AI is an identification assistant, not a diagnosis, treatment, dosage, interaction, or safety tool.";

export const SHAPES = [
  "round",
  "oval",
  "capsule",
  "oblong",
  "tablet",
  "square",
  "triangle",
  "unknown",
] as const;

export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

export const PHOTO_QUALITY = ["poor", "okay", "good"] as const;
