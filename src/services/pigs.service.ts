import { supabase } from "../../utils/supabase-client";
import type { Pig } from "./pigs.types";

export const getAllPigs = async (): Promise<Pig[]> => {
  const { data, error } = await supabase
    .from("pigs")
    .select("*")
    .order("last_sighted", { ascending: true });

  if (error) throw new Error(error.message);

  return data ?? [];
};

export const getPig = async (id: number): Promise<Pig> => {
  const { data, error } = await supabase
    .from("pigs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Pig not found");

  return data;
};

export const createPigSighting = async (id: number) => {
  const { data, error } = await supabase
    .from("pigs")
    .update({
      last_sighted: new Date().toISOString(),
    })
    .eq("id", id)
    .select();

  if (error) throw new Error(error.message);

  return data;
};

export const savePigImage = async (pigId: number, imagePath: string) => {
  const { data, error } = await supabase
    .from("pigs")
    .update({ image_path: imagePath })
    .eq("id", pigId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data;
};
