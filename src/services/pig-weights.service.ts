import { supabase } from '../../utils/supabase-client';
import type { WeightRecord } from './pigs.types';

export const getPigWeights = async (pigId: number): Promise<WeightRecord[]> => {
  const { data, error } = await supabase
    .from('weights')
    .select('*')
    .eq('pig_id', pigId)
    .order('recorded_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data as WeightRecord[]) ?? [];
};

export const getAllWeights = async (): Promise<WeightRecord[]> => {
  const { data, error } = await supabase
    .from('weights')
    .select('*')
    .order('recorded_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data as WeightRecord[]) ?? [];
};

export const getLatestWeights = async (): Promise<WeightRecord[]> => {
  const { data, error } = await supabase
    .from('weights')
    .select('*')
    .order('recorded_at', { ascending: false });

  if (error) throw new Error(error.message);

  const latest = new Map<number, WeightRecord>();
  for (const record of (data as WeightRecord[]) ?? []) {
    if (!latest.has(record.pig_id)) {
      latest.set(record.pig_id, record);
    }
  }

  return Array.from(latest.values());
};

export const createPigWeight = async (pigId: number, weightGrams: number) => {
  const { error } = await supabase
    .from('weights')
    .insert({ pig_id: pigId, weight_grams: weightGrams });

  if (error) throw new Error(error.message);
};
