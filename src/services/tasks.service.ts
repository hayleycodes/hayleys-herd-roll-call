import { supabase } from "../../utils/supabase-client";
import type { Task } from "./pigs.types";

export type TaskWithPig = Task & {
  pigs: { name: string; image_path: string | null } | null;
};

export const getAllTasks = async (): Promise<TaskWithPig[]> => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, pigs(name, image_path)")
    .order("completed", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data as TaskWithPig[]) ?? [];
};

export const getTasksForPig = async (pigId: number): Promise<Task[]> => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("pig_id", pigId)
    .eq("completed", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data ?? [];
};

export const getOutstandingTaskCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("completed", false);

  if (error) throw new Error(error.message);

  return count ?? 0;
};

export const createTask = async (
  title: string,
  pigId?: number | null
): Promise<Task> => {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ title, pig_id: pigId ?? null })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data;
};

export const toggleTaskComplete = async (
  taskId: number,
  completed: boolean
): Promise<void> => {
  const { error } = await supabase
    .from("tasks")
    .update({ completed })
    .eq("id", taskId);

  if (error) throw new Error(error.message);
};

export const deleteTask = async (taskId: number): Promise<void> => {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) throw new Error(error.message);
};
