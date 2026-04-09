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