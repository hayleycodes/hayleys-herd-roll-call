import { supabase } from '../lib/supabase-client';
import { fetchAllRows } from './fetch-all';
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
  // Page past PostgREST's 1000-row cap so the full history is returned.
  return fetchAllRows<WeightRecord>((from, to) =>
    supabase
      .from('weights')
      .select('*')
      .order('recorded_at', { ascending: false })
      .range(from, to)
  );
};

export const getLatestWeights = async (): Promise<WeightRecord[]> => {
  // Must see every row, or a pig whose latest weight sits past the 1000-row cap
  // would be dropped from the map entirely.
  const rows = await fetchAllRows<WeightRecord>((from, to) =>
    supabase
      .from('weights')
      .select('*')
      .order('recorded_at', { ascending: false })
      .range(from, to)
  );

  const latest = new Map<number, WeightRecord>();
  for (const record of rows) {
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
