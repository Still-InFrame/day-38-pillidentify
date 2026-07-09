import { NextRequest, NextResponse } from "next/server";
import { fetchRxNormByName } from "@/lib/pillcheck/enrichment";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  const supabase = await createClient();
  const data = await fetchRxNormByName(supabase, name);

  return NextResponse.json({
    provider: "rxnorm",
    name,
    data,
  });
}
