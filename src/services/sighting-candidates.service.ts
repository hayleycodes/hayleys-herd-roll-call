import { supabase } from '../../utils/supabase-client';

// Cast to any since these tables aren't in the generated types yet.
const candidatesTable = () => (supabase as any).from('sighting_candidates');

// One ranked guess from the worker: which pig, how similar, how many references
// that pig has in the gallery so far.
export interface CandidateGuess {
  pig_id: number;
  similarity: number;
  n_refs?: number;
}

export interface SightingCandidate {
  id: number;
  crop_path: string;
  best_pig_id: number | null;
  top_guesses: CandidateGuess[] | null;
  confidence: number | null;
  status: 'pending' | 'confirmed' | 'rejected' | 'auto';
  camera: string | null;
  observed_at: string | null;
  created_at: string | null;
}

// The review queue: crops the worker wasn't confident enough to auto-confirm.
export const getPendingCandidates = async (): Promise<SightingCandidate[]> => {
  const { data, error } = await candidatesTable()
    .select(
      'id, crop_path, best_pig_id, top_guesses, confidence, status, camera, observed_at, created_at'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as SightingCandidate[];
};

// Confirm which pig a candidate is: promotes its embedding into the gallery,
// bumps the pig's last_sighted, and closes the candidate (all server-side).
export const confirmCandidate = async (
  candidateId: number,
  pigId: number
): Promise<void> => {
  const { error } = await (supabase as any).rpc('confirm_sighting_candidate', {
    candidate_id: candidateId,
    pig_id: pigId,
  });
  if (error) throw new Error(error.message);
};

// Dismiss a candidate (not a pig, bad crop, or don't-know) without touching the
// gallery. Kept for the record, just no longer in the queue.
export const rejectCandidate = async (candidateId: number): Promise<void> => {
  const { error } = await candidatesTable()
    .update({ status: 'rejected' })
    .eq('id', candidateId);
  if (error) throw new Error(error.message);
};
