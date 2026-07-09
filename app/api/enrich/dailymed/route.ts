import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ndc = request.nextUrl.searchParams.get("ndc");
  if (!ndc) {
    return NextResponse.json({ error: "Missing ndc" }, { status: 400 });
  }

  // TODO: Check pillidentify_api_cache first, then call:
  // https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?ndc={ndc}&pagesize=10&page=1
  return NextResponse.json({
    provider: "dailymed",
    ndc,
    status: "stub",
    data: null,
  });
}
