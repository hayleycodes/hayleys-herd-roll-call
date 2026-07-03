import { supabase } from '../../utils/supabase-client';
import type { SocialOrderItem } from './pigs.types';
import { getAllPigs } from './pigs.service';
import { computeGraphRanking } from './social-order-graph';

export const getSocialOrder = async (): Promise<SocialOrderItem[]> => {
  const { data, error } = await supabase
    .from('social_order')
    .select(
      '*, dominant_pig:pigs!social_order_dominant_pig_id_fkey(*), submissive_pig:pigs!social_order_submissive_pig_id_fkey(*)'
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data ?? [];
};

export const getSocialOrderForPig = async (
  pigId: number
): Promise<SocialOrderItem[]> => {
  const { data, error } = await supabase
    .from('social_order')
    .select(
      '*, dominant_pig:pigs!social_order_dominant_pig_id_fkey(*), submissive_pig:pigs!social_order_submissive_pig_id_fkey(*)'
    )
    .or(`submissive_pig_id.eq.${pigId},dominant_pig_id.eq.${pigId}`);

  if (error) throw new Error(error.message);

  return data ?? [];
};

export const createSocialOrderItem = async (
  dominantPigId: number,
  submissivePigId: number,
  notes?: string | null,
  observedAt?: string | null
) => {
  const { error } = await supabase.from('social_order').insert({
    dominant_pig_id: dominantPigId,
    submissive_pig_id: submissivePigId,
    notes: notes ?? null,
    observed_at: observedAt ?? null,
  });
  if (error) throw new Error(error.message);
};

export const deleteSocialOrderItem = async (id: number) => {
  const { error } = await supabase.from('social_order').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

/** Ids of the herd's top-ranked pig(s) — the graph ranking's rank-1 group(s). */
export const getTopPigIds = async (): Promise<Set<number>> => {
  const [items, pigs] = await Promise.all([getSocialOrder(), getAllPigs()]);
  const groups = computeGraphRanking(pigs, items);
  const ids = new Set<number>();
  for (const group of groups) {
    if (group.rank === 1 && group.metrics.descendants > 0) {
      ids.add(group.pig.id);
    }
  }
  return ids;
};
