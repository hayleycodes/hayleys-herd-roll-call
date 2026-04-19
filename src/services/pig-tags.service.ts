import { supabase } from '../../utils/supabase-client';

export type TagDefinition = { tag: string; label: string };

// Cast to any since these aren't in the generated types yet
const pigTagsTable = () => (supabase as any).from('pig_tags');
const tagDefinitionsTable = () => (supabase as any).from('tag_definitions');

export const getTagDefinitions = async (): Promise<TagDefinition[]> => {
  const { data, error } = await tagDefinitionsTable()
    .select('tag, label')
    .order('label');

  if (error) throw new Error(error.message);
  return data ?? [];
};

export const createTagDefinition = async (tag: string, label: string) => {
  const { error } = await tagDefinitionsTable().insert({ tag, label });
  if (error) throw new Error(error.message);
};

export const getPigTags = async (pigId: number): Promise<string[]> => {
  const { data, error } = await pigTagsTable()
    .select('tag')
    .eq('pig_id', pigId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => r.tag);
};

export const addPigTag = async (pigId: number, tag: string) => {
  const { error } = await pigTagsTable().insert({ pig_id: pigId, tag });

  if (error) throw new Error(error.message);
};

export const removePigTag = async (pigId: number, tag: string) => {
  const { error } = await pigTagsTable()
    .delete()
    .eq('pig_id', pigId)
    .eq('tag', tag);

  if (error) throw new Error(error.message);
};

export const getAllPigTags = async (): Promise<Map<number, string[]>> => {
  const { data, error } = await pigTagsTable().select('pig_id, tag');

  if (error) throw new Error(error.message);

  const map = new Map<number, string[]>();
  for (const row of (data ?? []) as any[]) {
    const existing = map.get(row.pig_id) ?? [];
    existing.push(row.tag);
    map.set(row.pig_id, existing);
  }
  return map;
};
