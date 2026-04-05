import { supabase } from "../../utils/supabase-client";

export interface Pig {
  id: number;
  name: string;
  description: string | null,
  created_at?: string;
}

export const getAllPigs = async (): Promise<Pig[]> => {
  const { data, error } = await supabase
    .from("pigs")
    .select("*");

    console.log(data)

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};

export const getPig = async (id: number): Promise<Pig> => {
  const { data, error } = await supabase
    .from("pigs")
    .select("*")
    .eq('id', id)
    .single();

    console.log(data)

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};