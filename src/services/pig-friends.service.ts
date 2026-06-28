import { supabase } from '../../utils/supabase-client';
import type { FriendCategory, FriendObservation } from './pigs.types';

const SELECT =
  '*, pig_a:pigs!friend_observations_pig_id_a_fkey(*), pig_b:pigs!friend_observations_pig_id_b_fkey(*)';

export const getFriendObservations = async (): Promise<FriendObservation[]> => {
  const { data, error } = await supabase
    .from('friend_observations')
    .select(SELECT)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FriendObservation[];
};

export const createFriendObservation = async (
  pigIdA: number,
  pigIdB: number,
  category: FriendCategory,
  notes?: string | null,
  observedAt?: string | null
) => {
  const { error } = await supabase.from('friend_observations').insert({
    pig_id_a: pigIdA,
    pig_id_b: pigIdB,
    category,
    notes: notes ?? null,
    observed_at: observedAt ?? null,
  });
  if (error) throw new Error(error.message);
};

export const deleteFriendObservation = async (id: number) => {
  const { error } = await supabase
    .from('friend_observations')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
};
