import { supabase } from "../../utils/supabase-client";

export interface Pig {
  id: number;
  name: string;
  created_at: string;
  description: string | null;
  dob: string | null;
}

export interface HealthRecord {
  id: number;
  pig_id: number;
  notes?: string | null;
  passed_away?: string | null;
  nail_clip?: boolean;
  haircut?: boolean;
  created_at: string;
}

export interface PigRelationship {
  id: number;
  parent_id: number;
  child_id: number;
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


export const createPigHealth = async (healthRecord: HealthRecord) => {
  const { data, error } = await supabase
    .from("health_data")
    .insert({
      pig_id: healthRecord.pig_id,
      notes: healthRecord.notes ?? null,
      passed_away: healthRecord.passed_away ?? null,
      nail_clip: healthRecord.nail_clip ?? false,
      haircut: healthRecord.haircut ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data;
};

export const getPigParents = async (pigId: number) => {
  const { data, error } = await supabase
    .from("pig_relationships")
    .select(`
      id,
      parent_id,
      pigs:parent_id (
        id,
        name,
        description,
        created_at,
        dob
      )
    `)
    .eq("child_id", pigId);

  if (error) throw new Error(error.message);

  return data ?? [];
};


export const getPigChildren = async (pigId: number) => {
  const { data, error } = await supabase
    .from("pig_relationships")
    .select(`
      id,
      child_id,
      pigs:child_id (
        id,
        name,
        description,
        created_at,
        dob
      )
    `)
    .eq("parent_id", pigId);

  if (error) throw new Error(error.message);

  return data ?? [];
};

export const getPigSiblings = async (pigId: number) => {
  // 1. get parents of this pig
  const { data: parents, error: parentError } = await supabase
    .from("pig_relationships")
    .select("parent_id")
    .eq("child_id", pigId);

  if (parentError) throw new Error(parentError.message);

  const parentIds = (parents ?? []).map(p => p.parent_id);

  if (parentIds.length === 0) return [];

  // 2. get all children of those parents (excluding self)
  const { data, error } = await supabase
    .from("pig_relationships")
    .select(`
      id,
      child_id,
      pigs:child_id (
        id,
        name,
        description,
        created_at,
        dob
      )
    `)
    .in("parent_id", parentIds)
    .neq("child_id", pigId);

  if (error) throw new Error(error.message);

  return data ?? [];
};