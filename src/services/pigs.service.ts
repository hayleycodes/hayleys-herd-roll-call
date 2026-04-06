import { supabase } from "../../utils/supabase-client";
import imageCompression from "browser-image-compression";

export interface Pig {
  id: number;
  name: string;
  created_at: string;
  description: string | null;
  dob: string | null;
  last_sighted: string | null;
  image_path: string | null;
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

export const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.5, // target size (MB)
    maxWidthOrHeight: 800, // resize limit
    useWebWorker: true,
    fileType: "image/jpeg",
  };

  const compressedFile = await imageCompression(file, options);

  return compressedFile as File;
};

export const getPigImageUrl = async (path: string) => {
  const { data, error } = await supabase.storage
    .from("pig_photos")
    .createSignedUrl(path, 60 * 60);

  if (error) throw error;

  return { signedUrl: data.signedUrl };
};

export const getAllPigs = async (): Promise<Pig[]> => {
  const { data, error } = await supabase
    .from("pigs")
    .select("*")
    .order("last_sighted", { ascending: true });

  console.log(data);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};

export const getPig = async (id: number): Promise<Pig> => {
  const { data, error } = await supabase
    .from("pigs")
    .select("*")
    .eq("id", id)
    .single();

  console.log(data);

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Pig not found");

  return data ?? [];
};

export const createPigSighting = async (id: number) => {
  console.log(id);

  const { data, error } = await supabase
    .from("pigs")
    .update({
      last_sighted: new Date().toISOString(),
    })
    .eq("id", id)
    .select();

  console.log("Supabase response:", { data, error });

  if (error) throw new Error(error.message);

  return data;
};

export const uploadPigImage = async (file: File, pigId: number) => {
  const filePath = `${pigId}/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from("pig_photos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  // ONLY return filePath now (source of truth)
  return filePath;
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
  // 1. get parents of this pig
  const { data: parents, error: parentError } = await supabase
    .from("pig_relationships")
    .select("parent_id")
    .eq("child_id", pigId);

  if (parentError) throw new Error(parentError.message);

  const parentIds = (parents ?? []).map((p) => p.parent_id);

  if (parentIds.length === 0) return [];

  // 2. get all children of those parents (excluding self)
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
