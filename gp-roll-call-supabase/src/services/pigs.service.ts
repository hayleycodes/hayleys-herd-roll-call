import { supabase } from "../../utils/supabase-client";

export interface Pig {
  id: number;
  name: string;
  created_at: string;
  description: string | null;
  dob: string | null;
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

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Pig not found");

  return data ?? [];
};

export const getPigHealth = async (pigId: number) => {
  const { data, error } = await supabase
    .from("health_data")
    .select("*")
    .eq("pig_id", pigId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data ?? [];
};

export const getPigRelationships = async (pigId: number) => {
  const { data, error } = await supabase
    .from("pig_relationships")
    .select(`
      id,
      relationship_type,
      related_pig_id,
      pigs:related_pig_id (
        id,
        name
      )
    `)
    .eq("pig_id", pigId);

  if (error) throw new Error(error.message);

  return data ?? [];
};