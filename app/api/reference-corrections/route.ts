import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildReferenceFromCorrection,
  saveReferenceBestEffort,
} from "@/lib/pillcheck/enrichment";
import { rankPillMatches } from "@/lib/pillcheck/matching";
import {
  referenceCorrectionRequestSchema,
  searchPillMatchesResponseSchema,
} from "@/lib/pillcheck/schemas";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = referenceCorrectionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid correction" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const reference = await buildReferenceFromCorrection(supabase, parsed.data);

    let saved = true;
    try {
      await saveReferenceBestEffort(supabase, reference);
    } catch {
      saved = false;
    }

    const matches = rankPillMatches([reference], parsed.data);
    const response = searchPillMatchesResponseSchema.parse({ matches });

    return NextResponse.json({
      ...response,
      reference_saved: saved,
      source: reference.source,
    });
  } catch (error) {
    console.error("Reference correction enrichment failed", error);
    return NextResponse.json(
      { error: "Could not enrich that medication name." },
      { status: 502 },
    );
  }
}
