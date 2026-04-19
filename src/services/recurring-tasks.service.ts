import { differenceInDays } from "date-fns";
import { supabase } from "../../utils/supabase-client";
import type { PigRecurringTask } from "./pigs.types";

// --- Per-pig recurring tasks ---

export const getPigRecurringTasks = async (
  pigId: number
): Promise<PigRecurringTask[]> => {
  const { data, error } = await supabase
    .from("pig_recurring_tasks")
    .select("*")
    .eq("pig_id", pigId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as PigRecurringTask[]) ?? [];
};

type TaskWithPig = PigRecurringTask & { pigs: { name: string; image_path: string | null } };

export type OverdueTask = TaskWithPig & {
  days_overdue: number;
};

export type UpcomingTask = TaskWithPig & {
  days_left: number;
};

export type PendingOneOff = TaskWithPig;

export const getAllCareTasks = async (): Promise<{
  overdue: OverdueTask[];
  upcoming: UpcomingTask[];
  oneOffs: PendingOneOff[];
}> => {
  const { data, error } = await supabase
    .from("pig_recurring_tasks")
    .select("*, pigs(name, image_path)");

  if (error) throw new Error(error.message);
  if (!data) return { overdue: [], upcoming: [], oneOffs: [] };

  const now = new Date();
  const all = data as TaskWithPig[];

  const oneOffs = all.filter((t) => t.frequency_days_override === null);
  const recurring = all.filter((t) => t.frequency_days_override !== null);

  const overdue: OverdueTask[] = [];
  const upcoming: UpcomingTask[] = [];

  for (const task of recurring) {
    const freq = task.frequency_days_override!;
    const daysSince = task.last_completed_at
      ? differenceInDays(now, new Date(task.last_completed_at))
      : freq;

    if (!task.last_completed_at || daysSince >= freq) {
      overdue.push({ ...task, days_overdue: daysSince - freq });
    } else {
      upcoming.push({ ...task, days_left: freq - daysSince });
    }
  }

  overdue.sort((a, b) => b.days_overdue - a.days_overdue);
  upcoming.sort((a, b) => a.days_left - b.days_left);

  return { overdue, upcoming, oneOffs };
};

export const createPigCareTask = async (
  pigId: number,
  taskType: string,
  frequencyDays: number
): Promise<PigRecurringTask> => {
  // Backfill last_completed_at from health records for known types
  let lastCompleted: string | null = null;
  const healthTypes = ["nail_clip", "haircut", "parasite_treatment"];
  if (healthTypes.includes(taskType)) {
    const { data: healthData } = await supabase
      .from("health_data")
      .select("created_at")
      .eq("pig_id", pigId)
      .eq(taskType, true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (healthData && healthData.length > 0) {
      lastCompleted = healthData[0].created_at;
    }
  }

  const { data, error } = await supabase
    .from("pig_recurring_tasks")
    .upsert(
      {
        pig_id: pigId,
        task_type: taskType,
        frequency_days_override: frequencyDays,
        enabled: true,
        last_completed_at: lastCompleted,
      },
      { onConflict: "pig_id,task_type" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as PigRecurringTask;
};

export const deletePigCareTask = async (
  pigId: number,
  taskType: string
): Promise<void> => {
  const { error } = await supabase
    .from("pig_recurring_tasks")
    .delete()
    .eq("pig_id", pigId)
    .eq("task_type", taskType);

  if (error) throw new Error(error.message);
};

export const createOneOffTask = async (
  pigId: number,
  taskType: string
): Promise<PigRecurringTask> => {
  const { data, error } = await supabase
    .from("pig_recurring_tasks")
    .insert({
      pig_id: pigId,
      task_type: taskType,
      frequency_days_override: null,
      enabled: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as PigRecurringTask;
};

export const completeOneOffTask = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from("pig_recurring_tasks")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
};

export const markTaskDone = async (
  pigId: number,
  taskType: string
): Promise<void> => {
  // Update recurring tasks
  await supabase
    .from("pig_recurring_tasks")
    .update({ last_completed_at: new Date().toISOString() })
    .eq("pig_id", pigId)
    .eq("task_type", taskType)
    .not("frequency_days_override", "is", null);

  // Delete matching one-off tasks (they're done)
  await supabase
    .from("pig_recurring_tasks")
    .delete()
    .eq("pig_id", pigId)
    .eq("task_type", taskType)
    .is("frequency_days_override", null);
};
