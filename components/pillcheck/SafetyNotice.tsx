import { GENERAL_SAFETY_COPY, POSSIBLE_MATCH_WARNING } from "@/lib/pillcheck/constants";

type SafetyNoticeProps = {
  compact?: boolean;
};

export function SafetyNotice({ compact = false }: SafetyNoticeProps) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
      <strong className="font-semibold">Safety first.</strong>{" "}
      {compact ? POSSIBLE_MATCH_WARNING : GENERAL_SAFETY_COPY} Always confirm
      with an official source before making any medication decision.
    </div>
  );
}
