import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  // TODO: Check pillidentify_api_cache first, then call RxNav:
  // https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term={name}&maxEntries=5
  return NextResponse.json({
    provider: "rxnorm",
    name,
    status: "stub",
    data: null,
  });
}
