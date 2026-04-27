import { supabase } from '../../utils/supabase-client';
import type { SocialOrderItem } from './pigs.types';

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
