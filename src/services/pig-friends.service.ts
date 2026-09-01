import { supabase } from '../lib/supabase-client';
import { fetchAllRows } from './fetch-all';
import type { FriendCategory, FriendEvent } from './pigs.types';

export const getFriendEvents = async (): Promise<FriendEvent[]> => {
  // Feeds friendship computations — page past PostgREST's 1000-row cap.
  const rows = await fetchAllRows((from, to) =>
    supabase
      .from('friend_events')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to)
  );

  // bigint[] comes back as strings from PostgREST — coerce to numbers.
  return rows.map((r) => ({
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
