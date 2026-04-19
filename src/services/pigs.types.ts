export interface Pig {
  id: number;
  name: string;
  created_at: string;
  description: string | null;
  dob: string | null;
  last_sighted: string | null;
  image_path: string | null;
  passed_away?: string | null;
}

export interface HealthRecord {
  id: number;
  pig_id: number;
  notes?: string | null;
  passed_away?: string | null;
  nail_clip?: boolean;
  haircut?: boolean;
  parasite_treatment?: boolean | null;
  created_at: string;
}

export type RelationshipType =
  | 'parent'
  | 'sibling'
  | 'foster_sibling';

export interface PigRelationship {
  id: number;
  pig_id_a: number;
  pig_id_b: number;
  relationship_type: RelationshipType;
}

export interface WeightRecord {
  id: number;
  pig_id: number;
  weight_grams: number;
  recorded_at: string;
}

export interface Task {
  id: number;
  title: string;
  pig_id: number | null;
  completed: boolean;
  created_at: string;
}

export interface MoodRecord {
  id: number;
  pig_id: number;
  mood: string;
  created_at: string;
}