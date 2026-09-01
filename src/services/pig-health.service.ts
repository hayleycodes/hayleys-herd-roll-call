import { supabase } from '../lib/supabase-client';
import { markTaskDone } from './recurring-tasks.service';
import type { HealthRecord } from './pigs.types';

export type HealthLogEntry = HealthRecord & {
  pigs: { name: string; image_paths: string[] } | null;
};

export const getAllHealth = async (
  offset: number,
  limit: number
): Promise<HealthLogEntry[]> => {
  const { data, error } = await supabase
    .from('health_data')
    .select('*, pigs(name, image_paths)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  return (data as HealthLogEntry[]) ?? [];
};

export const getPigHealth = async (pigId: number) => {
  const { data, error } = await supabase
    .from('health_data')
    .select('*')
    .eq('pig_id', pigId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data ?? [];
};

export const createPigHealth = async (
  healthRecord: Omit<HealthRecord, 'id' | 'created_at'>
) => {
  const { data, error } = await supabase
    .from('health_data')
    .insert({
      pig_id: healthRecord.pig_id,
      notes: healthRecord.notes ?? null,
      nail_clip: healthRecord.nail_clip ?? false,
      haircut: healthRecord.haircut ?? false,
      parasite_treatment: healthRecord.parasite_treatment ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Sync recurring task last_completed_at. The health record is already saved,
  // so a task-sync failure must NOT propagate — otherwise the caller retries
  // and creates a duplicate record. Run them in parallel and swallow failures
  // (logged), leaving the affected task to show as overdue until next sync.
  const syncs: Promise<void>[] = [];
  if (healthRecord.nail_clip)
    syncs.push(markTaskDone(healthRecord.pig_id, 'nail_clip'));
  if (healthRecord.haircut)
    syncs.push(markTaskDone(healthRecord.pig_id, 'haircut'));
  if (healthRecord.parasite_treatment)
    syncs.push(markTaskDone(healthRecord.pig_id, 'parasite_treatment'));

  const results = await Promise.allSettled(syncs);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Failed to sync recurring task after health record:', result.reason);
    }
  }

  return data;
};

export const updatePigHealth = async (
  id: number,
  updates: {
    notes?: string | null;
    nail_clip?: boolean;
    haircut?: boolean;
    parasite_treatment?: boolean;
  }
) => {
  const { data, error } = await supabase
    .from('health_data')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      'Update failed — check that an UPDATE policy exists for health_data in Supabase'
    );
  }
};

export const deletePigHealth = async (id: number) => {
  const { error } = await supabase.from('health_data').delete().eq('id', id);

  if (error) throw new Error(error.message);
};
