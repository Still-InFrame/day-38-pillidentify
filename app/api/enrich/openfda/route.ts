import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ndc = request.nextUrl.searchParams.get("ndc");
  if (!ndc) {
    return NextResponse.json({ error: "Missing ndc" }, { status: 400 });
  }

  // TODO: Check pillidentify_api_cache first, then call:
  // https://api.fda.gov/drug/ndc.json?search=product_ndc:"{ndc}"&limit=1
  // Include process.env.OPENFDA_API_KEY as api_key when configured.
  return NextResponse.json({
    provider: "openfda",
    ndc,
    status: "stub",
    data: null,
  });
}
