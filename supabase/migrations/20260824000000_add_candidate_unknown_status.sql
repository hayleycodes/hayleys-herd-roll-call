-- Add an 'unknown' status for candidates a human looked at but couldn't
-- identify (the crop is too ambiguous to tell). Distinct from 'rejected'
-- (not a pig / bad crop) so these can be revisited or reported separately.
-- Like 'rejected', it drops the candidate out of the pending review queue.

alter table public.sighting_candidates
  drop constraint if exists sighting_candidates_status_check;

alter table public.sighting_candidates
  add constraint sighting_candidates_status_check
  check (status in ('pending', 'confirmed', 'rejected', 'auto', 'unknown'));
