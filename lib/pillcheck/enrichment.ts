import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeImprintForSearch } from "./matching";
import type { PillReference } from "./types";

type Json = Record<string, unknown>;

type CorrectionInput = {
  medication_name: string;
  imprint: string | null;
  front_imprint?: string | null;
  back_imprint?: string | null;
  shape: string | null;
  color: string | null;
};

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function cachedJson<T>(
  supabase: SupabaseClient,
  provider: string,
  cacheKey: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const { data } = await supabase
    .from("pillidentify_api_cache")
    .select("response_json")
    .eq("provider", provider)
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (data?.response_json) {
    return data.response_json as T;
  }

  const responseJson = await fetcher();

  await supabase.from("pillidentify_api_cache").insert({
    provider,
    cache_key: cacheKey,
    response_json: responseJson as Json,
    expires_at: new Date(Date.now() + ONE_WEEK_MS).toISOString(),
  });

  return responseJson;
}

export async function fetchRxNormByName(
  supabase: SupabaseClient,
  name: string,
) {
  const term = name.trim();
  const approximate = await cachedJson<RxNormApproximateResponse>(
    supabase,
    "rxnorm",
    `approximate:${term.toLowerCase()}`,
    () =>
      fetchJson(
        `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=5`,
      ),
  );
  const rxcui = approximate.approximateGroup?.candidate?.[0]?.rxcui ?? null;

  if (!rxcui) {
    return { rxcui: null, properties: null };
  }

  const properties = await cachedJson<RxNormPropertiesResponse>(
    supabase,
    "rxnorm",
    `properties:${rxcui}`,
    () =>
      fetchJson(
        `https://rxnav.nlm.nih.gov/REST/rxcui/${encodeURIComponent(rxcui)}/allProperties.json?prop=all`,
      ),
  );

  return { rxcui, properties };
}

export async function fetchDailyMedByName(
  supabase: SupabaseClient,
  name: string,
) {
  const term = name.trim();

  return cachedJson<DailyMedSplsResponse>(
    supabase,
    "dailymed",
    `drug_name:${term.toLowerCase()}`,
    () =>
      fetchJson(
        `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=${encodeURIComponent(term)}&pagesize=5&page=1`,
      ),
  );
}

export async function fetchDailyMedByNdc(
  supabase: SupabaseClient,
  ndc: string,
) {
  return cachedJson<DailyMedSplsResponse>(
    supabase,
    "dailymed",
    `ndc:${ndc}`,
    () =>
      fetchJson(
        `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?ndc=${encodeURIComponent(ndc)}&pagesize=5&page=1`,
      ),
  );
}

export async function fetchOpenFdaByName(
  supabase: SupabaseClient,
  name: string,
) {
  const term = name.trim();
  const apiKey = process.env.OPENFDA_API_KEY;
  const apiKeySuffix = apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : "";

  return cachedJson<OpenFdaNdcResponse>(
    supabase,
    "openfda",
    `name:${term.toLowerCase()}`,
    async () => {
      const genericUrl = `https://api.fda.gov/drug/ndc.json?search=generic_name:"${encodeURIComponent(term)}"&limit=5${apiKeySuffix}`;
      const brandUrl = `https://api.fda.gov/drug/ndc.json?search=brand_name:"${encodeURIComponent(term)}"&limit=5${apiKeySuffix}`;

      return fetchJson<OpenFdaNdcResponse>(genericUrl).catch(() =>
        fetchJson<OpenFdaNdcResponse>(brandUrl),
      );
    },
  ).catch(() => ({ results: [] }));
}

export async function fetchOpenFdaByNdc(
  supabase: SupabaseClient,
  ndc: string,
) {
  const apiKey = process.env.OPENFDA_API_KEY;
  const apiKeySuffix = apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : "";

  return cachedJson<OpenFdaNdcResponse>(
    supabase,
    "openfda",
    `ndc:${ndc}`,
    () =>
      fetchJson(
        `https://api.fda.gov/drug/ndc.json?search=product_ndc:"${encodeURIComponent(ndc)}"&limit=5${apiKeySuffix}`,
      ),
  ).catch(() => ({ results: [] }));
}

export async function buildReferenceFromCorrection(
  supabase: SupabaseClient,
  input: CorrectionInput,
): Promise<PillReference> {
  const [rxNorm, dailyMed, openFda] = await Promise.all([
    fetchRxNormByName(supabase, input.medication_name),
    fetchDailyMedByName(supabase, input.medication_name),
    fetchOpenFdaByName(supabase, input.medication_name),
  ]);
  const openFdaResult = openFda.results?.[0];
  const spl = dailyMed.data?.[0];
  const medicationName =
    openFdaResult?.generic_name ??
    openFdaResult?.brand_name ??
    input.medication_name.trim();
  const combinedImprint =
    [input.front_imprint, input.back_imprint].filter(Boolean).join(" / ") ||
    input.imprint;

  return {
    id: crypto.randomUUID(),
    medication_name: medicationName,
    generic_name: openFdaResult?.generic_name ?? input.medication_name.trim(),
    brand_name: openFdaResult?.brand_name ?? null,
    strength: openFdaResult?.active_ingredients?.[0]
      ? [
          openFdaResult.active_ingredients[0].name,
          openFdaResult.active_ingredients[0].strength,
        ]
          .filter(Boolean)
          .join(" ")
      : null,
    manufacturer: openFdaResult?.labeler_name ?? null,
    imprint: combinedImprint,
    normalized_imprint: normalizeImprintForSearch(combinedImprint),
    shape: input.shape,
    color: input.color,
    dosage_form: openFdaResult?.dosage_form ?? "tablet",
    route: openFdaResult?.route?.[0] ?? "oral",
    ndc: openFdaResult?.product_ndc ?? null,
    rxcui: rxNorm.rxcui,
    dailymed_setid: spl?.setid ?? null,
    image_url: null,
    source: "user_correction_enriched",
    source_updated_at: new Date().toISOString(),
  };
}

export async function saveReferenceBestEffort(
  supabase: SupabaseClient,
  reference: PillReference,
) {
  await supabase.from("pillidentify_pill_references").insert({
    medication_name: reference.medication_name,
    generic_name: reference.generic_name,
    brand_name: reference.brand_name,
    strength: reference.strength,
    manufacturer: reference.manufacturer,
    imprint: reference.imprint,
    normalized_imprint: reference.normalized_imprint,
    shape: reference.shape,
    color: reference.color,
    dosage_form: reference.dosage_form,
    route: reference.route,
    ndc: reference.ndc,
    rxcui: reference.rxcui,
    dailymed_setid: reference.dailymed_setid,
    image_url: reference.image_url,
    source: reference.source,
    source_updated_at: reference.source_updated_at,
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`External API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

type RxNormApproximateResponse = {
  approximateGroup?: {
    candidate?: Array<{ rxcui?: string }>;
  };
};

type RxNormPropertiesResponse = {
  propConceptGroup?: {
    propConcept?: Array<{ propName?: string; propValue?: string }>;
  };
};

type DailyMedSplsResponse = {
  data?: Array<{
    setid?: string;
    title?: string;
    spl_version?: string;
    published_date?: string;
  }>;
};

type OpenFdaNdcResponse = {
  results?: Array<{
    product_ndc?: string;
    generic_name?: string;
    brand_name?: string;
    labeler_name?: string;
    dosage_form?: string;
    route?: string[];
    active_ingredients?: Array<{ name?: string; strength?: string }>;
  }>;
};
