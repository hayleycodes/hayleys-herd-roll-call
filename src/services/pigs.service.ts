import { supabase } from '../lib/supabase-client';
import type { Pig } from './pigs.types';

export const getAllPigs = async (): Promise<Pig[]> => {
  const { data, error } = await supabase
    .from('pigs')
    .select('*')
    .is('passed_away', null)
    .order('last_sighted', { ascending: true, nullsFirst: true });

  if (error) throw new Error(error.message);

  return data ?? [];
};

export const getAllPigsIncludingPassed = async (): Promise<Pig[]> => {
  const { data, error } = await supabase
    .from('pigs')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);

  return data ?? [];
};

export const getPig = async (id: number): Promise<Pig> => {
  const { data, error } = await supabase
    .from('pigs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Pig not found');

  return data;
};

export const updatePigNameAndDescription = async (
  id: number,
  name: string,
  description: string
): Promise<Pig> => {
  const { data, error } = await supabase
    .from('pigs')
    .update({ name, description })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Pig not found');

  return data;
};

export const createPigSighting = async (id: number) => {
  const { data, error } = await supabase
    .from('pigs')
    .update({
      last_sighted: new Date().toISOString(),
    })
    .eq('id', id)
    .select();

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      'Update failed — check that an UPDATE policy exists for pigs in Supabase'
    );
  }

  return data;
};

export const setPigLastSighted = async (
  id: number,
  lastSighted: string | null
) => {
  const { data, error } = await supabase
    .from('pigs')
    .update({ last_sighted: lastSighted })
    .eq('id', id)
    .select();

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      'Update failed — check that an UPDATE policy exists for pigs in Supabase'
    );
  }

  return data;
};

export const setPigPinned = async (id: number, pinned: boolean) => {
  const { data, error } = await supabase
    .from('pigs')
    .update({ pinned })
    .eq('id', id)
    .select();

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      'Update failed — check that an UPDATE policy exists for pigs in Supabase'
    );
  }

  return data;
};

export const savePigImages = async (pigId: number, imagePaths: string[]) => {
  const { data, error } = await supabase
    .from('pigs')
    .update({ image_paths: imagePaths })
    .eq('id', pigId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data;
};

export const getPassedPigs = async (): Promise<Pig[]> => {
  const { data, error } = await supabase
    .from('pigs')
    .select('*')
    .not('passed_away', 'is', null);

  if (error) throw new Error(error.message);

  return data ?? [];
};
