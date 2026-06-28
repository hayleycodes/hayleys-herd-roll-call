import { supabase } from '../../utils/supabase-client';
import type { PigSighting } from './pigs.types';

export const getSightings = async (): Promise<PigSighting[]> => {
  const { data, error } = await supabase
    .from('pig_sightings')
    .select('*')
    .order('observed_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
};

export const getSightingsForPig = async (
  pigId: number
): Promise<PigSighting[]> => {
  const { data, error } = await supabase
    .from('pig_sightings')
    .select('*')
    .eq('pig_id', pigId)
    .order('observed_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
};

export const createSighting = async (
  pigId: number,
  x: number,
  y: number,
  level = 0,
  observedAt?: string | null
): Promise<void> => {
  const { error } = await supabase.from('pig_sightings').insert({
    pig_id: pigId,
    x,
    y,
    level,
    observed_at: observedAt ?? null,
  });
  if (error) throw new Error(error.message);
};

export const deleteSighting = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('pig_sightings')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
};
