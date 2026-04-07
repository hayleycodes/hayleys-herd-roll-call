import { supabase } from "../../utils/supabase-client";

export const getPigParents = async (pigId: number) => {
  const { data, error } = await supabase
    .from("pig_relationships")
    .select(
      `
      id,
      parent_id,
      pigs:parent_id (
        id,
        name,
        description,
        created_at,
        dob
      )
    `,
    )
    .eq("child_id", pigId);

  if (error) throw new Error(error.message);

  return data ?? [];
};

export const getPigChildren = async (pigId: number) => {
  const { data, error } = await supabase
    .from("pig_relationships")
    .select(
      `
      id,
      child_id,
      pigs:child_id (
        id,
        name,
        description,
        created_at,
        dob
      )
    `,
    )
    .eq("parent_id", pigId);

  if (error) throw new Error(error.message);

  return data ?? [];
};

export const getPigSiblings = async (pigId: number) => {
  const { data: parents, error: parentError } = await supabase
    .from("pig_relationships")
    .select("parent_id")
    .eq("child_id", pigId);

  if (parentError) throw new Error(parentError.message);

  const parentIds = (parents ?? []).map((p) => p.parent_id);

  if (parentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("pig_relationships")
    .select(
      `
      id,
      child_id,
      pigs:child_id (
        id,
        name,
        description,
        created_at,
        dob
      )
    `,
    )
    .in("parent_id", parentIds)
    .neq("child_id", pigId);

  if (error) throw new Error(error.message);

  return data ?? [];
};
