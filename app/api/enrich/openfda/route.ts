import { NextRequest, NextResponse } from "next/server";
import { fetchOpenFdaByName, fetchOpenFdaByNdc } from "@/lib/pillcheck/enrichment";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const ndc = request.nextUrl.searchParams.get("ndc");
  const name = request.nextUrl.searchParams.get("name");
  if (!ndc && !name) {
    return NextResponse.json({ error: "Missing ndc or name" }, { status: 400 });
  }

  const supabase = await createClient();
  const data = ndc
    ? await fetchOpenFdaByNdc(supabase, ndc)
    : await fetchOpenFdaByName(supabase, name!);

  return NextResponse.json({ provider: "openfda", ndc, name, data });
}
