-- Confirming a candidate in the app promotes its (already-computed) embedding
-- into the gallery, marks the pig as sighted, and closes the candidate -- all in
-- one atomic step, server-side, so the 384-dim vector never travels to the
-- browser. Runs after 20260823_add_pig_recognition.sql (sorts after it).
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

  update public.pigs set last_sighted = now() where id = pig_id;

  update public.sighting_candidates
    set status = 'confirmed', best_pig_id = pig_id
    where id = candidate_id;
end;
$$;
