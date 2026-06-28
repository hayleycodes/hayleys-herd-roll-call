import { supabase } from '../../utils/supabase-client';
import type { PenObject } from '../pages/MapPage/objects';

// Cast to any since this table isn't in the generated types yet
const penObjectsTable = () => (supabase as any).from('pen_objects');

// DB row shape. `row` is a reserved word in Postgres, so the grid coords are
// stored as grid_col / grid_row.
type PenObjectRow = {
  id: string;
  label: string;
  grid_col: number;
  grid_row: number;
  width: number;
  length: number;
  rotation: number;
  shape: string | null;
};

const toPenObject = (r: PenObjectRow): PenObject => ({
  id: r.id,
  label: r.label,
  col: r.grid_col,
  row: r.grid_row,
  width: r.width,
  length: r.length,
  rotation: r.rotation,
  shape: (r.shape ?? undefined) as PenObject['shape'],
});

const toRow = (o: PenObject): PenObjectRow => ({
  id: o.id,
  label: o.label,
  grid_col: o.col,
  grid_row: o.row,
  width: o.width,
  length: o.length,
  rotation: o.rotation,
  shape: o.shape ?? null,
});

export const getPenObjects = async (): Promise<PenObject[]> => {
  const { data, error } = await penObjectsTable().select('*');

  if (error) throw new Error(error.message);
  return ((data ?? []) as PenObjectRow[]).map(toPenObject);
};

export const savePenObjects = async (objects: PenObject[]): Promise<void> => {
  const { error } = await penObjectsTable().upsert(objects.map(toRow));
  if (error) throw new Error(error.message);
};
