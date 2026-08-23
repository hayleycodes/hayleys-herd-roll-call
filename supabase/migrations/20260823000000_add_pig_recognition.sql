-- Pig recognition: a growing embedding gallery + a review queue.
--
-- The system starts with almost no reference photos and builds up over time:
-- the recognition worker (services/pig-recognizer) writes sighting_candidates,
-- and each human/auto confirmation promotes a crop's embedding into
-- pig_reference_embeddings. Matching is nearest-neighbour over these embeddings,
-- so "learning a new pig" is just an insert — no model retraining.
--
-- Embeddings are DINOv2-small CLS vectors (384-dim). Cosine distance.

create extension if not exists vector;

-- The growing reference gallery: labelled crops, one row per reference embedding.
create table if not exists public.pig_reference_embeddings (
  id          bigint generated always as identity primary key,
  pig_id      bigint not null references public.pigs (id) on delete cascade,
  embedding   vector(384) not null,
  -- how this reference was labelled:
  --   manual    = seeded from a hand-picked photo
  --   confirmed = a human confirmed a candidate in the app (trusted core)
  --   auto      = added automatically on a very-high-confidence match (provisional)
  source      text not null default 'confirmed'
                check (source in ('manual', 'confirmed', 'auto')),
  crop_path   text,            -- object path in the pig_photos bucket, if stored
  camera      text,            -- which camera the crop came from
  created_at  timestamptz not null default now()
);

create index if not exists pig_reference_embeddings_pig_id_idx
  on public.pig_reference_embeddings (pig_id);

-- Approximate-nearest-neighbour index for cosine similarity.
create index if not exists pig_reference_embeddings_embedding_idx
  on public.pig_reference_embeddings
  using hnsw (embedding vector_cosine_ops);

-- The review queue: one row per detected pig per worker run that wasn't
-- auto-confirmed. The embedding is pre-computed by the worker so the app never
-- needs an ML runtime — confirming just promotes this row into the gallery.
create table if not exists public.sighting_candidates (
  id           bigint generated always as identity primary key,
  crop_path    text not null,          -- object path of the saved crop
  embedding    vector(384) not null,
  best_pig_id  bigint references public.pigs (id) on delete set null,
  -- ranked guesses: [{ "pig_id": 12, "similarity": 0.81 }, ...]
  top_guesses  jsonb,
  confidence   double precision,       -- similarity of the top guess
  status       text not null default 'pending'
                 check (status in ('pending', 'confirmed', 'rejected', 'auto')),
  camera       text,
  observed_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists sighting_candidates_status_idx
  on public.sighting_candidates (status);

-- Nearest-neighbour lookup for the worker. Takes the query embedding as text
-- (e.g. '[0.1,0.2,...]') to sidestep PostgREST vector-casting quirks, and
-- returns the closest reference rows by cosine similarity (1 - cosine distance).
create or replace function public.match_pig_references(
  query_embedding text,
  match_count int default 20
)
returns table (pig_id bigint, similarity double precision, source text)
language sql stable as $$
  select
    pig_id,
    1 - (embedding <=> query_embedding::vector(384)) as similarity,
    source
  from public.pig_reference_embeddings
  order by embedding <=> query_embedding::vector(384)
  limit match_count;
$$;

-- Private family app: signed-in users have full access; the worker uses the
-- service-role key (which bypasses RLS). Adjust to match the policies on your
-- other tables if they differ.
alter table public.pig_reference_embeddings enable row level security;
alter table public.sighting_candidates      enable row level security;

create policy "authenticated full access to reference embeddings"
  on public.pig_reference_embeddings for all
  to authenticated using (true) with check (true);

create policy "authenticated full access to sighting candidates"
  on public.sighting_candidates for all
  to authenticated using (true) with check (true);
