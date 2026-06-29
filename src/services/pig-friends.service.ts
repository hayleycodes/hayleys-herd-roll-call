import { supabase } from '../../utils/supabase-client';
import type { FriendCategory, FriendEvent } from './pigs.types';

// Cast to any since this table isn't in the generated types yet
const friendEventsTable = () => (supabase as any).from('friend_events');

export const getFriendEvents = async (): Promise<FriendEvent[]> => {
  const { data, error } = await friendEventsTable()
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as FriendEvent[];
};

export const createFriendEvent = async (
  category: FriendCategory,
  pigIds: number[],
  notes?: string | null,
  observedAt?: string | null
) => {
  const { error } = await friendEventsTable().insert({
    category,
    pig_ids: pigIds,
    notes: notes ?? null,
    observed_at: observedAt ?? null,
  });
  if (error) throw new Error(error.message);
};

export const deleteFriendEvent = async (id: number) => {
  const { error } = await friendEventsTable().delete().eq('id', id);
  if (error) throw new Error(error.message);
};
