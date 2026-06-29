import { supabase } from '../../utils/supabase-client';
import type { FriendCategory, FriendEvent } from './pigs.types';

export const getFriendEvents = async (): Promise<FriendEvent[]> => {
  const { data, error } = await supabase
    .from('friend_events')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  // bigint[] comes back as strings from PostgREST — coerce to numbers.
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    pig_ids: (r.pig_ids ?? []).map(Number),
  })) as FriendEvent[];
};

export const createFriendEvent = async (
  category: FriendCategory,
  pigIds: number[],
  notes?: string | null,
  observedAt?: string | null
) => {
  const { error } = await supabase.from('friend_events').insert({
    category,
    pig_ids: pigIds,
    notes: notes ?? null,
    observed_at: observedAt ?? null,
  });
  if (error) throw new Error(error.message);
};

export const deleteFriendEvent = async (id: number) => {
  const { error } = await supabase
    .from('friend_events')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
};
