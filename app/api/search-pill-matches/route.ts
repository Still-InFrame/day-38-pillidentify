import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mockPillReferences } from "@/lib/pillcheck/mock-data";
import { rankPillMatches } from "@/lib/pillcheck/matching";
import {
  feedbackRequestSchema,
  pillReferenceSchema,
  searchPillMatchesRequestSchema,
  searchPillMatchesResponseSchema,
} from "@/lib/pillcheck/schemas";
import type { PillReference } from "@/lib/pillcheck/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = searchPillMatchesRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search traits" }, { status: 400 });
  }

  const references = await loadReferences();
  const matches = rankPillMatches(references, parsed.data);
  await saveSearch(parsed.data, matches.length);

  const response = searchPillMatchesResponseSchema.parse({ matches });
  return NextResponse.json(response);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = feedbackRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    await supabase.from("pillidentify_pill_feedback").insert({
      search_id: parsed.data.search_id ?? null,
      pill_reference_id: parsed.data.pill_reference_id,
      feedback_value: parsed.data.feedback_value,
    });
  } catch {
    // Feedback persistence starts working as soon as the Supabase schema exists.
  }

  return NextResponse.json({ ok: true });
}

async function loadReferences(): Promise<PillReference[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("pillidentify_pill_references")
      .select("*")
      .limit(200);

    const parsed = pillReferenceSchema.array().safeParse(data ?? []);
    if (parsed.success && parsed.data.length > 0) {
      return parsed.data;
    }
  } catch {
    // The MVP remains usable before the Supabase schema is installed.
  }

  return mockPillReferences;
}

async function saveSearch(
  input: {
    imprint: string | null;
    shape: string | null;
    color: string | null;
    photo_quality: "poor" | "okay" | "good";
  },
  resultCount: number,
) {
  try {
    const supabase = await createClient();
    await supabase.from("pillidentify_pill_searches").insert({
      extracted_imprint: input.imprint,
      extracted_shape: input.shape,
      extracted_color: input.color,
      corrected_imprint: input.imprint,
      corrected_shape: input.shape,
      corrected_color: input.color,
      photo_quality: input.photo_quality,
      warnings: [],
      should_retake_photo: input.photo_quality === "poor",
      result_count: resultCount,
    });
  } catch {
    // Search persistence is best-effort under RLS and local offline development.
  }
}
