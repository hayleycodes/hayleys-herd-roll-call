import { supabase } from '../../utils/supabase-client';
import type { MoodRecord } from './pigs.types';

// Cast to any since pig_moods isn't in the generated types yet
const pigMoodsTable = () => (supabase as any).from('pig_moods');

export const MOOD_OPTIONS = [
  { mood: 'sleepy', label: 'Sleepy 😴' },
  { mood: 'hungry', label: 'Hungry 🍽️' },
  { mood: 'chatty', label: 'Chatty 💬' },
  { mood: 'angry', label: 'Angry 😤' },
  { mood: 'hyper', label: 'Hyper 🏃' },
  { mood: 'hiding', label: 'Hiding 🫣' },
  { mood: 'relaxed', label: 'Relaxed 😌' },
  { mood: 'playful', label: 'Playful 🎉' },
  { mood: 'friendly', label: 'Friendly 👋' },
];

export const getMoodLabel = (mood: string): string => {
  return MOOD_OPTIONS.find((m) => m.mood === mood)?.label ?? mood;
};

export const getMoodEmoji = (mood: string): string => {
  const option = MOOD_OPTIONS.find((m) => m.mood === mood);
  if (!option) return '🧠';
  // Emoji is always the last character(s) after the space
  const parts = option.label.split(' ');
  return parts[parts.length - 1];
};

export const getPigMoods = async (pigId: number): Promise<MoodRecord[]> => {
  const { data, error } = await pigMoodsTable()
    .select('*')
    .eq('pig_id', pigId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
};

export const addPigMood = async (pigId: number, mood: string): Promise<void> => {
  const { error } = await pigMoodsTable().insert({ pig_id: pigId, mood });
  if (error) throw new Error(error.message);
};

export const deletePigMood = async (id: number): Promise<void> => {
  const { error } = await pigMoodsTable().delete().eq('id', id);
  if (error) throw new Error(error.message);
};
