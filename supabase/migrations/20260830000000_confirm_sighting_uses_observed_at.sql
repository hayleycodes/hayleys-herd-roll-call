-- last_sighted should reflect when the photo was actually taken (cand.observed_at),
-- not when a human got around to confirming it. And only move it forward: never let
-- an older confirmation stomp a more recent sighting already on the pig.
create or replace function public.confirm_sighting_candidate(
  candidate_id bigint,
  pig_id bigint
)
returns void
language plpgsql
as $$
declare
  cand public.sighting_candidates%rowtype;
begin
  select * into cand from public.sighting_candidates where id = candidate_id;
  if not found then
    raise exception 'sighting candidate % not found', candidate_id;
  end if;

  insert into public.pig_reference_embeddings (pig_id, embedding, source, crop_path, camera)
  values (pig_id, cand.embedding, 'confirmed', cand.crop_path, cand.camera);

  update public.pigs
    set last_sighted = cand.observed_at
    where id = pig_id
      and (last_sighted is null or cand.observed_at > last_sighted);

  update public.sighting_candidates
    set status = 'confirmed', best_pig_id = pig_id
    where id = candidate_id;
end;
$$;
