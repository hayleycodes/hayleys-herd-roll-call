import { supabase } from '../../utils/supabase-client';
import type { Tables, TablesInsert } from '../types/database.types';
import type { PenObject } from '../pages/MapPage/objects';

// DB row shape. `row` is a reserved word in Postgres, so the grid coords are
// stored as grid_col / grid_row.
type PenObjectRow = Tables<'pen_objects'>;

const toPenObject = (r: PenObjectRow): PenObject => ({
  id: r.id,
  label: r.label,
  col: r.grid_col,
  row: r.grid_row,
  width: r.width,
  length: r.length,
  rotation: r.rotation,
  shape: (r.shape ?? undefined) as PenObject['shape'],
  levels: r.levels ?? 1,
});

const toRow = (o: PenObject): TablesInsert<'pen_objects'> => ({
  id: o.id,
  label: o.label,
  grid_col: o.col,
  grid_row: o.row,
  width: o.width,
  length: o.length,
  rotation: o.rotation,
  shape: o.shape ?? null,
  levels: o.levels ?? 1,
});

export const getPenObjects = async (): Promise<PenObject[]> => {
  const { data, error } = await supabase.from('pen_objects').select('*');

  if (error) throw new Error(error.message);
  return (data ?? []).map(toPenObject);
};

export const savePenObjects = async (objects: PenObject[]): Promise<void> => {
  const { error } = await supabase
    .from('pen_objects')
    .upsert(objects.map(toRow));
  if (error) throw new Error(error.message);
};
