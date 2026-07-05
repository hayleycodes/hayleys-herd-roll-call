-- Adds a "pinned" flag so pigs can be pinned to the top of the home page grid.
alter table public.pigs
  add column if not exists pinned boolean not null default false;
