import { supabase } from '../lib/supabase-client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const candidatesTable = () => supabase.from('sighting_candidates');

type CandidateRow = Database['public']['Tables']['sighting_candidates']['Row'];

// The DB row types `status` as a plain string and `top_guesses` as opaque Json;
// narrow them into the SightingCandidate shape the review queue relies on.
const mapCandidateRow = (
  row: Omit<CandidateRow, 'embedding'>
): SightingCandidate => ({
  id: row.id,
  crop_path: row.crop_path,
  best_pig_id: row.best_pig_id,
  top_guesses: row.top_guesses as CandidateGuess[] | null,
  confidence: row.confidence,
  status: row.status as SightingCandidate['status'],
  camera: row.camera,
  observed_at: row.observed_at,
  created_at: row.created_at,
});

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
  status: 'pending' | 'confirmed' | 'rejected' | 'auto' | 'unknown';
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
  return (data ?? []).map(mapCandidateRow);
};

// Confirm which pig a candidate is: promotes its embedding into the gallery,
// bumps the pig's last_sighted, and closes the candidate (all server-side).
export const confirmCandidate = async (
  candidateId: number,
  pigId: number
): Promise<void> => {
  const { error } = await supabase.rpc('confirm_sighting_candidate', {
    candidate_id: candidateId,
    pig_id: pigId,
  });
  if (error) throw new Error(error.message);
};

// Dismiss a candidate (not a pig or bad crop) without touching the gallery.
// Kept for the record, just no longer in the queue.
export const rejectCandidate = async (candidateId: number): Promise<void> => {
  const { error } = await candidatesTable()
    .update({ status: 'rejected' })
    .eq('id', candidateId);
  if (error) throw new Error(error.message);
};

// Set aside a real-pig crop that's too ambiguous to identify. Permanently
// removes it from the pending queue, but stays distinct from 'rejected' so
// these can be revisited or reported separately later.
export const markCandidateUnknown = async (
  candidateId: number
): Promise<void> => {
  const { error } = await candidatesTable()
    .update({ status: 'unknown' })
    .eq('id', candidateId);
  if (error) throw new Error(error.message);
};

// A live change to a candidate row, normalised for the review queue. The caller
// only cares about the pending queue, so we classify each raw postgres event
// into what it means for that list:
//   - 'upsert': row is now pending and should be in the queue (new crop from
//     the worker, or a row that moved back to pending).
//   - 'remove': row is no longer pending and should leave the queue (resolved
//     on another device, rejected, deleted, etc.).
export type CandidateChange =
  | { kind: 'upsert'; candidate: SightingCandidate }
  | { kind: 'remove'; id: number };

// Subscribe to live changes on the pending review queue. Fires `onChange` for
// every insert/update/delete, pre-classified for the queue. Returns an
// unsubscribe function. Realtime respects RLS, so the row payloads only arrive
// for candidates the current session is allowed to read.
export const subscribeToPendingCandidates = (
  onChange: (change: CandidateChange) => void
): (() => void) => {
  const channel: RealtimeChannel = supabase
    .channel('sighting_candidates_pending')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sighting_candidates' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id?: number } | null)?.id;
          if (id != null) onChange({ kind: 'remove', id });
          return;
        }
        const candidate = mapCandidateRow(payload.new as CandidateRow);
        if (candidate.status === 'pending') {
          onChange({ kind: 'upsert', candidate });
        } else {
          onChange({ kind: 'remove', id: candidate.id });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
