import { supabase } from '../lib/supabase-client';
import { fetchAllRows } from './fetch-all';
import type { SightingEvent } from './pigs.types';

const sightingEventsTable = () => supabase.from('sighting_events');

export const getSightingEvents = async (): Promise<SightingEvent[]> => {
  // Feeds friendship/proximity computations, so it must not truncate at
  // PostgREST's 1000-row cap — page through all rows.
  const rows = await fetchAllRows((from, to) =>
    sightingEventsTable()
      .select('*')
      .order('observed_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(from, to)
  );

  // bigint[] comes back as strings from PostgREST — coerce to numbers.
  return rows.map((r) => ({
    ...r,
    pig_ids: (r.pig_ids ?? []).map(Number),
  })) as SightingEvent[];
};

export const createSightingEvent = async (
  pigIds: number[],
  x: number,
  y: number,
  level = 0,
  behaviour?: string | null,
  observedAt?: string | null
): Promise<void> => {
  const { error } = await sightingEventsTable().insert({
    pig_ids: pigIds,
    x,
    y,
    level,
    behaviour: behaviour ?? null,
    observed_at: observedAt ?? null,
  });
  if (error) throw new Error(error.message);
};

export const deleteSightingEvent = async (id: number): Promise<void> => {
  const { error } = await sightingEventsTable().delete().eq('id', id);
  if (error) throw new Error(error.message);
};

// Record that a pig's whereabouts are now unknown (hides it from the map).
export const clearPigSighting = async (pigId: number): Promise<void> => {
  const { error } = await sightingEventsTable().insert({
    pig_ids: [pigId],
    x: 0,
    y: 0,
    level: 0,
    cleared: true,
  });
  if (error) throw new Error(error.message);
};

// Clear several pigs at once (e.g. resetting the whole map).
export const clearPigSightings = async (pigIds: number[]): Promise<void> => {
  if (!pigIds.length) return;
  const { error } = await sightingEventsTable().insert(
    pigIds.map((pigId) => ({
      pig_ids: [pigId],
      x: 0,
      y: 0,
      level: 0,
      cleared: true,
    }))
  );
  if (error) throw new Error(error.message);
};
