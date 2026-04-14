import { supabase } from '../../utils/supabase-client';

// Cast to any since pig_tags isn't in the generated types yet
const pigTagsTable = () => (supabase as any).from('pig_tags');

export const TAG_OPTIONS = [
  { tag: 'shy', label: 'Shy 🫣' },
  { tag: 'loud', label: 'Loud 📢' },
  { tag: 'food-obsessed', label: 'Food Obsessed 🥬' },
  { tag: 'popcorner', label: 'Popcorner 🍿' },
  { tag: 'zoomy', label: 'Zoomy 💨' },
  { tag: 'bossy', label: 'Bossy 👑' },
  { tag: 'sleepy', label: 'Sleepy 😴' },
  { tag: 'chatty', label: 'Chatty 💬' },
  { tag: 'dramatic', label: 'Dramatic 🎭' },
  { tag: 'adventurous', label: 'Adventurous 🗺️' },
  { tag: 'friendly', label: 'Friendly 🥰' },
  { tag: 'bully', label: 'Bully 😤' },
  { tag: 'timid', label: 'Timid 🥺' },
  { tag: 'confident', label: 'Confident 😎' },
  { tag: 'brave', label: 'Brave 🦁' },
  { tag: 'troublemaker', label: 'Troublemaker 😏' },
  { tag: 'scaredy-pig', label: 'Scaredy Pig 😱' },
  { tag: 'dumb', label: 'Dumb 🧠' },
  { tag: 'feral', label: 'Feral 👿' },
  { tag: 'sick', label: 'Sick 🤒' },
];

export const getTagLabel = (tag: string): string => {
  return TAG_OPTIONS.find((t) => t.tag === tag)?.label ?? tag;
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
