export interface Pig {
  id: number;
  name: string;
  created_at: string;
  description: string | null;
  dob: string | null;
  last_sighted: string | null;
  image_paths: string[];
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

export type RelationshipType = 'parent' | 'sibling' | 'foster_sibling';

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

export interface MoodRecord {
  id: number;
  pig_id: number;
  mood: string;
  created_at: string;
}

export interface PigRecurringTask {
  id: number;
  pig_id: number;
  task_type: string;
  enabled: boolean | null;
  frequency_days_override: number | null;
  last_completed_at: string | null;
  created_at: string;
}

export interface SocialOrderPig extends Pig {
  passed_away: string | null;
}

export interface SocialOrderItem {
  id: number;
  dominant_pig_id: number;
  submissive_pig_id: number;
  observed_at: string | null;
  created_at: string | null;
  notes: string | null;
  dominant_pig: SocialOrderPig;
  submissive_pig: SocialOrderPig;
}

export type FriendCategory =
  | 'snacking'
  | 'grooming'
  | 'following'
  | 'sharing_house'
  | 'booping_noses'
  | 'resting_together';

export interface FriendObservation {
  id: number;
  pig_id_a: number;
  pig_id_b: number;
  category: FriendCategory;
  notes: string | null;
  observed_at: string | null;
  created_at: string | null;
  pig_a: Pig;
  pig_b: Pig;
}
