import { supabase } from '../../utils/supabase-client';
import type { PigSighting } from './pigs.types';

// Cast to any since this table isn't in the generated types yet
const sightingsTable = () => (supabase as any).from('pig_sightings');

export const getSightings = async (): Promise<PigSighting[]> => {
  const { data, error } = await sightingsTable()
    .select('*')
    .order('observed_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PigSighting[];
};

export const getSightingsForPig = async (
  pigId: number
): Promise<PigSighting[]> => {
  const { data, error } = await sightingsTable()
    .select('*')
    .eq('pig_id', pigId)
    .order('observed_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PigSighting[];
};

export const createSighting = async (
  pigId: number,
  x: number,
  y: number,
  level = 0,
  observedAt?: string | null
): Promise<void> => {
  const { error } = await sightingsTable().insert({
    pig_id: pigId,
    x,
    y,
    level,
    observed_at: observedAt ?? null,
  });
  if (error) throw new Error(error.message);
};

export const deleteSighting = async (id: number): Promise<void> => {
  const { error } = await sightingsTable().delete().eq('id', id);
  if (error) throw new Error(error.message);
};
