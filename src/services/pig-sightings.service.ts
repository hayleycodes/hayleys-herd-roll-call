import { supabase } from '../../utils/supabase-client';
import type { SightingEvent } from './pigs.types';

// Cast to any since this table isn't in the generated types yet
const sightingEventsTable = () => (supabase as any).from('sighting_events');

export const getSightingEvents = async (): Promise<SightingEvent[]> => {
  const { data, error } = await sightingEventsTable()
    .select('*')
    .order('observed_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  // bigint[] comes back as strings from PostgREST — coerce to numbers.
  return ((data ?? []) as any[]).map((r) => ({
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
