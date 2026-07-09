-- PillCheck AI schema for the shared 100-day Supabase sandbox.
-- Table names are prefixed with pillidentify_ to keep apps isolated.

create extension if not exists pgcrypto;

create table if not exists public.pillidentify_pill_references (
  id uuid primary key default gen_random_uuid(),
  medication_name text not null,
  generic_name text,
  brand_name text,
  strength text,
  manufacturer text,
  imprint text,
  normalized_imprint text,
  shape text,
  color text,
  dosage_form text,
  route text,
  ndc text,
  rxcui text,
  dailymed_setid text,
  image_url text,
  source text not null default 'manual',
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pillidentify_pill_searches (
  id uuid primary key default gen_random_uuid(),
  image_url text,
  extracted_imprint text,
  extracted_shape text,
  extracted_color text,
  corrected_imprint text,
  corrected_shape text,
  corrected_color text,
  photo_quality text not null,
  warnings jsonb not null default '[]'::jsonb,
  should_retake_photo boolean not null default false,
  result_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pillidentify_pill_feedback (
  id uuid primary key default gen_random_uuid(),
  search_id uuid references public.pillidentify_pill_searches(id) on delete set null,
  pill_reference_id uuid references public.pillidentify_pill_references(id) on delete set null,
  feedback_value text not null check (feedback_value in ('looks_correct', 'looks_wrong', 'not_sure')),
  created_at timestamptz not null default now()
);

create table if not exists public.pillidentify_api_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  cache_key text not null unique,
  response_json jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists pillidentify_pill_references_imprint_idx
  on public.pillidentify_pill_references (normalized_imprint);

create index if not exists pillidentify_pill_references_traits_idx
  on public.pillidentify_pill_references (shape, color);

create index if not exists pillidentify_api_cache_provider_key_idx
  on public.pillidentify_api_cache (provider, cache_key);

alter table public.pillidentify_pill_references enable row level security;
alter table public.pillidentify_pill_searches enable row level security;
alter table public.pillidentify_pill_feedback enable row level security;
alter table public.pillidentify_api_cache enable row level security;

drop policy if exists "pill references are readable" on public.pillidentify_pill_references;
create policy "pill references are readable"
  on public.pillidentify_pill_references for select
  to anon, authenticated
  using (true);

drop policy if exists "anonymous searches can be created" on public.pillidentify_pill_searches;
create policy "anonymous searches can be created"
  on public.pillidentify_pill_searches for insert
  to anon, authenticated
  with check (true);

drop policy if exists "anonymous feedback can be created" on public.pillidentify_pill_feedback;
create policy "anonymous feedback can be created"
  on public.pillidentify_pill_feedback for insert
  to anon, authenticated
  with check (true);

drop policy if exists "api cache is readable" on public.pillidentify_api_cache;
create policy "api cache is readable"
  on public.pillidentify_api_cache for select
  to anon, authenticated
  using (expires_at > now());

-- Seed data is intentionally small and mock-friendly. Add verified reference data
-- later from an official ingestion workflow before treating matches as useful.
insert into public.pillidentify_pill_references
  (id, medication_name, generic_name, brand_name, strength, manufacturer, imprint, normalized_imprint, shape, color, dosage_form, route, ndc, rxcui, dailymed_setid, source)
values
  ('11111111-1111-4111-8111-111111111111', 'Ibuprofen 200 mg tablet', 'ibuprofen', 'Advil', '200 mg', 'Haleon US Holdings LLC', 'I-2', 'I2', 'round', 'brown', 'tablet', 'oral', '0573-0149', '310965', null, 'mock_seed'),
  ('22222222-2222-4222-8222-222222222222', 'Acetaminophen 500 mg tablet', 'acetaminophen', 'Tylenol', '500 mg', 'McNeil Consumer Healthcare', 'TYLENOL 500', 'TYLENOL500', 'capsule', 'white', 'tablet', 'oral', '50580-488', '198440', null, 'mock_seed'),
  ('33333333-3333-4333-8333-333333333333', 'Naproxen sodium 220 mg tablet', 'naproxen sodium', 'Aleve', '220 mg', 'Bayer HealthCare LLC', 'ALEVE', 'ALEVE', 'oval', 'blue', 'tablet', 'oral', '25866-429', '849574', null, 'mock_seed'),
  ('44444444-4444-4444-8444-444444444444', 'Loratadine 10 mg tablet', 'loratadine', 'Claritin', '10 mg', 'Bayer HealthCare LLC', 'CLARITIN 10', 'CLARITIN10', 'round', 'white', 'tablet', 'oral', '11523-7202', '311372', null, 'mock_seed'),
  ('55555555-5555-4555-8555-555555555555', 'Diphenhydramine HCl 25 mg capsule', 'diphenhydramine hydrochloride', 'Benadryl', '25 mg', 'Johnson & Johnson Consumer Inc.', 'BENADRYL', 'BENADRYL', 'capsule', 'pink', 'capsule', 'oral', '50580-226', '1049630', null, 'mock_seed')
on conflict do nothing;
