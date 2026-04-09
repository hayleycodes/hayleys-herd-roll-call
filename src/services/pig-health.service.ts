import { supabase } from "../../utils/supabase-client";
import type { HealthRecord } from "./pigs.types";

export const getPigHealth = async (pigId: number) => {
  const { data, error } = await supabase
    .from("health_data")
    .select("*")
    .eq("pig_id", pigId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data ?? [];
};

export const createPigHealth = async (healthRecord: HealthRecord) => {
  const { data, error } = await supabase
    .from("health_data")
    .insert({
      pig_id: healthRecord.pig_id,
      notes: healthRecord.notes ?? null,
      nail_clip: healthRecord.nail_clip ?? false,
      haircut: healthRecord.haircut ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data;
};
